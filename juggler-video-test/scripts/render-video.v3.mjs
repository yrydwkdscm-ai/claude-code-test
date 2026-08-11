// Version 3 renderer.
//
// Architecture change from V2 (fixes the white-flash bug at its root):
// V2 recorded each scene as a SEPARATE Playwright page/context, then
// concatenated the resulting clips with ffmpeg. Every one of those
// per-scene navigations was a moment where a blank (white) document
// could flash before that scene's dark CSS painted.
//
// V3 instead renders the ENTIRE 30s timeline as ONE HTML page (all
// scenes stacked in the DOM, crossfaded by opacity via JS -- see
// template/scene.v3.html) and records ONE continuous video. There is
// exactly one navigation for the whole video, so there is exactly one
// (well-guarded) risk window instead of one per scene.
//
// Extra guards against any white frame during that one window:
//  - html/body get an explicit dark background color, inline AND in CSS.
//  - an init script forces a dark background on every document
//    (including the transient about:blank before our real navigation).
//  - the page's CDP background color is set directly, so even
//    unpainted/compositor-level area renders dark, not white.
//  - the measured lead-in (context creation -> content actually
//    animating) is trimmed out of the recording by build-video.v3.mjs,
//    with extra safety margin.

import { chromium } from "playwright-core";
import { readFile, writeFile, mkdir, rm, readdir, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { timeline, CANVAS } from "../scenes/timeline.v3.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TEMPLATE_PATH = path.join(ROOT, "template", "scene.v3.html");
const FONT_BOLD = path.join(ROOT, "assets", "fonts", "NotoSansJP-Bold.v3.subset.woff2");
const FONT_BLACK = path.join(ROOT, "assets", "fonts", "NotoSansJP-Black.v3.subset.woff2");
const RENDER_TMP_DIR = path.join(ROOT, "frames", "v3", "_html");
const VIDEO_DIR = path.join(ROOT, "frames", "v3", "_raw");
const FRAMES_DIR = path.join(ROOT, "frames", "v3");
const CHROMIUM_PATH =
  process.env.PLAYWRIGHT_CHROMIUM_PATH || "/opt/pw-browsers/chromium";

const DARK_BG = "#05050a";
// Generous: this is paid once for the whole video (not per scene, as in
// V2), and the recorded video's actual duration has been observed to run
// a bit short of (leadIn + totalDuration + pad) -- build-video.v3.mjs
// verifies the trimmed output is exactly `totalDuration` long, so any
// shortfall here just means "check the logs", not a silent wrong length.
const RECORD_PAD_SEC = 2.0;

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function varsToStyle(vars) {
  if (!vars) return "";
  const decls = Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
  return decls ? `;${escapeHtml(decls)}` : "";
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function renderParticles(seed, count = 24) {
  const rand = mulberry32(seed);
  let html = "";
  for (let i = 0; i < count; i++) {
    const left = (2 + rand() * 96).toFixed(1);
    const size = (3 + rand() * 4).toFixed(1);
    const duration = (9 + rand() * 8).toFixed(2);
    const delay = (-rand() * 18).toFixed(2);
    html += `<div class="particle" style="left:${left}%;width:${size}px;height:${size}px;animation-duration:${duration}s;animation-delay:${delay}s"></div>`;
  }
  return html;
}

function renderAccentSpan(part, defaultDelay) {
  const pop = part.pop && part.pop !== "none" ? part.pop : null;
  const delay = part.delay ?? defaultDelay ?? 0;
  if (!pop) {
    return `<span class="role-accent">${escapeHtml(part.text)}</span>`;
  }
  const burstClass = pop === "mega" ? "glow-burst-mega" : pop === "strong" || pop === "hero" ? "glow-burst" : null;
  const burst = burstClass ? `<span class="${burstClass}" style="animation-delay:${delay}s"></span>` : "";
  return `<span class="accent-wrap">${burst}<span class="role-accent pop-${pop}" style="animation-delay:${delay}s">${escapeHtml(
    part.text
  )}</span></span>`;
}

function renderPart(part, defaultDelay) {
  if (part.role === "accent") return renderAccentSpan(part, defaultDelay);
  return `<span class="role-${part.role}">${escapeHtml(part.text)}</span>`;
}

function renderLine(line) {
  const delay = line.delay ?? 0;
  const enterClass = line.enter === "fadeUp" ? " enter-fadeUp" : "";
  const style = `animation-delay:${delay}s${varsToStyle(line.vars)}`;

  if (line.role === "graph") {
    return `<div class="line${enterClass}" style="${style}"><div class="graph-wrap" style="animation-delay:${delay}s">${line.svg}</div></div>`;
  }
  if (line.role === "row") {
    const parts = line.parts.map((p) => renderPart(p, delay)).join("");
    return `<div class="line${enterClass}" style="${style}"><div class="line-fit">${parts}</div></div>`;
  }
  const inner = renderPart({ role: line.role, text: line.text, pop: line.pop }, delay);
  return `<div class="line${enterClass}" style="${style}"><div class="line-fit">${inner}</div></div>`;
}

function renderScene(scene) {
  const linesHtml = scene.lines.map(renderLine).join("\n      ");
  return `<div class="scene" data-scene="${scene.id}" data-start="${scene.start}" data-end="${scene.end}">
    <div class="safe-area" style="--line-gap:${scene.gap}">
      ${linesHtml}
    </div>
  </div>`;
}

async function main() {
  if (!existsSync(FONT_BOLD) || !existsSync(FONT_BLACK)) {
    throw new Error(
      "V3 font files missing under assets/fonts/. Expected NotoSansJP-Bold.v3.subset.woff2 and NotoSansJP-Black.v3.subset.woff2."
    );
  }

  await rm(FRAMES_DIR, { recursive: true, force: true });
  await mkdir(RENDER_TMP_DIR, { recursive: true });
  await mkdir(VIDEO_DIR, { recursive: true });

  const template = await readFile(TEMPLATE_PATH, "utf8");
  const fontBoldUrl = pathToFileURL(FONT_BOLD).href;
  const fontBlackUrl = pathToFileURL(FONT_BLACK).href;
  const particlesHtml = renderParticles(2024, 24);
  const scenesHtml = timeline.map(renderScene).join("\n\n  ");
  const totalDuration = Math.max(...timeline.map((s) => s.end));

  let html = template
    .replace("__FONT_BOLD_URL__", fontBoldUrl)
    .replace("__FONT_BLACK_URL__", fontBlackUrl)
    .replace("__PARTICLES_HTML__", particlesHtml)
    .replace("__SCENES_HTML__", scenesHtml);

  const htmlPath = path.join(RENDER_TMP_DIR, "video.html");
  await writeFile(htmlPath, html, "utf8");

  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });

  // Belt-and-suspenders against a white flash: force a dark background on
  // every document this context ever shows, from the very first paint of
  // even the transient about:blank page before our real navigation.
  const recordingStartedAt = Date.now();
  const context = await browser.newContext({
    viewport: { width: CANVAS.width, height: CANVAS.height },
    deviceScaleFactor: 1,
    recordVideo: { dir: VIDEO_DIR, size: { width: CANVAS.width, height: CANVAS.height } },
  });
  await context.addInitScript((bg) => {
    document.documentElement.style.background = bg;
    const style = document.createElement("style");
    style.textContent = `html,body{background:${bg} !important;}`;
    (document.head || document.documentElement).appendChild(style);
  }, DARK_BG);

  const page = await context.newPage();

  try {
    const client = await context.newCDPSession(page);
    const [r, g, b] = [0x05, 0x05, 0x0a];
    await client.send("Page.setBackgroundColor", { color: { r, g, b, a: 255 } });
  } catch (err) {
    console.warn("[render-v3] CDP setBackgroundColor unavailable, relying on CSS + leadIn trim:", err.message);
  }

  await page.goto(pathToFileURL(htmlPath).href);
  await page.waitForFunction(() => document.documentElement.dataset.started === "1", {
    timeout: 5000,
  });
  const leadIn = (Date.now() - recordingStartedAt) / 1000;

  await page.waitForTimeout((totalDuration + RECORD_PAD_SEC) * 1000);

  await context.close();
  await browser.close();

  const files = await readdir(VIDEO_DIR);
  const webm = files.find((f) => f.endsWith(".webm"));
  if (!webm) throw new Error("No video was recorded.");
  const finalWebm = path.join(FRAMES_DIR, "video.webm");
  await rename(path.join(VIDEO_DIR, webm), finalWebm);

  const manifest = {
    canvas: CANVAS,
    totalDuration,
    leadIn: +leadIn.toFixed(3),
    webm: path.relative(ROOT, finalWebm),
  };
  await writeFile(path.join(FRAMES_DIR, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  console.log(
    `[render-v3] done: ${finalWebm} (totalDuration ${totalDuration}s, leadIn ${leadIn.toFixed(3)}s)`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

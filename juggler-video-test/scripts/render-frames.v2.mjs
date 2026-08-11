// Version 2 renderer: records each scene as a short, real-time-animated
// clip (Playwright's built-in video capture) instead of a single static
// screenshot. Number pop-ins, staged text reveals, and the slow background
// motion all actually play out during the recording.
//
// Output goes to frames/v2/ (webm per scene + manifest.json), separate
// from Version 1's frames/*.png, so V1 stays reproducible untouched.

import { chromium } from "playwright-core";
import { readFile, writeFile, mkdir, rm, readdir, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { timeline, CANVAS } from "../scenes/timeline.v2.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TEMPLATE_PATH = path.join(ROOT, "template", "scene.v2.html");
const FONT_BOLD = path.join(ROOT, "assets", "fonts", "NotoSansJP-Bold.v2.subset.woff2");
const FONT_BLACK = path.join(ROOT, "assets", "fonts", "NotoSansJP-Black.v2.subset.woff2");
const RENDER_TMP_DIR = path.join(ROOT, "frames", "v2", "_html");
const VIDEO_DIR = path.join(ROOT, "frames", "v2", "_raw");
const FRAMES_DIR = path.join(ROOT, "frames", "v2");
const CHROMIUM_PATH =
  process.env.PLAYWRIGHT_CHROMIUM_PATH || "/opt/pw-browsers/chromium";

// Small extra real-time buffer recorded per scene beyond its nominal
// duration, so the fade-out at the very end of a scene (applied later in
// ffmpeg) always has real frames to fade from -- trimmed precisely by
// build-video.v2.mjs's `-t`.
const RECORD_PAD_SEC = 0.4;

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

// Deterministic PRNG so particle layout is reproducible run-to-run.
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

function renderParticles(seed, count = 20) {
  const rand = mulberry32(seed);
  let html = "";
  for (let i = 0; i < count; i++) {
    const left = (2 + rand() * 96).toFixed(1);
    const size = (3 + rand() * 4).toFixed(1);
    const duration = (9 + rand() * 7).toFixed(2);
    const delay = (-rand() * 16).toFixed(2); // start mid-flight, staggered
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
  const burst = pop === "strong" || pop === "hero"
    ? `<span class="glow-burst" style="animation-delay:${delay}s"></span>`
    : "";
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

function renderScene(scene, template, fontBoldUrl, fontBlackUrl, particlesHtml) {
  const linesHtml = scene.lines.map(renderLine).join("\n    ");
  let html = template
    .replace("__FONT_BOLD_URL__", fontBoldUrl)
    .replace("__FONT_BLACK_URL__", fontBlackUrl)
    .replace("__PARTICLES_HTML__", particlesHtml)
    .replace("__LINES_HTML__", linesHtml);

  html = html.replace(
    '<div class="safe-area" id="safe-area">',
    `<div class="safe-area" id="safe-area" style="--line-gap:${scene.gap}">`
  );
  return html;
}

async function main() {
  if (!existsSync(FONT_BOLD) || !existsSync(FONT_BLACK)) {
    throw new Error(
      "V2 font files missing under assets/fonts/. Expected NotoSansJP-Bold.v2.subset.woff2 and NotoSansJP-Black.v2.subset.woff2."
    );
  }

  await rm(FRAMES_DIR, { recursive: true, force: true });
  await mkdir(RENDER_TMP_DIR, { recursive: true });
  await mkdir(VIDEO_DIR, { recursive: true });

  const template = await readFile(TEMPLATE_PATH, "utf8");
  const fontBoldUrl = pathToFileURL(FONT_BOLD).href;
  const fontBlackUrl = pathToFileURL(FONT_BLACK).href;

  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
  const manifest = [];

  for (let i = 0; i < timeline.length; i++) {
    const scene = timeline[i];
    const index = String(i + 1).padStart(2, "0");
    const particlesHtml = renderParticles(1000 + i, 20);
    const html = renderScene(scene, template, fontBoldUrl, fontBlackUrl, particlesHtml);

    const htmlPath = path.join(RENDER_TMP_DIR, `scene-${index}-${scene.id}.html`);
    await writeFile(htmlPath, html, "utf8");

    const sceneVideoDir = path.join(VIDEO_DIR, `scene-${index}-${scene.id}`);
    await mkdir(sceneVideoDir, { recursive: true });

    const recordingStartedAt = Date.now();
    const context = await browser.newContext({
      viewport: { width: CANVAS.width, height: CANVAS.height },
      deviceScaleFactor: 1,
      recordVideo: { dir: sceneVideoDir, size: { width: CANVAS.width, height: CANVAS.height } },
    });
    const page = await context.newPage();

    await page.goto(pathToFileURL(htmlPath).href);
    await page.waitForFunction(() => document.documentElement.dataset.started === "1", {
      timeout: 5000,
    });
    // Video recording begins at context creation, but animations only
    // start once fonts are ready. leadIn is how much dead time sits at
    // the front of the recording -- build-video.v2.mjs seeks past it so
    // the exported clip starts exactly when the animation does.
    const leadIn = (Date.now() - recordingStartedAt) / 1000;

    const duration = +(scene.end - scene.start).toFixed(3);
    await page.waitForTimeout((duration + RECORD_PAD_SEC) * 1000);

    await context.close(); // flushes the webm to disk

    const files = await readdir(sceneVideoDir);
    const webm = files.find((f) => f.endsWith(".webm"));
    if (!webm) throw new Error(`No video recorded for scene ${scene.id}`);
    const finalWebm = path.join(FRAMES_DIR, `scene-${index}-${scene.id}.webm`);
    await rename(path.join(sceneVideoDir, webm), finalWebm);

    manifest.push({
      index: i + 1,
      id: scene.id,
      start: scene.start,
      end: scene.end,
      duration,
      leadIn: +leadIn.toFixed(3),
      webm: path.relative(ROOT, finalWebm),
    });

    console.log(
      `[render-v2] scene ${index} (${scene.id}) -> ${finalWebm} (${duration}s, leadIn ${leadIn.toFixed(3)}s)`
    );
  }

  await browser.close();

  await writeFile(
    path.join(FRAMES_DIR, "manifest.json"),
    JSON.stringify({ canvas: CANVAS, scenes: manifest }, null, 2),
    "utf8"
  );

  console.log(`[render-v2] done: ${manifest.length} scene clips written to ${FRAMES_DIR}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

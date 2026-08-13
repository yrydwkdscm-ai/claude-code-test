// Version 4 renderer. Same single-continuous-recording architecture as
// V3 (all scenes stacked in one page, JS-driven opacity crossfade -- see
// render-video.v3.mjs's header comment for why this avoids the white-
// flash bug V2 had). This file adds: count-up odometers, a digit-roll
// "reel stop" flourish, screen-shake, and the background graph/digits
// generation that scene.v4.html expects.

import { chromium } from "playwright-core";
import { readFile, writeFile, mkdir, rm, readdir, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { timeline, CANVAS } from "../scenes/timeline.v4.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TEMPLATE_PATH = path.join(ROOT, "template", "scene.v4.html");
const FONT_BOLD = path.join(ROOT, "assets", "fonts", "NotoSansJP-Bold.v4.subset.woff2");
const FONT_BLACK = path.join(ROOT, "assets", "fonts", "NotoSansJP-Black.v4.subset.woff2");
const RENDER_TMP_DIR = path.join(ROOT, "frames", "v4", "_html");
const VIDEO_DIR = path.join(ROOT, "frames", "v4", "_raw");
const FRAMES_DIR = path.join(ROOT, "frames", "v4");
const CHROMIUM_PATH =
  process.env.PLAYWRIGHT_CHROMIUM_PATH || "/opt/pw-browsers/chromium";

const DARK_BG = "#050308";
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

// Purely decorative background elements below (graph line, flowing
// digits, reel columns) are geometric/random -- not simulation data.

function renderGraphPath(seed) {
  const rand = mulberry32(seed);
  const points = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const x = (1080 / n) * i;
    const y = 140 + Math.sin(i * 0.9 + rand() * 2) * 70 + (rand() - 0.5) * 40;
    points.push([x, y]);
  }
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

function renderDigits(seed, count = 16) {
  const rand = mulberry32(seed);
  let html = "";
  for (let i = 0; i < count; i++) {
    const left = (4 + rand() * 92).toFixed(1);
    const size = (26 + rand() * 20).toFixed(0);
    const duration = (5 + rand() * 5).toFixed(2);
    const delay = (-rand() * 10).toFixed(2);
    const digit = Math.floor(rand() * 10);
    html += `<div class="bg-digit" style="left:${left}%;font-size:${size}px;animation-duration:${duration}s;animation-delay:${delay}s">${digit}</div>`;
  }
  return html;
}

// Returns { burstHtml, spanHtml } separately: the glow burst must NOT be
// nested inside .line-fit (the element fitLines() measures), because a
// large absolutely-positioned decorative glow inflates scrollWidth and
// throws off the shrink-to-fit calculation for the text itself. It's
// rendered as a sibling instead (see renderLine).
function renderAccentSpan(part, defaultDelay) {
  const pop = part.pop && part.pop !== "none" ? part.pop : null;
  const delay = part.delay ?? defaultDelay ?? 0;
  const roleClass = `role-${part.role}`;
  if (!pop) {
    return { burstHtml: "", spanHtml: `<span class="${roleClass}">${escapeHtml(part.text)}</span>` };
  }
  let burstClass = null;
  if (pop === "mega") burstClass = "glow-burst-mega";
  else if (pop === "strong" || pop === "hero") burstClass = part.glow === "red" ? "glow-burst-red" : "glow-burst";
  const burstHtml = burstClass ? `<span class="${burstClass}" style="animation-delay:${delay}s"></span>` : "";

  if (part.roll) {
    const rollDelay = part.rollDelay ?? 0;
    const rollDuration = part.rollDuration ?? 0.32;
    return {
      burstHtml,
      spanHtml: `<span class="${roleClass} pop-${pop}" data-roll-final="${escapeHtml(
        part.text
      )}" data-roll-delay="${rollDelay}" data-roll-duration="${rollDuration}" data-shake="${
        part.shake ?? ""
      }" style="animation-delay:${delay}s">${escapeHtml(part.text)}</span>`,
    };
  }

  return {
    burstHtml,
    spanHtml: `<span class="${roleClass} pop-${pop}" style="animation-delay:${delay}s">${escapeHtml(
      part.text
    )}</span>`,
  };
}

function renderCountup(line, defaultDelay) {
  const delay = line.delay ?? defaultDelay ?? 0;
  return `<span class="role-${line.displayRole} countup" data-count-to="${line.to}" data-count-suffix="${escapeHtml(
    line.suffix || ""
  )}" data-count-duration="${line.duration ?? 2}" data-count-delay="${delay}">0${escapeHtml(line.suffix || "")}</span>`;
}

function renderLine(line) {
  const delay = line.delay ?? 0;
  const enterClass = line.enter === "fadeUp" ? " enter-fadeUp" : "";
  const style = `animation-delay:${delay}s${varsToStyle(line.vars)}`;

  if (line.role === "countup") {
    return `<div class="line${enterClass}" style="${style}"><div class="line-fit">${renderCountup(
      line,
      delay
    )}</div></div>`;
  }
  if (line.role === "row") {
    const rendered = line.parts.map((p) => renderAccentSpan(p, delay));
    const bursts = rendered.map((r) => r.burstHtml).join("");
    const spans = rendered.map((r) => r.spanHtml).join("");
    return `<div class="line${enterClass}" style="${style}">${bursts}<div class="line-fit">${spans}</div></div>`;
  }
  const { burstHtml, spanHtml } = renderAccentSpan(
    {
      role: line.role,
      text: line.text,
      pop: line.pop,
      roll: line.roll,
      rollDelay: line.rollDelay,
      rollDuration: line.rollDuration,
      shake: line.shake,
      glow: line.glow,
    },
    delay
  );
  return `<div class="line${enterClass}" style="${style}">${burstHtml}<div class="line-fit">${spanHtml}</div></div>`;
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
      "V4 font files missing under assets/fonts/. Expected NotoSansJP-Bold.v4.subset.woff2 and NotoSansJP-Black.v4.subset.woff2."
    );
  }

  await rm(FRAMES_DIR, { recursive: true, force: true });
  await mkdir(RENDER_TMP_DIR, { recursive: true });
  await mkdir(VIDEO_DIR, { recursive: true });

  const template = await readFile(TEMPLATE_PATH, "utf8");
  const fontBoldUrl = pathToFileURL(FONT_BOLD).href;
  const fontBlackUrl = pathToFileURL(FONT_BLACK).href;
  const digitsHtml = renderDigits(4042, 16);
  const graphPath = renderGraphPath(4042);
  const scenesHtml = timeline.map(renderScene).join("\n\n  ");
  const totalDuration = Math.max(...timeline.map((s) => s.end));

  let html = template
    .replace("__FONT_BOLD_URL__", fontBoldUrl)
    .replace("__FONT_BLACK_URL__", fontBlackUrl)
    .replace("__GRAPH_PATH__", graphPath)
    .replace("__DIGITS_HTML__", digitsHtml)
    .replace("__SCENES_HTML__", scenesHtml);

  const htmlPath = path.join(RENDER_TMP_DIR, "video.html");
  await writeFile(htmlPath, html, "utf8");

  if (process.argv.includes("--html-only")) {
    console.log(`[render-v4] --html-only: wrote ${htmlPath}, skipping recording.`);
    return;
  }

  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });

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
    await client.send("Page.setBackgroundColor", { color: { r: 5, g: 3, b: 8, a: 255 } });
  } catch (err) {
    console.warn("[render-v4] CDP setBackgroundColor unavailable, relying on CSS + leadIn trim:", err.message);
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
    `[render-v4] done: ${finalWebm} (totalDuration ${totalDuration}s, leadIn ${leadIn.toFixed(3)}s)`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

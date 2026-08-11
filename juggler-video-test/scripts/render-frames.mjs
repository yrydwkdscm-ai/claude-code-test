// Renders each scene in scenes/timeline.js to a 1080x1920 PNG using
// Playwright + the pre-installed Chromium. No simulator logic here —
// this only turns fixed data + the HTML/CSS template into still frames.

import { chromium } from "playwright-core";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { timeline, CANVAS } from "../scenes/timeline.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TEMPLATE_PATH = path.join(ROOT, "template", "scene.html");
const FONT_BOLD = path.join(ROOT, "assets", "fonts", "NotoSansJP-Bold.subset.woff2");
const FONT_BLACK = path.join(ROOT, "assets", "fonts", "NotoSansJP-Black.subset.woff2");
const RENDER_TMP_DIR = path.join(ROOT, "frames", "_html");
const FRAMES_DIR = path.join(ROOT, "frames");
const CHROMIUM_PATH =
  process.env.PLAYWRIGHT_CHROMIUM_PATH || "/opt/pw-browsers/chromium";

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
  return decls ? ` style="${escapeHtml(decls)}"` : "";
}

function renderLine(line) {
  if (line.role === "row") {
    const parts = line.parts
      .map((p) => `<span class="role-${p.role}">${escapeHtml(p.text)}</span>`)
      .join("");
    return `<div class="line"${varsToStyle(line.vars)}>${parts}</div>`;
  }
  return `<div class="line"${varsToStyle(line.vars)}><span class="role-${line.role}">${escapeHtml(
    line.text
  )}</span></div>`;
}

function renderScene(scene, template, fontBoldUrl, fontBlackUrl) {
  const linesHtml = scene.lines.map(renderLine).join("\n    ");
  let html = template
    .replace("__FONT_BOLD_URL__", fontBoldUrl)
    .replace("__FONT_BLACK_URL__", fontBlackUrl)
    .replace("__LINES_HTML__", linesHtml);

  // Inject the per-scene line-gap onto the safe-area container.
  html = html.replace(
    '<div class="safe-area" id="safe-area">',
    `<div class="safe-area" id="safe-area" style="--line-gap:${scene.gap}">`
  );
  return html;
}

async function main() {
  if (!existsSync(FONT_BOLD) || !existsSync(FONT_BLACK)) {
    throw new Error(
      "Font files missing under assets/fonts/. Expected NotoSansJP-Bold.subset.woff2 and NotoSansJP-Black.subset.woff2."
    );
  }

  await rm(RENDER_TMP_DIR, { recursive: true, force: true });
  await mkdir(RENDER_TMP_DIR, { recursive: true });
  await mkdir(FRAMES_DIR, { recursive: true });

  const template = await readFile(TEMPLATE_PATH, "utf8");
  const fontBoldUrl = pathToFileURL(FONT_BOLD).href;
  const fontBlackUrl = pathToFileURL(FONT_BLACK).href;

  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
  const page = await browser.newPage({
    viewport: { width: CANVAS.width, height: CANVAS.height },
    deviceScaleFactor: 1,
  });

  const manifest = [];

  for (let i = 0; i < timeline.length; i++) {
    const scene = timeline[i];
    const index = String(i + 1).padStart(2, "0");
    const html = renderScene(scene, template, fontBoldUrl, fontBlackUrl);

    const htmlPath = path.join(RENDER_TMP_DIR, `scene-${index}-${scene.id}.html`);
    await writeFile(htmlPath, html, "utf8");

    await page.goto(pathToFileURL(htmlPath).href);
    await page.waitForSelector("html[data-fit-done='1']", { timeout: 5000 });

    const pngPath = path.join(FRAMES_DIR, `scene-${index}-${scene.id}.png`);
    await page.screenshot({ path: pngPath });

    const duration = +(scene.end - scene.start).toFixed(3);
    manifest.push({
      index: i + 1,
      id: scene.id,
      start: scene.start,
      end: scene.end,
      duration,
      png: path.relative(ROOT, pngPath),
    });

    console.log(`[render] scene ${index} (${scene.id}) -> ${pngPath} (${duration}s)`);
  }

  await browser.close();

  await writeFile(
    path.join(FRAMES_DIR, "manifest.json"),
    JSON.stringify({ canvas: CANVAS, scenes: manifest }, null, 2),
    "utf8"
  );

  console.log(`[render] done: ${manifest.length} frames written to ${FRAMES_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

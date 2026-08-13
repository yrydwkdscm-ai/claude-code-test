// Version 5 renderer.
//
// Same single-continuous-recording, opacity-crossfade architecture as
// V3/V4 (see render-video.v3.mjs's header comment for why this avoids
// the white-flash bug). This file adds the Jagumi mascot character and
// the scene-level background "effects" (dim, reel-turbo, calm,
// graph variant, people-grid) that scene.v5.html expects.
//
// ---- Where the Jagumi character assets came from ----
// Source: the user-supplied character sheet PNG (1230x1278). It is a
// flattened "key visual" composition (hero pose + slot machine graphic +
// comic burst all pre-composited), so automatic background removal
// (rembg, both the general u2net model and the isnet-anime model) could
// not cleanly separate the hero pose from its busy backdrop -- it either
// erased the character too or kept the whole busy scene. The 6 labelled
// expression thumbnails ("表情差分" grid) and the SD mini-chara, by
// contrast, sit on simple near-flat card backgrounds and matted cleanly
// with isnet-anime. So V5 uses ONLY those seven crops as character
// assets -- no new character art was generated, and the busy full hero
// splash art was not used. Crop boxes (in the original 1230x1278 sheet)
// and resulting files:
//   (572,62)-(793,278)   -> 通常・笑顔   -> jagumi-normal-smile.png
//   (798,62)-(1013,278)  -> 喜び・大当たり -> jagumi-joy-win.png
//   (1013,62)-(1228,278) -> 驚き・衝撃   -> jagumi-surprise-shock.png
//   (572,338)-(793,553)  -> 考える・疑問  -> jagumi-thinking.png
//   (798,338)-(1013,553) -> 解説・分析   -> jagumi-explain.png
//   (1013,338)-(1228,553)-> ガーン・落ち込み -> jagumi-dejected.png
//   (480,645)-(800,1010) -> ミニキャラ(SD) -> jagumi-chibi-full.png
// Each was cut with rembg's isnet-anime model, then a light post-process
// removed the last faint card-corner remnants (see the sibling analysis
// scripts under scratchpad -- this repo only keeps the final PNGs).

import { chromium } from "playwright-core";
import { readFile, writeFile, mkdir, rm, readdir, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { timeline, CANVAS } from "../scenes/timeline.v5.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TEMPLATE_PATH = path.join(ROOT, "template", "scene.v5.html");
const FONT_BOLD = path.join(ROOT, "assets", "fonts", "NotoSansJP-Bold.v5.subset.woff2");
const FONT_BLACK = path.join(ROOT, "assets", "fonts", "NotoSansJP-Black.v5.subset.woff2");
const CHAR_DIR = path.join(ROOT, "assets", "characters");
const RENDER_TMP_DIR = path.join(ROOT, "frames", "v5", "_html");
const VIDEO_DIR = path.join(ROOT, "frames", "v5", "_raw");
const FRAMES_DIR = path.join(ROOT, "frames", "v5");
const CHROMIUM_PATH =
  process.env.PLAYWRIGHT_CHROMIUM_PATH || "/opt/pw-browsers/chromium";

const DARK_BG = "#050308";
const RECORD_PAD_SEC = 2.0;

const CHAR_ASSETS = {
  "normal-smile": "jagumi-normal-smile.png",
  "joy-win": "jagumi-joy-win.png",
  "surprise-shock": "jagumi-surprise-shock.png",
  thinking: "jagumi-thinking.png",
  explain: "jagumi-explain.png",
  dejected: "jagumi-dejected.png",
  "chibi-full": "jagumi-chibi-full.png",
};

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

function renderGraphPath(seed, trend) {
  // trend: "neutral" | "up" | "down" -- purely decorative shapes, not
  // real per-game data (no such series exists yet).
  const rand = mulberry32(seed);
  const points = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const x = (1080 / n) * i;
    const p = i / n;
    let base = 140;
    if (trend === "up") base = 230 - p * 170;
    else if (trend === "down") base = 60 + p * 170;
    const y = base + Math.sin(i * 0.9 + rand() * 2) * 30 + (rand() - 0.5) * 24;
    points.push([x, Math.max(20, Math.min(260, y))]);
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

// ~3% (of 10,000 people) shown as red among 100 dots -> 3 red dots, real
// ratio rounded to a whole icon; not an attempt at decimal precision.
function renderPeopleGrid(loseCount = 3, total = 100) {
  let html = "";
  for (let i = 0; i < total; i++) {
    const isLose = i < loseCount;
    html += `<div class="bg-person${isLose ? " lose" : ""}"></div>`;
  }
  return html;
}

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

  const shakeAttr = part.shake !== undefined ? ` data-shake="${part.shake}"` : "";
  if (part.roll) {
    const rollDelay = part.rollDelay ?? 0;
    const rollDuration = part.rollDuration ?? 0.32;
    return {
      burstHtml,
      spanHtml: `<span class="${roleClass} pop-${pop}" data-roll-final="${escapeHtml(
        part.text
      )}" data-roll-delay="${rollDelay}" data-roll-duration="${rollDuration}"${shakeAttr} style="animation-delay:${delay}s">${escapeHtml(
        part.text
      )}</span>`,
    };
  }
  return {
    burstHtml,
    spanHtml: `<span class="${roleClass} pop-${pop}"${shakeAttr} style="animation-delay:${delay}s">${escapeHtml(
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

function renderJagumi(cfg, charUrls) {
  if (!cfg) return "";
  const src = charUrls[cfg.asset];
  if (!src) throw new Error(`Unknown jagumi asset: ${cfg.asset}`);
  const enter = cfg.enter || "pop";
  const shakeAttr = cfg.shake !== undefined ? ` data-shake="${cfg.shakeDelay ?? 0}"` : "";
  const idleAttr = cfg.idle === "shake" ? ` data-shake="${cfg.shakeDelay ?? 0}"` : "";
  const qmark = cfg.questionMark
    ? `<div class="jg-qmark">？</div>`
    : "";
  return `<div class="jagumi-slot mode-${cfg.mode} side-${cfg.side}">
      <div class="jagumi-bob">
        <img class="jagumi-img enter-${enter}" src="${src}" style="--jg-size:${cfg.size}px"${shakeAttr}${idleAttr} />
        ${qmark}
      </div>
    </div>`;
}

function renderScene(scene, charUrls) {
  const linesHtml = scene.lines.map(renderLine).join("\n      ");
  const jagumiHtml = renderJagumi(scene.jagumi, charUrls);
  const eff = scene.effects || {};
  const dataAttrs = [
    eff.dim ? `data-effect-dim="1"` : "",
    eff.reelTurbo ? `data-effect-reel-turbo="1"` : "",
    eff.calm ? `data-effect-calm="1"` : "",
    eff.peopleGrid ? `data-effect-people-grid="1"` : "",
    eff.graphVariant ? `data-effect-graph-variant="${eff.graphVariant}"` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const safeAreaStyle = `--line-gap:${scene.gap}${scene.heroText ? ";--safe-bottom:780px" : ""}`;
  return `<div class="scene" data-scene="${scene.id}" data-start="${scene.start}" data-end="${scene.end}" ${dataAttrs}>
    ${jagumiHtml}
    <div class="safe-area" style="${safeAreaStyle}">
      ${linesHtml}
    </div>
  </div>`;
}

async function main() {
  if (!existsSync(FONT_BOLD) || !existsSync(FONT_BLACK)) {
    throw new Error(
      "V5 font files missing under assets/fonts/. Expected NotoSansJP-Bold.v5.subset.woff2 and NotoSansJP-Black.v5.subset.woff2."
    );
  }
  for (const file of Object.values(CHAR_ASSETS)) {
    if (!existsSync(path.join(CHAR_DIR, file))) {
      throw new Error(`Missing character asset: assets/characters/${file}`);
    }
  }

  await rm(FRAMES_DIR, { recursive: true, force: true });
  await mkdir(RENDER_TMP_DIR, { recursive: true });
  await mkdir(VIDEO_DIR, { recursive: true });

  const template = await readFile(TEMPLATE_PATH, "utf8");
  const fontBoldUrl = pathToFileURL(FONT_BOLD).href;
  const fontBlackUrl = pathToFileURL(FONT_BLACK).href;
  const charUrls = Object.fromEntries(
    Object.entries(CHAR_ASSETS).map(([key, file]) => [key, pathToFileURL(path.join(CHAR_DIR, file)).href])
  );

  const digitsHtml = renderDigits(5051, 16);
  const peopleHtml = renderPeopleGrid(3, 100); // 96.89% win -> ~3.11% lose, rounded to 3/100 icons
  const graphNeutral = renderGraphPath(5051, "neutral");
  const graphUp = renderGraphPath(5051, "up");
  const graphDown = renderGraphPath(5051, "down");
  const scenesHtml = timeline.map((s) => renderScene(s, charUrls)).join("\n\n  ");
  const totalDuration = Math.max(...timeline.map((s) => s.end));

  let html = template
    .replace("__FONT_BOLD_URL__", fontBoldUrl)
    .replace("__FONT_BLACK_URL__", fontBlackUrl)
    .replace("__GRAPH_PATH_NEUTRAL__", graphNeutral)
    .replace("__GRAPH_PATH_UP__", graphUp)
    .replace("__GRAPH_PATH_DOWN__", graphDown)
    .replace("__DIGITS_HTML__", digitsHtml)
    .replace("__PEOPLE_HTML__", peopleHtml)
    .replace("__SCENES_HTML__", scenesHtml);

  const htmlPath = path.join(RENDER_TMP_DIR, "video.html");
  await writeFile(htmlPath, html, "utf8");

  if (process.argv.includes("--html-only")) {
    console.log(`[render-v5] --html-only: wrote ${htmlPath}, skipping recording.`);
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
    console.warn("[render-v5] CDP setBackgroundColor unavailable, relying on CSS + leadIn trim:", err.message);
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
    `[render-v5] done: ${finalWebm} (totalDuration ${totalDuration}s, leadIn ${leadIn.toFixed(3)}s)`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

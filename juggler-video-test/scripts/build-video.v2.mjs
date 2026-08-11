// Turns the recorded per-scene webm clips from render-frames.v2.mjs into
// a single ~30s, 1080x1920, silent H.264 MP4: each clip is trimmed to its
// exact scene duration, normalized (30fps/yuv420p), given a short fade
// in/out, then all clips are concatenated. Output is versioned as
// juggler-test-30s-v2.mp4 -- Version 1's output file is never touched.

import { spawn } from "node:child_process";
import { readFile, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FRAMES_DIR = path.join(ROOT, "frames", "v2");
const OUT_DIR = path.join(ROOT, "output");
const CLIPS_DIR = path.join(FRAMES_DIR, "_clips");
const MANIFEST_PATH = path.join(FRAMES_DIR, "manifest.json");
const OUTPUT_NAME = "juggler-test-30s-v2.mp4";

const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
const FADE_SEC = 0.35;

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with ${code}\n${stderr}`));
    });
  });
}

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  const { canvas, scenes } = manifest;
  const fps = canvas.fps || 30;

  await rm(CLIPS_DIR, { recursive: true, force: true });
  await mkdir(CLIPS_DIR, { recursive: true });
  await mkdir(OUT_DIR, { recursive: true });

  const clipPaths = [];

  for (const scene of scenes) {
    const webmPath = path.join(ROOT, scene.webm);
    const clipPath = path.join(CLIPS_DIR, `clip-${String(scene.index).padStart(2, "0")}.mp4`);
    const fadeOutStart = Math.max(0, scene.duration - FADE_SEC);

    const vf = [
      `fps=${fps}`,
      `scale=${canvas.width}:${canvas.height}`,
      "format=yuv420p",
      `fade=t=in:st=0:d=${FADE_SEC}`,
      `fade=t=out:st=${fadeOutStart.toFixed(3)}:d=${FADE_SEC}`,
    ].join(",");

    const leadIn = scene.leadIn ?? 0;

    await run(FFMPEG, [
      "-y",
      "-i",
      webmPath,
      "-ss",
      String(leadIn),
      "-t",
      String(scene.duration),
      "-vf",
      vf,
      "-r",
      String(fps),
      "-c:v",
      "libx264",
      "-profile:v",
      "high",
      "-preset",
      "medium",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-an",
      "-hide_banner",
      "-loglevel",
      "error",
      clipPath,
    ]);

    clipPaths.push(clipPath);
    console.log(`[build-v2] clip ${scene.index} (${scene.id}) -> ${clipPath} (${scene.duration}s)`);
  }

  const listPath = path.join(CLIPS_DIR, "list.txt");
  const listContent = clipPaths.map((p) => `file '${p.replaceAll("'", "'\\''")}'`).join("\n") + "\n";
  await writeFile(listPath, listContent, "utf8");

  const outputPath = path.join(OUT_DIR, OUTPUT_NAME);
  await run(FFMPEG, [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-c",
    "copy",
    "-movflags",
    "+faststart",
    "-hide_banner",
    "-loglevel",
    "error",
    outputPath,
  ]);

  console.log(`[build-v2] done: ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

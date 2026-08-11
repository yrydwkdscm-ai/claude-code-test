// Turns the single continuous recording from render-video.v3.mjs into
// the final MP4. Much simpler than V1/V2's per-scene clip + concat
// pipeline, because V3 records the whole 30s as one take: trim off the
// lead-in (dead time before content starts animating), normalize to
// 30fps/yuv420p, fade in/out from black at the true start/end only
// (no per-scene cuts to fade, since scenes crossfade against the same
// continuous background inside the recording itself).

import { spawn } from "node:child_process";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FRAMES_DIR = path.join(ROOT, "frames", "v3");
const OUT_DIR = path.join(ROOT, "output");
const MANIFEST_PATH = path.join(FRAMES_DIR, "manifest.json");
const OUTPUT_NAME = "juggler-test-30s-v3.mp4";

const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
const FADE_SEC = 0.4;
// Extra safety margin beyond the measured lead-in. This only costs time
// once (not per scene, as in V2), so it's cheap to be generous here.
const LEAD_IN_SAFETY_SEC = 0.12;

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

function runCapture(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${cmd} exited with ${code}\n${stderr}`));
    });
  });
}

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  const { canvas, totalDuration, leadIn, webm } = manifest;
  const fps = canvas.fps || 30;

  await mkdir(OUT_DIR, { recursive: true });

  const webmPath = path.join(ROOT, webm);
  const outputPath = path.join(OUT_DIR, OUTPUT_NAME);
  const ss = (leadIn + LEAD_IN_SAFETY_SEC).toFixed(3);
  const fadeOutStart = Math.max(0, totalDuration - FADE_SEC).toFixed(3);

  // Fail loudly instead of silently emitting a too-short video: confirm
  // the raw recording actually has enough tail past the trim point.
  const sourceDurationStr = (
    await runCapture(FFMPEG.replace(/ffmpeg$/, "ffprobe"), [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      webmPath,
    ])
  ).trim();
  const sourceDuration = parseFloat(sourceDurationStr);
  const required = parseFloat(ss) + totalDuration;
  if (!Number.isFinite(sourceDuration) || sourceDuration < required) {
    throw new Error(
      `Raw recording is only ${sourceDuration}s but trimming needs ${required.toFixed(
        3
      )}s (leadIn ${leadIn}s + safety ${LEAD_IN_SAFETY_SEC}s + ${totalDuration}s content). ` +
        `Increase RECORD_PAD_SEC in render-video.v3.mjs and re-render.`
    );
  }

  const vf = [
    `fps=${fps}`,
    `scale=${canvas.width}:${canvas.height}`,
    "format=yuv420p",
    `fade=t=in:st=0:d=${FADE_SEC}:color=black`,
    `fade=t=out:st=${fadeOutStart}:d=${FADE_SEC}:color=black`,
  ].join(",");

  await run(FFMPEG, [
    "-y",
    "-i",
    webmPath,
    "-ss",
    ss,
    "-t",
    String(totalDuration),
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
    "17",
    "-pix_fmt",
    "yuv420p",
    "-an",
    "-movflags",
    "+faststart",
    "-hide_banner",
    "-loglevel",
    "error",
    outputPath,
  ]);

  const outDurationStr = (
    await runCapture(FFMPEG.replace(/ffmpeg$/, "ffprobe"), [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      outputPath,
    ])
  ).trim();
  const outDuration = parseFloat(outDurationStr);
  const ok = Math.abs(outDuration - totalDuration) < 0.05;
  console.log(
    `[build-v3] done: ${outputPath} (trimmed ${ss}s lead-in, output duration ${outDuration}s, expected ${totalDuration}s) ${
      ok ? "OK" : "MISMATCH -- check RECORD_PAD_SEC"
    }`
  );
  if (!ok) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

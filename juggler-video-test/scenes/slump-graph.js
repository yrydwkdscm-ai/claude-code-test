// Renders a slump graph (game count vs. diff) as an inline SVG string.
//
// This is intentionally *not* called with fabricated data anywhere in the
// current timelines. It exists so that once the simulator can export a
// real per-player game-by-game diff history, the ranking scene can plug it
// in without any template changes -- see scenes/timeline.v2.js, which
// calls this only when `data.slumpGraphs.rank1` (or similar) is a real
// array of points.
//
// points: [{ game: number, diff: number }, ...] sorted by game ascending.
// Returns null if there aren't enough points to draw a meaningful line.

export function buildSlumpGraphSvg(points, opts = {}) {
  if (!Array.isArray(points) || points.length < 2) return null;

  const width = opts.width ?? 860;
  const height = opts.height ?? 420;
  const padding = opts.padding ?? 28;
  const stroke = opts.stroke ?? "#ffcf4d";
  const gridStroke = opts.gridStroke ?? "rgba(255,255,255,0.12)";
  const zeroStroke = opts.zeroStroke ?? "rgba(255,255,255,0.22)";

  const games = points.map((p) => p.game);
  const diffs = points.map((p) => p.diff);
  const minGame = Math.min(...games);
  const maxGame = Math.max(...games);
  const minDiff = Math.min(0, ...diffs);
  const maxDiff = Math.max(0, ...diffs);

  const xSpan = maxGame - minGame || 1;
  const ySpan = maxDiff - minDiff || 1;

  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const x = (g) => padding + ((g - minGame) / xSpan) * innerW;
  const y = (d) => padding + innerH - ((d - minDiff) / ySpan) * innerH;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.game).toFixed(1)},${y(p.diff).toFixed(1)}`)
    .join(" ");

  const zeroY = y(0).toFixed(1);
  const last = points[points.length - 1];
  const lastX = x(last.game).toFixed(1);
  const lastY = y(last.diff).toFixed(1);

  const gridLines = [0.25, 0.5, 0.75]
    .map((t) => {
      const gy = (padding + innerH * t).toFixed(1);
      return `<line x1="${padding}" y1="${gy}" x2="${width - padding}" y2="${gy}" stroke="${gridStroke}" stroke-width="1.5" />`;
    })
    .join("");

  return `
<svg class="slump-graph" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  ${gridLines}
  <line x1="${padding}" y1="${zeroY}" x2="${width - padding}" y2="${zeroY}" stroke="${zeroStroke}" stroke-width="2" />
  <path d="${linePath}" fill="none" stroke="${stroke}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"
        class="slump-graph-line" pathLength="1" />
  <circle cx="${lastX}" cy="${lastY}" r="10" fill="${stroke}" class="slump-graph-dot" />
</svg>`.trim();
}

export default buildSlumpGraphSvg;

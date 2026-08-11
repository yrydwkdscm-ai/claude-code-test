// Scene timeline for the 30-second test video.
//
// Each scene = { start, end, gap, lines } (seconds; end - start = duration).
// A "line" is either:
//   { role, text, vars? }                — a single styled line of text
//   { role: "row", parts: [{role, text}], vars? } — a label+value row
//     rendered as inline spans (e.g. "BIG" tag + "1/228" value).
//
// "vars" is an optional map of CSS custom properties (font sizes, etc.)
// applied to that line's container, e.g. { "--fs-accent": "150px" }.
//
// Roles: heading (white/black, large), label (white/bold, medium),
// accent (gold gradient, the emphasized number), tag (dim pill badge
// used before a value in a row), note / caution (dim/orange, small).

import data from "../data/sample-data.json" with { type: "json" };

export const CANVAS = { width: 1080, height: 1920 };

export const timeline = [
  {
    id: "hook",
    start: 0,
    end: 3,
    gap: "36px",
    lines: [
      { role: "label", text: `設定${data.setting}なら`, vars: { "--fs-label": "72px" } },
      { role: "accent", text: "全員勝てる？", vars: { "--fs-accent": "118px" } },
    ],
  },
  {
    id: "context",
    start: 3,
    end: 7,
    gap: "30px",
    lines: [
      { role: "heading", text: data.machine, vars: { "--fs-heading": "92px" } },
      {
        role: "label",
        text: `設定${data.setting}を${data.players}人が`,
        vars: { "--fs-label": "62px" },
      },
      {
        role: "label",
        text: `${data.gamesPerPlayer}G回した結果`,
        vars: { "--fs-label": "62px" },
      },
    ],
  },
  {
    id: "avg-diff",
    start: 7,
    end: 12,
    gap: "44px",
    lines: [
      { role: "label", text: "平均差枚", vars: { "--fs-label": "68px" } },
      { role: "accent", text: data.stats.avgDiff, vars: { "--fs-accent": "176px" } },
    ],
  },
  {
    id: "win-rate",
    start: 12,
    end: 16,
    gap: "44px",
    lines: [
      { role: "label", text: "勝率", vars: { "--fs-label": "68px" } },
      { role: "accent", text: data.stats.winRate, vars: { "--fs-accent": "190px" } },
    ],
  },
  {
    id: "ranking",
    start: 16,
    end: 21,
    gap: "56px",
    lines: [
      {
        role: "row",
        parts: [
          { role: "tag", text: "1位" },
          { role: "accent", text: data.ranking.rank1 },
        ],
        vars: { "--fs-tag": "52px", "--fs-accent": "118px" },
      },
      {
        role: "row",
        parts: [
          { role: "tag", text: "20位" },
          { role: "accent", text: data.ranking.rank20 },
        ],
        vars: { "--fs-tag": "52px", "--fs-accent": "110px" },
      },
    ],
  },
  {
    id: "rates",
    start: 21,
    end: 26,
    gap: "40px",
    lines: [
      {
        role: "row",
        parts: [
          { role: "tag", text: "BIG" },
          { role: "accent", text: data.stats.big },
        ],
        vars: { "--fs-tag": "50px", "--fs-accent": "100px" },
      },
      {
        role: "row",
        parts: [
          { role: "tag", text: "REG" },
          { role: "accent", text: data.stats.reg },
        ],
        vars: { "--fs-tag": "50px", "--fs-accent": "100px" },
      },
      {
        role: "row",
        parts: [
          { role: "tag", text: "合算" },
          { role: "accent", text: data.stats.combined },
        ],
        vars: { "--fs-tag": "50px", "--fs-accent": "100px" },
      },
    ],
  },
  {
    id: "closing",
    start: 26,
    end: 30,
    gap: "40px",
    lines: [
      {
        role: "heading",
        text: "今回の20人は全員プラス",
        vars: { "--fs-heading": "70px" },
      },
      {
        role: "caution",
        text: "でも毎回こうなるとは限らない",
        vars: { "--fs-caution": "48px" },
      },
    ],
  },
];

export default timeline;

// Scene timeline for the Version 2 test video (adds motion: number
// pop-ins, staged reveals, a conditional slump graph). Version 1's
// timeline.js / scene.html are untouched -- this is a parallel file.
//
// Line shape:
//   { role, text, delay?, vars?, pop? }                 — single line
//   { role: "row", parts: [{role, text}], delay?, vars?, pop? } — label+value row
//   { role: "graph", svg, delay? }                        — pre-rendered SVG (slump graph)
//
// delay: seconds after the scene's own entrance to start this line's
//   reveal (default 0).
// pop: "normal" | "strong" | "none" — applied to accent (and hero) spans;
//   "strong" is reserved for the two flagship numbers + the closing line.

import data from "../data/sample-data.json" with { type: "json" };
import { buildSlumpGraphSvg } from "./slump-graph.js";

export const CANVAS = { width: 1080, height: 1920, fps: 30 };

// Real data only. If the simulator hasn't produced a per-game diff
// history yet (as this round), this stays null and the ranking scene
// falls back to the simple 1位/20位 display -- no fabricated graph.
const rank1Points = data.slumpGraphs?.rank1 ?? null;
const rank1GraphSvg = buildSlumpGraphSvg(rank1Points);

const rankingScene = rank1GraphSvg
  ? {
      id: "ranking",
      start: 16,
      end: 21,
      gap: "36px",
      lines: [
        {
          role: "row",
          parts: [
            { role: "tag", text: "1位" },
            { role: "accent", text: data.ranking.rank1 },
          ],
          vars: { "--fs-tag": "44px", "--fs-accent": "88px" },
          pop: "normal",
        },
        { role: "graph", svg: rank1GraphSvg, delay: 0.25 },
      ],
    }
  : {
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
          pop: "normal",
        },
        {
          role: "row",
          parts: [
            { role: "tag", text: "20位" },
            { role: "accent", text: data.ranking.rank20 },
          ],
          vars: { "--fs-tag": "52px", "--fs-accent": "110px" },
          pop: "normal",
          delay: 0.15,
        },
      ],
    };

export const timeline = [
  {
    id: "hook",
    start: 0,
    end: 3,
    gap: "28px",
    lines: [
      { role: "label", text: `設定${data.setting}を${data.players}人が`, vars: { "--fs-label": "66px" } },
      {
        role: "label",
        text: `${data.gamesPerPlayer}G回したら…`,
        vars: { "--fs-label": "66px" },
        delay: 0.12,
      },
      {
        role: "accent",
        text: "まさかの結果に",
        vars: { "--fs-accent": "100px" },
        delay: 1.3,
        pop: "normal",
      },
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
        delay: 0.12,
      },
      {
        role: "label",
        text: `${data.gamesPerPlayer}G回した結果`,
        vars: { "--fs-label": "62px" },
        delay: 0.22,
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
      {
        role: "accent",
        text: data.stats.avgDiff,
        vars: { "--fs-accent": "176px" },
        delay: 0.2,
        pop: "strong",
      },
    ],
  },
  {
    id: "win-rate",
    start: 12,
    end: 16,
    gap: "44px",
    lines: [
      { role: "label", text: "勝率", vars: { "--fs-label": "68px" } },
      {
        role: "accent",
        text: data.stats.winRate,
        vars: { "--fs-accent": "190px" },
        delay: 0.2,
        pop: "strong",
      },
    ],
  },
  rankingScene,
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
        pop: "normal",
      },
      {
        role: "row",
        parts: [
          { role: "tag", text: "REG" },
          { role: "accent", text: data.stats.reg },
        ],
        vars: { "--fs-tag": "50px", "--fs-accent": "100px" },
        pop: "normal",
        delay: 0.15,
      },
      {
        role: "row",
        parts: [
          { role: "tag", text: "合算" },
          { role: "accent", text: data.stats.combined },
        ],
        vars: { "--fs-tag": "50px", "--fs-accent": "100px" },
        pop: "normal",
        delay: 0.3,
      },
    ],
  },
  {
    id: "closing",
    start: 26,
    end: 30,
    gap: "26px",
    lines: [
      { role: "label", text: "今回の20人は", vars: { "--fs-label": "62px" } },
      {
        role: "accent",
        text: "全員プラス",
        vars: { "--fs-accent": "196px" },
        delay: 0.35,
        pop: "hero",
      },
      {
        role: "caution",
        text: "でも毎回こうなるとは限らない",
        vars: { "--fs-caution": "46px" },
        delay: 1.5,
        enter: "fadeUp",
      },
    ],
  },
];

export default timeline;

// Scene timeline for Version 3.
//
// Theme change from V1/V2 ("N players x G games each") to a single
// large-scale simulation run ("total games" -- e.g. "1000万G"). This
// round still has no real 10-million-game simulator output, so the
// numeric results below are the *same placeholder values V1/V2 used*
// (reused, not invented -- see data/sample-data.json's resultsAreTestData
// flag), and every scene that shows one of those results carries a
// small "TEST DATA" tag. Only the opening (machine/setting/totalGames)
// states real, intentional parameters -- not a fabricated outcome.
//
// Line/row/graph shape is the same as timeline.v2.js. See that file's
// header comment for the schema. New here: role "testtag" (small
// disclaimer pill) and pop "mega" (reserved for the totalGames hero).

import data from "../data/sample-data.json" with { type: "json" };
import { buildSlumpGraphSvg } from "./slump-graph.js";

export const CANVAS = { width: 1080, height: 1920, fps: 30 };

// "10000000" -> "1000万". Falls back to a plain digit-grouped number if
// it doesn't land on a clean 万 (10,000) multiple, so this keeps working
// once real simulator totals (which may not be round numbers) arrive.
export function formatGameCount(n) {
  if (Number.isInteger(n) && n >= 10000 && n % 10000 === 0) {
    return `${n / 10000}万`;
  }
  return n.toLocaleString("ja-JP");
}

const TEST_TAG = { role: "testtag", text: "TEST DATA" };

const rank1Points = data.slumpGraphs?.rank1 ?? null;
const rank1GraphSvg = buildSlumpGraphSvg(rank1Points);

const rankingScene = rank1GraphSvg
  ? {
      id: "ranking",
      start: 14,
      end: 19,
      gap: "30px",
      lines: [
        TEST_TAG,
        {
          role: "row",
          parts: [
            { role: "tag", text: "1位" },
            { role: "accent", text: data.ranking.rank1 },
          ],
          vars: { "--fs-tag": "44px", "--fs-accent": "84px" },
          pop: "normal",
          delay: 0.15,
        },
        { role: "graph", svg: rank1GraphSvg, delay: 0.35 },
      ],
    }
  : {
      id: "ranking",
      start: 14,
      end: 19,
      gap: "46px",
      lines: [
        TEST_TAG,
        {
          role: "row",
          parts: [
            { role: "tag", text: "1位" },
            { role: "accent", text: data.ranking.rank1 },
          ],
          vars: { "--fs-tag": "50px", "--fs-accent": "112px" },
          pop: "normal",
          delay: 0.15,
        },
        {
          role: "row",
          parts: [
            { role: "tag", text: "20位" },
            { role: "accent", text: data.ranking.rank20 },
          ],
          vars: { "--fs-tag": "50px", "--fs-accent": "104px" },
          pop: "normal",
          delay: 0.3,
        },
      ],
    };

export const timeline = [
  {
    id: "intro-a",
    start: 0,
    end: 1.5,
    gap: "22px",
    lines: [
      { role: "label", text: data.machine, vars: { "--fs-label": "68px" } },
      {
        role: "heading",
        text: `設定${data.setting}`,
        vars: { "--fs-heading": "94px" },
        delay: 0.15,
      },
    ],
  },
  {
    id: "intro-b",
    start: 1.5,
    end: 3.5,
    gap: "0px",
    lines: [
      {
        role: "accent",
        text: `${formatGameCount(data.totalGames)}G`,
        vars: { "--fs-accent": "216px" },
        pop: "mega",
        delay: 0.05,
      },
    ],
  },
  {
    id: "intro-c",
    start: 3.5,
    end: 5,
    gap: "0px",
    lines: [{ role: "label", text: "回した結果…", vars: { "--fs-label": "78px" } }],
  },
  {
    id: "avg-diff",
    start: 5,
    end: 10,
    gap: "40px",
    lines: [
      TEST_TAG,
      { role: "label", text: "平均差枚", vars: { "--fs-label": "68px" }, delay: 0.1 },
      {
        role: "accent",
        text: data.averageDifference,
        vars: { "--fs-accent": "170px" },
        delay: 0.3,
        pop: "strong",
      },
    ],
  },
  {
    id: "win-rate",
    start: 10,
    end: 14,
    gap: "40px",
    lines: [
      TEST_TAG,
      { role: "label", text: "勝率", vars: { "--fs-label": "68px" }, delay: 0.1 },
      {
        role: "accent",
        text: data.winRate,
        vars: { "--fs-accent": "184px" },
        delay: 0.3,
        pop: "strong",
      },
    ],
  },
  rankingScene,
  {
    id: "rates",
    start: 19,
    end: 24,
    gap: "34px",
    lines: [
      TEST_TAG,
      {
        role: "row",
        parts: [
          { role: "tag", text: "BIG" },
          { role: "accent", text: data.bigProbability },
        ],
        vars: { "--fs-tag": "50px", "--fs-accent": "96px" },
        pop: "normal",
        delay: 0.15,
      },
      {
        role: "row",
        parts: [
          { role: "tag", text: "REG" },
          { role: "accent", text: data.regProbability },
        ],
        vars: { "--fs-tag": "50px", "--fs-accent": "96px" },
        pop: "normal",
        delay: 0.3,
      },
      {
        role: "row",
        parts: [
          { role: "tag", text: "合算" },
          { role: "accent", text: data.combinedProbability },
        ],
        vars: { "--fs-tag": "50px", "--fs-accent": "96px" },
        pop: "normal",
        delay: 0.45,
      },
    ],
  },
  {
    id: "closing",
    start: 24,
    end: 30,
    gap: "22px",
    lines: [
      TEST_TAG,
      { role: "label", text: "今回の20人は", vars: { "--fs-label": "60px" }, delay: 0.1 },
      {
        role: "accent",
        text: "全員プラス",
        vars: { "--fs-accent": "192px" },
        delay: 0.4,
        pop: "hero",
      },
      {
        role: "caution",
        text: "でも毎回こうなるとは限らない",
        vars: { "--fs-caution": "44px" },
        delay: 1.5,
        enter: "fadeUp",
      },
    ],
  },
];

export default timeline;

// Scene timeline for Version 6.
//
// Builds on V5 (same real data, same white-flash-safe single-page
// crossfade architecture, same Jagumi character, same 1080x1920/30fps/
// ~30s/1-message-per-screen/black-outline-text rules). V5's files are
// untouched -- this is a parallel timeline. Changes from V5:
//   - "8000万G" now lands inside the first 0.5s.
//   - Jagumi is much bigger in the emotional-peak scenes (hero mode
//     sizes below), while data-first scenes keep her modest so she
//     never covers a number.
//   - Every key number gets its own animation "personality" (see each
//     scene's `numberTheme`) instead of one generic pop-in.
//   - The 80,000,000G countup gets its own arrival scene, separate from
//     the "which format do I show" concern.
//   - The wording bug from V5 is fixed: "ほぼ全員勝った？" -> "全員勝った？".
//
// Line/jagumi/effects schema is a superset of timeline.v5.js's. New
// fields are documented inline where first used.

import data from "../data/sample-data.json" with { type: "json" };

export const CANVAS = { width: 1080, height: 1920, fps: 30 };

const d = data.v4; // same real dataset V4/V5 use; nothing here is new/invented

export function formatMan(n) {
  if (Number.isInteger(n) && n >= 10000 && n % 10000 === 0) return `${n / 10000}万`;
  return n.toLocaleString("ja-JP");
}
export function formatSigned(n, unit) {
  const rounded = Math.round(n);
  const sign = rounded >= 0 ? "+" : "-";
  return `${sign}${Math.abs(rounded).toLocaleString("ja-JP")}${unit}`;
}
export function formatPercent(n, digits = 2) {
  return `${n.toFixed(digits)}%`;
}

export const timeline = [
  {
    id: "intro-a",
    start: 0.0,
    end: 0.2,
    gap: "0px",
    heroText: true,
    lines: [{ role: "heading", text: `設定${d.setting}`, vars: { "--fs-heading": "160px" } }],
    jagumi: { asset: "chibi-full", mode: "hero", side: "center", size: 520, enter: "pop", idle: "bob" },
  },
  {
    id: "intro-b",
    start: 0.2,
    end: 1.4,
    gap: "0px",
    heroText: true,
    lines: [
      {
        role: "mega",
        text: `${formatMan(d.totalGames)}G`,
        vars: { "--fs-mega": "216px" },
        pop: "mega",
        roll: true,
        rollDuration: 0.26,
        shake: 0.26,
      },
    ],
    jagumi: { asset: "chibi-full", mode: "hero", side: "left", size: 600, enter: "pop", idle: "bob", point: true },
    effects: { reelTurbo: true, graphVariant: "up", digitsBurst: true },
  },
  {
    id: "intro-c",
    start: 1.4,
    end: 2.3,
    gap: "0px",
    heroText: true,
    lines: [{ role: "label", text: "回した結果…", vars: { "--fs-label": "80px" } }],
    jagumi: { asset: "thinking", mode: "hero", side: "center", size: 420, enter: "pop", idle: "bob" },
  },
  {
    id: "tease",
    start: 2.3,
    end: 4.5,
    gap: "34px",
    heroText: true,
    lines: [
      { role: "label", text: `設定${d.setting}なら`, vars: { "--fs-label": "74px" } },
      {
        role: "taunt",
        text: "全員勝った？",
        vars: { "--fs-taunt": "116px" },
        delay: 1.15,
        pop: "hero",
      },
    ],
    jagumi: {
      asset: "thinking",
      mode: "hero",
      side: "center",
      size: 640,
      enter: "pop",
      idle: "bob",
      questionMark: true,
    },
    effects: { calm: true },
  },
  {
    id: "scale",
    start: 4.5,
    end: 7.5,
    gap: "26px",
    lines: [
      { role: "label", text: `${(d.participants / 10000).toLocaleString("ja-JP")}万人が`, vars: { "--fs-label": "56px" } },
      { role: "label", text: `1人${d.gamesPerPerson.toLocaleString("ja-JP")}G`, vars: { "--fs-label": "56px" }, delay: 0.15 },
      {
        role: "countup",
        displayRole: "gold",
        to: d.totalGames,
        suffix: "G",
        duration: 2.5,
        delay: 0.35,
        milestones: [10000000, 30000000, 50000000],
        vars: { "--fs-gold": "124px" },
      },
    ],
    jagumi: { asset: "chibi-full", mode: "corner", side: "right", size: 320, enter: "slideRight", idle: "bob" },
    effects: { reelTurbo: true },
  },
  {
    id: "reach",
    start: 7.5,
    end: 8.5,
    gap: "0px",
    heroText: true,
    lines: [
      {
        role: "gold",
        text: "80,000,000G",
        vars: { "--fs-gold": "104px" },
        pop: "hero",
        shake: 0.05,
        swapTo: `${formatMan(d.totalGames)}G`,
        swapDelay: 0.45,
        swapVars: { "--fs-gold": "196px" },
      },
    ],
    jagumi: { asset: "joy-win", mode: "hero", side: "center", size: 560, enter: "pop", idle: "bob" },
    effects: { reelStop: true, graphFreeze: true },
  },
  {
    id: "avg-diff",
    start: 8.5,
    end: 11.0,
    gap: "34px",
    lines: [
      { role: "label", text: `${formatMan(d.totalGames)}Gの平均差枚`, vars: { "--fs-label": "54px" } },
      {
        role: "plus",
        text: formatSigned(d.averageDifference, "枚"),
        vars: { "--fs-plus": "150px" },
        delay: 0.3,
        pop: "strong",
        enter: "riseUp",
      },
    ],
    jagumi: { asset: "joy-win", mode: "corner", side: "right", size: 340, enter: "pop", idle: "bob" },
    effects: { graphVariant: "up", decor: "arrow-up" },
  },
  {
    id: "payout",
    start: 11.0,
    end: 13.5,
    gap: "34px",
    lines: [
      { role: "label", text: "平均出率", vars: { "--fs-label": "62px" } },
      {
        role: "gold",
        text: formatPercent(d.payoutRate),
        vars: { "--fs-gold": "164px" },
        delay: 0.3,
        pop: "smooth",
      },
    ],
    jagumi: { asset: "explain", mode: "corner", side: "left", size: 320, enter: "pop", idle: "bob" },
    effects: { graphVariant: "up", decor: "gauge", gaugeValue: 1.0 },
  },
  {
    id: "winrate-ask",
    start: 13.5,
    end: 16.0,
    gap: "0px",
    lines: [{ role: "label", text: "1万人の勝率", vars: { "--fs-label": "68px" } }],
    jagumi: { asset: "thinking", mode: "corner", side: "right", size: 320, enter: "pop", idle: "bob" },
    effects: { calm: true },
  },
  {
    id: "winrate",
    start: 16.0,
    end: 18.5,
    gap: "0px",
    heroText: true,
    lines: [
      {
        role: "gold",
        text: formatPercent(d.winRate),
        vars: { "--fs-gold": "196px" },
        pop: "hero",
        roll: true,
        rollDuration: 0.4,
        shake: 0.4,
      },
    ],
    jagumi: { asset: "surprise-shock", mode: "hero", side: "center", size: 640, enter: "pop", idle: "shake", shakeDelay: 0.4 },
    effects: { reelStop: true, peopleGrid: true },
  },
  {
    id: "but",
    start: 18.5,
    end: 19.5,
    gap: "0px",
    heroText: true,
    lines: [{ role: "label", text: "でも…", vars: { "--fs-label": "92px" } }],
    jagumi: { asset: "dejected", mode: "hero", side: "center", size: 480, enter: "pop", idle: "none" },
    effects: { dim: true, calm: true },
  },
  {
    id: "min-diff",
    start: 19.5,
    end: 23.0,
    gap: "26px",
    heroText: true,
    lines: [
      { role: "label", text: "最低差枚", vars: { "--fs-label": "62px" } },
      {
        role: "minus",
        text: formatSigned(d.minDifference, "枚"),
        vars: { "--fs-minus": "182px" },
        delay: 0.25,
        pop: "hero",
        enter: "dropSlam",
        glow: "red",
        shake: 0.55,
      },
    ],
    jagumi: {
      asset: "surprise-shock",
      mode: "hero",
      side: "right",
      size: 700,
      enter: "pop",
      idle: "shake",
      shakeDelay: 0.55,
    },
    effects: { graphVariant: "down", decor: "arrow-down", neonRed: true },
  },
  {
    id: "conclusion",
    start: 23.0,
    end: 27.0,
    gap: "18px",
    heroText: true,
    lines: [
      { role: "heading", text: `設定${d.setting}でも`, vars: { "--fs-heading": "70px" } },
      {
        role: "label",
        text: `${d.gamesPerPerson.toLocaleString("ja-JP")}Gなら`,
        vars: { "--fs-label": "60px" },
        delay: 0.55,
      },
      {
        role: "taunt",
        text: "負けることがある",
        vars: { "--fs-taunt": "78px" },
        delay: 1.15,
        pop: "hero",
      },
    ],
    jagumi: { asset: "explain", mode: "hero", side: "center", size: 500, enter: "pop", idle: "bob" },
    effects: { graphVariant: "neutral" },
  },
  {
    id: "closing",
    start: 27.0,
    end: 30.0,
    gap: "22px",
    heroText: true,
    lines: [
      { role: "label", text: "次は", vars: { "--fs-label": "60px" } },
      { role: "heading", text: `設定1を`, vars: { "--fs-heading": "78px" }, delay: 0.55 },
      {
        role: "taunt",
        text: `${formatMan(d.totalGames)}G？`,
        vars: { "--fs-taunt": "92px" },
        delay: 1.1,
        pop: "strong",
      },
      { role: "brand", text: "ジャグラー検証会", vars: { "--fs-brand": "36px" }, delay: 2.2, enter: "fadeUp" },
    ],
    jagumi: { asset: "chibi-full", mode: "hero", side: "center", size: 560, enter: "pop", idle: "bob", point: true },
  },
];

export default timeline;

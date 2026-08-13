// Scene timeline for Version 4.
//
// Theme: real simulator output (data.v4 in sample-data.json -- namespaced
// separately from V1-V3's fields so nothing there is touched), edited as
// "entertainment x data verification": one message per screen, a visual
// answer built up over the runtime rather than a stat dump, and a more
// arcade-style bold/outlined typographic system (see template/scene.v4.html).
//
// Line shape (superset of V2/V3's):
//   { role, text, delay?, vars?, pop?, enter? }
//   { role: "countup", displayRole, to, suffix?, duration?, delay?, vars? }
//   { role: <mega/etc>, text, roll: true, rollDelay?, rollDuration?, shake? }
//
// "shake" (seconds, relative to scene start) triggers a brief screen-shake
// on the whole scene -- used once, for the 8000万G impact beat.

import data from "../data/sample-data.json" with { type: "json" };

export const CANVAS = { width: 1080, height: 1920, fps: 30 };

const d = data.v4;

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
    start: 0,
    end: 0.7,
    gap: "0px",
    lines: [
      { role: "heading", text: `設定${d.setting}を`, vars: { "--fs-heading": "150px" } },
    ],
  },
  {
    id: "intro-b",
    start: 0.7,
    end: 1.5,
    gap: "0px",
    lines: [
      {
        role: "mega",
        text: `${formatMan(d.totalGames)}G`,
        vars: { "--fs-mega": "224px" },
        pop: "mega",
        roll: true,
        rollDuration: 0.32,
        shake: 0.3,
      },
    ],
  },
  {
    id: "intro-c",
    start: 1.5,
    end: 2.5,
    gap: "0px",
    lines: [{ role: "label", text: "回した結果…", vars: { "--fs-label": "80px" } }],
  },
  {
    id: "tease-a",
    start: 2.5,
    end: 5.0,
    gap: "34px",
    lines: [
      { role: "label", text: `設定${d.setting}なら`, vars: { "--fs-label": "76px" } },
      {
        role: "taunt",
        text: "全員勝てる？",
        vars: { "--fs-taunt": "112px" },
        delay: 1.0,
        pop: "strong",
      },
    ],
  },
  {
    id: "scale",
    start: 5.0,
    end: 8.0,
    gap: "30px",
    lines: [
      {
        role: "label",
        text: `${(d.participants / 10000).toLocaleString("ja-JP")}万人が`,
        vars: { "--fs-label": "62px" },
      },
      {
        role: "label",
        text: `1人${d.gamesPerPerson.toLocaleString("ja-JP")}G`,
        vars: { "--fs-label": "62px" },
        delay: 0.15,
      },
      {
        role: "countup",
        displayRole: "gold",
        to: d.totalGames,
        suffix: "G",
        duration: 2.3,
        delay: 0.4,
        vars: { "--fs-gold": "148px" },
      },
    ],
  },
  {
    id: "avg-diff",
    start: 8.0,
    end: 11.0,
    gap: "40px",
    lines: [
      {
        role: "label",
        text: `${formatMan(d.totalGames)}Gの平均差枚`,
        vars: { "--fs-label": "62px" },
      },
      {
        role: "plus",
        text: formatSigned(d.averageDifference, "枚"),
        vars: { "--fs-plus": "168px" },
        delay: 0.3,
        pop: "strong",
      },
    ],
  },
  {
    id: "payout",
    start: 11.0,
    end: 14.0,
    gap: "40px",
    lines: [
      { role: "label", text: "平均出率", vars: { "--fs-label": "68px" } },
      {
        role: "gold",
        text: formatPercent(d.payoutRate),
        vars: { "--fs-gold": "180px" },
        delay: 0.3,
        pop: "strong",
      },
    ],
  },
  {
    id: "ask-again",
    start: 14.0,
    end: 17.0,
    gap: "34px",
    lines: [
      { role: "label", text: `じゃあ設定${d.setting}なら`, vars: { "--fs-label": "70px" } },
      {
        role: "taunt",
        text: "全員勝てた？",
        vars: { "--fs-taunt": "112px" },
        delay: 1.3,
        pop: "strong",
      },
    ],
  },
  {
    id: "winrate-answer",
    start: 17.0,
    end: 21.0,
    gap: "30px",
    lines: [
      { role: "label", text: "1万人の勝率", vars: { "--fs-label": "66px" } },
      {
        role: "gold",
        text: formatPercent(d.winRate),
        vars: { "--fs-gold": "196px" },
        delay: 1.2,
        pop: "hero",
      },
      {
        role: "note",
        text: `約${(100 - d.winRate).toFixed(1)}%は負け`,
        vars: { "--fs-note": "50px" },
        delay: 2.6,
        enter: "fadeUp",
      },
    ],
  },
  {
    id: "min-diff",
    start: 21.0,
    end: 25.0,
    gap: "26px",
    lines: [
      { role: "label", text: "しかも設定6なのに…", vars: { "--fs-label": "60px" } },
      { role: "label", text: "最低差枚", vars: { "--fs-label": "60px" }, delay: 1.1 },
      {
        role: "minus",
        text: formatSigned(d.minDifference, "枚"),
        vars: { "--fs-minus": "168px" },
        delay: 1.9,
        pop: "hero",
        glow: "red",
      },
    ],
  },
  {
    id: "closing",
    start: 25.0,
    end: 30.0,
    gap: "22px",
    lines: [
      { role: "heading", text: `設定${d.setting}でも`, vars: { "--fs-heading": "80px" }, delay: 0.1 },
      {
        role: "taunt",
        text: "短期では負ける",
        vars: { "--fs-taunt": "104px" },
        delay: 0.8,
        pop: "hero",
      },
      {
        role: "note",
        text: `${formatMan(d.totalGames)}Gシミュレーション`,
        vars: { "--fs-note": "42px" },
        delay: 2.2,
        enter: "fadeUp",
      },
      {
        role: "note",
        text: "次は設定1を8000万G？",
        vars: { "--fs-note": "32px" },
        delay: 3.2,
        enter: "fadeUp",
      },
    ],
  },
];

export default timeline;

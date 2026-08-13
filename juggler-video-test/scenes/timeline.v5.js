// Scene timeline for Version 5.
//
// Builds on V4 (same real data, same white-flash-safe single-page
// crossfade architecture, same 1080x1920/30fps/~30s/1 message-per-screen
// rules) and adds the "Jagumi" mascot character as the visual co-lead.
// V4's files are untouched -- this is a parallel timeline.
//
// Character images are cropped/matted from the user-supplied character
// sheet (see scripts/render-video.v5.mjs's header comment for exactly
// which crop became which asset). No character art is generated here.
//
// Line schema is the same as timeline.v4.js. New per-scene fields:
//   jagumi: { asset, mode: "hero"|"corner", side, size, enter, delay,
//             idle, shake } -- see template/scene.v5.html for how each
//             is rendered/animated.
//   effects: { dim, reelTurbo, graphVariant, peopleGrid } -- scene-level
//             background/mood toggles, all additive to V4's background.

import data from "../data/sample-data.json" with { type: "json" };

export const CANVAS = { width: 1080, height: 1920, fps: 30 };

const d = data.v4; // same real dataset V4 uses; nothing here is new/invented

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
    heroText: true,
    lines: [{ role: "heading", text: `設定${d.setting}を`, vars: { "--fs-heading": "150px" } }],
    jagumi: {
      asset: "chibi-full",
      mode: "hero",
      side: "center",
      size: 460,
      enter: "pop",
      idle: "bob",
    },
  },
  {
    id: "intro-b",
    start: 0.7,
    end: 1.7,
    gap: "0px",
    heroText: true,
    lines: [
      {
        role: "mega",
        text: `${formatMan(d.totalGames)}G`,
        vars: { "--fs-mega": "214px" },
        pop: "mega",
        roll: true,
        rollDuration: 0.32,
        shake: 0.3,
      },
    ],
    jagumi: {
      asset: "chibi-full",
      mode: "hero",
      side: "left",
      size: 440,
      enter: "none",
      idle: "bob",
    },
  },
  {
    id: "intro-c",
    start: 1.7,
    end: 2.5,
    gap: "0px",
    heroText: true,
    lines: [{ role: "label", text: "回した結果…", vars: { "--fs-label": "78px" } }],
    jagumi: {
      asset: "thinking",
      mode: "hero",
      side: "center",
      size: 340,
      enter: "pop",
      idle: "bob",
    },
  },
  {
    id: "tease-a",
    start: 2.5,
    end: 5.0,
    gap: "34px",
    heroText: true,
    lines: [
      { role: "label", text: `設定${d.setting}なら`, vars: { "--fs-label": "72px" } },
      {
        role: "taunt",
        text: "全員勝てる？",
        vars: { "--fs-taunt": "108px" },
        delay: 1.0,
        pop: "strong",
      },
    ],
    jagumi: {
      asset: "thinking",
      mode: "hero",
      side: "center",
      size: 340,
      enter: "none",
      idle: "bob",
      questionMark: true,
    },
  },
  {
    id: "scale",
    start: 5.0,
    end: 8.0,
    gap: "28px",
    lines: [
      { role: "label", text: `${(d.participants / 10000).toLocaleString("ja-JP")}万人が`, vars: { "--fs-label": "58px" } },
      { role: "label", text: `1人${d.gamesPerPerson.toLocaleString("ja-JP")}G`, vars: { "--fs-label": "58px" }, delay: 0.15 },
      {
        role: "countup",
        displayRole: "gold",
        to: d.totalGames,
        suffix: "G",
        duration: 2.3,
        delay: 0.4,
        vars: { "--fs-gold": "128px" },
      },
    ],
    jagumi: {
      asset: "chibi-full",
      mode: "corner",
      side: "right",
      size: 300,
      enter: "slideRight",
      idle: "bob",
    },
    effects: { reelTurbo: true },
  },
  {
    id: "avg-diff",
    start: 8.0,
    end: 11.0,
    gap: "36px",
    lines: [
      { role: "label", text: `${formatMan(d.totalGames)}Gの平均差枚`, vars: { "--fs-label": "56px" } },
      {
        role: "plus",
        text: formatSigned(d.averageDifference, "枚"),
        vars: { "--fs-plus": "156px" },
        delay: 0.3,
        pop: "strong",
      },
    ],
    jagumi: {
      asset: "joy-win",
      mode: "corner",
      side: "right",
      size: 270,
      enter: "pop",
      idle: "bob",
    },
    effects: { graphVariant: "up" },
  },
  {
    id: "payout",
    start: 11.0,
    end: 14.0,
    gap: "36px",
    lines: [
      { role: "label", text: "平均出率", vars: { "--fs-label": "64px" } },
      {
        role: "gold",
        text: formatPercent(d.payoutRate),
        vars: { "--fs-gold": "168px" },
        delay: 0.3,
        pop: "strong",
      },
    ],
    jagumi: {
      asset: "explain",
      mode: "corner",
      side: "left",
      size: 270,
      enter: "pop",
      idle: "bob",
    },
    effects: { graphVariant: "up" },
  },
  {
    id: "ask-again",
    start: 14.0,
    end: 17.0,
    gap: "30px",
    lines: [
      { role: "label", text: "じゃあ1万人、", vars: { "--fs-label": "62px" } },
      { role: "taunt", text: "ほぼ全員勝った？", vars: { "--fs-taunt": "84px" }, delay: 1.3, pop: "strong" },
    ],
    jagumi: {
      asset: "thinking",
      mode: "corner",
      side: "right",
      size: 300,
      enter: "pop",
      idle: "bob",
    },
  },
  {
    id: "winrate",
    start: 17.0,
    end: 19.5,
    gap: "26px",
    lines: [
      { role: "label", text: "勝率", vars: { "--fs-label": "62px" } },
      {
        role: "gold",
        text: formatPercent(d.winRate),
        vars: { "--fs-gold": "188px" },
        delay: 0.35,
        pop: "hero",
      },
    ],
    jagumi: {
      asset: "surprise-shock",
      mode: "corner",
      side: "left",
      size: 300,
      enter: "pop",
      idle: "shake",
      shakeDelay: 0.35,
    },
    effects: { peopleGrid: true },
  },
  {
    id: "but",
    start: 19.5,
    end: 20.5,
    gap: "0px",
    lines: [{ role: "label", text: "でも…", vars: { "--fs-label": "92px" } }],
    jagumi: {
      asset: "dejected",
      mode: "hero",
      side: "center",
      size: 320,
      enter: "pop",
      idle: "none",
    },
    effects: { dim: true, calm: true },
  },
  {
    id: "min-diff",
    start: 20.5,
    end: 23.5,
    gap: "26px",
    lines: [
      { role: "label", text: "最低差枚", vars: { "--fs-label": "62px" } },
      {
        role: "minus",
        text: formatSigned(d.minDifference, "枚"),
        vars: { "--fs-minus": "168px" },
        delay: 0.3,
        pop: "hero",
        glow: "red",
        shake: 0.3,
      },
      {
        role: "label",
        text: `設定${d.setting}でも負ける。`,
        vars: { "--fs-label": "46px" },
        delay: 2.35,
        enter: "fadeUp",
      },
    ],
    jagumi: {
      asset: "surprise-shock",
      mode: "corner",
      side: "right",
      size: 300,
      enter: "pop",
      idle: "shake",
      shakeDelay: 0.3,
    },
    effects: { graphVariant: "down" },
  },
  {
    id: "conclusion",
    start: 23.5,
    end: 27.0,
    gap: "24px",
    lines: [
      { role: "heading", text: `設定${d.setting}でも`, vars: { "--fs-heading": "76px" } },
      {
        role: "taunt",
        text: `${d.gamesPerPerson.toLocaleString("ja-JP")}Gなら負けることがある`,
        vars: { "--fs-taunt": "58px" },
        delay: 0.6,
        pop: "strong",
      },
    ],
    jagumi: {
      asset: "explain",
      mode: "corner",
      side: "left",
      size: 280,
      enter: "pop",
      idle: "bob",
    },
    effects: { graphVariant: "neutral" },
  },
  {
    id: "closing",
    start: 27.0,
    end: 30.0,
    gap: "20px",
    heroText: true,
    lines: [
      { role: "note", text: `${formatMan(d.totalGames)}G検証`, vars: { "--fs-note": "48px" }, delay: 0.1 },
      {
        role: "taunt",
        text: `次は設定1を${formatMan(d.totalGames)}G回したら？`,
        vars: { "--fs-taunt": "46px" },
        delay: 1.0,
        enter: "fadeUp",
      },
      {
        role: "brand",
        text: "ジャグラー検証会",
        vars: { "--fs-brand": "36px" },
        delay: 2.1,
        enter: "fadeUp",
      },
    ],
    jagumi: {
      asset: "chibi-full",
      mode: "hero",
      side: "center",
      size: 420,
      enter: "pop",
      idle: "bob",
    },
  },
];

export default timeline;

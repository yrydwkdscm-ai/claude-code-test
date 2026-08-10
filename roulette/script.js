// ルーレットの5つの区画を、ハズレ4つ・当たり1つで定義します。
// index は index.html 内の seg0〜seg4 の並び順と一致させています。
const SEGMENTS = [
  { label: "ハズレ", win: false },
  { label: "ハズレ", win: false },
  { label: "当たり", win: true },
  { label: "ハズレ", win: false },
  { label: "ハズレ", win: false },
];

const SEGMENT_ANGLE = 360 / SEGMENTS.length; // 72度
const wheel = document.getElementById("wheel");
const spinButton = document.getElementById("spin-button");
const resultEl = document.getElementById("result");

let currentRotation = 0;
let isSpinning = false;

function spin() {
  if (isSpinning) return;
  isSpinning = true;
  spinButton.disabled = true;
  resultEl.textContent = "";
  resultEl.className = "result";

  // 0〜4のどれかを均等な確率(各20%)で選ぶ
  const winningIndex = Math.floor(Math.random() * SEGMENTS.length);
  const segment = SEGMENTS[winningIndex];

  // その区画の中心角度（上の指し棒(0度)を基準にした位置）
  const centerAngle = winningIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;

  // 区画内で少しランダムにずらして、毎回同じ位置で止まらないようにする
  const jitter = (Math.random() - 0.5) * (SEGMENT_ANGLE * 0.6);

  // 指し棒(上=0度)にその区画が来るための回転量（0〜360の範囲）
  const targetMod = (360 - centerAngle - jitter + 360) % 360;

  // 見た目のためにさらに5〜7周分回転させる
  const extraSpins = 5 + Math.floor(Math.random() * 3);
  const currentMod = ((currentRotation % 360) + 360) % 360;
  const delta = extraSpins * 360 + ((targetMod - currentMod + 360) % 360);

  currentRotation += delta;
  wheel.style.transform = `rotate(${currentRotation}deg)`;

  wheel.addEventListener(
    "transitionend",
    () => {
      isSpinning = false;
      spinButton.disabled = false;
      if (segment.win) {
        resultEl.textContent = "🎉 当たり！おめでとうございます！";
        resultEl.classList.add("win");
      } else {
        resultEl.textContent = "残念、ハズレです。もう一度挑戦しよう！";
        resultEl.classList.add("lose");
      }
    },
    { once: true }
  );
}

spinButton.addEventListener("click", spin);

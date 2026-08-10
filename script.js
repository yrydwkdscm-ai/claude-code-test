document.addEventListener("DOMContentLoaded", () => {
  const rollButton = document.getElementById("roll-button");
  const dice = document.getElementById("dice");
  const diceNumber = document.getElementById("dice-number");

  rollButton.addEventListener("click", () => {
    // 1〜6のランダムな整数を作る
    const result = Math.floor(Math.random() * 6) + 1;

    // 見た目にちょっとしたアニメーションをつける
    dice.classList.add("rolling");

    setTimeout(() => {
      diceNumber.textContent = result;
      dice.classList.remove("rolling");
    }, 150);
  });
});

(() => {
  const themes = [
    { name: "Paper", bg: "#ffffff", fg: "#111111", a: "#ff5a00", b: "#0047ff" },
    { name: "Inverse", bg: "#111111", fg: "#ffffff", a: "#efff00", b: "#673cff" },
    { name: "Signal", bg: "#0638c7", fg: "#ff7a00", a: "#f2ff00", b: "#ff26bd" },
    { name: "Ultraviolet", bg: "#5b16d6", fg: "#f3ff00", a: "#39ff14", b: "#ff2a00" }
  ];

  const root = document.getElementById("playground");
  const word = document.getElementById("word");
  const input = document.getElementById("drift");
  const output = document.getElementById("drift-value");
  const swatches = document.getElementById("swatches");
  let themeIndex = 0;
  let targetDrift = 50;
  let smoothedDrift = 50;

  themes.forEach((theme, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "swatch" + (index === 0 ? " is-active" : "");
    button.style.setProperty("--swatch-bg", theme.bg);
    button.style.setProperty("--swatch-fg", theme.fg);
    button.setAttribute("aria-label", theme.name);
    button.setAttribute("aria-pressed", index === 0 ? "true" : "false");
    button.addEventListener("click", () => {
      themeIndex = index;
      root.style.setProperty("--page-bg", theme.bg);
      root.style.setProperty("--page-fg", theme.fg);
      [...swatches.children].forEach((item, itemIndex) => {
        item.classList.toggle("is-active", itemIndex === index);
        item.setAttribute("aria-pressed", itemIndex === index ? "true" : "false");
      });
    });
    swatches.appendChild(button);
  });

  input.addEventListener("input", () => {
    targetDrift = Number(input.value);
    output.textContent = String(targetDrift).padStart(3, "0");
    input.setAttribute("aria-valuetext", targetDrift + " percent");
  });

  let editTimer;
  function splitText() {
    const value = word.textContent || "DRFT";
    word.textContent = "";
    [...value].forEach(character => {
      const span = document.createElement("span");
      span.dataset.letter = "";
      span.textContent = character === " " ? "\u00a0" : character;
      word.appendChild(span);
    });
  }
  splitText();
  word.addEventListener("input", () => {
    clearTimeout(editTimer);
    editTimer = setTimeout(splitText, 350);
  });

  const random = (min, max) => min + Math.random() * (max - min);
  function makeWalker(now, minDuration, maxDuration, initial = random(-1, 1)) {
    return { from: initial, to: random(-1, 1), startedAt: now, endsAt: now + random(minDuration, maxDuration), minDuration, maxDuration };
  }
  function sample(walker, now) {
    while (now >= walker.endsAt) {
      walker.from = walker.to;
      walker.to = random(-1, 1);
      walker.startedAt = walker.endsAt;
      walker.endsAt += random(walker.minDuration, walker.maxDuration);
    }
    let t = Math.max(0, Math.min(1, (now - walker.startedAt) / (walker.endsAt - walker.startedAt)));
    t = t * t * t * (t * (t * 6 - 15) + 10);
    return walker.from + (walker.to - walker.from) * t;
  }

  const started = performance.now();
  let previous = started;
  const shared = makeWalker(started, 2200, 5200, 0);
  const breathing = makeWalker(started, 4200, 8500, 0);
  const axes = [];
  const motion = [];

  function animate(now) {
    const delta = Math.min(0.05, (now - previous) / 1000);
    previous = now;
    smoothedDrift += (targetDrift - smoothedDrift) * (1 - Math.exp(-delta * 12));
    const amount = smoothedDrift / 100;
    const spatial = amount * amount * (3 - 2 * amount);
    const sharedValue = sample(shared, now);
    const breath = sample(breathing, now) * 0.5 + 0.5;
    const envelope = 1 - 0.5 * amount * (1 - (0.35 + 0.65 * breath));
    const theme = themes[themeIndex];

    [...word.querySelectorAll("[data-letter]")].forEach((span, index) => {
      axes[index] ||= makeWalker(now, 1700, 4600);
      motion[index] ||= makeWalker(now, 2600, 6800);
      let signal = (sample(axes[index], now) * 0.75 + sharedValue * 0.25) * envelope;
      signal += (Math.sin(signal * Math.PI * 0.5) - signal) * (0.18 * amount);
      const axis = Math.max(0, Math.min(1000, 500 + signal * 500 * amount));
      const deviation = (axis - 500) / 500;
      const magnitude = Math.abs(deviation);
      const secondary = sample(motion[index], now) * (0.3 + 0.7 * magnitude);
      const x = (deviation * 0.18 + secondary * 0.0396) * spatial;
      const y = (deviation * 0.11 + secondary * 0.0352) * spatial;
      const rotation = (deviation * 0.55 + secondary * 0.121) * spatial;
      const blur = magnitude * magnitude * 0.00875 * amount;
      const gate = Math.max(0, magnitude - 0.35) / 0.65;
      const rgb = gate * gate * 0.018 * amount;
      span.style.fontVariationSettings = `"DRFT" ${axis.toFixed(1)}`;
      span.style.transform = `translate3d(${x.toFixed(4)}em,${y.toFixed(4)}em,0) rotate(${rotation.toFixed(3)}deg)`;
      span.style.filter = blur > 0.001 ? `blur(${blur.toFixed(4)}em)` : "none";
      span.style.textShadow = rgb > 0.001 ? `${(-rgb).toFixed(4)}em 0 ${theme.a}, ${rgb.toFixed(4)}em 0 ${theme.b}` : "none";
    });
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
})();

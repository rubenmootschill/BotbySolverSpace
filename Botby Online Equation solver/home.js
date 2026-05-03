const recentSection = document.getElementById("recentSection");
const recentDivider = document.getElementById("recentDivider");
const recentGrid = document.getElementById("recentGrid");

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderRecentActivity() {
  if (!recentSection || !recentDivider || !recentGrid || !window.BotbyRecentHistory) {
    return;
  }

  const items = window.BotbyRecentHistory.getAll().slice(0, 3);
  const hasItems = items.length > 0;

  recentSection.hidden = !hasItems;
  recentDivider.hidden = !hasItems;

  if (!hasItems) {
    recentGrid.innerHTML = "";
    return;
  }

  recentGrid.innerHTML = items.map((item) => {
    const baseHref = item.href && item.href.length > 0
      ? item.href
      : (item.kind === "quiz" ? "quiz.html" : "solver.html");
    const href = `${baseHref}?recent=${encodeURIComponent(item.savedAt)}`;
    return `
      <a class="home-recent-card home-recent-card-live" href="${escapeHtml(href)}">
        <span class="home-card-tag">${escapeHtml(window.BotbyRecentHistory.getTag(item))}</span>
        <h3 class="home-recent-equation">${escapeHtml(item.equation)}</h3>
        <p class="home-recent-answer">${escapeHtml(window.BotbyRecentHistory.formatResult(item))}</p>
      </a>
    `;
  }).join("");
}

document.addEventListener("langchange", renderRecentActivity);
renderRecentActivity();

/* ── Hero star field ──────────────────────────────────────────── */
function createHeroStars() {
  const layer = document.querySelector(".hero-stars");
  if (!layer) return;
  const count = window.innerWidth < 640 ? 30 : 60;
  for (let i = 0; i < count; i++) {
    const s = document.createElement("span");
    s.className = "hero-star";
    s.style.setProperty("--x", `${Math.random() * 100}%`);
    s.style.setProperty("--y", `${Math.random() * 100}%`);
    s.style.setProperty("--size", `${1 + Math.random() * 2.2}px`);
    s.style.setProperty("--delay", `${-(Math.random() * 6)}s`);
    s.style.setProperty("--dur", `${2 + Math.random() * 3.5}s`);
    layer.appendChild(s);
  }
}

/* ── Floating math + space symbols ───────────────────────────── */
function createHomeSymbols() {
  const layer = document.getElementById("homeSymbols");
  if (!layer) return;
  const symbols = [
    "∑", "π", "√", "÷", "×", "x²", "y", "∞", "≠", "≈",
    "x", "n", "★", "✦", "·", "f(x)", "=", "α", "∫", "Δ",
    "2x", "y²", "±", "✧", "3x",
  ];
  const count = window.innerWidth < 640 ? 10 : 20;
  for (let i = 0; i < count; i++) {
    const el = document.createElement("span");
    el.className = "bg-symbol";
    el.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    el.style.setProperty("--x", `${Math.random() * 100}%`);
    el.style.setProperty("--size", `${14 + Math.random() * 20}px`);
    el.style.setProperty("--duration", `${22 + Math.random() * 18}s`);
    el.style.setProperty("--delay", `${-(Math.random() * 30)}s`);
    el.style.setProperty("--drift", `${-24 + Math.random() * 48}px`);
    layer.appendChild(el);
  }
}

createHeroStars();
createHomeSymbols();

const equationInput = document.getElementById("equationInput");
const solveBtn = document.getElementById("solveBtn");
const explainBtn = document.getElementById("explainBtn");
const clearSolverBtn = document.getElementById("clearSolverBtn");
const clearSolverHistoryBtn = document.getElementById("clearSolverHistoryBtn");
const solveMessage = document.getElementById("solveMessage");
const explainBox = document.getElementById("explainBox");
const solverResultHighlight = document.getElementById("solverResultHighlight");
const solverTypeBadge = document.getElementById("solverTypeBadge");
const solverHistoryList = document.getElementById("solverHistoryList");
const solverExampleChips = document.querySelectorAll(".solver-example-chip");
const floatingNumbers = document.getElementById("floatingNumbers");
const solverTutorialBtn = document.getElementById("solverTutorialBtn");
const solverTutorialModal = document.getElementById("solverTutorialModal");
const solverTutorialCloseBtn = document.getElementById("solverTutorialCloseBtn");
const SOLVER_LOCAL_HISTORY_KEY = "botby-solver-local-history";
const SOLVER_LOCAL_HISTORY_LIMIT = 5;
let currentTaskStartedAt = Date.now();
let isSolving = false;
let lastSolvedEquation = "";
let lastSolvedResult = null;

createFloatingNumbers();
restoreRecentSolve();
renderLocalHistory();

equationInput.addEventListener("input", () => {
  currentTaskStartedAt = Date.now();
  updateDetectedType(equationInput.value.trim());
});

equationInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    solveBtn.click();
  }
});

solveBtn.addEventListener("click", () => {
  runSolve({ withLoading: true, showExplanation: false });
});

explainBtn.addEventListener("click", () => {
  const rawEquation = equationInput.value.trim();
  if (!rawEquation) {
    showMessage(window.t("err.emptyInput"), true, false);
    hideExplanation();
    return;
  }

  if (lastSolvedEquation === rawEquation && lastSolvedResult) {
    showExplanation(buildExplanationHTML(rawEquation, lastSolvedResult));
    return;
  }

  runSolve({ withLoading: true, showExplanation: true });
});

if (clearSolverBtn) {
  clearSolverBtn.addEventListener("click", () => {
    equationInput.value = "";
    showMessage("", false, false);
    clearResultHighlight();
    hideExplanation();
    updateDetectedType("");
    lastSolvedEquation = "";
    lastSolvedResult = null;
    equationInput.focus();
  });
}

if (clearSolverHistoryBtn) {
  clearSolverHistoryBtn.addEventListener("click", () => {
    writeLocalHistory([]);
    renderLocalHistory();
  });
}

if (solverExampleChips.length) {
  solverExampleChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const example = chip.getAttribute("data-example") || "";
      equationInput.value = example;
      updateDetectedType(example);
      equationInput.focus();
    });
  });
}

if (solverTutorialBtn && solverTutorialModal && solverTutorialCloseBtn) {
  solverTutorialBtn.addEventListener("click", openTutorialModal);
  solverTutorialCloseBtn.addEventListener("click", closeTutorialModal);
  solverTutorialModal.addEventListener("click", (event) => {
    if (event.target === solverTutorialModal) {
      closeTutorialModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !solverTutorialModal.hidden) {
      closeTutorialModal();
    }
  });
}

function savePracticeAttempt(equation, result, wasCorrect, source) {
  if (!window.BotbyRecentHistory || typeof window.BotbyRecentHistory.addPracticeAttempt !== "function") {
    return;
  }

  const now = Date.now();
  const durationMs = Math.max(0, now - currentTaskStartedAt);
  currentTaskStartedAt = now;

  window.BotbyRecentHistory.addPracticeAttempt({
    equation,
    source,
    resultType: result && result.type ? result.type : "none",
    wasCorrect,
    durationMs,
  });
}

function openTutorialModal() {
  solverTutorialModal.hidden = false;
  solverTutorialCloseBtn.focus();
}

function closeTutorialModal() {
  solverTutorialModal.hidden = true;
  solverTutorialBtn.focus();
}

function updateDetectedType(equation) {
  if (!solverTypeBadge) {
    return;
  }

  if (!equation) {
    solverTypeBadge.hidden = true;
    return;
  }

  try {
    const { a, b } = getStandardCoefficients(equation);
    const type = almostZero(a)
      ? (almostZero(b) ? "Identity / Constant" : "Linear Equation")
      : "Quadratic Equation";
    solverTypeBadge.textContent = `Detected: ${type}`;
    solverTypeBadge.hidden = false;
  } catch (error) {
    solverTypeBadge.textContent = "Detected: Unsupported / Invalid";
    solverTypeBadge.hidden = false;
  }
}

function humanizeSolveError(error) {
  const raw = error && error.message ? String(error.message) : "";

  if (raw.includes("exactly one '='")) {
    return "Invalid equation: include exactly one '=' sign.";
  }
  if (raw.includes("empty left or right")) {
    return "Invalid equation: both sides of '=' must contain an expression.";
  }
  if (raw.includes("Only equations up to x^2")) {
    return "Only linear and quadratic equations (up to x^2) are supported right now.";
  }
  if (raw.includes("Mismatched parentheses")) {
    return "Invalid expression: check your parentheses.";
  }
  if (raw.includes("Division by zero")) {
    return "Invalid expression: division by zero detected.";
  }
  if (raw.includes("Invalid expression syntax")) {
    return "Invalid equation syntax. Try a format like 2x + 4 = 10.";
  }
  if (raw.includes("Unexpected character")) {
    return "Unsupported characters found. Use numbers, x, +, -, *, /, ^, and parentheses only.";
  }

  return "Please enter a valid equation, for example: x + 3 = 10.";
}

function runSolve(options) {
  const settings = options || {};
  const withLoading = settings.withLoading !== false;
  const showExplanationAfterSolve = Boolean(settings.showExplanation);

  if (isSolving) {
    return;
  }

  const rawEquation = equationInput.value.trim();
  if (!rawEquation) {
    showMessage(window.t("err.emptyInput"), true, false);
    clearResultHighlight();
    hideExplanation();
    lastSolvedEquation = "";
    lastSolvedResult = null;
    return;
  }

  const execute = () => {
    try {
      const result = solveLinearEquation(rawEquation);
      lastSolvedEquation = rawEquation;
      lastSolvedResult = result;
      renderResult(result);
      savePracticeAttempt(rawEquation, result, null, "solver");
      if (showExplanationAfterSolve) {
        showExplanation(buildExplanationHTML(rawEquation, result));
      } else {
        hideExplanation();
      }
      updateDetectedType(rawEquation);
      addLocalHistory(rawEquation, result);
    } catch (error) {
      savePracticeAttempt(rawEquation, { type: "none" }, null, "solver");
      showMessage(humanizeSolveError(error), true, false);
      clearResultHighlight();
      hideExplanation();
      updateDetectedType("");
      lastSolvedEquation = "";
      lastSolvedResult = null;
    } finally {
      isSolving = false;
      solveBtn.disabled = false;
    }
  };

  if (!withLoading) {
    execute();
    return;
  }

  isSolving = true;
  solveBtn.disabled = true;
  showMessage("Solving...", false, false);
  clearResultHighlight();
  hideExplanation();
  window.setTimeout(execute, 120);
}

function addLocalHistory(equation, result) {
  if (!equation || !result || !solverHistoryList) {
    return;
  }

  const item = {
    equation,
    answer: formatResultText(result),
    savedAt: Date.now(),
  };

  const items = readLocalHistory();
  const deduped = items.filter((entry) => {
    return !(entry.equation === item.equation && entry.answer === item.answer);
  });
  deduped.unshift(item);
  writeLocalHistory(deduped.slice(0, SOLVER_LOCAL_HISTORY_LIMIT));
  renderLocalHistory();
}

function readLocalHistory() {
  try {
    const raw = localStorage.getItem(SOLVER_LOCAL_HISTORY_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry) => entry && entry.equation && entry.answer);
  } catch (error) {
    return [];
  }
}

function writeLocalHistory(items) {
  try {
    localStorage.setItem(SOLVER_LOCAL_HISTORY_KEY, JSON.stringify(items));
  } catch (error) {
    // Ignore storage failures.
  }
}

function renderLocalHistory() {
  if (!solverHistoryList) {
    return;
  }

  const items = readLocalHistory().slice(0, SOLVER_LOCAL_HISTORY_LIMIT);
  if (!items.length) {
    solverHistoryList.innerHTML = '<p class="solver-history-empty">No recent solves yet.</p>';
    return;
  }

  solverHistoryList.innerHTML = items.map((item) => {
    return `<button class="solver-history-item" type="button" data-equation="${escapeHtml(item.equation)}">`
      + `<span class="solver-history-eq">${escapeHtml(prettyMathText(item.equation))}</span>`
      + `<span class="solver-history-arrow">→</span>`
      + `<span class="solver-history-answer">${escapeHtml(prettyMathText(item.answer))}</span>`
      + `</button>`;
  }).join("");

  const buttons = solverHistoryList.querySelectorAll(".solver-history-item");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const equation = button.getAttribute("data-equation") || "";
      equationInput.value = equation;
      updateDetectedType(equation);
      equationInput.focus();
      runSolve({ withLoading: false, showExplanation: false });
    });
  });
}

function formatResultText(result) {
  if (!result) {
    return "No solution";
  }

  if (result.type === "one") {
    return `x = ${formatNumber(result.value)}`;
  }

  if (result.type === "two") {
    return `x = ${formatNumber(result.values[0])} or x = ${formatNumber(result.values[1])}`;
  }

  if (result.type === "infinite") {
    return "Infinitely many solutions";
  }

  return "No solution";
}

function prettyMathText(text) {
  return String(text)
    .replace(/\^2/g, "²")
    .replace(/\*/g, "×")
    .replace(/\//g, "÷");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showMessage(text, isError, canExplain) {
  solveMessage.textContent = text;
  solveMessage.classList.remove("success", "error");

  const hasText = Boolean(text && text.trim());
  solveMessage.classList.toggle("is-visible", hasText);
  if (explainBtn) {
    explainBtn.hidden = !hasText || isError || !canExplain || text === "Solving...";
  }

  if (hasText) {
    solveMessage.classList.add(isError ? "error" : "success");
  }
}

function renderResult(result, shouldSave) {
  if (shouldSave !== false) {
    saveRecentResult(result);
  }

  if (result.type === "one") {
    showMessage("", false, false);
    if (explainBtn) {
      explainBtn.hidden = false;
    }
    showResultHighlight("Final Answer", `x = ${formatNumber(result.value)}`);
    return;
  }

  if (result.type === "two") {
    const left = formatNumber(result.values[0]);
    const right = formatNumber(result.values[1]);
    showMessage("", false, false);
    if (explainBtn) {
      explainBtn.hidden = false;
    }
    showResultHighlight("Final Answer", `x = ${left} or x = ${right}`);
    return;
  }

  if (result.type === "infinite") {
    showMessage("", false, false);
    if (explainBtn) {
      explainBtn.hidden = false;
    }
    showResultHighlight("Final Answer", window.t("solver.infinite"));
    return;
  }

  showMessage(window.t("solver.noSolution"), true, true);
  showResultHighlight("Final Answer", window.t("solver.noSolution"), true);
}

function showResultHighlight(title, text, isError) {
  if (!solverResultHighlight) {
    return;
  }

  solverResultHighlight.innerHTML = `<span class="solver-result-kicker">${escapeHtml(title)}</span><strong>${escapeHtml(prettyMathText(text))}</strong>`;
  solverResultHighlight.hidden = false;
  solverResultHighlight.classList.toggle("solver-result-error", Boolean(isError));
  solverResultHighlight.classList.add("is-visible");
}

function clearResultHighlight() {
  if (!solverResultHighlight) {
    return;
  }

  solverResultHighlight.innerHTML = "";
  solverResultHighlight.hidden = true;
  solverResultHighlight.classList.remove("solver-result-error", "is-visible");
}

function restoreRecentSolve() {
  if (!window.BotbyRecentHistory) {
    return;
  }

  const recentId = new URLSearchParams(window.location.search).get("recent");
  if (!recentId) {
    return;
  }

  const entry = window.BotbyRecentHistory.getById(recentId);
  if (!entry || entry.kind !== "solver") {
    return;
  }

  const result = window.BotbyRecentHistory.toResult(entry);
  if (!result) {
    return;
  }

  equationInput.value = entry.equation || "";
  renderResult(result, false);
  updateDetectedType(entry.equation || "");
  showExplanation(buildExplanationHTML(entry.equation || "", result));
}

function saveRecentResult(result) {
  if (!window.BotbyRecentHistory) {
    return;
  }

  window.BotbyRecentHistory.add({
    kind: "solver",
    equation: equationInput.value.trim(),
    resultType: result.type,
    value: typeof result.value === "number" ? result.value : undefined,
    values: Array.isArray(result.values) ? result.values : undefined,
  });
}

function showExplanation(html) {
  explainBox.innerHTML = html ? `<div class="explain-steps">${html}</div>` : "";
  explainBox.classList.toggle("is-visible", Boolean(html && html.trim()));
}

function hideExplanation() {
  explainBox.innerHTML = "";
  explainBox.classList.remove("is-visible");
}

function buildExplanationHTML(equation, result) {
  const { a, b, c } = getStandardCoefficients(equation);
  const fn = formatNumber;
  const eqParts = equation.split("=");
  const lhsConst = evaluateExpression(eqParts[0].trim(), 0);

  function esc(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function makeStep(label, eqStr, desc, resultStr) {
    return [
      `<div class="explain-step">`,
      `<div class="step-label">${label}</div>`,
      eqStr ? `<div class="step-eq">${esc(prettyMathText(eqStr))}</div>` : "",
      desc ? `<p class="step-desc">${desc}</p>` : "",
      resultStr ? `<div class="step-eq">${esc(prettyMathText(resultStr))}</div>` : "",
      `</div>`,
    ].join("");
  }

  function makeSolution(text) {
    return `<div class="explain-step explain-solution"><div class="step-label">${window.t("explain.solution")}</div><div class="step-eq">${esc(prettyMathText(text))}</div></div>`;
  }

  function makeVerificationStep(xValue) {
    const parts = equation.split("=");
    if (parts.length !== 2) {
      return "";
    }

    const leftText = parts[0].trim();
    const rightText = parts[1].trim();
    const displayValue = fn(xValue);
    const replacement = xValue < 0 ? `(${displayValue})` : displayValue;
    const substitutedLeft = leftText.replace(/x/gi, replacement);
    const substitutedRight = rightText.replace(/x/gi, replacement);

    return makeStep(
      "Check",
      `x = ${displayValue}`,
      "",
      `${substitutedLeft} = ${substitutedRight}`
    );
  }

  let html = "";

  // ── Special cases ────────────────────────────────────────────────
  if (result.type === "infinite") {
    html += makeStep(window.t("explain.step") + " 1", equation, window.t("explain.infinite.desc"), "");
    html += makeSolution(window.t("explain.infinite.sol"));
    return html;
  }

  if (result.type === "none") {
    html += makeStep(window.t("explain.step") + " 1", equation, window.t("explain.none.desc"), "");
    html += makeSolution(window.t("explain.none.sol"));
    return html;
  }

  // ── Linear (a = 0) ───────────────────────────────────────────────
  if (almostZero(a)) {
    const proceduralLinear = buildProceduralLinearExplanation(equation, result, makeStep, makeSolution, makeVerificationStep, fn);
    if (proceduralLinear) {
      return proceduralLinear;
    }

    let stepNum = 1;

    if (!almostZero(c)) {
      const desc = lhsConst > 0
        ? window.t("explain.linear.subtractDesc", { n: fn(lhsConst) })
        : window.t("explain.linear.addDesc", { n: fn(Math.abs(lhsConst)) });
      const afterMove = almostZero(b - 1) ? `x = ${fn(-c)}`
        : almostZero(b + 1) ? `-x = ${fn(-c)}`
        : `${fn(b)}x = ${fn(-c)}`;
      html += makeStep(`${window.t("explain.step")} ${stepNum++}`, equation, desc, afterMove);
    }

    if (!almostZero(b - 1) && !almostZero(b + 1)) {
      const prev = almostZero(c) ? equation : `${fn(b)}x = ${fn(-c)}`;
      html += makeStep(`${window.t("explain.step")} ${stepNum++}`, prev, window.t("explain.linear.divideDesc", { b: fn(b) }), `x = ${fn(result.value)}`);
    } else if (almostZero(b + 1)) {
      const prev = almostZero(c) ? equation : `-x = ${fn(-c)}`;
      html += makeStep(`${window.t("explain.step")} ${stepNum++}`, prev, window.t("explain.linear.flipDesc"), `x = ${fn(result.value)}`);
    } else if (almostZero(c)) {
      html += makeStep(`${window.t("explain.step")} ${stepNum++}`, equation, window.t("explain.linear.isolatedDesc"), `x = ${fn(result.value)}`);
    }

    html += makeSolution(`x = ${fn(result.value)}`);
    html += makeVerificationStep(result.value);
    return html;
  }

  // ── Quadratic, b = 0 → square root method ────────────────────────
  if (almostZero(b)) {
    const rhs = -c / a;
    const sqrtVal = fn(Math.sqrt(rhs));

    if (result.type === "two") {
      html += makeStep(window.t("explain.step") + " 1", equation,
        window.t("explain.sqrt.desc"),
        `x = \u00b1${sqrtVal}`);
      html += makeStep(window.t("explain.step") + " 2", `x = \u00b1${sqrtVal}`,
        window.t("explain.sqrt.split"),
        `x = -${sqrtVal}  ${window.t("solver.orSep")}  x = ${sqrtVal}`);
      html += makeSolution(`x = ${fn(result.values[0])}  ${window.t("solver.orSep")}  x = ${fn(result.values[1])}`);
    } else {
      html += makeStep(window.t("explain.step") + " 1", equation, window.t("explain.sqrt.singleDesc"), `x = ${sqrtVal}`);
      html += makeSolution(`x = ${fn(result.value)}`);
    }
    return html;
  }

  // ── General quadratic → quadratic formula ────────────────────────
  const disc = b * b - 4 * a * c;
  const sqrtD = fn(Math.sqrt(Math.abs(disc)));
  const aTerm = (almostZero(a - 1) ? "" : almostZero(a + 1) ? "-" : fn(a)) + "x\u00b2";
  const bTerm = almostZero(b) ? "" :
    (b > 0 ? " + " : " - ") + (almostZero(Math.abs(b) - 1) ? "" : fn(Math.abs(b))) + "x";
  const cTerm = almostZero(c) ? "" : (c > 0 ? " + " : " - ") + fn(Math.abs(c));
  const standardForm = `${aTerm}${bTerm}${cTerm} = 0`;

  html += makeStep(window.t("explain.step") + " 1", equation, window.t("explain.quad.step1desc"), standardForm);
  html += makeStep(window.t("explain.step") + " 2", standardForm,
    window.t("explain.quad.step2desc", { a: fn(a), b: fn(b), c: fn(c) }),
    `x = (${fn(-b)} \u00b1 \u221a(${fn(b)}\u00b2 - 4\u00d7${fn(a)}\u00d7${fn(c)})) / ${fn(2 * a)}`);
  html += makeStep(window.t("explain.step") + " 3",
    `x = (${fn(-b)} \u00b1 \u221a(${fn(b * b)} - ${fn(4 * a * c)})) / ${fn(2 * a)}`,
    window.t("explain.quad.step3desc", { b2: fn(b * b), ac4: fn(4 * a * c), disc: fn(disc) }),
    `x = (${fn(-b)} \u00b1 \u221a${fn(disc)}) / ${fn(2 * a)}`);

  if (result.type === "none") {
    html += makeStep(window.t("explain.step") + " 4", `x = (${fn(-b)} \u00b1 \u221a${fn(disc)}) / ${fn(2 * a)}`,
      window.t("explain.quad.noRealDesc"), "");
    html += makeSolution(window.t("explain.quad.noRealSol"));
    return html;
  }

  if (result.type === "two") {
    html += makeStep(window.t("explain.step") + " 4", `x = (${fn(-b)} \u00b1 ${sqrtD}) / ${fn(2 * a)}`,
      window.t("explain.quad.splitDesc"),
      `x = ${fn(result.values[0])}  ${window.t("solver.orSep")}  x = ${fn(result.values[1])}`);
    html += makeSolution(`x = ${fn(result.values[0])}  ${window.t("solver.orSep")}  x = ${fn(result.values[1])}`);
    return html;
  }

  html += makeStep(window.t("explain.step") + " 4", `x = ${fn(-b)} / ${fn(2 * a)}`,
    window.t("explain.quad.zeroDiscDesc"),
    `x = ${fn(result.value)}`);
  html += makeSolution(`x = ${fn(result.value)}`);
  return html;
}

function buildProceduralLinearExplanation(equation, result, makeStep, makeSolution, makeVerificationStep, fn) {
  if (result.type !== "one") {
    return "";
  }

  const parts = equation.split("=");
  if (parts.length !== 2) {
    return "";
  }

  const left = parseSimpleLinearSide(parts[0]);
  const right = parseSimpleLinearSide(parts[1]);

  if (!left || !right || Math.abs(left.den - 1) < 1e-8 || Math.abs(right.den - 1) > 1e-8 || Math.abs(right.numA) > 1e-8) {
    return "";
  }

  const d = left.den;
  const rhsAfterMultiply = right.numB * d;
  const movedRightExpr = `${fn(rhsAfterMultiply)} ${left.numB >= 0 ? "-" : "+"} ${fn(Math.abs(left.numB))}`;
  const movedRightValue = rhsAfterMultiply - left.numB;

  const numeratorExpr = formatAxPlusB(left.numA, left.numB, fn);
  const xTerm = formatXTerm(left.numA, fn);

  let html = "";
  html += makeStep(
    `${window.t("explain.step")} 1`,
    equation,
    window.t("linear.explainMultiplyDesc", { n: fn(d) }),
    `${numeratorExpr} = ${fn(rhsAfterMultiply)}`
  );

  html += makeStep(
    `${window.t("explain.step")} 2`,
    `${numeratorExpr} = ${fn(rhsAfterMultiply)}`,
    window.t("linear.explainMoveConstDesc"),
    `${xTerm} = ${movedRightExpr}`
  );

  if (Math.abs(left.numA - 1) < 1e-8) {
    html += makeStep(
      `${window.t("explain.step")} 3`,
      `${xTerm} = ${movedRightExpr}`,
      window.t("linear.explainComputeDesc"),
      `x = ${fn(movedRightValue)}`
    );
    html += makeSolution(`x = ${fn(movedRightValue)}`);
    html += makeVerificationStep(movedRightValue);
    return html;
  }

  if (Math.abs(left.numA + 1) < 1e-8) {
    html += makeStep(
      `${window.t("explain.step")} 3`,
      `${xTerm} = ${movedRightExpr}`,
      window.t("linear.explainComputeDesc"),
      `-x = ${fn(movedRightValue)}`
    );
    html += makeStep(
      `${window.t("explain.step")} 4`,
      `-x = ${fn(movedRightValue)}`,
      window.t("linear.explainStep3Desc", { coeff: "-1" }),
      `x = ${fn(result.value)}`
    );
    html += makeSolution(`x = ${fn(result.value)}`);
    html += makeVerificationStep(result.value);
    return html;
  }

  html += makeStep(
    `${window.t("explain.step")} 3`,
    `${xTerm} = ${movedRightExpr}`,
    window.t("linear.explainComputeDesc"),
    `${fn(left.numA)}x = ${fn(movedRightValue)}`
  );

  html += makeStep(
    `${window.t("explain.step")} 4`,
    `${fn(left.numA)}x = ${fn(movedRightValue)}`,
    window.t("linear.explainStep3Desc", { coeff: fn(left.numA) }),
    `x = ${fn(result.value)}`
  );

  html += makeSolution(`x = ${fn(result.value)}`);
  html += makeVerificationStep(result.value);
  return html;
}

function parseSimpleLinearSide(side) {
  const normalized = normalizeMathText(side);
  const split = splitTopLevelDivision(normalized);

  let numerator = normalized;
  let den = 1;

  if (split) {
    const denominatorValue = Number(split.denominator);
    if (!Number.isFinite(denominatorValue) || Math.abs(denominatorValue) < 1e-8) {
      return null;
    }
    numerator = stripOuterParens(split.numerator);
    den = denominatorValue;
  }

  const parsed = parseAxPlusB(numerator);
  if (!parsed) {
    return null;
  }

  return {
    numA: parsed.a,
    numB: parsed.b,
    den,
  };
}

function parseAxPlusB(text) {
  const compact = text.replace(/\s+/g, "");
  if (!compact) {
    return null;
  }

  const withX = compact.match(/^([+-]?\d*\.?\d*)x(?:([+-]\d*\.?\d+))?$/i);
  if (withX) {
    const coeffText = withX[1];
    const coeff = coeffText === "" || coeffText === "+" ? 1 : coeffText === "-" ? -1 : Number(coeffText);
    const constant = withX[2] ? Number(withX[2]) : 0;
    if (!Number.isFinite(coeff) || !Number.isFinite(constant)) {
      return null;
    }
    return { a: coeff, b: constant };
  }

  const justNumber = Number(compact);
  if (Number.isFinite(justNumber)) {
    return { a: 0, b: justNumber };
  }

  return null;
}

function splitTopLevelDivision(text) {
  let depth = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "/" && depth === 0) {
      return {
        numerator: text.slice(0, i),
        denominator: text.slice(i + 1),
      };
    }
  }
  return null;
}

function stripOuterParens(text) {
  const compact = text.replace(/\s+/g, "");
  if (compact.startsWith("(") && compact.endsWith(")")) {
    return compact.slice(1, -1);
  }
  return compact;
}

function normalizeMathText(text) {
  return String(text)
    .replace(/\s+/g, "")
    .replace(/[−–—﹣]/g, "-")
    .replace(/[＋﹢]/g, "+")
    .replace(/[×⋅·]/g, "*")
    .replace(/÷/g, "/");
}

function formatAxPlusB(a, b, fn) {
  if (Math.abs(a) < 1e-8) {
    return fn(b);
  }
  const x = formatXTerm(a, fn);
  if (Math.abs(b) < 1e-8) {
    return x;
  }
  return `${x} ${b < 0 ? "-" : "+"} ${fn(Math.abs(b))}`;
}

function formatXTerm(a, fn) {
  if (Math.abs(a - 1) < 1e-8) return "x";
  if (Math.abs(a + 1) < 1e-8) return "-x";
  return `${fn(a)}x`;
}

function getStandardCoefficients(equation) {
  const parts = equation.split("=");
  const left = parts[0].trim();
  const right = parts[1].trim();

  const f0 = evaluateExpression(left, 0) - evaluateExpression(right, 0);
  const f1 = evaluateExpression(left, 1) - evaluateExpression(right, 1);
  const f2 = evaluateExpression(left, 2) - evaluateExpression(right, 2);
  const f3 = evaluateExpression(left, 3) - evaluateExpression(right, 3);

  return polynomialCoefficientsUpToQuadratic(f0, f1, f2, f3);
}

function createFloatingNumbers() {
  if (!floatingNumbers) {
    return;
  }

  const amount = window.innerWidth < 640 ? 8 : 14;
  for (let i = 0; i < amount; i += 1) {
    const digit = document.createElement("span");
    digit.className = "bg-number";
    digit.textContent = String(Math.floor(Math.random() * 10));
    digit.style.setProperty("--x", `${Math.random() * 100}%`);
    digit.style.setProperty("--size", `${16 + Math.random() * 16}px`);
    digit.style.setProperty("--duration", `${18 + Math.random() * 14}s`);
    digit.style.setProperty("--delay", `${-Math.random() * 24}s`);
    digit.style.setProperty("--drift", `${-16 + Math.random() * 32}px`);
    floatingNumbers.appendChild(digit);
  }
}

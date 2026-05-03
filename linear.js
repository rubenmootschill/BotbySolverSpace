const linearRows = Array.from(document.querySelectorAll(".linear-sheet-row[data-equation-row]"));
const linearInputs = Array.from(document.querySelectorAll(".linear-line-input"));
const linearSolveBtn = document.getElementById("linearSolveBtn");
const linearExplainBtn = document.getElementById("linearExplainBtn");
const linearMessage = document.getElementById("linearMessage");
const linearExplainBox = document.getElementById("linearExplainBox");
const linearTutorialBtn = document.getElementById("linearTutorialBtn");
const linearTutorialModal = document.getElementById("linearTutorialModal");
const linearTutorialCloseBtn = document.getElementById("linearTutorialCloseBtn");
let linearTaskStartedAt = Date.now();

if (linearTutorialBtn && linearTutorialModal && linearTutorialCloseBtn) {
  linearTutorialBtn.addEventListener("click", openLinearTutorialModal);
  linearTutorialCloseBtn.addEventListener("click", closeLinearTutorialModal);
  linearTutorialModal.addEventListener("click", (event) => {
    if (event.target === linearTutorialModal) {
      closeLinearTutorialModal();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && linearTutorialModal && !linearTutorialModal.hidden) {
    closeLinearTutorialModal();
  }
});

function openLinearTutorialModal() {
  if (!linearTutorialModal || !linearTutorialCloseBtn) {
    return;
  }
  linearTutorialModal.hidden = false;
  linearTutorialCloseBtn.focus();
}

function closeLinearTutorialModal() {
  if (!linearTutorialModal || !linearTutorialBtn) {
    return;
  }
  linearTutorialModal.hidden = true;
  linearTutorialBtn.focus();
}

linearSolveBtn.addEventListener("click", () => {
  solveCurrent(false);
});

linearExplainBtn.addEventListener("click", () => {
  solveCurrent(true);
});

linearInputs.forEach((input) => {
  input.addEventListener("input", () => {
    linearTaskStartedAt = Date.now();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      solveCurrent(false);
    }
  });
});

function getActiveEquation() {
  for (let i = linearRows.length - 1; i >= 0; i -= 1) {
    const row = linearRows[i];
    const leftInput = row.querySelector('input[data-side="left"]');
    const rightInput = row.querySelector('input[data-side="right"]');
    const left = leftInput ? leftInput.value.trim() : "";
    const right = rightInput ? rightInput.value.trim() : "";

    if (left && right) {
      return `${left} = ${right}`;
    }
  }

  return "";
}

function solveCurrent(withExplanation) {
  const rawEquation = getActiveEquation();

  if (!rawEquation) {
    showMessage(window.t("err.emptyInput"), true, false);
    hideExplanation();
    return;
  }

  try {
    const result = solveLinearEquation(rawEquation);
    renderResult(result);
    savePracticeAttempt(rawEquation, result, null, "linear");

    if (withExplanation) {
      showExplanation(buildLinearExplanation(rawEquation, result));
    } else {
      hideExplanation();
    }
  } catch (error) {
    savePracticeAttempt(rawEquation, { type: "none" }, null, "linear");
    showMessage(error.message, true, false);
    hideExplanation();
  }
}

function savePracticeAttempt(equation, result, wasCorrect, source) {
  if (!window.BotbyRecentHistory || typeof window.BotbyRecentHistory.addPracticeAttempt !== "function") {
    return;
  }

  const now = Date.now();
  const durationMs = Math.max(0, now - linearTaskStartedAt);
  linearTaskStartedAt = now;

  window.BotbyRecentHistory.addPracticeAttempt({
    equation,
    source,
    resultType: result && result.type ? result.type : "none",
    wasCorrect,
    durationMs,
  });
}

function showMessage(text, isError, canExplain) {
  linearMessage.textContent = text;
  linearMessage.classList.remove("success", "error");

  const hasText = Boolean(text && text.trim());
  linearMessage.classList.toggle("is-visible", hasText);
  linearExplainBtn.hidden = !hasText || (isError && !canExplain);

  if (hasText) {
    linearMessage.classList.add(isError ? "error" : "success");
  }
}

function renderResult(result) {
  if (result.type === "one") {
    showMessage(`x = ${formatNumber(result.value)}`, false, true);
    return;
  }

  if (result.type === "two") {
    const left = formatNumber(result.values[0]);
    const right = formatNumber(result.values[1]);
    showMessage(`x = ${left} ${window.t("solver.orSep")} x = ${right}`, false, true);
    return;
  }

  if (result.type === "infinite") {
    showMessage(window.t("solver.infinite"), false, true);
    return;
  }

  showMessage(window.t("solver.noSolution"), true, true);
}

function showExplanation(html) {
  linearExplainBox.innerHTML = html ? `<div class="explain-steps">${html}</div>` : "";
  linearExplainBox.classList.toggle("is-visible", Boolean(html && html.trim()));
}

function hideExplanation() {
  linearExplainBox.innerHTML = "";
  linearExplainBox.classList.remove("is-visible");
}

function buildLinearExplanation(equation, result) {
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
      eqStr ? `<div class="step-eq">${esc(eqStr)}</div>` : "",
      desc ? `<p class="step-desc">${desc}</p>` : "",
      resultStr ? `<div class="step-eq">${esc(resultStr)}</div>` : "",
      `</div>`,
    ].join("");
  }

  function makeSolution(text) {
    return `<div class="explain-step explain-solution"><div class="step-label">${window.t("explain.solution")}</div><div class="step-eq">${esc(text)}</div></div>`;
  }

  function fmtXTerm(coeff) {
    if (Math.abs(coeff) < 1e-8) return "0x";
    if (Math.abs(coeff - 1) < 1e-8) return "x";
    if (Math.abs(coeff + 1) < 1e-8) return "-x";
    return `${fmtNumber(coeff)}x`;
  }

  function fmtSubtractNumber(value) {
    const abs = fmtNumber(Math.abs(value));
    return value < 0 ? `+ ${abs}` : `- ${abs}`;
  }

  function fmtSubtractX(coeff) {
    const abs = fmtNumber(Math.abs(coeff));
    if (Math.abs(coeff) < 1e-8) return "- 0x";
    if (Math.abs(Math.abs(coeff) - 1) < 1e-8) {
      return coeff < 0 ? "+ x" : "- x";
    }
    return coeff < 0 ? `+ ${abs}x` : `- ${abs}x`;
  }

  try {
    const [leftExpr, rightExpr] = equation.split("=").map((x) => x.trim());
    const left = toLinearForm(leftExpr);
    const right = toLinearForm(rightExpr);

    const xCoeff = left.a - right.a;
    const constantMove = right.b - left.b;

    const worksheetStyle = buildWorksheetStyleExplanation(equation, result, makeStep, makeSolution);
    if (worksheetStyle) {
      return worksheetStyle;
    }

    if (result.type === "infinite" || result.type === "none") {
      const movedXLine = `${fmtXTerm(left.a)} ${fmtSubtractX(right.a)} = ${fmtNumber(right.b)} ${fmtSubtractNumber(left.b)}`;
      const simplifiedLine = `0 = ${fmtNumber(constantMove)}`;
      const isInfinite = result.type === "infinite";

      let specialHtml = "";
      specialHtml += makeStep(
        `${window.t("explain.step")} 1`,
        equation,
        window.t("linear.explainStep2Desc"),
        movedXLine
      );

      specialHtml += makeStep(
        `${window.t("explain.step")} 2`,
        movedXLine,
        window.t("linear.explainSimplifyDesc"),
        simplifiedLine
      );

      specialHtml += makeStep(
        `${window.t("explain.step")} 3`,
        simplifiedLine,
        window.t(isInfinite ? "linear.explainInfiniteDesc" : "linear.explainNoneDesc"),
        ""
      );

      specialHtml += makeSolution(window.t(isInfinite ? "linear.explainInfiniteAnswer" : "linear.explainNoneAnswer"));
      return specialHtml;
    }

    let html = "";
    html += makeStep(
      `${window.t("explain.step")} 1`,
      equation,
      window.t("linear.explainStep1Desc"),
      `${fmtCoeff(left.a)}x ${fmtSigned(left.b)} = ${fmtCoeff(right.a)}x ${fmtSigned(right.b)}`
    );

    html += makeStep(
      `${window.t("explain.step")} 2`,
      `${fmtCoeff(left.a)}x ${fmtSigned(left.b)} = ${fmtCoeff(right.a)}x ${fmtSigned(right.b)}`,
      window.t("linear.explainStep2Desc"),
      `${fmtCoeff(xCoeff)}x = ${fmtNumber(constantMove)}`
    );

    if (Math.abs(xCoeff - 1) < 1e-8) {
      html += makeStep(
        `${window.t("explain.step")} 3`,
        `${fmtCoeff(xCoeff)}x = ${fmtNumber(constantMove)}`,
        window.t("linear.explainIsolatedDesc"),
        `x = ${fmtNumber(result.value)}`
      );
    } else {
      html += makeStep(
        `${window.t("explain.step")} 3`,
        `${fmtCoeff(xCoeff)}x = ${fmtNumber(constantMove)}`,
        window.t("linear.explainStep3Desc", { coeff: fmtNumber(xCoeff) }),
        `x = ${fmtNumber(result.value)}`
      );
    }

    html += makeSolution(result.type === "two"
      ? `x = ${fmtNumber(result.values[0])} ${window.t("solver.orSep")} x = ${fmtNumber(result.values[1])}`
      : `x = ${fmtNumber(result.value)}`
    );

    return html;
  } catch (error) {
    return makeStep(`${window.t("explain.step")} 1`, equation, window.t("linear.explainFallbackDesc"), "")
      + makeSolution(result.type === "one"
        ? `x = ${fmtNumber(result.value)}`
        : result.type === "two"
          ? `x = ${fmtNumber(result.values[0])} ${window.t("solver.orSep")} x = ${fmtNumber(result.values[1])}`
          : window.t("solver.noSolution"));
  }
}

function buildWorksheetStyleExplanation(equation, result, makeStep, makeSolution) {
  if (result.type !== "one") {
    return "";
  }

  const parts = equation.split("=");
  if (parts.length !== 2) {
    return "";
  }

  const left = parseSimpleLinearSide(parts[0]);
  const right = parseSimpleLinearSide(parts[1]);

  // Google-style algebra steps are clearest in the common worksheet shape (ax + b) / d = c.
  if (!left || !right || Math.abs(left.den - 1) < 1e-8 || Math.abs(right.den - 1) > 1e-8 || Math.abs(right.numA) > 1e-8) {
    return "";
  }

  const d = left.den;
  const rhsAfterMultiply = right.numB * d;
  const movedRightExpr = `${fmtNumber(rhsAfterMultiply)} ${left.numB >= 0 ? "-" : "+"} ${fmtNumber(Math.abs(left.numB))}`;
  const movedRightValue = rhsAfterMultiply - left.numB;

  const numeratorExpr = formatAxPlusB(left.numA, left.numB);
  const xTerm = formatXTerm(left.numA);

  let html = "";
  html += makeStep(
    `${window.t("explain.step")} 1`,
    equation,
    window.t("linear.explainMultiplyDesc", { n: fmtNumber(d) }),
    `${numeratorExpr} = ${fmtNumber(rhsAfterMultiply)}`
  );

  html += makeStep(
    `${window.t("explain.step")} 2`,
    `${numeratorExpr} = ${fmtNumber(rhsAfterMultiply)}`,
    window.t("linear.explainMoveConstDesc"),
    `${xTerm} = ${movedRightExpr}`
  );

  if (Math.abs(left.numA - 1) < 1e-8) {
    html += makeStep(
      `${window.t("explain.step")} 3`,
      `${xTerm} = ${movedRightExpr}`,
      window.t("linear.explainComputeDesc"),
      `x = ${fmtNumber(movedRightValue)}`
    );
    html += makeSolution(`x = ${fmtNumber(movedRightValue)}`);
    return html;
  }

  if (Math.abs(left.numA + 1) < 1e-8) {
    html += makeStep(
      `${window.t("explain.step")} 3`,
      `${xTerm} = ${movedRightExpr}`,
      window.t("linear.explainComputeDesc"),
      `-x = ${fmtNumber(movedRightValue)}`
    );
    html += makeStep(
      `${window.t("explain.step")} 4`,
      `-x = ${fmtNumber(movedRightValue)}`,
      window.t("linear.explainStep3Desc", { coeff: "-1" }),
      `x = ${fmtNumber(result.value)}`
    );
    html += makeSolution(`x = ${fmtNumber(result.value)}`);
    return html;
  }

  html += makeStep(
    `${window.t("explain.step")} 3`,
    `${xTerm} = ${movedRightExpr}`,
    window.t("linear.explainComputeDesc"),
    `${fmtNumber(left.numA)}x = ${fmtNumber(movedRightValue)}`
  );

  html += makeStep(
    `${window.t("explain.step")} 4`,
    `${fmtNumber(left.numA)}x = ${fmtNumber(movedRightValue)}`,
    window.t("linear.explainStep3Desc", { coeff: fmtNumber(left.numA) }),
    `x = ${fmtNumber(result.value)}`
  );

  html += makeSolution(`x = ${fmtNumber(result.value)}`);
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

function formatAxPlusB(a, b) {
  if (Math.abs(a) < 1e-8) {
    return fmtNumber(b);
  }
  const x = formatXTerm(a);
  if (Math.abs(b) < 1e-8) {
    return x;
  }
  return `${x} ${b < 0 ? "-" : "+"} ${fmtNumber(Math.abs(b))}`;
}

function formatXTerm(a) {
  if (Math.abs(a - 1) < 1e-8) return "x";
  if (Math.abs(a + 1) < 1e-8) return "-x";
  return `${fmtNumber(a)}x`;
}

function toLinearForm(expression) {
  const v0 = evaluateExpression(expression, 0);
  const v1 = evaluateExpression(expression, 1);
  const v2 = evaluateExpression(expression, 2);

  const a = v1 - v0;
  const b = v0;
  const expectedAt2 = 2 * a + b;

  if (Math.abs(v2 - expectedAt2) > 1e-7) {
    throw new Error("not linear");
  }

  return { a, b };
}

function fmtNumber(value) {
  if (Math.abs(value - Math.round(value)) < 1e-8) {
    return String(Math.round(value));
  }
  return String(Number(value.toFixed(6)));
}

function fmtCoeff(value) {
  if (Math.abs(value - 1) < 1e-8) return "";
  if (Math.abs(value + 1) < 1e-8) return "-";
  return fmtNumber(value);
}

function fmtSigned(value) {
  const n = fmtNumber(Math.abs(value));
  return value < 0 ? `- ${n}` : `+ ${n}`;
}

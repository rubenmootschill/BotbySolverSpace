const equationInput = document.getElementById("equationInput");
const solveBtn = document.getElementById("solveBtn");
const quizBtn = document.getElementById("quizBtn");
const solveMessage = document.getElementById("solveMessage");
const quizQuestion = document.getElementById("quizQuestion");
const quizChoices = document.getElementById("quizChoices");
const quizFeedback = document.getElementById("quizFeedback");

let lastSolveResult = null;

solveBtn.addEventListener("click", () => {
  clearQuizFeedback();
  solveCurrentEquation();
});

quizBtn.addEventListener("click", () => {
  clearQuizFeedback();
  generateQuiz();
});

function solveCurrentEquation() {
  const rawEquation = equationInput.value.trim();
  if (!rawEquation) {
    showMessage(solveMessage, "Please enter an equation first.", true);
    return;
  }

  try {
    const result = solveLinearEquation(rawEquation);
    lastSolveResult = result;

    if (result.type === "one") {
      showMessage(solveMessage, `x = ${formatNumber(result.value)}`, false);
    } else if (result.type === "infinite") {
      showMessage(solveMessage, "Infinite solutions (both sides are equal).", false);
    } else {
      showMessage(solveMessage, "No solution (contradiction).", true);
    }
  } catch (error) {
    lastSolveResult = null;
    showMessage(solveMessage, error.message, true);
  }
}

function generateQuiz() {
  const rawEquation = equationInput.value.trim();
  if (!rawEquation) {
    showMessage(solveMessage, "Please enter an equation before making a quiz.", true);
    return;
  }

  if (!lastSolveResult || lastSolveResult.equation !== rawEquation) {
    try {
      lastSolveResult = solveLinearEquation(rawEquation);
    } catch (error) {
      showMessage(solveMessage, error.message, true);
      return;
    }
  }

  if (lastSolveResult.type !== "one") {
    quizQuestion.textContent = "Quiz needs an equation with one numeric solution for x.";
    quizChoices.innerHTML = "";
    showMessage(quizFeedback, "Use an equation that has exactly one answer.", true);
    return;
  }

  const correct = normalizeNumber(lastSolveResult.value);
  const wrongAnswers = generateWrongAnswers(correct, 2);
  const options = shuffle([
    { value: correct, correct: true },
    { value: wrongAnswers[0], correct: false },
    { value: wrongAnswers[1], correct: false },
  ]);

  quizQuestion.textContent = `Solve: ${rawEquation}`;
  quizChoices.innerHTML = "";
  options.forEach((option, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice-btn";
    btn.textContent = `${index + 1}. x = ${formatNumber(option.value)}`;

    btn.addEventListener("click", () => {
      const buttons = [...quizChoices.querySelectorAll("button")];
      buttons.forEach((b) => {
        b.disabled = true;
      });

      if (option.correct) {
        btn.classList.add("choice-correct");
        showMessage(quizFeedback, "Correct! Nice work.", false);
      } else {
        btn.classList.add("choice-wrong");
        const correctBtn = buttons.find((b) =>
          b.textContent.endsWith(`x = ${formatNumber(correct)}`)
        );
        if (correctBtn) {
          correctBtn.classList.add("choice-correct");
        }
        showMessage(quizFeedback, "Not quite. The highlighted one is correct.", true);
      }
    });

    quizChoices.appendChild(btn);
  });

  showMessage(quizFeedback, "Choose one answer.", false);
}

function solveLinearEquation(equation) {
  const parts = equation.split("=");
  if (parts.length !== 2) {
    throw new Error("Equation must contain exactly one '=' sign.");
  }

  const left = parts[0].trim();
  const right = parts[1].trim();
  if (!left || !right) {
    throw new Error("Equation has empty left or right side.");
  }

  const leftLinear = toLinearForm(left);
  const rightLinear = toLinearForm(right);

  const a = leftLinear.a - rightLinear.a;
  const b = rightLinear.b - leftLinear.b;

  if (almostZero(a) && almostZero(b)) {
    return { type: "infinite", equation };
  }

  if (almostZero(a) && !almostZero(b)) {
    return { type: "none", equation };
  }

  return {
    type: "one",
    equation,
    value: b / a,
  };
}

function toLinearForm(expression) {
  const b = evaluateExpression(expression, 0);
  const at1 = evaluateExpression(expression, 1);
  const at2 = evaluateExpression(expression, 2);
  const a = at1 - b;

  // Validate the expression behaves linearly for x.
  const expectedAt2 = b + 2 * a;
  if (Math.abs(at2 - expectedAt2) > 1e-8) {
    throw new Error("Only linear equations in x are supported.");
  }

  return { a, b };
}

function evaluateExpression(expression, xValue) {
  const tokens = tokenize(expression);
  const rpn = toRpn(tokens);
  return evalRpn(rpn, xValue);
}

function tokenize(expression) {
  const compact = expression.replace(/\s+/g, "");
  if (!compact) {
    throw new Error("Expression is empty.");
  }

  const tokens = [];
  let i = 0;

  while (i < compact.length) {
    const ch = compact[i];

    if (/[0-9.]/.test(ch)) {
      let numberText = ch;
      i += 1;
      while (i < compact.length && /[0-9.]/.test(compact[i])) {
        numberText += compact[i];
        i += 1;
      }

      if (!isValidNumberToken(numberText)) {
        throw new Error(`Invalid number '${numberText}'.`);
      }

      tokens.push({ type: "number", value: Number(numberText) });
      continue;
    }

    if (ch.toLowerCase() === "x") {
      tokens.push({ type: "var" });
      i += 1;
      continue;
    }

    if (["+", "-", "*", "/", "(", ")"].includes(ch)) {
      tokens.push({ type: "op", value: ch });
      i += 1;
      continue;
    }

    throw new Error(`Unexpected character '${ch}'.`);
  }

  return tokens;
}

function isValidNumberToken(text) {
  const dotCount = (text.match(/\./g) || []).length;
  if (dotCount > 1) {
    return false;
  }
  if (text === ".") {
    return false;
  }
  return true;
}

function toRpn(tokens) {
  const output = [];
  const operators = [];

  const precedence = {
    "u+": 3,
    "u-": 3,
    "*": 2,
    "/": 2,
    "+": 1,
    "-": 1,
  };

  const rightAssociative = new Set(["u+", "u-"]);

  let prevKind = "start";

  tokens.forEach((token) => {
    if (token.type === "number" || token.type === "var") {
      output.push(token);
      prevKind = "value";
      return;
    }

    const op = token.value;
    if (op === "(") {
      operators.push(op);
      prevKind = "open";
      return;
    }

    if (op === ")") {
      while (operators.length && operators[operators.length - 1] !== "(") {
        output.push({ type: "op", value: operators.pop() });
      }
      if (!operators.length) {
        throw new Error("Mismatched parentheses.");
      }
      operators.pop();
      prevKind = "value";
      return;
    }

    let effectiveOp = op;
    const isUnary =
      (op === "+" || op === "-") &&
      (prevKind === "start" || prevKind === "open" || prevKind === "operator");

    if (isUnary) {
      effectiveOp = op === "+" ? "u+" : "u-";
    }

    while (operators.length) {
      const top = operators[operators.length - 1];
      if (top === "(") {
        break;
      }

      const topPrecedence = precedence[top];
      const currentPrecedence = precedence[effectiveOp];
      if (
        topPrecedence > currentPrecedence ||
        (topPrecedence === currentPrecedence && !rightAssociative.has(effectiveOp))
      ) {
        output.push({ type: "op", value: operators.pop() });
      } else {
        break;
      }
    }

    operators.push(effectiveOp);
    prevKind = "operator";
  });

  while (operators.length) {
    const op = operators.pop();
    if (op === "(") {
      throw new Error("Mismatched parentheses.");
    }
    output.push({ type: "op", value: op });
  }

  return output;
}

function evalRpn(rpn, xValue) {
  const stack = [];

  rpn.forEach((token) => {
    if (token.type === "number") {
      stack.push(token.value);
      return;
    }

    if (token.type === "var") {
      stack.push(xValue);
      return;
    }

    if (token.value === "u+" || token.value === "u-") {
      if (stack.length < 1) {
        throw new Error("Invalid expression syntax.");
      }
      const a = stack.pop();
      stack.push(token.value === "u+" ? a : -a);
      return;
    }

    if (stack.length < 2) {
      throw new Error("Invalid expression syntax.");
    }

    const right = stack.pop();
    const left = stack.pop();

    switch (token.value) {
      case "+":
        stack.push(left + right);
        break;
      case "-":
        stack.push(left - right);
        break;
      case "*":
        stack.push(left * right);
        break;
      case "/":
        if (almostZero(right)) {
          throw new Error("Division by zero in expression.");
        }
        stack.push(left / right);
        break;
      default:
        throw new Error("Unknown operator.");
    }
  });

  if (stack.length !== 1) {
    throw new Error("Invalid expression syntax.");
  }

  return stack[0];
}

function generateWrongAnswers(correct, count) {
  const wrongSet = new Set();
  const magnitudes = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5];

  while (wrongSet.size < count) {
    const mode = Math.random();
    let candidate;

    if (mode < 0.6) {
      const delta = pick(magnitudes) * (Math.random() < 0.5 ? -1 : 1);
      candidate = correct + delta;
    } else if (mode < 0.85) {
      candidate = correct * (Math.random() < 0.5 ? -1 : 2);
    } else {
      candidate = correct + (Math.random() < 0.5 ? -0.25 : 0.25);
    }

    candidate = normalizeNumber(candidate);

    if (Math.abs(candidate - correct) > 1e-9) {
      wrongSet.add(candidate);
    }
  }

  return [...wrongSet];
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function showMessage(element, text, isError) {
  element.textContent = text;
  element.classList.remove("success", "error");
  element.classList.add(isError ? "error" : "success");
}

function clearQuizFeedback() {
  quizFeedback.classList.remove("success", "error");
  quizFeedback.textContent = "";
}

function normalizeNumber(value) {
  if (Object.is(value, -0)) {
    return 0;
  }
  return Number(value.toFixed(8));
}

function almostZero(value) {
  return Math.abs(value) < 1e-10;
}

function formatNumber(value) {
  const normalized = normalizeNumber(value);
  return Number.isInteger(normalized)
    ? String(normalized)
    : normalized.toString().replace(/\.0+$/, "");
}

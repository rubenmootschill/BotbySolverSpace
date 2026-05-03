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

  const f0 = evaluateExpression(left, 0) - evaluateExpression(right, 0);
  const f1 = evaluateExpression(left, 1) - evaluateExpression(right, 1);
  const f2 = evaluateExpression(left, 2) - evaluateExpression(right, 2);
  const f3 = evaluateExpression(left, 3) - evaluateExpression(right, 3);

  const coeffs = polynomialCoefficientsUpToQuadratic(f0, f1, f2, f3);
  const { a, b, c } = coeffs;

  if (almostZero(a) && almostZero(b) && almostZero(c)) {
    return { type: "infinite", equation };
  }

  if (almostZero(a) && almostZero(b) && !almostZero(c)) {
    return { type: "none", equation };
  }

  if (almostZero(a)) {
    return {
      type: "one",
      equation,
      value: -c / b,
    };
  }

  const discriminant = b * b - 4 * a * c;

  if (discriminant < -1e-10) {
    return { type: "none", equation };
  }

  if (almostZero(discriminant)) {
    return {
      type: "one",
      equation,
      value: -b / (2 * a),
    };
  }

  const sqrtD = Math.sqrt(discriminant);
  const x1 = (-b - sqrtD) / (2 * a);
  const x2 = (-b + sqrtD) / (2 * a);

  return {
    type: "two",
    equation,
    values: [x1, x2],
  };
}

function polynomialCoefficientsUpToQuadratic(f0, f1, f2, f3) {
  const c = f0;
  const a = (f2 - 2 * f1 + f0) / 2;
  const b = f1 - c - a;

  // Verify degree is <= 2 using one extra sample.
  const expectedAt3 = 9 * a + 3 * b + c;
  if (Math.abs(f3 - expectedAt3) > 1e-7) {
    throw new Error("Only equations up to x^2 are supported.");
  }

  return { a, b, c };
}

function evaluateExpression(expression, xValue) {
  const tokens = tokenize(expression);
  const rpn = toRpn(tokens);
  return evalRpn(rpn, xValue);
}

function tokenize(expression) {
  const compact = expression
    .replace(/\s+/g, "")
    .replace(/[−–—﹣]/g, "-")
    .replace(/[＋﹢]/g, "+")
    .replace(/[×⋅·]/g, "*")
    .replace(/÷/g, "/");
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

    if (["+", "-", "*", "/", "^", "(", ")"].includes(ch)) {
      tokens.push({ type: "op", value: ch });
      i += 1;
      continue;
    }

    throw new Error(`Unexpected character '${ch}'.`);
  }

  return insertImplicitMultiplication(tokens);
}

function insertImplicitMultiplication(tokens) {
  const withMultiplication = [];

  for (let i = 0; i < tokens.length; i += 1) {
    const current = tokens[i];
    const next = tokens[i + 1];

    withMultiplication.push(current);

    if (!next) {
      continue;
    }

    const currentIsValue =
      current.type === "number" ||
      current.type === "var" ||
      (current.type === "op" && current.value === ")");

    const nextStartsValue =
      next.type === "number" ||
      next.type === "var" ||
      (next.type === "op" && next.value === "(");

    if (currentIsValue && nextStartsValue) {
      withMultiplication.push({ type: "op", value: "*" });
    }
  }

  return withMultiplication;
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
    "^": 4,
    "u+": 3,
    "u-": 3,
    "*": 2,
    "/": 2,
    "+": 1,
    "-": 1,
  };

  const rightAssociative = new Set(["^", "u+", "u-"]);

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
      case "^":
        stack.push(left ** right);
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

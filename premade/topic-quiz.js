const premadeQuestionText = document.getElementById("premadeQuestionText");
const premadeChoices = document.getElementById("premadeChoices");
const premadeSubmitBtn = document.getElementById("premadeSubmitBtn");
const premadeNextBtn = document.getElementById("premadeNextBtn");
const premadeFeedback = document.getElementById("premadeFeedback");
const premadeQuestionCount = document.getElementById("premadeQuestionCount");
const premadeScore = document.getElementById("premadeScore");
const premadeProgressFill = document.getElementById("premadeProgressFill");
const premadeProgressBar = document.getElementById("premadeProgressBar");
const premadeDifficultyModal = document.getElementById("premadeDifficultyModal");
const premadeDifficultyCancel = document.getElementById("premadeDifficultyCancel");
const premadeTitle = document.getElementById("premade-title");
const premadeHeroSubtitle = document.querySelector(".premade-quiz-hero .subtitle");
const premadeBackLink = document.querySelector(".premade-back-link");
const premadeDifficultyTitle = document.getElementById("premadeDifficultyTitle");
const premadeDifficultyText = premadeDifficultyModal ? premadeDifficultyModal.querySelector(".quiz-modal-card p") : null;

const fixedTopic = document.body.dataset.topic || "all";
const QUIZ_LENGTH = 10;
const DIFFICULTY_STORAGE_KEY = `botby-premade-difficulty-${fixedTopic}`;

let currentIndex = 0;
let selectedIndex = -1;
let score = 0;
let answeredCurrent = false;
let selectedDifficulty = "medium";
let activeQuestions = [];
let currentQuestionStartedAt = Date.now();
let premadeContinueModal = null;
let premadeContinueYes = null;
let premadeContinueNo = null;

const topicMetaKeys = {
  all: {
    title: "premade.topic.all.title",
    subtitle: "premade.topic.all.subtitle",
  },
  linear: {
    title: "premade.topic.linear.title",
    subtitle: "premade.topic.linear.subtitle",
  },
  quadratic: {
    title: "premade.topic.quadratic.title",
    subtitle: "premade.topic.quadratic.subtitle",
  },
  "positive-exponent": {
    title: "premade.topic.positiveExponent.title",
    subtitle: "premade.topic.positiveExponent.subtitle",
  },
  "negative-exponent": {
    title: "premade.topic.negativeExponent.title",
    subtitle: "premade.topic.negativeExponent.subtitle",
  },
  roots: {
    title: "premade.topic.roots.title",
    subtitle: "premade.topic.roots.subtitle",
  },
  percent: {
    title: "premade.topic.percent.title",
    subtitle: "premade.topic.percent.subtitle",
  },
  systems: {
    title: "premade.topic.systems.title",
    subtitle: "premade.topic.systems.subtitle",
  },
  functions: {
    title: "premade.topic.functions.title",
    subtitle: "premade.topic.functions.subtitle",
  },
  geometry: {
    title: "premade.topic.geometry.title",
    subtitle: "premade.topic.geometry.subtitle",
  },
  probability: {
    title: "premade.topic.probability.title",
    subtitle: "premade.topic.probability.subtitle",
  },
  "zero-exponent": {
    title: "premade.topic.zeroExponent.title",
    subtitle: "premade.topic.zeroExponent.subtitle",
  },
};

const t = (key, vars) => {
  if (typeof window.t === "function") {
    return window.t(key, vars);
  }
  return key;
};

function markQuestionAsDynamic() {
  if (!premadeQuestionText) {
    return;
  }

  // This node is runtime content and should not be reset by generic i18n sweeps.
  premadeQuestionText.removeAttribute("data-i18n");
  premadeQuestionText.removeAttribute("data-i18n-placeholder");
}

function localizeStaticPageText() {
  const meta = topicMetaKeys[fixedTopic] || topicMetaKeys.all;

  if (premadeTitle) {
    premadeTitle.textContent = t(meta.title);
  }

  if (premadeHeroSubtitle) {
    premadeHeroSubtitle.textContent = t(meta.subtitle);
  }

  if (premadeBackLink) {
    premadeBackLink.textContent = t("premade.backToCards");
  }

  if (premadeSubmitBtn) {
    premadeSubmitBtn.textContent = t("premade.checkAnswer");
  }

  if (premadeNextBtn) {
    premadeNextBtn.textContent = t("premade.nextQuestion");
  }

  if (premadeQuestionText && !activeQuestions.length) {
    premadeQuestionText.textContent = t("premade.loadingQuestion");
  }

  if (premadeDifficultyTitle) {
    premadeDifficultyTitle.textContent = t("premade.diffTitle");
  }

  if (premadeDifficultyText) {
    premadeDifficultyText.textContent = t("premade.diffText");
  }

  if (premadeDifficultyModal) {
    premadeDifficultyModal.querySelectorAll("[data-mode]").forEach((btn) => {
      const mode = btn.getAttribute("data-mode") || "medium";
      btn.textContent = t(`premade.diff.${mode}`);
    });
  }

  if (premadeDifficultyCancel) {
    premadeDifficultyCancel.textContent = t("premade.cancel");
  }

  if (premadeScore) {
    premadeScore.textContent = `${t("premade.scoreLabel")}: ${score}`;
  }
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArray(items) {
  const cloned = [...items];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = cloned[i];
    cloned[i] = cloned[j];
    cloned[j] = temp;
  }
  return cloned;
}

function uniqueAnswers(answers, max) {
  const seen = new Set();
  const out = [];
  answers.forEach((text) => {
    if (!seen.has(text)) {
      seen.add(text);
      out.push(text);
    }
  });
  return out.slice(0, max);
}

function difficultyLabel(level) {
  if (level === "easy") return t("premade.diff.easy");
  if (level === "hard") return t("premade.diff.hard");
  return t("premade.diff.medium");
}

function linearChoices(solution) {
  const right = `x = ${solution}`;
  const wrong1 = `x = ${solution + randInt(1, 3)}`;
  const wrong2 = `x = ${solution - randInt(1, 3)}`;
  const all = uniqueAnswers([right, wrong1, wrong2, `x = ${-solution}`], 3);
  const shuffled = shuffleArray(all);
  return {
    choices: shuffled,
    answerIndex: shuffled.indexOf(right),
  };
}

function quadraticChoices(root, difficulty) {
  const right = `x = ${root} or x = -${root}`;
  let wrong1 = `x = ${root}`;
  let wrong2 = `x = -${root}`;

  if (difficulty === "easy") {
    const near = root + 1;
    wrong1 = `x = ${near} or x = -${near}`;
    wrong2 = `x = ${root - 1 > 1 ? root - 1 : root + 2} or x = -${root - 1 > 1 ? root - 1 : root + 2}`;
  } else if (difficulty === "medium") {
    wrong1 = `x = ${root}`;
    wrong2 = `x = ${root} or x = ${-root}`;
  }

  const all = uniqueAnswers([right, wrong1, wrong2], 3);
  const shuffled = shuffleArray(all);
  return {
    choices: shuffled,
    answerIndex: shuffled.indexOf(right),
  };
}

function exponentChoices(answer) {
  const right = `x = ${answer}`;
  const offsetA = randInt(1, 3);
  const offsetB = randInt(2, 5);
  const wrong1 = `x = ${answer + offsetA}`;
  const wrong2 = `x = ${Math.max(0, answer - offsetB)}`;
  const wrong3 = `x = ${answer * 2}`;
  const all = uniqueAnswers([right, wrong1, wrong2, wrong3], 3);
  const shuffled = shuffleArray(all);
  return {
    choices: shuffled,
    answerIndex: shuffled.indexOf(right),
  };
}

function makeFracHtml(numerator, denominator) {
  return `<span class="math-frac"><span class="math-num">${numerator}</span><span class="math-den">${denominator}</span></span>`;
}

function makeLinearQuestion(difficulty, used) { 
  let question = "";
  let displayHtml = null;
  let solution = 0;
  let explain = "";

  for (let tries = 0; tries < 60; tries += 1) {
    displayHtml = null;
    if (difficulty === "easy") {
      const mode = randInt(1, 3);
      if (mode === 1) {
        // x/a = b  =>  x = a * b
        const a = randInt(2, 5);
        solution = a * randInt(2, 6);
        if (solution > 50) { continue; }
        question = `x/${a} = ${solution / a}`;
        displayHtml = `${makeFracHtml('x', a)} = ${solution / a}`;
        explain = `Multiply both sides by ${a}: x = ${a} × ${solution / a} = ${solution}.`;
      } else if (mode === 2) {
        // a/x = b  =>  x = a / b
        solution = randInt(2, 8);
        const b = randInt(2, 4);
        const a = b * solution;
        question = `${a}/x = ${b}`;
        displayHtml = `${makeFracHtml(a, 'x')} = ${b}`;
        explain = `Cross-multiply: x = ${a} ÷ ${b} = ${solution}.`;
      } else {
        // a/b = x  (both numbers in fraction, x alone on right)
        const b = randInt(2, 5);
        solution = randInt(2, 8);
        const a = b * solution;
        question = `${a}/${b} = x`;
        displayHtml = `${makeFracHtml(a, b)} = x`;
        explain = `Divide: ${a} ÷ ${b} = ${solution}.`;
      }
    } else if (difficulty === "medium") {
      const mode = randInt(1, 4);
      if (mode === 1) {
        // x/a = b  =>  x = a * b
        const a = randInt(2, 6);
        solution = a * randInt(2, 8);
        if (solution > 80) { continue; }
        question = `x/${a} = ${solution / a}`;
        displayHtml = `${makeFracHtml('x', a)} = ${solution / a}`;
        explain = `Multiply both sides by ${a}: x = ${solution}.`;
      } else if (mode === 2) {
        // a/x = b
        solution = randInt(2, 12);
        const b = randInt(2, 6);
        const a = b * solution;
        question = `${a}/x = ${b}`;
        displayHtml = `${makeFracHtml(a, 'x')} = ${b}`;
        explain = `Cross-multiply: x = ${a} ÷ ${b} = ${solution}.`;
      } else if (mode === 3) {
        // a/b = x + c  (both numbers in fraction, x with offset)
        const b = randInt(2, 5);
        solution = randInt(2, 10);
        const a = b * (solution + randInt(1, 5));
        const xPlusC = a / b;
        if (!Number.isInteger(xPlusC)) { continue; }
        const c = xPlusC - solution;
        if (c <= 0) { continue; }
        question = `${a}/${b} = x + ${c}`;
        displayHtml = `${makeFracHtml(a, b)} = x + ${c}`;
        explain = `${a}/${b} = ${xPlusC}, so x = ${xPlusC} - ${c} = ${solution}.`;
      } else {
        // a/b = x  (both numbers, clean result)
        const b = randInt(2, 6);
        solution = randInt(2, 12);
        const a = b * solution;
        question = `${a}/${b} = x`;
        displayHtml = `${makeFracHtml(a, b)} = x`;
        explain = `Divide: ${a} ÷ ${b} = ${solution}.`;
      }
    } else {
      const mode = randInt(1, 5);
      if (mode === 1) {
        // x/a + c = d
        const a = randInt(2, 6);
        const diff = randInt(2, 8);
        const c = randInt(1, 5);
        const d = diff + c;
        solution = a * diff;
        if (solution > 80) { continue; }
        question = `x/${a} + ${c} = ${d}`;
        displayHtml = `${makeFracHtml('x', a)} + ${c} = ${d}`;
        explain = `Subtract ${c}: x/${a} = ${diff}, so x = ${a} × ${diff} = ${solution}.`;
      } else if (mode === 2) {
        // a/x - c = d
        solution = randInt(2, 12);
        const b = randInt(2, 7);
        const a = b * solution;
        const c = randInt(1, 6);
        const d = b - c;
        if (d <= 0) { continue; }
        question = `${a}/x - ${c} = ${d}`;
        displayHtml = `${makeFracHtml(a, 'x')} - ${c} = ${d}`;
        explain = `Add ${c}: ${a}/x = ${b}, so x = ${a} ÷ ${b} = ${solution}.`;
      } else if (mode === 3) {
        // a/b - c = x  (both numbers in fraction, x alone on right)
        const b = randInt(2, 5);
        const c = randInt(1, 6);
        solution = randInt(2, 10);
        const a = b * (solution + c);
        question = `${a}/${b} - ${c} = x`;
        displayHtml = `${makeFracHtml(a, b)} - ${c} = x`;
        explain = `${a}/${b} = ${solution + c}, then subtract ${c}: x = ${solution}.`;
      } else if (mode === 4) {
        // a/x = c/d  (fraction both sides, x on bottom left)
        solution = randInt(2, 12);
        const c = randInt(2, 5);
        const d = randInt(2, 5);
        const a = c * solution / d;
        if (!Number.isInteger(a) || a <= 0) { continue; }
        question = `${a}/x = ${c}/${d}`;
        displayHtml = `${makeFracHtml(a, 'x')} = ${makeFracHtml(c, d)}`;
        explain = `Cross-multiply: ${a} × ${d} = ${c} × x, so x = ${a * d} ÷ ${c} = ${solution}.`;
      } else {
        // a/b = c/x  (proportion, x on bottom right — like the image)
        solution = randInt(2, 12);
        const a = randInt(2, 8);
        const b = randInt(2, 8);
        const c = randInt(2, 8);
        // a/b = c/x  =>  x = b*c/a
        const xVal = b * c / a;
        if (!Number.isInteger(xVal) || xVal <= 0 || xVal === solution) { continue; }
        solution = xVal;
        question = `${a}/${b} = ${c}/x`;
        displayHtml = `${makeFracHtml(a, b)} = ${makeFracHtml(c, 'x')}`;
        explain = `Cross-multiply: ${a} × x = ${b} × ${c}, so x = ${b * c} ÷ ${a} = ${solution}.`;
      }
    }

    if (!used.has(question)) {
      used.add(question);
      const choicePack = linearChoices(solution);
      return {
        topic: "linear",
        question,
        displayHtml,
        choices: choicePack.choices,
        answerIndex: choicePack.answerIndex,
        explain,
      };
    }
  }

  return null;
}

function makeQuadraticQuestion(difficulty, used) {
  let question = "";
  let root = 0;
  let explain = "Square root both sides to get plus/minus answers.";

  for (let tries = 0; tries < 60; tries += 1) {
    if (difficulty === "easy") {
      root = randInt(2, 8);
      const mode = randInt(1, 4);
      if (mode === 1) {
        question = `x^2 = ${root * root}`;
      } else if (mode === 2) {
        const k = randInt(1, 6);
        question = `x^2 + ${k} = ${root * root + k}`;
      } else if (mode === 3) {
        const k = randInt(1, 6);
        question = `x^2 - ${k} = ${root * root - k}`;
      } else {
        const a = randInt(2, 4);
        question = `${a}x^2 = ${a * root * root}`;
      }
    } else if (difficulty === "medium") {
      root = randInt(2, 10);
      const k = randInt(2, 12);
      question = `x^2 + ${k} = ${root * root + k}`;
    } else {
      root = randInt(3, 12);
      const k = randInt(2, 15);
      question = `x^2 - ${k} = ${root * root - k}`;
    }

    if (!used.has(question)) {
      used.add(question);
      const choicePack = quadraticChoices(root, difficulty);
      return {
        topic: "quadratic",
        question,
        choices: choicePack.choices,
        answerIndex: choicePack.answerIndex,
        explain,
      };
    }
  }

  return null;
}

function makePositiveExponentQuestion(difficulty, used) {
  let question = "";
  let displayHtml = "";
  let answer = 0;
  let explain = "";

  for (let tries = 0; tries < 60; tries += 1) {
    if (difficulty === "easy") {
      const base = randInt(2, 5);
      const power = randInt(2, 3);
      answer = base ** power;
      question = `${base}^${power} = x`;
      displayHtml = `${base}<sup>${power}</sup> = x`;
      explain = `${base} multiplied by itself ${power} times is ${answer}.`;
    } else if (difficulty === "medium") {
      const mode = randInt(1, 2);
      if (mode === 1) {
        const base = randInt(2, 6);
        const power = randInt(2, 4);
        answer = base ** power;
        if (answer > 150) {
          continue;
        }
        question = `${base}^${power} = x`;
        displayHtml = `${base}<sup>${power}</sup> = x`;
        explain = `${base}^${power} = ${answer}.`;
      } else {
        const base = randInt(2, 5);
        const power = randInt(2, 3);
        const add = randInt(2, 12);
        answer = (base ** power) + add;
        question = `${base}^${power} + ${add} = x`;
        displayHtml = `${base}<sup>${power}</sup> + ${add} = x`;
        explain = `${base}^${power} = ${base ** power}, then add ${add} to get ${answer}.`;
      }
    } else {
      const mode = randInt(1, 4);
      if (mode === 1) {
        const base = randInt(2, 6);
        const power = randInt(3, 4);
        answer = base ** power;
        if (answer > 250) {
          continue;
        }
        question = `${base}^${power} = x`;
        displayHtml = `${base}<sup>${power}</sup> = x`;
        explain = `Compute the exponent directly: ${base}^${power} = ${answer}.`;
      } else if (mode === 2) {
        const base = randInt(2, 5);
        const p1 = randInt(2, 3);
        const p2 = randInt(2, 3);
        answer = (base ** p1) * (base ** p2);
        if (answer > 300) {
          continue;
        }
        question = `${base}^${p1} * ${base}^${p2} = x`;
        displayHtml = `${base}<sup>${p1}</sup> × ${base}<sup>${p2}</sup> = x`;
        explain = `Same base multiply rule: add powers, so ${base}^${p1 + p2} = ${answer}.`;
      } else if (mode === 3) {
        const base = randInt(2, 5);
        const power = randInt(2, 4);
        const subtract = randInt(2, 18);
        answer = (base ** power) - subtract;
        if (answer < 1) {
          continue;
        }
        question = `${base}^${power} - ${subtract} = x`;
        displayHtml = `${base}<sup>${power}</sup> - ${subtract} = x`;
        explain = `${base}^${power} = ${base ** power}, then subtract ${subtract} to get ${answer}.`;
      } else {
        const base = randInt(2, 5);
        const power = randInt(2, 4);
        const denominator = randInt(2, 12);
        answer = (base ** power) * denominator;
        if (answer > 300) {
          continue;
        }
        question = `${base}^${power} = x/${denominator}`;
        displayHtml = `${base}<sup>${power}</sup> = ${makeFracHtml("x", denominator)}`;
        explain = `Multiply both sides by ${denominator}: x = ${base ** power} × ${denominator} = ${answer}.`;
      }
    }

    if (!used.has(question)) {
      used.add(question);
      const choicePack = exponentChoices(answer);
      return {
        topic: "positive-exponent",
        question,
        displayHtml,
        choices: choicePack.choices,
        answerIndex: choicePack.answerIndex,
        explain,
      };
    }
  }

  return null;
}

function makeNegativeExponentQuestion(difficulty, used) {
  let question = "";
  let displayHtml = "";
  let answer = 0;
  let explain = "";

  for (let tries = 0; tries < 60; tries += 1) {
    if (difficulty === "easy") {
      const base = randInt(2, 9);
      answer = base;
      question = `${base}^-1 = 1/x`;
      displayHtml = `${base}<sup>-1</sup> = ${makeFracHtml(1, "x")}`;
      explain = `a^-1 means 1/a, so x = ${base}.`;
    } else if (difficulty === "medium") {
      const mode = randInt(1, 2);
      if (mode === 1) {
        const base = randInt(2, 7);
        const power = randInt(2, 3);
        answer = base ** power;
        question = `${base}^-${power} = 1/x`;
        displayHtml = `${base}<sup>-${power}</sup> = ${makeFracHtml(1, "x")}`;
        explain = `a^-n = 1/(a^n), so x = ${base}^${power} = ${answer}.`;
      } else {
        const base = randInt(2, 6);
        answer = base;
        question = `1/(${base}^-1) = x`;
        displayHtml = `${makeFracHtml(1, `${base}<sup>-1</sup>`)} = x`;
        explain = `${base}^-1 = 1/${base}, then 1 / (1/${base}) = ${base}.`;
      }
    } else {
      const mode = randInt(1, 4);
      if (mode === 1) {
        const base = randInt(2, 5);
        const p1 = randInt(1, 3);
        const p2 = randInt(1, 3);
        answer = base ** (p1 + p2);
        question = `${base}^-${p1} * ${base}^-${p2} = 1/x`;
        displayHtml = `${base}<sup>-${p1}</sup> × ${base}<sup>-${p2}</sup> = ${makeFracHtml(1, "x")}`;
        explain = `Add exponents: ${base}^-${p1 + p2} = 1/${base ** (p1 + p2)}, so x = ${answer}.`;
      } else if (mode === 2) {
        const base = randInt(2, 8);
        const power = randInt(2, 4);
        answer = base ** power;
        question = `x * ${base}^-${power} = 1`;
        displayHtml = `x × ${base}<sup>-${power}</sup> = 1`;
        explain = `${base}^-${power} = 1/${answer}, so x must be ${answer}.`;
      } else if (mode === 3) {
        const base = randInt(2, 6);
        const p1 = randInt(2, 4);
        const p2 = randInt(1, p1 - 1);
        answer = base ** (p1 - p2);
        question = `${base}^-${p1} / ${base}^-${p2} = 1/x`;
        displayHtml = `${base}<sup>-${p1}</sup> ÷ ${base}<sup>-${p2}</sup> = ${makeFracHtml(1, "x")}`;
        explain = `Subtract exponents: ${base}^(${p2 - p1}) = 1/${base ** (p1 - p2)}, so x = ${answer}.`;
      } else {
        const base = randInt(2, 6);
        const power = randInt(2, 4);
        answer = randInt(2, 12);
        const denominator = answer * (base ** power);
        if (denominator > 320) {
          continue;
        }
        question = `${base}^-${power} = x/${denominator}`;
        displayHtml = `${base}<sup>-${power}</sup> = ${makeFracHtml("x", denominator)}`;
        explain = `${base}^-${power} = 1/${base ** power}. Match denominator ${denominator}, so x = ${answer}.`;
      }
    }

    if (!used.has(question)) {
      used.add(question);
      const choicePack = exponentChoices(answer);
      return {
        topic: "negative-exponent",
        question,
        displayHtml,
        choices: choicePack.choices,
        answerIndex: choicePack.answerIndex,
        explain,
      };
    }
  }

  return null;
}

function makeZeroExponentQuestion(difficulty, used) {
  let question = "";
  let displayHtml = "";
  let answer = 0;
  let explain = "";

  for (let tries = 0; tries < 60; tries += 1) {
    if (difficulty === "easy") {
      const base = randInt(2, 20);
      answer = 1;
      question = `${base}^0 = x`;
      displayHtml = `${base}<sup>0</sup> = x`;
      explain = `Any non-zero base to power 0 equals 1, so x = 1.`;
    } else if (difficulty === "medium") {
      const mode = randInt(1, 2);
      if (mode === 1) {
        const a = randInt(2, 12);
        const b = randInt(2, 12);
        answer = 2;
        question = `${a}^0 + ${b}^0 = x`;
        displayHtml = `${a}<sup>0</sup> + ${b}<sup>0</sup> = x`;
        explain = `${a}^0 = 1 and ${b}^0 = 1, so x = 2.`;
      } else {
        const base = randInt(2, 15);
        const shift = randInt(-4, 6);
        answer = -shift;
        question = `${base}^(x + ${shift}) = 1`;
        displayHtml = `${base}<sup>x + ${shift}</sup> = 1`;
        explain = `For base ${base} ≠ 1, exponent must be 0. So x + ${shift} = 0 and x = ${answer}.`;
      }
    } else {
      const mode = randInt(1, 3);
      if (mode === 1) {
        const a = randInt(2, 12);
        const b = randInt(2, 12);
        answer = 1;
        question = `${a}^0 * ${b}^0 = x`;
        displayHtml = `${a}<sup>0</sup> × ${b}<sup>0</sup> = x`;
        explain = `Each zero exponent gives 1, so 1 × 1 = 1.`;
      } else if (mode === 2) {
        const base = randInt(2, 12);
        const coeff = randInt(2, 5);
        answer = -randInt(-8, 8);
        question = `${base}^(${coeff}x + ${-coeff * answer}) = 1`;
        displayHtml = `${base}<sup>${coeff}x + ${-coeff * answer}</sup> = 1`;
        explain = `Exponent must be 0: ${coeff}x + ${-coeff * answer} = 0, so x = ${answer}.`;
      } else {
        const baseA = randInt(2, 10);
        const baseB = randInt(2, 10);
        answer = randInt(-8, 8);
        question = `${baseA}^(x - ${answer}) = ${baseB}^0`;
        displayHtml = `${baseA}<sup>x - ${answer}</sup> = ${baseB}<sup>0</sup>`;
        explain = `Right side is 1, so left exponent must be 0: x - ${answer} = 0, giving x = ${answer}.`;
      }
    }

    if (!used.has(question)) {
      used.add(question);
      const choicePack = exponentChoices(answer);
      return {
        topic: "zero-exponent",
        question,
        displayHtml,
        choices: choicePack.choices,
        answerIndex: choicePack.answerIndex,
        explain,
      };
    }
  }

  return null;
}

function makeRootsQuestion(difficulty, used) {
  let question = "";
  let displayHtml = "";
  let answer = 0;
  let explain = "";

  for (let tries = 0; tries < 60; tries += 1) {
    if (difficulty === "easy") {
      const root = randInt(2, 12);
      answer = root * root;
      question = `sqrt(x) = ${root}`;
      displayHtml = `√x = ${root}`;
      explain = `Square both sides: x = ${root}^2 = ${answer}.`;
    } else if (difficulty === "medium") {
      const mode = randInt(1, 2);
      if (mode === 1) {
        const root = randInt(3, 12);
        const shift = randInt(2, 20);
        answer = (root * root) - shift;
        if (answer < 1) {
          continue;
        }
        question = `sqrt(x + ${shift}) = ${root}`;
        displayHtml = `√(x + ${shift}) = ${root}`;
        explain = `Square both sides: x + ${shift} = ${root * root}, so x = ${answer}.`;
      } else {
        const root = randInt(2, 10);
        const shift = randInt(2, 18);
        answer = (root * root) + shift;
        question = `sqrt(x - ${shift}) = ${root}`;
        displayHtml = `√(x - ${shift}) = ${root}`;
        explain = `Square both sides: x - ${shift} = ${root * root}, so x = ${answer}.`;
      }
    } else {
      const mode = randInt(1, 3);
      if (mode === 1) {
        const coeff = randInt(2, 5);
        const root = randInt(2, 10);
        const rhs = coeff * root;
        answer = root * root;
        question = `${coeff}*sqrt(x) = ${rhs}`;
        displayHtml = `${coeff}√x = ${rhs}`;
        explain = `Divide by ${coeff}: √x = ${root}, then square both sides to get x = ${answer}.`;
      } else if (mode === 2) {
        const root = randInt(3, 10);
        const add = randInt(2, 12);
        const rhs = root + add;
        answer = root * root;
        question = `sqrt(x) + ${add} = ${rhs}`;
        displayHtml = `√x + ${add} = ${rhs}`;
        explain = `Subtract ${add}: √x = ${root}, then square both sides so x = ${answer}.`;
      } else {
        const root = randInt(3, 11);
        const div = randInt(2, 4);
        const rhs = root / div;
        if (!Number.isInteger(rhs)) {
          continue;
        }
        answer = root * root;
        question = `sqrt(x)/${div} = ${rhs}`;
        displayHtml = `${makeFracHtml("√x", div)} = ${rhs}`;
        explain = `Multiply by ${div}: √x = ${root}, then square both sides so x = ${answer}.`;
      }
    }

    if (!used.has(question)) {
      used.add(question);
      const choicePack = exponentChoices(answer);
      return {
        topic: "roots",
        question,
        displayHtml,
        choices: choicePack.choices,
        answerIndex: choicePack.answerIndex,
        explain,
      };
    }
  }

  return null;
}

function makePercentQuestion(difficulty, used) {
  let question = "";
  let displayHtml = "";
  let answer = 0;
  let explain = "";

  for (let tries = 0; tries < 60; tries += 1) {
    if (difficulty === "easy") {
      const p = [10, 20, 25, 50][randInt(0, 3)];
      const base = randInt(4, 20) * 5;
      const result = Math.round((p / 100) * base);
      answer = base;
      question = `${p}% of x = ${result}`;
      displayHtml = `${p}% of x = ${result}`;
      explain = `x = ${result} ÷ ${p / 100} = ${answer}.`;
    } else if (difficulty === "medium") {
      const mode = randInt(1, 2);
      if (mode === 1) {
        const p = [5, 10, 20, 25, 40, 50][randInt(0, 5)];
        answer = randInt(5, 30) * 10;
        const result = Math.round((p / 100) * answer);
        question = `${p}% of x = ${result}`;
        displayHtml = `${p}% of x = ${result}`;
        explain = `Convert ${p}% to ${p / 100}, then x = ${result} ÷ ${p / 100} = ${answer}.`;
      } else {
        const base = randInt(20, 200);
        const p = [5, 10, 20, 25, 40, 50][randInt(0, 5)];
        const result = Math.round((p / 100) * base);
        answer = Math.round((100 * result) / base);
        if (answer !== p) {
          continue;
        }
        question = `x% of ${base} = ${result}`;
        displayHtml = `x% of ${base} = ${result}`;
        explain = `x = (100 × ${result}) ÷ ${base} = ${answer}.`;
      }
    } else {
      const mode = randInt(1, 3);
      if (mode === 1) {
        const p = [10, 15, 20, 25, 30][randInt(0, 4)];
        answer = randInt(20, 120);
        const after = Math.round(answer * (1 + p / 100));
        if (after !== answer * (1 + p / 100)) {
          continue;
        }
        question = `x increased by ${p}% = ${after}`;
        displayHtml = `x increased by ${p}% = ${after}`;
        explain = `x(1 + ${p / 100}) = ${after}, so x = ${after} ÷ ${1 + p / 100} = ${answer}.`;
      } else if (mode === 2) {
        const p = [10, 20, 25, 30, 40][randInt(0, 4)];
        answer = randInt(20, 200);
        const after = Math.round(answer * (1 - p / 100));
        if (after !== answer * (1 - p / 100)) {
          continue;
        }
        question = `x decreased by ${p}% = ${after}`;
        displayHtml = `x decreased by ${p}% = ${after}`;
        explain = `x(1 - ${p / 100}) = ${after}, so x = ${after} ÷ ${1 - p / 100} = ${answer}.`;
      } else {
        const p = [5, 10, 15, 20, 25][randInt(0, 4)];
        answer = randInt(20, 80) * 5;
        const part = Math.round((p / 100) * answer);
        const extra = randInt(5, 20);
        question = `${p}% of x + ${extra} = ${part + extra}`;
        displayHtml = `${p}% of x + ${extra} = ${part + extra}`;
        explain = `Subtract ${extra}: ${p}% of x = ${part}, then x = ${part} ÷ ${p / 100} = ${answer}.`;
      }
    }

    if (!used.has(question)) {
      used.add(question);
      const choicePack = exponentChoices(answer);
      return {
        topic: "percent",
        question,
        displayHtml,
        choices: choicePack.choices,
        answerIndex: choicePack.answerIndex,
        explain,
      };
    }
  }

  return null;
}

function makeSystemsQuestion(difficulty, used) {
  let question = "";
  let displayHtml = "";
  let answer = 0;
  let explain = "";

  for (let tries = 0; tries < 60; tries += 1) {
    const x = randInt(-9, 15);
    const y = randInt(-9, 15);

    if (difficulty === "easy") {
      const eq1 = x + y;
      const eq2 = x - y;
      answer = x;
      question = `x + y = ${eq1}; x - y = ${eq2}`;
      displayHtml = `<div class="quiz-system-lines"><span>x + y = ${eq1}</span><span>x - y = ${eq2}</span></div>`;
      explain = `Add equations: 2x = ${eq1 + eq2}, so x = ${answer}.`;
    } else if (difficulty === "medium") {
      const eq1 = (2 * x) + y;
      const eq2 = x - y;
      answer = x;
      question = `2x + y = ${eq1}; x - y = ${eq2}`;
      displayHtml = `<div class="quiz-system-lines"><span>2x + y = ${eq1}</span><span>x - y = ${eq2}</span></div>`;
      explain = `From x - y = ${eq2}, y = x - ${eq2}. Substitute into first to solve x = ${answer}.`;
    } else {
      const eq1 = (3 * x) + (2 * y);
      const eq2 = x - y;
      answer = x;
      question = `3x + 2y = ${eq1}; x - y = ${eq2}`;
      displayHtml = `<div class="quiz-system-lines"><span>3x + 2y = ${eq1}</span><span>x - y = ${eq2}</span></div>`;
      explain = `Use x - y = ${eq2} to express y, substitute in 3x + 2y = ${eq1}, then solve x = ${answer}.`;
    }

    if (!used.has(question)) {
      used.add(question);
      const choicePack = exponentChoices(answer);
      return {
        topic: "systems",
        question,
        displayHtml,
        choices: choicePack.choices,
        answerIndex: choicePack.answerIndex,
        explain,
      };
    }
  }

  return null;
}

function makeFunctionsQuestion(difficulty, used) {
  let question = "";
  let displayHtml = "";
  let answer = 0;
  let explain = "";

  for (let tries = 0; tries < 60; tries += 1) {
    if (difficulty === "easy") {
      answer = randInt(-9, 15);
      const b = randInt(-12, 12);
      const y = answer + b;
      question = `For y = x ${b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`}, if y = ${y}, find x.`;
      displayHtml = `For y = x ${b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`}, if y = ${y}, find x.`;
      explain = `Substitute y = ${y}: x ${b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`} = ${y}, so x = ${answer}.`;
    } else if (difficulty === "medium") {
      answer = randInt(-9, 12);
      const a = randInt(2, 6);
      const b = randInt(-12, 12);
      const y = (a * answer) + b;
      question = `For y = ${a}x ${b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`}, if y = ${y}, find x.`;
      displayHtml = `For y = ${a}x ${b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`}, if y = ${y}, find x.`;
      explain = `Set ${y} = ${a}x ${b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`}, then solve x = ${answer}.`;
    } else {
      const mode = randInt(1, 2);
      if (mode === 1) {
        answer = randInt(-8, 10);
        const a = randInt(2, 5);
        const h = randInt(-5, 6);
        const k = randInt(-10, 12);
        const y = a * (answer - h) + k;
        question = `For y = ${a}(x ${h >= 0 ? `- ${h}` : `+ ${Math.abs(h)}`}) ${k >= 0 ? `+ ${k}` : `- ${Math.abs(k)}`}, if y = ${y}, find x.`;
        displayHtml = `For y = ${a}(x ${h >= 0 ? `- ${h}` : `+ ${Math.abs(h)}`}) ${k >= 0 ? `+ ${k}` : `- ${Math.abs(k)}`}, if y = ${y}, find x.`;
        explain = `Substitute y and reverse the operations to get x = ${answer}.`;
      } else {
        answer = randInt(-8, 12);
        const a = randInt(2, 5);
        const b = randInt(-9, 9);
        const y1 = (a * answer) + b;
        const x2 = answer + randInt(1, 4);
        const y2 = (a * x2) + b;
        question = `A linear function passes through (${answer}, ${y1}) and (${x2}, ${y2}). Find x when y = ${y1}.`;
        displayHtml = `A linear function passes through (${answer}, ${y1}) and (${x2}, ${y2}). Find x when y = ${y1}.`;
        explain = `Given point (${answer}, ${y1}), the x-value for y = ${y1} is x = ${answer}.`;
      }
    }

    if (!used.has(question)) {
      used.add(question);
      const choicePack = exponentChoices(answer);
      return {
        topic: "functions",
        question,
        displayHtml,
        choices: choicePack.choices,
        answerIndex: choicePack.answerIndex,
        explain,
      };
    }
  }

  return null;
}

function makeGeometryVisual(shape, labels, promptText) {
  let svg = "";
  if (shape === "square") {
    svg = "" +
      '<svg class="geo-svg" viewBox="0 0 180 120" aria-hidden="true">' +
      '<rect x="40" y="20" width="100" height="80" class="geo-stroke" />' +
      `<text x="90" y="114" class="geo-label" text-anchor="middle">${labels.bottom || "x"}</text>` +
      '</svg>';
  } else if (shape === "triangle") {
    svg = "" +
      '<svg class="geo-svg" viewBox="0 0 200 120" aria-hidden="true">' +
      '<polygon points="100,18 24,100 176,100" class="geo-stroke" />' +
      `<text x="100" y="44" class="geo-label" text-anchor="middle">${labels.top || "x"}</text>` +
      `<text x="48" y="92" class="geo-label" text-anchor="middle">${labels.left || "64"}</text>` +
      `<text x="152" y="92" class="geo-label" text-anchor="middle">${labels.right || "67"}</text>` +
      '</svg>';
  } else if (shape === "rectangle") {
    svg = "" +
      '<svg class="geo-svg" viewBox="0 0 200 120" aria-hidden="true">' +
      '<rect x="32" y="28" width="136" height="64" class="geo-stroke" />' +
      `<text x="100" y="22" class="geo-label" text-anchor="middle">${labels.top || "x"}</text>` +
      `<text x="178" y="64" class="geo-label" text-anchor="start">${labels.right || "8"}</text>` +
      '</svg>';
  } else if (shape === "right-triangle") {
    svg = "" +
      '<svg class="geo-svg" viewBox="0 0 220 130" aria-hidden="true">' +
      '<polygon points="28,102 28,26 176,102" class="geo-stroke" />' +
      '<rect x="28" y="86" width="16" height="16" class="geo-corner" />' +
      `<text x="24" y="64" class="geo-label" text-anchor="end">${labels.left || "x"}</text>` +
      `<text x="98" y="120" class="geo-label" text-anchor="middle">${labels.bottom || "4"}</text>` +
      `<text x="146" y="56" class="geo-label" text-anchor="middle">${labels.hyp || "5"}</text>` +
      '</svg>';
  }

  return `
    <div class="quiz-geo-wrap">
      ${svg}
      <div class="quiz-geo-text">${promptText}</div>
    </div>
  `;
}

function makeProbabilityVisual(kind, labels, promptText) {
  let svg = "";
  if (kind === "bag") {
    svg = "" +
      '<svg class="prob-svg" viewBox="0 0 230 130" aria-hidden="true">' +
      '<path d="M75 30 C75 18, 155 18, 155 30 L168 40 L168 105 C168 114, 161 121, 152 121 L78 121 C69 121, 62 114, 62 105 L62 40 Z" class="prob-stroke" />' +
      '<circle cx="92" cy="64" r="10" class="prob-red" />' +
      '<circle cx="117" cy="72" r="10" class="prob-blue" />' +
      '<circle cx="140" cy="63" r="10" class="prob-blue" />' +
      `<text x="28" y="78" class="prob-label" text-anchor="start">red = ${labels.red || "x"}</text>` +
      `<text x="170" y="78" class="prob-label" text-anchor="start">blue = ${labels.blue || "4"}</text>` +
      '</svg>';
  } else if (kind === "bar") {
    const left = labels.left || "success";
    const right = labels.right || "fail";
    svg = "" +
      '<svg class="prob-svg" viewBox="0 0 230 130" aria-hidden="true">' +
      '<rect x="26" y="42" width="178" height="40" class="prob-stroke" />' +
      '<rect x="26" y="42" width="89" height="40" class="prob-red-soft" />' +
      `<text x="70" y="66" class="prob-label" text-anchor="middle">${left}</text>` +
      `<text x="160" y="66" class="prob-label" text-anchor="middle">${right}</text>` +
      `<text x="115" y="110" class="prob-label" text-anchor="middle">P = ${labels.frac || "1/2"}</text>` +
      '</svg>';
  } else {
    svg = "" +
      '<svg class="prob-svg" viewBox="0 0 230 130" aria-hidden="true">' +
      '<circle cx="115" cy="64" r="46" class="prob-stroke" />' +
      '<line x1="115" y1="64" x2="160" y2="64" class="prob-slice" />' +
      '<line x1="115" y1="64" x2="92" y2="24" class="prob-slice" />' +
      `<text x="115" y="118" class="prob-label" text-anchor="middle">ratio model</text>` +
      '</svg>';
  }

  return `
    <div class="quiz-prob-wrap">
      ${svg}
      <div class="quiz-prob-text">${promptText}</div>
    </div>
  `;
}

function makeGeometryQuestion(difficulty, used) {
  let question = "";
  let displayHtml = "";
  let answer = 0;
  let explain = "";

  for (let tries = 0; tries < 60; tries += 1) {
    if (difficulty === "easy") {
      const mode = randInt(1, 2);
      if (mode === 1) {
        answer = randInt(2, 20);
        const perimeter = 4 * answer;
        question = `Square perimeter is ${perimeter}. If side = x, find x.`;
        displayHtml = makeGeometryVisual("square", { bottom: "x" }, `Perimeter = ${perimeter}. Find x.`);
        explain = `For a square, perimeter = 4x. So x = ${perimeter} ÷ 4 = ${answer}.`;
      } else {
        answer = randInt(5, 90);
        const b = randInt(20, 80);
        const c = 180 - answer - b;
        if (c <= 0) {
          continue;
        }
        question = `Triangle angles are x, ${b}, and ${c}. Find x.`;
        displayHtml = makeGeometryVisual("triangle", { top: "x", left: String(b), right: String(c) }, "Triangle angle sum is 180. Find x.");
        explain = `Triangle angles sum to 180. So x = 180 - ${b} - ${c} = ${answer}.`;
      }
    } else if (difficulty === "medium") {
      const mode = randInt(1, 2);
      if (mode === 1) {
        const add = randInt(2, 12);
        answer = randInt(2, 25);
        const perimeter = 2 * (answer + add);
        question = `Rectangle has sides x and ${add}. Perimeter is ${perimeter}. Find x.`;
        displayHtml = makeGeometryVisual("rectangle", { top: "x", right: String(add) }, `Perimeter = ${perimeter}. Find x.`);
        explain = `Perimeter = 2(x + ${add}) = ${perimeter}. So x + ${add} = ${perimeter / 2}, x = ${answer}.`;
      } else {
        const height = randInt(2, 15);
        answer = randInt(2, 25);
        const area = height * answer;
        question = `Rectangle area is ${area} and height is ${height}. If width = x, find x.`;
        displayHtml = makeGeometryVisual("rectangle", { top: "x", right: String(height) }, `Area = ${area}. Find x.`);
        explain = `Area = width × height. So x = ${area} ÷ ${height} = ${answer}.`;
      }
    } else {
      const mode = randInt(1, 3);
      if (mode === 1) {
        const triples = [
          [3, 4, 5],
          [5, 12, 13],
          [8, 15, 17],
          [7, 24, 25],
        ];
        const pick = triples[randInt(0, triples.length - 1)];
        answer = pick[0];
        question = `Right triangle: x^2 + ${pick[1]}^2 = ${pick[2]}^2. Find x.`;
        displayHtml = makeGeometryVisual("right-triangle", { left: "x", bottom: String(pick[1]), hyp: String(pick[2]) }, "Use Pythagorean theorem to find x.");
        explain = `x^2 = ${pick[2] * pick[2]} - ${pick[1] * pick[1]} = ${answer * answer}, so x = ${answer}.`;
      } else if (mode === 2) {
        const a = randInt(2, 10);
        const b = randInt(2, 12);
        const c = randInt(2, 12);
        answer = (a * c) / b;
        if (!Number.isInteger(answer) || answer <= 0) {
          continue;
        }
        question = `Similar triangles: x/${a} = ${c}/${b}. Find x.`;
        displayHtml = `${makeFracHtml("x", a)} = ${makeFracHtml(c, b)}. Find x.`;
        explain = `Cross-multiply: x × ${b} = ${a} × ${c}. So x = (${a} × ${c}) ÷ ${b} = ${answer}.`;
      } else {
        const base = randInt(4, 24);
        answer = randInt(2, 20);
        const area = (base * answer) / 2;
        if (!Number.isInteger(area)) {
          continue;
        }
        question = `Triangle area is ${area} and base is ${base}. If height = x, find x.`;
        displayHtml = `Triangle area = ${area}, base = ${base}, height = x. Find x.`;
        explain = `Area = (base × height)/2. So x = (2 × ${area}) ÷ ${base} = ${answer}.`;
      }
    }

    if (!used.has(question)) {
      used.add(question);
      const choicePack = exponentChoices(answer);
      return {
        topic: "geometry",
        question,
        displayHtml,
        choices: choicePack.choices,
        answerIndex: choicePack.answerIndex,
        explain,
      };
    }
  }

  return null;
}

function makeProbabilityQuestion(difficulty, used) {
  let question = "";
  let displayHtml = "";
  let answer = 0;
  let explain = "";

  for (let tries = 0; tries < 60; tries += 1) {
    if (difficulty === "easy") {
      answer = randInt(1, 12);
      const other = randInt(1, 12);
      const total = answer + other;
      question = `A bag has x red and ${other} blue balls. P(red) = ${answer}/${total}. Find x.`;
      displayHtml = makeProbabilityVisual("bag", { red: "x", blue: String(other) }, `P(red) = ${makeFracHtml(answer, total)}. Find x.`);
      explain = `P(red) = x/(x+${other}) = ${answer}/${total}, so x = ${answer}.`;
    } else if (difficulty === "medium") {
      const mode = randInt(1, 2);
      if (mode === 1) {
        const total = randInt(8, 30);
        answer = randInt(1, total - 1);
        const pNum = answer;
        const pDen = total;
        question = `If probability of success is ${pNum}/${pDen} in ${total} outcomes, number of successes is x. Find x.`;
        displayHtml = makeProbabilityVisual("bar", { left: "x", right: String(total - answer), frac: `${pNum}/${pDen}` }, `Total outcomes = ${total}. Find x.`);
        explain = `x/${total} = ${pNum}/${pDen}, so x = ${answer}.`;
      } else {
        answer = randInt(1, 15);
        const add = randInt(1, 10);
        const total = answer + add;
        question = `x favorable outcomes and ${add} unfavorable. P(favorable) = ${answer}/${total}. Find x.`;
        displayHtml = makeProbabilityVisual("bag", { red: "x", blue: String(add) }, `P(favorable) = ${makeFracHtml(answer, total)}. Find x.`);
        explain = `P = x/(x+${add}) = ${answer}/${total}, so x = ${answer}.`;
      }
    } else {
      const mode = randInt(1, 3);
      if (mode === 1) {
        answer = randInt(2, 20);
        const total = randInt(answer + 2, answer + 25);
        const not = total - answer;
        question = `A bag has x red balls. P(not red) = ${not}/${total}. Find x.`;
        displayHtml = makeProbabilityVisual("bag", { red: "x", blue: String(not) }, `P(not red) = ${makeFracHtml(not, total)}. Total = ${total}.`);
        explain = `P(not red) = (total - x)/total = ${not}/${total}, so x = ${answer}.`;
      } else if (mode === 2) {
        const total = randInt(12, 50);
        const p = [10, 20, 25, 30, 40, 50][randInt(0, 5)];
        answer = (p * total) / 100;
        if (!Number.isInteger(answer)) {
          continue;
        }
        question = `In ${total} trials, success probability is ${p}%. Number of successes is x. Find x.`;
        displayHtml = makeProbabilityVisual("bar", { left: "x", right: String(total - answer), frac: `${p}%` }, `${p}% of ${total} trials are successes. Find x.`);
        explain = `x = ${p}% of ${total} = ${answer}.`;
      } else {
        answer = randInt(1, 12);
        const add = randInt(2, 10);
        const pNum = answer;
        const pDen = answer + add;
        question = `x/(x + ${add}) = ${pNum}/${pDen}. Solve for x.`;
        displayHtml = makeProbabilityVisual("circle", {}, `${makeFracHtml("x", `x + ${add}`)} = ${makeFracHtml(pNum, pDen)}. Solve for x.`);
        explain = `x/(x+${add}) = ${pNum}/${pDen}, so x = ${answer}.`;
      }
    }

    if (!used.has(question)) {
      used.add(question);
      const choicePack = exponentChoices(answer);
      return {
        topic: "probability",
        question,
        displayHtml,
        choices: choicePack.choices,
        answerIndex: choicePack.answerIndex,
        explain,
      };
    }
  }

  return null;
}

function buildQuizSet(topic, difficulty) {
  const used = new Set();
  const questions = [];

  while (questions.length < QUIZ_LENGTH) {
    let item = null;
    if (topic === "linear") {
      item = makeLinearQuestion(difficulty, used);
    } else if (topic === "quadratic") {
      item = makeQuadraticQuestion(difficulty, used);
    } else if (topic === "positive-exponent") {
      item = makePositiveExponentQuestion(difficulty, used);
    } else if (topic === "negative-exponent") {
      item = makeNegativeExponentQuestion(difficulty, used);
    } else if (topic === "zero-exponent") {
      item = makeZeroExponentQuestion(difficulty, used);
    } else if (topic === "roots") {
      item = makeRootsQuestion(difficulty, used);
    } else if (topic === "percent") {
      item = makePercentQuestion(difficulty, used);
    } else if (topic === "systems") {
      item = makeSystemsQuestion(difficulty, used);
    } else if (topic === "functions") {
      item = makeFunctionsQuestion(difficulty, used);
    } else if (topic === "geometry") {
      item = makeGeometryQuestion(difficulty, used);
    } else if (topic === "probability") {
      item = makeProbabilityQuestion(difficulty, used);
    } else {
      const allGenerators = [
        makeLinearQuestion,
        makeQuadraticQuestion,
        makePositiveExponentQuestion,
        makeNegativeExponentQuestion,
        makeZeroExponentQuestion,
        makeRootsQuestion,
        makePercentQuestion,
        makeSystemsQuestion,
        makeFunctionsQuestion,
        makeGeometryQuestion,
        makeProbabilityQuestion,
      ];
      const orderedGenerators = shuffleArray(allGenerators);
      for (let i = 0; i < orderedGenerators.length; i += 1) {
        item = orderedGenerators[i](difficulty, used);
        if (item) {
          break;
        }
      }
    }

    if (!item) {
      break;
    }

    questions.push(item);
  }

  return shuffleArray(questions);
}

function resetAndRender() {
  currentIndex = 0;
  selectedIndex = -1;
  score = 0;
  answeredCurrent = false;
  premadeScore.textContent = `${t("premade.scoreLabel")}: 0`;
  renderQuestion();
}

function updateQuestionCounterDisplay() {
  if (!activeQuestions.length) {
    premadeQuestionCount.textContent = t("premade.questionCount", { current: 0, total: 0 });
    return;
  }

  premadeQuestionCount.innerHTML = `<button id="premadeChangeModeBtn" class="premade-mode-inline-btn" type="button">${difficultyLabel(selectedDifficulty)}</button> - ${t("premade.questionCount", { current: currentIndex + 1, total: activeQuestions.length })}`;

  const changeModeBtn = document.getElementById("premadeChangeModeBtn");
  if (changeModeBtn) {
    changeModeBtn.addEventListener("click", () => {
      openDifficultyModal();
    });
  }
}

function renderQuestion() {
  markQuestionAsDynamic();

  if (!activeQuestions.length) {
    updateQuestionCounterDisplay();
    premadeQuestionText.textContent = t("premade.noQuizAvailable");
    premadeChoices.innerHTML = "";
    premadeSubmitBtn.disabled = true;
    premadeNextBtn.disabled = true;
    showPremadeFeedback(t("premade.tryAnotherTopic"), false);
    updateProgress();
    return;
  }

  const item = activeQuestions[currentIndex];
  selectedIndex = -1;
  answeredCurrent = false;
  currentQuestionStartedAt = Date.now();

  // Reset question area before rendering the current item.
  premadeChoices.innerHTML = "";
  if (item.displayHtml) {
    premadeQuestionText.innerHTML = item.displayHtml;
  } else {
    premadeQuestionText.textContent = item.question;
  }

  updateQuestionCounterDisplay();
  premadeNextBtn.disabled = true;
  premadeSubmitBtn.disabled = true;
  showPremadeFeedback("", false);

  item.choices.forEach((choice, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice-btn";
    btn.textContent = choice;

    btn.addEventListener("click", () => {
      if (answeredCurrent) {
        return;
      }

      selectedIndex = index;
      premadeSubmitBtn.disabled = false;

      [...premadeChoices.querySelectorAll("button")].forEach((choiceBtn, choiceIndex) => {
        choiceBtn.classList.toggle("choice-selected", choiceIndex === selectedIndex);
      });
    });

    premadeChoices.appendChild(btn);
  });

  updateProgress();
}

function savePracticeAttempt(item, wasCorrect, selectedAnswer) {
  if (!item || !window.BotbyRecentHistory || typeof window.BotbyRecentHistory.addPracticeAttempt !== "function") {
    return;
  }

  const now = Date.now();
  const durationMs = Math.max(0, now - currentQuestionStartedAt);
  currentQuestionStartedAt = now;

  window.BotbyRecentHistory.addPracticeAttempt({
    equation: item.question,
    source: "quiz",
    resultType: item.topic === "quadratic" ? "two" : "one",
    wasCorrect,
    selectedAnswer: selectedAnswer || "",
    durationMs,
  });
}

function checkAnswer() {
  if (selectedIndex < 0 || answeredCurrent) {
    return;
  }

  const item = activeQuestions[currentIndex];
  const buttons = [...premadeChoices.querySelectorAll("button")];
  answeredCurrent = true;
  premadeSubmitBtn.disabled = true;

  buttons.forEach((button, index) => {
    button.disabled = true;
    button.classList.remove("choice-selected");

    if (index === item.answerIndex) {
      button.classList.add("choice-correct");
    }

    if (index === selectedIndex && index !== item.answerIndex) {
      button.classList.add("choice-wrong");
    }
  });

  if (selectedIndex === item.answerIndex) {
    score += 1;
    savePracticeAttempt(item, true, item.choices[selectedIndex] || "");
    showPremadeFeedback(`${t("premade.correct")} ${item.explain}`, false);
  } else {
    savePracticeAttempt(item, false, item.choices[selectedIndex] || "");
    showPremadeFeedback(`${t("premade.notQuite")} ${item.explain}`, true);
  }

  premadeScore.textContent = `${t("premade.scoreLabel")}: ${score}`;
  premadeNextBtn.disabled = false;
}

function askForMoreQuiz() {
  openContinueModal();
}

function nextQuestion() {
  if (currentIndex < activeQuestions.length - 1) {
    currentIndex += 1;
    renderQuestion();
    return;
  }

  premadeQuestionText.textContent = t("premade.finishedTitle");
  premadeChoices.innerHTML = "";
  premadeSubmitBtn.disabled = true;
  premadeNextBtn.disabled = true;
  showPremadeFeedback(t("premade.finishedMessage", { score, total: activeQuestions.length }), false);
  updateProgress(true);
  askForMoreQuiz();
}

function updateProgress(done) {
  if (!activeQuestions.length) {
    premadeProgressFill.style.width = "0%";
    premadeProgressBar.setAttribute("aria-valuenow", "0");
    return;
  }

  const progress = done
    ? 100
    : Math.round((currentIndex / activeQuestions.length) * 100);
  premadeProgressFill.style.width = `${progress}%`;
  premadeProgressBar.setAttribute("aria-valuenow", String(progress));
}

function showPremadeFeedback(text, isError) {
  premadeFeedback.textContent = text;
  premadeFeedback.classList.remove("success", "error");
  premadeFeedback.classList.toggle("is-visible", Boolean(text && text.trim()));
  premadeFeedback.classList.add(isError ? "error" : "success");
}

function ensureContinueModal() {
  if (premadeContinueModal) {
    return;
  }

  const modal = document.createElement("div");
  modal.id = "premadeContinueModal";
  modal.className = "quiz-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "premadeContinueTitle");
  modal.hidden = true;

  modal.innerHTML = "" +
    '<div class="quiz-modal-card">' +
    `<h2 id="premadeContinueTitle">${t("premade.continueTitle")}</h2>` +
    `<p>${t("premade.continueText")}</p>` +
    '<div class="quiz-modal-actions">' +
    `<button id="premadeContinueYes" class="btn" type="button">${t("premade.continueYes")}</button>` +
    `<button id="premadeContinueNo" class="btn btn-ghost" type="button">${t("premade.continueNo")}</button>` +
    '</div>' +
    '</div>';

  document.body.appendChild(modal);
  premadeContinueModal = modal;
  premadeContinueYes = document.getElementById("premadeContinueYes");
  premadeContinueNo = document.getElementById("premadeContinueNo");

  premadeContinueModal.addEventListener("click", (event) => {
    if (event.target === premadeContinueModal) {
      closeContinueModal();
    }
  });

  premadeContinueYes.addEventListener("click", () => {
    closeContinueModal();
    openDifficultyModal();
  });

  premadeContinueNo.addEventListener("click", () => {
    window.location.href = "../premade-quiz.html";
  });
}

function openContinueModal() {
  ensureContinueModal();
  const continueTitle = document.getElementById("premadeContinueTitle");
  const continueText = premadeContinueModal ? premadeContinueModal.querySelector(".quiz-modal-card p") : null;
  if (continueTitle) {
    continueTitle.textContent = t("premade.continueTitle");
  }
  if (continueText) {
    continueText.textContent = t("premade.continueText");
  }
  if (premadeContinueYes) {
    premadeContinueYes.textContent = t("premade.continueYes");
  }
  if (premadeContinueNo) {
    premadeContinueNo.textContent = t("premade.continueNo");
  }
  premadeContinueModal.hidden = false;
}

function closeContinueModal() {
  if (premadeContinueModal) {
    premadeContinueModal.hidden = true;
  }
}

function openDifficultyModal() {
  if (premadeDifficultyModal) {
    premadeDifficultyModal.hidden = false;
  }
}

function closeDifficultyModal() {
  if (premadeDifficultyModal) {
    premadeDifficultyModal.hidden = true;
  }
}

function pickDifficulty(level) {
  selectedDifficulty = level;
  try {
    localStorage.setItem(DIFFICULTY_STORAGE_KEY, level);
  } catch (error) {
    // Ignore storage issues and continue with in-memory setting.
  }
  closeDifficultyModal();
  activeQuestions = buildQuizSet(fixedTopic, selectedDifficulty);
  resetAndRender();
}

function restoreDifficulty() {
  try {
    const saved = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
    if (saved === "easy" || saved === "medium" || saved === "hard") {
      selectedDifficulty = saved;
      return true;
    }
  } catch (error) {
    // Ignore storage issues and fall back to modal prompt.
  }

  return false;
}

premadeSubmitBtn.addEventListener("click", checkAnswer);
premadeNextBtn.addEventListener("click", nextQuestion);

if (premadeDifficultyModal) {
  premadeDifficultyModal.addEventListener("click", (event) => {
    if (event.target === premadeDifficultyModal) {
      closeDifficultyModal();
    }
  });

  premadeDifficultyModal.querySelectorAll("[data-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-mode") || "medium";
      pickDifficulty(mode);
    });
  });
}

if (premadeDifficultyCancel) {
  premadeDifficultyCancel.addEventListener("click", () => {
    window.location.href = "../premade-quiz.html";
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && premadeContinueModal && !premadeContinueModal.hidden) {
    closeContinueModal();
    return;
  }

  if (event.key === "Escape" && premadeDifficultyModal && !premadeDifficultyModal.hidden) {
    closeDifficultyModal();
  }
});

if (restoreDifficulty()) {
  activeQuestions = buildQuizSet(fixedTopic, selectedDifficulty);
  resetAndRender();
} else {
  openDifficultyModal();
}

localizeStaticPageText();

document.addEventListener("langchange", () => {
  localizeStaticPageText();
  updateQuestionCounterDisplay();
});

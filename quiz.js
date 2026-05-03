const equationInput = document.getElementById("equationInput");
const quizBtn = document.getElementById("quizBtn");
const quizQuestion = document.getElementById("quizQuestion");
const quizChoices = document.getElementById("quizChoices");
const quizFeedback = document.getElementById("quizFeedback");
const quizProgressFill = document.getElementById("quizProgressFill");
const quizProgressBar = document.getElementById("quizProgressBar");
const quizScoreRow = document.getElementById("quizScoreRow");
const quizCorrectCount = document.getElementById("quizCorrectCount");
const quizWrongCount = document.getElementById("quizWrongCount");
const explanationModal = document.getElementById("explanationModal");
const explanationYesBtn = document.getElementById("explanationYesBtn");
const explanationNoBtn = document.getElementById("explanationNoBtn");
const quizTutorialBtn = document.getElementById("quizTutorialBtn");
const quizTutorialModal = document.getElementById("quizTutorialModal");
const quizTutorialCloseBtn = document.getElementById("quizTutorialCloseBtn");

let quizActive = false;
let autoGenerateTimer = null;
let selectedChoiceIndex = -1;
let currentOptions = [];
let currentEquation = "";
let currentResult = null;
let hasSubmittedAnswer = false;
let historyPracticeQueue = [];
let historyPracticeIndex = -1;
let isHistoryPractice = false;
let sessionCorrect = 0;
let sessionWrong = 0;
let wrongAttemptsInRow = 0;
let hasPromptedExplanationForCurrent = false;
let quizTaskStartedAt = Date.now();

quizBtn.disabled = true;

// Set initial translated text once i18n is ready (loaded before this script)
quizQuestion.textContent = window.t("quiz.noQuizYet");
restoreRecentQuiz();

// Reset initial text on language change if no quiz is active
document.addEventListener("langchange", function () {
  if (!quizActive) {
    quizQuestion.textContent = window.t("quiz.noQuizYet");
  }
});

quizBtn.addEventListener("click", () => {
  submitSelectedAnswer();
});

if (explanationYesBtn) {
  explanationYesBtn.addEventListener("click", () => {
    closeExplanationModal();
    showFeedback(buildThirdTryHint(), false);
  });
}

if (explanationNoBtn) {
  explanationNoBtn.addEventListener("click", () => {
    closeExplanationModal();
    showFeedback("No worries, keep trying. You got this.", false);
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && quizTutorialModal && !quizTutorialModal.hidden) {
    closeQuizTutorialModal();
    return;
  }

  if (event.key === "Escape" && explanationModal && !explanationModal.hidden) {
    closeExplanationModal();
  }
});

if (quizTutorialBtn && quizTutorialModal && quizTutorialCloseBtn) {
  quizTutorialBtn.addEventListener("click", openQuizTutorialModal);
  quizTutorialCloseBtn.addEventListener("click", closeQuizTutorialModal);
  quizTutorialModal.addEventListener("click", (event) => {
    if (event.target === quizTutorialModal) {
      closeQuizTutorialModal();
    }
  });
}

function openQuizTutorialModal() {
  if (!quizTutorialModal || !quizTutorialCloseBtn) {
    return;
  }
  quizTutorialModal.hidden = false;
  quizTutorialCloseBtn.focus();
}

function closeQuizTutorialModal() {
  if (!quizTutorialModal || !quizTutorialBtn) {
    return;
  }
  quizTutorialModal.hidden = true;
  quizTutorialBtn.focus();
}

equationInput.addEventListener("input", () => {
  if (autoGenerateTimer) {
    clearTimeout(autoGenerateTimer);
  }

  autoGenerateTimer = setTimeout(() => {
    const rawEquation = equationInput.value.trim();
    isHistoryPractice = false;

    if (!rawEquation) {
      quizChoices.innerHTML = "";
      quizQuestion.textContent = window.t("quiz.noQuizYet");
      resetQuizState();
      showFeedback("", false);
      quizActive = false;
      return;
    }

    generateQuizForEquation(rawEquation);
  }, 280);
});

equationInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    generateQuizForEquation(equationInput.value.trim());
  }
});

function generateQuizForEquation(rawEquation) {
  if (!rawEquation) {
    resetQuizState();
    showFeedback(window.t("err.emptyInput"), true);
    return;
  }

  let result;
  try {
    result = solveLinearEquation(rawEquation);
  } catch (error) {
    showFeedback(error.message, true);
    quizChoices.innerHTML = "";
    quizQuestion.textContent = window.t("quiz.noQuizYet");
    resetQuizState();
    quizActive = false;
    return;
  }

  if (result.type !== "one" && result.type !== "two") {
    quizQuestion.textContent = window.t("quiz.noQuizAvail");
    quizChoices.innerHTML = "";
    resetQuizState();
    showFeedback(window.t("quiz.useEquation"), true);
    quizActive = false;
    return;
  }

  const options = buildOptions(result);

  quizQuestion.textContent = rawEquation;
  quizChoices.innerHTML = "";
  quizActive = true;
  selectedChoiceIndex = -1;
  currentOptions = options;
  currentEquation = rawEquation;
  currentResult = result;
  wrongAttemptsInRow = 0;
  hasPromptedExplanationForCurrent = false;
  hasSubmittedAnswer = false;
  quizTaskStartedAt = Date.now();
  quizBtn.disabled = true;

  options.forEach((option, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice-btn";
    btn.textContent = option.label;
    btn.dataset.choiceIndex = String(index);

    btn.addEventListener("click", () => {
      if (hasSubmittedAnswer) {
        return;
      }

      selectedChoiceIndex = index;
      quizBtn.disabled = false;

      const buttons = [...quizChoices.querySelectorAll("button")];
      buttons.forEach((choiceBtn, choiceIndex) => {
        choiceBtn.classList.remove("choice-wrong", "choice-correct");
        choiceBtn.classList.toggle("choice-selected", choiceIndex === selectedChoiceIndex);
      });
    });

    quizChoices.appendChild(btn);
  });

  showFeedback(window.t("quiz.chooseOne"), false);
}

function submitSelectedAnswer() {
  if (!quizActive || hasSubmittedAnswer || selectedChoiceIndex < 0) {
    return;
  }

  const buttons = [...quizChoices.querySelectorAll("button")];
  const selectedOption = currentOptions[selectedChoiceIndex];

  if (selectedOption && selectedOption.correct) {
    hasSubmittedAnswer = true;
    quizBtn.disabled = true;
    wrongAttemptsInRow = 0;

    buttons.forEach((button) => {
      button.disabled = true;
      button.classList.remove("choice-selected");
    });

    const selectedBtn = buttons[selectedChoiceIndex];
    if (selectedBtn) {
      selectedBtn.classList.add("choice-correct");
    }
    showFeedback("Nice one! You got it right. Type another equation when you're ready.", false);
    savePracticeAttempt(currentEquation, currentResult, true, selectedOption.label);
    sessionCorrect += 1;

    if (currentEquation && currentResult) {
      saveRecentQuiz(currentEquation, currentResult);
    }

    if (isHistoryPractice) {
      goToNextHistoryEquation();
    } else {
      setTimeout(() => {
        equationInput.value = "";
        quizChoices.innerHTML = "";
        quizQuestion.textContent = window.t("quiz.noQuizYet");
        resetQuizState();
        quizActive = false;
        equationInput.focus();
      }, 450);
    }
  } else {
    wrongAttemptsInRow += 1;
    sessionWrong += 1;

    const selectedBtn = buttons[selectedChoiceIndex];
    if (selectedBtn) {
      selectedBtn.classList.add("choice-wrong");
    }

    buttons.forEach((button) => {
      button.classList.remove("choice-selected");
    });
    selectedChoiceIndex = -1;
    quizBtn.disabled = true;

    if (wrongAttemptsInRow >= 3) {
      if (!hasPromptedExplanationForCurrent) {
        hasPromptedExplanationForCurrent = true;
        openExplanationModal();
      } else {
        showFeedback("Take your time and try one more time.", false);
      }
    } else {
      showFeedback(pickChillRetryMessage(), false);
    }

    savePracticeAttempt(currentEquation, currentResult, false, selectedOption ? selectedOption.label : "");
  }

  updateScoreDisplay();
}

function resetQuizState() {
  selectedChoiceIndex = -1;
  currentOptions = [];
  currentEquation = "";
  currentResult = null;
  hasSubmittedAnswer = false;
  quizBtn.disabled = true;
}

function updateScoreDisplay() {
  const total = sessionCorrect + sessionWrong;
  if (total === 0) {
    quizScoreRow.hidden = true;
    quizProgressFill.style.width = "0%";
    quizProgressBar.setAttribute("aria-valuenow", "0");
    return;
  }
  const pct = Math.round((sessionCorrect / total) * 100);
  quizProgressFill.style.width = pct + "%";
  quizProgressBar.setAttribute("aria-valuenow", String(pct));
  quizCorrectCount.textContent = "\u2713 " + sessionCorrect;
  quizWrongCount.textContent = "\u2717 " + sessionWrong;
  quizScoreRow.hidden = false;
}

function pickChillRetryMessage() {
  const messages = [
    "Ehh nope, try again. You might have just mis-clicked.",
    "Almost there. Give it one more try.",
    "Not quite, but you are close. Try another option.",
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

function openExplanationModal() {
  if (!explanationModal) {
    showFeedback(buildThirdTryHint(), false);
    return;
  }

  explanationModal.hidden = false;
  if (explanationYesBtn) {
    explanationYesBtn.focus();
  }
}

function closeExplanationModal() {
  if (!explanationModal) {
    return;
  }

  explanationModal.hidden = true;
  quizBtn.focus();
}

function buildThirdTryHint() {
  if (!currentResult || !currentOptions || !currentOptions.correctLabel) {
    return "No stress. Try isolating x step by step and do the same operation on both sides.";
  }

  const explanation = buildStepByStepExplanation(currentEquation, currentResult);
  return `No stress, here is an easy way to do it:\n${explanation}`;
}

function buildStepByStepExplanation(equation, result) {
  const parts = String(equation || "").split("=");
  if (parts.length !== 2) {
    return `Answer: ${currentOptions.correctLabel}`;
  }

  const left = parts[0].trim();
  const right = parts[1].trim();

  try {
    const f0 = evaluateExpression(left, 0) - evaluateExpression(right, 0);
    const f1 = evaluateExpression(left, 1) - evaluateExpression(right, 1);
    const f2 = evaluateExpression(left, 2) - evaluateExpression(right, 2);
    const f3 = evaluateExpression(left, 3) - evaluateExpression(right, 3);
    const { a, b, c } = polynomialCoefficientsUpToQuadratic(f0, f1, f2, f3);

    const aN = normalizeNumber(a);
    const bN = normalizeNumber(b);
    const cN = normalizeNumber(c);

    if (almostZero(aN)) {
      const coeff = normalizeNumber(bN);
      const rhs = normalizeNumber(-cN);
      const xValue = formatNumber(result.value);
      const coeffLabel = formatNumber(coeff);
      const rhsLabel = formatNumber(rhs);
      const leftLabel = almostZero(coeff - 1)
        ? "x"
        : almostZero(coeff + 1)
          ? "-x"
          : `${coeffLabel}x`;

      const lines = [
        `Equation: ${equation}`,
        "Step 1: We want x all by itself.",
        `Step 2: Move numbers to the other side: ${leftLabel} = ${rhsLabel}`,
      ];

      if (!almostZero(coeff - 1)) {
        if (almostZero(coeff + 1)) {
          lines.push("Step 3: Multiply both sides by -1.");
        } else {
          lines.push(`Step 3: Divide both sides by ${coeffLabel}.`);
        }
      }

      lines.push(`Answer: x = ${xValue}`);
      return lines.join("\n");
    }

    const disc = normalizeNumber(bN * bN - 4 * aN * cN);
    const sqrtDisc = normalizeNumber(Math.sqrt(Math.max(0, disc)));

    if (result.type === "two" && Array.isArray(result.values)) {
      const roots = [...result.values].map((v) => normalizeNumber(v)).sort((x, y) => x - y);
      return [
        `Equation: ${equation}`,
        "Step 1: Move everything to one side so it equals 0.",
        "Step 2: Use the quadratic formula.",
        `Step 3: This gives two answers (because of ±): ${formatNumber(roots[0])} and ${formatNumber(roots[1])}`,
        `Answer: x = ${formatNumber(roots[0])} or x = ${formatNumber(roots[1])}`,
      ].join("\n");
    }

    const oneRoot = formatNumber(result.value);
    return [
      `Equation: ${equation}`,
      "Step 1: Move everything to one side so it equals 0.",
      `Step 2: The discriminant is 0, so there is only one answer.`,
      "Step 3: Solve with x = -b / (2a).",
      `Answer: x = ${oneRoot}`,
    ].join("\n");
  } catch (error) {
    return [
      `Equation: ${equation}`,
      "Step 1: Move x terms to one side",
      "Step 2: Move numbers to the other side",
      "Step 3: Divide to isolate x",
      `Answer: ${currentOptions.correctLabel}`,
    ].join("\n");
  }
}

function initHistoryPracticeIfNeeded() {
  if (equationInput.value.trim()) {
    return;
  }

  const queue = buildHistoryPracticeQueue();
  if (!queue.length) {
    return;
  }

  historyPracticeQueue = queue;
  historyPracticeIndex = 0;
  isHistoryPractice = true;
  equationInput.value = historyPracticeQueue[0];
  generateQuizForEquation(historyPracticeQueue[0]);
}

function buildHistoryPracticeQueue() {
  if (!window.BotbyRecentHistory || typeof window.BotbyRecentHistory.getPracticeAttempts !== "function") {
    return [];
  }

  const attempts = window.BotbyRecentHistory.getPracticeAttempts();
  const statsByEquation = new Map();

  attempts.forEach((entry) => {
    const equation = String(entry && entry.equation ? entry.equation : "").trim();
    if (!equation) {
      return;
    }

    if (!statsByEquation.has(equation)) {
      statsByEquation.set(equation, { equation, seen: 0, wrong: 0, right: 0, recentAt: 0 });
    }

    const stat = statsByEquation.get(equation);
    stat.seen += 1;
    stat.recentAt = Math.max(stat.recentAt, Number(entry.createdAt || 0));

    if (entry.source === "quiz") {
      if (entry.wasCorrect === false) {
        stat.wrong += 1;
      } else if (entry.wasCorrect === true) {
        stat.right += 1;
      }
    }
  });

  const ranked = Array.from(statsByEquation.values())
    .map((stat) => {
      const score = stat.wrong * 6 + stat.seen * 1.2 - stat.right * 2 + stat.recentAt / 1e13;
      return { equation: stat.equation, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => item.equation);

  const solvable = [];
  ranked.forEach((equation) => {
    try {
      const result = solveLinearEquation(equation);
      if (result.type === "one" || result.type === "two") {
        solvable.push(equation);
      }
    } catch (error) {
      // Ignore non-solvable expressions from history.
    }
  });

  return solvable.slice(0, 20);
}

function goToNextHistoryEquation() {
  if (!historyPracticeQueue.length) {
    return;
  }

  const nextIndex = historyPracticeIndex + 1;
  if (nextIndex >= historyPracticeQueue.length) {
    isHistoryPractice = false;
    return;
  }

  historyPracticeIndex = nextIndex;
  const nextEquation = historyPracticeQueue[nextIndex];

  setTimeout(() => {
    equationInput.value = nextEquation;
    generateQuizForEquation(nextEquation);
  }, 700);
}

function restoreRecentQuiz() {
  if (!window.BotbyRecentHistory) {
    return;
  }

  const recentId = new URLSearchParams(window.location.search).get("recent");
  if (!recentId) {
    return;
  }

  const entry = window.BotbyRecentHistory.getById(recentId);
  if (!entry || entry.kind !== "quiz") {
    return;
  }

  equationInput.value = entry.equation || "";
  generateQuizForEquation(entry.equation || "");
}

function buildOptions(result) {
  if (result.type === "one") {
    const correct = normalizeNumber(result.value);
    const wrongAnswers = generateWrongAnswers(correct, 2);
    const correctLabel = `x = ${formatNumber(correct)}`;
    const choices = shuffle([
      { label: correctLabel, correct: true },
      { label: `x = ${formatNumber(wrongAnswers[0])}`, correct: false },
      { label: `x = ${formatNumber(wrongAnswers[1])}`, correct: false },
    ]);
    choices.correctLabel = correctLabel;
    return choices;
  }

  const [r1, r2] = [...result.values]
    .map((value) => normalizeNumber(value))
    .sort((a, b) => a - b);

  const correctLabel = makePairLabel(r1, r2);
  const wrongPairLabels = generateWrongPairLabels(r1, r2, correctLabel, 2);
  const choices = shuffle([
    { label: correctLabel, correct: true },
    { label: wrongPairLabels[0], correct: false },
    { label: wrongPairLabels[1], correct: false },
  ]);
  choices.correctLabel = correctLabel;
  return choices;
}

function generateWrongPairLabels(r1, r2, correctLabel, count) {
  const wrongLabels = new Set();

  while (wrongLabels.size < count) {
    const offsetA = pick([1, -1, 2, -2, 0.5, -0.5]);
    const offsetB = pick([1, -1, 2, -2, 0.5, -0.5]);

    const a = normalizeNumber(r1 + offsetA);
    const b = normalizeNumber(r2 + offsetB);
    const label = makePairLabel(a, b);

    if (label !== correctLabel) {
      wrongLabels.add(label);
    }
  }

  return [...wrongLabels];
}

function makePairLabel(a, b) {
  const sorted = [a, b].sort((x, y) => x - y);
  return `x = ${formatNumber(sorted[0])} ${window.t("solver.orSep")} x = ${formatNumber(sorted[1])}`;
}

function saveRecentQuiz(equation, result) {
  if (!window.BotbyRecentHistory) {
    return;
  }

  window.BotbyRecentHistory.add({
    kind: "quiz",
    equation,
    resultType: result.type,
    value: typeof result.value === "number" ? result.value : undefined,
    values: Array.isArray(result.values) ? result.values : undefined,
  });
}

function savePracticeAttempt(equation, result, wasCorrect, selectedAnswer) {
  if (!window.BotbyRecentHistory || typeof window.BotbyRecentHistory.addPracticeAttempt !== "function") {
    return;
  }

  const now = Date.now();
  const durationMs = Math.max(0, now - quizTaskStartedAt);

  window.BotbyRecentHistory.addPracticeAttempt({
    equation,
    source: "quiz",
    resultType: result && result.type ? result.type : "none",
    wasCorrect,
    selectedAnswer: selectedAnswer || "",
    durationMs,
  });

  if (wasCorrect === true) {
    quizTaskStartedAt = now;
  }
}

function showFeedback(text, isError) {
  quizFeedback.textContent = text;
  quizFeedback.classList.remove("success", "error");
  quizFeedback.classList.toggle("is-visible", Boolean(text && text.trim()));
  quizFeedback.classList.add(isError ? "error" : "success");
}

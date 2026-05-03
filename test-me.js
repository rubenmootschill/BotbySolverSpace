const testMeBtn = document.getElementById("testMeBtn");
const testMeQuestion = document.getElementById("testMeQuestion");
const testMeChoices = document.getElementById("testMeChoices");
const testMeFeedback = document.getElementById("testMeFeedback");
const testMeHint = document.getElementById("testMeHint");
const testMeProgressFill = document.getElementById("testMeProgressFill");
const testmeTutorialBtn = document.getElementById("testmeTutorialBtn");
const testmeTutorialModal = document.getElementById("testmeTutorialModal");
const testmeTutorialCloseBtn = document.getElementById("testmeTutorialCloseBtn");

let selectedChoiceIndex = -1;
let currentOptions = [];
let currentEquation = "";
let currentResult = null;
let hasSubmittedAnswer = false;
let queue = [];
let queueIndex = 0;
let testMeTaskStartedAt = Date.now();

if (testmeTutorialBtn && testmeTutorialModal && testmeTutorialCloseBtn) {
  testmeTutorialBtn.addEventListener("click", openTestmeTutorialModal);
  testmeTutorialCloseBtn.addEventListener("click", closeTestmeTutorialModal);
  testmeTutorialModal.addEventListener("click", (event) => {
    if (event.target === testmeTutorialModal) {
      closeTestmeTutorialModal();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && testmeTutorialModal && !testmeTutorialModal.hidden) {
    closeTestmeTutorialModal();
  }
});

function openTestmeTutorialModal() {
  if (!testmeTutorialModal || !testmeTutorialCloseBtn) {
    return;
  }
  testmeTutorialModal.hidden = false;
  testmeTutorialCloseBtn.focus();
}

function closeTestmeTutorialModal() {
  if (!testmeTutorialModal || !testmeTutorialBtn) {
    return;
  }
  testmeTutorialModal.hidden = true;
  testmeTutorialBtn.focus();
}

testMeBtn.disabled = true;

function showFeedback(text, isError) {
  testMeFeedback.textContent = text;
  testMeFeedback.classList.remove("success", "error");
  testMeFeedback.classList.toggle("is-visible", Boolean(text && text.trim()));
  testMeFeedback.classList.add(isError ? "error" : "success");
}

function resetQuestionState() {
  selectedChoiceIndex = -1;
  currentOptions = [];
  currentEquation = "";
  currentResult = null;
  hasSubmittedAnswer = false;
  testMeBtn.disabled = true;
}

function updateProgress() {
  if (!testMeProgressFill) {
    return;
  }

  if (!queue.length) {
    testMeProgressFill.style.width = "0%";
    return;
  }

  const ratio = Math.min(1, Math.max(0, (queueIndex + 1) / queue.length));
  testMeProgressFill.style.width = `${Math.round(ratio * 100)}%`;
}

function getHistoryQueue() {
  if (!window.BotbyRecentHistory || typeof window.BotbyRecentHistory.getPracticeAttempts !== "function") {
    return [];
  }

  const attempts = window.BotbyRecentHistory.getPracticeAttempts();
  const byEquation = new Map();

  attempts.forEach((entry) => {
    const equation = String(entry && entry.equation ? entry.equation : "").trim();
    if (!equation) {
      return;
    }

    if (!byEquation.has(equation)) {
      byEquation.set(equation, {
        equation,
        seen: 0,
        wrong: 0,
        right: 0,
        recentAt: 0,
      });
    }

    const stat = byEquation.get(equation);
    stat.seen += 1;
    stat.recentAt = Math.max(stat.recentAt, Number(entry.createdAt || 0));

    if (entry.wasCorrect === false) {
      stat.wrong += 1;
    } else if (entry.wasCorrect === true) {
      stat.right += 1;
    }
  });

  const ranked = Array.from(byEquation.values())
    .map((stat) => {
      const score = stat.wrong * 8 + stat.seen * 1.2 - stat.right * 2 + stat.recentAt / 1e13;
      return {
        equation: stat.equation,
        score,
      };
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
      // Ignore unsupported expressions from history.
    }
  });

  return solvable.slice(0, 30);
}

function makePairLabel(a, b) {
  const sorted = [a, b].sort((x, y) => x - y);
  return `x = ${formatNumber(sorted[0])} ${window.t("solver.orSep")} x = ${formatNumber(sorted[1])}`;
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

function savePracticeAttempt(equation, result, wasCorrect, selectedAnswer) {
  if (!window.BotbyRecentHistory || typeof window.BotbyRecentHistory.addPracticeAttempt !== "function") {
    return;
  }

  const now = Date.now();
  const durationMs = Math.max(0, now - testMeTaskStartedAt);

  window.BotbyRecentHistory.addPracticeAttempt({
    equation,
    source: "testme",
    resultType: result && result.type ? result.type : "none",
    wasCorrect,
    selectedAnswer: selectedAnswer || "",
    durationMs,
  });
}

function renderEquation(equation) {
  let result;
  try {
    result = solveLinearEquation(equation);
  } catch (error) {
    return false;
  }

  if (result.type !== "one" && result.type !== "two") {
    return false;
  }

  const options = buildOptions(result);

  currentEquation = equation;
  currentResult = result;
  currentOptions = options;
  selectedChoiceIndex = -1;
  hasSubmittedAnswer = false;
  testMeBtn.disabled = true;
  testMeTaskStartedAt = Date.now();

  testMeQuestion.textContent = equation;
  testMeChoices.innerHTML = "";

  options.forEach((option, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice-btn";
    btn.textContent = option.label;

    btn.addEventListener("click", () => {
      if (hasSubmittedAnswer) {
        return;
      }

      selectedChoiceIndex = index;
      testMeBtn.disabled = false;

      const buttons = [...testMeChoices.querySelectorAll("button")];
      buttons.forEach((choiceBtn, choiceIndex) => {
        choiceBtn.classList.toggle("choice-selected", choiceIndex === selectedChoiceIndex);
      });
    });

    testMeChoices.appendChild(btn);
  });

  showFeedback(window.t("quiz.chooseOne"), false);
  updateProgress();
  return true;
}

function goToNextQuestion() {
  queueIndex += 1;

  while (queueIndex < queue.length) {
    if (renderEquation(queue[queueIndex])) {
      return;
    }
    queueIndex += 1;
  }

  resetQuestionState();
  testMeQuestion.textContent = window.t("testme.done");
  testMeChoices.innerHTML = "";
  testMeBtn.disabled = true;
  testMeHint.textContent = window.t("testme.doneHint");
  showFeedback(window.t("testme.doneHint"), false);
  updateProgress();
}

function submitAnswer() {
  if (hasSubmittedAnswer || selectedChoiceIndex < 0 || !currentOptions.length) {
    return;
  }

  const buttons = [...testMeChoices.querySelectorAll("button")];
  const selectedOption = currentOptions[selectedChoiceIndex];
  const correctBtn = buttons.find((button) => button.textContent === currentOptions.correctLabel);

  hasSubmittedAnswer = true;
  testMeBtn.disabled = true;

  buttons.forEach((button) => {
    button.disabled = true;
    button.classList.remove("choice-selected");
  });

  if (selectedOption && selectedOption.correct) {
    if (buttons[selectedChoiceIndex]) {
      buttons[selectedChoiceIndex].classList.add("choice-correct");
    }
    savePracticeAttempt(currentEquation, currentResult, true, selectedOption.label);
    showFeedback(window.t("quiz.correct"), false);
  } else {
    if (buttons[selectedChoiceIndex]) {
      buttons[selectedChoiceIndex].classList.add("choice-wrong");
    }
    if (correctBtn) {
      correctBtn.classList.add("choice-correct");
    }
    savePracticeAttempt(currentEquation, currentResult, false, selectedOption ? selectedOption.label : "");
    showFeedback(window.t("quiz.wrong"), true);
  }

  setTimeout(goToNextQuestion, 700);
}

function initTestMe() {
  queue = getHistoryQueue();
  queueIndex = 0;

  if (!queue.length) {
    resetQuestionState();
    testMeQuestion.textContent = window.t("testme.noHistory");
    testMeChoices.innerHTML = "";
    testMeHint.textContent = window.t("testme.noHistoryHint");
    showFeedback(window.t("testme.noHistoryHint"), true);
    updateProgress();
    return;
  }

  testMeHint.textContent = window.t("testme.help");
  renderEquation(queue[queueIndex]);
}

testMeBtn.addEventListener("click", submitAnswer);
document.addEventListener("langchange", initTestMe);

initTestMe();

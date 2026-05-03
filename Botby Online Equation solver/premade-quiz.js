const premadeQuestionText = document.getElementById("premadeQuestionText");
const premadeChoices = document.getElementById("premadeChoices");
const premadeSubmitBtn = document.getElementById("premadeSubmitBtn");
const premadeNextBtn = document.getElementById("premadeNextBtn");
const premadeFeedback = document.getElementById("premadeFeedback");
const premadeQuestionCount = document.getElementById("premadeQuestionCount");
const premadeScore = document.getElementById("premadeScore");
const premadeProgressFill = document.getElementById("premadeProgressFill");
const premadeProgressBar = document.getElementById("premadeProgressBar");
const premadeTopic = document.getElementById("premadeTopic");
const premadeTopicChooser = document.getElementById("premadeTopicChooser");
const premadeQuizPanel = document.getElementById("premadeQuizPanel");
const premadeTopicCards = document.querySelectorAll(".premade-topic-card");
const premadeDifficultyModal = document.getElementById("premadeDifficultyModal");
const premadeDifficultyCancel = document.getElementById("premadeDifficultyCancel");

const QUIZ_LENGTH = 10;

let currentIndex = 0;
let selectedIndex = -1;
let score = 0;
let answeredCurrent = false;
let activeQuestions = [];
let selectedTopic = "all";
let selectedDifficulty = "medium";
let pendingTopicForMode = null;

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

function uniqueByQuestion(items) {
  const seen = new Set();
  const unique = [];

  items.forEach((item) => {
    const key = String(item && item.question ? item.question : "").trim().toLowerCase();
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    unique.push(item);
  });

  return unique;
}

function difficultyLabel(level) {
  if (level === "easy") return "Easy";
  if (level === "hard") return "Hard";
  return "Medium";
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

function makeLinearQuestion(difficulty, used) {
  let question = "";
  let solution = 0;
  let explain = "";

  for (let tries = 0; tries < 60; tries += 1) {
    if (difficulty === "easy") {
      solution = randInt(-9, 12);
      const mode = randInt(1, 4);
      if (mode === 1) {
        const b = randInt(2, 12);
        question = `x + ${b} = ${solution + b}`;
        explain = `Subtract ${b} from both sides.`;
      } else if (mode === 2) {
        const b = randInt(2, 12);
        question = `x - ${b} = ${solution - b}`;
        explain = `Add ${b} to both sides.`;
      } else if (mode === 3) {
        const a = randInt(2, 9);
        question = `${a}x = ${a * solution}`;
        explain = `Divide both sides by ${a}.`;
      } else {
        const a = randInt(2, 4);
        const b = randInt(1, 8);
        const rhs = a * solution + b;
        question = `${a}x + ${b} = ${rhs}`;
        explain = `Subtract ${b}, then divide by ${a}.`;
      }
    } else if (difficulty === "medium") {
      solution = randInt(-9, 12);
      const a = randInt(2, 9);
      const b = randInt(-12, 12);
      const rhs = a * solution + b;
      if (b >= 0) {
        question = `${a}x + ${b} = ${rhs}`;
        explain = `Subtract ${b}, then divide by ${a}.`;
      } else {
        question = `${a}x - ${Math.abs(b)} = ${rhs}`;
        explain = `Add ${Math.abs(b)}, then divide by ${a}.`;
      }
    } else {
      solution = randInt(-9, 12);
      const a = randInt(2, 6);
      const b = randInt(1, 10);
      const c = a * (solution - b);
      question = `${a}(x - ${b}) = ${c}`;
      explain = `Divide by ${a}, then add ${b}.`;
    }

    if (!used.has(question)) {
      used.add(question);
      const choicePack = linearChoices(solution);
      return {
        topic: "linear",
        question,
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

function buildQuizSet(topic, difficulty) {
  const used = new Set();
  const questions = [];

  while (questions.length < QUIZ_LENGTH) {
    let item = null;
    if (topic === "linear") {
      item = makeLinearQuestion(difficulty, used);
    } else if (topic === "quadratic") {
      item = makeQuadraticQuestion(difficulty, used);
    } else {
      const chooseLinear = questions.length % 2 === 0;
      item = chooseLinear
        ? makeLinearQuestion(difficulty, used)
        : makeQuadraticQuestion(difficulty, used);
      if (!item) {
        item = chooseLinear
          ? makeQuadraticQuestion(difficulty, used)
          : makeLinearQuestion(difficulty, used);
      }
    }

    if (!item) {
      break;
    }

    questions.push(item);
  }

  return shuffleArray(uniqueByQuestion(questions));
}

function applyTopicFilter(topic, difficulty) {
  selectedTopic = topic;
  selectedDifficulty = difficulty || selectedDifficulty;
  activeQuestions = buildQuizSet(topic, selectedDifficulty);

  currentIndex = 0;
  score = 0;
  premadeScore.textContent = "Score: 0";

  renderQuestion();
}

function startQuizForTopic(topic, difficulty) {
  if (premadeTopic) {
    premadeTopic.value = topic;
  }

  if (premadeTopicChooser) {
    premadeTopicChooser.hidden = true;
  }

  if (premadeQuizPanel) {
    premadeQuizPanel.hidden = false;
  }

  applyTopicFilter(topic, difficulty);
}

function openDifficultyModal(topic) {
  pendingTopicForMode = topic;
  if (premadeDifficultyModal) {
    premadeDifficultyModal.hidden = false;
  }
}

function closeDifficultyModal() {
  if (premadeDifficultyModal) {
    premadeDifficultyModal.hidden = true;
  }
  pendingTopicForMode = null;
}

function pickDifficulty(level) {
  const topic = pendingTopicForMode || "all";
  if (premadeDifficultyModal) {
    premadeDifficultyModal.hidden = true;
  }
  pendingTopicForMode = null;
  startQuizForTopic(topic, level);
}

function renderQuestion() {
  if (!activeQuestions.length) {
    premadeQuestionCount.textContent = "Question 0 / 0";
    premadeQuestionText.textContent = "No quiz available for this topic yet.";
    premadeChoices.innerHTML = "";
    premadeSubmitBtn.disabled = true;
    premadeNextBtn.disabled = true;
    showPremadeFeedback("Try another topic.", false);
    updateProgress();
    return;
  }

  const item = activeQuestions[currentIndex];
  selectedIndex = -1;
  answeredCurrent = false;

  premadeQuestionCount.textContent = `${difficultyLabel(selectedDifficulty)} - Question ${currentIndex + 1} / ${activeQuestions.length}`;
  premadeQuestionText.textContent = item.question;
  premadeChoices.innerHTML = "";
  premadeSubmitBtn.disabled = true;
  premadeNextBtn.disabled = true;
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
    showPremadeFeedback(`Correct! ${item.explain}`, false);
  } else {
    showPremadeFeedback(`Not quite. ${item.explain}`, true);
  }

  premadeScore.textContent = `Score: ${score}`;
  premadeNextBtn.disabled = false;
}

function nextQuestion() {
  if (currentIndex < activeQuestions.length - 1) {
    currentIndex += 1;
    renderQuestion();
    return;
  }

  premadeQuestionText.textContent = "Quiz finished!";
  premadeChoices.innerHTML = "";
  premadeSubmitBtn.disabled = true;
  premadeNextBtn.disabled = true;
  showPremadeFeedback(`You got ${score} out of ${activeQuestions.length}. Great effort!`, false);
  updateProgress(true);
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

premadeSubmitBtn.addEventListener("click", checkAnswer);
premadeNextBtn.addEventListener("click", nextQuestion);

if (premadeTopic) {
  premadeTopic.addEventListener("change", () => {
    applyTopicFilter(premadeTopic.value, selectedDifficulty);
  });
}

premadeTopicCards.forEach((card) => {
  card.addEventListener("click", () => {
    const topic = card.getAttribute("data-topic") || "all";
    openDifficultyModal(topic);
  });
});

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
  premadeDifficultyCancel.addEventListener("click", closeDifficultyModal);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && premadeDifficultyModal && !premadeDifficultyModal.hidden) {
    closeDifficultyModal();
  }
});

(function () {
  var STORAGE_KEY = "botby-recent-activity";
  var LEARNING_KEY = "botby-learning-attempts";
  var MAX_ITEMS = 8;
  var MAX_LEARNING_ITEMS = 220;

  function readItems() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }

      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeItems(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
    } catch (error) {
      // Ignore storage failures silently so solving still works.
    }
  }

  function readLearningItems() {
    try {
      var raw = localStorage.getItem(LEARNING_KEY);
      if (!raw) {
        return [];
      }

      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeLearningItems(items) {
    try {
      localStorage.setItem(LEARNING_KEY, JSON.stringify(items.slice(0, MAX_LEARNING_ITEMS)));
    } catch (error) {
      // Ignore storage failures silently so solving still works.
    }
  }

  function normalizeAttempt(entry) {
    var equation = String(entry.equation || "").trim();
    var durationMs = Number(entry.durationMs);
    return {
      equation: equation,
      source: entry.source === "linear"
        ? "linear"
        : entry.source === "quiz"
          ? "quiz"
          : entry.source === "testme"
            ? "testme"
            : entry.source === "balance"
              ? "balance"
              : entry.source === "quadratic"
                ? "quadratic"
                : entry.source === "fraction"
                  ? "fraction"
                  : entry.source === "percentage"
                    ? "percentage"
                    : "solver",
      resultType: entry.resultType || "none",
      wasCorrect: typeof entry.wasCorrect === "boolean" ? entry.wasCorrect : null,
      selectedAnswer: typeof entry.selectedAnswer === "string" ? entry.selectedAnswer : "",
      durationMs: Number.isFinite(durationMs) && durationMs >= 0 ? durationMs : null,
      createdAt: typeof entry.createdAt === "number" ? entry.createdAt : Date.now()
    };
  }

  function normalizeEntry(entry) {
    var normalized = {
      kind: entry.kind === "quiz" ? "quiz" : "solver",
      equation: String(entry.equation || "").trim(),
      resultType: entry.resultType || "none",
      savedAt: typeof entry.savedAt === "number" ? entry.savedAt : Date.now(),
      href: typeof entry.href === "string" && entry.href.length > 0
        ? entry.href
        : (entry.kind === "quiz" ? "quiz.html" : "solver.html")
    };

    if (typeof entry.value === "number") {
      normalized.value = entry.value;
    }

    if (Array.isArray(entry.values)) {
      normalized.values = entry.values.filter(function (value) {
        return typeof value === "number";
      });
    }

    return normalized;
  }

  function isSameEntry(left, right) {
    if (!left || !right) {
      return false;
    }

    if (left.kind !== right.kind || left.equation !== right.equation || left.resultType !== right.resultType) {
      return false;
    }

    if (typeof left.value === "number" || typeof right.value === "number") {
      return left.value === right.value;
    }

    var leftValues = Array.isArray(left.values) ? left.values.join("|") : "";
    var rightValues = Array.isArray(right.values) ? right.values.join("|") : "";
    return leftValues === rightValues;
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) {
      return String(value);
    }

    var roundedInt = Math.round(value);
    if (Math.abs(value - roundedInt) < 1e-8) {
      return String(roundedInt);
    }

    return String(Number(value.toFixed(6)));
  }

  function t(key, fallback) {
    if (typeof window.t === "function") {
      return window.t(key);
    }

    return fallback;
  }

  function formatResult(entry) {
    if (!entry) {
      return "";
    }

    if (entry.resultType === "one" && typeof entry.value === "number") {
      return "x = " + formatNumber(entry.value);
    }

    if (entry.resultType === "two" && Array.isArray(entry.values) && entry.values.length >= 2) {
      var values = entry.values.slice().sort(function (a, b) {
        return a - b;
      });
      return "x = " + formatNumber(values[0]) + " " + t("solver.orSep", "or") + " x = " + formatNumber(values[1]);
    }

    if (entry.resultType === "infinite") {
      return t("solver.infinite", "Infinite solutions (both sides are equal).");
    }

    return t("solver.noSolution", "No solution (contradiction).");
  }

  function getTag(entry) {
    if (!entry) {
      return "";
    }

    return entry.kind === "quiz"
      ? t("nav.quiz", "Quiz")
      : t("nav.solver", "Solver");
  }

  window.BotbyRecentHistory = {
    add: function (entry) {
      var normalized = normalizeEntry(entry);
      if (!normalized.equation) {
        return;
      }

      var items = readItems().filter(function (item) {
        return !isSameEntry(item, normalized);
      });
      items.unshift(normalized);
      writeItems(items);
    },

    getAll: function () {
      return readItems();
    },

    getById: function (id) {
      return readItems().find(function (item) {
        return String(item.savedAt) === String(id);
      }) || null;
    },

    toResult: function (entry) {
      if (!entry) {
        return null;
      }

      if (entry.resultType === "one") {
        return { type: "one", value: entry.value };
      }

      if (entry.resultType === "two") {
        return { type: "two", values: Array.isArray(entry.values) ? entry.values.slice() : [] };
      }

      if (entry.resultType === "infinite") {
        return { type: "infinite" };
      }

      return { type: "none" };
    },

    addPracticeAttempt: function (entry) {
      var normalized = normalizeAttempt(entry);
      if (!normalized.equation) {
        return;
      }

      var items = readLearningItems();
      items.unshift(normalized);
      writeLearningItems(items);
    },

    getPracticeAttempts: function () {
      return readLearningItems();
    },

    formatResult: formatResult,
    getTag: getTag,
    formatNumber: formatNumber
  };
})();

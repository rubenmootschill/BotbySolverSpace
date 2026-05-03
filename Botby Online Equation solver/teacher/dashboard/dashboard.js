(function () {
  'use strict';

  var pinInput = document.getElementById('teacherPinInput');
  var pinBtn = document.getElementById('teacherPinBtn');
  var pinMsg = document.getElementById('teacherPinMsg');
  var loginPanel = document.getElementById('teacherLoginPanel');
  var dashContent = document.getElementById('teacherDashContent');
  var logoutBtn = document.getElementById('teacherLogoutBtn');
  var clearBtn = document.getElementById('teacherClearBtn');
  var clearModal = document.getElementById('teacherClearModal');
  var clearPinInput = document.getElementById('teacherClearPinInput');
  var clearPinMsg = document.getElementById('teacherClearPinMsg');
  var clearConfirmBtn = document.getElementById('teacherClearConfirmBtn');
  var clearCancelBtn = document.getElementById('teacherClearCancelBtn');
  var sourceFilter = document.getElementById('teacherSourceFilter');

  var summaryEl = document.getElementById('teacherHistorySummary');
  var attemptsEl = document.getElementById('teacherHistoryAttempts');
  var equationsEl = document.getElementById('teacherHistoryEquations');

  var AUTH_KEY = 'botby-teacher-auth';
  var PIN_KEY = 'botby-teacher-pin';
  var DEFAULT_PIN = '678967252';

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sourceLabel(source) {
    if (source === 'balance') return 'Balance';
    if (source === 'quiz') return 'Quiz';
    if (source === 'testme') return 'Test Me';
    if (source === 'linear') return 'Linear';
    if (source === 'quadratic') return 'Quadratic';
    if (source === 'fraction') return 'Fractions';
    if (source === 'percentage') return 'Percentage';
    return 'Solver';
  }

  function statusLabel(attempt) {
    if (attempt.wasCorrect === true) return '<span class="teacher-status-right">Right</span>';
    if (attempt.wasCorrect === false) return '<span class="teacher-status-wrong">Wrong</span>';
    return '<span class="teacher-status-na">N/A</span>';
  }

  function formatDurationHms(durationMs) {
    if (!Number.isFinite(durationMs) || durationMs < 0) return '-';

    var totalSeconds = Math.floor(durationMs / 1000);
    var hours = Math.floor(totalSeconds / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;

    var hh = hours < 10 ? '0' + hours : String(hours);
    var mm = minutes < 10 ? '0' + minutes : String(minutes);
    var ss = seconds < 10 ? '0' + seconds : String(seconds);
    return hh + ':' + mm + ':' + ss;
  }

  function groupAttempts(attempts, maxGroups) {
    var grouped = [];
    var byKey = {};

    for (var i = 0; i < attempts.length; i++) {
      var entry = attempts[i] || {};
      var eq = String(entry.equation || '').trim() || '(empty)';
      var source = String(entry.source || 'solver');
      var key = source + '||' + eq;
      var durationMs = Number(entry.durationMs);

      if (!byKey[key]) {
        var group = {
          source: source,
          equation: eq,
          latestCreatedAt: Number(entry.createdAt) || 0,
          durationTotalMs: 0,
          attempts: 0,
          right: 0,
          wrong: 0
        };

        byKey[key] = group;
        grouped.push(group);
      }

      var target = byKey[key];
      target.attempts += 1;
      target.latestCreatedAt = Math.max(target.latestCreatedAt, Number(entry.createdAt) || 0);
      if (Number.isFinite(durationMs) && durationMs >= 0) {
        target.durationTotalMs += durationMs;
      }
      if (entry.wasCorrect === true) target.right += 1;
      if (entry.wasCorrect === false) target.wrong += 1;
    }

    if (typeof maxGroups === 'number' && maxGroups > 0) {
      return grouped.slice(0, maxGroups);
    }

    return grouped;
  }

  function expectedPin() {
    try {
      return localStorage.getItem(PIN_KEY) || DEFAULT_PIN;
    } catch (error) {
      return DEFAULT_PIN;
    }
  }

  function setAuthenticated(isAuth) {
    try {
      if (isAuth) sessionStorage.setItem(AUTH_KEY, '1');
      else sessionStorage.removeItem(AUTH_KEY);
    } catch (error) {
      // ignore storage issues
    }
  }

  function isAuthenticated() {
    try {
      return sessionStorage.getItem(AUTH_KEY) === '1';
    } catch (error) {
      return false;
    }
  }

  function showDash() {
    loginPanel.hidden = true;
    dashContent.hidden = false;
    renderHistory();
  }

  function showLogin() {
    loginPanel.hidden = false;
    dashContent.hidden = true;
    pinInput.value = '';
  }

  function renderHistory() {
    if (!summaryEl || !attemptsEl || !equationsEl) return;

    var filter = sourceFilter ? sourceFilter.value : 'all';
    var attempts = [];
    if (window.BotbyRecentHistory && typeof window.BotbyRecentHistory.getPracticeAttempts === 'function') {
      attempts = window.BotbyRecentHistory.getPracticeAttempts();
    }

    if (filter !== 'all') {
      attempts = attempts.filter(function (entry) {
        return entry && entry.source === filter;
      });
    }

    var total = attempts.length;
    var right = 0;
    var wrong = 0;
    var durationTotalMs = 0;
    var durationCount = 0;
    var byEq = {};

    for (var i = 0; i < attempts.length; i++) {
      var a = attempts[i] || {};
      if (a.wasCorrect === true) right += 1;
      if (a.wasCorrect === false) wrong += 1;

      var durationMs = Number(a.durationMs);
      if (Number.isFinite(durationMs) && durationMs >= 0) {
        durationTotalMs += durationMs;
        durationCount += 1;
      }

      var eq = String(a.equation || '').trim() || '(empty)';
      if (!byEq[eq]) byEq[eq] = { total: 0, right: 0, wrong: 0, recentAt: 0 };
      byEq[eq].total += 1;
      if (a.wasCorrect === true) byEq[eq].right += 1;
      if (a.wasCorrect === false) byEq[eq].wrong += 1;
      byEq[eq].recentAt = Math.max(byEq[eq].recentAt, Number(a.createdAt || 0));
    }

    var accuracy = total ? Math.round((right / total) * 100) + '%' : '0%';
    var avgDurationMs = durationCount ? durationTotalMs / durationCount : NaN;
    var avgDurationLabel = formatDurationHms(avgDurationMs);
    summaryEl.innerHTML = '' +
      '<div class="teacher-stat"><span class="teacher-stat-label">Student Attempts</span><span class="teacher-stat-value">' + total + '</span></div>' +
      '<div class="teacher-stat"><span class="teacher-stat-label">Right</span><span class="teacher-stat-value">' + right + '</span></div>' +
      '<div class="teacher-stat"><span class="teacher-stat-label">Wrong</span><span class="teacher-stat-value">' + wrong + '</span></div>' +
      '<div class="teacher-stat"><span class="teacher-stat-label">Accuracy</span><span class="teacher-stat-value">' + accuracy + '</span></div>' +
      '<div class="teacher-stat"><span class="teacher-stat-label">Avg Time</span><span class="teacher-stat-value">' + avgDurationLabel + '</span></div>';

    if (!attempts.length) {
      attemptsEl.innerHTML = '<div class="teacher-history-row">No attempts recorded for this filter.</div>';
      equationsEl.innerHTML = '<div class="teacher-history-row">No equation stats yet.</div>';
      return;
    }

    var attemptRows = '<div class="teacher-history-row teacher-history-row-attempts teacher-history-header"><span>Row #</span><span>Time</span><span>Took</span><span>Source</span><span>Equation</span><span>Attempts</span><span>Right</span><span>Wrong</span></div>';
    var groupedAttempts = groupAttempts(attempts.slice(0, 220), 80);
    for (var j = 0; j < groupedAttempts.length; j++) {
      var entry = groupedAttempts[j] || {};
      var dateLabel = Number(entry.latestCreatedAt)
        ? new Date(entry.latestCreatedAt).toLocaleString()
        : '-';
      attemptRows += '<div class="teacher-history-row teacher-history-row-attempts">' +
        '<span>' + (j + 1) + '</span>' +
        '<span>' + escapeHtml(dateLabel) + '</span>' +
        '<span>' + escapeHtml(formatDurationHms(Number(entry.durationTotalMs))) + '</span>' +
        '<span>' + escapeHtml(sourceLabel(entry.source)) + '</span>' +
        '<span>' + escapeHtml(entry.equation || '') + '</span>' +
        '<span>x' + entry.attempts + '</span>' +
        '<span class="teacher-status-right">' + entry.right + '</span>' +
        '<span class="teacher-status-wrong">' + entry.wrong + '</span>' +
        '</div>';
    }
    attemptsEl.innerHTML = attemptRows;

    var eqKeys = Object.keys(byEq).sort(function (a, b) {
      return byEq[b].recentAt - byEq[a].recentAt;
    });

    var eqRows = '<div class="teacher-history-row teacher-history-row-equations teacher-history-header"><span>Equation</span><span>Total</span><span>Right</span><span>Wrong</span></div>';
    for (var k = 0; k < eqKeys.length; k++) {
      var eqKey = eqKeys[k];
      var stat = byEq[eqKey];
      eqRows += '<div class="teacher-history-row teacher-history-row-equations">' +
        '<span>' + escapeHtml(eqKey) + '</span>' +
        '<span>' + stat.total + '</span>' +
        '<span class="teacher-status-right">' + stat.right + '</span>' +
        '<span class="teacher-status-wrong">' + stat.wrong + '</span>' +
        '</div>';
    }
    equationsEl.innerHTML = eqRows;
  }

  pinBtn.addEventListener('click', function () {
    var pin = String(pinInput.value || '').trim();
    if (!pin) {
      pinMsg.textContent = 'Enter the teacher PIN.';
      pinMsg.className = 'message error is-visible';
      return;
    }

    if (pin === expectedPin()) {
      setAuthenticated(true);
      pinMsg.textContent = '';
      pinMsg.className = 'message';
      showDash();
      return;
    }

    pinMsg.textContent = 'Wrong PIN.';
    pinMsg.className = 'message error is-visible';
  });

  pinInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') pinBtn.click();
  });

  logoutBtn.addEventListener('click', function () {
    setAuthenticated(false);
    showLogin();
  });

  function openClearModal() {
    if (!clearModal) return;
    clearPinInput.value = '';
    clearPinMsg.textContent = '';
    clearModal.hidden = false;
    clearPinInput.focus();
  }

  function closeClearModal() {
    if (!clearModal) return;
    clearModal.hidden = true;
    clearPinInput.value = '';
    clearPinMsg.textContent = '';
  }

  function executeClear() {
    var keysToRemove = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.startsWith('botby-')) keysToRemove.push(k);
    }
    keysToRemove.forEach(function (k) { localStorage.removeItem(k); });
    closeClearModal();
    renderHistory();
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', openClearModal);
  }

  if (clearCancelBtn) {
    clearCancelBtn.addEventListener('click', closeClearModal);
  }

  if (clearModal) {
    clearModal.addEventListener('click', function (e) {
      if (e.target === clearModal) closeClearModal();
    });
  }

  if (clearConfirmBtn) {
    clearConfirmBtn.addEventListener('click', function () {
      if (clearPinInput.value !== expectedPin()) {
        clearPinMsg.textContent = 'Incorrect PIN. Try again.';
        clearPinInput.value = '';
        clearPinInput.focus();
        return;
      }
      executeClear();
    });
  }

  if (clearPinInput) {
    clearPinInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') clearConfirmBtn.click();
      if (e.key === 'Escape') closeClearModal();
    });
  }

  sourceFilter.addEventListener('change', renderHistory);

  if (isAuthenticated()) showDash();
  else showLogin();
}());

// balance.js � Balance Scale visual solver
(function () {
  'use strict';

  var balEqInput = document.getElementById('balEqInput');
  var balBtn = document.getElementById('balBtn');
  var balMessage = document.getElementById('balMessage');
  var balViz = document.getElementById('balViz');
  var balEqDisplay = document.getElementById('balEqDisplay');
  var balBlocksLeft = document.getElementById('balBlocksLeft');
  var balBlocksRight = document.getElementById('balBlocksRight');
  var balBeamRow = document.getElementById('balBeamRow');
  var balPrev = document.getElementById('balPrev');
  var balNext = document.getElementById('balNext');
  var balStepLabel = document.getElementById('balStepLabel');
  var balStepDesc = document.getElementById('balStepDesc');
  var balAnswer = document.getElementById('balAnswer');
  var balPanDropLeft = document.getElementById('balPanDropLeft');
  var balPanDropRight = document.getElementById('balPanDropRight');
  var balChoiceGrid = document.getElementById('balChoiceGrid');
  var balSubmitBtn = document.getElementById('balSubmitBtn');
  var balChoiceFeedback = document.getElementById('balChoiceFeedback');
  var balanceTutorialBtn = document.getElementById('balanceTutorialBtn');
  var balanceTutorialModal = document.getElementById('balanceTutorialModal');
  var balanceTutorialCloseBtn = document.getElementById('balanceTutorialCloseBtn');

  var TILE_COUNT = 8;
  var choiceButtons = [];
  var selectedChoice = null;
  var correctChoice = null;
  var correctNumber = null;
  var placedLeft = [];
  var placedRight = [];
  var balanceTaskStartedAt = Date.now();

  balBtn.addEventListener('click', visualize);
  balEqInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') visualize();
  });
  balSubmitBtn.addEventListener('click', submitTileAnswer);

  bindPanDropZone(balPanDropLeft, 'left');
  bindPanDropZone(balPanDropRight, 'right');
  bindChoiceBankDropZone();

  if (balanceTutorialBtn && balanceTutorialModal && balanceTutorialCloseBtn) {
    balanceTutorialBtn.addEventListener('click', openBalanceTutorialModal);
    balanceTutorialCloseBtn.addEventListener('click', closeBalanceTutorialModal);
    balanceTutorialModal.addEventListener('click', function (event) {
      if (event.target === balanceTutorialModal) {
        closeBalanceTutorialModal();
      }
    });
  }

  document.addEventListener('langchange', function () {
    if (!balViz.hidden) {
      renderManualScaleState();
      refreshPanDropText();
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && balanceTutorialModal && !balanceTutorialModal.hidden) {
      closeBalanceTutorialModal();
    }
  });

  function openBalanceTutorialModal() {
    if (!balanceTutorialModal || !balanceTutorialCloseBtn) {
      return;
    }
    balanceTutorialModal.hidden = false;
    balanceTutorialCloseBtn.focus();
  }

  function closeBalanceTutorialModal() {
    if (!balanceTutorialModal || !balanceTutorialBtn) {
      return;
    }
    balanceTutorialModal.hidden = true;
    balanceTutorialBtn.focus();
  }

  function parseSide(s) {
    s = s.replace(/\s+/g, '').toLowerCase();
    if (!s) return null;
    var a = 0;
    var b = 0;
    var tokens = s.match(/[+-]?[^+-]+/g);
    if (!tokens) return null;

    for (var i = 0; i < tokens.length; i++) {
      var tok = tokens[i];
      if (tok.indexOf('x') !== -1) {
        var c = tok.replace('x', '');
        if (c === '' || c === '+') c = '1';
        else if (c === '-') c = '-1';
        var n = parseFloat(c);
        if (isNaN(n)) return null;
        a += n;
      } else {
        var v = parseFloat(tok);
        if (isNaN(v)) return null;
        b += v;
      }
    }

    return { a: a, b: b };
  }

  function fmtN(n) {
    return (typeof formatNumber === 'function') ? formatNumber(n) : String(n);
  }

  function visualize() {
    clearMessage();
    var eq = balEqInput.value.trim();
    if (!eq) return;

    var sides = eq.split('=');
    if (sides.length !== 2) {
      showMsg(window.t('balance.errFormat'), true);
      return;
    }

    var left = parseSide(sides[0]);
    var right = parseSide(sides[1]);
    if (!left || !right) {
      showMsg(window.t('balance.errParse'), true);
      return;
    }

    var A = left.a - right.a;
    var B = right.b - left.b;
    if (Math.abs(A) < 1e-12) {
      if (Math.abs(B) < 1e-12) showMsg(window.t('balance.errInfinite'), true);
      else showMsg(window.t('balance.errNoSolution'), true);
      return;
    }

    correctNumber = B / A;
    correctChoice = fmtN(correctNumber);

    balEqDisplay.textContent = eq;
    balViz.hidden = false;
    setupTileChoices(left, right, correctNumber);
    renderManualScaleState();
    balanceTaskStartedAt = Date.now();
  }

  function renderManualScaleState() {
    balBlocksLeft.innerHTML = '';
    balBlocksRight.innerHTML = '';
    balBeamRow.classList.remove('tilt-left', 'tilt-right');

    balPrev.disabled = true;
    balNext.disabled = true;
    balStepLabel.textContent = window.t('balance.manualStep');
    balStepDesc.textContent = window.t('balance.manualHint');
    balAnswer.hidden = true;
  }

  function setupTileChoices(left, right, solution) {
    selectedChoice = null;
    choiceButtons = [];
    placedLeft = [];
    placedRight = [];
    balChoiceGrid.innerHTML = '';
    balChoiceFeedback.textContent = '';
    balChoiceFeedback.className = 'message';
    balSubmitBtn.disabled = true;
    balAnswer.hidden = true;
    balPanDropLeft.className = 'balance-pan-drop';
    balPanDropRight.className = 'balance-pan-drop';
    refreshPanDropText();

    var raw = buildTileLabels(solution, left, right);
    for (var i = 0; i < raw.length; i++) {
      var label = raw[i];
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'balance-choice-btn';
      btn.textContent = label;
      btn.draggable = true;
      btn.addEventListener('click', onChoiceClick);
      btn.addEventListener('dragstart', onChoiceDragStart);
      balChoiceGrid.appendChild(btn);
      choiceButtons.push(btn);
    }
  }

  function buildTileLabels(solution, left, right) {
    var labels = [];
    var sol = Number(solution);

    labels.push('x', 'x', 'x', 'x');
    labels.push(fmtN(sol));

    var near = [
      sol - 3, sol - 2, sol - 1, sol + 1, sol + 2, sol + 3,
      left.a, right.a, left.b, right.b
    ];

    for (var i = 0; i < near.length; i++) {
      var n = near[i];
      if (typeof n === 'number' && isFinite(n)) labels.push(fmtN(n));
    }

    while (labels.length < TILE_COUNT) {
      var jitter = Math.floor(Math.random() * 12) - 5;
      labels.push(fmtN(sol + jitter));
    }

    labels = labels.slice(0, TILE_COUNT);
    return shuffleArray(labels);
  }

  function shuffleArray(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  function onChoiceClick(e) {
    var btn = e.currentTarget;
    selectChoiceValue(btn.textContent);
  }

  function onChoiceDragStart(e) {
    var btn = e.currentTarget;
    if (!e.dataTransfer) return;
    e.dataTransfer.setData('text/plain', btn.textContent);
    e.dataTransfer.setData('application/x-balance-source', 'bank');
    e.dataTransfer.effectAllowed = 'copy';
  }

  function onPanChipDragStart(e) {
    var chip = e.currentTarget;
    if (!e.dataTransfer) return;
    e.dataTransfer.setData('application/x-balance-source', 'pan');
    e.dataTransfer.setData('application/x-balance-side', chip.dataset.side);
    e.dataTransfer.setData('application/x-balance-index', chip.dataset.index);
    e.dataTransfer.setData('text/plain', chip.dataset.value);
    e.dataTransfer.effectAllowed = 'move';
  }

  function selectChoiceValue(value) {
    selectedChoice = value;
    for (var i = 0; i < choiceButtons.length; i++) {
      var isSelected = choiceButtons[i].textContent === value;
      choiceButtons[i].classList.toggle('is-selected', isSelected);
      choiceButtons[i].classList.remove('is-correct', 'is-wrong');
    }
    balChoiceFeedback.textContent = '';
    balChoiceFeedback.className = 'message';
  }

  function bindPanDropZone(zone, side) {
    zone.addEventListener('dragenter', function (e) {
      e.preventDefault();
      zone.classList.add('is-over');
    });
    zone.addEventListener('dragover', function (e) {
      e.preventDefault();
      zone.classList.add('is-over');
    });
    zone.addEventListener('dragleave', function () {
      zone.classList.remove('is-over');
    });
    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      zone.classList.remove('is-over');

      var source = e.dataTransfer ? e.dataTransfer.getData('application/x-balance-source') : '';
      if (source === 'pan') {
        var fromSide = e.dataTransfer.getData('application/x-balance-side');
        var fromIndex = parseInt(e.dataTransfer.getData('application/x-balance-index'), 10);
        var moved = pullTile(fromSide, fromIndex);
        if (moved !== null) placeOnSide(side, moved);
        return;
      }

      var raw = e.dataTransfer ? e.dataTransfer.getData('text/plain') : '';
      if (!raw) return;
      placeOnSide(side, raw);
    });
    zone.addEventListener('click', function (e) {
      if (e.target && e.target.classList && e.target.classList.contains('balance-pan-chip')) return;
      if (selectedChoice === null) return;
      placeOnSide(side, selectedChoice);
    });
  }

  function bindChoiceBankDropZone() {
    balChoiceGrid.addEventListener('dragenter', function (e) {
      e.preventDefault();
      balChoiceGrid.classList.add('is-over-back');
    });
    balChoiceGrid.addEventListener('dragover', function (e) {
      e.preventDefault();
      balChoiceGrid.classList.add('is-over-back');
    });
    balChoiceGrid.addEventListener('dragleave', function () {
      balChoiceGrid.classList.remove('is-over-back');
    });
    balChoiceGrid.addEventListener('drop', function (e) {
      e.preventDefault();
      balChoiceGrid.classList.remove('is-over-back');

      var source = e.dataTransfer ? e.dataTransfer.getData('application/x-balance-source') : '';
      if (source !== 'pan') return;

      var fromSide = e.dataTransfer.getData('application/x-balance-side');
      var fromIndex = parseInt(e.dataTransfer.getData('application/x-balance-index'), 10);
      pullTile(fromSide, fromIndex);
      refreshPanDropText();
      balSubmitBtn.disabled = !(placedLeft.length > 0 && placedRight.length > 0);
      balPanDropLeft.classList.remove('is-correct', 'is-wrong');
      balPanDropRight.classList.remove('is-correct', 'is-wrong');
      balChoiceFeedback.textContent = '';
      balChoiceFeedback.className = 'message';
      balAnswer.hidden = true;
    });
  }

  function placeOnSide(side, value) {
    if (side === 'left') placedLeft.push(value);
    if (side === 'right') placedRight.push(value);

    refreshPanDropText();
    updateBeamTilt();
    balSubmitBtn.disabled = !(placedLeft.length > 0 && placedRight.length > 0);
    balPanDropLeft.classList.remove('is-correct', 'is-wrong');
    balPanDropRight.classList.remove('is-correct', 'is-wrong');
    balChoiceFeedback.textContent = '';
    balChoiceFeedback.className = 'message';
    balAnswer.hidden = true;
  }

  function pullTile(side, index) {
    if (Number.isNaN(index) || index < 0) return null;
    if (side === 'left' && index < placedLeft.length) return placedLeft.splice(index, 1)[0];
    if (side === 'right' && index < placedRight.length) return placedRight.splice(index, 1)[0];
    return null;
  }

  function refreshPanDropText() {
    renderPanDropContent(balPanDropLeft, placedLeft, 'left', 'balance.dropLeft');
    renderPanDropContent(balPanDropRight, placedRight, 'right', 'balance.dropRight');
    balPanDropLeft.classList.toggle('has-choice', placedLeft.length > 0);
    balPanDropRight.classList.toggle('has-choice', placedRight.length > 0);
    updateBeamTilt();
  }

  function getTotalWeight(values, xValue) {
    var total = 0;
    for (var i = 0; i < values.length; i++) {
      var val = String(values[i]).trim();
      if (val.toLowerCase() === 'x') {
        if (Number.isFinite(xValue)) total += xValue;
      } else {
        var n = parseFloat(val);
        if (Number.isFinite(n)) total += n;
      }
    }
    return total;
  }

  function updateBeamTilt() {
    var leftWeight = getTotalWeight(placedLeft, correctNumber);
    var rightWeight = getTotalWeight(placedRight, correctNumber);
    
    balBeamRow.classList.remove('tilt-left', 'tilt-right');
    
    if (leftWeight > rightWeight) {
      balBeamRow.classList.add('tilt-left');
    } else if (rightWeight > leftWeight) {
      balBeamRow.classList.add('tilt-right');
    }
  }

  function renderPanDropContent(zone, values, side, emptyKey) {
    zone.innerHTML = '';
    if (!values.length) {
      var placeholder = document.createElement('span');
      placeholder.className = 'balance-pan-drop-placeholder';
      placeholder.textContent = window.t(emptyKey);
      zone.appendChild(placeholder);
      return;
    }

    for (var i = 0; i < values.length; i++) {
      var chip = document.createElement('span');
      chip.className = 'balance-pan-chip';
      chip.textContent = values[i];
      chip.draggable = true;
      chip.dataset.side = side;
      chip.dataset.index = String(i);
      chip.dataset.value = values[i];
      chip.addEventListener('dragstart', onPanChipDragStart);
      zone.appendChild(chip);
    }
  }

  function submitTileAnswer() {
    if (!placedLeft.length || !placedRight.length) {
      balChoiceFeedback.textContent = window.t('balance.placeBoth');
      balChoiceFeedback.className = 'message error';
      return;
    }

    var leftModel = modelFromTiles(placedLeft);
    var rightModel = modelFromTiles(placedRight);
    if (!leftModel || !rightModel) {
      balChoiceFeedback.textContent = window.t('balance.chooseOne');
      balChoiceFeedback.className = 'message error';
      return;
    }

    var A = leftModel.a - rightModel.a;
    var B = rightModel.b - leftModel.b;
    var ok = false;
    if (Math.abs(A) > 1e-12 && Number.isFinite(correctNumber)) {
      var x = B / A;
      ok = Math.abs(x - correctNumber) < 1e-9;
    }

    for (var i = 0; i < choiceButtons.length; i++) {
      choiceButtons[i].classList.remove('is-wrong', 'is-correct');
    }

    if (ok) {
      balPanDropLeft.classList.remove('is-wrong');
      balPanDropRight.classList.remove('is-wrong');
      balPanDropLeft.classList.add('is-correct');
      balPanDropRight.classList.add('is-correct');
      balChoiceFeedback.textContent = window.t('balance.correct');
      balChoiceFeedback.className = 'message';
      balAnswer.textContent = 'x = ' + correctChoice;
      balAnswer.hidden = false;
      saveBalancePracticeAttempt(true);
    } else {
      balPanDropLeft.classList.remove('is-correct');
      balPanDropRight.classList.remove('is-correct');
      balPanDropLeft.classList.add('is-wrong');
      balPanDropRight.classList.add('is-wrong');
      balChoiceFeedback.textContent = window.t('balance.wrong') + ' x = ' + correctChoice;
      balChoiceFeedback.className = 'message error';
      balAnswer.hidden = true;
      saveBalancePracticeAttempt(false);
    }
  }

  function saveBalancePracticeAttempt(wasCorrect) {
    if (!window.BotbyRecentHistory || typeof window.BotbyRecentHistory.addPracticeAttempt !== 'function') {
      return;
    }

    var equation = String(balEqInput && balEqInput.value ? balEqInput.value : '').trim();
    if (!equation) {
      return;
    }

    var selectedAnswer = placedLeft.join(' + ') + ' = ' + placedRight.join(' + ');
    var now = Date.now();
    var durationMs = Math.max(0, now - balanceTaskStartedAt);
    balanceTaskStartedAt = now;
    window.BotbyRecentHistory.addPracticeAttempt({
      equation: equation,
      source: 'balance',
      resultType: Number.isFinite(correctNumber) ? 'one' : 'none',
      wasCorrect: wasCorrect,
      selectedAnswer: selectedAnswer,
      durationMs: durationMs
    });
  }

  function modelFromTiles(values) {
    var out = { a: 0, b: 0 };
    for (var i = 0; i < values.length; i++) {
      var token = String(values[i]).trim().toLowerCase();
      if (token === 'x') out.a += 1;
      else {
        var n = Number(token);
        if (!Number.isFinite(n)) return null;
        out.b += n;
      }
    }
    return out;
  }

  function showMsg(text, isError) {
    balMessage.textContent = text;
    balMessage.className = 'message' + (isError ? ' error' : '');
  }

  function clearMessage() {
    balMessage.textContent = '';
    balMessage.className = 'message';
    balViz.hidden = true;
    choiceButtons = [];
    selectedChoice = null;
    correctChoice = null;
    correctNumber = null;
    placedLeft = [];
    placedRight = [];
    balChoiceGrid.innerHTML = '';
    balChoiceGrid.classList.remove('is-over-back');
    balPanDropLeft.className = 'balance-pan-drop';
    balPanDropRight.className = 'balance-pan-drop';
    refreshPanDropText();
    balSubmitBtn.disabled = true;
    balChoiceFeedback.textContent = '';
    balChoiceFeedback.className = 'message';
    balAnswer.hidden = true;
  }
}());

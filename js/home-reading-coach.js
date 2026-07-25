/* ═══════════════════════════════════════════════════════════════
   PedaForge Home — AI Reading Coach (flagship demo)
   Big mic → 3-2-1 countdown → live SpeechRecognition (or scripted
   Simulated Demo Mode) lights up word chips as the child reads.
   Greedy 2-word-lookahead aligner marks ok / miscue per word, then
   results animate: mascot praise, Accuracy %, computed WCPM and a
   miscue list with canned phoneme notes. Never dead-ends: no STT or
   a mic error auto-falls-back to the identical scripted pipeline.
   Requires js/home-speech.js (window.pfSpeech).
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var PHONEME_NOTES = {
    ship: { readAs: 'sip', note: '‘sh’ digraph → /s/ · phoneme score 38' },
    pond: { readAs: 'pon', note: 'Final /d/ omitted · phoneme score 46' }
  };
  var GENERIC_NOTE = 'Sound slipped — worth one gentle echo together';

  /* Scripted child read: same 2 miscues (pond → "pon", ship → "sip") */
  var SIM_TOKENS = [
    'sam', 'had', 'a', 'red', 'boat', 'he', 'put', 'it', 'in', 'the',
    'pon', 'the', 'wind', 'made', 'the', 'sip', 'tip',
    'sam', 'had', 'fun', 'in', 'the', 'sun'
  ];
  var SIM_HESITATE_BEFORE = { 10: true, 15: true }; // pause before trap words

  var els = {};
  var chips = [];
  var passage = [];       // normalized passage words
  var statuses = [];      // 'pending' | 'ok' | 'miscue'
  var state = {
    mode: 'live',         // 'live' | 'sim'
    running: false,
    counting: false,
    hasResult: false,
    listener: null,
    simTimer: null,
    countTimer: null,
    silenceTimer: null,
    startedAt: 0,
    simSpoken: [],
    restarts: 0
  };
  var simBadgeEl = null;
  var support = { stt: false, tts: false };

  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function normalize(word) {
    return String(word).toLowerCase().replace(/[^a-z']/g, '');
  }

  function tokenize(text) {
    return String(text).toLowerCase().split(/\s+/).map(normalize).filter(function (t) { return t.length > 0; });
  }

  /* ─── Greedy aligner with 2-word lookahead ───────────────── */
  function align(spoken) {
    var out = new Array(passage.length);
    for (var k = 0; k < out.length; k += 1) out[k] = 'pending';
    var idx = 0;
    for (var s = 0; s < spoken.length && idx < passage.length; s += 1) {
      var t = spoken[s];
      if (t === passage[idx]) {
        out[idx] = 'ok'; idx += 1;
      } else if (idx + 1 < passage.length && t === passage[idx + 1]) {
        out[idx] = 'miscue'; out[idx + 1] = 'ok'; idx += 2;
      } else if (idx + 2 < passage.length && t === passage[idx + 2]) {
        out[idx] = 'miscue'; out[idx + 1] = 'miscue'; out[idx + 2] = 'ok'; idx += 3;
      }
      /* otherwise: insertion / mispronounced attempt — ignore token */
    }
    return { statuses: out, nextIdx: idx };
  }

  function renderStatuses(result) {
    for (var i = 0; i < chips.length; i += 1) {
      var chip = chips[i];
      var next = result.statuses[i];
      var prev = statuses[i];
      chip.classList.toggle('current', state.running && i === result.nextIdx);
      if (next === prev) continue;
      chip.classList.remove('ok', 'miscue', 'pop');
      if (next === 'ok') {
        chip.classList.add('ok');
        if (!reducedMotion()) {
          void chip.offsetWidth; /* restart springy pop */
          chip.classList.add('pop');
        }
      } else if (next === 'miscue') {
        chip.classList.add('miscue');
        chip.title = 'Tap to hear this word';
      }
    }
    statuses = result.statuses;
  }

  function clearChips() {
    statuses = passage.map(function () { return 'pending'; });
    chips.forEach(function (chip) {
      chip.classList.remove('ok', 'miscue', 'pop', 'current');
    });
  }

  /* ─── Mic button UI states ───────────────────────────────── */
  function setMicUI(phase) {
    var btn = els.micBtn;
    btn.classList.remove('is-counting', 'is-listening');
    if (phase === 'counting') btn.classList.add('is-counting');
    if (phase === 'listening') btn.classList.add('is-listening');
    var isSim = state.mode === 'sim';
    if (phase === 'idle') {
      els.micLabel.textContent = state.hasResult
        ? 'Read again'
        : (isSim ? 'Play sample reading' : 'Tap to read');
      els.micHint.textContent = isSim
        ? 'A scripted sample read drives the very same pipeline.'
        : 'Take your time - there are no wrong tries here.';
    } else if (phase === 'counting') {
      els.micLabel.textContent = 'Get ready…';
      els.micHint.textContent = 'Deep breath… reading starts in a moment.';
    } else if (phase === 'listening') {
      els.micLabel.textContent = isSim ? 'Playing… tap to stop' : 'I’m listening… tap to stop';
      els.micHint.textContent = isSim
        ? 'Watch the words light up as the sample child reads.'
        : 'Read your story out loud, nice and clear.';
    }
  }

  /* ─── 3-2-1 countdown ────────────────────────────────────── */
  function countdown(done) {
    state.counting = true;
    setMicUI('counting');
    var steps = [3, 2, 1];
    var i = 0;
    var tickMs = reducedMotion() ? 500 : 750;
    function tick() {
      if (!state.counting) return;
      if (i >= steps.length) {
        state.counting = false;
        els.micCount.textContent = '';
        done();
        return;
      }
      els.micCount.textContent = String(steps[i]);
      if (!reducedMotion()) {
        els.micCount.classList.remove('tick');
        void els.micCount.offsetWidth;
        els.micCount.classList.add('tick');
      }
      i += 1;
      state.countTimer = setTimeout(tick, tickMs);
    }
    tick();
  }

  function cancelCountdown() {
    state.counting = false;
    clearTimeout(state.countTimer);
    els.micCount.textContent = '';
  }

  /* ─── Live mic pipeline ──────────────────────────────────── */
  function resetSilenceTimer() {
    clearTimeout(state.silenceTimer);
    state.silenceTimer = setTimeout(function () { finishRun('silence'); }, 10000);
  }

  function startLive() {
    state.listener = window.pfSpeech.listen({
      lang: 'en-SG',
      onresult: function (transcript) {
        if (!state.running) return;
        var result = align(tokenize(transcript));
        renderStatuses(result);
        resetSilenceTimer();
        if (result.nextIdx >= passage.length) finishRun('complete');
      },
      onerror: function (code) {
        if (code === 'not-allowed' || code === 'audio-capture' || code === 'service-not-allowed') {
          fallBackToSim('Mic unavailable — playing a sample reading instead.');
        }
      },
      onend: function (manual) {
        if (!state.running || manual) return;
        /* Engine self-stopped (Chrome idles out). Restart once or twice,
           then treat as end of the read. */
        if (state.restarts < 2 && countOk() < passage.length) {
          state.restarts += 1;
          startLive();
        } else {
          finishRun('engine-end');
        }
      }
    });
    if (!state.listener) {
      fallBackToSim('Speech recognition unavailable — playing a sample reading.');
      return;
    }
    resetSilenceTimer();
  }

  function fallBackToSim(hint) {
    stopEverything();
    setMode('sim');
    els.micHint.textContent = hint;
    beginRun(); /* keep the demo moving — never dead-end */
  }

  /* ─── Simulated pipeline (identical aligner) ─────────────── */
  function startSim() {
    state.simSpoken = [];
    var i = 0;
    function next() {
      if (!state.running) return;
      if (i >= SIM_TOKENS.length) {
        state.simTimer = setTimeout(function () { finishRun('complete'); }, 650);
        return;
      }
      state.simSpoken.push(SIM_TOKENS[i]);
      var result = align(state.simSpoken);
      renderStatuses(result);
      i += 1;
      var delay = 300 + Math.random() * 400;
      if (SIM_HESITATE_BEFORE[i]) delay += 550;
      state.simTimer = setTimeout(next, delay);
    }
    state.simTimer = setTimeout(next, 350);
  }

  /* ─── Run lifecycle ──────────────────────────────────────── */
  function beginRun() {
    clearChips();
    state.running = true;
    state.restarts = 0;
    countdown(function () {
      if (!state.running) return;
      state.startedAt = performance.now();
      setMicUI('listening');
      if (state.mode === 'sim') { startSim(); } else { startLive(); }
    });
  }

  function stopEverything() {
    cancelCountdown();
    clearTimeout(state.simTimer);
    clearTimeout(state.silenceTimer);
    if (state.listener) { state.listener.stop(); state.listener = null; }
    state.running = false;
  }

  function countOk() {
    return statuses.filter(function (s) { return s === 'ok'; }).length;
  }

  function finishRun(reason) {
    if (!state.running) return;
    var elapsedSec = Math.max((performance.now() - state.startedAt) / 1000, 1);
    stopEverything();
    state.hasResult = true;
    chips.forEach(function (chip) { chip.classList.remove('current'); });
    setMicUI('idle');
    showResults(elapsedSec, reason);
  }

  /* ─── Results: mascot praise + teacher meters ────────────── */
  function animateStat(el, target, suffix) {
    if (!el) return;
    if (reducedMotion()) { el.textContent = target + suffix; return; }
    var start = performance.now();
    var dur = 950;
    function step(now) {
      var p = Math.min((now - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) { requestAnimationFrame(step); } else { el.textContent = target + suffix; }
    }
    requestAnimationFrame(step);
  }

  function miscueWords() {
    var list = [];
    for (var i = 0; i < statuses.length; i += 1) {
      if (statuses[i] === 'miscue') list.push(passage[i]);
    }
    return list;
  }

  function persistSession(wcpm, accuracy, miscues) {
    if (!(window.pfDb && window.pfUser)) return;
    window.pfDb.from('reading_sessions').insert({
      user_id: window.pfUser.id,
      passage: passage.join(' '),
      wcpm: wcpm,
      accuracy: accuracy,
      miscues: miscues,
      mode: state.mode === 'sim' ? 'simulated' : 'live'
    }).then(function (r) {
      if (!r.error && window.pfToast) pfToast('Reading session saved — WCPM ' + wcpm);
    });
  }

  function showResults(elapsedSec, reason) {
    var ok = countOk();
    var total = passage.length;
    var attempted = statuses.filter(function (s) { return s !== 'pending'; }).length;
    var accuracy = attempted > 0 ? Math.round((ok / Math.max(attempted, 1)) * 100) : 0;
    var wcpm = Math.round((ok / elapsedSec) * 60);
    var miscues = miscueWords();
    persistSession(wcpm, accuracy, miscues);

    /* Mascot praise (canned, gentle) */
    var title;
    var body;
    if (attempted === 0) {
      title = 'I didn’t quite hear you, Amira!';
      body = 'Let’s try again together — press the big circle and read nice and loud.';
    } else if (accuracy >= 95) {
      title = 'Superstar reading, Amira!';
      body = 'You read ' + ok + ' of ' + total + ' words beautifully. Your garden is going to love this!';
    } else if (accuracy >= 75) {
      title = 'Great reading, Amira!';
      body = 'You read ' + ok + ' of ' + total + ' words clearly.';
    } else {
      title = 'Good trying, Amira!';
      body = 'Every read makes your reading muscles stronger. You got ' + ok + ' words this time.';
    }
    if (miscues.length > 0) {
      body += ' Let’s try ‘' + miscues[0] + '’ once more — tap the speaker, listen, then say it with me.';
    }
    els.mascotTitle.textContent = title;
    els.mascotText.textContent = body;

    /* Replay word = first miscue (or ship) */
    var replayWord = miscues.length > 0 ? miscues[0] : 'ship';
    els.replayBtn.dataset.word = replayWord;
    els.replayWord.textContent = 'Hear ‘' + replayWord + '’';

    /* Teacher meters */
    animateStat(els.accVal, accuracy, '%');
    els.accFill.style.width = accuracy + '%';
    els.accFill.className = 'rc-meter-fill ' + (accuracy >= 85 ? 'good' : (accuracy >= 65 ? 'mid' : 'dev'));
    els.accSrc.textContent = ok + ' of ' + total + ' words read correctly' + (attempted < total ? ' (' + attempted + ' attempted)' : '');

    var fluClass = wcpm >= 90 ? 'good' : (wcpm >= 45 ? 'mid' : 'dev');
    var fluLabelText = wcpm >= 90 ? 'Fluent phrasing' : (wcpm >= 45 ? 'Steady phrasing' : 'Some word-by-word phrasing');
    animateStat(els.fluVal, wcpm, ' WCPM');
    els.fluVal.style.color = '';
    els.fluFill.style.width = Math.min(Math.round((wcpm / 120) * 100), 100) + '%';
    els.fluFill.className = 'rc-meter-fill ' + fluClass;
    els.fluSrc.textContent = fluLabelText + ' · computed from this read';

    els.proFill.style.width = '76%';

    rebuildMiscueList(miscues);

    if (reason === 'silence') {
      els.micHint.textContent = 'It went quiet, so I saved your reading. Tap to read again!';
    }
  }

  function rebuildMiscueList(miscues) {
    els.errors.textContent = '';
    if (miscues.length === 0) {
      var li = document.createElement('li');
      li.className = 'rc-error-item';
      var mark = document.createElement('span');
      mark.className = 'rc-error-mark';
      mark.textContent = '✓';
      var div = document.createElement('div');
      div.textContent = 'No miscues in this read — clean, confident decoding.';
      li.appendChild(mark);
      li.appendChild(div);
      els.errors.appendChild(li);
      return;
    }
    miscues.forEach(function (word, i) {
      var info = PHONEME_NOTES[word] || null;
      var li = document.createElement('li');
      li.className = 'rc-error-item';
      var mark = document.createElement('span');
      mark.className = 'rc-error-mark';
      mark.textContent = String(i + 1);
      var body = document.createElement('div');
      var w = document.createElement('span');
      w.className = 'rc-error-word';
      w.textContent = word;
      var type = document.createElement('span');
      type.className = 'rc-error-type';
      type.textContent = info ? ' - read as “' + info.readAs + '”' : ' - skipped or unclear';
      var note = document.createElement('div');
      note.className = 'rc-error-type';
      note.style.marginTop = '2px';
      note.textContent = info ? info.note : GENERIC_NOTE;
      body.appendChild(w);
      body.appendChild(type);
      body.appendChild(note);
      li.appendChild(mark);
      li.appendChild(body);
      els.errors.appendChild(li);
    });
  }

  /* ─── Replay echo loop (real TTS) ────────────────────────── */
  function replayWord() {
    var word = els.replayBtn.dataset.word || 'ship';
    if (!support.tts) return;
    els.replayBtn.classList.add('speaking');
    window.pfSpeech.speak(word, {
      rate: 0.7,
      onend: function () {
        setTimeout(function () {
          window.pfSpeech.speak(word, {
            rate: 0.85,
            onend: function () { els.replayBtn.classList.remove('speaking'); }
          });
        }, 450);
      }
    });
  }

  /* ─── Mode toggle ────────────────────────────────────────── */
  function setMode(mode) {
    if (mode === 'live' && !support.stt) mode = 'sim';
    state.mode = mode;
    var buttons = els.modeToggle.querySelectorAll('.rc-mode-btn');
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].classList.toggle('active', buttons[i].dataset.mode === mode);
    }
    if (simBadgeEl) simBadgeEl.hidden = (mode !== 'sim');
    setMicUI('idle');
  }

  /* ─── Init ───────────────────────────────────────────────── */
  function init() {
    if (!window.pfSpeech) return;
    els.micBtn = document.getElementById('rcMicBtn');
    els.micCount = document.getElementById('rcMicCount');
    els.micLabel = document.getElementById('rcMicLabel');
    els.micHint = document.getElementById('rcMicHint');
    els.modeToggle = document.getElementById('rcModeToggle');
    els.words = document.getElementById('rcWords');
    els.mascotTitle = document.getElementById('rcMascotTitle');
    els.mascotText = document.getElementById('rcMascotText');
    els.replayBtn = document.getElementById('rcReplayBtn');
    els.replayWord = document.getElementById('rcReplayWord');
    els.accVal = document.getElementById('rcAccVal');
    els.accFill = document.getElementById('rcAccFill');
    els.accSrc = document.getElementById('rcAccSrc');
    els.fluVal = document.getElementById('rcFluVal');
    els.fluFill = document.getElementById('rcFluFill');
    els.fluSrc = document.getElementById('rcFluSrc');
    els.proFill = document.getElementById('rcProFill');
    els.errors = document.getElementById('rcErrors');
    if (!els.micBtn || !els.words) return;

    chips = Array.prototype.slice.call(els.words.querySelectorAll('.word-chip'));
    passage = chips.map(function (chip) { return normalize(chip.textContent); });
    statuses = passage.map(function () { return 'pending'; });

    support = window.pfSpeech.detect();

    /* Simulated badge (visible whenever scripted mode is active) */
    var badgeHost = document.getElementById('rcSimBadgeHost');
    simBadgeEl = window.pfSpeech.simBadge(badgeHost, 'Simulated demo');

    /* Mode toggle wiring */
    var liveBtn = els.modeToggle.querySelector('[data-mode="live"]');
    if (!support.stt && liveBtn) {
      liveBtn.disabled = true;
      liveBtn.title = 'Speech recognition is not available in this browser';
    }
    els.modeToggle.addEventListener('click', function (event) {
      var btn = event.target.closest('.rc-mode-btn');
      if (!btn || btn.disabled) return;
      stopEverything();
      setMode(btn.dataset.mode);
    });

    setMode(support.stt ? 'live' : 'sim');

    els.micBtn.addEventListener('click', function () {
      if (state.counting) { stopEverything(); setMicUI('idle'); return; }
      if (state.running) { finishRun('manual'); return; }
      beginRun();
    });

    els.replayBtn.addEventListener('click', replayWord);
    if (!support.tts) {
      els.replayBtn.disabled = true;
      els.replayBtn.style.opacity = '0.55';
      els.replayBtn.title = 'Audio unavailable in this browser';
    }

    /* Tap a miscue chip to hear the word */
    els.words.addEventListener('click', function (event) {
      var chip = event.target.closest('.word-chip');
      if (!chip || !chip.classList.contains('miscue') || !support.tts) return;
      window.pfSpeech.speak(normalize(chip.textContent), { rate: 0.75 });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());

/* ═══════════════════════════════════════════════════════════════
   PedaForge Home — Termly Benchmark (live tool)
   Child picker (required) → five strand band selectors
   (Emerging / Developing / Secure) + term + notes → insert into
   `benchmarks`. History renders previous terms as a compact
   strand-band table. The optional 3-question mini-quiz can suggest
   a Phonics band, but only the educator's selection is saved.
   Requires pf-auth.js + pf-api.js (window.pfDb, window.pfApi).
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var STRANDS = [
    { key: 'print_awareness', label: 'Print Awareness', hint: 'Book handling & print direction' },
    { key: 'phonics', label: 'Phonics', hint: 'Letter-sound knowledge' },
    { key: 'sight_words', label: 'Sight Words', hint: 'High-frequency word recall' },
    { key: 'decoding', label: 'Decoding', hint: 'Blending sounds into words' },
    { key: 'comprehension', label: 'Comprehension', hint: 'Retelling & predicting' }
  ];
  var BANDS = ['emerging', 'developing', 'secure'];
  var BAND_LABEL = { emerging: 'Emerging', developing: 'Developing', secure: 'Secure' };
  var BAND_TAG = { emerging: 'tag-emerging', developing: 'tag-developing', secure: 'tag-secure' };

  var pickedChild = null;
  var selection = {};   // strand key -> band
  var els = {};

  function el(id) { return document.getElementById(id); }
  function toast(msg) { if (window.pfToast) window.pfToast(msg); }

  /* ─── Strand selectors ───────────────────────────────────── */
  function renderStrandRows() {
    var host = els.strands;
    host.textContent = '';
    STRANDS.forEach(function (strand) {
      var row = document.createElement('div');
      row.className = 'bm-strand';
      row.style.gridTemplateColumns = '150px 1fr';

      var name = document.createElement('div');
      name.className = 'bm-strand-name';
      name.textContent = strand.label;
      var small = document.createElement('small');
      small.textContent = strand.hint;
      name.appendChild(small);
      row.appendChild(name);

      var group = document.createElement('div');
      group.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
      group.setAttribute('role', 'group');
      group.setAttribute('aria-label', strand.label + ' band');
      BANDS.forEach(function (band) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pill-btn';
        btn.dataset.strand = strand.key;
        btn.dataset.band = band;
        btn.textContent = BAND_LABEL[band];
        btn.addEventListener('click', function () { pickBand(strand.key, band); });
        group.appendChild(btn);
      });
      row.appendChild(group);
      host.appendChild(row);
    });
    syncStrandUI();
  }

  function pickBand(strandKey, band) {
    var next = {};
    Object.keys(selection).forEach(function (k) { next[k] = selection[k]; });
    next[strandKey] = band;
    selection = next;
    syncStrandUI();
  }

  function syncStrandUI() {
    els.strands.querySelectorAll('button[data-strand]').forEach(function (btn) {
      var on = selection[btn.dataset.strand] === btn.dataset.band;
      btn.classList.toggle('primary', on);
    });
    var remaining = STRANDS.filter(function (s) { return !selection[s.key]; });
    els.formHint.textContent = remaining.length
      ? remaining.length + ' strand' + (remaining.length === 1 ? '' : 's') + ' left to rate'
      : 'All five strands rated — ready to save';
  }

  /* ─── Save ───────────────────────────────────────────────── */
  function saveBenchmark() {
    if (!pickedChild) { toast('Pick a child first.'); return; }
    var missing = STRANDS.filter(function (s) { return !selection[s.key]; });
    if (missing.length) {
      toast('Rate every strand first — missing: ' + missing.map(function (s) { return s.label; }).join(', '));
      return;
    }
    var strands = {};
    STRANDS.forEach(function (s) { strands[s.key] = selection[s.key]; });
    var done = window.pfApi.spinner(els.saveBtn, 'Saving…');
    window.pfDb.from('benchmarks').insert({
      owner: window.pfUser.id,
      child_id: pickedChild.id,
      term: els.term.value,
      strands: strands,
      notes: els.notes.value.trim() || null
    }).then(function (r) {
      done();
      if (r.error) { toast('Could not save benchmark: ' + r.error.message); return; }
      toast('Benchmark saved for ' + pickedChild.name + ' · ' + els.term.value);
      selection = {};
      els.notes.value = '';
      syncStrandUI();
      loadHistory();
    }).catch(function (e) {
      done();
      toast('Could not save benchmark: ' + e.message);
    });
  }

  /* ─── History table ──────────────────────────────────────── */
  function loadHistory() {
    if (!pickedChild) return;
    window.pfDb.from('benchmarks')
      .select('term,strands,notes,created_at')
      .eq('child_id', pickedChild.id)
      .order('created_at', { ascending: true })
      .then(function (r) {
        var card = els.historyCard;
        if (r.error) {
          card.hidden = false;
          els.historySub.textContent = 'Could not load history: ' + r.error.message;
          els.historyHead.textContent = '';
          els.historyBody.textContent = '';
          return;
        }
        var rows = r.data || [];
        card.hidden = false;
        if (!rows.length) {
          els.historySub.textContent = 'No benchmarks for ' + pickedChild.name + ' yet — the first one you save starts the story.';
          els.historyHead.textContent = '';
          els.historyBody.textContent = '';
          return;
        }
        els.historySub.textContent = rows.length + ' benchmark' + (rows.length === 1 ? '' : 's') + ' for ' + pickedChild.name + ' — bands per strand, oldest to newest.';

        /* Header: Strand | term | term | ... */
        els.historyHead.textContent = '';
        var trh = document.createElement('tr');
        var th0 = document.createElement('th');
        th0.textContent = 'Strand';
        trh.appendChild(th0);
        rows.forEach(function (b) {
          var th = document.createElement('th');
          th.textContent = b.term;
          th.title = window.pfApi.ago(b.created_at);
          trh.appendChild(th);
        });
        els.historyHead.appendChild(trh);

        /* Body: one row per strand */
        els.historyBody.textContent = '';
        STRANDS.forEach(function (strand) {
          var tr = document.createElement('tr');
          var td0 = document.createElement('td');
          var strong = document.createElement('strong');
          strong.textContent = strand.label;
          td0.appendChild(strong);
          tr.appendChild(td0);
          rows.forEach(function (b) {
            var td = document.createElement('td');
            var band = b.strands && b.strands[strand.key];
            if (band && BAND_LABEL[band]) {
              var tag = document.createElement('span');
              tag.className = 'tag ' + (BAND_TAG[band] || '') + ' bm-status';
              tag.textContent = BAND_LABEL[band];
              td.appendChild(tag);
            } else {
              td.textContent = '—';
            }
            tr.appendChild(td);
          });
          els.historyBody.appendChild(tr);
        });
      });
  }

  /* ─── Child picker ───────────────────────────────────────── */
  function initPicker() {
    var host = el('bmPickerHost');
    if (!host || !window.pfApi || !window.pfApi.childPicker) return;
    window.pfApi.childPicker(host, {
      onPick: function (child) {
        pickedChild = child ? { id: child.id, name: child.name } : null;
        var title = el('bmChildName');
        if (title) title.textContent = pickedChild ? pickedChild.name + '’s Termly Benchmark' : 'Choose a child to benchmark';
        els.form.hidden = !pickedChild;
        if (pickedChild) {
          loadHistory();
        } else {
          els.historyCard.hidden = true;
        }
      }
    });
  }

  /* ═══ Optional 3-question mini-quiz (band suggester) ═══════ */
  var QUESTIONS = [
    {
      prompt: 'Tap the word that says “ship”',
      hint: 'Listen with your eyes — which one starts with the /sh/ sound?',
      options: ['chip', 'ship', 'shop'],
      answer: 1
    },
    {
      prompt: 'Which picture word rhymes with “cat”?',
      hint: 'Rhyming words share the same ending sound.',
      options: ['🎩 hat', '🐟 fish', '🌞 sun'],
      answer: 0
    },
    {
      prompt: 'Sam’s boat tipped in the pond. What happens next?',
      hint: 'There is no wrong guess — pick the ending you like best.',
      options: ['Sam fixes the boat', 'The boat flies away', 'Sam eats lunch'],
      answer: 0
    }
  ];

  var RING_CIRCUMFERENCE = 2 * Math.PI * 34;
  var quiz = { qIndex: 0, correct: 0, answered: false, finished: false };

  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function setRing(fraction) {
    els.ringFill.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - fraction));
  }

  function renderQuestion() {
    var q = QUESTIONS[quiz.qIndex];
    quiz.answered = false;
    els.prompt.textContent = q.prompt;
    els.hint.textContent = q.hint;
    els.step.textContent = 'Question ' + (quiz.qIndex + 1) + ' of ' + QUESTIONS.length;
    els.options.textContent = '';
    els.feedback.textContent = '';
    q.options.forEach(function (option, i) {
      var pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'bmq-option';
      pill.textContent = option;
      pill.dataset.index = String(i);
      els.options.appendChild(pill);
    });
  }

  function onOptionTap(event) {
    var pill = event.target.closest('.bmq-option');
    if (!pill || quiz.answered || quiz.finished) return;
    quiz.answered = true;
    var picked = Number(pill.dataset.index);
    var q = QUESTIONS[quiz.qIndex];
    var isRight = picked === q.answer;
    if (isRight) quiz.correct += 1;

    els.options.querySelectorAll('.bmq-option').forEach(function (p, i) {
      p.disabled = true;
      if (i === q.answer) p.classList.add('is-right');
      if (i === picked && !isRight) p.classList.add('is-gentle');
    });

    els.feedback.textContent = isRight
      ? ['Yes! Great ears!', 'You got it — wonderful!', 'Lovely thinking!'][quiz.qIndex % 3]
      : 'Good try! The one with the glow is the one we were listening for.';

    setRing((quiz.qIndex + 1) / QUESTIONS.length);

    setTimeout(function () {
      quiz.qIndex += 1;
      if (quiz.qIndex < QUESTIONS.length) renderQuestion();
      else showSummary();
    }, reducedMotion() ? 900 : 1400);
  }

  function suggestedBand() {
    if (quiz.correct >= 3) return 'secure';
    if (quiz.correct === 2) return 'developing';
    return 'emerging';
  }

  function showSummary() {
    quiz.finished = true;
    els.quizBody.hidden = true;
    els.summary.hidden = false;

    var headline;
    if (quiz.correct === QUESTIONS.length) {
      headline = 'Three out of three — amazing listening and thinking!';
    } else if (quiz.correct >= 2) {
      headline = 'You got ' + quiz.correct + ' of ' + QUESTIONS.length + ' — strong, confident work!';
    } else {
      headline = 'Every question got a brave try — that is how readers grow!';
    }
    els.summaryHead.textContent = headline;

    var band = suggestedBand();
    els.summaryBody.textContent = 'Based on this quick check-in the Phonics strand looks around “' + BAND_LABEL[band] + '”. It is only a suggestion — the benchmark saves whatever the educator selects above.';

    if (pickedChild) {
      els.applyBtn.hidden = false;
      els.applyBtn.textContent = 'Use “' + BAND_LABEL[band] + '” for Phonics';
      els.applyBtn.dataset.band = band;
    } else {
      els.applyBtn.hidden = true;
    }
  }

  function applySuggestion() {
    var band = els.applyBtn.dataset.band;
    if (!band) return;
    pickBand('phonics', band);
    toast('Phonics set to ' + BAND_LABEL[band] + ' — review and save when ready');
  }

  function restartQuiz() {
    quiz = { qIndex: 0, correct: 0, answered: false, finished: false };
    els.summary.hidden = true;
    els.quizBody.hidden = false;
    els.applyBtn.hidden = true;
    setRing(0);
    renderQuestion();
  }

  /* ─── Init ───────────────────────────────────────────────── */
  function init() {
    els.form = el('bmForm');
    els.strands = el('bmStrands');
    els.term = el('bmTerm');
    els.notes = el('bmNotes');
    els.saveBtn = el('bmSaveBtn');
    els.formHint = el('bmFormHint');
    els.historyCard = el('bmHistoryCard');
    els.historySub = el('bmHistorySub');
    els.historyHead = el('bmHistoryHead');
    els.historyBody = el('bmHistoryBody');

    els.quizBody = el('bmqBody');
    els.prompt = el('bmqPrompt');
    els.hint = el('bmqHint');
    els.step = el('bmqStep');
    els.options = el('bmqOptions');
    els.feedback = el('bmqFeedback');
    els.ringFill = el('bmqRingFill');
    els.summary = el('bmqSummary');
    els.summaryHead = el('bmqSummaryHead');
    els.summaryBody = el('bmqSummaryBody');
    els.applyBtn = el('bmqApplyBtn');
    els.restartBtn = el('bmqRestartBtn');
    if (!els.form || !els.strands || !els.quizBody) return;

    renderStrandRows();
    els.saveBtn.addEventListener('click', saveBenchmark);

    els.ringFill.style.strokeDasharray = String(RING_CIRCUMFERENCE);
    setRing(0);
    els.options.addEventListener('click', onOptionTap);
    els.restartBtn.addEventListener('click', restartQuiz);
    els.applyBtn.addEventListener('click', applySuggestion);
    renderQuestion();

    initPicker();
  }

  function boot() {
    if (window.pfAuthReady) window.pfAuthReady.then(init);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}());

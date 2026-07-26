/* ═══════════════════════════════════════════════════════════════
   PedaForge Home - Star Check (kids paint-world benchmark)
   The dock's active child (pf-kid-change from js/pf-kids.js) drives
   everything. Five star-themed strand cards each offer three band
   buttons - Sprout (emerging), Leaf (developing), Flower (secure) -
   and save exactly as before: insert into `benchmarks` with owner,
   child_id, term, strands jsonb + optional notes. The "Try 3 little
   games" mini-quiz can suggest a Phonics band; only the educator's
   taps are saved. History renders as a row of star pills.
   Requires pf-auth.js + pf-api.js + pf-kids.js.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var STRAND_COLORS = ['#4fb8c9', '#b48fd9', '#ffcf5c', '#ff7d6b', '#5fae62'];
  var STRANDS = [
    { key: 'print_awareness', label: 'Print Awareness', kid: 'Book Star', hint: 'Book handling and print direction' },
    { key: 'phonics', label: 'Phonics', kid: 'Sound Star', hint: 'Letter-sound knowledge' },
    { key: 'sight_words', label: 'Sight Words', kid: 'Word Star', hint: 'High-frequency word recall' },
    { key: 'decoding', label: 'Decoding', kid: 'Blending Star', hint: 'Blending sounds into words' },
    { key: 'comprehension', label: 'Comprehension', kid: 'Story Star', hint: 'Retelling and predicting' }
  ];
  var BANDS = ['emerging', 'developing', 'secure'];
  var BAND_LABEL = { emerging: 'Emerging', developing: 'Developing', secure: 'Secure' };
  var BAND_KID = { emerging: 'Sprout', developing: 'Leaf', secure: 'Flower' };

  /* SVG stroke icons (24px viewBox) */
  var ICON_STAR =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
  var BAND_ICON = {
    emerging:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 21v-8"/><path d="M12 13C12 9 9 7 5 7c0 4 3 6 7 6z"/><path d="M12 13c0-3 2.4-5 6-5 0 3-2.4 5-6 5z"/></svg>',
    developing:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M6 21C6 12 11 6 19 4c-1 9-5 14-13 17z"/><path d="M6 21c3-6 7-11 11-14"/></svg>',
    secure:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="12" cy="8" r="2.6"/><path d="M12 2.6v2.2M12 11.2v2.2M6.8 8H9M15 8h2.2M8.3 4.3l1.6 1.6M14.1 10.1l1.6 1.6M15.7 4.3l-1.6 1.6M9.9 10.1l-1.6 1.6"/>' +
      '<path d="M12 13.4V21"/><path d="M12 18.5c-2.6 0-4-1.4-4-3.5 2.6 0 4 1.4 4 3.5z"/></svg>'
  };

  var pickedChild = null;
  var selection = {};   // strand key -> band
  var els = {};

  function el(id) { return document.getElementById(id); }
  function toast(msg) { if (window.pfToast) window.pfToast(msg); }
  function celebrate() { if (window.pfKids && window.pfKids.celebrate) window.pfKids.celebrate(); }
  function refreshStars() { if (window.pfKids && window.pfKids.refreshStars) window.pfKids.refreshStars(); }
  function firstName(name) { return String(name || '').split(' ')[0]; }

  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ─── Five star cards ────────────────────────────────────── */
  function renderStrandCards() {
    var host = els.strands;
    host.textContent = '';
    STRANDS.forEach(function (strand, idx) {
      var card = document.createElement('div');
      card.className = 'k-strand-card';

      var head = document.createElement('div');
      head.className = 'k-strand-head';
      var star = document.createElement('span');
      star.className = 'k-strand-star';
      var color = STRAND_COLORS[idx % STRAND_COLORS.length];
      star.style.background = 'color-mix(in srgb, ' + color + ' 20%, #fff)';
      star.style.color = color;
      star.innerHTML = ICON_STAR;
      head.appendChild(star);
      var titles = document.createElement('div');
      var b = document.createElement('b');
      b.textContent = strand.kid;
      var span = document.createElement('span');
      span.textContent = strand.label + ' - ' + strand.hint;
      titles.appendChild(b);
      titles.appendChild(span);
      head.appendChild(titles);
      card.appendChild(head);

      var group = document.createElement('div');
      group.className = 'k-bands';
      group.setAttribute('role', 'group');
      group.setAttribute('aria-label', strand.label + ' band');
      BANDS.forEach(function (band) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'k-band';
        btn.dataset.strand = strand.key;
        btn.dataset.band = band;
        btn.setAttribute('aria-label', strand.label + ': ' + BAND_LABEL[band]);
        btn.innerHTML = BAND_ICON[band];
        var lbl = document.createElement('span');
        lbl.textContent = BAND_KID[band];
        btn.appendChild(lbl);
        btn.addEventListener('click', function () {
          if (!reducedMotion()) {
            btn.classList.remove('k-wiggle');
            void btn.offsetWidth;
            btn.classList.add('k-wiggle');
          }
          pickBand(strand.key, band);
        });
        group.appendChild(btn);
      });
      card.appendChild(group);
      host.appendChild(card);
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
      btn.classList.toggle('on', selection[btn.dataset.strand] === btn.dataset.band);
    });
    var remaining = STRANDS.filter(function (s) { return !selection[s.key]; });
    els.formHint.textContent = remaining.length
      ? remaining.length + ' star' + (remaining.length === 1 ? ' still needs' : 's still need') + ' a tap'
      : 'All five stars picked - tap the big button!';
  }

  /* ─── Save (exact semantics: benchmarks insert) ──────────── */
  function saveBenchmark() {
    if (!pickedChild) { toast('Pick a child up top first.'); return; }
    var missing = STRANDS.filter(function (s) { return !selection[s.key]; });
    if (missing.length) {
      toast('Tap a sprout, leaf or flower for: ' + missing.map(function (s) { return s.kid; }).join(', '));
      return;
    }
    var strands = {};
    STRANDS.forEach(function (s) { strands[s.key] = selection[s.key]; });
    els.saveBtn.disabled = true;
    els.saveLabel.textContent = 'Saving...';
    function done() {
      els.saveBtn.disabled = false;
      els.saveLabel.textContent = 'Save my stars';
    }
    window.pfDb.from('benchmarks').insert({
      owner: window.pfUser.id,
      child_id: pickedChild.id,
      term: els.term.value,
      strands: strands,
      notes: els.notes.value.trim() || null
    }).then(function (r) {
      done();
      if (r.error) { toast('Could not save: ' + r.error.message); return; }
      toast('Stars saved for ' + firstName(pickedChild.name) + '!');
      celebrate();
      refreshStars();
      selection = {};
      els.notes.value = '';
      syncStrandUI();
      loadHistory();
    }).catch(function (e) {
      done();
      toast('Could not save: ' + e.message);
    });
  }

  /* ─── Your stars from before (history pills) ─────────────── */
  function bandMini(band) {
    var span = document.createElement('span');
    span.className = 'k-hist-band ' + band;
    span.innerHTML = BAND_ICON[band];
    return span;
  }

  function loadHistory() {
    if (!pickedChild) return;
    window.pfDb.from('benchmarks')
      .select('term,strands,created_at')
      .eq('child_id', pickedChild.id)
      .order('created_at', { ascending: true })
      .then(function (r) {
        var card = els.historyCard;
        var host = els.history;
        host.textContent = '';
        if (r.error) {
          card.hidden = false;
          els.historySub.textContent = 'Could not load them right now: ' + r.error.message;
          return;
        }
        var rows = r.data || [];
        if (!rows.length) {
          card.hidden = true;
          return;
        }
        card.hidden = false;
        els.historySub.textContent = 'Look how far you have come, ' + firstName(pickedChild.name) + '!';
        rows.forEach(function (b) {
          var pill = document.createElement('span');
          pill.className = 'k-hist-pill';
          var term = document.createElement('b');
          term.textContent = b.term;
          pill.appendChild(term);
          STRANDS.forEach(function (strand) {
            var band = b.strands && b.strands[strand.key];
            if (band && BAND_ICON[band]) {
              var mini = bandMini(band);
              mini.title = strand.label + ': ' + BAND_LABEL[band];
              pill.appendChild(mini);
            }
          });
          pill.title = 'Saved ' + (window.pfApi ? window.pfApi.ago(b.created_at) : b.created_at);
          host.appendChild(pill);
        });
      });
  }

  /* ─── Dock child wiring (pf-kid-change) ──────────────────── */
  function onKidChange(kid) {
    pickedChild = kid ? { id: kid.id, name: kid.name } : null;
    els.kidLine.textContent = pickedChild
      ? 'Show what you know, ' + firstName(pickedChild.name) + ' - together with your grown-up!'
      : 'Show what you know - together with your grown-up!';
    els.form.hidden = !pickedChild;
    els.noKid.hidden = !!pickedChild;
    if (pickedChild) loadHistory();
    else els.historyCard.hidden = true;
  }

  /* ═══ Try 3 little games (band suggester) ══════════════════ */
  var QUESTIONS = [
    {
      prompt: 'Tap the word that says "ship"',
      hint: 'Listen with your eyes - which one starts with the /sh/ sound?',
      options: ['chip', 'ship', 'shop'],
      answer: 1
    },
    {
      prompt: 'Which word rhymes with "cat"?',
      hint: 'Rhyming words share the same ending sound.',
      options: ['hat', 'fish', 'sun'],
      answer: 0
    },
    {
      prompt: 'Sam\'s boat tipped in the pond. What happens next?',
      hint: 'There is no wrong guess - pick the ending you like best.',
      options: ['Sam fixes the boat', 'The boat flies away', 'Sam eats lunch'],
      answer: 0
    }
  ];

  var quiz = { qIndex: 0, correct: 0, answered: false, finished: false };

  function renderQuizStars() {
    els.quizStars.innerHTML = QUESTIONS.map(function (q, i) {
      return '<svg class="' + (i < quiz.qIndex ? 'lit' : '') + '" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
        '<path d="M12 2l2.9 6.26L21 9.27l-4.9 4.4L17.4 21 12 17.6 6.6 21l1.3-7.33L3 9.27l6.1-1.01L12 2z"/></svg>';
    }).join('');
  }

  function renderQuestion() {
    var q = QUESTIONS[quiz.qIndex];
    quiz.answered = false;
    els.prompt.textContent = q.prompt;
    els.hint.textContent = q.hint;
    els.step.textContent = 'Game ' + (quiz.qIndex + 1) + ' of ' + QUESTIONS.length;
    els.options.textContent = '';
    els.feedback.textContent = '';
    q.options.forEach(function (option, i) {
      var pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'k-chip k-quiz-pill';
      pill.textContent = option;
      pill.dataset.index = String(i);
      els.options.appendChild(pill);
    });
    renderQuizStars();
  }

  function onOptionTap(event) {
    var pill = event.target.closest('.k-quiz-pill');
    if (!pill || quiz.answered || quiz.finished) return;
    quiz.answered = true;
    var picked = Number(pill.dataset.index);
    var q = QUESTIONS[quiz.qIndex];
    var isRight = picked === q.answer;
    if (isRight) quiz.correct += 1;

    els.options.querySelectorAll('.k-quiz-pill').forEach(function (p, i) {
      p.disabled = true;
      if (i === q.answer) p.classList.add('is-right');
      if (i === picked && !isRight) p.classList.add('is-gentle');
    });

    els.feedback.textContent = isRight
      ? ['Yes! Great ears!', 'You got it - wonderful!', 'Lovely thinking!'][quiz.qIndex % 3]
      : 'Good try! The green one is the one we were listening for.';

    quiz.qIndex += 1;
    renderQuizStars();

    setTimeout(function () {
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
    celebrate();

    var headline;
    if (quiz.correct === QUESTIONS.length) {
      headline = 'Three out of three - amazing listening and thinking!';
    } else if (quiz.correct >= 2) {
      headline = 'You got ' + quiz.correct + ' of ' + QUESTIONS.length + ' - strong, confident work!';
    } else {
      headline = 'Every game got a brave try - that is how readers grow!';
    }
    els.summaryHead.textContent = headline;

    var band = suggestedBand();
    els.summaryBody.textContent = 'The little games say the Sound Star looks like a ' + BAND_KID[band].toLowerCase() + ' (' + BAND_LABEL[band] + '). It is only a hint - your grown-up picks what really counts.';

    if (pickedChild) {
      els.applyBtn.hidden = false;
      els.applyBtn.textContent = 'Use "' + BAND_KID[band] + '" for the Sound Star';
      els.applyBtn.dataset.band = band;
    } else {
      els.applyBtn.hidden = true;
    }
  }

  function applySuggestion() {
    var band = els.applyBtn.dataset.band;
    if (!band) return;
    pickBand('phonics', band);
    toast('Sound Star set to ' + BAND_KID[band] + ' (' + BAND_LABEL[band] + ') - check and save when ready');
  }

  function restartQuiz() {
    quiz = { qIndex: 0, correct: 0, answered: false, finished: false };
    els.summary.hidden = true;
    els.quizBody.hidden = false;
    els.applyBtn.hidden = true;
    renderQuestion();
  }

  /* ─── Init ───────────────────────────────────────────────── */
  function init() {
    els.form = el('bmForm');
    els.noKid = el('bmNoKid');
    els.kidLine = el('bmKidLine');
    els.strands = el('bmStrands');
    els.term = el('bmTerm');
    els.notes = el('bmNotes');
    els.saveBtn = el('bmSaveBtn');
    els.saveLabel = el('bmSaveLabel');
    els.formHint = el('bmFormHint');
    els.historyCard = el('bmHistoryCard');
    els.historySub = el('bmHistorySub');
    els.history = el('bmHistory');

    els.quizBody = el('bmqBody');
    els.quizStars = el('bmqStars');
    els.prompt = el('bmqPrompt');
    els.hint = el('bmqHint');
    els.step = el('bmqStep');
    els.options = el('bmqOptions');
    els.feedback = el('bmqFeedback');
    els.summary = el('bmqSummary');
    els.summaryHead = el('bmqSummaryHead');
    els.summaryBody = el('bmqSummaryBody');
    els.applyBtn = el('bmqApplyBtn');
    els.restartBtn = el('bmqRestartBtn');
    if (!els.form || !els.strands || !els.quizBody) return;

    renderStrandCards();
    els.saveBtn.addEventListener('click', saveBenchmark);

    els.options.addEventListener('click', onOptionTap);
    els.restartBtn.addEventListener('click', restartQuiz);
    els.applyBtn.addEventListener('click', applySuggestion);
    renderQuestion();

    /* Dock child drives everything (fires once at load too) */
    document.addEventListener('pf-kid-change', function (e) { onKidChange(e.detail); });
    onKidChange(window.pfKids && window.pfKids.activeChild ? window.pfKids.activeChild() : null);
  }

  function boot() {
    if (window.pfAuthReady) window.pfAuthReady.then(init);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}());

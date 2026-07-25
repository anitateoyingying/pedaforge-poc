/* ═══════════════════════════════════════════════════════════════
   PedaForge Home — Termly Benchmark: "Try a 3-question check-in"
   Three tap-to-answer questions with a progress ring that fills
   per answer (stroke-dashoffset), an encouraging summary and one
   strand bar animating up at the end. Pure DOM, no dependencies
   beyond js/home-speech.js (Simulated badge helper only).
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

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

  var RING_CIRCUMFERENCE = 2 * Math.PI * 34; /* r=34 → ~213.6 */

  var els = {};
  var qIndex = 0;
  var correct = 0;
  var answered = false;
  var finished = false;

  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function setRing(fraction) {
    var offset = RING_CIRCUMFERENCE * (1 - fraction);
    els.ringFill.style.strokeDashoffset = String(offset);
  }

  function renderQuestion() {
    var q = QUESTIONS[qIndex];
    answered = false;
    els.prompt.textContent = q.prompt;
    els.hint.textContent = q.hint;
    els.step.textContent = 'Question ' + (qIndex + 1) + ' of ' + QUESTIONS.length;
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
    if (!pill || answered || finished) return;
    answered = true;
    var picked = Number(pill.dataset.index);
    var q = QUESTIONS[qIndex];
    var isRight = picked === q.answer;
    if (isRight) correct += 1;

    var pills = els.options.querySelectorAll('.bmq-option');
    pills.forEach(function (p, i) {
      p.disabled = true;
      if (i === q.answer) p.classList.add('is-right');
      if (i === picked && !isRight) p.classList.add('is-gentle');
    });

    els.feedback.textContent = isRight
      ? ['Yes! Great ears!', 'You got it — wonderful!', 'Lovely thinking!'][qIndex % 3]
      : 'Good try! The one with the glow is the one we were listening for.';

    setRing((qIndex + 1) / QUESTIONS.length);

    setTimeout(function () {
      qIndex += 1;
      if (qIndex < QUESTIONS.length) {
        renderQuestion();
      } else {
        showSummary();
      }
    }, reducedMotion() ? 900 : 1400);
  }

  function showSummary() {
    finished = true;
    els.quizBody.hidden = true;
    els.summary.hidden = false;

    var headline;
    if (correct === QUESTIONS.length) {
      headline = 'Three out of three — amazing listening and thinking!';
    } else if (correct >= 2) {
      headline = 'You got ' + correct + ' of ' + QUESTIONS.length + ' — strong, confident work!';
    } else {
      headline = 'You gave every question a brave try — that is how readers grow!';
    }
    els.summaryHead.textContent = headline;
    els.summaryBody.textContent = 'Check-ins like this feed one gentle data point into the termly benchmark. No scores are shown to the child — just encouragement, while the strand below quietly updates for the teacher and parent.';

    /* animate one strand bar up */
    setTimeout(function () {
      var strandFill = els.strandFill;
      var target = 45 + correct * 9; /* 45% baseline + up to +27 */
      if (reducedMotion()) {
        strandFill.style.width = target + '%';
        els.strandVal.textContent = '+' + correct * 9 + '%';
        return;
      }
      strandFill.style.transition = 'width 1.1s cubic-bezier(0.34,1.56,0.64,1)';
      strandFill.style.width = target + '%';
      els.strandVal.textContent = '+' + correct * 9 + '%';
    }, 300);
  }

  function restart() {
    qIndex = 0;
    correct = 0;
    finished = false;
    els.summary.hidden = true;
    els.quizBody.hidden = false;
    setRing(0);
    els.strandFill.style.width = '45%';
    els.strandVal.textContent = '';
    renderQuestion();
  }

  function init() {
    els.quizBody = document.getElementById('bmqBody');
    els.prompt = document.getElementById('bmqPrompt');
    els.hint = document.getElementById('bmqHint');
    els.step = document.getElementById('bmqStep');
    els.options = document.getElementById('bmqOptions');
    els.feedback = document.getElementById('bmqFeedback');
    els.ringFill = document.getElementById('bmqRingFill');
    els.summary = document.getElementById('bmqSummary');
    els.summaryHead = document.getElementById('bmqSummaryHead');
    els.summaryBody = document.getElementById('bmqSummaryBody');
    els.strandFill = document.getElementById('bmqStrandFill');
    els.strandVal = document.getElementById('bmqStrandVal');
    els.restartBtn = document.getElementById('bmqRestartBtn');
    if (!els.quizBody || !els.options) return;

    els.ringFill.style.strokeDasharray = String(RING_CIRCUMFERENCE);
    setRing(0);

    els.options.addEventListener('click', onOptionTap);
    if (els.restartBtn) els.restartBtn.addEventListener('click', restart);

    if (window.pfSpeech) {
      window.pfSpeech.simBadge(document.getElementById('bmqSimHost'), 'Simulated check-in');
    }

    renderQuestion();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());

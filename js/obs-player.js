/* AI Lesson Observation — "Live Session Replay"
   A 90-second scripted playback: transcript lines land, AI-tagged QTT
   evidence pops in, and a draft report assembles. All data is canned;
   render() is a pure function of the clock so scrubbing is deterministic. */
(function () {
  'use strict';

  var DUR = 90;
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Timeline data ────────────────────────────────────── */
  var META = { educator: 'Sarah L.', klass: 'K1 Sunshine', observer: 'Mdm Lim', date: '14 May 2026' };

  var DOMAINS = {
    tci: { name: 'Teacher-Child Interaction', cap: 85 },
    sst: { name: 'Sustained Shared Thinking', cap: 70 },
    env: { name: 'Learning Environment', cap: 55 }
  };

  var EVENTS = [
    { t: 2,  type: 'line', who: 'scene',   text: 'Free play begins — block corner, water table and reading nook are open.' },
    { t: 6,  type: 'line', who: 'teacher', text: 'Morning everyone — choose your corner. Gentle hands, walking feet.' },
    { t: 10, type: 'line', who: 'scene',   text: 'Leo’s block tower collapses. He frowns and pushes the blocks away.' },
    { t: 14, type: 'line', who: 'teacher', text: 'You’re cross because the tower fell. That’s okay — I’m here.' },
    { t: 18, type: 'evidence', id: 'ev1', domain: 'tci', state: 'met', src: 'Voice note · 09:42',
      indicator: 'QTT 2.3 · Teacher-Child Interaction',
      note: 'Named the emotion at eye level before offering a solution.', weight: 45 },
    { t: 22, type: 'line', who: 'child',   text: 'It keeps falling down!' },
    { t: 26, type: 'line', who: 'teacher', text: 'What if we tried a wider base? Show me your idea.' },
    { t: 30, type: 'evidence', id: 'ev2', domain: 'tci', state: 'met', src: 'Voice note · 09:44',
      indicator: 'QTT 2.4 · Responsive Scaffolding',
      note: 'Handed agency back to the child instead of rebuilding it for him.', weight: 40 },
    { t: 35, type: 'line', who: 'scene',   text: 'Water table. Amira lines up cups along the edge.' },
    { t: 39, type: 'line', who: 'teacher', text: 'What do you think will happen if we add more cups?' },
    { t: 43, type: 'line', who: 'child',   text: 'The water will share!' },
    { t: 47, type: 'line', who: 'teacher', text: 'The water will share — so will each cup have more, or less?' },
    { t: 51, type: 'evidence', id: 'ev3', domain: 'sst', state: 'met', src: 'Typed note · 09:55',
      indicator: 'QTT 3.1 · Sustained Shared Thinking',
      note: 'True open question, then extended the child’s reasoning rather than correcting it.', weight: 70 },
    { t: 57, type: 'line', who: 'scene',   text: 'Pack-away time. Several children look unsure where the blocks go.' },
    { t: 61, type: 'line', who: 'teacher', text: 'Everyone — blocks back on the shelf, please.' },
    { t: 65, type: 'line', who: 'scene',   text: 'A few children drift off; the instruction isn’t followed up.' },
    { t: 68, type: 'evidence', id: 'ev4', domain: 'env', state: 'emerging', src: 'Voice note · 10:08',
      indicator: 'QTT 5.2 · Routines & Transitions',
      note: 'Single whole-group instruction; transition would benefit from a visual routine.', weight: 55 },
    { t: 76, type: 'report', section: 'strengths', title: 'Strengths', evidenceIds: ['ev1', 'ev2', 'ev3'],
      text: 'Emotional scaffolding is now consistently evidenced (09:42, 09:44) — Sarah names feelings at eye level before problem-solving. The water-table exchange (09:55) is a genuine step forward on her Sustained Shared Thinking IDP goal: a true open question, extended rather than corrected.' },
    { t: 80, type: 'report', section: 'growth', title: 'Growth Point', evidenceIds: ['ev4'],
      text: 'Transition management (10:08): the pack-away instruction was given once to the whole group and a few children disengaged. A small routine-and-environment adjustment — not an interaction concern.' },
    { t: 84, type: 'report', section: 'followup', title: 'Follow-Up Plan', evidenceIds: [],
      text: 'Mark the SST goal as met with today’s evidence attached. Co-plan one visual pack-away routine and revisit in a 10-minute walkthrough in two weeks. Carry this summary into the half-yearly appraisal.' }
  ];

  var SYNTH_START = 71, SYNTH_END = 76;

  /* ── State ────────────────────────────────────────────── */
  var clock = 0, playing = false, rate = 1, rafId = null, lastTs = null;
  var mounted = 0;               // how many timeline events currently in the DOM
  var lastRenderClock = 0;

  var el = {};
  function $(id) { return document.getElementById(id); }

  /* ── Helpers ──────────────────────────────────────────── */
  function fmt(s) {
    s = Math.max(0, Math.min(DUR, Math.floor(s)));
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }
  function visibleCount(c) {
    var n = 0;
    while (n < EVENTS.length && EVENTS[n].t <= c) n++;
    return n;
  }

  /* ── DOM builders (all content canned — no user input) ── */
  function buildLine(ev, animate) {
    var wrap = document.createElement('div');
    if (ev.who === 'scene') {
      wrap.className = 'play-scene' + (animate ? ' play-enter' : '');
      wrap.textContent = ev.text;
    } else {
      wrap.className = 'chat-message ' + (ev.who === 'teacher' ? 'assistant' : 'user') + (animate ? ' play-enter' : '');
      var bubble = document.createElement('div');
      bubble.className = 'chat-bubble';
      var who = document.createElement('strong');
      who.className = 'play-who';
      who.textContent = ev.who === 'teacher' ? 'Sarah (educator)' : 'Child';
      bubble.appendChild(who);
      bubble.appendChild(document.createTextNode(ev.text));
      wrap.appendChild(bubble);
    }
    return wrap;
  }

  function buildEvidence(ev, animate) {
    var card = document.createElement('div');
    card.className = 'note-card play-ev' + (animate ? ' play-enter-pop' : '');
    card.dataset.evid = ev.id;
    var head = document.createElement('div');
    head.className = 'note-head';
    var src = document.createElement('span');
    src.className = 'note-source';
    src.textContent = ev.src;
    var stamp = document.createElement('span');
    stamp.className = 'ai-stamp';
    stamp.textContent = '✦ Auto-tagged';
    head.appendChild(src); head.appendChild(stamp);
    var raw = document.createElement('div');
    raw.className = 'note-raw';
    raw.textContent = ev.note;
    var tagline = document.createElement('div');
    tagline.className = 'note-tagline';
    var tag = document.createElement('span');
    tag.className = 'qtt-tag ' + ev.state;
    tag.textContent = ev.indicator + ' · ' + (ev.state === 'met' ? 'Met' : 'Emerging');
    tagline.appendChild(tag);
    card.appendChild(head); card.appendChild(raw); card.appendChild(tagline);
    return card;
  }

  function buildReport(ev, animate) {
    var sec = document.createElement('div');
    sec.className = 'play-rep-sec play-rep-' + ev.section + (animate ? ' play-enter' : '');
    var h = document.createElement('h5');
    h.textContent = ev.title;
    var p = document.createElement('p');
    p.textContent = ev.text;
    sec.appendChild(h); sec.appendChild(p);
    return sec;
  }

  /* ── Render: pure function of clock ───────────────────── */
  function render() {
    var want = visibleCount(clock);
    var jump = Math.abs(clock - lastRenderClock) > 1.5;
    var animate = playing && !jump && !REDUCED;
    lastRenderClock = clock;

    /* Mount / unmount timeline events (sorted, so end-ops only) */
    while (mounted > want) {
      mounted--;
      var evOld = EVENTS[mounted];
      var host = evOld.type === 'line' ? el.stage : evOld.type === 'evidence' ? el.evidence : el.report;
      if (host.lastElementChild) host.removeChild(host.lastElementChild);
    }
    while (mounted < want) {
      var ev = EVENTS[mounted];
      mounted++;
      var isLast = mounted === want;
      var anim = animate && isLast;
      if (ev.type === 'line') {
        el.stage.appendChild(buildLine(ev, anim));
        if (anim) el.stage.scrollTop = el.stage.scrollHeight;
      } else if (ev.type === 'evidence') {
        el.evidence.appendChild(buildEvidence(ev, anim));
      } else {
        el.report.appendChild(buildReport(ev, anim));
        if (anim) fileEvidence(ev.evidenceIds);
      }
    }
    if (!animate) el.stage.scrollTop = el.stage.scrollHeight;

    /* Empty-state hint */
    el.empty.style.display = want === 0 ? '' : 'none';

    /* Meters from visible evidence */
    var totals = { tci: 0, sst: 0, env: 0 };
    for (var i = 0; i < want; i++) {
      var e = EVENTS[i];
      if (e.type === 'evidence') totals[e.domain] = Math.min(DOMAINS[e.domain].cap, totals[e.domain] + e.weight);
    }
    Object.keys(DOMAINS).forEach(function (k) {
      var row = el.meters[k];
      row.fill.style.width = totals[k] + '%';
      row.pct.textContent = totals[k] + '%';
    });

    /* Synthesising state */
    var synth = clock >= SYNTH_START && clock < SYNTH_END;
    el.synth.style.display = synth ? '' : 'none';

    /* Report visibility + handoff CTA */
    var reportOn = clock >= 76;
    el.reportWrap.hidden = !reportOn;
    el.cta.style.display = clock >= 87 ? '' : 'none';
    if (clock >= 88) persistObservation();

    /* Transport */
    el.scrub.value = clock;
    el.time.textContent = fmt(clock) + ' / ' + fmt(DUR);
    el.playBtn.textContent = playing ? '❚❚' : (clock >= DUR ? '↺' : '▶');
    el.playBtn.setAttribute('aria-label', playing ? 'Pause' : clock >= DUR ? 'Replay' : 'Play');
  }

  /* Persist the completed observation once per page load (idempotent). */
  var persisted = false;
  function persistObservation() {
    if (persisted || !(window.pfDb && window.pfUser)) return;
    persisted = true;
    var evidence = EVENTS.filter(function (e) { return e.type === 'evidence'; });
    var report = {};
    EVENTS.filter(function (e) { return e.type === 'report'; }).forEach(function (e) {
      report[e.section] = e.text;
    });
    window.pfDb.from('observations').insert({
      observer: window.pfUser.id,
      educator_name: META.educator,
      class_name: META.klass,
      meta: { observer_name: META.observer, date: META.date, simulated: true },
      evidence: evidence,
      report: report
    }).then(function (r) {
      if (!r.error && window.pfToast) pfToast('Observation record saved');
      if (r.error) persisted = false;
    });
  }

  /* Evidence cards glow + "file" toward the report as it assembles */
  function fileEvidence(ids) {
    (ids || []).forEach(function (id) {
      var card = el.evidence.querySelector('[data-evid="' + id + '"]');
      if (!card) return;
      card.classList.remove('play-filed');
      void card.offsetWidth;
      card.classList.add('play-filed');
    });
  }

  /* ── Playback loop ────────────────────────────────────── */
  function tick(ts) {
    if (!playing) return;
    if (lastTs !== null) clock = Math.min(DUR, clock + (ts - lastTs) / 1000 * rate);
    lastTs = ts;
    render();
    if (clock >= DUR) { pause(); return; }
    rafId = requestAnimationFrame(tick);
  }
  function play() {
    if (clock >= DUR) { clock = 0; mounted = 0; clearHosts(); }
    playing = true; lastTs = null;
    rafId = requestAnimationFrame(tick);
    render();
  }
  function pause() {
    playing = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null; lastTs = null;
    render();
  }
  function clearHosts() {
    el.stage.querySelectorAll('.play-scene, .chat-message').forEach(function (n) { n.remove(); });
    el.evidence.innerHTML = '';
    el.report.innerHTML = '';
    lastRenderClock = 0;
  }
  function seek(v) {
    clock = Math.max(0, Math.min(DUR, v));
    /* Rebuild from scratch on backward seeks so DOM order stays exact */
    if (visibleCount(clock) < mounted) { mounted = 0; clearHosts(); }
    render();
  }

  /* ── Boot ─────────────────────────────────────────────── */
  function init() {
    var root = $('obsPlayer');
    if (!root) return;
    el.stage = $('playStage');
    el.empty = $('playEmpty');
    el.evidence = $('playEvidence');
    el.report = $('playReportBody');
    el.reportWrap = $('playReport');
    el.synth = $('playSynth');
    el.cta = $('playCta');
    el.playBtn = $('playBtn');
    el.scrub = $('playScrub');
    el.time = $('playTime');
    el.rateBtn = $('playRate');
    el.meters = {};
    Object.keys(DOMAINS).forEach(function (k) {
      el.meters[k] = { fill: $('meter-' + k), pct: $('meterpct-' + k) };
    });

    el.playBtn.addEventListener('click', function () { playing ? pause() : play(); });
    el.scrub.addEventListener('input', function () {
      // Read the target BEFORE pause(): pause() renders, and render()
      // writes the current clock back into the scrub input.
      var target = parseFloat(el.scrub.value);
      pause();
      seek(target);
    });
    el.rateBtn.addEventListener('click', function () {
      rate = rate === 1 ? 2 : 1;
      el.rateBtn.textContent = rate + '×';
    });

    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

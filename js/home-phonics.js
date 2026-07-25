/* ═══════════════════════════════════════════════════════════════
   PedaForge Home — Phonics Studio demo
   Sound chips speak their phoneme ("sh… as in ship"), the blending
   strip taps tiles for individual sounds then blends sh-i-p with
   accelerating audio and a springy tile slide-together, and reader
   Play buttons narrate title + first line with real TTS.
   Requires js/home-speech.js.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var PHONEME_SPEECH = {
    '/sh/': { sound: 'shh', cue: 'sh… as in ship' },
    '/ch/': { sound: 'chh', cue: 'ch… as in chip' }
  };

  var READER_LINES = {
    'Ship in the Fog': 'The big ship sails through the thick grey fog.',
    'Chip and the Chimp': 'Chip the chimp chomps on a big chunk of cherries.',
    'The Shell Shop': 'Shan sells shiny shells at the little shell shop.',
    'Champ on the Bench': 'Champ the pup sits on the bench and chews his chest ribbon.'
  };

  var BLEND_TILES = [
    { text: 'sh', sound: 'shh' },
    { text: 'i', sound: 'ih' },
    { text: 'p', sound: 'puh' }
  ];

  var tts = false;
  var blending = false;

  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ─── This week's sounds chips ───────────────────────────── */
  function wireSoundChips() {
    var chips = document.querySelectorAll('.ps-phoneme');
    chips.forEach(function (chip) {
      chip.style.cursor = 'pointer';
      chip.setAttribute('role', 'button');
      chip.setAttribute('tabindex', '0');
      chip.title = tts ? 'Tap to hear this sound' : 'Audio unavailable in this browser';
      function play() {
        var key = (chip.textContent.match(/\/[a-z]+\//) || [null])[0];
        var info = key ? PHONEME_SPEECH[key] : null;
        if (!info || !tts) return;
        bounce(chip);
        window.pfSpeech.speak(info.cue, { rate: 0.72 });
      }
      chip.addEventListener('click', play);
      chip.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); play(); }
      });
    });
  }

  function bounce(el) {
    if (reducedMotion()) return;
    el.classList.remove('ps-bounce');
    void el.offsetWidth;
    el.classList.add('ps-bounce');
  }

  /* ─── Blending strip ─────────────────────────────────────── */
  function speakSequence(items, gaps, done) {
    var i = 0;
    function next() {
      if (i >= items.length) { if (done) done(); return; }
      var item = items[i];
      var gap = gaps[Math.min(i, gaps.length - 1)];
      i += 1;
      if (typeof item.before === 'function') item.before();
      window.pfSpeech.speak(item.text, {
        rate: item.rate || 0.8,
        onend: function () { setTimeout(next, gap); }
      });
    }
    next();
  }

  function wireBlendStrip() {
    var strip = document.getElementById('psBlendTiles');
    var btn = document.getElementById('psBlendBtn');
    var word = document.getElementById('psBlendWord');
    if (!strip || !btn) return;

    var tiles = Array.prototype.slice.call(strip.querySelectorAll('.ps-blend-tile'));

    tiles.forEach(function (tile, i) {
      tile.addEventListener('click', function () {
        if (blending || !tts) return;
        bounce(tile);
        window.pfSpeech.speak(BLEND_TILES[i].sound, { rate: 0.72 });
      });
      if (!tts) tile.title = 'Audio unavailable — sounds shown visually';
    });

    btn.addEventListener('click', function () {
      if (blending) return;
      blending = true;
      btn.disabled = true;
      strip.classList.remove('blended');
      word.classList.remove('show');

      var seq = tiles.map(function (tile, i) {
        return {
          text: BLEND_TILES[i].sound,
          rate: 0.72,
          before: function () { bounce(tile); tile.classList.add('lit'); }
        };
      });

      function finish() {
        strip.classList.add('blended');       /* tiles slide together */
        setTimeout(function () {
          word.classList.add('show');
          if (tts) window.pfSpeech.speak('ship!', { rate: 0.85 });
          setTimeout(function () {
            strip.classList.remove('blended');
            word.classList.remove('show');
            tiles.forEach(function (tile) { tile.classList.remove('lit'); });
            blending = false;
            btn.disabled = false;
          }, 2400);
        }, reducedMotion() ? 80 : 420);
      }

      if (tts) {
        /* sounds accelerate: 500ms → 260ms → 90ms gaps, then the word */
        speakSequence(seq, [500, 260, 90], finish);
      } else {
        /* visual-only fallback: light tiles in rhythm, then slide */
        var i = 0;
        var delays = [0, 550, 950, 1250];
        tiles.forEach(function (tile, idx) {
          setTimeout(function () { bounce(tile); tile.classList.add('lit'); }, delays[idx]);
        });
        i = delays[delays.length - 1];
        setTimeout(finish, i + 250);
      }
    });
  }

  /* ─── Reader Play buttons ────────────────────────────────── */
  function wireReaders() {
    var cards = document.querySelectorAll('.ps-reader-card');
    cards.forEach(function (card) {
      var btn = card.querySelector('.ps-play');
      var titleEl = card.querySelector('.ps-reader-title');
      if (!btn || !titleEl) return;
      if (!tts) {
        btn.title = 'Audio unavailable in this browser';
        btn.style.opacity = '0.6';
        return;
      }
      btn.addEventListener('click', function () {
        var title = titleEl.textContent.trim();
        var line = READER_LINES[title] || '';
        btn.disabled = true;
        var label = btn.querySelector('.ps-play-label');
        if (label) label.textContent = 'Reading…';
        window.pfSpeech.speak(title + '. ' + line, {
          rate: 0.85,
          onend: function () {
            btn.disabled = false;
            if (label) label.textContent = 'Play reader';
          }
        });
      });
    });
  }

  /* ─── Read-along transport play button ───────────────────── */
  function wireReadAlong() {
    var play = document.querySelector('.ps-transport-play');
    var wordsEls = document.querySelectorAll('.ps-sentence .ps-word');
    var progressFill = document.querySelector('.ps-progress-fill');
    if (!play || wordsEls.length === 0) return;
    var running = false;
    play.addEventListener('click', function () {
      if (running) return;
      running = true;
      var words = Array.prototype.slice.call(wordsEls);
      var sentence = words.map(function (w) { return w.textContent; }).join(' ');
      words.forEach(function (w) { w.classList.remove('ps-read', 'ps-active'); });
      if (progressFill) {
        progressFill.style.transition = reducedMotion() ? 'none' : 'width 0.4s ease';
        progressFill.style.width = '0%';
      }
      var i = 0;
      var perWord = 430;
      function highlight() {
        if (i > 0) {
          words[i - 1].classList.remove('ps-active');
          words[i - 1].classList.add('ps-read');
        }
        if (i >= words.length) { running = false; return; }
        words[i].classList.add('ps-active');
        i += 1;
        if (progressFill) progressFill.style.width = Math.round((i / words.length) * 100) + '%';
        setTimeout(highlight, perWord);
      }
      highlight();
      if (tts) window.pfSpeech.speak(sentence, { rate: 0.72 });
    });
  }

  function init() {
    if (!window.pfSpeech) return;
    tts = window.pfSpeech.detect().tts;
    wireSoundChips();
    wireBlendStrip();
    wireReaders();
    wireReadAlong();
    /* honesty badge: karaoke word-timing is scripted in this POC */
    window.pfSpeech.simBadge(document.getElementById('psReadalongSim'), 'Simulated timing');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());

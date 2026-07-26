/* ═══════════════════════════════════════════════════════════════
   PedaForge Home - Sound Studio (kids paint-world)
   Sound bubbles speak their phoneme ("sh... as in ship"), the big
   blend-a-word strip taps tiles for individual sounds then blends
   sh-i-p with accelerating audio, a springy slide-together and a
   confetti celebration, and story Play buttons narrate title +
   first line with real TTS. "Read with me" lights each word up.
   Requires js/home-speech.js; celebration via js/pf-kids.js.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var PHONEME_SPEECH = {
    '/sh/': { sound: 'shh', cue: 'sh... as in ship' },
    '/ch/': { sound: 'chh', cue: 'ch... as in chip' }
  };

  /* Curriculum sound keys -> display + speech. Used only when the
     active child's class curriculum lists sounds; otherwise the
     hardcoded default pair above stays untouched. */
  var SOUND_DEFS = {
    sh: { label: '/sh/', example: 'as in ship', speak: 'shh... as in ship' },
    ch: { label: '/ch/', example: 'as in chip', speak: 'ch... as in chip' },
    th: { label: '/th/', example: 'as in thumb', speak: 'th... as in thumb' },
    a: { label: '/a/', example: 'as in apple', speak: 'ah... as in apple' },
    e: { label: '/e/', example: 'as in egg', speak: 'eh... as in egg' },
    i: { label: '/i/', example: 'as in igloo', speak: 'ih... as in igloo' },
    o: { label: '/o/', example: 'as in octopus', speak: 'oh... as in octopus' },
    u: { label: '/u/', example: 'as in umbrella', speak: 'uh... as in umbrella' }
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

  function wiggle(el) {
    if (reducedMotion()) return;
    el.classList.remove('k-wiggle');
    void el.offsetWidth;
    el.classList.add('k-wiggle');
  }

  function celebrate() {
    if (window.pfKids && window.pfKids.celebrate) window.pfKids.celebrate();
  }

  /* ─── This week's sounds bubbles ─────────────────────────── */
  var defaultSoundRowHTML = null;

  function wireSoundChips() {
    var chips = document.querySelectorAll('.k-sound');
    chips.forEach(function (chip) {
      if (!tts) chip.title = 'Audio unavailable in this browser';
      chip.addEventListener('click', function () {
        var cue = chip.dataset.speak;
        if (!cue) {
          var info = PHONEME_SPEECH[chip.dataset.phoneme];
          cue = info ? info.cue : '';
        }
        wiggle(chip);
        if (cue && tts) window.pfSpeech.speak(cue, { rate: 0.72 });
      });
    });
  }

  function buildSoundChip(key) {
    var def = SOUND_DEFS[key];
    var chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'k-chip k-sound';
    chip.dataset.phoneme = def.label;
    chip.dataset.speak = def.speak;
    chip.setAttribute('aria-label', 'Hear the sound ' + key + ', ' + def.example);
    chip.textContent = def.label;
    var small = document.createElement('small');
    small.textContent = def.example;
    chip.appendChild(small);
    return chip;
  }

  function curriculumSounds() {
    var cur = (window.pfKids && window.pfKids.curriculum) ? window.pfKids.curriculum() : null;
    if (!cur || !Array.isArray(cur.sounds)) return [];
    return cur.sounds.filter(function (key) {
      return Object.prototype.hasOwnProperty.call(SOUND_DEFS, key);
    });
  }

  function curriculumTheme() {
    var cur = (window.pfKids && window.pfKids.curriculum) ? window.pfKids.curriculum() : null;
    if (!cur || typeof cur.theme !== 'string') return '';
    return cur.theme.trim();
  }

  function applySoundRow() {
    var row = document.querySelector('.k-sound-row');
    if (!row) return;
    if (defaultSoundRowHTML === null) defaultSoundRowHTML = row.innerHTML;

    var keys = curriculumSounds();
    if (keys.length > 0) {
      row.textContent = '';
      keys.forEach(function (key) { row.appendChild(buildSoundChip(key)); });
    } else {
      row.innerHTML = defaultSoundRowHTML;  /* exact hardcoded default pair */
    }
    wireSoundChips();
  }

  function applyThemeLabel() {
    var el = document.getElementById('psThemeLabel');
    if (!el) return;
    var theme = curriculumTheme();
    el.textContent = theme ? 'Theme: ' + theme : '';
    el.hidden = !theme;
  }

  function applyCurriculum() {
    applySoundRow();
    applyThemeLabel();
  }

  /* ─── Blend-a-word strip ─────────────────────────────────── */
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

    var tiles = Array.prototype.slice.call(strip.querySelectorAll('.k-blend-tile'));

    tiles.forEach(function (tile, i) {
      tile.addEventListener('click', function () {
        if (blending) return;
        wiggle(tile);
        if (tts) window.pfSpeech.speak(BLEND_TILES[i].sound, { rate: 0.72 });
      });
      if (!tts) tile.title = 'Audio unavailable - sounds shown visually';
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
          before: function () { wiggle(tile); tile.classList.add('lit'); }
        };
      });

      function finish() {
        strip.classList.add('blended');       /* tiles slide together */
        setTimeout(function () {
          word.classList.add('show');
          celebrate();
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
        /* sounds accelerate: 500ms then 260ms then 90ms gaps, then the word */
        speakSequence(seq, [500, 260, 90], finish);
      } else {
        /* visual-only fallback: light tiles in rhythm, then slide */
        var delays = [0, 550, 950];
        tiles.forEach(function (tile, idx) {
          setTimeout(function () { wiggle(tile); tile.classList.add('lit'); }, delays[idx]);
        });
        setTimeout(finish, delays[delays.length - 1] + 550);
      }
    });
  }

  /* ─── Story shelf play buttons ───────────────────────────── */
  function wireReaders() {
    var cards = document.querySelectorAll('.k-reader');
    cards.forEach(function (card) {
      var btn = card.querySelector('.k-play');
      var titleEl = card.querySelector('.k-reader-title');
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
        wiggle(card);
        var label = btn.querySelector('.k-play-label');
        if (label) label.textContent = 'Reading...';
        window.pfSpeech.speak(title + '. ' + line, {
          rate: 0.85,
          onend: function () {
            btn.disabled = false;
            if (label) label.textContent = 'Play story';
          }
        });
      });
    });
  }

  /* ─── Read with me: light words up while speaking ────────── */
  function wireReadAlong() {
    var play = document.querySelector('.k-read-play');
    var wordEls = document.querySelectorAll('.k-sentence .k-word');
    var progressFill = document.querySelector('.k-read-fill');
    if (!play || wordEls.length === 0) return;
    var running = false;
    play.addEventListener('click', function () {
      if (running) return;
      running = true;
      wiggle(play);
      var words = Array.prototype.slice.call(wordEls);
      var sentence = words.map(function (w) { return w.textContent; }).join(' ');
      words.forEach(function (w) { w.classList.remove('done', 'on'); });
      if (progressFill) {
        progressFill.style.transition = reducedMotion() ? 'none' : 'width 0.4s ease';
        progressFill.style.width = '0%';
      }
      var i = 0;
      var perWord = 430;
      function highlight() {
        if (i > 0) {
          words[i - 1].classList.remove('on');
          words[i - 1].classList.add('done');
        }
        if (i >= words.length) { running = false; return; }
        words[i].classList.add('on');
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
    applyCurriculum();
    wireBlendStrip();
    wireReaders();
    wireReadAlong();
    document.addEventListener('pf-kid-change', applyCurriculum);
    /* honesty badge: karaoke word-timing is scripted in this POC */
    window.pfSpeech.simBadge(document.getElementById('psReadalongSim'), 'Simulated timing');
  }

  function boot() {
    if (window.pfAuthReady) window.pfAuthReady.then(init);
    else init();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}());

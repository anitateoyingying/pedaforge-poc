/* ═══════════════════════════════════════════════════════════════
   PedaForge Home — Talking Dictionary demo
   Jar chips load words into the search field with a typed-in caret
   animation; the word card re-renders from the curated data set
   (js/home-dictionary-data.js). Speaker & syllables use real TTS
   (wave bars animate only while speechSynthesis is speaking).
   Spell-it! is click-to-place tiles. Word status New → Learning →
   Known (hear + spell) persists in localStorage.
   Requires js/home-speech.js + js/home-dictionary-data.js.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var STORE_KEY = 'pedaforge:home:dictionary';
  var els = {};
  var words = [];
  var current = null;
  var progress = {};
  var typeTimer = null;
  var tts = false;
  var hasZh = false;

  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ─── Persistence (immutable-style updates) ──────────────── */
  function loadProgress() {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (err) { return {}; }
  }

  function saveProgress(next) {
    progress = next;
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch (err) { /* quota */ }
  }

  function syncWordToCloud(word) {
    if (!(window.pfDb && window.pfUser)) return;
    window.pfDb.from('dictionary_progress').upsert({
      user_id: window.pfUser.id,
      word: word,
      status: statusOf(word),
      updated_at: new Date().toISOString()
    }).then(function () { /* fire-and-forget */ });
  }

  function hydrateFromCloud() {
    if (!(window.pfDb && window.pfUser)) return;
    window.pfDb.from('dictionary_progress').select('word,status').then(function (r) {
      if (r.error || !r.data || !r.data.length) return;
      var next = {};
      Object.keys(progress).forEach(function (k) { next[k] = progress[k]; });
      r.data.forEach(function (row) {
        var local = statusOf(row.word);
        var rank = { 'new': 0, learning: 1, known: 2 };
        if (rank[row.status] > rank[local]) {
          next[row.word] = { heard: true, spelled: row.status === 'known' };
        }
      });
      saveProgress(next);
      renderJar();
    });
  }
  if (window.pfAuthReady) window.pfAuthReady.then(hydrateFromCloud);

  function recordEvent(word, field) {
    var entry = progress[word] || { heard: false, spelled: false };
    if (entry[field]) return;
    var updatedEntry = { heard: entry.heard || field === 'heard', spelled: entry.spelled || field === 'spelled' };
    var next = {};
    Object.keys(progress).forEach(function (k) { next[k] = progress[k]; });
    next[word] = updatedEntry;
    saveProgress(next);
    syncWordToCloud(word);
    renderJar();
  }

  function statusOf(word) {
    var e = progress[word];
    if (!e || (!e.heard && !e.spelled)) return 'new';
    if (e.heard && e.spelled) return 'known';
    return 'learning';
  }

  /* ─── Speaking with animated wave (only while speaking) ──── */
  function speakWithWave(text, opts) {
    if (!tts) return;
    var options = opts || {};
    els.wave.classList.add('speaking');
    window.pfSpeech.speak(text, {
      lang: options.lang,
      rate: (typeof options.rate === 'number') ? options.rate : 0.8,
      onend: function () {
        els.wave.classList.remove('speaking');
        if (typeof options.onend === 'function') options.onend();
      }
    });
  }

  /* ─── Word card rendering ────────────────────────────────── */
  function typeIntoSearch(word) {
    clearInterval(typeTimer);
    if (reducedMotion()) { els.searchText.textContent = word; return; }
    els.searchText.textContent = '';
    var i = 0;
    typeTimer = setInterval(function () {
      i += 1;
      els.searchText.textContent = word.slice(0, i);
      if (i >= word.length) clearInterval(typeTimer);
    }, 70);
  }

  function renderSyllables(entry) {
    els.syllables.textContent = '';
    var whole = document.createElement('button');
    whole.type = 'button';
    whole.className = 'syll-part syll-btn';
    whole.textContent = entry.word;
    whole.title = 'Tap to hear the whole word';
    els.syllables.appendChild(whole);

    var arrow = document.createElement('span');
    arrow.textContent = '→';
    arrow.setAttribute('aria-hidden', 'true');
    els.syllables.appendChild(arrow);

    entry.syllables.forEach(function (syll, i) {
      if (i > 0) {
        var dot = document.createElement('span');
        dot.textContent = '·';
        dot.style.color = 'var(--text-muted)';
        els.syllables.appendChild(dot);
      }
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'syll-part syll-btn';
      btn.textContent = syll;
      btn.title = tts ? 'Tap to hear this part' : 'Audio unavailable — syllables shown visually';
      els.syllables.appendChild(btn);
    });
  }

  function renderStarters(entry) {
    els.starters.textContent = '';
    entry.starters.forEach(function (starter) {
      var pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'starter-pill';
      var dot = document.createElement('span');
      dot.className = 'pill-dot';
      pill.appendChild(dot);
      pill.appendChild(document.createTextNode(starter));
      pill.title = tts ? 'Tap to hear this sentence starter' : '';
      els.starters.appendChild(pill);
    });
  }

  function shuffle(arr) {
    var copy = arr.slice();
    for (var i = copy.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
    }
    return copy;
  }

  function renderSpell(entry) {
    var letters = entry.word.split('');
    var scrambled = shuffle(letters);
    if (scrambled.join('') === entry.word && letters.length > 1) {
      scrambled = letters.slice(1).concat(letters[0]); /* guarantee a scramble */
    }
    els.spellWord.textContent = entry.word;
    els.tiles.textContent = '';
    els.slots.textContent = '';
    els.feedback.textContent = '';
    els.feedback.classList.remove('is-error');

    scrambled.forEach(function (letter) {
      var tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'letter-tile';
      tile.textContent = letter;
      tile.setAttribute('aria-label', 'Letter ' + letter + ' — tap to place');
      els.tiles.appendChild(tile);
    });
    letters.forEach(function () {
      var slot = document.createElement('button');
      slot.type = 'button';
      slot.className = 'spell-slot';
      slot.setAttribute('aria-label', 'Empty letter box — tap a placed letter to return it');
      els.slots.appendChild(slot);
    });
  }

  function loadWord(name) {
    var entry = null;
    for (var i = 0; i < words.length; i += 1) {
      if (words[i].word === name) { entry = words[i]; break; }
    }
    if (!entry) return;
    current = entry;

    typeIntoSearch(entry.word);
    els.resultWord.textContent = entry.word;
    els.definition.textContent = '';
    var strong = document.createElement('strong');
    strong.textContent = entry.word;
    var defParts = entry.definition.split(new RegExp('\\b' + entry.word + '\\b', 'i'));
    if (defParts.length >= 2) {
      els.definition.appendChild(document.createTextNode(defParts[0]));
      els.definition.appendChild(strong);
      els.definition.appendChild(document.createTextNode(defParts.slice(1).join(entry.word)));
    } else {
      els.definition.textContent = entry.definition;
    }
    els.example.textContent = entry.example;
    els.speakerBtn.setAttribute('aria-label', 'Say the word ' + entry.word + ' aloud');
    els.caption.textContent = tts
      ? 'Tap the speaker to hear “' + entry.word + '” spoken aloud · real browser TTS'
      : 'Audio unavailable — syllables shown visually';

    renderSyllables(entry);
    renderStarters(entry);
    renderSpell(entry);
    renderZh(entry);
    renderJar();
  }

  function renderZh(entry) {
    if (!hasZh || !entry.zh) { els.zhChip.hidden = true; return; }
    els.zhChip.hidden = false;
    els.zhText.textContent = entry.zh;
  }

  /* ─── Words Jar ──────────────────────────────────────────── */
  var STATUS_LABEL = { 'new': 'New', learning: 'Learning', known: 'Known' };

  function renderJar() {
    els.jarGrid.textContent = '';
    var knownCount = 0;
    words.forEach(function (entry) {
      var st = statusOf(entry.word);
      if (st === 'known') knownCount += 1;
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'word-chip jar-chip' + (current && current.word === entry.word ? ' jar-active' : '');
      chip.dataset.word = entry.word;
      var w = document.createElement('span');
      w.className = 'wc-word';
      w.textContent = entry.word;
      var s = document.createElement('span');
      s.className = 'wc-status ' + st;
      s.textContent = STATUS_LABEL[st];
      chip.appendChild(w);
      chip.appendChild(s);
      els.jarGrid.appendChild(chip);
    });

    var pct = Math.round((knownCount / words.length) * 100);
    els.ringPct.textContent = pct + '%';
    var circumference = 226.2;
    els.ringCircle.style.strokeDashoffset = String(circumference * (1 - pct / 100));
    els.ringText.textContent = knownCount + ' of ' + words.length + ' jar words are now Known. Hear a word and spell it to grow the jar.';
  }

  /* ─── Spell-it interactions (click-to-place) ─────────────── */
  function placeTile(tile) {
    var slots = els.slots.querySelectorAll('.spell-slot');
    for (var i = 0; i < slots.length; i += 1) {
      if (!slots[i].textContent.trim()) {
        slots[i].textContent = tile.textContent;
        slots[i].classList.add('filled');
        if (!reducedMotion()) {
          slots[i].classList.remove('pop');
          void slots[i].offsetWidth;
          slots[i].classList.add('pop');
        }
        tile.disabled = true;
        tile.classList.add('used');
        return;
      }
    }
  }

  function returnSlot(slot) {
    var letter = slot.textContent.trim();
    if (!letter) return;
    slot.textContent = '';
    slot.classList.remove('filled');
    var tiles = els.tiles.querySelectorAll('.letter-tile.used');
    for (var i = 0; i < tiles.length; i += 1) {
      if (tiles[i].textContent === letter) {
        tiles[i].disabled = false;
        tiles[i].classList.remove('used');
        return;
      }
    }
  }

  var PRAISE = [
    'Wonderful! You built the whole word!',
    'Yes! Every letter in its place!',
    'Super spelling — you did it!'
  ];

  function checkSpelling() {
    if (!current) return;
    var slots = els.slots.querySelectorAll('.spell-slot');
    var attempt = '';
    for (var i = 0; i < slots.length; i += 1) attempt += slots[i].textContent.trim();
    els.feedback.classList.remove('is-error');
    if (attempt.length < current.word.length) {
      els.feedback.textContent = 'Almost there — ' + (current.word.length - attempt.length) + ' more letter' + (current.word.length - attempt.length === 1 ? '' : 's') + ' to go!';
      return;
    }
    if (attempt === current.word) {
      els.feedback.textContent = PRAISE[Math.floor(Math.random() * PRAISE.length)];
      recordEvent(current.word, 'spelled');
      speakWithWave('You spelled ' + current.word + '! Well done!', { rate: 0.9 });
    } else {
      els.feedback.classList.add('is-error');
      els.feedback.textContent = 'Good try! Tap a letter to move it back and try a new order.';
    }
  }

  /* ─── Init ───────────────────────────────────────────────── */
  function init() {
    if (!window.pfSpeech || !window.PF_DICTIONARY) return;
    words = window.PF_DICTIONARY;
    progress = loadProgress();
    tts = window.pfSpeech.detect().tts;

    els.searchText = document.getElementById('dictSearchText');
    els.speakerBtn = document.getElementById('dictSpeakerBtn');
    els.wave = document.getElementById('dictWave');
    els.caption = document.getElementById('dictCaption');
    els.resultWord = document.getElementById('dictWord');
    els.syllables = document.getElementById('dictSyllables');
    els.zhChip = document.getElementById('dictZhChip');
    els.zhText = document.getElementById('dictZhText');
    els.definition = document.getElementById('dictDef');
    els.example = document.getElementById('dictExample');
    els.starters = document.getElementById('dictStarters');
    els.spellWord = document.getElementById('dictSpellWord');
    els.tiles = document.getElementById('dictTiles');
    els.slots = document.getElementById('dictSlots');
    els.checkBtn = document.getElementById('dictCheckBtn');
    els.feedback = document.getElementById('dictFeedback');
    els.jarGrid = document.getElementById('dictJarGrid');
    els.ringPct = document.getElementById('dictRingPct');
    els.ringCircle = document.getElementById('dictRingCircle');
    els.ringText = document.getElementById('dictRingText');
    if (!els.searchText || !els.jarGrid) return;

    if (!tts) {
      els.speakerBtn.title = 'Audio unavailable — syllables shown visually';
      els.speakerBtn.style.opacity = '0.55';
    }

    window.pfSpeech.hasVoiceFor('zh', function (found) {
      hasZh = found;
      if (current) renderZh(current);
    });

    els.speakerBtn.addEventListener('click', function () {
      if (!current || !tts) return;
      speakWithWave(current.word, {
        rate: 0.8,
        onend: function () { recordEvent(current.word, 'heard'); }
      });
    });

    els.syllables.addEventListener('click', function (event) {
      var btn = event.target.closest('.syll-btn');
      if (!btn || !tts) return;
      speakWithWave(btn.textContent, { rate: 0.7 });
      if (current && btn.textContent === current.word) recordEvent(current.word, 'heard');
    });

    els.starters.addEventListener('click', function (event) {
      var pill = event.target.closest('.starter-pill');
      if (!pill || !tts) return;
      speakWithWave(pill.textContent.replace(/…$/, ''), { rate: 0.9 });
    });

    els.zhChip.addEventListener('click', function () {
      if (!current || !tts || !hasZh) return;
      speakWithWave(current.zh, { lang: 'zh-CN', rate: 0.8 });
    });

    els.tiles.addEventListener('click', function (event) {
      var tile = event.target.closest('.letter-tile');
      if (tile && !tile.disabled) placeTile(tile);
    });
    els.slots.addEventListener('click', function (event) {
      var slot = event.target.closest('.spell-slot');
      if (slot) returnSlot(slot);
    });
    els.checkBtn.addEventListener('click', checkSpelling);

    els.jarGrid.addEventListener('click', function (event) {
      var chip = event.target.closest('.jar-chip');
      if (chip) loadWord(chip.dataset.word);
    });

    loadWord('ship');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());

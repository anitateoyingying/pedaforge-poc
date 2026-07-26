/* ═══════════════════════════════════════════════════════════════
   PedaForge Home - shared speech module (classic script, no deps)
   window.pfSpeech = { detect, speak, stop, listen, whenVoices,
                       hasVoiceFor, simBadge }
   - TTS voice picked async via onvoiceschanged with fallback chain
     en-SG → en-GB → en (zh-CN honoured when requested & available).
   - STT wraps (webkit)SpeechRecognition with interim results.
   All failures degrade gracefully: speak()/listen() return null or
   false instead of throwing, so callers can fall back to Simulated
   Demo Mode without dead-ending.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var Recognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  var synth = ('speechSynthesis' in window) ? window.speechSynthesis : null;

  /* ─── Voice loading (async on most browsers) ─────────────── */
  var voicesCache = [];
  var voicesReady = false;
  var voiceWaiters = [];

  function flushWaiters() {
    var waiting = voiceWaiters.slice();
    voiceWaiters = [];
    waiting.forEach(function (fn) {
      try { fn(voicesCache); } catch (err) { /* keep other waiters alive */ }
    });
  }

  function loadVoices() {
    if (!synth) return;
    var list = [];
    try { list = synth.getVoices() || []; } catch (err) { list = []; }
    if (list.length > 0) {
      voicesCache = list;
      voicesReady = true;
      flushWaiters();
    }
  }

  if (synth) {
    loadVoices();
    try { synth.onvoiceschanged = loadVoices; } catch (err) { /* older engines */ }
    // Some engines never fire onvoiceschanged - poll briefly, then give up
    // gracefully (speak() still works with the default voice).
    setTimeout(loadVoices, 300);
    setTimeout(function () {
      if (!voicesReady) { voicesReady = true; flushWaiters(); }
    }, 1800);
  } else {
    voicesReady = true;
  }

  function whenVoices(fn) {
    if (voicesReady) { fn(voicesCache); return; }
    voiceWaiters.push(fn);
  }

  /* Quality-scored voice picking. Browsers list voices from best to
     worst in no particular order; the first en-* hit is often a
     robotic legacy engine (eSpeak on Linux, ancient SAPI on Windows)
     even when far better voices are installed. Score every candidate
     and take the best within the preferred-language chain. */
  function voiceQuality(v) {
    var name = String(v.name || '');
    var score = 0;
    if (/natural|neural/i.test(name)) score += 50;      // Edge online natural voices
    if (/^Google/i.test(name)) score += 40;             // Chrome Google voices
    if (/premium|enhanced|superior|hd\b/i.test(name)) score += 30; // macOS enhanced tiers
    if (/siri|samantha|karen|serena|moira|tessa|libby|sonia|aria|jenny/i.test(name)) score += 15;
    if (v.localService === false) score += 12;          // cloud voices beat local engines
    if (/female|woman/i.test(name)) score += 6;         // gentler default for young children
    if (/espeak|festival|pico|robosoft|klatt/i.test(name)) score -= 60; // robotic engines
    if (/compact/i.test(name)) score -= 15;             // low-quality compact variants
    return score;
  }

  function pickVoice(lang) {
    var chain;
    if (lang && lang.indexOf('zh') === 0) {
      chain = ['zh-CN', 'zh'];
    } else if (lang) {
      chain = [lang, 'en-SG', 'en-GB', 'en'];
    } else {
      chain = ['en-SG', 'en-GB', 'en'];
    }

    /* Manual override (set localStorage 'pedaforge:voice' to a voice
       name substring to force a specific voice). */
    var override = '';
    try { override = localStorage.getItem('pedaforge:voice') || ''; } catch (err) { /* private mode */ }
    if (override) {
      for (var o = 0; o < voicesCache.length; o += 1) {
        if (String(voicesCache[o].name || '').toLowerCase().indexOf(override.toLowerCase()) >= 0) {
          return voicesCache[o];
        }
      }
    }

    for (var i = 0; i < chain.length; i += 1) {
      var pref = chain[i].toLowerCase();
      var best = null;
      var bestScore = -Infinity;
      for (var j = 0; j < voicesCache.length; j += 1) {
        var vLang = (voicesCache[j].lang || '').toLowerCase().replace('_', '-');
        if (vLang.indexOf(pref) !== 0) continue;
        var s = voiceQuality(voicesCache[j]);
        if (s > bestScore) { bestScore = s; best = voicesCache[j]; }
      }
      if (best) return best;
    }
    return null;
  }

  /* ─── Public API ─────────────────────────────────────────── */
  function detect() {
    return { stt: !!Recognition, tts: !!synth };
  }

  function hasVoiceFor(langPrefix, cb) {
    whenVoices(function (voices) {
      var found = voices.some(function (v) {
        return (v.lang || '').toLowerCase().replace('_', '-').indexOf(langPrefix.toLowerCase()) === 0;
      });
      cb(found);
    });
  }

  /* Generation guard: each non-queued speak() supersedes the last.
     Stale utterances (a) never reach synth.speak if a newer request
     arrived while voices were still loading, and (b) have their
     onstart/onboundary/onend callbacks ignored once superseded, so
     caller UI state is never torn down by a cancelled utterance. */
  var speakGeneration = 0;

  /**
   * speak(text, opts) → true if dispatched, false if TTS unavailable.
   * opts: { lang, rate, pitch, onstart, onend, onboundary, keepQueue }
   */
  function speak(text, opts) {
    if (!synth || !text) {
      if (opts && typeof opts.onend === 'function') opts.onend();
      return false;
    }
    var options = opts || {};
    var requestId;
    if (options.keepQueue) {
      requestId = speakGeneration; // ride along with the current generation
    } else {
      speakGeneration += 1;
      requestId = speakGeneration;
      try { synth.cancel(); } catch (err) { /* ignore */ }
    }
    function isStale() { return requestId !== speakGeneration; }
    whenVoices(function () {
      if (isStale()) return; // superseded while voices were loading
      var utter = new SpeechSynthesisUtterance(String(text));
      var voice = pickVoice(options.lang);
      if (voice) utter.voice = voice;
      if (options.lang) utter.lang = options.lang;
      utter.rate = (typeof options.rate === 'number') ? options.rate : 0.95;
      utter.pitch = (typeof options.pitch === 'number') ? options.pitch : 1.05;
      if (typeof options.onstart === 'function') {
        utter.onstart = function (event) {
          if (!isStale()) options.onstart(event);
        };
      }
      if (typeof options.onboundary === 'function') {
        utter.onboundary = function (event) {
          if (!isStale()) options.onboundary(event);
        };
      }
      var ended = false;
      function finish() {
        if (ended || isStale()) return;
        ended = true;
        if (typeof options.onend === 'function') options.onend();
      }
      utter.onend = finish;
      utter.onerror = finish;
      try { synth.speak(utter); } catch (err) { finish(); }
    });
    return true;
  }

  function stopSpeaking() {
    speakGeneration += 1; // invalidate any in-flight or deferred utterances
    if (synth) {
      try { synth.cancel(); } catch (err) { /* ignore */ }
    }
  }

  /**
   * listen(opts) → controller { stop(), abort() } or null when STT
   * is unsupported (caller must fall back to Simulated Demo Mode).
   * opts: { lang, onresult(transcript, isFinal), onerror(code), onend }
   */
  function listen(opts) {
    if (!Recognition) return null;
    var options = opts || {};
    var rec;
    try { rec = new Recognition(); } catch (err) { return null; }

    rec.lang = options.lang || 'en-SG';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    var stopped = false;

    rec.onresult = function (event) {
      var finals = '';
      var interim = '';
      for (var i = 0; i < event.results.length; i += 1) {
        var chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) { finals += ' ' + chunk; } else { interim += ' ' + chunk; }
      }
      if (typeof options.onresult === 'function') {
        options.onresult((finals + ' ' + interim).trim(), interim.trim() === '');
      }
    };
    rec.onerror = function (event) {
      if (typeof options.onerror === 'function') options.onerror(event.error || 'unknown');
    };
    rec.onend = function () {
      if (typeof options.onend === 'function') options.onend(stopped);
    };

    try { rec.start(); } catch (err) { return null; }

    return {
      stop: function () {
        stopped = true;
        try { rec.stop(); } catch (err) { /* ignore */ }
      },
      abort: function () {
        stopped = true;
        try { rec.abort(); } catch (err) { /* ignore */ }
      }
    };
  }

  /**
   * simBadge(el, label) - injects a visible "Simulated" pill so the
   * grant panel is never misled by scripted content. Styled inline
   * (via element.style, not HTML strings) so it works on every page.
   */
  function simBadge(el, label) {
    if (!el) return null;
    var existing = el.querySelector(':scope > .sim-badge');
    if (existing) {
      existing.hidden = false;
      return existing;
    }
    var pill = document.createElement('span');
    pill.className = 'sim-badge';
    pill.textContent = label || 'Simulated';
    pill.style.display = 'inline-flex';
    pill.style.alignItems = 'center';
    pill.style.gap = '6px';
    pill.style.padding = '4px 12px';
    pill.style.borderRadius = '100px';
    pill.style.fontSize = '0.7rem';
    pill.style.fontWeight = '700';
    pill.style.letterSpacing = '0.4px';
    pill.style.textTransform = 'uppercase';
    pill.style.background = 'var(--accent-proposal-soft, rgba(14,143,168,0.10))';
    pill.style.color = 'var(--accent-proposal, #0E8FA8)';
    pill.style.border = '1px dashed var(--accent-proposal-line, rgba(14,143,168,0.24))';
    var dot = document.createElement('span');
    dot.style.width = '7px';
    dot.style.height = '7px';
    dot.style.borderRadius = '50%';
    dot.style.background = 'currentColor';
    dot.style.flexShrink = '0';
    pill.insertBefore(dot, pill.firstChild);
    el.appendChild(pill);
    return pill;
  }

  window.pfSpeech = {
    detect: detect,
    speak: speak,
    stop: stopSpeaking,
    listen: listen,
    whenVoices: whenVoices,
    hasVoiceFor: hasVoiceFor,
    simBadge: simBadge
  };
}());

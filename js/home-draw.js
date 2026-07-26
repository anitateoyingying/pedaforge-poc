/* ═══════════════════════════════════════════════════════════════
   PedaForge Home - Paint Corner (kids paint-world skin)
   Pointer-events canvas painting (brush / eraser / star stamp,
   paint-blob colours), immutable stroke-array undo, feeling faces,
   and an optional spoken story (browser STT via pfSpeech).
   "I'm done!" uploads the canvas to storage, inserts an `artworks`
   row for the dock's active child (pf-kid-change event), and asks
   the AI for a warm reflection (friendly canned prompts on AI
   error). The reflection appears in a painted speech bubble from a
   little brush buddy, with a button to hear it read aloud. Saves
   celebrate with confetti and refresh the dock star counter.
   The gallery shows the child's last 8 artworks as polaroids.
   Requires pf-auth.js + pf-api.js + pf-kids.js (+ home-speech.js).
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var CANVAS_W = 640;
  var CANVAS_H = 480;
  var GALLERY_LIMIT = 8;
  var STORY_MAX = 220;

  var REFLECTION_PROMPTS = [
    'What a colourful story! I can see you worked hard on this. What part did you enjoy painting the most?',
    'Thank you for sharing your picture with me! If your painting could talk, what would it say?',
    'I love how you kept going and filled your page. What would you add if you painted it again tomorrow?'
  ];

  var FEEL_LABEL = { happy: 'Happy', okay: 'Okay', tricky: 'Tricky' };

  var els = {};
  var ctx = null;
  var strokes = [];        // committed strokes (immutable snapshots)
  var liveStroke = null;   // stroke in progress
  var tool = 'brush';
  var colour = '#ff7d6b';
  var drawing = false;
  var promptIndex = 0;
  var reflecting = false;
  var pickedChild = null;  // {id,name} from the dock, or null
  var pickedFeeling = 'happy';
  var story = '';          // what the child said about the picture
  var micCtl = null;       // active STT controller or null

  /* ─── Rendering (full redraw from the stroke array) ──────── */
  function drawStroke(stroke) {
    if (stroke.kind === 'stamp') {
      drawStar(stroke.x, stroke.y, stroke.colour);
      return;
    }
    if (stroke.points.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = stroke.kind === 'erase' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = stroke.colour;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (var i = 1; i < stroke.points.length; i += 1) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    if (stroke.points.length === 1) {
      ctx.lineTo(stroke.points[0].x + 0.1, stroke.points[0].y + 0.1);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawStar(cx, cy, fill) {
    var spikes = 5;
    var outer = 26;
    var inner = 11;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = fill;
    ctx.beginPath();
    for (var i = 0; i < spikes * 2; i += 1) {
      var r = (i % 2 === 0) ? outer : inner;
      var angle = (Math.PI / spikes) * i - Math.PI / 2;
      var px = cx + Math.cos(angle) * r;
      var py = cy + Math.sin(angle) * r;
      if (i === 0) { ctx.moveTo(px, py); } else { ctx.lineTo(px, py); }
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function redraw() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    strokes.forEach(drawStroke);
    if (liveStroke) drawStroke(liveStroke);
  }

  /* ─── Pointer plumbing ───────────────────────────────────── */
  function canvasPoint(event) {
    var rect = els.canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (CANVAS_W / rect.width),
      y: (event.clientY - rect.top) * (CANVAS_H / rect.height)
    };
  }

  function onPointerDown(event) {
    event.preventDefault();
    els.canvas.setPointerCapture(event.pointerId);
    var pt = canvasPoint(event);
    if (tool === 'stamp') {
      strokes = strokes.concat([{ kind: 'stamp', x: pt.x, y: pt.y, colour: colour }]);
      redraw();
      updateUndo();
      return;
    }
    drawing = true;
    liveStroke = {
      kind: tool === 'eraser' ? 'erase' : 'draw',
      colour: colour,
      width: tool === 'eraser' ? 34 : 10,
      points: [pt]
    };
    redraw();
  }

  function onPointerMove(event) {
    if (!drawing || !liveStroke) return;
    var pt = canvasPoint(event);
    liveStroke = {
      kind: liveStroke.kind,
      colour: liveStroke.colour,
      width: liveStroke.width,
      points: liveStroke.points.concat([pt])
    };
    redraw();
  }

  function onPointerUp() {
    if (!drawing) return;
    drawing = false;
    if (liveStroke && liveStroke.points.length > 0) {
      strokes = strokes.concat([liveStroke]);
    }
    liveStroke = null;
    redraw();
    updateUndo();
  }

  function undo() {
    if (strokes.length === 0) return;
    strokes = strokes.slice(0, -1); /* new array - no mutation */
    redraw();
    updateUndo();
  }

  function updateUndo() {
    els.undoBtn.disabled = strokes.length === 0;
  }

  /* ─── Tools & paint blobs ────────────────────────────────── */
  function wireTools() {
    els.toolBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        tool = btn.dataset.tool;
        els.toolBtns.forEach(function (b) { b.classList.toggle('on', b === btn); });
      });
    });
    els.paints.forEach(function (blob) {
      blob.addEventListener('click', function () {
        colour = blob.dataset.colour;
        els.paints.forEach(function (p) { p.classList.toggle('on', p === blob); });
        blob.classList.remove('k-wiggle');
        void blob.offsetWidth; /* restart the one-shot wiggle */
        blob.classList.add('k-wiggle');
        if (tool === 'eraser') {
          tool = 'brush';
          els.toolBtns.forEach(function (b) { b.classList.toggle('on', b.dataset.tool === 'brush'); });
        }
      });
    });
  }

  /* ─── Feelings ───────────────────────────────────────────── */
  function wireFeelings() {
    els.feelings.forEach(function (btn) {
      btn.addEventListener('click', function () {
        pickedFeeling = btn.dataset.feeling || 'happy';
        els.feelings.forEach(function (b) {
          var active = b === btn;
          b.classList.toggle('on', active);
          b.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
      });
    });
  }

  /* ─── "Tell me about it": browser STT story ──────────────── */
  function setMicIdle() {
    micCtl = null;
    if (els.micBtn) {
      els.micBtn.classList.remove('listening');
      if (els.micLabel) els.micLabel.textContent = 'Tell me about it';
    }
  }

  function toggleMic() {
    if (micCtl) { micCtl.stop(); return; }
    if (!window.pfSpeech) return;
    var ctl = window.pfSpeech.listen({
      onresult: function (transcript) {
        story = String(transcript || '').slice(0, STORY_MAX);
        if (els.said) els.said.textContent = story ? '"' + story + '"' : '';
      },
      onerror: function () {
        if (window.pfToast) pfToast('The microphone is having a nap - you can still save your picture!');
      },
      onend: setMicIdle
    });
    if (!ctl) {
      if (window.pfToast) pfToast('This browser cannot listen - you can still save your picture!');
      if (els.micRow) els.micRow.hidden = true;
      return;
    }
    micCtl = ctl;
    els.micBtn.classList.add('listening');
    if (els.micLabel) els.micLabel.textContent = 'I am listening... tap to stop';
  }

  function wireMic() {
    if (!els.micBtn) return;
    var can = window.pfSpeech && window.pfSpeech.detect && window.pfSpeech.detect().stt;
    if (!can) {
      if (els.micRow) els.micRow.hidden = true;
      return;
    }
    els.micBtn.addEventListener('click', toggleMic);
  }

  /* ─── Brush buddy speech bubble ──────────────────────────── */
  function buddyIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M9.06 11.9l8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/>' +
      '<path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/></svg>';
  }
  function soundIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>';
  }

  function makeBubble() {
    els.reflectChat.hidden = false;
    els.reflectChat.textContent = '';
    var buddy = document.createElement('span');
    buddy.className = 'k-buddy';
    buddy.innerHTML = buddyIcon();
    var bubble = document.createElement('div');
    bubble.className = 'k-bubble';
    var dots = document.createElement('span');
    dots.className = 'k-dots';
    for (var i = 0; i < 3; i += 1) dots.appendChild(document.createElement('span'));
    bubble.appendChild(dots);
    els.reflectChat.appendChild(buddy);
    els.reflectChat.appendChild(bubble);
    return bubble;
  }

  function fillBubble(bubble, reflection) {
    bubble.textContent = reflection; /* textContent - safe for AI output */
    var tools = document.createElement('div');
    tools.className = 'k-bubble-tools';
    if (window.pfSpeech && window.pfSpeech.detect().tts) {
      var hear = document.createElement('button');
      hear.type = 'button';
      hear.className = 'k-hear';
      hear.setAttribute('aria-label', 'Hear it out loud');
      hear.innerHTML = soundIcon();
      hear.addEventListener('click', function () {
        window.pfSpeech.speak(reflection, { rate: 0.92 });
      });
      tools.appendChild(hear);
    }
    var tag = document.createElement('span');
    tag.className = 'k-ai-tag';
    tag.textContent = 'AI made this - a grown-up can change it';
    tools.appendChild(tag);
    bubble.appendChild(tools);
  }

  /* ─── "I'm done!": save artwork + real AI reflection ─────── */
  function saveArtwork(reflection) {
    if (!(window.pfDb && window.pfUser && window.pfApi)) return Promise.resolve(null);
    return new Promise(function (resolve) {
      els.canvas.toBlob(function (blob) {
        if (!blob) { resolve(null); return; }
        var file = new File([blob], 'drawing.png', { type: 'image/png' });
        window.pfApi.uploadArtefact(file, 'artwork')
          .then(function (path) {
            return window.pfDb.from('artworks').insert({
              owner: window.pfUser.id,
              child_id: pickedChild ? pickedChild.id : null,
              image_path: path,
              feeling: pickedFeeling,
              reflection: reflection || null
            });
          })
          .then(function (r) {
            if (r && r.error) {
              if (window.pfToast) pfToast('Could not save the picture: ' + r.error.message);
              resolve(null);
              return;
            }
            if (window.pfToast) pfToast('Hung in ' + (pickedChild ? pickedChild.name.split(' ')[0] + '\'s' : 'your') + ' gallery!');
            if (window.pfKids) {
              window.pfKids.celebrate();
              window.pfKids.refreshStars();
            }
            story = '';
            if (els.said) els.said.textContent = '';
            loadGallery();
            resolve(true);
          })
          .catch(function (e) {
            if (window.pfToast) pfToast('Could not save the picture: ' + e.message);
            resolve(null);
          });
      }, 'image/png');
    });
  }

  function showReflection() {
    if (reflecting) return;
    if (strokes.length === 0) {
      if (window.pfToast) pfToast('Paint something first - then press I\'m done!');
      if (els.doneBtn) {
        els.doneBtn.classList.remove('k-wiggle');
        void els.doneBtn.offsetWidth;
        els.doneBtn.classList.add('k-wiggle');
      }
      return;
    }
    if (micCtl) micCtl.stop(); /* finish listening before we save */
    reflecting = true;
    var done = window.pfApi ? window.pfApi.spinner(els.doneBtn, 'Saving your picture...') : function () {};
    var bubble = makeBubble();

    var fallback = REFLECTION_PROMPTS[promptIndex % REFLECTION_PROMPTS.length];
    promptIndex += 1;

    var description = 'a child\'s drawing';
    if (story) description += '. The child said about it: "' + story + '"';

    var aiPromise = (window.pfApi && window.pfApi.ai)
      ? window.pfApi.ai('reflect', { description: description, feeling: pickedFeeling })
      : Promise.reject(new Error('AI unavailable'));

    aiPromise
      .catch(function () {
        if (window.pfToast) pfToast('The AI friend is resting - here is a friendly thought instead');
        return fallback;
      })
      .then(function (text) {
        var reflection = (typeof text === 'string' && text.trim()) ? text.trim() : fallback;
        fillBubble(bubble, reflection);
        return saveArtwork(reflection);
      })
      .then(function () {
        done();
        reflecting = false;
      });
  }

  /* ─── Polaroid gallery (last artworks, signed URLs) ──────── */
  function loadGallery() {
    var host = els.gallery;
    var hint = els.galleryHint;
    if (!host || !(window.pfDb && window.pfUser)) return;
    var q = window.pfDb.from('artworks')
      .select('id,image_path,feeling,reflection,created_at')
      .order('created_at', { ascending: false })
      .limit(GALLERY_LIMIT);
    if (pickedChild) q = q.eq('child_id', pickedChild.id);
    q.then(function (r) {
      host.textContent = '';
      if (r.error) {
        if (hint) hint.textContent = 'Could not load the gallery: ' + r.error.message;
        return;
      }
      var rows = r.data || [];
      var first = pickedChild ? pickedChild.name.split(' ')[0] : null;
      if (!rows.length) {
        if (hint) {
          hint.textContent = first
            ? 'No pictures for ' + first + ' yet - press "I\'m done!" to hang the first one.'
            : 'Finished pictures hang here - press "I\'m done!" to hang the first one.';
        }
        return;
      }
      if (hint) hint.textContent = (first ? first + '\'s' : 'Your') + ' newest pictures, hot off the easel.';
      rows.forEach(function (art) {
        var card = document.createElement('div');
        card.className = 'k-polaroid';
        var img = document.createElement('img');
        img.alt = 'A saved painting';
        card.appendChild(img);
        window.pfApi.artefactUrl(art.image_path).then(function (url) {
          if (url) img.src = url;
        });
        var title = document.createElement('b');
        title.textContent = art.reflection
          ? art.reflection.slice(0, 46) + (art.reflection.length > 46 ? '...' : '')
          : 'A little story';
        card.appendChild(title);
        var meta = document.createElement('div');
        meta.className = 'k-pol-meta';
        var date = document.createElement('span');
        date.className = 'k-pol-date';
        date.textContent = window.pfApi.ago(art.created_at);
        meta.appendChild(date);
        if (art.feeling && FEEL_LABEL[art.feeling]) {
          var tag = document.createElement('span');
          tag.className = 'k-pol-feel ' + art.feeling;
          tag.textContent = FEEL_LABEL[art.feeling];
          meta.appendChild(tag);
        }
        card.appendChild(meta);
        host.appendChild(card);
      });
    });
  }

  /* ─── Dock child wiring ──────────────────────────────────── */
  function onKidChange(kid) {
    pickedChild = kid ? { id: kid.id, name: kid.name } : null;
    var line = document.getElementById('drKidLine');
    if (line) {
      line.textContent = pickedChild
        ? 'What will you paint today, ' + pickedChild.name.split(' ')[0] + '?'
        : 'Paint a picture, then tell its story!';
    }
    loadGallery();
  }

  /* ─── Init ───────────────────────────────────────────────── */
  function init() {
    els.canvas = document.getElementById('drCanvas');
    els.undoBtn = document.getElementById('drUndoBtn');
    els.doneBtn = document.getElementById('drDoneBtn');
    els.reflectChat = document.getElementById('drReflectChat');
    els.gallery = document.getElementById('drGallery');
    els.galleryHint = document.getElementById('drGalleryHint');
    els.micRow = document.getElementById('drMicRow');
    els.micBtn = document.getElementById('drMicBtn');
    els.micLabel = document.getElementById('drMicLabel');
    els.said = document.getElementById('drSaid');
    if (!els.canvas || !els.undoBtn) return;

    els.toolBtns = Array.prototype.slice.call(document.querySelectorAll('.k-tool[data-tool]'));
    els.paints = Array.prototype.slice.call(document.querySelectorAll('.k-paint[data-colour]'));
    els.feelings = Array.prototype.slice.call(document.querySelectorAll('.k-feel[data-feeling]'));

    ctx = els.canvas.getContext('2d');

    els.canvas.addEventListener('pointerdown', onPointerDown);
    els.canvas.addEventListener('pointermove', onPointerMove);
    els.canvas.addEventListener('pointerup', onPointerUp);
    els.canvas.addEventListener('pointercancel', onPointerUp);

    els.undoBtn.addEventListener('click', undo);
    if (els.doneBtn) els.doneBtn.addEventListener('click', showReflection);

    wireTools();
    wireFeelings();
    wireMic();
    updateUndo();
  }

  function boot() {
    init();
    if (!window.pfAuthReady) return;
    window.pfAuthReady.then(function (ctx2) {
      if (!ctx2.user) return;
      /* pf-kids.js fires pf-kid-change after loading classes (and once
         at load), so the dock's active child drives child_id + gallery. */
      document.addEventListener('pf-kid-change', function (e) { onKidChange(e.detail); });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}());

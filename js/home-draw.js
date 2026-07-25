/* ═══════════════════════════════════════════════════════════════
   PedaForge Home — Draw, Write & Reflect
   Pointer-events canvas drawing (brush / eraser / star stamp,
   colour swatches), immutable stroke-array undo, feeling faces.
   "I'm done" uploads the canvas to storage, inserts an `artworks`
   row for the picked child, and asks the AI for a warm reflection
   (falling back to friendly canned prompts on AI error). The
   gallery rail shows the child's last 6 artworks via signed URLs.
   Requires pf-auth.js + pf-api.js.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var CANVAS_W = 460;
  var CANVAS_H = 340;

  var REFLECTION_PROMPTS = [
    'What a colourful story! I can see you worked hard on this. What part did you enjoy drawing the most?',
    'Thank you for sharing your picture with me! If your drawing could talk, what would it say?',
    'I love how you kept going and filled your page. What would you add if you drew it again tomorrow?'
  ];

  var els = {};
  var ctx = null;
  var strokes = [];        // committed strokes (immutable snapshots)
  var liveStroke = null;   // stroke in progress
  var tool = 'brush';
  var colour = '#0E8FA8';
  var drawing = false;
  var promptIndex = 0;
  var reflecting = false;
  var pickedChild = null;  // {id,name} or null
  var pickedFeeling = 'happy';

  var FEEL_LABEL = { happy: 'Happy', okay: 'Okay', tricky: 'Tricky' };

  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

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
    var outer = 20;
    var inner = 8.5;
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
      width: tool === 'eraser' ? 26 : 7,
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
    strokes = strokes.slice(0, -1); /* new array — no mutation */
    redraw();
    updateUndo();
  }

  function updateUndo() {
    els.undoBtn.disabled = strokes.length === 0;
  }

  /* ─── Tools & swatches ───────────────────────────────────── */
  function wireTools() {
    els.toolBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        tool = btn.dataset.tool;
        els.toolBtns.forEach(function (b) { b.classList.toggle('active', b === btn); });
      });
    });
    els.swatches.forEach(function (swatch) {
      swatch.addEventListener('click', function () {
        colour = swatch.dataset.colour;
        els.swatches.forEach(function (s) { s.classList.toggle('active', s === swatch); });
        if (tool === 'eraser') {
          tool = 'brush';
          els.toolBtns.forEach(function (b) { b.classList.toggle('active', b.dataset.tool === 'brush'); });
        }
      });
    });
  }

  /* ─── Feelings ───────────────────────────────────────────── */
  function feelingOf(btn) {
    var label = btn.querySelector('.dr-feeling-label');
    return label ? label.textContent.trim().toLowerCase() : 'happy';
  }

  function wireFeelings() {
    els.feelings.forEach(function (btn) {
      btn.addEventListener('click', function () {
        pickedFeeling = feelingOf(btn);
        els.feelings.forEach(function (b) {
          var active = b === btn;
          b.classList.toggle('active', active);
          b.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
      });
    });
  }

  /* ─── "I'm done": save artwork + real AI reflection ──────── */
  function makeBubble() {
    els.reflectChat.hidden = false;
    els.reflectChat.textContent = '';
    var bubbleWrap = document.createElement('div');
    bubbleWrap.className = 'chat-message assistant';
    var avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = 'PF';
    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    var typing = document.createElement('div');
    typing.className = 'typing-indicator';
    for (var i = 0; i < 3; i += 1) typing.appendChild(document.createElement('span'));
    bubble.appendChild(typing);
    bubbleWrap.appendChild(avatar);
    bubbleWrap.appendChild(bubble);
    els.reflectChat.appendChild(bubbleWrap);
    var badge = document.createElement('div');
    badge.style.marginTop = '8px';
    var badgeSpan = document.createElement('span');
    badgeSpan.className = 'pf-ai-badge';
    badgeSpan.textContent = '✦ AI-generated · editable';
    badge.appendChild(badgeSpan);
    els.reflectChat.appendChild(badge);
    return bubble;
  }

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
            if (window.pfToast) pfToast('Picture saved to ' + (pickedChild ? pickedChild.name + '’s' : 'your') + ' gallery');
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
      if (window.pfToast) pfToast('Draw something first — then press I’m done!');
      return;
    }
    reflecting = true;
    var done = window.pfApi ? window.pfApi.spinner(els.doneBtn, 'Saving…') : function () {};
    var bubble = makeBubble();

    var fallback = REFLECTION_PROMPTS[promptIndex % REFLECTION_PROMPTS.length];
    promptIndex += 1;

    var aiPromise = (window.pfApi && window.pfApi.ai)
      ? window.pfApi.ai('reflect', {
          description: 'a child\'s drawing' + (pickedFeeling ? ' while feeling ' + pickedFeeling : ''),
          feeling: pickedFeeling
        })
      : Promise.reject(new Error('AI unavailable'));

    aiPromise
      .catch(function (e) {
        if (window.pfToast) pfToast('AI reflection unavailable — using a friendly prompt instead');
        return fallback;
      })
      .then(function (text) {
        var reflection = (typeof text === 'string' && text.trim()) ? text.trim() : fallback;
        bubble.textContent = reflection; /* textContent — safe for AI output */
        return saveArtwork(reflection);
      })
      .then(function () {
        done();
        reflecting = false;
      });
  }

  /* ─── Live gallery (last 6 artworks, signed URLs) ────────── */
  function loadGallery() {
    var host = document.getElementById('drGallery');
    var hint = document.getElementById('drGalleryHint');
    if (!host || !(window.pfDb && window.pfUser)) return;
    var q = window.pfDb.from('artworks')
      .select('id,image_path,feeling,reflection,created_at')
      .order('created_at', { ascending: false })
      .limit(6);
    if (pickedChild) q = q.eq('child_id', pickedChild.id);
    q.then(function (r) {
      host.textContent = '';
      if (r.error) { if (hint) hint.textContent = 'Could not load the gallery: ' + r.error.message; return; }
      var rows = r.data || [];
      if (!rows.length) {
        if (hint) {
          hint.textContent = pickedChild
            ? 'No pictures for ' + pickedChild.name + ' yet — press “I’m done!” to save the first one.'
            : 'Finished pictures land here — press “I’m done!” to save the first one.';
        }
        return;
      }
      if (hint) hint.textContent = (pickedChild ? pickedChild.name + '’s' : 'Your') + ' latest little stories.';
      rows.forEach(function (art) {
        var card = document.createElement('div');
        card.className = 'dr-story';
        var thumb = document.createElement('div');
        thumb.className = 'dr-story-thumb';
        thumb.style.background = 'rgba(14,143,168,0.10)';
        thumb.style.overflow = 'hidden';
        var img = document.createElement('img');
        img.alt = 'Saved drawing';
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:14px;';
        thumb.appendChild(img);
        window.pfApi.artefactUrl(art.image_path).then(function (url) {
          if (url) img.src = url;
        });
        var body = document.createElement('div');
        body.className = 'dr-story-body';
        var title = document.createElement('div');
        title.className = 'dr-story-title';
        title.textContent = art.reflection ? art.reflection.slice(0, 48) + (art.reflection.length > 48 ? '…' : '') : 'A little story';
        var date = document.createElement('div');
        date.className = 'dr-story-date';
        date.textContent = window.pfApi.ago(art.created_at);
        body.appendChild(title);
        body.appendChild(date);
        if (art.feeling && FEEL_LABEL[art.feeling]) {
          var tag = document.createElement('span');
          tag.className = 'dr-feel-tag ' + art.feeling;
          tag.textContent = FEEL_LABEL[art.feeling];
          body.appendChild(tag);
        }
        card.appendChild(thumb);
        card.appendChild(body);
        host.appendChild(card);
      });
    });
  }

  /* ─── Child picker ───────────────────────────────────────── */
  function initChildPicker() {
    var host = document.getElementById('drPickerHost');
    var title = document.getElementById('drPickerTitle');
    if (!host || !window.pfApi || !window.pfApi.childPicker) { loadGallery(); return; }
    window.pfApi.childPicker(host, {
      allowNone: true,
      onPick: function (child) {
        pickedChild = child ? { id: child.id, name: child.name } : null;
        if (title) title.textContent = pickedChild ? pickedChild.name + ' is drawing today' : 'Who is drawing today?';
        loadGallery();
      }
    });
  }
  if (window.pfAuthReady) window.pfAuthReady.then(initChildPicker);

  /* ─── Init ───────────────────────────────────────────────── */
  function init() {
    els.canvas = document.getElementById('drCanvas');
    els.undoBtn = document.getElementById('drUndoBtn');
    els.doneBtn = document.getElementById('drDoneBtn');
    els.reflectChat = document.getElementById('drReflectChat');
    if (!els.canvas || !els.undoBtn) return;

    els.toolBtns = Array.prototype.slice.call(document.querySelectorAll('.dr-tool[data-tool]'));
    els.swatches = Array.prototype.slice.call(document.querySelectorAll('.dr-swatch[data-colour]'));
    els.feelings = Array.prototype.slice.call(document.querySelectorAll('.dr-feeling'));

    ctx = els.canvas.getContext('2d');

    els.canvas.addEventListener('pointerdown', onPointerDown);
    els.canvas.addEventListener('pointermove', onPointerMove);
    els.canvas.addEventListener('pointerup', onPointerUp);
    els.canvas.addEventListener('pointercancel', onPointerUp);

    els.undoBtn.addEventListener('click', undo);
    if (els.doneBtn) els.doneBtn.addEventListener('click', showReflection);

    wireTools();
    wireFeelings();
    updateUndo();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());

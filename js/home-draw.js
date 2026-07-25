/* ═══════════════════════════════════════════════════════════════
   PedaForge Home — Draw, Write & Reflect demo
   Pointer-events canvas drawing (brush / eraser / star stamp,
   colour swatches), immutable stroke-array undo, feeling faces,
   and an "I'm done" canned AI reflection bubble with a typing
   indicator (visible Simulated badge — never misleads the panel).
   Requires js/home-speech.js (for the sim badge helper only).
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
  function wireFeelings() {
    els.feelings.forEach(function (btn) {
      btn.addEventListener('click', function () {
        els.feelings.forEach(function (b) {
          var active = b === btn;
          b.classList.toggle('active', active);
          b.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
      });
    });
  }

  /* ─── Canned AI reflection with typing indicator ─────────── */
  function showReflection() {
    if (reflecting) return;
    reflecting = true;
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

    if (window.pfSpeech) {
      var badgeRow = document.createElement('div');
      badgeRow.style.marginTop = '8px';
      els.reflectChat.appendChild(badgeRow);
      window.pfSpeech.simBadge(badgeRow, 'Simulated AI response');
    }

    var text = REFLECTION_PROMPTS[promptIndex % REFLECTION_PROMPTS.length];
    promptIndex += 1;

    setTimeout(function () {
      bubble.textContent = text; /* canned copy, no user input involved */
      reflecting = false;
    }, reducedMotion() ? 250 : 1400);
  }

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

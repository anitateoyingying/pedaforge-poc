/* SproutSpace Interactive Layout Planner
   Drag-and-drop classroom canvas with a live safety-rule engine.
   Static POC — all rules run client-side; no backend. */
(function () {
  'use strict';

  /* ── Constants ─────────────────────────────────────────── */
  var COLS = 12, ROWS = 8;           // 1 cell = 0.5 m → 6 m × 4 m room
  var U = 100;                        // SVG units per cell (viewBox 1200×800)
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var LS_KEY = 'pedaforge:sproutspace:layouts';

  var TYPES = {
    lowshelf:  { name: 'Low Shelf',      w: 4, h: 1, hM: 0.9, cls: 'shelf',   solid: true },
    tallshelf: { name: 'Tall Shelf',     w: 3, h: 1, hM: 1.5, cls: 'shelf lp-tall', solid: true },
    table:     { name: 'Activity Table', w: 3, h: 2, hM: 0.5, cls: 'table',   solid: true },
    rug:       { name: 'Circle Rug',     w: 4, h: 3, hM: 0,   cls: 'rug',     solid: false, round: true },
    reading:   { name: 'Reading Corner', w: 3, h: 2, hM: 0.4, cls: 'reading', solid: true },
    sink:      { name: 'Water / Sink',   w: 2, h: 1, hM: 0.9, cls: 'sink',    solid: true, water: true },
    socket:    { name: 'Power Socket',   w: 1, h: 1, hM: 0.3, cls: 'lp-socket', solid: false, fixture: true },
    door:      { name: 'Door / Exit',    w: 2, h: 1, hM: 2,   cls: 'door',    solid: false, fixture: true, door: true }
  };

  var AGE_RULES = {
    ic: { label: 'Infant Care',      shelfMax: 0.9, density: 0.40 },
    pg: { label: 'Playgroup',        shelfMax: 0.9, density: 0.40 },
    n1: { label: 'Nursery N1',       shelfMax: 1.2, density: 0.50 },
    n2: { label: 'Nursery N2',       shelfMax: 1.2, density: 0.50 },
    k1: { label: 'Kindergarten K1',  shelfMax: 1.2, density: 0.55 },
    k2: { label: 'Kindergarten K2',  shelfMax: 1.2, density: 0.55 }
  };

  function P(type, x, y, w, h) { return { type: type, x: x, y: y, w: w, h: h }; }
  var PRESETS = {
    ic: { age: 'ic', items: [P('door',1,7,2,1), P('rug',4,2,4,4), P('lowshelf',4,0,4,1), P('reading',0,1,3,2), P('lowshelf',11,2,1,4)] },
    n2: { age: 'n2', items: [P('door',1,7,2,1), P('rug',4,3,4,3), P('lowshelf',4,0,4,1), P('reading',0,1,3,2), P('table',9,3,3,2), P('sink',10,7,2,1)] },
    k1: { age: 'k1', items: [P('door',1,7,2,1), P('lowshelf',4,0,4,1), P('reading',0,1,3,2), P('lowshelf',9,1,3,1), P('rug',4,3,4,3), P('table',9,3,3,2), P('table',5,6,3,1), P('sink',9,7,2,1)] },
    k2: { age: 'k2', items: [P('door',1,7,2,1), P('lowshelf',4,0,4,1), P('table',0,1,3,2), P('lowshelf',9,1,3,1), P('rug',4,3,4,3), P('table',9,3,3,2), P('reading',0,4,3,2), P('sink',9,7,2,1)] }
  };

  var RULE_META = {
    exit:      { sev: 'danger', cite: 'SCDF Fire Code — 1 m egress clearance' },
    unreach:   { sev: 'warn',   cite: 'SCDF — unobstructed evacuation routes' },
    blocked:   { sev: 'danger', cite: 'SCDF — exit must remain accessible' },
    egress2:   { sev: 'warn',   cite: 'SCDF — two independent evacuation paths' },
    sightline: { sev: 'danger', cite: 'ECDA licensing — continuous visual supervision' },
    shelfage:  { sev: 'warn',   cite: 'ECDA SOP — storage height by age band' },
    wetdry:    { sev: 'warn',   cite: 'ECDA environment guidelines — wet/dry separation' },
    socket:    { sev: 'danger', cite: 'SS 550 — electrical clearance from water points' },
    density:   { sev: 'warn',   cite: 'ECDA licensing — per-child activity space' }
  };

  /* ── State (immutable items array; render() is the only writer) ── */
  var state = { age: 'k1', items: [], selected: null, past: [], future: [] };
  var nextId = 1;
  var lastEval = { violations: [], score: 100 };

  function mkItem(type, x, y, w, h) {
    var t = TYPES[type];
    return { id: 'i' + (nextId++), type: type, x: x, y: y, w: w || t.w, h: h || t.h };
  }
  function commit(items) {
    state.past.push(state.items);
    if (state.past.length > 60) state.past.shift();
    state.future = [];
    state.items = items;
    render();
  }

  /* ── Geometry helpers ──────────────────────────────────── */
  function expand(r, d) { return { x: r.x - d, y: r.y - d, w: r.w + 2 * d, h: r.h + 2 * d }; }
  function overlaps(a, b) { return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h; }
  function centre(r) { return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }
  function touchesWall(r) { return r.x <= 0 || r.y <= 0 || r.x + r.w >= COLS || r.y + r.h >= ROWS; }

  /* Liang–Barsky: does segment p0→p1 pass through rect r? */
  function segHitsRect(p0, p1, r) {
    var t0 = 0, t1 = 1, dx = p1.x - p0.x, dy = p1.y - p0.y;
    var p = [-dx, dx, -dy, dy];
    var q = [p0.x - r.x, r.x + r.w - p0.x, p0.y - r.y, r.y + r.h - p0.y];
    for (var i = 0; i < 4; i++) {
      if (p[i] === 0) { if (q[i] < 0) return false; }
      else {
        var t = q[i] / p[i];
        if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
        else { if (t < t0) return false; if (t < t1) t1 = t; }
      }
    }
    return t0 < t1; // strictly-through, grazing an edge doesn't count
  }

  function occupancy(items) {
    var g = [];
    for (var y = 0; y < ROWS; y++) { g.push([]); for (var x = 0; x < COLS; x++) g[y].push(false); }
    items.forEach(function (it) {
      if (!TYPES[it.type].solid) return;
      for (var y = it.y; y < it.y + it.h; y++)
        for (var x = it.x; x < it.x + it.w; x++)
          if (y >= 0 && y < ROWS && x >= 0 && x < COLS) g[y][x] = true;
    });
    return g;
  }

  function bfs(grid, seeds, blocked) {
    var dist = {}, parent = {}, queue = [];
    seeds.forEach(function (s) {
      var k = s.x + ',' + s.y;
      if (grid[s.y] && !grid[s.y][s.x] && !(blocked && blocked[k])) { dist[k] = 0; parent[k] = null; queue.push(s); }
    });
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var qi = 0; qi < queue.length; qi++) {
      var c = queue[qi], ck = c.x + ',' + c.y;
      for (var d = 0; d < 4; d++) {
        var nx = c.x + dirs[d][0], ny = c.y + dirs[d][1], nk = nx + ',' + ny;
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
        if (grid[ny][nx] || dist[nk] !== undefined || (blocked && blocked[nk])) continue;
        dist[nk] = dist[ck] + 1; parent[nk] = ck; queue.push({ x: nx, y: ny });
      }
    }
    return { dist: dist, parent: parent };
  }

  /* ── Safety-rule engine ───────────────────────────────── */
  function evaluate(items, age) {
    var vs = [];
    var rules = AGE_RULES[age];
    var doors = items.filter(function (i) { return TYPES[i.type].door; });
    var solids = items.filter(function (i) { return TYPES[i.type].solid; });
    function add(rule, msg, ids) { vs.push({ rule: rule, sev: RULE_META[rule].sev, msg: msg, cite: RULE_META[rule].cite, itemIds: ids || [] }); }

    /* 1 · Exit clearance (1 m) */
    doors.forEach(function (door) {
      var zone = expand(door, 2);
      solids.forEach(function (it) {
        if (overlaps(zone, it)) add('exit', 'Exit obstruction: ' + TYPES[it.type].name + ' within 1 m of the exit.', [it.id, door.id]);
      });
    });

    if (doors.length) {
      var grid = occupancy(items);
      var door = doors[0];
      var seeds = [];
      for (var x = Math.max(0, door.x - 1); x < Math.min(COLS, door.x + door.w + 1); x++)
        for (var y = Math.max(0, door.y - 1); y < Math.min(ROWS, door.y + door.h + 1); y++)
          seeds.push({ x: x, y: y });

      var run1 = bfs(grid, seeds, null);
      var startFound = Object.keys(run1.dist).length > 0;

      /* 2 · Walkways / reachability */
      if (!startFound) {
        add('blocked', 'The exit is completely walled in — no clear floor beside the door.', [door.id]);
      } else {
        var freeTotal = 0, reached = 0;
        for (var yy = 0; yy < ROWS; yy++) for (var xx = 0; xx < COLS; xx++) {
          if (!grid[yy][xx]) { freeTotal++; if (run1.dist[xx + ',' + yy] !== undefined) reached++; }
        }
        if (freeTotal - reached > 2) add('unreach', (freeTotal - reached) + ' floor cells are cut off from the exit — walkway below 1 m.', []);

        /* 3 · Second egress: far wall reachable twice via disjoint paths */
        var farWall = [];
        for (var fx = 0; fx < COLS; fx++) farWall.push({ x: fx, y: 0 }); // door sits on the bottom wall in presets
        var goal = null;
        farWall.forEach(function (c) {
          var k = c.x + ',' + c.y;
          if (run1.dist[k] !== undefined && (!goal || run1.dist[k] < run1.dist[goal])) goal = k;
        });
        if (goal) {
          var blockedCells = {}, walk = goal;
          while (walk && run1.parent[walk] !== null) { blockedCells[walk] = true; walk = run1.parent[walk]; }
          var run2 = bfs(grid, seeds, blockedCells);
          var second = farWall.some(function (c) { return run2.dist[c.x + ',' + c.y] !== undefined; });
          if (!second) add('egress2', 'Only one clear evacuation route reaches the far side of the room.', []);
        } else if (startFound) {
          add('egress2', 'No clear evacuation route reaches the far side of the room.', []);
        }
      }
    }

    /* 4 · Sightline from the circle rug */
    var rug = items.filter(function (i) { return i.type === 'rug'; })[0];
    var origin = rug ? centre(rug) : { x: COLS / 2, y: ROWS / 2 };
    var zones = items.filter(function (i) { return (i.type === 'reading' || i.type === 'table') && i !== rug; });
    var tall = items.filter(function (i) { return TYPES[i.type].hM > 1.2; });
    zones.forEach(function (z) {
      tall.forEach(function (t) {
        if (t === z) return;
        if (segHitsRect(origin, centre(z), t)) {
          add('sightline', 'Blind spot: ' + TYPES[t.type].name + ' (' + TYPES[t.type].hM.toFixed(1) + ' m) blocks the educator sightline to the ' + TYPES[z.type].name + '.', [t.id, z.id]);
        }
      });
    });

    /* 5 · Storage height by age band */
    items.forEach(function (it) {
      var t = TYPES[it.type];
      if (t.hM > rules.shelfMax && t.solid && !touchesWall(it)) {
        add('shelfage', TYPES[it.type].name + ' (' + t.hM.toFixed(1) + ' m) exceeds the ' + rules.shelfMax.toFixed(1) + ' m mid-room limit for ' + rules.label + ' — move it to a wall.', [it.id]);
      }
    });

    /* 6 · Wet/dry separation */
    items.filter(function (i) { return TYPES[i.type].water; }).forEach(function (sink) {
      var zone = expand(sink, 3);
      items.forEach(function (it) {
        if ((it.type === 'rug' || it.type === 'reading') && overlaps(zone, it)) {
          add('wetdry', TYPES[it.type].name + ' sits within 1.5 m of water play — keep quiet/dry zones separated.', [it.id, sink.id]);
        }
      });
    });

    /* 7 · Sockets near water */
    items.filter(function (i) { return i.type === 'socket'; }).forEach(function (soc) {
      var zone = expand(soc, 2);
      items.forEach(function (it) {
        if (TYPES[it.type].water && overlaps(zone, it)) {
          add('socket', 'Power socket within 1 m of a water point.', [soc.id, it.id]);
        }
      });
    });

    /* 8 · Furniture density cap */
    var area = 0;
    items.forEach(function (it) { if (TYPES[it.type].solid) area += it.w * it.h; });
    var pct = area / (COLS * ROWS);
    if (pct > rules.density) {
      add('density', 'Furniture covers ' + Math.round(pct * 100) + '% of the floor — above the ' + Math.round(rules.density * 100) + '% cap for ' + rules.label + '.', []);
    }

    var score = 100;
    vs.forEach(function (v) { score -= v.sev === 'danger' ? 12 : 5; });
    return { violations: vs, score: Math.max(0, score) };
  }

  /* ── DOM refs ─────────────────────────────────────────── */
  var canvas, overlay, ringFill, scoreText, scoreState, flagsEl, ageSel, presetSel, savedSel, hintEl, submitBtn;

  function $(id) { return document.getElementById(id); }

  /* ── Placement validity ───────────────────────────────── */
  function inBounds(r) { return r.x >= 0 && r.y >= 0 && r.x + r.w <= COLS && r.y + r.h <= ROWS; }
  function collides(items, r, ignoreId) {
    return items.some(function (it) {
      if (it.id === ignoreId) return false;
      if (it.type === 'socket' || r.type === 'socket') return false; // wall fixture may share a cell edge zone
      return overlaps(it, r);
    });
  }
  function validPlace(items, r, ignoreId) { return inBounds(r) && !collides(items, r, ignoreId); }

  /* ── Rendering ────────────────────────────────────────── */
  function pct(v, total) { return (v / total * 100) + '%'; }

  function render() {
    var result = evaluate(state.items, state.age);
    lastEval = result;
    renderItems();
    renderOverlay(result.violations);
    renderInspector(result);
  }

  function renderItems() {
    canvas.querySelectorAll('.furn').forEach(function (n) { n.remove(); });
    state.items.forEach(function (it) {
      var t = TYPES[it.type];
      var el = document.createElement('div');
      el.className = 'furn ' + t.cls;
      el.dataset.id = it.id;
      el.style.left = pct(it.x, COLS); el.style.top = pct(it.y, ROWS);
      el.style.width = pct(it.w, COLS); el.style.height = pct(it.h, ROWS);
      if (t.round) el.style.borderRadius = '50%';
      el.textContent = t.name;
      canvas.appendChild(el);
    });
    applySelection();
  }

  /* In-place selection sync — never rebuilds nodes, so an active
     pointer capture on a dragged element is preserved. */
  function applySelection() {
    canvas.querySelectorAll('.furn').forEach(function (el) {
      var isSel = el.dataset.id === state.selected;
      el.classList.toggle('lp-selected', isSel);
      var hs = el.querySelector('.lp-handles');
      if (isSel && !hs) {
        hs = document.createElement('span');
        hs.className = 'lp-handles';
        var rot = document.createElement('button');
        rot.className = 'lp-handle'; rot.title = 'Rotate (R)'; rot.textContent = '↻'; rot.dataset.act = 'rotate';
        var del = document.createElement('button');
        del.className = 'lp-handle lp-handle-del'; del.title = 'Delete (Del)'; del.textContent = '✕'; del.dataset.act = 'delete';
        hs.appendChild(rot); hs.appendChild(del);
        el.appendChild(hs);
      } else if (!isSel && hs) {
        hs.remove();
      }
    });
  }

  function renderOverlay(violations) {
    var parts = [];
    var byItem = {};
    violations.forEach(function (v) { v.itemIds.forEach(function (id) { byItem[id] = v.sev; }); });

    /* Exit-clearance zone glows red when violated */
    var exitViolated = violations.some(function (v) { return v.rule === 'exit' || v.rule === 'blocked'; });
    state.items.filter(function (i) { return TYPES[i.type].door; }).forEach(function (door) {
      var z = expand(door, 2);
      parts.push('<rect x="' + z.x * U + '" y="' + z.y * U + '" width="' + z.w * U + '" height="' + z.h * U +
        '" rx="24" class="lp-exit-zone' + (exitViolated ? ' lp-exit-zone-bad' : '') + '"/>');
    });

    /* Sightline rays from rug centre to each zone; shadow cone behind blockers */
    var rug = state.items.filter(function (i) { return i.type === 'rug'; })[0];
    var origin = rug ? centre(rug) : { x: COLS / 2, y: ROWS / 2 };
    var zones = state.items.filter(function (i) { return (i.type === 'reading' || i.type === 'table'); });
    var tall = state.items.filter(function (i) { return TYPES[i.type].hM > 1.2; });
    zones.forEach(function (z) {
      var c = centre(z);
      var blockedBy = null;
      tall.forEach(function (t) { if (!blockedBy && segHitsRect(origin, c, t)) blockedBy = t; });
      parts.push('<line x1="' + origin.x * U + '" y1="' + origin.y * U + '" x2="' + c.x * U + '" y2="' + c.y * U +
        '" class="' + (blockedBy ? 'lp-ray lp-ray-bad' : 'lp-ray') + '"/>');
    });
    /* Shadow cones */
    tall.forEach(function (t) {
      var corners = [{ x: t.x, y: t.y }, { x: t.x + t.w, y: t.y }, { x: t.x + t.w, y: t.y + t.h }, { x: t.x, y: t.y + t.h }];
      var best = null;
      corners.forEach(function (a, i) {
        corners.forEach(function (b, j) {
          if (i >= j) return;
          var angA = Math.atan2(a.y - origin.y, a.x - origin.x);
          var angB = Math.atan2(b.y - origin.y, b.x - origin.x);
          var diff = Math.abs(angA - angB);
          if (diff > Math.PI) diff = 2 * Math.PI - diff;
          if (!best || diff > best.diff) best = { a: a, b: b, diff: diff };
        });
      });
      if (!best) return;
      function far(pnt) {
        var dx = pnt.x - origin.x, dy = pnt.y - origin.y;
        var len = Math.sqrt(dx * dx + dy * dy) || 1;
        return { x: pnt.x + dx / len * 30, y: pnt.y + dy / len * 30 };
      }
      var fa = far(best.a), fb = far(best.b);
      parts.push('<polygon points="' + best.a.x * U + ',' + best.a.y * U + ' ' + best.b.x * U + ',' + best.b.y * U + ' ' +
        fb.x * U + ',' + fb.y * U + ' ' + fa.x * U + ',' + fa.y * U + '" class="lp-shadow"/>');
    });

    overlay.innerHTML = parts.join('');

    /* Violation outline classes on items */
    canvas.querySelectorAll('.furn').forEach(function (el) {
      el.classList.remove('lp-viol-warn', 'lp-viol-danger');
      var sev = byItem[el.dataset.id];
      if (sev) el.classList.add(sev === 'danger' ? 'lp-viol-danger' : 'lp-viol-warn');
    });
  }

  var scoreShown = null;
  function renderInspector(result) {
    var score = result.score;
    /* Ring */
    var C = 2 * Math.PI * 52;
    ringFill.style.strokeDasharray = C;
    ringFill.style.strokeDashoffset = C * (1 - score / 100);
    ringFill.setAttribute('class', 'lp-ring-fill ' + (score >= 90 ? 'lp-ring-good' : score >= 70 ? 'lp-ring-warn' : 'lp-ring-bad'));

    /* Animated count */
    if (scoreShown === null || REDUCED) { scoreShown = score; scoreText.textContent = score + '%'; }
    else if (scoreShown !== score) {
      var from = scoreShown, to = score, t0 = null;
      scoreShown = score;
      (function step(ts) {
        if (!t0) t0 = ts;
        var p = Math.min(1, (ts - t0) / 500);
        p = 1 - Math.pow(1 - p, 3);
        scoreText.textContent = Math.round(from + (to - from) * p) + '%';
        if (p < 1) requestAnimationFrame(step);
      })(performance.now());
    }

    /* State line + submit */
    if (score === 100) {
      scoreState.textContent = 'Ready for Director approval';
      scoreState.className = 'lp-score-state lp-good';
      submitBtn.disabled = false;
    } else {
      var d = result.violations.filter(function (v) { return v.sev === 'danger'; }).length;
      scoreState.textContent = d ? d + ' critical issue' + (d > 1 ? 's' : '') + ' to resolve' : 'Minor advisories open';
      scoreState.className = 'lp-score-state ' + (d ? 'lp-bad' : 'lp-warnc');
      submitBtn.disabled = true;
    }

    /* Flags */
    flagsEl.innerHTML = '';
    if (!result.violations.length) {
      var ok = document.createElement('div');
      ok.className = 'safety-flag ok';
      ok.innerHTML = '<span class="safety-ico">✓</span><span>All ' + Object.keys(RULE_META).length + ' safety rules pass for ' + AGE_RULES[state.age].label + '.</span>';
      flagsEl.appendChild(ok);
    }
    result.violations.forEach(function (v) {
      var f = document.createElement('div');
      f.className = 'safety-flag ' + (v.sev === 'danger' ? 'danger' : 'warn') + ' lp-flag';
      f.setAttribute('role', 'button'); f.tabIndex = 0;
      var ico = document.createElement('span'); ico.className = 'safety-ico'; ico.textContent = v.sev === 'danger' ? '✖' : '⚠';
      var body = document.createElement('span');
      var msg = document.createElement('span'); msg.textContent = v.msg;
      var cite = document.createElement('em'); cite.className = 'lp-cite'; cite.textContent = v.cite;
      body.appendChild(msg); body.appendChild(document.createElement('br')); body.appendChild(cite);
      f.appendChild(ico); f.appendChild(body);
      f.addEventListener('click', function () { pulseItems(v.itemIds); });
      f.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pulseItems(v.itemIds); } });
      flagsEl.appendChild(f);
    });
  }

  function pulseItems(ids) {
    ids.forEach(function (id) {
      var el = canvas.querySelector('.furn[data-id="' + id + '"]');
      if (!el) return;
      el.scrollIntoView({ block: 'nearest', behavior: REDUCED ? 'auto' : 'smooth' });
      el.classList.remove('lp-pulse');
      void el.offsetWidth; // restart animation
      el.classList.add('lp-pulse');
    });
  }

  /* ── Pointer interactions ─────────────────────────────── */
  function cellFromEvent(e) {
    var r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width * COLS,
      y: (e.clientY - r.top) / r.height * ROWS,
      inside: e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
    };
  }

  function initCanvasDrag() {
    canvas.addEventListener('pointerdown', function (e) {
      var furn = e.target.closest('.furn');
      if (!furn || !canvas.contains(furn)) { select(null); return; }
      if (e.target.closest('.lp-handle')) return; // handles handled by click
      var id = furn.dataset.id;
      var item = state.items.filter(function (i) { return i.id === id; })[0];
      if (!item) return;
      select(id);
      e.preventDefault();
      furn.setPointerCapture(e.pointerId);

      var start = cellFromEvent(e);
      var grab = { x: start.x - item.x, y: start.y - item.y };
      var live = { x: item.x, y: item.y };
      var moved = false;

      function onMove(ev) {
        var c = cellFromEvent(ev);
        var nx = Math.round(c.x - grab.x), ny = Math.round(c.y - grab.y);
        nx = Math.max(0, Math.min(COLS - item.w, nx));
        ny = Math.max(0, Math.min(ROWS - item.h, ny));
        if (nx === live.x && ny === live.y) return;
        live = { x: nx, y: ny };
        moved = true;
        furn.style.left = pct(nx, COLS); furn.style.top = pct(ny, ROWS);
        var trial = { id: item.id, type: item.type, x: nx, y: ny, w: item.w, h: item.h };
        var ok = validPlace(state.items, trial, item.id);
        furn.classList.toggle('lp-ghost-bad', !ok);
        if (ok) {
          var trialItems = state.items.map(function (i) { return i.id === item.id ? trial : i; });
          var res = evaluate(trialItems, state.age);
          var saveItems = state.items;
          state.items = trialItems;   // temporary for overlay painting only
          renderOverlay(res.violations);
          renderInspector(res);
          state.items = saveItems;
        }
      }
      function onUp(ev) {
        furn.removeEventListener('pointermove', onMove);
        furn.removeEventListener('pointerup', onUp);
        furn.removeEventListener('pointercancel', onUp);
        if (!moved) { render(); return; }
        var trial = { id: item.id, type: item.type, x: live.x, y: live.y, w: item.w, h: item.h };
        if (validPlace(state.items, trial, item.id)) {
          commit(state.items.map(function (i) { return i.id === item.id ? trial : i; }));
        } else {
          render(); // revert
        }
      }
      furn.addEventListener('pointermove', onMove);
      furn.addEventListener('pointerup', onUp);
      furn.addEventListener('pointercancel', onUp);
    });

    /* Handle buttons (rotate / delete) via click delegation */
    canvas.addEventListener('click', function (e) {
      var h = e.target.closest('.lp-handle');
      if (!h) return;
      e.stopPropagation();
      if (h.dataset.act === 'rotate') rotateSelected();
      else deleteSelected();
    });
  }

  function initPaletteDrag() {
    document.querySelectorAll('.palette-item[data-type]').forEach(function (pi) {
      pi.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        var type = pi.dataset.type;
        var t = TYPES[type];
        pi.setPointerCapture(e.pointerId);
        var ghost = document.createElement('div');
        ghost.className = 'furn ' + t.cls + ' lp-drag-ghost';
        ghost.textContent = t.name;
        if (t.round) ghost.style.borderRadius = '50%';
        canvas.appendChild(ghost);
        ghost.style.display = 'none';
        var live = null;

        function onMove(ev) {
          var c = cellFromEvent(ev);
          if (!c.inside) { ghost.style.display = 'none'; live = null; return; }
          var nx = Math.max(0, Math.min(COLS - t.w, Math.round(c.x - t.w / 2)));
          var ny = Math.max(0, Math.min(ROWS - t.h, Math.round(c.y - t.h / 2)));
          live = { type: type, x: nx, y: ny, w: t.w, h: t.h };
          ghost.style.display = 'flex';
          ghost.style.left = pct(nx, COLS); ghost.style.top = pct(ny, ROWS);
          ghost.style.width = pct(t.w, COLS); ghost.style.height = pct(t.h, ROWS);
          ghost.classList.toggle('lp-ghost-bad', !validPlace(state.items, live, null));
        }
        function onUp() {
          pi.removeEventListener('pointermove', onMove);
          pi.removeEventListener('pointerup', onUp);
          pi.removeEventListener('pointercancel', onUp);
          ghost.remove();
          if (live && validPlace(state.items, live, null)) {
            var it = mkItem(type, live.x, live.y, live.w, live.h);
            commit(state.items.concat([it]));
            select(it.id);
          }
        }
        pi.addEventListener('pointermove', onMove);
        pi.addEventListener('pointerup', onUp);
        pi.addEventListener('pointercancel', onUp);
      });
    });
  }

  /* ── Selection / edit ops ─────────────────────────────── */
  function select(id) {
    if (state.selected === id) return;
    state.selected = id;
    applySelection();
  }
  function selectedItem() {
    return state.items.filter(function (i) { return i.id === state.selected; })[0] || null;
  }
  function rotateSelected() {
    var it = selectedItem();
    if (!it || it.w === it.h) return;
    var rot = { id: it.id, type: it.type, x: it.x, y: it.y, w: it.h, h: it.w };
    rot.x = Math.max(0, Math.min(COLS - rot.w, rot.x));
    rot.y = Math.max(0, Math.min(ROWS - rot.h, rot.y));
    if (validPlace(state.items, rot, it.id)) {
      commit(state.items.map(function (i) { return i.id === it.id ? rot : i; }));
    } else {
      pulseItems([it.id]);
    }
  }
  function deleteSelected() {
    var it = selectedItem();
    if (!it) return;
    state.selected = null;
    commit(state.items.filter(function (i) { return i.id !== it.id; }));
  }

  function initKeyboard() {
    document.addEventListener('keydown', function (e) {
      if (/input|select|textarea/i.test(document.activeElement.tagName)) return;
      if (!selectedItem()) return;
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); rotateSelected(); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelected(); }
      else if (e.key === 'Escape') select(null);
    });
  }

  /* ── Undo / redo / presets / persistence ──────────────── */
  function undo() {
    if (!state.past.length) return;
    state.future.push(state.items);
    state.items = state.past.pop();
    state.selected = null;
    render();
  }
  function redo() {
    if (!state.future.length) return;
    state.past.push(state.items);
    state.items = state.future.pop();
    state.selected = null;
    render();
  }
  function applyPreset(key) {
    var p = PRESETS[key];
    if (!p) return;
    state.age = p.age;
    ageSel.value = p.age;
    state.selected = null;
    commit(p.items.map(function (i) { return mkItem(i.type, i.x, i.y, i.w, i.h); }));
  }

  /* Cloud persistence (Supabase, RLS-scoped to the signed-in user).
     Falls back to localStorage if the data layer is unavailable. */
  var savedRows = [];

  function refreshSavedList() {
    savedSel.innerHTML = '';
    var opt0 = document.createElement('option');
    opt0.value = ''; opt0.textContent = savedRows.length ? 'My saved layouts…' : 'No saved layouts yet';
    savedSel.appendChild(opt0);
    savedRows.forEach(function (s, i) {
      var o = document.createElement('option');
      o.value = String(i);
      o.textContent = s.name + (s.status && s.status !== 'draft' ? ' · ' + s.status : '');
      savedSel.appendChild(o);
    });
  }
  function fetchSaved() {
    if (!window.pfDb || !window.pfUser) {
      try { savedRows = JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch (e) { savedRows = []; }
      refreshSavedList();
      return;
    }
    window.pfDb.from('layouts')
      .select('id,name,age_group,items,score,status')
      .order('updated_at', { ascending: false }).limit(20)
      .then(function (r) {
        savedRows = (r.data || []).map(function (row) {
          return { id: row.id, name: row.name, age: row.age_group, items: row.items, score: row.score, status: row.status };
        });
        refreshSavedList();
      });
  }
  function saveLayout() {
    var name = AGE_RULES[state.age].label + ' · ' + lastEval.score + '% · ' + new Date().toLocaleDateString('en-SG');
    var rec = { name: name, age: state.age, items: state.items, score: lastEval.score };
    if (window.pfDb && window.pfUser) {
      window.pfDb.from('layouts').insert({
        owner: window.pfUser.id, name: name, age_group: state.age,
        items: state.items, score: lastEval.score
      }).then(function (r) {
        if (r.error) { if (window.pfToast) pfToast('Save failed: ' + r.error.message); return; }
        fetchSaved();
        flashButton($('lpSave'), 'Saved to cloud ✓');
      });
    } else {
      savedRows.push(rec);
      if (savedRows.length > 12) savedRows.shift();
      try { localStorage.setItem(LS_KEY, JSON.stringify(savedRows)); } catch (e) { /* quota */ }
      refreshSavedList();
      flashButton($('lpSave'), 'Saved ✓');
    }
  }
  function loadLayout(idx) {
    var s = savedRows[idx];
    if (!s) return;
    state.age = s.age && AGE_RULES[s.age] ? s.age : 'k1';
    ageSel.value = state.age;
    state.selected = null;
    currentLayoutId = s.id || null;
    commit(s.items.map(function (i) { return mkItem(i.type, i.x, i.y, i.w, i.h); }));
  }
  var currentLayoutId = null;
  function submitLayout() {
    if (lastEval.score !== 100) return;
    if (!(window.pfDb && window.pfUser)) { flashButton(submitBtn, '✓ Submitted to Director'); return; }
    var name = AGE_RULES[state.age].label + ' · submitted ' + new Date().toLocaleDateString('en-SG');
    var payload = {
      owner: window.pfUser.id, name: name, age_group: state.age,
      items: state.items, score: lastEval.score,
      status: 'submitted', submitted_at: new Date().toISOString()
    };
    var op = currentLayoutId
      ? window.pfDb.from('layouts').update(payload).eq('id', currentLayoutId)
      : window.pfDb.from('layouts').insert(payload);
    op.then(function (r) {
      if (r.error) { if (window.pfToast) pfToast('Submit failed: ' + r.error.message); return; }
      fetchSaved();
      flashButton(submitBtn, '✓ Submitted to Director');
      if (window.pfToast) pfToast('Layout submitted for Director approval');
    });
  }
  function flashButton(btn, text) {
    var orig = btn.textContent;
    btn.textContent = text;
    btn.disabled = true;
    setTimeout(function () { btn.textContent = orig; btn.disabled = false; }, 1600);
  }

  /* ── Boot ─────────────────────────────────────────────── */
  function init() {
    canvas = $('layoutCanvas');
    if (!canvas) return;
    overlay = $('lpOverlay');
    ringFill = $('lpRingFill');
    scoreText = $('lpScoreText');
    scoreState = $('lpScoreState');
    flagsEl = $('lpFlags');
    ageSel = $('ageGroup');
    presetSel = $('lpPreset');
    savedSel = $('lpSaved');
    hintEl = $('lpHint');
    submitBtn = $('lpSubmit');

    initCanvasDrag();
    initPaletteDrag();
    initKeyboard();

    ageSel.addEventListener('change', function () { state.age = ageSel.value; render(); });
    presetSel.addEventListener('change', function () { if (presetSel.value) { applyPreset(presetSel.value); presetSel.value = ''; } });
    savedSel.addEventListener('change', function () { if (savedSel.value !== '') loadLayout(parseInt(savedSel.value, 10)); });
    $('lpUndo').addEventListener('click', undo);
    $('lpRedo').addEventListener('click', redo);
    $('lpClear').addEventListener('click', function () { state.selected = null; commit(state.items.filter(function (i) { return TYPES[i.type].fixture; })); });
    $('lpSave').addEventListener('click', saveLayout);
    submitBtn.addEventListener('click', submitLayout);
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
    });

    if (window.pfAuthReady) window.pfAuthReady.then(fetchSaved);
    else fetchSaved();

    /* Start on the K1 preset */
    var p = PRESETS.k1;
    state.age = p.age;
    ageSel.value = p.age;
    state.items = p.items.map(function (i) { return mkItem(i.type, i.x, i.y, i.w, i.h); });
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

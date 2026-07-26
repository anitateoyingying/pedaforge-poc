/* PedaForge Home kids shell: painted scene, top dock, child switcher,
   star counter, celebrations. Mounts on home.html + home-*.html only. */
(function () {
  'use strict';

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FACE_COLORS = ['#ff7d6b', '#4fb8c9', '#b48fd9', '#ffcf5c', '#ff9eb5', '#5fae62'];
  var LS_KID = 'pedaforge:kids:activeChild';

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function initials(name) {
    return String(name).split(/\s+/).map(function (w) { return w.charAt(0); }).slice(0, 2).join('').toUpperCase();
  }

  /* ── Painted scene ─────────────────────────────────────── */
  function scene() {
    var s = el('div', 'k-scene');
    s.setAttribute('aria-hidden', 'true');
    s.appendChild(el('div', 'k-sun'));
    ['c1', 'c2', 'c3'].forEach(function (c) { s.appendChild(el('div', 'k-cloud ' + c)); });
    var hills = el('div', 'k-hills');
    hills.innerHTML =
      '<svg viewBox="0 0 1440 320" preserveAspectRatio="none">' +
      '<path d="M0 190 Q 240 120 480 175 T 960 165 T 1440 185 V320 H0 Z" fill="#b8dfa4"/>' +
      '<path d="M0 235 Q 300 165 620 225 T 1440 230 V320 H0 Z" fill="#8ecb7a"/>' +
      '<path d="M0 285 Q 360 230 760 278 T 1440 272 V320 H0 Z" fill="#5fae62"/>' +
      '<g fill="#4c9a50"><ellipse cx="220" cy="235" rx="26" ry="34"/><rect x="216" y="255" width="8" height="22" rx="3" fill="#7a5b3a"/></g>' +
      '<g fill="#4c9a50"><ellipse cx="1180" cy="225" rx="30" ry="40"/><rect x="1176" y="250" width="8" height="24" rx="3" fill="#7a5b3a"/></g>' +
      '<g fill="#ffffff" opacity="0.9"><circle cx="480" cy="262" r="5"/><circle cx="500" cy="268" r="4"/><circle cx="880" cy="252" r="5"/><circle cx="900" cy="258" r="4"/></g>' +
      '</svg>';
    s.appendChild(hills);
    for (var i = 0; i < 6; i++) {
      var sp = el('span', 'k-sparkle');
      sp.style.left = (8 + i * 15) + '%';
      sp.style.top = (10 + (i % 3) * 12) + '%';
      sp.style.animationDelay = (i * 0.8) + 's';
      s.appendChild(sp);
    }
    return s;
  }

  /* ── Dock ──────────────────────────────────────────────── */
  var state = { kids: [], active: null };

  function starIcon() {
    return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.26L21 9.27l-4.9 4.4L17.4 21 12 17.6 6.6 21l1.3-7.33L3 9.27l6.1-1.01L12 2z"/></svg>';
  }

  function dock() {
    var d = el('div', 'k-dock');
    var brand = el('a', 'k-brand');
    brand.href = 'home.html';
    brand.innerHTML = '<span class="blob">PF</span><span>PedaForge <b style="color:var(--k-teal);">Home</b></span>';
    var spacer = el('span', 'k-spacer');
    var stars = el('span', 'k-stars');
    stars.id = 'kStars';
    stars.innerHTML = starIcon() + '<span id="kStarCount">0</span>';
    stars.title = 'Stars earned this week';
    var kidBtn = el('button', 'k-kid-switch');
    kidBtn.id = 'kKidSwitch';
    kidBtn.type = 'button';
    kidBtn.innerHTML = '<span class="k-face" id="kKidFace">?</span><span id="kKidName">Pick a child</span>';
    kidBtn.addEventListener('click', openSwitcher);
    var exit = el('a', 'k-exit', 'For educators');
    exit.href = 'index.html';
    exit.title = 'Back to the educator studio';
    d.appendChild(brand); d.appendChild(spacer); d.appendChild(stars); d.appendChild(kidBtn); d.appendChild(exit);
    return d;
  }

  function renderActive() {
    var face = document.getElementById('kKidFace');
    var name = document.getElementById('kKidName');
    if (!face || !name) return;
    if (state.active) {
      face.textContent = initials(state.active.name);
      face.style.background = state.active.color;
      name.textContent = state.active.name.split(' ')[0];
    } else {
      face.textContent = '?';
      face.style.background = 'var(--k-teal)';
      name.textContent = state.kids.length ? 'Pick a child' : 'No class yet';
    }
    document.dispatchEvent(new CustomEvent('pf-kid-change', { detail: state.active }));
  }

  function pickKid(kid) {
    state.active = kid;
    try { localStorage.setItem(LS_KID, kid ? kid.id : ''); } catch (e) {}
    renderActive();
    loadStars();
  }

  function openSwitcher() {
    var old = document.getElementById('kSwitcher');
    if (old) { old.remove(); return; }
    var pop = el('div');
    pop.id = 'kSwitcher';
    pop.style.cssText = 'position:fixed;top:74px;right:calc(50% - 540px + 60px);z-index:120;background:var(--k-paper);border-radius:22px;box-shadow:var(--k-shadow);padding:16px;display:flex;flex-direction:column;gap:8px;min-width:230px;max-width:90vw;';
    if (window.innerWidth < 1120) { pop.style.right = '16px'; }
    pop.appendChild(el('b', null, 'Who is playing today?'));
    if (!state.kids.length) {
      var msg = el('span', null, 'Ask your teacher to add you to a class first.');
      msg.style.cssText = 'font-size:0.82rem;color:var(--k-ink-soft);';
      pop.appendChild(msg);
    }
    state.kids.forEach(function (k) {
      var row = el('button', 'k-kid-switch');
      row.type = 'button';
      row.style.justifyContent = 'flex-start';
      var lockIco = k.locked
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="margin-left:auto;opacity:0.55;"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
        : '';
      row.innerHTML = '<span class="k-face" style="background:' + (k.locked ? '#b9c0b7' : k.color) + ';">' + initials(k.name) + '</span><span>' + k.name.replace(/</g, '&lt;') + '</span>' + lockIco;
      if (k.locked) {
        row.style.opacity = '0.6';
        row.title = 'Not enrolled yet - ask your teacher';
        row.addEventListener('click', function () {
          if (window.pfToast) pfToast(k.name.split(' ')[0] + ' is not enrolled in PedaForge Home yet.');
        });
      } else {
        row.addEventListener('click', function () { pickKid(k); pop.remove(); });
      }
      pop.appendChild(row);
    });
    document.body.appendChild(pop);
    setTimeout(function () {
      document.addEventListener('click', function close(e) {
        if (!pop.contains(e.target) && e.target.id !== 'kKidSwitch') { pop.remove(); document.removeEventListener('click', close); }
      });
    }, 50);
  }

  /* ── Stars: count of this week's saved activities for the child ── */
  function loadStars() {
    var host = document.getElementById('kStarCount');
    if (!host || !window.pfDb || !window.pfUser) return;
    var weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    var kid = state.active;
    var qs = [
      window.pfDb.from('reading_sessions').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
      window.pfDb.from('artworks').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
      window.pfDb.from('dictionary_progress').select('word', { count: 'exact', head: true }).neq('status', 'new').gte('updated_at', weekAgo)
    ];
    if (kid) {
      qs[0] = qs[0].eq('child_id', kid.id);
      qs[1] = qs[1].eq('child_id', kid.id);
      qs[2] = qs[2].eq('child_id', kid.id);
    } else {
      qs[0] = qs[0].eq('user_id', window.pfUser.id);
      qs[1] = qs[1].eq('owner', window.pfUser.id);
      qs[2] = qs[2].eq('user_id', window.pfUser.id);
    }
    Promise.all(qs).then(function (rs) {
      var total = rs.reduce(function (n, r) { return n + (r.count || 0); }, 0);
      host.textContent = total;
    });
  }

  /* ── Celebration confetti ──────────────────────────────── */
  window.pfKidsCelebrate = function (n) {
    if (REDUCED) return;
    var colors = FACE_COLORS;
    for (var i = 0; i < (n || 24); i++) {
      (function (i) {
        setTimeout(function () {
          var c = el('span', 'k-confetti');
          c.style.left = (5 + (i * 37) % 90) + 'vw';
          c.style.background = colors[i % colors.length];
          c.style.animationDelay = (i % 5) * 0.06 + 's';
          c.style.transform = 'rotate(' + (i * 47 % 360) + 'deg)';
          document.body.appendChild(c);
          setTimeout(function () { c.remove(); }, 3000);
        }, i * 18);
      })(i);
    }
  };

  /* ── Shared kid picker accessor for module pages ───────── */
  window.pfKids = {
    activeChild: function () { return state.active; },
    children: function () { return state.kids; },
    /* Curriculum for the active child's class (null = school defaults). */
    curriculum: function () {
      var kid = state.active;
      if (!kid || !state.curriculumByClass) return null;
      return state.curriculumByClass[kid.classId] || null;
    },
    celebrate: window.pfKidsCelebrate,
    refreshStars: loadStars
  };

  /* ── Mount ─────────────────────────────────────────────── */
  function mount(ctx) {
    if (document.body.classList.contains('pf-kids')) return;
    document.body.classList.add('pf-kids');
    document.body.insertBefore(scene(), document.body.firstChild);
    document.body.insertBefore(dock(), document.body.children[1]);

    Promise.all([
      window.pfApi.myClasses(),
      window.pfDb.from('home_enrolments').select('child_id,status')
    ]).then(function (rs) {
      var classes = rs[0];
      var enrolRows = (rs[1] && rs[1].data) || [];
      var enrolByChild = {};
      enrolRows.forEach(function (e) { enrolByChild[e.child_id] = e.status; });
      /* Enrolment gate: once ANY child in the account has an enrolment
         record, only 'active' children may enter. Accounts that have
         never used enrolments are grandfathered (everything open). */
      var gateOn = enrolRows.length > 0;

      var kids = [];
      var curriculumByClass = {};
      classes.forEach(function (c) {
        curriculumByClass[c.id] = c.curriculum || null;
        (c.children || []).forEach(function (k) {
          kids.push({
            id: k.id, name: k.name, tags: k.profile_tags || [], classId: c.id,
            locked: gateOn && enrolByChild[k.id] !== 'active'
          });
        });
      });
      kids.sort(function (a, b) { return a.name.localeCompare(b.name); });
      kids.forEach(function (k, i) { k.color = FACE_COLORS[i % FACE_COLORS.length]; });
      state.kids = kids;
      state.curriculumByClass = curriculumByClass;
      var savedId = '';
      try { savedId = localStorage.getItem(LS_KID) || ''; } catch (e) {}
      var unlocked = kids.filter(function (k) { return !k.locked; });
      state.active = unlocked.filter(function (k) { return k.id === savedId; })[0] || unlocked[0] || null;
      renderActive();
      loadStars();
    });
  }

  function boot() {
    if (!window.pfAuthReady) return;
    window.pfAuthReady.then(function (ctx) {
      if (!ctx.user) return;
      mount(ctx);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

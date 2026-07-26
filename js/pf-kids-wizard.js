/* PedaForge Home welcome wizard: an online paint world.
   A full-screen watercolor scene starts as a pale pencil sketch; each
   step of the wizard paints part of the world alive (sky washes in,
   the sun rises, hills bloom, flowers pop) while the child picks who
   they are and what they love. Ghibli-inspired, per the user's
   reference pen. Shows once per browser (localStorage flag). */
(function () {
  'use strict';

  // v2: bumping the key replays the wizard for everyone after a reset.
  // home.html?welcome forces a replay anytime.
  var LS_DONE = 'pedaforge:kids:welcomed:v2';
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FACE_COLORS = ['#ff7d6b', '#4fb8c9', '#b48fd9', '#ffcf5c', '#ff9eb5', '#5fae62'];

  var css =
    '.kw{position:fixed;inset:0;z-index:400;overflow:hidden;font-family:var(--k-font,Fredoka,sans-serif);}' +
    /* paint layers: sketch base, then painted layers revealed step by step */
    '.kw-layer{position:absolute;inset:0;transition:opacity 1.4s ease;}' +
    '.kw-sketch{background:#f4efe4;}' +
    '.kw-sketch svg{position:absolute;inset:0;width:100%;height:100%;opacity:0.35;}' +
    '.kw-sky{background:linear-gradient(180deg,#aee3f5 0%,#cdeff7 52%,#fdf3d8 100%);opacity:0;}' +
    '.kw.p1 .kw-sky{opacity:1;}' +
    '.kw-sun{position:absolute;top:38%;right:14%;width:120px;height:120px;border-radius:50%;' +
      'background:radial-gradient(circle at 38% 34%,#ffe9a8,#ffd66b 62%,#ffc244 100%);' +
      'box-shadow:0 0 80px 30px rgba(255,214,107,0.5);opacity:0;transform:translateY(60px) scale(0.7);' +
      'transition:opacity 1.6s ease,transform 2.2s cubic-bezier(0.3,1.2,0.5,1);}' +
    '.kw.p2 .kw-sun{opacity:1;transform:translateY(0) scale(1);}' +
    '.kw-cloud{position:absolute;background:#fff;border-radius:100px;opacity:0;transition:opacity 1.6s ease 0.5s,transform 26s linear;}' +
    '.kw-cloud::before,.kw-cloud::after{content:"";position:absolute;background:inherit;border-radius:50%;}' +
    '.kw-cloud.a{top:14%;left:12%;width:170px;height:52px;}' +
    '.kw-cloud.a::before{width:76px;height:76px;top:-38px;left:26px;}.kw-cloud.a::after{width:54px;height:54px;top:-26px;left:88px;}' +
    '.kw-cloud.b{top:24%;right:22%;width:130px;height:42px;}' +
    '.kw-cloud.b::before{width:58px;height:58px;top:-28px;left:20px;}.kw-cloud.b::after{width:42px;height:42px;top:-18px;left:68px;}' +
    '.kw.p2 .kw-cloud{opacity:0.92;transform:translateX(40px);}' +
    '.kw-hills{position:absolute;left:0;right:0;bottom:0;height:44vh;opacity:0;transform:translateY(30px);transition:opacity 1.6s ease,transform 1.8s cubic-bezier(0.3,1.3,0.5,1);}' +
    '.kw.p3 .kw-hills{opacity:1;transform:none;}' +
    '.kw-hills svg{position:absolute;inset:0;width:100%;height:100%;}' +
    '.kw-flowers{position:absolute;left:0;right:0;bottom:0;height:34vh;pointer-events:none;}' +
    '.kw-flower{position:absolute;width:26px;height:34px;opacity:0;transform:scale(0) translateY(10px);transform-origin:bottom center;' +
      'transition:opacity 0.5s ease,transform 0.7s cubic-bezier(0.34,1.8,0.64,1);}' +
    '.kw.p4 .kw-flower{opacity:1;transform:scale(1) translateY(0);}' +
    /* card */
    '.kw-card{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(560px,92vw);' +
      'background:rgba(255,253,245,0.94);backdrop-filter:blur(6px);border-radius:32px;padding:38px 40px 30px;' +
      'box-shadow:0 8px 0 rgba(63,74,61,0.1),0 30px 80px rgba(63,74,61,0.3);text-align:center;}' +
    '.kw-card h1{font-weight:700;font-size:1.9rem;color:#3f4a3d;margin:0 0 8px;}' +
    '.kw-card p.kw-lead{font-family:var(--k-hand,Gaegu,cursive);font-size:1.35rem;color:#6b7a68;margin:0 0 22px;line-height:1.4;}' +
    '.kw-brush{width:64px;height:64px;margin:0 auto 14px;border-radius:46% 54% 55% 45%/52% 44% 56% 48%;' +
      'background:linear-gradient(135deg,#ff7d6b,#ff9eb5);display:flex;align-items:center;justify-content:center;color:#fff;' +
      'animation:kw-bob 3.5s ease-in-out infinite;}' +
    '.kw-brush svg{width:32px;height:32px;}' +
    '@keyframes kw-bob{0%,100%{transform:translateY(0) rotate(-3deg);}50%{transform:translateY(-7px) rotate(3deg);}}' +
    '.kw-kids{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-bottom:8px;}' +
    '.kw-kid{border:none;cursor:pointer;background:#fff;border-radius:22px;padding:14px 18px 12px;font-family:inherit;' +
      'box-shadow:inset 0 0 0 3px rgba(63,74,61,0.08),0 4px 0 rgba(63,74,61,0.08);text-align:center;min-width:96px;' +
      'transition:transform 0.25s cubic-bezier(0.34,1.7,0.64,1),box-shadow 0.2s ease;}' +
    '.kw-kid:hover{transform:translateY(-4px) rotate(-1.5deg) scale(1.05);}' +
    '.kw-kid.on{box-shadow:inset 0 0 0 3px #ff7d6b,0 4px 0 rgba(63,74,61,0.08);background:#fff3f0;}' +
    '.kw-kid .face{width:44px;height:44px;border-radius:50%;margin:0 auto 7px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:0.95rem;}' +
    '.kw-kid b{display:block;font-size:0.88rem;color:#3f4a3d;font-weight:600;}' +
    '.kw-loves{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-bottom:6px;}' +
    '.kw-love{border:3px solid rgba(63,74,61,0.1);background:#fff;border-radius:100px;cursor:pointer;font-family:inherit;' +
      'font-weight:600;font-size:0.98rem;color:#3f4a3d;padding:11px 20px;display:inline-flex;align-items:center;gap:8px;' +
      'transition:transform 0.22s cubic-bezier(0.34,1.7,0.64,1),border-color 0.2s ease,background 0.2s ease;}' +
    '.kw-love:hover{transform:scale(1.07) rotate(-1deg);}' +
    '.kw-love.on{border-color:#4fb8c9;background:#eefafc;}' +
    '.kw-love svg{width:18px;height:18px;}' +
    '.kw-foot{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:22px;}' +
    '.kw-skip{border:none;background:none;color:#9aa697;font-size:0.8rem;cursor:pointer;font-family:inherit;}' +
    '.kw-skip:hover{color:#3f4a3d;text-decoration:underline;}' +
    '.kw-dots{position:absolute;top:22px;left:50%;transform:translateX(-50%);display:flex;gap:8px;}' +
    '.kw-dot{width:38px;height:7px;border-radius:100px;background:rgba(63,74,61,0.14);transition:background 0.4s ease;}' +
    '.kw-dot.on{background:#ff7d6b;}' +
    '.kw-pop{animation:kw-pop 0.5s cubic-bezier(0.34,1.8,0.64,1);}' +
    '@keyframes kw-pop{from{transform:translate(-50%,-50%) scale(0.94);}to{transform:translate(-50%,-50%) scale(1);}}' +
    '@media(prefers-reduced-motion:reduce){.kw-layer,.kw-sun,.kw-cloud,.kw-hills,.kw-flower{transition:none;}.kw-brush{animation:none;}.kw-pop{animation:none;}}';

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function initials(name) {
    return String(name).split(/\s+/).map(function (w) { return w.charAt(0); }).slice(0, 2).join('').toUpperCase();
  }
  function brushIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2l4 4-10.5 10.5a3 3 0 0 1-2 .9c-1.6.1-3.5.7-4.5 2.6-.6-2.5-.1-4.6 1-6a3 3 0 0 1 1.5-1z"/></svg>';
  }

  var LOVES = [
    { key: 'stories', label: 'Stories', d: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' },
    { key: 'drawing', label: 'Drawing', d: 'M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z' },
    { key: 'songs', label: 'Songs', d: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z' },
    { key: 'animals', label: 'Animals', d: 'M10 5.2C10 3.4 8.9 2 7.5 2S5 3.4 5 5.2 6.1 8.4 7.5 8.4 10 7 10 5.2zM19 5.2C19 3.4 17.9 2 16.5 2S14 3.4 14 5.2s1.1 3.2 2.5 3.2S19 7 19 5.2zM12 22c3.9 0 7-2.5 7-5.5S15.9 11 12 11s-7 2.5-7 5.5S8.1 22 12 22z' },
    { key: 'puzzles', label: 'Puzzles', d: 'M4 7h4a2 2 0 1 1 4 0h4v4a2 2 0 1 1 0 4v4h-4a2 2 0 1 0-4 0H4v-4a2 2 0 1 0 0-4z' },
    { key: 'outdoors', label: 'Outside', d: 'M17 8a5 5 0 1 0-10 0c0 3 2 4 2 7h6c0-3 2-4 2-7zM9 19h6M10 22h4' }
  ];

  var state = { kid: null, loves: [] };

  function show(kids) {
    if (!document.getElementById('kwCss')) {
      var st = document.createElement('style');
      st.id = 'kwCss';
      st.textContent = css;
      document.head.appendChild(st);
    }
    var root = el('div', 'kw');
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'Welcome to PedaForge Home');

    /* Paint layers */
    var sketch = el('div', 'kw-layer kw-sketch');
    sketch.innerHTML =
      '<svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">' +
      '<g fill="none" stroke="#8b8574" stroke-width="2" stroke-dasharray="7 9" opacity="0.7">' +
      '<circle cx="1180" cy="330" r="60"/>' +
      '<path d="M0 640 Q 300 560 620 615 T 1440 620"/>' +
      '<path d="M0 730 Q 360 660 760 715 T 1440 705"/>' +
      '<ellipse cx="200" cy="180" rx="90" ry="30"/><ellipse cx="900" cy="140" rx="70" ry="24"/>' +
      '</g></svg>';
    var sky = el('div', 'kw-layer kw-sky');
    var sun = el('div', 'kw-sun');
    var cloudA = el('div', 'kw-cloud a');
    var cloudB = el('div', 'kw-cloud b');
    var hills = el('div', 'kw-hills');
    hills.innerHTML =
      '<svg viewBox="0 0 1440 400" preserveAspectRatio="none">' +
      '<path d="M0 190 Q 240 90 480 160 T 960 150 T 1440 175 V400 H0 Z" fill="#b8dfa4"/>' +
      '<path d="M0 250 Q 300 160 620 230 T 1440 240 V400 H0 Z" fill="#8ecb7a"/>' +
      '<path d="M0 320 Q 360 250 760 305 T 1440 300 V400 H0 Z" fill="#5fae62"/>' +
      '<g fill="#4c9a50"><ellipse cx="240" cy="240" rx="30" ry="42"/><rect x="235" y="266" width="10" height="28" rx="4" fill="#7a5b3a"/></g>' +
      '<g fill="#4c9a50"><ellipse cx="1150" cy="228" rx="36" ry="48"/><rect x="1145" y="258" width="10" height="30" rx="4" fill="#7a5b3a"/></g>' +
      '</svg>';
    var flowers = el('div', 'kw-flowers');
    for (var i = 0; i < 12; i++) {
      var f = el('span', 'kw-flower');
      f.style.left = (4 + i * 8.2) + '%';
      f.style.bottom = (6 + (i % 4) * 7) + '%';
      f.style.transitionDelay = (0.1 + i * 0.08) + 's';
      var c = FACE_COLORS[i % FACE_COLORS.length];
      f.innerHTML = '<svg viewBox="0 0 26 34"><path d="M13 34 V16" stroke="#4c9a50" stroke-width="3" stroke-linecap="round"/>' +
        '<circle cx="13" cy="10" r="7" fill="' + c + '"/><circle cx="13" cy="10" r="3" fill="#fff8e1"/></svg>';
      flowers.appendChild(f);
    }
    root.appendChild(sketch); root.appendChild(sky); root.appendChild(sun);
    root.appendChild(cloudA); root.appendChild(cloudB); root.appendChild(hills); root.appendChild(flowers);

    /* Progress dots */
    var dots = el('div', 'kw-dots');
    for (var dI = 0; dI < 4; dI++) dots.appendChild(el('span', 'kw-dot'));
    root.appendChild(dots);

    var card = el('div', 'kw-card');
    root.appendChild(card);
    document.body.appendChild(root);

    function setStep(n) {
      root.className = 'kw' + [' p1', ' p1 p2', ' p1 p2 p3', ' p1 p2 p3 p4'][n - 1];
      Array.prototype.forEach.call(dots.children, function (d, i) { d.classList.toggle('on', i < n); });
      card.classList.remove('kw-pop');
      void card.offsetWidth;
      card.classList.add('kw-pop');
    }

    function finish(showConfetti) {
      try { localStorage.setItem(LS_DONE, '1'); } catch (e) {}
      if (state.kid && window.pfKids) {
        try { localStorage.setItem('pedaforge:kids:activeChild', state.kid.id); } catch (e) {}
      }
      root.style.transition = 'opacity 0.8s ease';
      root.style.opacity = '0';
      setTimeout(function () {
        root.remove();
        if (showConfetti && window.pfKidsCelebrate) window.pfKidsCelebrate(30);
        window.location.replace(window.location.pathname); // drops ?welcome, reloads
      }, 850);
    }

    function foot(nextLabel, onNext) {
      var f = el('div', 'kw-foot');
      var skip = el('button', 'kw-skip', 'Skip');
      skip.addEventListener('click', function () { finish(false); });
      var next = el('button', 'k-btn big', nextLabel);
      next.addEventListener('click', onNext);
      f.appendChild(skip); f.appendChild(next);
      return f;
    }

    /* Step 1: the world is a sketch; first brushstroke paints the sky */
    function step1() {
      setStep(1);
      card.innerHTML = '';
      var brush = el('div', 'kw-brush');
      brush.innerHTML = brushIcon();
      card.appendChild(brush);
      card.appendChild(el('h1', null, 'Welcome to your paint world'));
      card.appendChild(el('p', 'kw-lead', 'This world is still a pencil sketch. Every step you take paints it alive!'));
      card.appendChild(foot('Paint the sky', step2));
    }

    /* Step 2: sun rises; pick who's playing */
    function step2() {
      setStep(2);
      card.innerHTML = '';
      card.appendChild(el('h1', null, 'The sun is up! Who are you?'));
      card.appendChild(el('p', 'kw-lead', 'Tap your name so the world knows who is painting today.'));
      var row = el('div', 'kw-kids');
      if (!kids.length) {
        var note = el('p', 'kw-lead', 'No names here yet. Ask your teacher to add you, or just keep painting!');
        note.style.fontSize = '1.1rem';
        card.appendChild(note);
      }
      kids.forEach(function (k, i) {
        var b = el('button', 'kw-kid');
        b.type = 'button';
        var face = el('span', 'face', initials(k.name));
        face.style.background = k.color || FACE_COLORS[i % FACE_COLORS.length];
        b.appendChild(face);
        b.appendChild(el('b', null, k.name.split(' ')[0]));
        b.addEventListener('click', function () {
          state.kid = k;
          Array.prototype.forEach.call(row.children, function (x) { x.classList.remove('on'); });
          b.classList.add('on');
        });
        row.appendChild(b);
      });
      card.appendChild(row);
      card.appendChild(foot('Paint the hills', step3));
    }

    /* Step 3: hills roll in; pick what you love */
    function step3() {
      setStep(3);
      card.innerHTML = '';
      card.appendChild(el('h1', null, 'Green hills! What do you love?'));
      card.appendChild(el('p', 'kw-lead', 'Pick as many as you like. Your world grows around them.'));
      var row = el('div', 'kw-loves');
      LOVES.forEach(function (l) {
        var b = el('button', 'kw-love');
        b.type = 'button';
        b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + l.d + '"/></svg>' + l.label;
        b.addEventListener('click', function () {
          b.classList.toggle('on');
          if (b.classList.contains('on')) state.loves.push(l.key);
          else state.loves = state.loves.filter(function (x) { return x !== l.key; });
        });
        row.appendChild(b);
      });
      card.appendChild(row);
      card.appendChild(foot('Make the flowers bloom', step4));
    }

    /* Step 4: flowers bloom; enter the world */
    function step4() {
      setStep(4);
      card.innerHTML = '';
      var brush = el('div', 'kw-brush');
      brush.innerHTML = brushIcon();
      card.appendChild(brush);
      var who = state.kid ? state.kid.name.split(' ')[0] : 'little painter';
      card.appendChild(el('h1', null, 'Your world is alive, ' + who + '!'));
      card.appendChild(el('p', 'kw-lead', 'Reading grows stories, painting grows pictures, and your garden grows with every try.'));
      var f = el('div', 'kw-foot');
      var go = el('button', 'k-btn big teal', 'Step inside');
      go.addEventListener('click', function () { finish(true); });
      f.appendChild(go);
      card.appendChild(f);
    }

    step1();
  }

  function boot() {
    if (!window.pfAuthReady) return;
    window.pfAuthReady.then(function (ctx) {
      if (!ctx.user) return;
      var replay = new URLSearchParams(window.location.search).has('welcome');
      var done = '';
      try { done = localStorage.getItem(LS_DONE) || ''; } catch (e) {}
      if (done && !replay) return;
      /* wait for pf-kids.js to load the class list, then launch */
      var launched = false;
      function launch(kids) {
        if (launched) return;
        launched = true;
        show(kids || []);
      }
      document.addEventListener('pf-kid-change', function once() {
        document.removeEventListener('pf-kid-change', once);
        launch(window.pfKids ? window.pfKids.children() : []);
      });
      /* fallback if no event fires (no classes) */
      setTimeout(function () { launch(window.pfKids ? window.pfKids.children() : []); }, 4500);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

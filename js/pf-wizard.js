/* PedaForge onboarding wizard — first-run setup.
   Shows when profile.onboarded is false. Steps:
   educator: role → create class → add children (paste list or one-by-one) → done
   director: role → done (points at network views).
   Sets profiles.onboarded = true on completion or skip. */
(function () {
  'use strict';

  var TAGS = ['visual-spatial', 'advanced-verbal', 'sensory-avoidant', 'kinesthetic', 'emergent-reader', 'EAL', 'needs-movement-breaks', 'high-support'];

  var css =
    '.pfw-scrim{position:fixed;inset:0;background:rgba(34,29,68,0.55);backdrop-filter:blur(3px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;transition:opacity .3s ease;}' +
    '.pfw-scrim.on{opacity:1;}' +
    '.pfw{background:var(--bg-card,#fff);border-radius:26px;max-width:620px;width:100%;max-height:88vh;overflow-y:auto;padding:38px 40px 30px;box-shadow:0 30px 90px rgba(34,29,68,0.4);transform:translateY(14px) scale(.98);transition:transform .35s cubic-bezier(0.34,1.56,0.64,1);}' +
    '.pfw-scrim.on .pfw{transform:none;}' +
    '.pfw-steps{display:flex;gap:6px;margin-bottom:24px;}' +
    '.pfw-step-dot{height:5px;border-radius:100px;flex:1;background:var(--border,#e8e4dd);transition:background .3s ease;}' +
    '.pfw-step-dot.done{background:var(--primary,#e8063c);}' +
    '.pfw h2{font-family:"Playfair Display",serif;font-size:1.5rem;color:var(--secondary,#2D2A5E);margin:0 0 8px;}' +
    '.pfw p.lead{font-size:.92rem;color:var(--text-light,#6b7280);line-height:1.6;margin:0 0 22px;}' +
    '.pfw-roles{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:8px;}' +
    '@media(max-width:560px){.pfw-roles{grid-template-columns:1fr;}}' +
    '.pfw-role{border:2px solid var(--border,#e8e4dd);border-radius:18px;padding:20px 18px;cursor:pointer;background:var(--bg,#faf6f0);text-align:left;font-family:inherit;transition:border-color .2s ease,transform .25s cubic-bezier(0.34,1.56,0.64,1);}' +
    '.pfw-role:hover{transform:translateY(-3px);}' +
    '.pfw-role.on{border-color:var(--primary,#e8063c);background:rgba(232,6,60,0.05);}' +
    '.pfw-role .ico{font-size:1.5rem;display:block;margin-bottom:8px;}' +
    '.pfw-role b{display:block;font-size:.95rem;color:var(--secondary,#2D2A5E);margin-bottom:4px;}' +
    '.pfw-role span{font-size:.76rem;color:var(--text-muted,#9ca3af);line-height:1.5;display:block;}' +
    '.pfw-field{margin-bottom:14px;}' +
    '.pfw-field label{display:block;font-size:.74rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--text-muted,#9ca3af);margin-bottom:6px;}' +
    '.pfw-field input,.pfw-field select,.pfw-field textarea{width:100%;padding:11px 14px;border:1px solid var(--border,#e8e4dd);border-radius:14px;font-family:inherit;font-size:.9rem;background:#fff;}' +
    '.pfw-field textarea{min-height:130px;resize:vertical;font-family:var(--font-mono,monospace);font-size:.82rem;line-height:1.7;}' +
    '.pfw-hint{font-size:.74rem;color:var(--text-muted,#9ca3af);line-height:1.55;margin-top:6px;}' +
    '.pfw-foot{display:flex;align-items:center;gap:12px;margin-top:24px;}' +
    '.pfw-skip{border:none;background:none;color:var(--text-muted,#9ca3af);font-size:.78rem;cursor:pointer;font-family:inherit;}' +
    '.pfw-skip:hover{color:var(--text,#3d3e3f);text-decoration:underline;}' +
    '.pfw-spacer{flex:1;}' +
    '.pfw-preview{max-height:180px;overflow-y:auto;border:1px solid var(--border,#e8e4dd);border-radius:14px;padding:10px 14px;margin-top:10px;background:var(--bg,#faf6f0);}' +
    '.pfw-preview .row{display:flex;gap:8px;align-items:center;padding:4px 0;font-size:.84rem;}' +
    '.pfw-preview .row .t{font-size:.64rem;font-weight:700;padding:1px 8px;border-radius:100px;background:rgba(232,6,60,0.08);color:var(--primary,#e8063c);}' +
    '.pfw-done-list{list-style:none;margin:0 0 6px;padding:0;}' +
    '.pfw-done-list li{display:flex;gap:10px;align-items:flex-start;padding:9px 0;font-size:.88rem;line-height:1.5;}' +
    '.pfw-done-list .n{width:24px;height:24px;border-radius:50%;flex-shrink:0;background:var(--primary,#e8063c);color:#fff;font-size:.72rem;font-weight:700;display:inline-flex;align-items:center;justify-content:center;}' +
    '@media(prefers-reduced-motion:reduce){.pfw,.pfw-role{transition:none;}}';

  var state = { role: 'educator', classId: null, className: '', added: 0 };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function parseRoster(text) {
    /* Accepts lines: "Name" or "Name, tag1 tag2" or CSV "Name,tag1,tag2" */
    var out = [];
    String(text).split(/\r?\n/).forEach(function (line) {
      line = line.trim();
      if (!line) return;
      var parts = line.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      var name = parts.shift();
      if (!name || name.length > 80) return;
      var tags = [];
      parts.join(' ').split(/[\s;]+/).forEach(function (t) {
        t = t.trim();
        if (!t) return;
        var match = TAGS.filter(function (k) { return k.toLowerCase() === t.toLowerCase(); })[0];
        tags.push(match || t.toLowerCase());
      });
      out.push({ name: name, tags: tags.slice(0, 5) });
    });
    return out.slice(0, 40);
  }

  function finish(scrim) {
    window.pfDb.from('profiles').update({ onboarded: true }).eq('id', window.pfUser.id)
      .then(function () {
        if (window.pfProfile) window.pfProfile.onboarded = true;
        // Reload so the Today page re-renders with the class/children just created.
        window.location.reload();
      });
  }

  function show(ctx) {
    if (!document.getElementById('pfwCss')) {
      var st = document.createElement('style');
      st.id = 'pfwCss'; st.textContent = css;
      document.head.appendChild(st);
    }
    var scrim = el('div', 'pfw-scrim');
    var box = el('div', 'pfw');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Welcome to PedaForge — set up your studio');
    scrim.appendChild(box);
    document.body.appendChild(scrim);
    requestAnimationFrame(function () { scrim.classList.add('on'); });

    var totalSteps = 4;
    function dots(step) {
      var wrap = el('div', 'pfw-steps');
      for (var i = 0; i < totalSteps; i++) wrap.appendChild(el('span', 'pfw-step-dot' + (i < step ? ' done' : '')));
      return wrap;
    }
    function foot(nextLabel, onNext, opts) {
      opts = opts || {};
      var f = el('div', 'pfw-foot');
      var skip = el('button', 'pfw-skip', opts.skipLabel || 'Skip setup — I’ll explore first');
      skip.addEventListener('click', function () { finish(scrim); });
      var spacer = el('span', 'pfw-spacer');
      var next = el('button', 'btn btn-primary', nextLabel);
      next.addEventListener('click', function () { onNext(next); });
      f.appendChild(skip); f.appendChild(spacer);
      if (opts.back) {
        var back = el('button', 'btn btn-secondary btn-sm', 'Back');
        back.addEventListener('click', opts.back);
        f.appendChild(back);
      }
      f.appendChild(next);
      return f;
    }

    /* ── Step 1: role ── */
    function step1() {
      box.innerHTML = '';
      box.appendChild(dots(1));
      box.appendChild(el('h2', null, 'Welcome to PedaForge'));
      var name = (ctx.profile && ctx.profile.full_name || '').split(' ')[0];
      box.appendChild(el('p', 'lead', (name ? name + ', l' : 'L') + 'et’s set up your studio in under two minutes. First — how will you use PedaForge?'));
      var roles = el('div', 'pfw-roles');
      var defs = [
        { key: 'educator', ico: '🍎', b: 'I teach a class', s: 'Plan lessons, build portfolios, run reading sessions, and design my classroom.' },
        { key: 'director', ico: '🧭', b: 'I lead a centre / HQ', s: 'Observe educators, review layouts, and see activity across the network.' },
      ];
      var btns = [];
      defs.forEach(function (d) {
        var b = el('button', 'pfw-role' + (state.role === d.key ? ' on' : ''));
        b.type = 'button';
        b.appendChild(el('span', 'ico', d.ico));
        b.appendChild(el('b', null, d.b));
        b.appendChild(el('span', null, d.s));
        b.addEventListener('click', function () {
          state.role = d.key;
          btns.forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on');
        });
        btns.push(b);
        roles.appendChild(b);
      });
      box.appendChild(roles);
      box.appendChild(el('p', 'pfw-hint', 'Directors are verified by HQ — choosing "centre lead" here requests the role; your account works as an educator meanwhile.'));
      box.appendChild(foot('Continue', function () {
        if (state.role === 'director') stepDirectorDone();
        else step2();
      }));
    }

    /* ── Step 2: create class ── */
    function step2() {
      box.innerHTML = '';
      box.appendChild(dots(2));
      box.appendChild(el('h2', null, 'Create your first class'));
      box.appendChild(el('p', 'lead', 'Everything in PedaForge — lesson plans, portfolios, reading progress — hangs off your class and its children.'));
      var f1 = el('div', 'pfw-field');
      f1.appendChild(el('label', null, 'Class name'));
      var nameIn = el('input');
      nameIn.placeholder = 'e.g. K1 Sunshine';
      f1.appendChild(nameIn);
      var f2 = el('div', 'pfw-field');
      f2.appendChild(el('label', null, 'Age group'));
      var ageSel = el('select');
      [['ic', 'Infant Care'], ['pg', 'Playgroup'], ['n1', 'Nursery N1'], ['n2', 'Nursery N2'], ['k1', 'Kindergarten K1'], ['k2', 'Kindergarten K2']].forEach(function (o) {
        var op = el('option', null, o[1]); op.value = o[0];
        if (o[0] === 'k1') op.selected = true;
        ageSel.appendChild(op);
      });
      f2.appendChild(ageSel);
      var f3 = el('div', 'pfw-field');
      f3.appendChild(el('label', null, 'Centre (optional)'));
      var centreIn = el('input');
      centreIn.placeholder = 'e.g. Busy Bees @ Tampines';
      f3.appendChild(centreIn);
      box.appendChild(f1); box.appendChild(f2); box.appendChild(f3);
      box.appendChild(foot('Create class', function (btn) {
        var n = nameIn.value.trim();
        if (!n) { nameIn.focus(); return; }
        var done = window.pfApi.spinner(btn, 'Creating…');
        window.pfApi.createClass(n, ageSel.value, centreIn.value.trim()).then(function (cls) {
          done();
          state.classId = cls.id; state.className = cls.name;
          step3();
        }, function (e) { done(); window.pfToast('Could not create class: ' + e.message); });
      }, { back: step1 }));
      nameIn.focus();
    }

    /* ── Step 3: roster ── */
    function step3() {
      box.innerHTML = '';
      box.appendChild(dots(3));
      box.appendChild(el('h2', null, 'Add your class list'));
      box.appendChild(el('p', 'lead', 'Paste your class list — one child per line. Add learning-profile tags after a comma if you like; you can refine them anytime.'));
      var f = el('div', 'pfw-field');
      f.appendChild(el('label', null, 'Children in ' + state.className));
      var ta = el('textarea');
      ta.placeholder = 'Leo T.\nAmira K., advanced-verbal\nSam W., sensory-avoidant emergent-reader';
      f.appendChild(ta);
      var hint = el('p', 'pfw-hint', 'Tip: use initials for privacy. Tags: ' + TAGS.join(', ') + '.');
      f.appendChild(hint);
      box.appendChild(f);
      var preview = el('div', 'pfw-preview');
      preview.style.display = 'none';
      box.appendChild(preview);
      ta.addEventListener('input', function () {
        var kids = parseRoster(ta.value);
        preview.innerHTML = '';
        preview.style.display = kids.length ? '' : 'none';
        kids.forEach(function (k) {
          var r = el('div', 'row');
          r.appendChild(el('strong', null, k.name));
          k.tags.forEach(function (t) { r.appendChild(el('span', 't', t)); });
          preview.appendChild(r);
        });
      });
      box.appendChild(foot('Add children', function (btn) {
        var kids = parseRoster(ta.value);
        if (!kids.length) { ta.focus(); return; }
        var busy = window.pfApi.spinner(btn, 'Adding ' + kids.length + '…');
        var chain = Promise.resolve();
        kids.forEach(function (k) {
          chain = chain.then(function () { return window.pfApi.addChild(state.classId, k.name, k.tags); });
        });
        chain.then(function () {
          busy();
          state.added = kids.length;
          step4();
        }, function (e) { busy(); window.pfToast('Some children failed: ' + e.message); });
      }, { back: step2, skipLabel: 'Add children later' }));
      ta.focus();
    }

    /* ── Step 4: done (educator) ── */
    function step4() {
      box.innerHTML = '';
      box.appendChild(dots(4));
      box.appendChild(el('h2', null, 'Your studio is ready 🎉'));
      box.appendChild(el('p', 'lead', state.className + (state.added ? ' with ' + state.added + ' children' : '') + ' is set up. Here’s a good first lap:'));
      var ul = el('ul', 'pfw-done-list');
      [['1', 'Generate your first AI lesson plan — it differentiates for each child’s profile.', 'planner.html'],
       ['2', 'Capture one observation and let the AI draft the portfolio narrative.', 'portfolio.html'],
       ['3', 'Design your classroom layout with live safety checks.', 'sproutspace-layout.html']].forEach(function (s) {
        var li = el('li');
        li.appendChild(el('span', 'n', s[0]));
        var a = el('a', null, s[1]);
        a.href = s[2];
        a.style.cssText = 'color:var(--text);text-decoration:none;';
        li.appendChild(a);
        ul.appendChild(li);
      });
      box.appendChild(ul);
      var f = el('div', 'pfw-foot');
      f.appendChild(el('span', 'pfw-spacer'));
      var go = el('button', 'btn btn-primary', 'Open my Lesson Planner');
      go.addEventListener('click', function () {
        window.pfDb.from('profiles').update({ onboarded: true }).eq('id', window.pfUser.id).then(function () {
          window.location.href = 'planner.html';
        });
      });
      var stay = el('button', 'btn btn-secondary', 'Go to dashboard');
      stay.addEventListener('click', function () { finish(scrim); });
      f.appendChild(stay); f.appendChild(go);
      box.appendChild(f);
    }

    /* ── Director done ── */
    function stepDirectorDone() {
      box.innerHTML = '';
      box.appendChild(dots(4));
      box.appendChild(el('h2', null, 'Welcome, centre leader'));
      box.appendChild(el('p', 'lead', 'Your role request is noted — HQ verifies director access (your account works fully as an educator meanwhile). The leadership tools live here:'));
      var ul = el('ul', 'pfw-done-list');
      [['1', 'Run a lesson observation with live AI QTT tagging.', 'observation.html'],
       ['2', 'Review submitted classroom layouts from your educators.', 'sproutspace-control.html'],
       ['3', 'See centre-wide activity on the PD dashboard.', 'dashboard.html']].forEach(function (s) {
        var li = el('li');
        li.appendChild(el('span', 'n', s[0]));
        var a = el('a', null, s[1]);
        a.href = s[2];
        a.style.cssText = 'color:var(--text);text-decoration:none;';
        li.appendChild(a);
        ul.appendChild(li);
      });
      box.appendChild(ul);
      var f = el('div', 'pfw-foot');
      f.appendChild(el('span', 'pfw-spacer'));
      var back = el('button', 'btn btn-secondary btn-sm', 'Back');
      back.addEventListener('click', step1);
      var go = el('button', 'btn btn-primary', 'Enter PedaForge');
      go.addEventListener('click', function () { finish(scrim); });
      f.appendChild(back); f.appendChild(go);
      box.appendChild(f);
    }

    step1();
  }

  function boot() {
    if (!window.pfAuthReady) return;
    window.pfAuthReady.then(function (ctx) {
      if (!ctx.user || !ctx.profile) return;
      if (ctx.profile.onboarded) return;
      /* Only trigger on the dashboard to avoid interrupting deep links */
      var here = window.location.pathname.split('/').pop() || 'index.html';
      if (here !== 'index.html') return;
      show(ctx);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

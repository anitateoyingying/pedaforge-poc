/* PedaForge onboarding wizard - first-run setup.
   Shows when profile.onboarded is false. Steps:
   educator: role → create class → add children (paste list or one-by-one) → done
   director: role → done (points at network views).
   Sets profiles.onboarded = true on completion or skip. */
(function () {
  'use strict';

  var TAGS = ['visual-spatial', 'advanced-verbal', 'sensory-avoidant', 'kinesthetic', 'emergent-reader', 'EAL', 'needs-movement-breaks', 'high-support'];

  /* Stroke SVG icons (24px viewBox), matching the app shell's icon style */
  var ICONS = {
    educator: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
    director: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4',
    ic: 'M12 3a7 7 0 0 1 7 7v1a7 7 0 0 1-14 0v-1a7 7 0 0 1 7-7zM12 3v3M9 21h6M12 18v3',
    pg: 'M12 11a4 4 0 1 0-4-4M12 11a4 4 0 1 1 4-4M12 11v10M7 21h10M5.5 13.5 3 16M18.5 13.5 21 16',
    n1: 'M12 3c3 0 5 2.5 5 5.5S14 16 12 16s-5-4.5-5-7.5S9 3 12 3zM12 16v5M10 21h4',
    n2: 'M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5zM2 2l7.586 7.586',
    k1: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2zM9 7h6M9 11h6',
    k2: 'M22 9 12 4 2 9l10 5 10-5zM6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5M22 9v6',
    dice: 'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5zM8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01'
  };
  function svgIcon(key, size) {
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + ICONS[key] + '"/></svg>';
  }

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
    '.pfw-role .ico{display:block;margin-bottom:8px;color:var(--primary,#e8063c);}' +
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
    /* ── create-class step ── */
    '.pfw-age-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:4px;}' +
    '@media(max-width:560px){.pfw-age-grid{grid-template-columns:repeat(2,1fr);}}' +
    '.pfw-age{border:2px solid var(--border,#e8e4dd);border-radius:14px;padding:11px 8px 9px;cursor:pointer;background:#fff;text-align:center;font-family:inherit;transition:border-color .18s ease,background .18s ease,transform .25s cubic-bezier(0.34,1.56,0.64,1);}' +
    '.pfw-age:hover{transform:translateY(-2px);}' +
    '.pfw-age .em{display:block;margin-bottom:4px;color:var(--text-muted,#9ca3af);}.pfw-age.on .em{color:var(--primary,#e8063c);}' +
    '.pfw-age b{display:block;font-size:.78rem;color:var(--secondary,#2D2A5E);}' +
    '.pfw-age span{display:block;font-size:.62rem;color:var(--text-muted,#9ca3af);margin-top:1px;}' +
    '.pfw-age.on{border-color:var(--primary,#e8063c);background:rgba(232,6,60,0.05);}' +
    '.pfw-age.on b{color:var(--primary,#e8063c);}' +
    '.pfw-seg{display:flex;background:var(--bg,#faf6f0);border:1px solid var(--border,#e8e4dd);border-radius:100px;padding:3px;gap:2px;}' +
    '.pfw-seg button{flex:1;border:none;border-radius:100px;padding:8px 6px;background:none;font-family:inherit;font-size:.78rem;font-weight:600;color:var(--text-muted,#9ca3af);cursor:pointer;transition:all .2s ease;}' +
    '.pfw-seg button.on{background:#fff;color:var(--secondary,#2D2A5E);box-shadow:0 1px 3px rgba(45,42,94,0.12),0 3px 8px rgba(45,42,94,0.08);}' +
    '.pfw-2col{display:grid;grid-template-columns:1fr 1fr;gap:12px;}' +
    '@media(max-width:560px){.pfw-2col{grid-template-columns:1fr;}}' +
    '.pfw-name-wrap{position:relative;}' +
    '.pfw-name-wrap input{padding-right:44px;}' +
    '.pfw-dice{position:absolute;right:8px;top:50%;transform:translateY(-50%);border:none;background:none;color:var(--text-muted,#9ca3af);cursor:pointer;padding:6px;border-radius:10px;line-height:0;}' +
    '.pfw-dice:hover{background:var(--bg,#faf6f0);color:var(--secondary,#2D2A5E);}' +
    '.pfw-classcard{margin-top:18px;border-radius:18px;padding:16px 18px;color:#fff;position:relative;overflow:hidden;background:linear-gradient(120deg,#2D2A5E,#221d44);transition:background .4s ease;box-shadow:0 12px 30px rgba(34,29,68,0.25);}' +
    '.pfw-classcard::after{content:"";position:absolute;right:-30px;top:-30px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,0.08);}' +
    '.pfw-classcard .cc-label{font-size:.58rem;font-weight:800;letter-spacing:.18em;text-transform:uppercase;opacity:.65;}' +
    '.pfw-classcard .cc-name{font-family:"Playfair Display",serif;font-size:1.35rem;font-weight:700;margin:2px 0 6px;min-height:1.3em;}' +
    '.pfw-classcard .cc-meta{display:flex;gap:7px;flex-wrap:wrap;}' +
    '.pfw-classcard .cc-pill{font-size:.64rem;font-weight:700;padding:3px 11px;border-radius:100px;background:rgba(255,255,255,0.16);backdrop-filter:blur(2px);}' +
    '@media(prefers-reduced-motion:reduce){.pfw,.pfw-role,.pfw-age{transition:none;}}';

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
    box.setAttribute('aria-label', 'Welcome to PedaForge - set up your studio');
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
      var skip = el('button', 'pfw-skip', opts.skipLabel || 'Skip setup - I\'ll explore first');
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
      box.appendChild(el('p', 'lead', (name ? name + ', l' : 'L') + 'et\'s set up your studio in under two minutes. First, how will you use PedaForge?'));
      var roles = el('div', 'pfw-roles');
      var defs = [
        { key: 'educator', b: 'I teach a class', s: 'Plan lessons, build portfolios, run reading sessions, and design my classroom.' },
        { key: 'director', b: 'I lead a centre / HQ', s: 'Observe educators, review layouts, and see activity across the network.' },
      ];
      var btns = [];
      defs.forEach(function (d) {
        var b = el('button', 'pfw-role' + (state.role === d.key ? ' on' : ''));
        b.type = 'button';
        var ic = el('span', 'ico');
        ic.innerHTML = svgIcon(d.key, 26);
        b.appendChild(ic);
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
      box.appendChild(el('p', 'pfw-hint', 'Directors are verified by HQ - choosing "centre lead" here requests the role; your account works as an educator meanwhile.'));
      box.appendChild(foot('Continue', function () {
        if (state.role === 'director') stepDirectorDone();
        else step2();
      }));
    }

    /* ── Step 2: create class (dynamic) ── */
    var AGES = [
      { key: 'ic', name: 'Infant Care', range: '2-18 mths' },
      { key: 'pg', name: 'Playgroup', range: '18-30 mths' },
      { key: 'n1', name: 'Nursery 1', range: '3 yrs' },
      { key: 'n2', name: 'Nursery 2', range: '4 yrs' },
      { key: 'k1', name: 'Kindergarten 1', range: '5 yrs' },
      { key: 'k2', name: 'Kindergarten 2', range: '6 yrs' }
    ];
    var NAME_IDEAS = {
      ic: ['Buttercups', 'Little Sprouts', 'Snuggle Bugs'],
      pg: ['Bumble Bees', 'Ducklings', 'Tiny Explorers'],
      n1: ['Sunbeams', 'Rainbow Fish', 'Cheeky Monkeys'],
      n2: ['Starlights', 'Bumblebees', 'Wonder Cubs'],
      k1: ['Sunshine', 'Trailblazers', 'Curious Owls'],
      k2: ['Voyagers', 'Bright Sparks', 'Pathfinders']
    };
    var SESSIONS = [['full', 'Full day'], ['am', 'Morning'], ['pm', 'Afternoon']];

    function step2() {
      box.innerHTML = '';
      box.appendChild(dots(2));
      box.appendChild(el('h2', null, 'Create your first class'));
      box.appendChild(el('p', 'lead', 'Everything in PedaForge - lesson plans, portfolios, reading progress - hangs off your class and its children.'));

      var age = 'k1', session = 'full', ideaIdx = 0;

      /* Age-group cards */
      var fAge = el('div', 'pfw-field');
      fAge.appendChild(el('label', null, 'Age group'));
      var grid = el('div', 'pfw-age-grid');
      var ageBtns = {};
      AGES.forEach(function (a) {
        var b = el('button', 'pfw-age' + (a.key === age ? ' on' : ''));
        b.type = 'button';
        var em = el('span', 'em');
        em.innerHTML = svgIcon(a.key, 22);
        b.appendChild(em);
        b.appendChild(el('b', null, a.name));
        b.appendChild(el('span', null, a.range));
        b.addEventListener('click', function () {
          age = a.key;
          Object.keys(ageBtns).forEach(function (k) { ageBtns[k].classList.toggle('on', k === age); });
          preview();
        });
        ageBtns[a.key] = b;
        grid.appendChild(b);
      });
      fAge.appendChild(grid);

      /* Name with idea dice */
      var fName = el('div', 'pfw-field');
      fName.appendChild(el('label', null, 'Class name'));
      var nameWrap = el('div', 'pfw-name-wrap');
      var nameIn = el('input');
      nameIn.placeholder = 'e.g. K1 Sunshine';
      nameIn.maxLength = 60;
      var dice = el('button', 'pfw-dice');
      dice.innerHTML = svgIcon('dice', 18);
      dice.type = 'button';
      dice.title = 'Suggest a name';
      dice.setAttribute('aria-label', 'Suggest a class name');
      dice.addEventListener('click', function () {
        var ideas = NAME_IDEAS[age] || NAME_IDEAS.k1;
        var label = AGES.filter(function (a) { return a.key === age; })[0].name.replace('indergarten ', '').replace('ursery ', '');
        nameIn.value = label + ' ' + ideas[ideaIdx % ideas.length];
        ideaIdx++;
        preview();
        nameIn.focus();
      });
      nameWrap.appendChild(nameIn); nameWrap.appendChild(dice);
      fName.appendChild(nameWrap);

      /* Session + centre side by side */
      var two = el('div', 'pfw-2col');
      var fSess = el('div', 'pfw-field');
      fSess.appendChild(el('label', null, 'Session'));
      var seg = el('div', 'pfw-seg');
      var segBtns = {};
      SESSIONS.forEach(function (s) {
        var b = el('button', s[0] === session ? 'on' : '', s[1]);
        b.type = 'button';
        b.addEventListener('click', function () {
          session = s[0];
          Object.keys(segBtns).forEach(function (k) { segBtns[k].classList.toggle('on', k === session); });
          preview();
        });
        segBtns[s[0]] = b;
        seg.appendChild(b);
      });
      fSess.appendChild(seg);
      var fCentre = el('div', 'pfw-field');
      fCentre.appendChild(el('label', null, 'Centre'));
      var centreIn = window.pfCentreSelect({ placeholder: 'Select your centre (optional)' });
      fCentre.appendChild(centreIn);
      two.appendChild(fSess); two.appendChild(fCentre);

      /* Live class-card preview */
      var card = el('div', 'pfw-classcard');
      card.setAttribute('aria-hidden', 'true');
      card.appendChild(el('span', 'cc-label', 'Your class'));
      var ccName = el('div', 'cc-name', '-');
      var ccMeta = el('div', 'cc-meta');
      card.appendChild(ccName); card.appendChild(ccMeta);

      var GRADIENTS = {
        ic: 'linear-gradient(120deg,#f59e0b,#e8063c)', pg: 'linear-gradient(120deg,#e8063c,#773E8B)',
        n1: 'linear-gradient(120deg,#0E8FA8,#1c9c6b)', n2: 'linear-gradient(120deg,#1c9c6b,#0E8FA8)',
        k1: 'linear-gradient(120deg,#2D2A5E,#773E8B)', k2: 'linear-gradient(120deg,#773E8B,#2D2A5E)'
      };
      function preview() {
        var a = AGES.filter(function (x) { return x.key === age; })[0];
        ccName.textContent = nameIn.value.trim() || 'Name your class...';
        ccName.style.opacity = nameIn.value.trim() ? '1' : '0.55';
        ccMeta.innerHTML = '';
        ccMeta.appendChild(el('span', 'cc-pill', a.name + ' - ' + a.range));
        ccMeta.appendChild(el('span', 'cc-pill', SESSIONS.filter(function (s) { return s[0] === session; })[0][1]));
        if (centreIn.value) ccMeta.appendChild(el('span', 'cc-pill', centreIn.value));
        card.style.background = GRADIENTS[age];
      }
      nameIn.addEventListener('input', preview);
      centreIn.addEventListener('change', preview);

      box.appendChild(fAge); box.appendChild(fName); box.appendChild(two); box.appendChild(card);
      preview();

      box.appendChild(foot('Create class', function (btn) {
        var n = nameIn.value.trim();
        if (!n) { nameIn.focus(); nameIn.style.borderColor = 'var(--danger, #dc2626)'; return; }
        var done = window.pfApi.spinner(btn, 'Creating...');
        window.pfDb.from('classes').insert({
          owner: window.pfUser.id, name: n, age_group: age,
          centre: centreIn.value || null, session: session
        }).select().single().then(function (r) {
          done();
          if (r.error) { window.pfToast('Could not create class: ' + r.error.message); return; }
          state.classId = r.data.id; state.className = r.data.name;
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
      box.appendChild(el('p', 'lead', 'Paste your class list - one child per line. Add learning-profile tags after a comma if you like; you can refine them anytime.'));
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
        var busy = window.pfApi.spinner(btn, 'Adding ' + kids.length + '...');
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
      box.appendChild(el('h2', null, 'Your studio is ready'));
      box.appendChild(el('p', 'lead', state.className + (state.added ? ' with ' + state.added + ' children' : '') + ' is set up. Here\'s a good first lap:'));
      var ul = el('ul', 'pfw-done-list');
      [['1', 'Generate your first AI lesson plan - it differentiates for each child\'s profile.', 'planner.html'],
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
      box.appendChild(el('p', 'lead', 'Your role request is noted - HQ verifies director access (your account works fully as an educator meanwhile). The leadership tools live here:'));
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

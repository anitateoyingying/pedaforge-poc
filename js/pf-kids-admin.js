/* PedaForge Home Admin: enrolment + billing pipeline, per-class
   curriculum control, seasonal templates. */
(function () {
  'use strict';

  var FACE_COLORS = ['#e8063c', '#1c9c6b', '#0E8FA8', '#773E8B', '#FF9E18', '#2D2A5E'];
  var WORD_BANK = ['ship', 'boat', 'sea', 'whale', 'shell', 'fish', 'wave', 'splash', 'crab', 'sunset'];
  var SOUND_BANK = [
    { key: 'sh', label: '/sh/ as in ship' },
    { key: 'ch', label: '/ch/ as in chip' },
    { key: 'th', label: '/th/ as in thin' },
    { key: 'a', label: '/a/ as in ant' },
    { key: 'e', label: '/e/ as in egg' },
    { key: 'i', label: '/i/ as in ink' },
    { key: 'o', label: '/o/ as in on' },
    { key: 'u', label: '/u/ as in up' }
  ];
  var MODULES = [
    { key: 'reading', name: 'Reading Time', color: '#4fb8c9', ico: 'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2' },
    { key: 'phonics', name: 'Sound Studio', color: '#b48fd9', ico: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z' },
    { key: 'dictionary', name: 'Word Jar', color: '#ffcf5c', ico: 'M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7' },
    { key: 'draw', name: 'Paint Corner', color: '#ff7d6b', ico: 'M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z' },
    { key: 'benchmark', name: 'Star Check', color: '#5fae62', ico: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' }
  ];
  var SEASONS = [['any', 'Any time'], ['term1', 'Term 1'], ['term2', 'Term 2'], ['term3', 'Term 3'], ['term4', 'Term 4'], ['holiday', 'Holidays']];

  var db, uid, isDirector = false;
  var classes = [];
  var enrolments = {};   // child_id -> enrolment row
  var cur = null;        // working curriculum for selected class

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function initials(name) {
    return String(name).split(/\s+/).map(function (w) { return w.charAt(0); }).slice(0, 2).join('').toUpperCase();
  }
  function svg(d) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>';
  }
  function defaultCurriculum() {
    return {
      modules: { reading: true, phonics: true, dictionary: true, draw: true, benchmark: true },
      words: WORD_BANK.slice(0, 6),
      custom_words: [],
      sounds: ['sh', 'ch'],
      passage: '',
      theme: ''
    };
  }

  /* ── Tabs ─────────────────────────────────────────────── */
  function initTabs() {
    document.querySelectorAll('.ka-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.ka-tab').forEach(function (t) { t.classList.toggle('on', t === tab); });
        document.querySelectorAll('.ka-panel').forEach(function (p) { p.classList.toggle('on', p.id === tab.dataset.panel); });
      });
    });
  }

  /* ── Enrolments & billing ─────────────────────────────── */
  function loadEnrolments() {
    return db.from('home_enrolments').select('*').then(function (r) {
      enrolments = {};
      (r.data || []).forEach(function (e) { enrolments[e.child_id] = e; });
    });
  }

  function upsertEnrolment(kid, patch, btn, refresh) {
    var existing = enrolments[kid.id];
    var done = btn ? window.pfApi.spinner(btn, '...') : function () {};
    var op;
    if (existing) {
      op = db.from('home_enrolments').update(patch).eq('id', existing.id);
    } else {
      var row = { child_id: kid.id, owner: uid };
      Object.keys(patch).forEach(function (k) { row[k] = patch[k]; });
      op = db.from('home_enrolments').insert(row);
    }
    op.then(function (r) {
      done();
      if (r.error) { window.pfToast('Failed: ' + r.error.message); return; }
      loadEnrolments().then(refresh);
    });
  }

  function promptParent(kid, refresh) {
    var name = prompt('Parent name for ' + kid.name + ':', (enrolments[kid.id] || {}).parent_name || '');
    if (name === null) return;
    var email = prompt('Parent email:', (enrolments[kid.id] || {}).parent_email || '');
    if (email === null) return;
    upsertEnrolment(kid, { parent_name: name.trim() || null, parent_email: email.trim() || null }, null, refresh);
  }

  function enrRow(kid, clsName, i, refresh) {
    var e = enrolments[kid.id] || { billing_status: 'unbilled', status: 'pending' };
    var row = el('div', 'enr-row');

    var kd = el('div', 'enr-kid');
    var face = el('span', 'face', initials(kid.name));
    face.style.background = FACE_COLORS[i % FACE_COLORS.length];
    var kb = el('span');
    var b = el('b', null, kid.name);
    var small = el('small', null, clsName);
    kb.appendChild(b); kb.appendChild(small);
    kd.appendChild(face); kd.appendChild(kb);
    row.appendChild(kd);

    var parent = el('button', 'enr-parent');
    parent.style.cssText = 'border:none;background:none;cursor:pointer;text-align:left;font-family:inherit;padding:0;';
    parent.textContent = e.parent_name ? (e.parent_name + (e.parent_email ? ' - ' + e.parent_email : '')) : '+ add parent contact';
    parent.title = 'Edit parent contact';
    parent.addEventListener('click', function () { promptParent(kid, refresh); });
    row.appendChild(parent);

    var bill = el('span', 'pill ' + e.billing_status);
    bill.innerHTML = '<span class="dot"></span>' + e.billing_status;
    row.appendChild(bill);
    var st = el('span', 'pill ' + e.status);
    st.innerHTML = '<span class="dot"></span>' + e.status;
    row.appendChild(st);

    var actions = el('div', 'enr-actions');
    function actionBtn(label, cls, patch, confirmMsg) {
      var btn = el('button', 'btn btn-sm ' + cls, label);
      btn.addEventListener('click', function () {
        if (confirmMsg && !confirm(confirmMsg)) return;
        upsertEnrolment(kid, patch, btn, refresh);
      });
      return btn;
    }
    if (e.billing_status === 'unbilled') {
      var ref = 'INV-' + new Date().getFullYear() + '-' + String(Math.abs(kid.id.charCodeAt(0) * 7919 % 9000) + 1000);
      actions.appendChild(actionBtn('Mark invoiced', 'btn-secondary', { billing_status: 'invoiced', invoice_ref: ref, billed_at: new Date().toISOString() }));
      actions.appendChild(actionBtn('Waive fees', 'btn-secondary', { billing_status: 'waived' }));
    } else if (e.billing_status === 'invoiced') {
      actions.appendChild(actionBtn('Mark paid', 'btn-secondary', { billing_status: 'paid', paid_at: new Date().toISOString() }));
    }
    if (e.status !== 'active' && (e.billing_status === 'paid' || e.billing_status === 'waived')) {
      actions.appendChild(actionBtn('Activate', 'btn-primary', { status: 'active', activated_at: new Date().toISOString() }));
    }
    if (e.status === 'active') {
      actions.appendChild(actionBtn('Suspend', 'btn-secondary', { status: 'suspended' }, 'Suspend ' + kid.name + '? They will not be able to enter the kids world until reactivated.'));
    }
    if (e.status === 'suspended') {
      actions.appendChild(actionBtn('Reactivate', 'btn-primary', { status: 'active', activated_at: new Date().toISOString() }));
    }
    if (e.invoice_ref) {
      var refSpan = el('span', 'cur-status', e.invoice_ref);
      refSpan.style.alignSelf = 'center';
      actions.appendChild(refSpan);
    }
    row.appendChild(actions);
    return row;
  }

  function renderEnrolments() {
    var host = $('enrList');
    host.innerHTML = '';
    var any = false;
    classes.forEach(function (cls) {
      (cls.children || []).slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).forEach(function (kid, i) {
        any = true;
        host.appendChild(enrRow(kid, cls.name, i, renderEnrolments));
      });
    });
    if (!any) {
      host.innerHTML = '<span class="empty-note">No children yet - <a href="classes.html">add your class list</a> first.</span>';
    }
  }

  /* ── Curriculum editor ────────────────────────────────── */
  function currentClass() {
    return classes.filter(function (c) { return c.id === $('curClass').value; })[0] || null;
  }

  function loadCurriculum() {
    var cls = currentClass();
    cur = (cls && cls.curriculum) ? JSON.parse(JSON.stringify(cls.curriculum)) : defaultCurriculum();
    if (!cur.modules) cur.modules = defaultCurriculum().modules;
    if (!Array.isArray(cur.words)) cur.words = [];
    if (!Array.isArray(cur.custom_words)) cur.custom_words = [];
    if (!Array.isArray(cur.sounds)) cur.sounds = [];
    $('curTheme').value = cur.theme || '';
    $('curPassage').value = cur.passage || '';
    renderCurriculum();
  }

  /* Paints the editor from the WORKING copy (cur) without resetting it. */
  function renderCurriculum() {

    /* modules */
    var mg = $('curModules');
    mg.innerHTML = '';
    MODULES.forEach(function (m) {
      var on = cur.modules[m.key] !== false;
      var tile = el('div', 'mod-tile' + (on ? ' on' : ''));
      tile.setAttribute('role', 'switch');
      tile.setAttribute('aria-checked', on);
      tile.tabIndex = 0;
      var ico = el('span', 'mt-ico');
      ico.style.background = m.color;
      ico.innerHTML = svg(m.ico);
      var body = el('span');
      body.appendChild(el('b', null, m.name));
      body.appendChild(el('small', null, on ? 'Open to children' : 'Locked'));
      var state = el('span', 'mt-state', on ? 'Open' : 'Locked');
      tile.appendChild(ico); tile.appendChild(body); tile.appendChild(state);
      function toggle() {
        cur.modules[m.key] = !(cur.modules[m.key] !== false);
        renderCurriculum();
      }
      tile.addEventListener('click', toggle);
      tile.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } });
      mg.appendChild(tile);
    });

    /* word bank */
    var wb = $('curWords');
    wb.innerHTML = '';
    WORD_BANK.forEach(function (w) {
      var chip = el('button', 'word-chip' + (cur.words.indexOf(w) >= 0 ? ' on' : ''), w);
      chip.type = 'button';
      chip.addEventListener('click', function () {
        if (cur.words.indexOf(w) >= 0) cur.words = cur.words.filter(function (x) { return x !== w; });
        else cur.words.push(w);
        chip.classList.toggle('on');
      });
      wb.appendChild(chip);
    });

    /* custom words */
    var cw = $('curCustomWords');
    cw.innerHTML = '';
    cur.custom_words.forEach(function (w, idx) {
      var row = el('div', 'cw-row');
      var word = el('input'); word.placeholder = 'word'; word.value = w.word || ''; word.maxLength = 30;
      var def = el('input'); def.placeholder = 'kid-friendly meaning'; def.value = w.definition || ''; def.maxLength = 120;
      var ex = el('input'); ex.placeholder = 'example sentence'; ex.value = w.example || ''; ex.maxLength = 140;
      [word, def, ex].forEach(function (inp, fi) {
        inp.addEventListener('input', function () {
          cur.custom_words[idx][['word', 'definition', 'example'][fi]] = inp.value;
        });
      });
      var del = el('button', 'cw-del', '✕');
      del.title = 'Remove word';
      del.addEventListener('click', function () {
        cur.custom_words.splice(idx, 1);
        renderCurriculum();
      });
      row.appendChild(word); row.appendChild(def); row.appendChild(ex); row.appendChild(del);
      cw.appendChild(row);
    });

    /* sounds */
    var sb = $('curSounds');
    sb.innerHTML = '';
    SOUND_BANK.forEach(function (s) {
      var chip = el('button', 'word-chip' + (cur.sounds.indexOf(s.key) >= 0 ? ' on' : ''), s.label);
      chip.type = 'button';
      chip.addEventListener('click', function () {
        if (cur.sounds.indexOf(s.key) >= 0) cur.sounds = cur.sounds.filter(function (x) { return x !== s.key; });
        else cur.sounds.push(s.key);
        chip.classList.toggle('on');
      });
      sb.appendChild(chip);
    });
  }

  function collectCurriculum() {
    cur.theme = $('curTheme').value.trim();
    cur.passage = $('curPassage').value.trim();
    cur.custom_words = cur.custom_words.filter(function (w) { return (w.word || '').trim(); });
    return cur;
  }

  function saveCurriculum() {
    var cls = currentClass();
    if (!cls) { window.pfToast('Pick a class first.'); return; }
    var payload = collectCurriculum();
    var done = window.pfApi.spinner($('curSave'), 'Saving...');
    db.from('classes').update({ curriculum: payload }).eq('id', cls.id).then(function (r) {
      done();
      if (r.error) { window.pfToast('Failed: ' + r.error.message); return; }
      cls.curriculum = JSON.parse(JSON.stringify(payload));
      $('curStatus').textContent = 'Saved to ' + cls.name + ' - live in the kids world now.';
      window.pfToast('Curriculum saved for ' + cls.name);
    });
  }

  /* ── Templates ────────────────────────────────────────── */
  function saveTemplate() {
    var cls = currentClass();
    if (!cls) { window.pfToast('Pick a class first.'); return; }
    var name = prompt('Template name:', ($('curTheme').value.trim() || cls.name + ' plan'));
    if (name === null || !name.trim()) return;
    var seasonPick = prompt('Season (any / term1 / term2 / term3 / term4 / holiday):', 'any');
    if (seasonPick === null) return;
    seasonPick = seasonPick.trim().toLowerCase();
    if (['any', 'term1', 'term2', 'term3', 'term4', 'holiday'].indexOf(seasonPick) < 0) seasonPick = 'any';
    var done = window.pfApi.spinner($('curSaveTpl'), 'Saving...');
    db.from('curriculum_templates').insert({
      owner: uid, name: name.trim(), season: seasonPick,
      age_groups: [cls.age_group], curriculum: collectCurriculum(), shared: isDirector
    }).then(function (r) {
      done();
      if (r.error) { window.pfToast('Failed: ' + r.error.message); return; }
      window.pfToast('Template saved' + (isDirector ? ' and shared with the network' : ''));
      loadTemplates();
    });
  }

  function loadTemplates() {
    db.from('curriculum_templates').select('*').order('created_at', { ascending: false }).limit(30)
      .then(function (r) {
        var grid = $('tplGrid');
        grid.innerHTML = '';
        var rows = r.data || [];
        if (!rows.length) {
          grid.innerHTML = '<span class="empty-note">No templates yet. Set up a class in the Curriculum tab and press "Save as Template".</span>';
          return;
        }
        rows.forEach(function (t) {
          var card = el('div', 'tpl-card');
          var head = el('div');
          head.style.cssText = 'display:flex;align-items:center;gap:8px;justify-content:space-between;';
          head.appendChild(el('h4', null, t.name));
          var season = el('span', 'season-tag season-' + t.season, (SEASONS.filter(function (s) { return s[0] === t.season; })[0] || ['', t.season])[1]);
          head.appendChild(season);
          card.appendChild(head);
          var c = t.curriculum || {};
          var openMods = MODULES.filter(function (m) { return (c.modules || {})[m.key] !== false; });
          card.appendChild(el('div', 'tpl-meta',
            (t.age_groups || []).join(', ').toUpperCase() +
            (t.shared ? ' - shared' : '') +
            ' - ' + ((c.words || []).length + (c.custom_words || []).length) + ' words, ' + (c.sounds || []).length + ' sounds'));
          var mods = el('div', 'tpl-mods');
          openMods.forEach(function (m) { mods.appendChild(el('span', null, m.name)); });
          card.appendChild(mods);
          var actions = el('div', 'tpl-actions');
          var apply = el('button', 'btn btn-primary btn-sm', 'Apply to class...');
          apply.addEventListener('click', function () {
            var names = classes.map(function (cl, i) { return (i + 1) + '. ' + cl.name; }).join('\n');
            var pick = prompt('Apply "' + t.name + '" to which class?\n' + names + '\n\nEnter the number:');
            if (pick === null) return;
            var idx = parseInt(pick, 10) - 1;
            var cls = classes[idx];
            if (!cls) { window.pfToast('No such class.'); return; }
            var done = window.pfApi.spinner(apply, 'Applying...');
            db.from('classes').update({ curriculum: t.curriculum }).eq('id', cls.id).then(function (r2) {
              done();
              if (r2.error) { window.pfToast('Failed: ' + r2.error.message); return; }
              cls.curriculum = t.curriculum;
              window.pfToast('Applied "' + t.name + '" to ' + cls.name);
              if ($('curClass').value === cls.id) loadCurriculum();
            });
          });
          actions.appendChild(apply);
          if (t.owner === uid) {
            var del = el('button', 'btn btn-secondary btn-sm', 'Delete');
            del.addEventListener('click', function () {
              if (!confirm('Delete template "' + t.name + '"?')) return;
              db.from('curriculum_templates').delete().eq('id', t.id).then(loadTemplates);
            });
            actions.appendChild(del);
          }
          card.appendChild(actions);
          grid.appendChild(card);
        });
      });
  }

  /* ── Boot ─────────────────────────────────────────────── */
  function init(ctx) {
    if (!ctx.user) return;
    db = ctx.db;
    uid = ctx.user.id;
    isDirector = ctx.profile && ctx.profile.role === 'director';

    initTabs();

    Promise.all([window.pfApi.myClasses(), loadEnrolments()]).then(function (rs) {
      classes = rs[0];
      renderEnrolments();

      var sel = $('curClass');
      sel.innerHTML = '';
      classes.forEach(function (c) {
        var o = el('option', null, c.name + ' (' + String(c.age_group || '').toUpperCase() + ')');
        o.value = c.id;
        sel.appendChild(o);
      });
      if (!classes.length) {
        var o0 = el('option', null, 'No classes yet');
        o0.value = '';
        sel.appendChild(o0);
      }
      sel.addEventListener('change', loadCurriculum);
      loadCurriculum();
      loadTemplates();
    });

    $('curSave').addEventListener('click', saveCurriculum);
    $('curSaveTpl').addEventListener('click', saveTemplate);
    $('cwAdd').addEventListener('click', function () {
      cur.custom_words.push({ word: '', definition: '', example: '' });
      renderCurriculum();
    });
  }

  function boot() {
    if (window.pfAuthReady) window.pfAuthReady.then(init);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

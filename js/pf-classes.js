/* My Classes: refined creator, decluttered children rows with a tag
   popover editor, card/table view toggle (persisted). */
(function () {
  'use strict';

  var TAGS = ['visual-spatial', 'advanced-verbal', 'sensory-avoidant', 'kinesthetic', 'emergent-reader', 'EAL', 'needs-movement-breaks', 'high-support'];
  var FACE_COLORS = ['#e8063c', '#1c9c6b', '#0E8FA8', '#773E8B', '#FF9E18', '#2D2A5E'];
  var LS_VIEW = 'pedaforge:classes:view';

  var classes = [];

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

  /* ── Tag popover editor ─────────────────────────────────── */
  function closeTagPop() {
    var p = document.getElementById('tagPop');
    if (p) p.remove();
  }
  function openTagPop(anchor, kid) {
    closeTagPop();
    var pop = el('div', 'tag-pop');
    pop.id = 'tagPop';
    pop.appendChild(el('h4', null, kid.name + ' - learning profile'));
    var picks = el('div', 'tag-picks');
    var current = (kid.profile_tags || []).slice();
    TAGS.forEach(function (t) {
      var b = el('button', 'tag-pick' + (current.indexOf(t) >= 0 ? ' on' : ''), t);
      b.type = 'button';
      b.addEventListener('click', function () {
        b.classList.toggle('on');
        if (b.classList.contains('on')) current.push(t);
        else current = current.filter(function (x) { return x !== t; });
      });
      picks.appendChild(b);
    });
    pop.appendChild(picks);
    var foot = el('div');
    foot.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:12px;';
    var cancel = el('button', 'btn btn-secondary btn-sm', 'Cancel');
    cancel.addEventListener('click', closeTagPop);
    var save = el('button', 'btn btn-primary btn-sm', 'Save');
    save.addEventListener('click', function () {
      var done = window.pfApi.spinner(save, 'Saving...');
      window.pfDb.from('children').update({ profile_tags: current }).eq('id', kid.id)
        .then(function (r) {
          done();
          if (r.error) { window.pfToast('Could not save: ' + r.error.message); return; }
          closeTagPop();
          load();
        });
    });
    foot.appendChild(cancel); foot.appendChild(save);
    pop.appendChild(foot);
    document.body.appendChild(pop);
    var rect = anchor.getBoundingClientRect();
    var left = Math.min(rect.left, window.innerWidth - 320);
    pop.style.left = Math.max(12, left) + 'px';
    pop.style.top = (rect.bottom + window.scrollY + 8) + 'px';
    setTimeout(function () {
      document.addEventListener('click', function close(e) {
        if (!pop.contains(e.target) && e.target !== anchor) { closeTagPop(); document.removeEventListener('click', close); }
      });
    }, 50);
  }

  function tagSummary(kid, colorIdx) {
    var tags = kid.profile_tags || [];
    var btn = el('button', 'kid-tagsum');
    btn.type = 'button';
    btn.title = tags.length ? tags.join(', ') : 'Set learning profile';
    if (!tags.length) btn.textContent = '+ profile';
    else if (tags.length === 1) btn.textContent = tags[0];
    else btn.textContent = tags[0] + ' +' + (tags.length - 1);
    btn.addEventListener('click', function (e) { e.stopPropagation(); openTagPop(btn, kid); });
    return btn;
  }

  /* ── Card view ──────────────────────────────────────────── */
  function kidRow(kid, i) {
    var r = el('div', 'kid-row');
    var face = el('span', 'kid-face', initials(kid.name));
    face.style.background = FACE_COLORS[i % FACE_COLORS.length];
    var name = el('a', 'kid-name', kid.name);
    name.href = 'child.html?id=' + encodeURIComponent(kid.id);
    name.title = 'Open ' + kid.name + '\'s profile';
    var del = el('button', 'kid-del', '✕');
    del.title = 'Remove child';
    del.setAttribute('aria-label', 'Remove ' + kid.name);
    del.addEventListener('click', function () {
      if (!confirm('Remove ' + kid.name + ' and all their records?')) return;
      window.pfApi.removeChild(kid.id).then(load);
    });
    r.appendChild(face); r.appendChild(name); r.appendChild(tagSummary(kid, i)); r.appendChild(del);
    return r;
  }

  function classCard(cls) {
    var card = el('div', 'cls-card');
    var head = el('div', 'cls-card-head');
    head.appendChild(el('h3', null, cls.name));
    head.appendChild(el('span', 'cls-meta',
      String(cls.age_group || '').toUpperCase() + (cls.centre ? ' - ' + cls.centre : '')));
    card.appendChild(head);
    var kids = (cls.children || []).slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    card.appendChild(el('span', 'cls-meta', kids.length + (kids.length === 1 ? ' child' : ' children')));
    var list = el('div', 'kid-list');
    if (!kids.length) list.appendChild(el('span', 'empty-note', 'No children yet - add your first below.'));
    kids.forEach(function (k, i) { list.appendChild(kidRow(k, i)); });
    card.appendChild(list);

    /* collapsed add-child */
    var toggle = el('button', 'add-kid-toggle');
    toggle.type = 'button';
    toggle.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg> Add child';
    var form = el('div', 'add-kid');
    var nameIn = el('input');
    nameIn.placeholder = 'Child\'s name (or initials for privacy)';
    nameIn.maxLength = 80;
    var picks = el('div', 'tag-picks');
    var chosen = [];
    TAGS.forEach(function (t) {
      var b = el('button', 'tag-pick', t);
      b.type = 'button';
      b.addEventListener('click', function () {
        b.classList.toggle('on');
        if (b.classList.contains('on')) chosen.push(t);
        else chosen = chosen.filter(function (x) { return x !== t; });
      });
      picks.appendChild(b);
    });
    var btnRow = el('div');
    btnRow.style.cssText = 'display:flex;gap:8px;';
    var addBtn = el('button', 'btn btn-primary btn-sm', 'Add Child');
    addBtn.addEventListener('click', function () {
      var n = nameIn.value.trim();
      if (!n) { nameIn.focus(); return; }
      var done = window.pfApi.spinner(addBtn, 'Adding...');
      window.pfApi.addChild(cls.id, n, chosen).then(function () { done(); load(); },
        function (e) { done(); window.pfToast('Failed: ' + e.message); });
    });
    var cancelBtn = el('button', 'btn btn-secondary btn-sm', 'Cancel');
    cancelBtn.addEventListener('click', function () { form.classList.remove('open'); toggle.style.display = ''; });
    btnRow.appendChild(addBtn); btnRow.appendChild(cancelBtn);
    form.appendChild(nameIn); form.appendChild(picks); form.appendChild(btnRow);
    toggle.addEventListener('click', function () {
      form.classList.add('open');
      toggle.style.display = 'none';
      nameIn.focus();
    });
    card.appendChild(toggle);
    card.appendChild(form);
    return card;
  }

  /* ── Table view ─────────────────────────────────────────── */
  function renderTable() {
    var body = $('clsTableBody');
    body.innerHTML = '';
    var rows = 0;
    classes.forEach(function (cls) {
      (cls.children || []).slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).forEach(function (kid, i) {
        rows++;
        var tr = el('tr');
        var tdName = el('td');
        var face = el('span', 'kid-face', initials(kid.name));
        face.style.cssText = 'background:' + FACE_COLORS[i % FACE_COLORS.length] + ';width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:0.62rem;font-weight:800;margin-right:9px;vertical-align:middle;';
        var a = el('a', 'kid-name', kid.name);
        a.href = 'child.html?id=' + encodeURIComponent(kid.id);
        a.style.cssText = 'font-weight:600;color:var(--text);text-decoration:none;';
        tdName.appendChild(face); tdName.appendChild(a);
        var tdClass = el('td', null, cls.name);
        var tdAge = el('td', null, String(cls.age_group || '').toUpperCase());
        var tdTags = el('td');
        tdTags.appendChild(tagSummary(kid, i));
        var tdDel = el('td');
        var del = el('button', 'kid-del', '✕');
        del.title = 'Remove child';
        del.style.cssText = 'border:none;background:none;cursor:pointer;color:var(--text-muted);width:34px;height:34px;border-radius:10px;';
        del.addEventListener('click', function () {
          if (!confirm('Remove ' + kid.name + ' and all their records?')) return;
          window.pfApi.removeChild(kid.id).then(load);
        });
        tdDel.appendChild(del);
        tr.appendChild(tdName); tr.appendChild(tdClass); tr.appendChild(tdAge); tr.appendChild(tdTags); tr.appendChild(tdDel);
        body.appendChild(tr);
      });
    });
    if (!rows) {
      var tr = el('tr');
      var td = el('td', 'empty-note', 'No children yet - switch to Cards to add your first class.');
      td.colSpan = 5;
      tr.appendChild(td);
      body.appendChild(tr);
    }
  }

  /* ── View toggle ────────────────────────────────────────── */
  function setView(v) {
    document.body.classList.toggle('view-table', v === 'table');
    $('viewCards').classList.toggle('on', v !== 'table');
    $('viewTable').classList.toggle('on', v === 'table');
    $('viewCards').setAttribute('aria-selected', v !== 'table');
    $('viewTable').setAttribute('aria-selected', v === 'table');
    try { localStorage.setItem(LS_VIEW, v); } catch (e) {}
  }

  /* ── Load & render ──────────────────────────────────────── */
  function load() {
    window.pfApi.myClasses().then(function (data) {
      classes = data;
      var grid = $('clsGrid');
      grid.innerHTML = '';
      var kidTotal = classes.reduce(function (n, c) { return n + (c.children ? c.children.length : 0); }, 0);
      $('clsCount').textContent = classes.length
        ? classes.length + (classes.length === 1 ? ' class' : ' classes') + ' - ' + kidTotal + (kidTotal === 1 ? ' child' : ' children')
        : '';
      if (!classes.length) {
        grid.innerHTML = '<span class="empty-note">No classes yet. Create your first class above - e.g. "K1 Sunshine".</span>';
      } else {
        classes.forEach(function (c) { grid.appendChild(classCard(c)); });
      }
      renderTable();
    });
  }

  function init(ctx) {
    if (!ctx.user) return;

    /* centre dropdown */
    var host = $('ncCentre');
    if (host && window.pfCentreSelect) {
      var sel = window.pfCentreSelect({ placeholder: 'Select centre (optional)' });
      Array.prototype.slice.call(sel.children).forEach(function (n) { host.appendChild(n); });
    }

    $('ncBtn').addEventListener('click', function () {
      var name = $('ncName').value.trim();
      if (!name) { $('ncName').focus(); return; }
      var done = window.pfApi.spinner(this, 'Creating...');
      window.pfApi.createClass(name, $('ncAge').value, $('ncCentre').value)
        .then(function () { done(); $('ncName').value = ''; load(); },
          function (e) { done(); window.pfToast('Failed: ' + e.message); });
    });

    $('viewCards').addEventListener('click', function () { setView('cards'); });
    $('viewTable').addEventListener('click', function () { setView('table'); });
    var saved = 'cards';
    try { saved = localStorage.getItem(LS_VIEW) || 'cards'; } catch (e) {}
    setView(saved);

    load();
  }

  function boot() {
    if (window.pfAuthReady) window.pfAuthReady.then(init);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

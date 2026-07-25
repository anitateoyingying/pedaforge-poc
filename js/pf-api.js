/* PedaForge data layer — classes, children, AI invocation, shared UI helpers.
   Loads after pf-auth.js on every app page. */
(function () {
  'use strict';

  function db() { return window.pfDb; }
  function uid() { return window.pfUser && window.pfUser.id; }

  /* ── AI ──────────────────────────────────────────────── */
  function ai(action, params) {
    return db().functions.invoke('ai', { body: Object.assign({ action: action }, params || {}) })
      .then(function (r) {
        if (r.error) throw new Error(r.error.message || 'AI request failed');
        if (!r.data || r.data.ok === false) throw new Error((r.data && r.data.error) || 'AI request failed');
        return r.data.result;
      });
  }

  /* ── Classes & children ──────────────────────────────── */
  function myClasses() {
    return db().from('classes').select('id,name,age_group,centre,children(id,name,profile_tags,notes)')
      .order('created_at', { ascending: false })
      .then(function (r) { if (r.error) throw r.error; return r.data || []; });
  }
  function createClass(name, ageGroup, centre) {
    return db().from('classes').insert({ owner: uid(), name: name, age_group: ageGroup, centre: centre || null })
      .select().single().then(function (r) { if (r.error) throw r.error; return r.data; });
  }
  function addChild(classId, name, tags, notes) {
    return db().from('children').insert({ class_id: classId, name: name, profile_tags: tags || [], notes: notes || null })
      .select().single().then(function (r) { if (r.error) throw r.error; return r.data; });
  }
  function removeChild(id) {
    return db().from('children').delete().eq('id', id);
  }

  /* ── Child picker (shared component) ─────────────────────
     Renders class→child selects into a host element.
     opts: { onPick(child|null), storageKey, allowNone }        */
  function childPicker(host, opts) {
    opts = opts || {};
    var LS = 'pedaforge:lastChild';
    host.innerHTML = '';
    host.classList.add('pf-picker');
    var classSel = document.createElement('select');
    var childSel = document.createElement('select');
    classSel.className = childSel.className = 'age-select';
    classSel.setAttribute('aria-label', 'Class');
    childSel.setAttribute('aria-label', 'Child');
    var manage = document.createElement('a');
    manage.href = 'classes.html';
    manage.className = 'pf-picker-manage';
    manage.textContent = 'Manage classes';
    host.appendChild(classSel); host.appendChild(childSel); host.appendChild(manage);

    var classes = [];
    function currentChild() {
      var cls = classes.filter(function (c) { return c.id === classSel.value; })[0];
      if (!cls) return null;
      return (cls.children || []).filter(function (k) { return k.id === childSel.value; })[0] || null;
    }
    function fillChildren() {
      var cls = classes.filter(function (c) { return c.id === classSel.value; })[0];
      childSel.innerHTML = '';
      var kids = (cls && cls.children) || [];
      if (opts.allowNone) {
        var o0 = document.createElement('option');
        o0.value = ''; o0.textContent = 'No child (general)';
        childSel.appendChild(o0);
      }
      kids.forEach(function (k) {
        var o = document.createElement('option');
        o.value = k.id; o.textContent = k.name;
        childSel.appendChild(o);
      });
      if (!kids.length && !opts.allowNone) {
        var oe = document.createElement('option');
        oe.value = ''; oe.textContent = 'No children in this class yet';
        childSel.appendChild(oe);
      }
      try {
        var last = JSON.parse(localStorage.getItem(LS) || '{}');
        if (last.childId && kids.some(function (k) { return k.id === last.childId; })) childSel.value = last.childId;
      } catch (e) {}
      notify();
    }
    function notify() {
      var child = currentChild();
      try { localStorage.setItem(LS, JSON.stringify({ classId: classSel.value, childId: childSel.value })); } catch (e) {}
      if (opts.onPick) opts.onPick(child, classes.filter(function (c) { return c.id === classSel.value; })[0] || null);
    }
    classSel.addEventListener('change', fillChildren);
    childSel.addEventListener('change', notify);

    return myClasses().then(function (data) {
      classes = data;
      classSel.innerHTML = '';
      if (!classes.length) {
        host.innerHTML = '<span class="pf-picker-empty">No classes yet — <a href="classes.html">create your class</a> to begin.</span>';
        if (opts.onPick) opts.onPick(null, null);
        return { classes: classes };
      }
      classes.forEach(function (c) {
        var o = document.createElement('option');
        o.value = c.id; o.textContent = c.name + ' (' + c.age_group.toUpperCase() + ')';
        classSel.appendChild(o);
      });
      try {
        var last = JSON.parse(localStorage.getItem(LS) || '{}');
        if (last.classId && classes.some(function (c) { return c.id === last.classId; })) classSel.value = last.classId;
      } catch (e) {}
      fillChildren();
      return { classes: classes };
    });
  }

  /* ── Storage upload helper ───────────────────────────── */
  function uploadArtefact(file, prefix) {
    var path = uid() + '/' + prefix + '-' + Date.now() + '-' + file.name.replace(/[^\w.-]+/g, '_');
    return db().storage.from('artefacts').upload(path, file, { upsert: false })
      .then(function (r) { if (r.error) throw r.error; return path; });
  }
  function artefactUrl(path) {
    return db().storage.from('artefacts').createSignedUrl(path, 3600)
      .then(function (r) { return r.data ? r.data.signedUrl : null; });
  }

  /* ── Small UI helpers ────────────────────────────────── */
  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function spinner(btn, busyText) {
    var orig = btn.textContent;
    btn.disabled = true;
    btn.dataset.orig = orig;
    btn.textContent = busyText || 'Working…';
    return function done() { btn.disabled = false; btn.textContent = btn.dataset.orig; };
  }
  function ago(iso) {
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return 'just now';
    if (s < 3600) return Math.round(s / 60) + ' min ago';
    if (s < 86400) return Math.round(s / 3600) + ' h ago';
    return Math.round(s / 86400) + ' d ago';
  }

  if (!document.getElementById('pfPickerCss')) {
    var st = document.createElement('style');
    st.id = 'pfPickerCss';
    st.textContent =
      '.pf-picker{display:flex;gap:10px;align-items:center;flex-wrap:wrap;}' +
      '.pf-picker-manage{font-size:0.76rem;color:var(--text-muted);}' +
      '.pf-picker-empty{font-size:0.85rem;color:var(--text-light);}' +
      '.pf-ai-badge{display:inline-flex;align-items:center;gap:5px;font-size:0.68rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#8b5cf6;}';
    document.head.appendChild(st);
  }

  window.pfApi = {
    ai: ai,
    myClasses: myClasses,
    createClass: createClass,
    addChild: addChild,
    removeChild: removeChild,
    childPicker: childPicker,
    uploadArtefact: uploadArtefact,
    artefactUrl: artefactUrl,
    esc: esc,
    spinner: spinner,
    ago: ago
  };
})();

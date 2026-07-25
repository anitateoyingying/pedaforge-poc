/* PedaForge Lesson Planner — real classes/children from DB, AI-generated
   differentiated plans via pfApi.ai('lesson_plan'), persisted to lessons. */
(function () {
  'use strict';

  var classes = [];
  var excluded = {};       /* child id -> true when excluded */
  var currentPlan = null;  /* last AI plan (unsaved or loaded) */
  var currentTheme = '';
  var currentFrameworks = [];

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function currentClass() {
    var id = $('plannerClass').value;
    return classes.filter(function (c) { return c.id === id; })[0] || null;
  }

  /* ── Sidebar: class select + child chips ─────────────── */
  function renderClassSelect() {
    var sel = $('plannerClass');
    sel.innerHTML = '';
    classes.forEach(function (c) {
      var o = document.createElement('option');
      o.value = c.id;
      o.textContent = c.name + ' (' + String(c.age_group || '').toUpperCase() + ')';
      sel.appendChild(o);
    });
  }

  function renderChildren() {
    var host = $('plannerChildren');
    host.innerHTML = '';
    excluded = {};
    var cls = currentClass();
    var kids = (cls && cls.children) || [];
    if (!kids.length) {
      var p = el('p', 'profile-meta', 'No children in this class yet. ');
      var a = el('a', null, 'Add children');
      a.href = 'classes.html';
      p.appendChild(a);
      host.appendChild(p);
      return;
    }
    kids.forEach(function (k) {
      var chip = el('div', 'profile-chip selected');
      chip.setAttribute('role', 'button');
      chip.setAttribute('tabindex', '0');
      chip.setAttribute('aria-pressed', 'true');
      var body = el('div', null);
      body.style.flex = '1';
      body.appendChild(el('span', 'profile-name', k.name));
      var tags = (k.profile_tags || []).join(' · ');
      body.appendChild(el('div', 'planner-child-tags', tags || 'No profile tags'));
      chip.appendChild(body);
      var badge = el('span', 'count', 'In');
      chip.appendChild(badge);
      function toggle() {
        var out = !excluded[k.id];
        excluded[k.id] = out;
        chip.classList.toggle('selected', !out);
        chip.classList.toggle('excluded', out);
        chip.setAttribute('aria-pressed', out ? 'false' : 'true');
        badge.textContent = out ? 'Out' : 'In';
        badge.classList.toggle('out', out);
      }
      chip.addEventListener('click', toggle);
      chip.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
      host.appendChild(chip);
    });
  }

  function selectedFrameworks() {
    var out = [];
    var boxes = $('plannerFrameworks').querySelectorAll('input[type=checkbox]');
    Array.prototype.forEach.call(boxes, function (b) { if (b.checked) out.push(b.value); });
    return out;
  }

  function includedChildren() {
    var cls = currentClass();
    return ((cls && cls.children) || [])
      .filter(function (k) { return !excluded[k.id]; })
      .map(function (k) { return { name: k.name, profile_tags: k.profile_tags || [] }; });
  }

  /* ── Plan rendering ──────────────────────────────────── */
  function renderHeadTags(frameworks) {
    var host = $('plannerHeadTags');
    host.innerHTML = '';
    (frameworks || []).forEach(function (f) {
      host.appendChild(el('span', 'tag tag-framework', f));
    });
  }

  function renderPlan(plan, opts) {
    opts = opts || {};
    currentPlan = plan;
    var out = $('plannerOutput');
    out.innerHTML = '';

    var badge = el('div', null);
    badge.appendChild(el('span', 'pf-ai-badge', '✦ AI-generated · editable'));
    badge.style.marginBottom = '12px';
    out.appendChild(badge);

    var block = el('div', 'activity-block');
    block.appendChild(el('h3', 'activity-title', plan.title || currentTheme || 'Lesson plan'));
    if (plan.intro) {
      var intro = el('p', 'narrative-text', plan.intro);
      intro.style.lineHeight = '1.7';
      block.appendChild(intro);
    }
    out.appendChild(block);

    (plan.activities || []).forEach(function (act) {
      var card = el('div', 'scaffolding-item');
      card.style.display = 'block';
      card.appendChild(el('h4', null, act.name || 'Activity'));
      if (act.description) card.appendChild(el('p', null, act.description));
      var ftags = el('div', 'obs-tags');
      ftags.style.marginTop = '8px';
      (act.framework_tags || []).forEach(function (t) {
        ftags.appendChild(el('span', 'tag tag-framework', t));
      });
      if (ftags.children.length) card.appendChild(ftags);
      (act.differentiation || []).forEach(function (d) {
        var row = el('div', 'planner-diff-row');
        row.appendChild(el('strong', null, d.profile || ''));
        row.appendChild(el('span', null, d.strategy || ''));
        card.appendChild(row);
      });
      out.appendChild(card);
    });

    if (plan.materials && plan.materials.length) {
      out.appendChild(el('h4', 'scaffolding-heading', 'Materials'));
      var ul = el('ul', 'check-list');
      plan.materials.forEach(function (m) {
        var li = el('li', 'check-item');
        li.appendChild(el('span', 'check-mark', '✓'));
        li.appendChild(document.createTextNode(' ' + m));
        ul.appendChild(li);
      });
      out.appendChild(ul);
    }

    if (plan.rehearse_retrieve) {
      var box = el('div', 'callout callout-warning');
      box.appendChild(el('h4', null, 'Rehearse & Retrieve Prompt'));
      box.appendChild(el('p', null, plan.rehearse_retrieve));
      out.appendChild(box);
    }

    $('plannerSaveWrap').classList.toggle('hidden', !!opts.saved);
    out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ── Generate ────────────────────────────────────────── */
  function generate() {
    var cls = currentClass();
    if (!cls) { window.pfToast('Create a class first.'); return; }
    var theme = $('plannerTheme').value.trim();
    if (theme.length < 3) { window.pfToast('Type a theme for the lesson (e.g. "Community Helpers").'); return; }
    var kids = includedChildren();
    if (!kids.length) { window.pfToast('Include at least one child (or add children to the class).'); return; }
    var frameworks = selectedFrameworks();
    if (!frameworks.length) { window.pfToast('Pick at least one framework.'); return; }

    currentTheme = theme;
    currentFrameworks = frameworks;
    var btn = $('plannerGenerate');
    var done = window.pfApi.spinner(btn, 'Thinking…');
    window.pfApi.ai('lesson_plan', {
      theme: theme,
      age_group: cls.age_group,
      children: kids,
      frameworks: frameworks
    })
      .then(function (plan) {
        renderHeadTags(frameworks);
        renderPlan(plan, { saved: false });
      })
      .catch(function (e) { window.pfToast('AI failed: ' + e.message); })
      .then(done);
  }

  /* ── Save + lesson list ──────────────────────────────── */
  function saveLesson() {
    var cls = currentClass();
    if (!currentPlan || !cls) { window.pfToast('Generate a plan first.'); return; }
    var btn = $('plannerSave');
    var done = window.pfApi.spinner(btn, 'Saving…');
    window.pfDb.from('lessons').insert({
      owner: window.pfUser.id,
      class_id: cls.id,
      theme: currentTheme,
      frameworks: currentFrameworks,
      plan: currentPlan
    }).select().single()
      .then(function (r) {
        if (r.error) throw r.error;
        window.pfToast('Lesson saved.');
        $('plannerSaveWrap').classList.add('hidden');
        return loadLessons();
      })
      .catch(function (e) { window.pfToast('Save failed: ' + e.message); })
      .then(done);
  }

  function deleteLesson(id, row) {
    window.pfDb.from('lessons').delete().eq('id', id)
      .then(function (r) {
        if (r.error) throw r.error;
        row.remove();
        if (!$('plannerLessons').children.length) renderLessonEmpty();
        window.pfToast('Lesson deleted.');
      })
      .catch(function (e) { window.pfToast('Delete failed: ' + e.message); });
  }

  function renderLessonEmpty() {
    var host = $('plannerLessons');
    host.innerHTML = '';
    host.appendChild(el('p', 'profile-meta', 'No saved lessons yet — generate a plan above and save it to build your library.'));
  }

  function loadLessons() {
    return window.pfDb.from('lessons')
      .select('id,theme,frameworks,plan,created_at,classes(name)')
      .eq('owner', window.pfUser.id)
      .order('created_at', { ascending: false })
      .limit(25)
      .then(function (r) {
        if (r.error) throw r.error;
        var host = $('plannerLessons');
        host.innerHTML = '';
        var rows = r.data || [];
        if (!rows.length) { renderLessonEmpty(); return; }
        rows.forEach(function (l) {
          var row = el('div', 'planner-lesson-row');
          var info = el('div', 'lesson-info');
          info.appendChild(el('h5', null, l.theme || 'Untitled lesson'));
          var meta = (l.classes && l.classes.name ? l.classes.name + ' · ' : '') +
            ((l.frameworks || []).join(', ') || 'No frameworks') + ' · ' +
            window.pfApi.ago(l.created_at);
          info.appendChild(el('p', 'profile-meta', meta));
          info.setAttribute('role', 'button');
          info.setAttribute('tabindex', '0');
          function open() {
            currentTheme = l.theme || '';
            currentFrameworks = l.frameworks || [];
            renderHeadTags(currentFrameworks);
            renderPlan(l.plan || {}, { saved: true });
          }
          info.addEventListener('click', open);
          info.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); open(); }
          });
          row.appendChild(info);
          var del = el('button', 'btn btn-secondary btn-sm', 'Delete');
          del.type = 'button';
          del.addEventListener('click', function () { deleteLesson(l.id, row); });
          row.appendChild(del);
          host.appendChild(row);
        });
      })
      .catch(function (e) { window.pfToast('Could not load lessons: ' + e.message); });
  }

  /* ── Boot ────────────────────────────────────────────── */
  function init(ctx) {
    if (!ctx || !ctx.user) return;
    if (!$('plannerGenerate')) return;

    $('plannerGenerate').addEventListener('click', generate);
    $('plannerSave').addEventListener('click', saveLesson);
    $('plannerClass').addEventListener('change', renderChildren);

    window.pfApi.myClasses()
      .then(function (data) {
        classes = data || [];
        if (!classes.length) {
          $('plannerControls').classList.add('hidden');
          $('plannerNoClasses').classList.remove('hidden');
          $('plannerOutput').innerHTML = '';
          var p = el('p', 'profile-meta', 'Once your class and children are set up, the planner tailors every activity to their real profiles.');
          $('plannerOutput').appendChild(p);
          return;
        }
        renderClassSelect();
        renderChildren();
      })
      .catch(function (e) { window.pfToast('Could not load classes: ' + e.message); });

    loadLessons();
  }

  function boot() { if (window.pfAuthReady) window.pfAuthReady.then(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

/* PedaForge "Today" page - the teaching day as one thread.
   Everything rendered here comes from the database. */
(function () {
  'use strict';

  var FACE_COLORS = ['#e8063c', '#1c9c6b', '#0E8FA8', '#773E8B', '#FF9E18', '#2D2A5E'];

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function initials(name) {
    return name.split(/\s+/).map(function (w) { return w.charAt(0); }).slice(0, 2).join('').toUpperCase();
  }

  function greeting() {
    var h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  }

  function init(ctx) {
    if (!ctx.user) return;
    var db = ctx.db;
    var isDirector = ctx.profile && ctx.profile.role === 'director';
    var first = ((ctx.profile && ctx.profile.full_name) || ctx.user.email || '').split(' ')[0].split('@')[0];

    $('todayDate').textContent = new Date().toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long' });
    $('greet').textContent = greeting() + ', ' + first;
    if (isDirector) {
      $('greetSub').textContent = 'Your centre at a glance - educators, approvals, and the week\'s activity.';
      $('streamHint').textContent = 'live across your network';
    }

    var weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    /* ── Parallel loads ── */
    var qs = {
      classes: db.from('classes').select('id,name,age_group,children(id,name,profile_tags)').order('created_at'),
      lessons: db.from('lessons').select('id,theme,created_at,classes(name)').order('created_at', { ascending: false }).limit(5),
      layouts: db.from('layouts').select('id,name,status,score,updated_at').order('updated_at', { ascending: false }).limit(5),
      pobs: db.from('portfolio_observations').select('id,child_id,raw_note,created_at,children(name)').order('created_at', { ascending: false }).limit(6),
      reading: db.from('reading_sessions').select('id,wcpm,accuracy,created_at,children(name)').order('created_at', { ascending: false }).limit(5),
      coach: db.from('coach_sessions').select('id,mode,updated_at,messages').order('updated_at', { ascending: false }).limit(4),
      obs: db.from('observations').select('id,educator_name,created_at').order('created_at', { ascending: false }).limit(4),
      samples: db.from('work_samples').select('id,context,created_at,children(name)').order('created_at', { ascending: false }).limit(4),
      benchmarks: db.from('benchmarks').select('id,term,created_at,children(name)').order('created_at', { ascending: false }).limit(4)
    };
    if (!isDirector) {
      qs.lessons = qs.lessons.eq('owner', ctx.user.id);
      qs.layouts = qs.layouts.eq('owner', ctx.user.id);
      qs.pobs = qs.pobs.eq('owner', ctx.user.id);
      qs.reading = qs.reading.eq('user_id', ctx.user.id);
      qs.coach = qs.coach.eq('user_id', ctx.user.id);
      qs.obs = qs.obs.eq('observer', ctx.user.id);
      qs.samples = qs.samples.eq('owner', ctx.user.id);
      qs.benchmarks = qs.benchmarks.eq('owner', ctx.user.id);
      qs.classes = qs.classes.eq('owner', ctx.user.id);
    }

    var keys = Object.keys(qs);
    Promise.all(keys.map(function (k) { return qs[k]; })).then(function (results) {
      var d = {};
      keys.forEach(function (k, i) { d[k] = results[i].data || []; });
      renderClass(d);
      renderJourney(d);
      renderNext(d);
      renderStream(d);
      if (isDirector) renderNetwork(db);
    });

    /* ── My Class ── */
    function renderClass(d) {
      var strip = $('kidStrip');
      strip.innerHTML = '';
      var classes = d.classes;
      if (!classes.length) {
        strip.innerHTML = '<span class="t-empty">No class yet - <a href="classes.html">create your class</a> or re-run setup to paste your class list.</span>';
        $('classHint').textContent = '';
        return;
      }
      var cls = classes[0];
      $('classHint').textContent = cls.name + ' - ' + String(cls.age_group || '').toUpperCase() + (classes.length > 1 ? ' - +' + (classes.length - 1) + ' more' : '');
      var kids = (cls.children || []).slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
      if (!kids.length) {
        strip.innerHTML = '<span class="t-empty">No children in ' + cls.name + ' yet - <a href="classes.html">add your class list</a>.</span>';
        return;
      }
      kids.forEach(function (k, i) {
        var a = el('a', 'kid-chip');
        a.href = 'child.html?id=' + encodeURIComponent(k.id);
        var face = el('span', 'face', initials(k.name));
        face.style.background = FACE_COLORS[i % FACE_COLORS.length];
        a.appendChild(face);
        var label = el('span', null, k.name);
        a.appendChild(label);
        if (k.profile_tags && k.profile_tags.length) {
          var small = el('small', null, ' - ' + k.profile_tags[0]);
          a.appendChild(small);
        }
        strip.appendChild(a);
      });
      var manage = el('a', 'kid-chip');
      manage.href = 'classes.html';
      manage.innerHTML = '<span class="face" style="background:var(--border);color:var(--text-muted);">+</span><span style="color:var(--text-muted);">Manage</span>';
      strip.appendChild(manage);
    }

    /* ── Journey counters ── */
    function renderJourney(d) {
      $('cntPlan').textContent = d.lessons.length ? d.lessons.length + ' lesson' + (d.lessons.length > 1 ? 's' : '') : 'start here';
      $('cntRoom').textContent = d.layouts.length ? d.layouts.length + ' layout' + (d.layouts.length > 1 ? 's' : '') : 'design a room';
      var caps = d.pobs.length + d.samples.length;
      $('cntCapture').textContent = caps ? caps + ' captured' : 'observe a child';
      var grow = d.coach.length + d.obs.length;
      $('cntGrow').textContent = grow ? grow + ' session' + (grow > 1 ? 's' : '') : 'meet your coach';

      var pending = d.layouts.filter(function (l) { return l.status === 'submitted'; }).length;
      if (pending && isDirector) { $('bdgRoom').textContent = pending; $('bdgRoom').classList.add('on'); }
      var changes = d.layouts.filter(function (l) { return l.status === 'changes_requested'; }).length;
      if (changes && !isDirector) { $('bdgRoom').textContent = changes; $('bdgRoom').classList.add('on'); }
    }

    /* ── What\'s Next: rule-driven suggestions from real state ── */
    function renderNext(d) {
      var host = $('nextSteps');
      host.innerHTML = '';
      var steps = [];
      var kids = d.classes.length ? (d.classes[0].children || []) : [];

      if (!d.classes.length) {
        steps.push(['#e8063c', 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
          '<b>Set up your class.</b> Paste your class list once - every module builds on it.', 'classes.html']);
      } else if (!kids.length) {
        steps.push(['#e8063c', 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
          '<b>Add your children</b> to ' + window.pfApi.esc(d.classes[0].name) + ' so plans and portfolios attach to real profiles.', 'classes.html']);
      }
      if (d.classes.length && kids.length && !d.lessons.length) {
        steps.push(['#e8063c', 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z',
          '<b>Generate your first lesson plan.</b> The AI differentiates for each child\'s profile.', 'planner.html']);
      }
      if (kids.length && !d.pobs.length) {
        steps.push(['#FF9E18', 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
          '<b>Capture one observation</b> - the AI drafts a parent-ready learning story from your note.', 'portfolio.html']);
      }
      if (kids.length && !d.reading.length) {
        steps.push(['#0E8FA8', 'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z',
          '<b>Run a reading session.</b> Real speech recognition scores fluency word by word.', 'home-reading-coach.html']);
      }
      if (!d.layouts.length) {
        steps.push(['#1c9c6b', 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
          '<b>Design your room</b> with live ECDA/SCDF safety checks, then submit for approval.', 'sproutspace-layout.html']);
      }
      var changes = d.layouts.filter(function (l) { return l.status === 'changes_requested'; });
      if (changes.length) {
        steps.unshift(['#dc2626', 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
          '<b>A layout needs changes.</b> Your Director requested revisions on "' + window.pfApi.esc(changes[0].name.split(/ [-\u00b7] /)[0]) + '".', 'sproutspace-layout.html']);
      }
      if (isDirector) {
        var pending = d.layouts.filter(function (l) { return l.status === 'submitted'; });
        if (pending.length) {
          steps.unshift(['#1c9c6b', 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
            '<b>' + pending.length + ' layout' + (pending.length > 1 ? 's' : '') + ' awaiting approval.</b> Review and sign off.', 'sproutspace-control.html']);
        }
        steps.push(['#773E8B', 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z',
          '<b>Run a lesson observation</b> - notes are tagged to QTT indicators as you type.', 'observation.html']);
      }
      if (!steps.length) {
        steps.push(['#773E8B', 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z',
          '<b>You\'re all caught up.</b> Ask your AI coach to reflect on the week - it knows QTT inside out.', 'coach.html']);
      }

      steps.slice(0, 4).forEach(function (s) {
        var a = el('a', 'next-row');
        a.href = s[3];
        var ico = el('span', 'nx-ico');
        ico.style.background = s[0];
        ico.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + s[1] + '"/></svg>';
        var body = el('span', 'nx-body');
        body.innerHTML = s[2]; /* trusted template strings; names escaped above */
        a.appendChild(ico); a.appendChild(body); a.appendChild(el('span', 'nx-go', '→'));
        host.appendChild(a);
      });
    }

    /* ── Activity stream: merge everything, newest first ── */
    function renderStream(d) {
      var host = $('stream');
      host.innerHTML = '';
      var items = [];
      d.lessons.forEach(function (x) { items.push({ t: x.created_at, c: '#e8063c', href: 'planner.html', html: '<b>Lesson planned</b> - ' + window.pfApi.esc(x.theme) + (x.classes ? ' for ' + window.pfApi.esc(x.classes.name) : '') }); });
      d.pobs.forEach(function (x) { items.push({ t: x.created_at, c: '#FF9E18', href: x.child_id ? 'child.html?id=' + x.child_id : 'portfolio.html', html: '<b>Observation</b> - ' + window.pfApi.esc(x.children ? x.children.name : 'a child') + ': "' + window.pfApi.esc(String(x.raw_note || '').slice(0, 60)) + '..."' }); });
      d.reading.forEach(function (x) { items.push({ t: x.created_at, c: '#0E8FA8', href: 'home-reading-coach.html', html: '<b>Reading session</b>' + (x.children ? ' - ' + window.pfApi.esc(x.children.name) : '') + ' - ' + (x.wcpm != null ? x.wcpm + ' WCPM' : 'completed') }); });
      d.coach.forEach(function (x) { items.push({ t: x.updated_at, c: '#773E8B', href: 'coach.html', html: '<b>Coaching chat</b> - ' + window.pfApi.esc(x.mode) + ' mode - ' + ((x.messages || []).length) + ' messages' }); });
      d.obs.forEach(function (x) { items.push({ t: x.created_at, c: '#773E8B', href: 'observation.html', html: '<b>Lesson observation</b> - ' + window.pfApi.esc(x.educator_name) }); });
      d.samples.forEach(function (x) { items.push({ t: x.created_at, c: '#FF9E18', href: 'work-sample.html', html: '<b>Work sample analysed</b>' + (x.children ? ' - ' + window.pfApi.esc(x.children.name) : '') }); });
      d.benchmarks.forEach(function (x) { items.push({ t: x.created_at, c: '#0E8FA8', href: 'home-benchmark.html', html: '<b>Benchmark saved</b>' + (x.children ? ' - ' + window.pfApi.esc(x.children.name) : '') + ' - ' + window.pfApi.esc(x.term || '') }); });
      d.layouts.forEach(function (x) { items.push({ t: x.updated_at, c: '#1c9c6b', href: 'sproutspace-layout.html', html: '<b>Layout ' + window.pfApi.esc((x.status || 'saved').replace('_', ' ')) + '</b> - ' + window.pfApi.esc(x.name.split(/ [-\u00b7] /)[0]) + ' - ' + x.score + '%' }); });

      items.sort(function (a, b) { return new Date(b.t) - new Date(a.t); });
      if (!items.length) {
        host.innerHTML = '<span class="t-empty">Nothing yet - your week fills in here as you plan, capture, and coach.</span>';
        return;
      }
      items.slice(0, 12).forEach(function (it) {
        var s = el('div', 's-item');
        s.style.setProperty('--s', it.c);
        var a = el('a');
        a.href = it.href;
        a.innerHTML = it.html;
        s.appendChild(a);
        s.appendChild(el('span', 'when', window.pfApi.ago(it.t)));
        host.appendChild(s);
      });
    }

    /* ── Director network band ── */
    function renderNetwork(db) {
      Promise.all([
        db.from('profiles').select('id', { count: 'exact', head: true }),
        db.from('classes').select('id', { count: 'exact', head: true }),
        db.from('children').select('id', { count: 'exact', head: true }),
        db.from('layouts').select('id', { count: 'exact', head: true }).eq('status', 'submitted'),
        db.from('observations').select('id', { count: 'exact', head: true })
      ]).then(function (rs) {
        var cells = [
          [rs[0].count || 0, 'Educators'],
          [rs[1].count || 0, 'Classes'],
          [rs[2].count || 0, 'Children'],
          [rs[3].count || 0, 'Pending approvals'],
          [rs[4].count || 0, 'Observations']
        ];
        var band = $('netBand');
        band.innerHTML = '';
        cells.forEach(function (c) {
          var cell = el('div', 'net-cell');
          cell.appendChild(el('div', 'v', String(c[0])));
          cell.appendChild(el('div', 'l', c[1]));
          band.appendChild(cell);
        });
        $('netCard').style.display = '';
      });
    }
  }

  function boot() {
    if (window.pfAuthReady) window.pfAuthReady.then(init);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

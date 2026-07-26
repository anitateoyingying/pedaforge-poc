/* PedaForge PD Dashboard - real aggregates from Supabase.
   Educators see their own activity; directors see the whole centre (RLS). */
(function () {
  'use strict';

  var MODE_NAMES = {
    reflective: 'Reflective Practice',
    qtt: 'QTT Deep Dive',
    socratic: 'Socratic Inquiry',
    scenario: 'Scenario Analysis'
  };
  var MODE_COLORS = {
    reflective: 'linear-gradient(90deg, var(--accent-proposal), #9b6fb0)',
    qtt: 'linear-gradient(90deg, var(--info), #60a5fa)',
    socratic: 'linear-gradient(90deg, var(--success), #34d399)',
    scenario: 'linear-gradient(90deg, var(--warning), #ffc266)'
  };

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function setStat(id, value) {
    var node = $(id);
    if (!node) return;
    node.textContent = String(value);
    if (typeof window.animateCounter === 'function') window.animateCounter(node);
  }
  function whoName(p) { return p && p.full_name ? p.full_name : null; }
  function emptyWithLink(before, href, linkText, after) {
    // Friendly zero state that links to the creation flow (XSS-safe: all textContent).
    var wrap = el('span', null, before + ' ');
    var a = el('a', null, linkText);
    a.href = href;
    wrap.appendChild(a);
    wrap.appendChild(document.createTextNode(after || '.'));
    return wrap;
  }

  /* ── Stat tiles + mode bars ──────────────────────────── */
  function renderModeBars(sessions) {
    var host = $('dashModeBars');
    host.innerHTML = '';
    var counts = {};
    sessions.forEach(function (s) {
      var m = MODE_NAMES[s.mode] ? s.mode : 'reflective';
      counts[m] = (counts[m] || 0) + 1;
    });
    var total = sessions.length;
    if (!total) {
      var p = el('p', 'dash-empty');
      p.appendChild(emptyWithLink('No coaching sessions yet - start one in the', 'coach.html', 'AI Coach', ' and it will appear here.'));
      host.appendChild(p);
      return;
    }
    Object.keys(MODE_NAMES).forEach(function (mode) {
      var c = counts[mode] || 0;
      var pct = Math.round((c / total) * 100);
      var row = el('div', 'bar-row');
      var label = el('div', 'bar-label');
      label.appendChild(el('span', 'bar-name', MODE_NAMES[mode]));
      label.appendChild(el('span', 'bar-pct', c + ' - ' + pct + '%'));
      row.appendChild(label);
      var track = el('div', 'bar-track');
      var fill = el('div', 'bar-fill');
      fill.style.width = pct + '%';
      fill.style.background = MODE_COLORS[mode];
      track.appendChild(fill);
      row.appendChild(track);
      host.appendChild(row);
    });
  }

  /* ── Educator observation table ──────────────────────── */
  function renderEducatorTable(observations) {
    var tbody = $('dashEducatorRows');
    tbody.innerHTML = '';
    if (!observations.length) {
      var tr = el('tr');
      var td = el('td', 'dash-empty');
      td.colSpan = 4;
      td.appendChild(emptyWithLink('No observations recorded yet - capture your first in', 'observation.html', 'Lesson Observation'));
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }
    var byEducator = {};
    observations.forEach(function (o) {
      var key = o.educator_name || 'Unknown';
      var cur = byEducator[key];
      if (!cur) {
        byEducator[key] = { name: key, count: 1, latest: o };
      } else {
        cur.count += 1;
        if (new Date(o.created_at) > new Date(cur.latest.created_at)) cur.latest = o;
      }
    });
    Object.keys(byEducator)
      .map(function (k) { return byEducator[k]; })
      .sort(function (a, b) { return new Date(b.latest.created_at) - new Date(a.latest.created_at); })
      .forEach(function (row) {
        var tr = el('tr');
        var name = el('td');
        name.appendChild(el('strong', null, row.name));
        tr.appendChild(name);
        tr.appendChild(el('td', null, row.latest.class_name || '-'));
        tr.appendChild(el('td', null, String(row.count)));
        var last = el('td');
        var badge = el('span', 'status-badge on-track', window.pfApi.ago(row.latest.created_at));
        last.appendChild(badge);
        tr.appendChild(last);
        tbody.appendChild(tr);
      });
  }

  /* ── Recent activity table ───────────────────────────── */
  function renderActivity(items) {
    var tbody = $('dashActivityRows');
    tbody.innerHTML = '';
    if (!items.length) {
      var tr = el('tr');
      var td = el('td', 'dash-empty');
      td.colSpan = 4;
      td.appendChild(emptyWithLink('Nothing here yet. Record an', 'observation.html', 'observation', ' - it will show up alongside coaching sessions and layout submissions.'));
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }
    items.forEach(function (it) {
      var tr = el('tr');
      var typeTd = el('td');
      typeTd.appendChild(el('span', 'status-badge ' + it.badgeCls, it.type));
      tr.appendChild(typeTd);
      var what = el('td');
      what.appendChild(el('strong', null, it.label));
      tr.appendChild(what);
      tr.appendChild(el('td', null, it.who || '-'));
      tr.appendChild(el('td', null, window.pfApi.ago(it.at)));
      tbody.appendChild(tr);
    });
  }

  /* ── Boot ────────────────────────────────────────────── */
  function init(ctx) {
    if (!ctx || !ctx.user) return;
    var db = ctx.db;
    var isDirector = ctx.profile && ctx.profile.role === 'director';
    var scopeNote = $('dashScopeNote');
    if (scopeNote) {
      scopeNote.textContent = isDirector
        ? 'Director view - data across every educator in your centre.'
        : 'Personal view - your own observations, coaching and activity.';
    }

    var obsQ = db.from('observations')
      .select('educator_name,class_name,created_at,profiles:observer(full_name)')
      .order('created_at', { ascending: false })
      .limit(200);
    var coachQ = db.from('coach_sessions')
      .select('mode,created_at,profiles:user_id(full_name)')
      .order('created_at', { ascending: false })
      .limit(200);
    var readQ = db.from('reading_sessions')
      .select('id', { count: 'exact', head: true });
    var layoutQ = db.from('layouts')
      .select('name,status,updated_at,profiles:owner(full_name)')
      .order('updated_at', { ascending: false })
      .limit(50);

    Promise.all([obsQ, coachQ, readQ, layoutQ]).then(function (rs) {
      var err = rs.filter(function (r) { return r.error; })[0];
      if (err) {
        window.pfToast('Could not load dashboard data: ' + err.error.message);
      }
      var obs = rs[0].data || [];
      var coach = rs[1].data || [];
      var readingCount = rs[2].count || 0;
      var layouts = rs[3].data || [];

      /* Stat tiles */
      setStat('statObs', obs.length);
      setStat('statCoach', coach.length);
      setStat('statReading', readingCount);
      setStat('statLayouts', layouts.length);

      var approved = layouts.filter(function (l) { return l.status === 'approved'; }).length;
      var subEl = $('statLayoutsSub');
      if (subEl) subEl.textContent = layouts.length ? approved + ' approved' : 'None yet';
      var obsSub = $('statObsSub');
      if (obsSub) {
        var educators = {};
        obs.forEach(function (o) { educators[o.educator_name || '?'] = true; });
        obsSub.textContent = obs.length ? Object.keys(educators).length + ' educators covered' : 'None yet';
      }
      var coachSub = $('statCoachSub');
      if (coachSub) coachSub.textContent = coach.length ? window.pfApi.ago(coach[0].created_at) + ' last session' : 'None yet';
      var readSub = $('statReadingSub');
      if (readSub) readSub.textContent = readingCount ? 'read-aloud sessions logged' : 'None yet';

      renderModeBars(coach);
      renderEducatorTable(obs);

      /* Recent activity - merge 3 sources, newest 10 */
      var items = [];
      obs.slice(0, 10).forEach(function (o) {
        items.push({
          type: 'Observation', badgeCls: 'on-track',
          label: (o.educator_name || 'Educator') + (o.class_name ? ' - ' + o.class_name : ''),
          who: whoName(o.profiles), at: o.created_at
        });
      });
      coach.slice(0, 10).forEach(function (c) {
        items.push({
          type: 'Coaching', badgeCls: 'exceeding',
          label: MODE_NAMES[c.mode] || c.mode || 'Session',
          who: whoName(c.profiles), at: c.created_at
        });
      });
      layouts.slice(0, 10).forEach(function (l) {
        items.push({
          type: 'Layout', badgeCls: 'needs-support',
          label: (l.name ? l.name.split(/ [-\u00b7] /)[0] : 'Layout') + ' - ' + (l.status || 'draft').replace(/_/g, ' '),
          who: whoName(l.profiles), at: l.updated_at
        });
      });
      items.sort(function (a, b) { return new Date(b.at) - new Date(a.at); });
      renderActivity(items.slice(0, 10));
    }).catch(function (e) {
      window.pfToast('Dashboard failed to load: ' + e.message);
    });
  }

  function boot() { if (window.pfAuthReady) window.pfAuthReady.then(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

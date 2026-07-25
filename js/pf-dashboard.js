/* PedaForge dashboard — live data from Supabase, role-aware. */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function row(main, sub, pillText, pillCls) {
    var r = el('div', 'app-row');
    var left = el('span');
    left.appendChild(el('strong', null, main));
    if (sub) { left.appendChild(document.createElement('br')); left.appendChild(el('span', 'muted', sub)); }
    r.appendChild(left);
    if (pillText) r.appendChild(el('span', 'pill ' + (pillCls || ''), pillText.replace(/_/g, ' ')));
    return r;
  }
  function fill(host, rows, emptyMsg) {
    host.innerHTML = '';
    if (!rows.length) { host.appendChild(el('span', 'app-empty', emptyMsg)); return; }
    rows.forEach(function (r) { host.appendChild(r); });
  }
  function ago(iso) {
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 3600) return Math.max(1, Math.round(s / 60)) + ' min ago';
    if (s < 86400) return Math.round(s / 3600) + ' h ago';
    return Math.round(s / 86400) + ' d ago';
  }

  function init(ctx) {
    if (!ctx.user) return;
    var db = ctx.db;
    var profile = ctx.profile || {};
    var isDirector = profile.role === 'director';
    var first = (profile.full_name || ctx.user.email || '').split(' ')[0].split('@')[0];

    $('greet').textContent = 'Welcome back, ' + first;
    if (isDirector) {
      $('roleBanner').style.display = 'flex';
      $('greetSub').textContent = "Network view — your educators' activity and pending approvals.";
    }

    /* Layouts card */
    var layoutQ = isDirector
      ? db.from('layouts').select('name,status,score,updated_at,profiles:owner(full_name)').neq('status', 'draft')
      : db.from('layouts').select('name,status,score,updated_at').eq('owner', ctx.user.id);
    layoutQ.order('updated_at', { ascending: false }).limit(4).then(function (r) {
      var rows = (r.data || []).map(function (l) {
        var sub = (l.profiles && l.profiles.full_name ? l.profiles.full_name + ' · ' : '') + l.score + '% · ' + ago(l.updated_at);
        return row(l.name.split(' · ')[0], sub, l.status, l.status);
      });
      fill($('cardLayouts'), rows, isDirector ? 'No layouts submitted yet.' : 'No saved layouts yet — design your first room.');
    });

    /* Reading card */
    var readQ = isDirector
      ? db.from('reading_sessions').select('wcpm,accuracy,mode,created_at,profiles:user_id(full_name)')
      : db.from('reading_sessions').select('wcpm,accuracy,mode,created_at').eq('user_id', ctx.user.id);
    readQ.order('created_at', { ascending: false }).limit(3).then(function (r) {
      var data = r.data || [];
      if (data.length) {
        $('statWcpm').textContent = data[0].wcpm != null ? data[0].wcpm : '–';
        $('statWcpmSub').textContent = 'latest WCPM · ' + (data[0].accuracy != null ? data[0].accuracy + '% accuracy' : '');
      }
      var rows = data.map(function (s) {
        var who = s.profiles && s.profiles.full_name ? s.profiles.full_name + ' · ' : '';
        return row((s.wcpm != null ? s.wcpm + ' WCPM' : 'Session'), who + ago(s.created_at),
          s.mode === 'simulated' ? 'simulated' : 'live', s.mode === 'simulated' ? 'draft' : 'approved');
      });
      fill($('cardReading'), rows, 'No sessions yet — run your first read-aloud.');
    });

    /* Word jar card */
    var dictQ = isDirector
      ? db.from('dictionary_progress').select('word,status,updated_at,profiles:user_id(full_name)')
      : db.from('dictionary_progress').select('word,status,updated_at').eq('user_id', ctx.user.id);
    dictQ.order('updated_at', { ascending: false }).limit(20).then(function (r) {
      var data = r.data || [];
      var active = data.filter(function (w) { return w.status !== 'new'; });
      $('statWords').textContent = active.length;
      var rows = active.slice(0, 3).map(function (w) {
        var who = w.profiles && w.profiles.full_name ? w.profiles.full_name + ' · ' : '';
        return row(w.word, who + ago(w.updated_at), w.status, w.status === 'known' ? 'approved' : 'submitted');
      });
      fill($('cardWords'), rows, 'No words practised yet.');
    });

    /* Observations card (directors see everyone's) */
    if (isDirector) {
      $('obsCardTitle').textContent = 'Recent Observations';
      $('obsCardBtn').textContent = 'Review Observations';
    }
    var obsQ = isDirector
      ? db.from('observations').select('educator_name,class_name,created_at,profiles:observer(full_name)')
      : db.from('observations').select('educator_name,class_name,created_at').eq('observer', ctx.user.id);
    obsQ.order('created_at', { ascending: false }).limit(3).then(function (r) {
      var rows = (r.data || []).map(function (o) {
        var who = o.profiles && o.profiles.full_name ? 'by ' + o.profiles.full_name + ' · ' : '';
        return row(o.educator_name + (o.class_name ? ' · ' + o.class_name : ''), who + ago(o.created_at), 'recorded', 'approved');
      });
      fill($('cardObs'), rows, 'No observations recorded yet.');
    });
  }

  if (window.pfAuthReady) window.pfAuthReady.then(init);
})();

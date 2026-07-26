/* Kids hub: greeting, door badges, progress garden, day streak.
   All data from DB for the active child (pf-kid-change event). */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* A plant SVG whose growth stage (0-3) reflects an activity count. */
  function plant(color, stage, label, subtitle) {
    var wrap = el('div', 'k-plant');
    var stem = stage >= 1 ? '<path class="stage" d="M29 68 V44" stroke="#5fae62" stroke-width="4" stroke-linecap="round"/>' : '';
    var leaves = stage >= 2
      ? '<g class="stage" style="animation-delay:0.15s;"><path d="M29 56 Q18 52 16 42 Q28 44 29 54z" fill="#8ecb7a"/><path d="M29 50 Q40 46 42 36 Q30 38 29 48z" fill="#8ecb7a"/></g>' : '';
    var bloom = stage >= 3
      ? '<g class="stage" style="animation-delay:0.3s;"><circle cx="29" cy="36" r="9" fill="' + color + '"/><circle cx="29" cy="36" r="4" fill="#fff8e1"/></g>'
      : (stage >= 1 ? '<circle class="stage" cx="29" cy="42" r="4" fill="' + color + '" style="animation-delay:0.2s;"/>' : '');
    var seed = stage === 0 ? '<ellipse cx="29" cy="64" rx="6" ry="4" fill="#b98a5a"/>' : '';
    wrap.innerHTML =
      '<svg viewBox="0 0 58 72" aria-hidden="true">' +
      '<ellipse cx="29" cy="68" rx="20" ry="5" fill="#7a5b3a" opacity="0.35"/>' +
      seed + stem + leaves + bloom + '</svg>';
    wrap.appendChild(el('b', null, label));
    wrap.appendChild(el('span', null, subtitle));
    return wrap;
  }

  function stageFor(count) {
    if (count >= 6) return 3;
    if (count >= 3) return 2;
    if (count >= 1) return 1;
    return 0;
  }

  function dayStreak(dates) {
    var days = {};
    dates.forEach(function (d) { days[new Date(d).toDateString()] = true; });
    var streak = 0;
    for (var i = 0; i < 30; i++) {
      var day = new Date(Date.now() - i * 86400000).toDateString();
      if (days[day]) streak++;
      else if (i > 0) break; // today may not have activity yet; allow gap only at i=0
    }
    return streak;
  }

  var MODULE_DOORS = {
    reading: 'home-reading-coach.html',
    phonics: 'home-phonics-studio.html',
    dictionary: 'home-dictionary.html',
    draw: 'home-draw-reflect.html',
    benchmark: 'home-benchmark.html'
  };

  function applyCurriculum() {
    var cur = window.pfKids && window.pfKids.curriculum ? window.pfKids.curriculum() : null;
    var mods = (cur && cur.modules) || null;
    document.querySelectorAll('.k-door').forEach(function (door) {
      var href = door.getAttribute('href');
      var key = Object.keys(MODULE_DOORS).filter(function (k) { return MODULE_DOORS[k] === href; })[0];
      if (!key) return;
      var open = !mods || mods[key] !== false;
      door.style.opacity = open ? '' : '0.45';
      door.style.pointerEvents = open ? '' : 'none';
      door.setAttribute('aria-disabled', String(!open));
      var lock = door.querySelector('.k-door-lock');
      if (!open && !lock) {
        lock = el('span', 'k-door-badge k-door-lock', 'Locked');
        lock.style.background = 'rgba(63,74,61,0.12)';
        lock.style.color = '#6b7a68';
        door.appendChild(lock);
      } else if (open && lock) {
        lock.remove();
      }
    });
    var sub = $('kHiSub');
    if (cur && cur.theme) sub.textContent = cur.theme;
    else sub.textContent = 'What shall we play today?';
  }

  function load(kid) {
    var db = window.pfDb;
    if (!db || !window.pfUser) return;
    var greetName = kid ? kid.name.split(' ')[0] : 'friend';
    $('kHi').textContent = 'Hello, ' + greetName + '!';
    applyCurriculum();

    var qs = {
      reading: db.from('reading_sessions').select('created_at,wcpm'),
      words: db.from('dictionary_progress').select('updated_at,status').neq('status', 'new'),
      art: db.from('artworks').select('created_at'),
      bench: db.from('benchmarks').select('created_at')
    };
    if (kid) {
      qs.reading = qs.reading.eq('child_id', kid.id);
      qs.words = qs.words.eq('child_id', kid.id);
      qs.art = qs.art.eq('child_id', kid.id);
      qs.bench = qs.bench.eq('child_id', kid.id);
    } else {
      qs.reading = qs.reading.eq('user_id', window.pfUser.id);
      qs.words = qs.words.eq('user_id', window.pfUser.id);
      qs.art = qs.art.eq('owner', window.pfUser.id);
      qs.bench = qs.bench.eq('owner', window.pfUser.id);
    }
    var keys = Object.keys(qs);
    Promise.all(keys.map(function (k) { return qs[k]; })).then(function (rs) {
      var d = {};
      keys.forEach(function (k, i) { d[k] = rs[i].data || []; });

      /* Door badges */
      var lastRead = d.reading[d.reading.length - 1];
      if (d.reading.length) { $('bdgReading').textContent = d.reading.length + (d.reading.length === 1 ? ' read' : ' reads'); $('bdgReading').hidden = false; }
      if (d.words.length) { $('bdgWords').textContent = d.words.length + (d.words.length === 1 ? ' word' : ' words'); $('bdgWords').hidden = false; }
      if (d.art.length) { $('bdgArt').textContent = d.art.length + (d.art.length === 1 ? ' picture' : ' pictures'); $('bdgArt').hidden = false; }

      /* Garden */
      var garden = $('kGarden');
      garden.innerHTML = '';
      var plants = [
        ['#4fb8c9', d.reading.length, 'Reading', d.reading.length + (d.reading.length === 1 ? ' story' : ' stories')],
        ['#ffcf5c', d.words.length, 'Words', d.words.length + ' in the jar'],
        ['#ff7d6b', d.art.length, 'Painting', d.art.length + (d.art.length === 1 ? ' picture' : ' pictures')],
        ['#5fae62', d.bench.length, 'Stars', d.bench.length + (d.bench.length === 1 ? ' check' : ' checks')]
      ];
      var anything = plants.some(function (p) { return p[1] > 0; });
      if (!anything) {
        garden.innerHTML = '<span class="k-empty-garden">' +
          (kid ? 'Your garden is waiting, ' + greetName + '. Open a door above and play. Every try plants a seed.'
               : 'Pick a child up top, then play something. Your garden starts growing with your very first try.') +
          '</span>';
      } else {
        plants.forEach(function (p) {
          garden.appendChild(plant(p[0], stageFor(p[1]), p[2], p[3]));
        });
      }

      /* Streak from all activity dates */
      var dates = [];
      d.reading.forEach(function (x) { dates.push(x.created_at); });
      d.words.forEach(function (x) { dates.push(x.updated_at); });
      d.art.forEach(function (x) { dates.push(x.created_at); });
      d.bench.forEach(function (x) { dates.push(x.created_at); });
      var streak = dayStreak(dates);
      if (streak > 0) {
        $('kStreakDays').textContent = streak;
        $('kStreak').hidden = false;
      } else {
        $('kStreak').hidden = true;
      }
    });
  }

  function boot() {
    if (!window.pfAuthReady) return;
    window.pfAuthReady.then(function (ctx) {
      if (!ctx.user) return;
      document.addEventListener('pf-kid-change', function (e) { load(e.detail); });
      /* pf-kids.js fires pf-kid-change after loading classes; nothing else needed */
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

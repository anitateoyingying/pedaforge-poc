/* PedaForge app shell - transforms every page into the sidebar layout.
   Load AFTER pf-auth.js. Builds sidebar + topbar, wraps existing page
   content into .pf-main-wrap, wires mobile drawer + sign-out. */
(function () {
  'use strict';

  var NAV = [
    { label: 'Today', items: [
      { href: 'index.html', name: 'Home', ico: 'M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5' },
      { href: 'classes.html', name: 'My Classes', ico: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
    ]},
    { label: 'Teach', items: [
      { href: 'planner.html', name: 'Lesson Planner', ico: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z' },
      { href: 'portfolio.html', name: 'Portfolios', ico: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' },
      { href: 'work-sample.html', name: 'Work Samples', ico: 'M4 4h16v16H4zM4 15l4-4 4 4 4-5 4 5' },
    ]},
    { label: 'Grow', items: [
      { href: 'coach.html', name: 'AI Coach', ico: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z' },
      { href: 'observation.html', name: 'Observation', ico: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z' },
      { href: 'lna.html', name: 'Learning Needs', ico: 'M22 12h-4l-3 9L9 3l-3 9H2' },
      { href: 'dashboard.html', name: 'PD Dashboard', ico: 'M3 3v18h18M18.7 8l-5.1 5.2-2.8-2.7L7 14' },
    ]},
    { label: 'Spaces', items: [
      { href: 'sproutspace-layout.html', name: 'Layout Planner', ico: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z' },
      { href: 'sproutspace-inventory.html', name: 'Inventory', ico: 'M21 8V21H3V8M1 3h22v5H1zM10 12h4' },
      { href: 'sproutspace-control.html', name: 'HQ Control', ico: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
    ]},
    { label: 'Literacy', items: [
      { href: 'home-reading-coach.html', name: 'Reading Coach', ico: 'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4' },
      { href: 'home-phonics-studio.html', name: 'Phonics Studio', ico: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z' },
      { href: 'home-dictionary.html', name: 'Dictionary', ico: 'M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14' },
      { href: 'home-benchmark.html', name: 'Benchmark', ico: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' },
      { href: 'home-draw-reflect.html', name: 'Draw & Reflect', ico: 'M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5zM2 2l7.586 7.586M11 11a2 2 0 1 0 4 0 2 2 0 0 0-4 0z' },
    ]},
  ];

  function svg(d) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>';
  }

  function currentPage() {
    return (window.location.pathname.split('/').pop() || 'index.html');
  }

  function buildSide() {
    var side = document.createElement('aside');
    side.className = 'pf-side';
    var here = currentPage();
    var html = '<a class="pf-brand" href="index.html"><span class="logo">PF</span><span><b>PedaForge</b><small>Teaching Studio</small></span></a><nav class="pf-nav">';
    NAV.forEach(function (group) {
      html += '<span class="pf-nav-label">' + group.label + '</span>';
      group.items.forEach(function (it) {
        html += '<a href="' + it.href + '"' + (it.href === here ? ' class="active"' : '') + '><span class="pf-ico">' + svg(it.ico) + '</span>' + it.name + '</a>';
      });
    });
    html += '</nav>';
    side.innerHTML = html;

    var foot = document.createElement('div');
    foot.className = 'pf-side-foot';
    var p = window.pfProfile || {};
    var name = p.full_name || (window.pfUser && window.pfUser.email) || '';
    var av = document.createElement(p.avatar_url ? 'img' : 'span');
    av.className = 'pf-avatar';
    if (p.avatar_url) { av.src = p.avatar_url; av.alt = ''; av.referrerPolicy = 'no-referrer'; }
    else av.textContent = (name.charAt(0) || '?').toUpperCase();
    var who = document.createElement('span');
    who.className = 'who';
    var b = document.createElement('b'); b.textContent = name;
    var role = document.createElement('span'); role.textContent = p.role || 'educator';
    who.appendChild(b); who.appendChild(role);
    var out = document.createElement('button');
    out.title = 'Sign out'; out.setAttribute('aria-label', 'Sign out');
    out.innerHTML = svg('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9');
    out.querySelector('svg').style.cssText = 'width:16px;height:16px;';
    out.addEventListener('click', function () {
      window.pfDb.auth.signOut().then(function () { window.location.href = 'login.html'; });
    });
    foot.appendChild(av); foot.appendChild(who); foot.appendChild(out);
    side.appendChild(foot);
    return side;
  }

  function buildTop() {
    var top = document.createElement('div');
    top.className = 'pf-top';
    var here = currentPage();
    var section = 'PedaForge', pageName = '';
    NAV.forEach(function (g) {
      g.items.forEach(function (it) { if (it.href === here) { section = g.label; pageName = it.name; } });
    });
    if (here === 'child.html') { section = 'Today'; pageName = 'Child Profile'; }
    var crumb = document.createElement('span');
    crumb.className = 'pf-crumb';
    crumb.innerHTML = section + ' / <b></b>';
    crumb.querySelector('b').textContent = pageName || document.title.split(' - ')[0];
    var spacer = document.createElement('span');
    spacer.className = 'pf-top-spacer';
    top.appendChild(crumb); top.appendChild(spacer);
    var isDirector = window.pfProfile && window.pfProfile.role === 'director';
    if (isDirector && here !== 'sproutspace-control.html') {
      var q = document.createElement('a');
      q.className = 'pf-quick'; q.href = 'sproutspace-control.html';
      q.innerHTML = '<span class="dot"></span>Approvals';
      top.appendChild(q);
    }
    if (!isDirector && here !== 'coach.html') {
      var c = document.createElement('a');
      c.className = 'pf-quick'; c.href = 'coach.html';
      c.innerHTML = '<span class="dot"></span>Ask your coach';
      top.appendChild(c);
    }
    return top;
  }

  function mount() {
    if (document.body.classList.contains('pf-shell')) return;

    /* Wrap all existing top-level content (except our chrome + scripts) */
    var wrap = document.createElement('div');
    wrap.className = 'pf-main-wrap';
    var keep = [];
    Array.prototype.slice.call(document.body.children).forEach(function (node) {
      if (/^(SCRIPT|LINK|STYLE)$/i.test(node.tagName)) return;
      if (node.classList && (node.classList.contains('bg-blobs'))) return;
      if (node.tagName === 'NAV' && node.classList.contains('navbar')) { node.remove(); return; }
      if (node.id === 'pfToast') return;
      keep.push(node);
    });
    keep.forEach(function (n) { wrap.appendChild(n); });

    var side = buildSide();
    var top = buildTop();
    document.body.insertBefore(side, document.body.firstChild);
    document.body.insertBefore(top, side.nextSibling);
    document.body.insertBefore(wrap, top.nextSibling);

    /* Mobile drawer */
    var burger = document.createElement('button');
    burger.className = 'pf-burger';
    burger.setAttribute('aria-label', 'Open navigation');
    burger.innerHTML = '&#9776;';
    var scrim = document.createElement('div');
    scrim.className = 'pf-scrim';
    burger.addEventListener('click', function () { document.body.classList.toggle('pf-side-open'); });
    scrim.addEventListener('click', function () { document.body.classList.remove('pf-side-open'); });
    document.body.appendChild(burger);
    document.body.appendChild(scrim);

    document.body.classList.add('pf-shell');
  }

  function boot() {
    if (!window.pfAuthReady) return;
    window.pfAuthReady.then(function (ctx) {
      if (!ctx.user) return; // login page or signed out
      mount();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

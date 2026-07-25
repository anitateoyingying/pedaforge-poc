/* PedaForge auth + data layer (Supabase, ap-southeast-1).
   Every page loads this after the supabase-js CDN script.
   Security model: page markup is public; all DATA is protected
   server-side by Postgres RLS — the anon key can only do what
   policies allow for the signed-in user. */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://fydgfsdysttirtfcvayy.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZGdmc2R5c3R0aXJ0ZmN2YXl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5NzUwMjksImV4cCI6MjEwMDU1MTAyOX0.A-klw72B2Uhy5g5t-cPxJzzZD08rOd7lamRO987m5DA';

  if (!window.supabase || !window.supabase.createClient) {
    console.error('pf-auth: supabase-js not loaded');
    return;
  }

  var client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  var isLoginPage = /(^|\/)login\.html$/.test(window.location.pathname);

  window.pfDb = client;
  window.pfUser = null;
  window.pfProfile = null;

  var readyResolve;
  window.pfAuthReady = new Promise(function (res) { readyResolve = res; });

  function baseUrl() {
    return window.location.origin + window.location.pathname.replace(/[^\/]*$/, '');
  }

  function toLogin() {
    try { sessionStorage.setItem('pedaforge:return', window.location.pathname.split('/').pop() + window.location.search); } catch (e) {}
    window.location.replace(baseUrl() + 'login.html');
  }

  function loadProfile(user) {
    return client.from('profiles').select('*').eq('id', user.id).maybeSingle()
      .then(function (r) { window.pfProfile = r.data || null; });
  }

  /* ── Navbar profile chip ─────────────────────────────── */
  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function injectChip() {
    var nav = document.getElementById('navLinks');
    if (!nav || document.getElementById('pfUserChip')) return;
    var p = window.pfProfile || {};
    var name = p.full_name || (window.pfUser && window.pfUser.email) || 'Account';
    var role = p.role || 'educator';
    var li = document.createElement('li');
    li.id = 'pfUserChip';
    li.innerHTML =
      '<span class="nav-dropdown-trigger pf-chip">' +
      (p.avatar_url ? '<img class="pf-avatar" src="' + esc(p.avatar_url) + '" alt="" referrerpolicy="no-referrer">' :
        '<span class="pf-avatar pf-avatar-fallback">' + esc(name.charAt(0).toUpperCase()) + '</span>') +
      '<span class="pf-chip-name">' + esc(name.split(' ')[0]) + '</span></span>' +
      '<div class="nav-dropdown pf-chip-menu">' +
      '<span class="pf-chip-row">' + esc(name) + '</span>' +
      '<span class="pf-chip-row pf-chip-role">' + esc(role) + '</span>' +
      '<a href="#" id="pfSignOut">Sign out</a></div>';
    nav.appendChild(li);
    document.getElementById('pfSignOut').addEventListener('click', function (e) {
      e.preventDefault();
      client.auth.signOut().then(function () { window.location.href = baseUrl() + 'login.html'; });
    });

    if (!document.getElementById('pfChipCss')) {
      var st = document.createElement('style');
      st.id = 'pfChipCss';
      st.textContent =
        '.pf-chip{display:inline-flex;align-items:center;gap:8px;cursor:pointer;}' +
        '.pf-avatar{width:26px;height:26px;border-radius:50%;object-fit:cover;display:inline-flex;align-items:center;justify-content:center;}' +
        '.pf-avatar-fallback{background:var(--secondary);color:#fff;font-size:0.72rem;font-weight:700;}' +
        '.pf-chip-menu{min-width:190px;}' +
        '.pf-chip-row{display:block;padding:8px 16px;font-size:0.8rem;color:var(--text-light);}' +
        '.pf-chip-role{text-transform:capitalize;font-weight:700;color:var(--text-muted);padding-top:0;font-size:0.7rem;letter-spacing:0.05em;}';
      document.head.appendChild(st);
    }
  }

  /* ── Gate ────────────────────────────────────────────── */
  function reveal() {
    document.documentElement.classList.remove('pf-auth-pending');
    readyResolve({ user: window.pfUser, profile: window.pfProfile, db: client });
    if (window.pfUser) {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectChip);
      else injectChip();
    }
  }

  client.auth.getSession().then(function (r) {
    var session = r.data ? r.data.session : null;
    if (!session && !isLoginPage) { toLogin(); return; }
    if (session) {
      window.pfUser = session.user;
      loadProfile(session.user).then(reveal, reveal);
    } else {
      reveal(); // login page, signed out
    }
  });

  client.auth.onAuthStateChange(function (event, session) {
    window.pfUser = session ? session.user : null;
    if (event === 'SIGNED_OUT' && !isLoginPage) toLogin();
  });

  /* ── Tiny toast for save feedback ────────────────────── */
  window.pfToast = function (msg) {
    var t = document.getElementById('pfToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'pfToast';
      t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);' +
        'background:var(--secondary,#2D2A5E);color:#fff;padding:10px 22px;border-radius:100px;' +
        'font-size:0.85rem;font-weight:600;z-index:9999;opacity:0;transition:opacity 0.3s ease;pointer-events:none;';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.style.opacity = '0'; }, 2600);
  };
})();

/* PedaForge AI Coach - real coaching chat backed by pfApi.ai('coach')
   and persisted to coach_sessions. No canned replies. */
(function () {
  'use strict';

  var MODE_TITLES = {
    reflective: 'AI Coach: Reflective Practice Mode',
    qtt: 'AI Coach: QTT Deep Dive Mode',
    socratic: 'AI Coach: Socratic Inquiry Mode',
    scenario: 'AI Coach: Scenario Analysis Mode'
  };
  var MODE_NAMES = {
    reflective: 'Reflective Practice',
    qtt: 'QTT Deep Dive',
    socratic: 'Socratic Inquiry',
    scenario: 'Scenario Analysis'
  };
  var MODE_WELCOMES = {
    reflective: 'Reflective Practice mode. Describe a moment from your teaching today - a child who was deeply engaged, or one who struggled - and we will unpack it together.',
    qtt: 'QTT Deep Dive mode. Pick a Quality Teaching Tool domain you want to strengthen (e.g. Learning Environment, Teacher-Child Interaction) and tell me where you are now.',
    socratic: 'Socratic Inquiry mode. Share a routine or practice you have "always done this way" and I will help you examine the assumptions behind it.',
    scenario: 'Scenario Analysis mode. Describe a lesson or initiative you are planning, and we will stress-test it before you deliver it.'
  };

  var state = { mode: 'reflective', messages: [], sessionId: null, busy: false };
  var els = {};
  var userId = null;
  var db = null;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function bubble(role, text) {
    var wrap = el('div', 'chat-message ' + role);
    wrap.appendChild(el('div', 'avatar', role === 'assistant' ? 'PF' : 'You'));
    var b = el('div', 'chat-bubble');
    // AI replies arrive as markdown - render it (escape-first, XSS-safe).
    if (role === 'assistant' && window.pfMd) window.pfMd.renderInto(b, text);
    else b.textContent = text;
    wrap.appendChild(b);
    return wrap;
  }

  function typingEl() {
    var wrap = el('div', 'chat-message assistant');
    wrap.appendChild(el('div', 'avatar', 'PF'));
    var b = el('div', 'chat-bubble typing-indicator');
    b.appendChild(el('span')); b.appendChild(el('span')); b.appendChild(el('span'));
    wrap.appendChild(b);
    return wrap;
  }

  function scrollBottom() { els.body.scrollTop = els.body.scrollHeight; }

  function contextChip(text) {
    var chip = el('div', null, text);
    chip.style.cssText = 'align-self:center;font-size:0.74rem;color:var(--text-muted);background:var(--bg-card);border:1px dashed var(--border);border-radius:100px;padding:5px 14px;';
    return chip;
  }

  function renderWelcome() {
    els.body.innerHTML = '';
    els.body.appendChild(bubble('assistant', MODE_WELCOMES[state.mode] || MODE_WELCOMES.reflective));
  }

  function renderTranscript() {
    els.body.innerHTML = '';
    state.messages.forEach(function (m) {
      if (m.role !== 'user' && m.role !== 'assistant') return;
      els.body.appendChild(bubble(m.role, m.text));
    });
    scrollBottom();
  }

  function setModeUI(mode) {
    state.mode = mode;
    document.querySelectorAll('.mode-strip-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-mode') === mode);
    });
    if (els.title) els.title.textContent = MODE_TITLES[mode] || MODE_TITLES.reflective;
  }

  function newSession() {
    state.messages = [];
    state.sessionId = null;
    renderWelcome();
  }

  function persist() {
    if (!state.messages.length || !db || !userId) return;
    if (state.sessionId) {
      db.from('coach_sessions')
        .update({ mode: state.mode, messages: state.messages })
        .eq('id', state.sessionId)
        .then(function (r) { if (r.error) window.pfToast('Could not save session: ' + r.error.message); });
    } else {
      db.from('coach_sessions')
        .insert({ user_id: userId, mode: state.mode, messages: state.messages })
        .select('id').single()
        .then(function (r) {
          if (r.error) { window.pfToast('Could not save session: ' + r.error.message); return; }
          state.sessionId = r.data.id;
          loadSessions();
        });
    }
  }

  function send() {
    var text = els.input.value.trim();
    if (!text || state.busy) return;
    state.busy = true;
    var done = window.pfApi.spinner(els.send, '...');
    var history = state.messages.slice(-8);

    els.body.appendChild(bubble('user', text));
    state.messages = state.messages.concat([{ role: 'user', text: text }]);
    els.input.value = '';
    var t = typingEl();
    els.body.appendChild(t);
    scrollBottom();

    window.pfApi.ai('coach', { message: text, mode: state.mode, history: history })
      .then(function (reply) {
        t.remove();
        var replyText = String(reply || '').trim() || 'Sorry - I could not form a reply. Try rephrasing.';
        els.body.appendChild(bubble('assistant', replyText));
        state.messages = state.messages.concat([{ role: 'assistant', text: replyText }]);
        scrollBottom();
        persist();
      })
      .catch(function (e) {
        t.remove();
        window.pfToast('AI coach failed: ' + e.message);
      })
      .then(function () {
        state.busy = false;
        done();
        els.input.focus();
      });
  }

  /* ── Recent sessions sidebar ─────────────────────────── */
  function firstUserLine(messages) {
    var m = (messages || []).filter(function (x) { return x.role === 'user'; })[0];
    if (!m) return 'No messages yet';
    return m.text.length > 64 ? m.text.slice(0, 64) + '...' : m.text;
  }

  function loadSessions() {
    db.from('coach_sessions')
      .select('id,mode,messages,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(8)
      .then(function (r) {
        var host = els.sessions;
        host.innerHTML = '';
        if (r.error) {
          host.appendChild(el('span', 'coach-empty', 'Could not load sessions.'));
          return;
        }
        var rows = r.data || [];
        if (!rows.length) {
          host.appendChild(el('span', 'coach-empty', 'No sessions yet - your conversations are saved here automatically.'));
          return;
        }
        rows.forEach(function (row) {
          var item = el('button', 'coach-session-item');
          item.type = 'button';
          var top = el('div', 'coach-session-top');
          top.appendChild(el('span', 'coach-session-mode', MODE_NAMES[row.mode] || row.mode));
          top.appendChild(el('span', 'coach-session-ago', window.pfApi.ago(row.created_at)));
          item.appendChild(top);
          item.appendChild(el('div', 'coach-session-line', firstUserLine(row.messages)));
          item.addEventListener('click', function () {
            state.sessionId = row.id;
            state.messages = Array.isArray(row.messages) ? row.messages.slice() : [];
            setModeUI(row.mode && MODE_NAMES[row.mode] ? row.mode : 'reflective');
            renderTranscript();
            els.input.focus();
          });
          host.appendChild(item);
        });
      });
  }

  /* ── Observation handoff: load latest report as context ── */
  function maybeHandoff() {
    if (!new URLSearchParams(window.location.search).has('handoff')) return;
    db.from('observations')
      .select('educator_name,report,created_at')
      .eq('observer', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(function (r) {
        var row = r.data && r.data[0];
        if (!row || !row.report) return;
        var rep = row.report || {};
        var ctx = 'For context, here is my latest lesson observation report for ' +
          (row.educator_name || 'an educator') + '. Strengths: ' + (rep.strengths || '-') +
          ' Growth areas: ' + (rep.growth || '-') + ' Follow-up plan: ' + (rep.followup || '-');
        state.messages.push({ role: 'user', text: ctx });
        els.body.appendChild(contextChip('Observation report for ' + (row.educator_name || 'educator') + ' loaded as context - ask the coach about it.'));
        scrollBottom();
      });
  }

  /* ── Boot ────────────────────────────────────────────── */
  function init(ctx) {
    if (!ctx || !ctx.user) return;
    userId = ctx.user.id;
    db = ctx.db;

    els.body = document.getElementById('coachBody');
    els.input = document.getElementById('coachInput');
    els.send = document.getElementById('coachSend');
    els.title = document.getElementById('chatModeTitle');
    els.sessions = document.getElementById('coachSessions');
    if (!els.body || !els.input || !els.send) return;

    document.querySelectorAll('.mode-strip-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mode = btn.getAttribute('data-mode');
        if (!mode || !MODE_NAMES[mode]) return;
        var hadConversation = mode !== state.mode && state.messages.length > 0;
        setModeUI(mode);
        if (hadConversation) {
          // Switching mode mid-conversation starts a fresh session so the
          // saved session's mode always matches its transcript. The previous
          // conversation is already persisted and stays in the sidebar.
          newSession();
          window.pfToast('Started a new ' + MODE_NAMES[mode] + ' session - your previous conversation is saved in Recent Sessions.');
        } else if (!state.messages.length) {
          renderWelcome();
        }
      });
    });

    els.send.addEventListener('click', send);
    els.input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); send(); }
    });

    var newBtn = document.getElementById('coachNew');
    if (newBtn) newBtn.addEventListener('click', newSession);

    document.querySelectorAll('.prompt-starter').forEach(function (starter) {
      starter.addEventListener('click', function () {
        var cleaned = starter.textContent.trim().replace(/^[^\w\d"'(]+/, '').trim();
        els.input.value = cleaned;
        els.input.focus();
      });
    });

    renderWelcome();
    loadSessions();
    maybeHandoff();
  }

  function boot() { if (window.pfAuthReady) window.pfAuthReady.then(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

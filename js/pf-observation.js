/* PedaForge Lesson Observation — live note capture with AI QTT tagging,
   AI report synthesis, and persistence to the observations table. */
(function () {
  'use strict';

  var notes = [];          // {note, indicator, state, rationale, at}
  var report = null;       // {strengths, growth, followup}
  var db = null, userId = null;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function $(id) { return document.getElementById(id); }
  function timeLabel(iso) {
    var d = new Date(iso);
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  /* ── Note feed ───────────────────────────────────────── */
  function noteCard(n) {
    var card = el('div', 'note-card');
    var head = el('div', 'note-head');
    head.appendChild(el('span', 'note-source', 'Typed note'));
    head.appendChild(el('span', 'note-time', timeLabel(n.at)));
    card.appendChild(head);
    var raw = el('div', 'note-raw');
    raw.textContent = '“' + n.note + '”';
    card.appendChild(raw);
    var line = el('div', 'note-tagline');
    line.appendChild(el('span', 'ai-stamp', '✦ Auto-tagged'));
    var st = (n.state === 'met') ? 'met' : 'emerging';
    var tag = el('span', 'qtt-tag ' + st);
    tag.textContent = 'QTT: ' + (n.indicator || 'General') + ' · ' + (st === 'met' ? 'Met' : 'Emerging');
    line.appendChild(tag);
    card.appendChild(line);
    if (n.rationale) {
      var why = el('div', null);
      why.style.cssText = 'font-size:0.78rem;color:var(--text-muted);margin-top:8px;line-height:1.5;';
      window.pfMd.renderInto(why, n.rationale);
      card.appendChild(why);
    }
    return card;
  }

  function renderNotes() {
    var feed = $('obsNoteFeed');
    feed.innerHTML = '';
    if (!notes.length) {
      var empty = el('div', null, 'No notes yet. Type what you see in the classroom and press "Tag with AI" — each note is matched to an ECDA QTT indicator.');
      empty.style.cssText = 'font-size:0.85rem;color:var(--text-muted);font-style:italic;padding:8px 2px;';
      feed.appendChild(empty);
    } else {
      notes.forEach(function (n) { feed.appendChild(noteCard(n)); });
    }
    var genBtn = $('obsGenerate');
    genBtn.disabled = notes.length < 2;
    genBtn.title = notes.length < 2 ? 'Capture at least 2 tagged notes first' : '';
  }

  function tagNote() {
    var input = $('obsNoteInput');
    var text = input.value.trim();
    if (!text) { window.pfToast('Type a note first.'); return; }
    var btn = $('obsTagBtn');
    var done = window.pfApi.spinner(btn, 'Tagging…');
    window.pfApi.ai('tag_observation', { note: text })
      .then(function (r) {
        notes = notes.concat([{
          note: text,
          indicator: (r && r.indicator) || 'General',
          state: (r && r.state) === 'met' ? 'met' : 'emerging',
          rationale: (r && r.rationale) || '',
          at: new Date().toISOString()
        }]);
        input.value = '';
        renderNotes();
      })
      .catch(function (e) { window.pfToast('AI tagging failed: ' + e.message); })
      .then(done);
  }

  /* ── Report ──────────────────────────────────────────── */
  function generateReport() {
    var educator = $('obsEducator').value.trim();
    if (!educator) { window.pfToast('Enter the educator’s name first.'); return; }
    if (notes.length < 2) { window.pfToast('Capture at least 2 tagged notes first.'); return; }
    var btn = $('obsGenerate');
    var done = window.pfApi.spinner(btn, 'Synthesising…');
    window.pfApi.ai('observation_report', { educator: educator, notes: notes })
      .then(function (r) {
        report = {
          strengths: (r && r.strengths) || '',
          growth: (r && r.growth) || '',
          followup: (r && r.followup) || ''
        };
        $('obsRepStrengths').value = report.strengths;
        $('obsRepGrowth').value = report.growth;
        $('obsRepFollowup').value = report.followup;
        $('obsReportCard').hidden = false;
        $('obsReportCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      })
      .catch(function (e) { window.pfToast('AI report failed: ' + e.message); })
      .then(done);
  }

  /* ── Cross-module: AI Coach follow-up link ───────────── */
  function showCoachLink() {
    if (document.getElementById('obsCoachLink')) return;
    if (!document.getElementById('pfXlinkCss')) {
      var s = document.createElement('style');
      s.id = 'pfXlinkCss';
      s.textContent = '.pf-xlink{display:inline-block;margin-top:10px;font-size:0.82rem;font-weight:600;color:var(--text-muted);text-decoration:none;}.pf-xlink:hover{color:var(--accent-proposal,var(--primary));text-decoration:underline;}';
      document.head.appendChild(s);
    }
    var a = el('a', 'pf-xlink', 'Saved — discuss this observation with the AI Coach →');
    a.id = 'obsCoachLink';
    a.href = 'coach.html';
    var card = $('obsReportCard');
    if (card && card.parentNode) card.parentNode.insertBefore(a, card.nextSibling);
  }

  function saveObservation() {
    var educator = $('obsEducator').value.trim();
    var className = $('obsClass').value.trim();
    if (!educator) { window.pfToast('Enter the educator’s name first.'); return; }
    if (!report) { window.pfToast('Generate the report before saving.'); return; }
    var btn = $('obsSave');
    var done = window.pfApi.spinner(btn, 'Saving…');
    var rec = {
      observer: userId,
      educator_name: educator,
      class_name: className || null,
      meta: {},
      evidence: notes,
      report: {
        strengths: $('obsRepStrengths').value.trim(),
        growth: $('obsRepGrowth').value.trim(),
        followup: $('obsRepFollowup').value.trim()
      }
    };
    db.from('observations').insert(rec).then(function (r) {
      done();
      if (r.error) { window.pfToast('Save failed: ' + r.error.message); return; }
      window.pfToast('Observation saved — discuss it with the AI Coach');
      showCoachLink();
      notes = [];
      report = null;
      $('obsReportCard').hidden = true;
      $('obsEducator').value = '';
      $('obsClass').value = '';
      renderNotes();
      loadPast();
    });
  }

  /* ── Past observations ───────────────────────────────── */
  function reportSection(title, text, cls) {
    var box = el('div', 'play-rep-sec ' + cls);
    box.appendChild(el('h5', null, title));
    if (text) {
      var body = el('div', null);
      window.pfMd.renderInto(body, text);
      box.appendChild(body);
    } else {
      box.appendChild(el('p', null, '—'));
    }
    return box;
  }

  function pastRow(o) {
    var card = el('div', 'note-card');
    card.style.cursor = 'pointer';
    var head = el('div', 'note-head');
    var who = el('span', 'note-source');
    who.textContent = o.educator_name + (o.class_name ? ' · ' + o.class_name : '');
    head.appendChild(who);
    head.appendChild(el('span', 'note-time', window.pfApi.ago(o.created_at)));
    card.appendChild(head);
    var meta = el('div', null,
      ((o.evidence && o.evidence.length) || 0) + ' notes' +
      (o.profiles && o.profiles.full_name ? ' · observed by ' + o.profiles.full_name : ''));
    meta.style.cssText = 'font-size:0.78rem;color:var(--text-muted);';
    card.appendChild(meta);
    var detail = el('div');
    detail.hidden = true;
    detail.style.marginTop = '10px';
    var rep = o.report || {};
    detail.appendChild(reportSection('Strengths', rep.strengths, 'play-rep-strengths'));
    detail.appendChild(reportSection('Growth areas', rep.growth, 'play-rep-growth'));
    detail.appendChild(reportSection('Follow-up', rep.followup, 'play-rep-followup'));
    card.appendChild(detail);
    card.addEventListener('click', function () { detail.hidden = !detail.hidden; });
    return card;
  }

  function loadPast() {
    var host = $('obsPastList');
    db.from('observations')
      .select('id,educator_name,class_name,evidence,report,created_at,profiles:observer(full_name)')
      .order('created_at', { ascending: false })
      .limit(12)
      .then(function (r) {
        host.innerHTML = '';
        if (r.error) {
          host.appendChild(el('span', 'app-obs-empty', 'Could not load observations: ' + r.error.message));
          return;
        }
        var rows = r.data || [];
        if (!rows.length) {
          host.appendChild(el('span', 'app-obs-empty', 'No observations recorded yet — capture your first one above.'));
          return;
        }
        rows.forEach(function (o) { host.appendChild(pastRow(o)); });
      });
  }

  /* ── Boot ────────────────────────────────────────────── */
  function init(ctx) {
    if (!ctx || !ctx.user) return;
    db = ctx.db;
    userId = ctx.user.id;
    if (!$('obsNoteFeed')) return;

    $('obsTagBtn').addEventListener('click', tagNote);
    $('obsNoteInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); tagNote(); }
    });
    $('obsGenerate').addEventListener('click', generateReport);
    $('obsSave').addEventListener('click', saveObservation);

    renderNotes();
    loadPast();
  }

  function boot() { if (window.pfAuthReady) window.pfAuthReady.then(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

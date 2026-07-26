/* PedaForge Portfolio - per-child observation timeline backed by
   portfolio_observations, AI narrative drafting via pfApi.ai('narrative'). */
(function () {
  'use strict';

  var DOMAINS = ['Language & Literacy', 'Numeracy', 'Motor Skills',
    'Social-Emotional', 'Discovery of the World', 'Aesthetics'];
  var DOMAIN_COLORS = {
    'Language & Literacy': '#8b5cf6',
    'Numeracy': 'var(--warning)',
    'Motor Skills': 'var(--success)',
    'Social-Emotional': 'var(--danger)',
    'Discovery of the World': 'var(--info)',
    'Aesthetics': 'var(--primary)'
  };
  var RING = 226.19; /* 2πr for r=36 */

  var currentChild = null;
  var currentClass = null;
  var draft = null; /* {narrative, framework_tags, next_step} */

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function checkedDomains() {
    var out = [];
    var boxes = $('pfoDomains').querySelectorAll('input[type=checkbox]');
    Array.prototype.forEach.call(boxes, function (b) { if (b.checked) out.push(b.value); });
    return out;
  }

  /* ── Domain coverage roundels (real counts) ──────────── */
  function renderCoverage(rows) {
    var grid = $('pfoDomainGrid');
    grid.innerHTML = '';
    var total = rows.length;
    var counts = {};
    rows.forEach(function (o) {
      (o.domains || []).forEach(function (d) { counts[d] = (counts[d] || 0) + 1; });
    });
    $('pfoCoverageMeta').textContent = total
      ? 'Share of this child\'s ' + total + ' observation' + (total === 1 ? '' : 's') + ' touching each domain.'
      : 'No observations yet - coverage fills in as you record them.';

    DOMAINS.forEach(function (d) {
      var n = counts[d] || 0;
      var pct = total ? Math.round((n / total) * 100) : 0;
      var color = DOMAIN_COLORS[d] || 'var(--primary)';
      var cell = el('div', 'domain-cell');
      var roundel = el('div', 'domain-roundel');
      var offset = (RING * (100 - pct) / 100).toFixed(2);
      var svgNs = 'http://www.w3.org/2000/svg';
      var svg = document.createElementNS(svgNs, 'svg');
      svg.setAttribute('class', 'roundel-ring');
      svg.setAttribute('viewBox', '0 0 80 80');
      var bg = document.createElementNS(svgNs, 'circle');
      bg.setAttribute('cx', '40'); bg.setAttribute('cy', '40'); bg.setAttribute('r', '36');
      bg.setAttribute('fill', 'none'); bg.setAttribute('stroke', 'var(--border)'); bg.setAttribute('stroke-width', '6');
      var fg = document.createElementNS(svgNs, 'circle');
      fg.setAttribute('cx', '40'); fg.setAttribute('cy', '40'); fg.setAttribute('r', '36');
      fg.setAttribute('fill', 'none'); fg.setAttribute('stroke', color); fg.setAttribute('stroke-width', '6');
      fg.setAttribute('stroke-linecap', 'round'); fg.setAttribute('class', 'roundel-track');
      fg.setAttribute('stroke-dasharray', String(RING)); fg.setAttribute('stroke-dashoffset', offset);
      svg.appendChild(bg); svg.appendChild(fg);
      roundel.appendChild(svg);
      roundel.appendChild(el('span', 'roundel-value', total ? n + '/' + total : '-'));
      cell.appendChild(roundel);
      cell.appendChild(el('span', 'domain-name', d));
      grid.appendChild(cell);
    });
  }

  /* ── Timeline ────────────────────────────────────────── */
  function renderTimeline(rows) {
    var host = $('pfoTimeline');
    host.innerHTML = '';
    if (!rows.length) {
      var empty = el('div', 'pfo-empty');
      empty.appendChild(el('h4', null, 'No observations yet'));
      empty.appendChild(el('p', null, 'Record what you noticed in the "New Observation" form above - the AI turns your quick note into a portfolio-ready narrative.'));
      host.appendChild(empty);
      return;
    }
    rows.forEach(function (o) {
      var card = el('div', 'observation-card');
      var meta = el('div', 'obs-meta');
      meta.appendChild(el('span', null, window.pfApi.ago(o.observed_at || o.created_at)));
      card.appendChild(meta);
      card.appendChild(el('p', 'obs-text', o.raw_note || ''));
      var tags = el('div', 'obs-tags');
      (o.domains || []).forEach(function (d) { tags.appendChild(el('span', 'tag tag-framework', d)); });
      if (tags.children.length) card.appendChild(tags);
      if (o.ai_narrative) {
        var box = el('div', 'narrative-box');
        var lab = el('p', 'narrative-label');
        lab.appendChild(el('span', 'pf-ai-badge', 'AI-drafted - educator-approved'));
        box.appendChild(lab);
        var narr = el('div', 'narrative-text');
        window.pfMd.renderInto(narr, o.ai_narrative);
        box.appendChild(narr);
        card.appendChild(box);
      }
      host.appendChild(card);
    });
  }

  function loadObservations() {
    if (!currentChild) return Promise.resolve();
    return window.pfDb.from('portfolio_observations')
      .select('id,observed_at,raw_note,domains,ai_narrative,created_at')
      .eq('child_id', currentChild.id)
      .order('observed_at', { ascending: false })
      .then(function (r) {
        if (r.error) throw r.error;
        var rows = r.data || [];
        renderCoverage(rows);
        renderTimeline(rows);
      })
      .catch(function (e) { window.pfToast('Could not load observations: ' + e.message); });
  }

  /* ── AI draft ────────────────────────────────────────── */
  function draftWithAi() {
    if (!currentChild) { window.pfToast('Pick a child first.'); return; }
    var note = $('pfoNote').value.trim();
    if (note.length < 10) { window.pfToast('Describe what you observed (a sentence or two).'); return; }
    var domains = checkedDomains();
    if (!domains.length) { window.pfToast('Tick at least one learning domain.'); return; }

    var btn = $('pfoDraft');
    var done = window.pfApi.spinner(btn, 'Thinking...');
    window.pfApi.ai('narrative', {
      child: { name: currentChild.name, profile_tags: currentChild.profile_tags || [] },
      note: note,
      domains: domains
    })
      .then(function (r) {
        draft = r || {};
        $('pfoNarrative').value = draft.narrative || '';
        var tags = $('pfoDraftTags');
        tags.innerHTML = '';
        (draft.framework_tags || []).forEach(function (t) {
          tags.appendChild(el('span', 'tag tag-framework', t));
        });
        var ns = $('pfoNextStep');
        if (draft.next_step) {
          window.pfMd.renderInto(ns, '**Next step:** ' + draft.next_step);
          ns.classList.remove('hidden');
        } else {
          ns.classList.add('hidden');
        }
        $('pfoDraftBox').classList.remove('hidden');
        $('pfoDraftBox').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      })
      .catch(function (e) { window.pfToast('AI failed: ' + e.message); })
      .then(done);
  }

  /* ── Save ────────────────────────────────────────────── */
  function saveObservation() {
    if (!currentChild) { window.pfToast('Pick a child first.'); return; }
    var note = $('pfoNote').value.trim();
    var narrative = $('pfoNarrative').value.trim();
    if (!note || !narrative) { window.pfToast('Both the raw note and the narrative are needed.'); return; }

    var btn = $('pfoSave');
    var done = window.pfApi.spinner(btn, 'Saving...');
    window.pfDb.from('portfolio_observations').insert({
      owner: window.pfUser.id,
      child_id: currentChild.id,
      observed_at: new Date().toISOString(),
      raw_note: note,
      domains: checkedDomains(),
      ai_narrative: narrative
    }).select().single()
      .then(function (r) {
        if (r.error) throw r.error;
        window.pfToast('Saved to ' + currentChild.name + '\'s portfolio.');
        $('pfoNote').value = '';
        $('pfoNarrative').value = '';
        $('pfoDraftBox').classList.add('hidden');
        var boxes = $('pfoDomains').querySelectorAll('input[type=checkbox]');
        Array.prototype.forEach.call(boxes, function (b) { b.checked = false; });
        draft = null;
        return loadObservations();
      })
      .catch(function (e) { window.pfToast('Save failed: ' + e.message); })
      .then(done);
  }

  /* ── Cross-module: child profile link ────────────────── */
  var profileLinkEl = null;
  function updateProfileLink(child) {
    if (!profileLinkEl) {
      if (!document.getElementById('pfXlinkCss')) {
        var s = document.createElement('style');
        s.id = 'pfXlinkCss';
        s.textContent = '.pf-xlink{display:inline-block;margin-top:6px;font-size:0.8rem;font-weight:600;color:var(--text-muted);text-decoration:none;}.pf-xlink:hover{color:var(--accent-proposal,var(--primary));text-decoration:underline;}';
        document.head.appendChild(s);
      }
      profileLinkEl = el('a', 'pf-xlink', 'View full profile →');
      var meta = $('pfoChildMeta');
      if (meta && meta.parentNode) meta.parentNode.insertBefore(profileLinkEl, meta.nextSibling);
    }
    if (child) {
      profileLinkEl.href = 'child.html?id=' + encodeURIComponent(child.id);
      profileLinkEl.hidden = false;
    } else {
      profileLinkEl.hidden = true;
    }
  }

  /* ── Child pick ──────────────────────────────────────── */
  function onPick(child, cls) {
    currentChild = child;
    currentClass = cls;
    updateProfileLink(child);
    if (!child) {
      $('pfoBody').classList.add('hidden');
      $('pfoChildName').textContent = 'Portfolio';
      $('pfoChildMeta').textContent = cls
        ? 'This class has no children yet - add them in My Classes.'
        : 'Create a class and add children to start building portfolios.';
      return;
    }
    $('pfoChildName').textContent = child.name;
    var bits = [];
    if (cls) bits.push(cls.name + ' (' + String(cls.age_group || '').toUpperCase() + ')');
    if (child.profile_tags && child.profile_tags.length) bits.push(child.profile_tags.join(' - '));
    $('pfoChildMeta').textContent = bits.join(' - ') || 'Living portfolio';
    $('pfoBody').classList.remove('hidden');
    loadObservations();
  }

  function init(ctx) {
    if (!ctx || !ctx.user) return;
    var picker = $('pfoPicker');
    if (!picker) return;
    $('pfoDraft').addEventListener('click', draftWithAi);
    $('pfoSave').addEventListener('click', saveObservation);
    window.pfApi.childPicker(picker, { onPick: onPick });
  }

  function boot() { if (window.pfAuthReady) window.pfAuthReady.then(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

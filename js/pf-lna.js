/* PedaForge Learning Needs Analysis — real AI goal generation via
   pfApi.ai('lna'). Render-only (no LNA table); results copyable to IDP. */
(function () {
  'use strict';

  var lastResult = null;

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function goalCard(g, i) {
    var card = el('div', 'lna-goal-card');
    var head = el('div', 'lna-goal-head');
    head.appendChild(el('span', 'lna-goal-num', String(i + 1)));
    var tags = el('span', 'lna-goal-tags');
    if (g.qtt_domain) tags.appendChild(el('span', 'lna-qtt-tag', 'QTT: ' + g.qtt_domain));
    if (g.sfw_ref) tags.appendChild(el('span', 'sfw-pill', g.sfw_ref));
    head.appendChild(tags);
    card.appendChild(head);
    card.appendChild(el('p', 'lna-goal-text', g.goal || ''));
    return card;
  }

  function renderResult(r) {
    lastResult = r;
    var host = $('lnaResults');
    host.innerHTML = '';

    var label = el('div', null);
    var badge = el('span', 'pf-ai-badge', '✦ AI-generated · editable');
    label.appendChild(badge);
    label.style.marginBottom = '12px';
    host.appendChild(label);

    var goals = (r && r.goals) || [];
    if (!goals.length) {
      host.appendChild(el('p', 'lna-empty', 'The AI returned no goals — try adding more detail to your self-assessment.'));
    }
    goals.slice(0, 3).forEach(function (g, i) { host.appendChild(goalCard(g, i)); });

    if (r && r.pd_suggestion) {
      var box = el('div', 'lna-pd-box');
      box.appendChild(el('h4', null, 'Suggested professional development'));
      box.appendChild(el('p', null, r.pd_suggestion));
      host.appendChild(box);
    }

    var actions = el('div', 'lna-actions');
    var copyBtn = el('button', 'btn btn-secondary btn-sm', 'Copy to IDP');
    copyBtn.type = 'button';
    copyBtn.addEventListener('click', copyToIdp);
    actions.appendChild(copyBtn);
    var hint = el('span', null, 'Copies the goals as text for pasting into your Individual Development Plan.');
    hint.style.cssText = 'font-size:0.76rem;color:var(--text-muted);align-self:center;';
    actions.appendChild(hint);
    host.appendChild(actions);

    $('lnaResultCard').hidden = false;
    $('lnaResultCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function resultAsText() {
    if (!lastResult) return '';
    var lines = ['Learning Needs Analysis — AI-identified goals', ''];
    (lastResult.goals || []).forEach(function (g, i) {
      lines.push((i + 1) + '. ' + (g.goal || ''));
      if (g.qtt_domain) lines.push('   QTT domain: ' + g.qtt_domain);
      if (g.sfw_ref) lines.push('   SFw reference: ' + g.sfw_ref);
      lines.push('');
    });
    if (lastResult.pd_suggestion) {
      lines.push('Suggested PD: ' + lastResult.pd_suggestion);
    }
    return lines.join('\n');
  }

  function copyToIdp() {
    var text = resultAsText();
    if (!text) { window.pfToast('Nothing to copy yet.'); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(function () { window.pfToast('Goals copied — paste into your IDP.'); })
        .catch(function () { window.pfToast('Copy failed — select and copy manually.'); });
    } else {
      window.pfToast('Clipboard unavailable — select and copy manually.');
    }
  }

  function analyse() {
    var designation = $('lnaDesignation').value;
    var experience = parseInt($('lnaExperience').value, 10);
    var selfAssessment = $('lnaSelf').value.trim();

    if (isNaN(experience) || experience < 0 || experience > 60) {
      window.pfToast('Enter your years of experience (0–60).');
      return;
    }
    if (selfAssessment.length < 15) {
      window.pfToast('Tell us a little more about where you want to grow (a sentence or two).');
      return;
    }

    var btn = $('lnaAnalyse');
    var done = window.pfApi.spinner(btn, 'Analysing…');
    window.pfApi.ai('lna', {
      designation: designation,
      experience: experience,
      selfAssessment: selfAssessment
    })
      .then(renderResult)
      .catch(function (e) { window.pfToast('AI analysis failed: ' + e.message); })
      .then(done);
  }

  function init(ctx) {
    if (!ctx || !ctx.user) return;
    var btn = $('lnaAnalyse');
    if (!btn) return;
    btn.addEventListener('click', analyse);
  }

  function boot() { if (window.pfAuthReady) window.pfAuthReady.then(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

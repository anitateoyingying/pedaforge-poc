/* PedaForge Work Samples — real image upload to the artefacts bucket,
   AI analysis via pfApi.ai('analyze_sample'), rows in work_samples. */
(function () {
  'use strict';

  var MAX_BYTES = 10 * 1024 * 1024;

  var currentChild = null;
  var currentClass = null;
  var pickedFile = null;
  var previewUrl = null;
  var analysis = null; /* {milestones[], narrative, framework_tags[], next_step} */
  var domains = [];

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ── File input / preview ────────────────────────────── */
  function setFile(file) {
    if (!file) return;
    if (!/^image\//.test(file.type)) { window.pfToast('Please choose an image (JPG or PNG).'); return; }
    if (file.size > MAX_BYTES) { window.pfToast('Image is larger than 10 MB — please resize it.'); return; }
    pickedFile = file;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    $('wsPreviewImg').src = previewUrl;
    $('wsPreviewName').textContent = file.name;
    $('wsPreviewMeta').textContent = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    $('wsUploadPrompt').classList.add('hidden');
    $('wsPreview').classList.remove('hidden');
    $('wsDropZone').classList.add('has-file');
  }

  function clearFile() {
    pickedFile = null;
    if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
    $('wsFile').value = '';
    $('wsPreview').classList.add('hidden');
    $('wsUploadPrompt').classList.remove('hidden');
    $('wsDropZone').classList.remove('has-file');
  }

  function wireUpload() {
    var zone = $('wsDropZone');
    var input = $('wsFile');
    zone.addEventListener('click', function (e) {
      if (e.target.closest('#wsClearFile')) return;
      input.click();
    });
    zone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });
    input.addEventListener('change', function () { setFile(input.files[0]); });
    zone.addEventListener('dragover', function (e) { e.preventDefault(); });
    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files.length) setFile(e.dataTransfer.files[0]);
    });
    $('wsClearFile').addEventListener('click', function (e) { e.stopPropagation(); clearFile(); });
  }

  /* ── Domain chips ────────────────────────────────────── */
  function renderDomainChips() {
    var host = $('wsDomainChips');
    host.innerHTML = '';
    domains.forEach(function (d) {
      var chip = el('span', 'domain-chip', d + ' ');
      var x = el('button', 'domain-chip-remove', '×');
      x.type = 'button';
      x.setAttribute('aria-label', 'Remove ' + d);
      x.addEventListener('click', function () {
        domains = domains.filter(function (v) { return v !== d; });
        renderDomainChips();
      });
      chip.appendChild(x);
      host.appendChild(chip);
    });
    if (!domains.length) {
      host.appendChild(el('span', 'profile-meta', 'No domains selected yet.'));
    }
  }

  function wireDomains() {
    var sel = $('wsDomainSelect');
    sel.addEventListener('change', function () {
      var v = sel.value;
      if (v && domains.indexOf(v) === -1) domains = domains.concat([v]);
      sel.value = '';
      renderDomainChips();
    });
    renderDomainChips();
  }

  /* ── Analyse ─────────────────────────────────────────── */
  function analyse() {
    var context = $('wsContext').value.trim();
    if (context.length < 15) { window.pfToast('Describe the work sample first (a sentence or two of context).'); return; }
    if (!domains.length) { window.pfToast('Add at least one learning domain.'); return; }

    var btn = $('wsAnalyse');
    var done = window.pfApi.spinner(btn, 'Analysing…');
    window.pfApi.ai('analyze_sample', {
      context: context,
      domains: domains,
      child: currentChild
        ? { name: currentChild.name, profile_tags: currentChild.profile_tags || [] }
        : null
    })
      .then(function (r) {
        analysis = r || {};
        $('wsResultMeta').textContent = (currentChild ? currentChild.name + ' · ' : '') + domains.join(', ');
        var ms = $('wsMilestones');
        ms.innerHTML = '';
        var list = analysis.milestones || [];
        if (!list.length) ms.appendChild(el('p', 'profile-meta', 'No specific milestones identified — add more context and retry.'));
        list.forEach(function (m) {
          var row = el('div', 'ws-milestone-item');
          row.appendChild(el('span', 'ws-milestone-icon', '✓'));
          var body = el('div', null);
          body.style.flex = '1';
          window.pfMd.renderInto(body, typeof m === 'string' ? m : JSON.stringify(m));
          row.appendChild(body);
          ms.appendChild(row);
        });
        $('wsNarrative').value = analysis.narrative || '';
        var tags = $('wsTags');
        tags.innerHTML = '';
        (analysis.framework_tags || []).forEach(function (t) {
          tags.appendChild(el('span', 'tag tag-framework', t));
        });
        var ns = $('wsNextStep');
        if (analysis.next_step) {
          window.pfMd.renderInto(ns, '**Next step:** ' + analysis.next_step);
          ns.classList.remove('hidden');
        } else {
          ns.classList.add('hidden');
        }
        $('wsResultEmpty').classList.add('hidden');
        $('wsResults').classList.remove('hidden');
        $('wsResults').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      })
      .catch(function (e) { window.pfToast('AI failed: ' + e.message); })
      .then(done);
  }

  /* ── Save ────────────────────────────────────────────── */
  function save() {
    if (!analysis) { window.pfToast('Analyse the sample first.'); return; }
    var context = $('wsContext').value.trim();
    var narrative = $('wsNarrative').value.trim();
    if (!narrative) { window.pfToast('The narrative is empty — edit or regenerate it.'); return; }

    var btn = $('wsSave');
    var done = window.pfApi.spinner(btn, 'Saving…');
    var uploadP = pickedFile
      ? window.pfApi.uploadArtefact(pickedFile, 'worksample')
      : Promise.resolve(null);

    uploadP
      .then(function (path) {
        return window.pfDb.from('work_samples').insert({
          owner: window.pfUser.id,
          child_id: currentChild ? currentChild.id : null,
          image_path: path,
          context: context,
          domains: domains,
          ai_analysis: {
            milestones: analysis.milestones || [],
            narrative: narrative,
            framework_tags: analysis.framework_tags || [],
            next_step: analysis.next_step || null
          }
        }).select().single();
      })
      .then(function (r) {
        if (r.error) throw r.error;
        window.pfToast(currentChild
          ? 'Work sample saved — it now appears on ' + currentChild.name + '’s profile.'
          : 'Work sample saved.');
        analysis = null;
        $('wsContext').value = '';
        $('wsResults').classList.add('hidden');
        $('wsResultEmpty').classList.remove('hidden');
        clearFile();
        domains = [];
        renderDomainChips();
        return loadGallery();
      })
      .catch(function (e) { window.pfToast('Save failed: ' + e.message); })
      .then(done);
  }

  /* ── Gallery ─────────────────────────────────────────── */
  function placeholderThumb() {
    var d = el('div', null);
    d.innerHTML = '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
    return d.firstChild;
  }

  function loadGallery() {
    return window.pfDb.from('work_samples')
      .select('id,image_path,context,domains,created_at,children(name)')
      .eq('owner', window.pfUser.id)
      .order('created_at', { ascending: false })
      .limit(12)
      .then(function (r) {
        if (r.error) throw r.error;
        var host = $('wsGallery');
        host.innerHTML = '';
        var rows = r.data || [];
        if (!rows.length) {
          var empty = el('div', 'ws-empty', 'No work samples yet — analyse and save your first one above.');
          empty.style.gridColumn = '1 / -1';
          host.appendChild(empty);
          return;
        }
        rows.forEach(function (s) {
          var card = el('div', 'ws-gallery-card');
          var thumb = el('div', 'ws-gallery-thumb');
          thumb.appendChild(placeholderThumb());
          card.appendChild(thumb);
          if (s.image_path) {
            window.pfApi.artefactUrl(s.image_path).then(function (url) {
              if (!url) return;
              var img = document.createElement('img');
              img.alt = 'Work sample';
              img.src = url;
              thumb.innerHTML = '';
              thumb.appendChild(img);
            }).catch(function () { /* keep placeholder */ });
          }
          var body = el('div', 'ws-gallery-body');
          body.appendChild(el('h5', null, (s.children && s.children.name) || 'General sample'));
          var snippet = (s.context || '').slice(0, 90);
          if ((s.context || '').length > 90) snippet += '…';
          body.appendChild(el('p', null, snippet || 'No context recorded.'));
          body.appendChild(el('p', null, ((s.domains || []).join(', ') || 'No domains') + ' · ' + window.pfApi.ago(s.created_at)));
          card.appendChild(body);
          host.appendChild(card);
        });
      })
      .catch(function (e) { window.pfToast('Could not load samples: ' + e.message); });
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
      var meta = $('wsChildMeta');
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
    if (child) {
      $('wsChildName').textContent = child.name;
      var bits = [];
      if (cls) bits.push(cls.name + ' (' + String(cls.age_group || '').toUpperCase() + ')');
      if (child.profile_tags && child.profile_tags.length) bits.push(child.profile_tags.join(' · '));
      $('wsChildMeta').textContent = bits.join(' · ');
    } else {
      $('wsChildName').textContent = 'Work Samples';
      $('wsChildMeta').textContent = cls
        ? 'General sample (no child linked) — or pick a child above.'
        : 'Create a class in My Classes to link samples to children.';
    }
  }

  function init(ctx) {
    if (!ctx || !ctx.user) return;
    if (!$('wsAnalyse')) return;
    wireUpload();
    wireDomains();
    $('wsAnalyse').addEventListener('click', analyse);
    $('wsSave').addEventListener('click', save);
    window.pfApi.childPicker($('wsPicker'), { onPick: onPick, allowNone: true });
    loadGallery();
  }

  function boot() { if (window.pfAuthReady) window.pfAuthReady.then(init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

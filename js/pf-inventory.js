/* ═══════════════════════════════════════════════════════════════
   PedaForge SproutSpace - Resource Inventory (live data)
   All items are read from / written to Supabase `inventory_items`
   (visible to every authenticated user). Check-in / check-out and
   condition changes are journalled to `inventory_events`.
   Requires pf-auth.js + pf-api.js (window.pfDb, window.pfApi).
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var CATEGORY_LABEL = {
    sensory: 'Sensory',
    construction: 'Construction',
    art: 'Art',
    books: 'Books',
    'fine-motor': 'Fine-motor',
    general: 'General'
  };
  var AGE_LABEL = {
    infant: 'Infant', playgroup: 'PG',
    n1: 'N1', n2: 'N2', k1: 'K1', k2: 'K2'
  };
  var CONDITION_ORDER = ['good', 'fair', 'worn'];
  var CONDITION_DOTS = { good: 3, fair: 2, worn: 1 };

  var items = [];
  var els = {};
  var selectedAges = {};

  function db() { return window.pfDb; }
  function uid() { return window.pfUser && window.pfUser.id; }
  function api() { return window.pfApi; }
  function toast(msg) { if (window.pfToast) window.pfToast(msg); }

  /* ─── Data ───────────────────────────────────────────────── */
  function fetchItems() {
    return db().from('inventory_items')
      .select('id,owner,name,category,age_groups,qr_code,condition,status,checked_out_by,created_at,holder:checked_out_by(full_name)')
      .order('created_at', { ascending: false })
      .then(function (r) {
        if (!r.error) { items = r.data || []; renderGrid(); return; }
        /* Fallback: embedded join unavailable - load without holder names */
        return db().from('inventory_items')
          .select('id,owner,name,category,age_groups,qr_code,condition,status,checked_out_by,created_at')
          .order('created_at', { ascending: false })
          .then(function (r2) {
            if (r2.error) throw r2.error;
            items = r2.data || [];
            renderGrid();
          });
      });
  }

  function logEvent(itemId, action, detail) {
    return db().from('inventory_events')
      .insert({ item_id: itemId, actor: uid(), action: action, detail: detail || null });
  }

  /* ─── Add-item form ──────────────────────────────────────── */
  function wireAddForm() {
    els.ageChips.addEventListener('click', function (e) {
      var chip = e.target.closest('button[data-age]');
      if (!chip) return;
      var key = chip.dataset.age;
      var next = {};
      Object.keys(selectedAges).forEach(function (k) { next[k] = selectedAges[k]; });
      next[key] = !next[key];
      selectedAges = next;
      chip.classList.toggle('inv-agechip-on', selectedAges[key]);
    });

    els.addBtn.addEventListener('click', function () {
      var name = els.nameInput.value.trim();
      if (!name) { toast('Give the resource a name first.'); els.nameInput.focus(); return; }
      var ages = Object.keys(selectedAges).filter(function (k) { return selectedAges[k]; });
      var done = api().spinner(els.addBtn, 'Adding...');
      db().from('inventory_items').insert({
        owner: uid(),
        name: name,
        category: els.catSelect.value,
        age_groups: ages,
        condition: els.condSelect.value
      }).select().single().then(function (r) {
        done();
        if (r.error) { toast('Could not add item: ' + r.error.message); return; }
        toast('"' + name + '" added to the shared inventory');
        els.nameInput.value = '';
        selectedAges = {};
        els.ageChips.querySelectorAll('button[data-age]').forEach(function (c) { c.classList.remove('inv-agechip-on'); });
        fetchItems();
      }).catch(function (e) { done(); toast('Could not add item: ' + e.message); });
    });
  }

  /* ─── Filters ────────────────────────────────────────────── */
  function passesFilters(item) {
    var q = els.search.value.trim().toLowerCase();
    if (q) {
      var hay = (item.name + ' ' + item.category + ' ' + (item.age_groups || []).join(' ')).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    var cat = els.filterCat.value;
    if (cat && item.category !== cat) return false;
    var age = els.filterAge.value;
    if (age && (item.age_groups || []).indexOf(age) === -1) return false;
    var st = els.filterStatus.value;
    if (st === 'in' && item.status !== 'in') return false;
    if (st === 'out' && item.status !== 'out') return false;
    if (st === 'worn' && item.condition !== 'worn') return false;
    return true;
  }

  function wireFilters() {
    ['input', 'change'].forEach(function (evt) {
      els.search.addEventListener(evt, renderGrid);
    });
    [els.filterCat, els.filterAge, els.filterStatus].forEach(function (sel) {
      sel.addEventListener('change', renderGrid);
    });
  }

  /* ─── Card rendering ─────────────────────────────────────── */
  function barcodeEl(code) {
    var wrap = document.createElement('div');
    wrap.className = 'inv-barcode';
    var chars = String(code || '').replace(/[^0-9a-f]/gi, '').slice(0, 16) || '0f3a9c';
    for (var i = 0; i < chars.length; i += 1) {
      var bar = document.createElement('span');
      var v = parseInt(chars[i], 16);
      if (isNaN(v)) v = i;
      bar.style.width = (1 + (v % 3)) + 'px';
      wrap.appendChild(bar);
    }
    return wrap;
  }

  function statusPill(item) {
    var span = document.createElement('span');
    span.className = 'inv-status ' + (item.condition === 'worn' ? 'worn' : item.status);
    if (item.status === 'out') {
      span.textContent = 'Checked out';
    } else if (item.condition === 'worn') {
      span.textContent = 'Worn';
    } else {
      span.textContent = 'Available';
    }
    return span;
  }

  function conditionDots(condition) {
    var dots = document.createElement('div');
    dots.className = 'condition-dots';
    dots.title = 'Condition: ' + condition;
    var on = CONDITION_DOTS[condition] || 1;
    for (var i = 0; i < 3; i += 1) {
      var d = document.createElement('span');
      d.className = 'cd' + (i < on ? ' on' : '');
      dots.appendChild(d);
    }
    return dots;
  }

  function renderCard(item) {
    var card = document.createElement('div');
    card.className = 'inv-card';
    card.dataset.id = item.id;

    var head = document.createElement('div');
    head.className = 'inv-card-head';
    var qrWrap = document.createElement('div');
    qrWrap.className = 'inv-qr-wrap';
    qrWrap.appendChild(barcodeEl(item.qr_code));
    var qrText = document.createElement('span');
    qrText.className = 'inv-qr-hex';
    qrText.textContent = String(item.qr_code || '').slice(0, 10);
    qrWrap.appendChild(qrText);
    head.appendChild(qrWrap);
    head.appendChild(statusPill(item));
    card.appendChild(head);

    var title = document.createElement('h4');
    title.textContent = item.name;
    card.appendChild(title);

    var meta = document.createElement('p');
    meta.className = 'inv-meta';
    var ages = (item.age_groups || []).map(function (a) { return AGE_LABEL[a] || a.toUpperCase(); }).join(' - ');
    meta.textContent = (CATEGORY_LABEL[item.category] || item.category) + (ages ? ' - ' + ages : '');
    card.appendChild(meta);

    if (item.status === 'out') {
      var holder = document.createElement('p');
      holder.className = 'inv-meta';
      holder.textContent = 'With ' + ((item.holder && item.holder.full_name) || 'a colleague');
      card.appendChild(holder);
    }

    card.appendChild(conditionDots(item.condition));

    var actions = document.createElement('div');
    actions.className = 'inv-actions';

    var moveBtn = document.createElement('button');
    moveBtn.className = 'btn btn-secondary btn-sm';
    moveBtn.textContent = item.status === 'in' ? 'Check Out' : 'Check In';
    moveBtn.addEventListener('click', function () { toggleStatus(item, moveBtn); });
    actions.appendChild(moveBtn);

    var condBtn = document.createElement('button');
    condBtn.className = 'btn btn-secondary btn-sm';
    condBtn.textContent = 'Condition: ' + item.condition;
    condBtn.title = 'Tap to log wear (good → fair → worn)';
    condBtn.addEventListener('click', function () { cycleCondition(item, condBtn); });
    actions.appendChild(condBtn);

    var histBtn = document.createElement('button');
    histBtn.className = 'btn btn-secondary btn-sm';
    histBtn.textContent = 'History';
    actions.appendChild(histBtn);

    card.appendChild(actions);

    var histBox = document.createElement('div');
    histBox.className = 'inv-history';
    histBox.hidden = true;
    card.appendChild(histBox);
    histBtn.addEventListener('click', function () { toggleHistory(item, histBox, histBtn); });

    return card;
  }

  function renderGrid() {
    els.grid.textContent = '';
    var visible = items.filter(passesFilters);
    if (!items.length) {
      els.empty.hidden = false;
      els.empty.textContent = 'No resources in the shared inventory yet - add the first item above and it becomes visible to every educator in the centre.';
      return;
    }
    if (!visible.length) {
      els.empty.hidden = false;
      els.empty.textContent = 'No resources match these filters. Clear the search or filters to see all ' + items.length + ' items.';
      return;
    }
    els.empty.hidden = true;
    visible.forEach(function (item) { els.grid.appendChild(renderCard(item)); });
  }

  /* ─── Actions ────────────────────────────────────────────── */
  function toggleStatus(item, btn) {
    var goingOut = item.status === 'in';
    var done = api().spinner(btn, goingOut ? 'Checking out...' : 'Checking in...');
    db().from('inventory_items')
      .update({ status: goingOut ? 'out' : 'in', checked_out_by: goingOut ? uid() : null })
      .eq('id', item.id)
      .then(function (r) {
        if (r.error) { done(); toast('Update failed: ' + r.error.message); return; }
        logEvent(item.id, goingOut ? 'check_out' : 'check_in', goingOut ? 'Checked out' : 'Returned')
          .then(function () {
            done();
            toast(goingOut ? 'Checked out - it\'s yours' : 'Checked back in');
            fetchItems();
          });
      })
      .catch(function (e) { done(); toast('Update failed: ' + e.message); });
  }

  function cycleCondition(item, btn) {
    var idx = CONDITION_ORDER.indexOf(item.condition);
    var next = CONDITION_ORDER[(idx + 1) % CONDITION_ORDER.length];
    var done = api().spinner(btn, 'Saving...');
    db().from('inventory_items')
      .update({ condition: next })
      .eq('id', item.id)
      .then(function (r) {
        if (r.error) { done(); toast('Update failed: ' + r.error.message); return; }
        logEvent(item.id, 'condition', item.condition + ' → ' + next)
          .then(function () {
            done();
            toast('Condition logged: ' + next);
            fetchItems();
          });
      })
      .catch(function (e) { done(); toast('Update failed: ' + e.message); });
  }

  var ACTION_LABEL = { check_out: 'Checked out', check_in: 'Checked in', condition: 'Condition' };

  function toggleHistory(item, box, btn) {
    if (!box.hidden) { box.hidden = true; return; }
    box.hidden = false;
    box.textContent = 'Loading history...';
    db().from('inventory_events')
      .select('action,detail,created_at,profiles:actor(full_name)')
      .eq('item_id', item.id)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(function (r) {
        box.textContent = '';
        if (r.error) { box.textContent = 'Could not load history.'; return; }
        var rows = r.data || [];
        if (!rows.length) {
          box.textContent = 'No activity yet - this item hasn\'t moved since it was added.';
          return;
        }
        rows.forEach(function (ev) {
          var line = document.createElement('div');
          line.className = 'inv-history-row';
          var who = (ev.profiles && ev.profiles.full_name) || 'Someone';
          var what = ACTION_LABEL[ev.action] || ev.action;
          var strong = document.createElement('strong');
          strong.textContent = who;
          line.appendChild(strong);
          line.appendChild(document.createTextNode(' - ' + what + (ev.detail ? ' (' + ev.detail + ')' : '') + ' - ' + api().ago(ev.created_at)));
          box.appendChild(line);
        });
      });
  }

  /* ─── Boot ───────────────────────────────────────────────── */
  function init() {
    els.grid = document.getElementById('invGrid');
    els.empty = document.getElementById('invEmpty');
    els.search = document.getElementById('invSearch');
    els.filterAge = document.getElementById('invFilterAge');
    els.filterCat = document.getElementById('invFilterCat');
    els.filterStatus = document.getElementById('invFilterStatus');
    els.nameInput = document.getElementById('invName');
    els.catSelect = document.getElementById('invCategory');
    els.condSelect = document.getElementById('invCondition');
    els.ageChips = document.getElementById('invAgeChips');
    els.addBtn = document.getElementById('invAddBtn');
    if (!els.grid || !els.addBtn) return;

    wireAddForm();
    wireFilters();
    fetchItems().catch(function (e) {
      els.empty.hidden = false;
      els.empty.textContent = 'Could not load the inventory: ' + e.message;
    });
  }

  function boot() {
    if (window.pfAuthReady) window.pfAuthReady.then(init);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}());

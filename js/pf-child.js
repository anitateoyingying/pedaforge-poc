/* Child profile hub — aggregates every module's records for one child. */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function init(ctx) {
    if (!ctx.user) return;
    var db = ctx.db;
    var id = new URLSearchParams(window.location.search).get('id');
    if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
      $('chName').textContent = 'No child selected';
      $('chMeta').textContent = 'Open a child from your class strip on the Home page.';
      return;
    }

    db.from('children').select('id,name,profile_tags,notes,classes(name,age_group)').eq('id', id).maybeSingle()
      .then(function (r) {
        var kid = r.data;
        if (!kid) {
          $('chName').textContent = 'Child not found';
          $('chMeta').textContent = 'This child may have been removed, or belongs to another educator.';
          return;
        }
        renderHero(kid);
        loadModules(kid);
      });

    function renderHero(kid) {
      document.title = kid.name + ' - PedaForge';
      $('chFace').textContent = kid.name.split(/\s+/).map(function (w) { return w.charAt(0); }).slice(0, 2).join('').toUpperCase();
      $('chName').textContent = kid.name;
      $('chMeta').textContent = (kid.classes ? kid.classes.name + ' · ' + String(kid.classes.age_group || '').toUpperCase() : '') + (kid.notes ? ' · ' + kid.notes : '');
      var tags = $('chTags');
      (kid.profile_tags || []).forEach(function (t) { tags.appendChild(el('span', null, t)); });
    }

    function loadModules(kid) {
      /* Learning stories */
      db.from('portfolio_observations').select('raw_note,domains,ai_narrative,created_at')
        .eq('child_id', id).order('created_at', { ascending: false }).limit(4)
        .then(function (r) {
          var host = $('chObs');
          host.innerHTML = '';
          var rows = r.data || [];
          if (!rows.length) {
            host.innerHTML = '<span class="ch-empty">No observations yet — <a href="portfolio.html">capture the first moment</a> and let the AI draft the story.</span>';
            return;
          }
          rows.forEach(function (o) {
            var d = el('div', 'ch-row');
            var story = el('div');
            story.textContent = o.ai_narrative || o.raw_note;
            d.appendChild(story);
            d.appendChild(el('span', 'when', window.pfApi.ago(o.created_at) + ((o.domains && o.domains.length) ? ' · ' + o.domains.join(', ') : '')));
            host.appendChild(d);
          });
        });

      /* Reading journey */
      db.from('reading_sessions').select('wcpm,accuracy,mode,created_at')
        .eq('child_id', id).order('created_at', { ascending: true }).limit(10)
        .then(function (r) {
          var rows = r.data || [];
          var spark = $('chSpark'), list = $('chReading');
          spark.innerHTML = ''; list.innerHTML = '';
          if (!rows.length) {
            list.innerHTML = '<span class="ch-empty">No sessions for this child yet — <a href="home-reading-coach.html">pick them in the Reading Coach</a> and press the mic.</span>';
            return;
          }
          var max = Math.max.apply(null, rows.map(function (s) { return s.wcpm || 0; }).concat([1]));
          rows.slice(-8).forEach(function (s) {
            var b = el('div', 'bar');
            b.style.height = Math.max(8, Math.round((s.wcpm || 0) / max * 100)) + '%';
            var i = el('i', null, String(s.wcpm != null ? s.wcpm : ''));
            b.appendChild(i);
            spark.appendChild(b);
          });
          var last = rows[rows.length - 1];
          var d = el('div', 'ch-row');
          d.appendChild(el('span', null, 'Latest: ' + (last.wcpm != null ? last.wcpm + ' WCPM' : 'session') + (last.accuracy != null ? ' · ' + last.accuracy + '% accuracy' : '') + (last.mode === 'simulated' ? ' · simulated' : '')));
          d.appendChild(el('span', 'when', window.pfApi.ago(last.created_at)));
          list.appendChild(d);
        });

      /* Benchmarks */
      db.from('benchmarks').select('term,strands,created_at')
        .eq('child_id', id).order('created_at', { ascending: false }).limit(3)
        .then(function (r) {
          var host = $('chBench');
          host.innerHTML = '';
          var rows = r.data || [];
          if (!rows.length) {
            host.innerHTML = '<span class="ch-empty">No benchmark yet — <a href="home-benchmark.html">run a 5-strand check-in</a>.</span>';
            return;
          }
          var table = el('table', 'band-table');
          var strands = ['print_awareness', 'phonics', 'sight_words', 'decoding', 'comprehension'];
          var labels = ['Print', 'Phonics', 'Sight', 'Decode', 'Compre.'];
          var thead = el('tr');
          thead.appendChild(el('th', null, 'Term'));
          labels.forEach(function (l) { thead.appendChild(el('th', null, l)); });
          table.appendChild(thead);
          rows.forEach(function (b) {
            var tr = el('tr');
            tr.appendChild(el('td', null, b.term || ''));
            strands.forEach(function (s) {
              var band = (b.strands || {})[s] || '—';
              var td = el('td');
              var pill = el('span', 'band-pill band-' + band, band === '—' ? '—' : band.charAt(0).toUpperCase() + band.slice(1, 3));
              pill.title = band;
              td.appendChild(pill);
              tr.appendChild(td);
            });
            table.appendChild(tr);
          });
          host.appendChild(table);
        });

      /* Word jar */
      db.from('dictionary_progress').select('word,status')
        .eq('child_id', id).order('updated_at', { ascending: false }).limit(18)
        .then(function (r) {
          var host = $('chWords');
          host.innerHTML = '';
          var rows = (r.data || []).filter(function (w) { return w.status !== 'new'; });
          if (!rows.length) {
            host.innerHTML = '<span class="ch-empty">No words practised yet — <a href="home-dictionary.html">open the Talking Dictionary</a> with this child picked.</span>';
            return;
          }
          rows.forEach(function (w) { host.appendChild(el('span', w.status, w.word)); });
        });

      /* Artwork */
      db.from('artworks').select('image_path,feeling,created_at')
        .eq('child_id', id).order('created_at', { ascending: false }).limit(6)
        .then(function (r) {
          var rows = r.data || [];
          var strip = $('chArt'), empty = $('chArtEmpty');
          if (!rows.length) {
            empty.innerHTML = '<span class="ch-empty">No drawings saved — <a href="home-draw-reflect.html">open Draw &amp; Reflect</a> with this child picked.</span>';
            return;
          }
          rows.forEach(function (a) {
            window.pfApi.artefactUrl(a.image_path).then(function (url) {
              if (!url) return;
              var img = document.createElement('img');
              img.src = url;
              img.alt = 'Drawing' + (a.feeling ? ' — feeling ' + a.feeling : '');
              img.loading = 'lazy';
              strip.appendChild(img);
            });
          });
        });

      /* Work samples */
      db.from('work_samples').select('context,ai_analysis,created_at')
        .eq('child_id', id).order('created_at', { ascending: false }).limit(3)
        .then(function (r) {
          var host = $('chSamples');
          host.innerHTML = '';
          var rows = r.data || [];
          if (!rows.length) {
            host.innerHTML = '<span class="ch-empty">No work samples yet — <a href="work-sample.html">upload one</a> for AI milestone analysis.</span>';
            return;
          }
          rows.forEach(function (s) {
            var d = el('div', 'ch-row');
            var txt = el('div');
            var analysis = s.ai_analysis || {};
            txt.textContent = analysis.narrative || s.context || 'Work sample';
            d.appendChild(txt);
            var mi = (analysis.milestones || []).slice(0, 2).join(' · ');
            d.appendChild(el('span', 'when', window.pfApi.ago(s.created_at) + (mi ? ' · ' + mi : '')));
            host.appendChild(d);
          });
        });
    }
  }

  function boot() {
    if (window.pfAuthReady) window.pfAuthReady.then(init);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

/* pfMd — tiny, escape-first markdown renderer for AI output.
   Supports: **bold**, *italic*, `code`, # headings (rendered as h4/h5),
   - / * / 1. lists, paragraphs. Everything is HTML-escaped BEFORE any
   markup is applied, so AI/user text can never inject HTML. */
(function () {
  'use strict';

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function inline(escaped) {
    return escaped
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>');
  }

  function render(text) {
    var lines = escapeHtml(text).split(/\r?\n/);
    var html = [], para = [], list = null; // list: {type:'ul'|'ol', items:[]}

    function flushPara() {
      if (para.length) { html.push('<p>' + inline(para.join('<br>')) + '</p>'); para = []; }
    }
    function flushList() {
      if (list) {
        html.push('<' + list.type + '>' + list.items.map(function (i) { return '<li>' + inline(i) + '</li>'; }).join('') + '</' + list.type + '>');
        list = null;
      }
    }

    lines.forEach(function (raw) {
      var line = raw.trim();
      if (!line) { flushPara(); flushList(); return; }

      var h = line.match(/^(#{1,4})\s+(.*)$/);
      if (h) { flushPara(); flushList(); html.push('<h' + Math.min(h[1].length + 3, 5) + '>' + inline(h[2]) + '</h' + Math.min(h[1].length + 3, 5) + '>'); return; }

      var ul = line.match(/^[-*•]\s+(.*)$/);
      if (ul) {
        flushPara();
        if (!list || list.type !== 'ul') { flushList(); list = { type: 'ul', items: [] }; }
        list.items.push(ul[1]);
        return;
      }
      var ol = line.match(/^\d+[.)]\s+(.*)$/);
      if (ol) {
        flushPara();
        if (!list || list.type !== 'ol') { flushList(); list = { type: 'ol', items: [] }; }
        list.items.push(ol[1]);
        return;
      }

      flushList();
      para.push(line);
    });
    flushPara(); flushList();
    return html.join('');
  }

  /* renderInto(el, text) — safe render + adds .pf-md styling class */
  window.pfMd = {
    render: render,
    renderInto: function (el, text) {
      el.classList.add('pf-md');
      el.innerHTML = render(text);
    }
  };
})();

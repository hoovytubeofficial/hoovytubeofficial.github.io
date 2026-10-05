/* /workshop/ page enhancements. Everything works without this file: the catalogue is static HTML
   and /shared/ht-ui.js does the chip filtering (aria-pressed buttons, live status line, counts).
   This file only:
     1. keeps the "items listed" numbers in sync with the cards actually on the page,
     2. adds shareable deep links (/workshop/?type=particles|models|tools|animations),
     3. lets Left/Right/Home/End move focus between the filter chips. */
(function () {
  'use strict';
  var doc = document;
  var GROUP = 'ws';
  var bar = doc.querySelector('[data-filter-group="' + GROUP + '"]');
  var target = doc.querySelector('[data-filter-target="' + GROUP + '"]');
  if (!bar || !target) return;
  var chips = Array.prototype.slice.call(bar.querySelectorAll('[data-filter]'));
  var items = Array.prototype.slice.call(target.querySelectorAll('[data-tags]'));

  /* 1. Counts: computed from the cards, so the hero and headings never drift from the list */
  function count(tag) {
    if (tag === 'all') return items.length;
    return items.filter(function (it) { return (' ' + (it.getAttribute('data-tags') || '') + ' ').indexOf(' ' + tag + ' ') !== -1; }).length;
  }
  Array.prototype.forEach.call(doc.querySelectorAll('[data-ws-count]'), function (el) {
    var n = String(count(el.getAttribute('data-ws-count')));
    // A running count-up (ht-ui.js) keeps the real value in _htCount.final while it animates from 0.
    var shown = (el._htCount && el._htCount.final != null) ? String(el._htCount.final) : el.textContent;
    if (shown.trim() === n) return;
    // The shared count-up has already read the old value; swap in a plain copy with the right number.
    var fresh = el.cloneNode(false);
    fresh.removeAttribute('data-count');
    fresh.textContent = n;
    el.parentNode.replaceChild(fresh, el);
  });

  /* 2. Deep links: ?type=<filter> preselects a chip; clicking a chip updates the address */
  var keys = chips.map(function (c) { return (c.getAttribute('data-filter') || '').toLowerCase(); });
  function press(key) {
    chips.forEach(function (c) { c.setAttribute('aria-pressed', (c.getAttribute('data-filter') || '').toLowerCase() === key ? 'true' : 'false'); });
    if (window.HTUI && typeof window.HTUI.filter === 'function') window.HTUI.filter(GROUP);
  }
  function syncUrl(key) {
    if (!window.history || !history.replaceState || !window.URLSearchParams) return;
    var params = new URLSearchParams(location.search);
    if (key && key !== 'all') params.set('type', key); else params.delete('type');
    var q = params.toString();
    try { history.replaceState(history.state, '', location.pathname + (q ? '?' + q : '') + location.hash); } catch (e) { /* file:// or sandboxed */ }
  }
  if (window.URLSearchParams) {
    var wanted = (new URLSearchParams(location.search).get('type') || '').toLowerCase();
    if (wanted && wanted !== 'all' && keys.indexOf(wanted) !== -1) press(wanted);
  }
  bar.addEventListener('click', function (e) {
    var chip = e.target.closest && e.target.closest('[data-filter]');
    if (chip) syncUrl((chip.getAttribute('data-filter') || 'all').toLowerCase());
  });

  /* 3. Arrow keys between chips (Tab, Enter and Space already work: they are buttons) */
  bar.addEventListener('keydown', function (e) {
    var i = chips.indexOf(doc.activeElement);
    if (i === -1) return;
    var next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = chips[(i + 1) % chips.length];
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = chips[(i - 1 + chips.length) % chips.length];
    else if (e.key === 'Home') next = chips[0];
    else if (e.key === 'End') next = chips[chips.length - 1];
    if (!next) return;
    e.preventDefault();
    next.focus();
  });
})();

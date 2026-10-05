/* /products/ (Patreon membership page): page-only behaviour.
   Progressive enhancement for the particle pack catalogue: with JS, the "All" view starts with the first
   few packs and a "Show all" button; any filter chip (or the button) shows the full list again.
   Without JS every pack is visible. Filtering itself is ht-ui.js (data-filter-*). */
(function () {
  'use strict';
  var doc = document;
  var grid = doc.querySelector('[data-filter-target="packs"]');
  var more = doc.getElementById('packsMore');
  if (!grid || !more) return;

  var btn = more.querySelector('button');
  var note = more.querySelector('[data-more-note]');
  var status = doc.querySelector('[data-filter-status="packs"]');
  var items = [].slice.call(grid.querySelectorAll('.item-card'));
  // Show whole rows only: 3 rows on a 3-column grid, 4 rows on 2 columns, 6 cards on phones.
  var cols = (getComputedStyle(grid).gridTemplateColumns || '').split(' ').filter(Boolean).length || 1;
  var limit = cols >= 3 ? 9 : cols === 2 ? 8 : 6;
  if (items.length <= limit) return;

  function visibleCount() {
    return items.filter(function (it) { return !it.hidden && it.offsetParent !== null; }).length;
  }
  function collapse() {
    grid.classList.add('pt-collapsed');
    items.forEach(function (it, i) { it.classList.toggle('pt-over', i >= limit); });
    var rest = items.length - limit;
    if (note) note.textContent = rest + ' more particle pack' + (rest === 1 ? '' : 's') + ' in the catalogue.';
    if (btn) btn.textContent = 'Show all ' + items.length + ' particle packs';
    more.hidden = false;
    if (status) status.textContent = 'Showing ' + visibleCount() + ' of ' + items.length;
  }
  function expand(focusFirstNew) {
    if (!grid.classList.contains('pt-collapsed')) return;
    grid.classList.remove('pt-collapsed');
    more.hidden = true;
    if (status && window.HTUI && window.HTUI.filter) window.HTUI.filter('packs');
    if (focusFirstNew) {
      var first = items[limit] && items[limit].querySelector('a, button');
      if (first) first.focus({ preventScroll: false });
    }
  }

  collapse();
  if (btn) btn.addEventListener('click', function () { expand(true); });
  // Any filter chip shows the full (filtered) list; runs after ht-ui.js has applied the filter.
  doc.addEventListener('click', function (e) {
    var chip = e.target.closest && e.target.closest('[data-filter-group="packs"] [data-filter]');
    if (chip) expand(false);
  });
})();

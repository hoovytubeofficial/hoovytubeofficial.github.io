/* HoovyTube shared nav - injects the magnetic dock on every page + theme toggle.
   Include on any page with:  <script defer src="/shared/ht-nav.js"></script>
   (Set data-theme early in <head> to avoid a flash.) */
(function () {
  var ICON = {
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><polyline points="3.3 7 12 12 20.7 7"/><line x1="12" y1="22" x2="12" y2="12"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    cap: '<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c3 2.5 9 2.5 12 0v-5"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    theme: '<path d="M12 8a2.83 2.83 0 0 0 4 4 4 4 0 1 1-4-4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/>'
  };
  var ITEMS = [
    { label: 'Home', href: '/', ic: 'home', match: ['/', '/index.html'] },
    { label: 'Assets & Products', href: '/products/', ic: 'product', match: ['/products/', '/products/index.html'] },
    { label: 'HoovyTools', href: '/hoovytools/', ic: 'tools', match: ['/hoovytools/', '/hoovytools/index.html'] },
    { label: 'Learn SFM & Blender', href: '/learn/', ic: 'learn', match: ['/learn/', '/learn/index.html'] },
    { label: 'Contact', href: '/contact/', ic: 'contact', match: ['/contact/', '/contact/index.html'] }
  ];
  var svg = function (p) { return '<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>'; };
  var ic = function (n) { return '<img class="dock-ic" src="/assets/icons/' + n + '.png" alt="" draggable="false">'; };
  var path = location.pathname.replace(/\/index\.html$/, '/');

  var html = '<nav class="dock" aria-label="Primary">';
  ITEMS.forEach(function (it) {
    var active = it.match.indexOf(path) !== -1 ? ' active' : '';
    html += '<a class="dock-item' + active + '" href="' + it.href + '"><span class="dock-label">' + it.label + '</span>' + ic(it.ic) + '</a>';
  });
  html += '<button class="dock-item" id="htSearch" type="button" aria-label="Search"><span class="dock-label">Search</span>' + ic('search') + '</button>';
  html += '<button class="dock-item" id="htThemeToggle" type="button" aria-label="Toggle theme"><span class="dock-label">Theme</span>' + ic('theme') + '</button>';
  html += '</nav>';

  var wrap = document.createElement('div');
  wrap.className = 'dock-wrap';
  wrap.innerHTML = html;
  document.body.appendChild(wrap);

  // Scroll progress bar (top)
  var sp = document.createElement('div');
  sp.className = 'scroll-progress';
  sp.innerHTML = '<div class="scroll-progress-fill"></div>';
  document.body.appendChild(sp);
  var fill = sp.firstChild;
  var onScroll = function () {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    fill.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  // Ghost dock: transparent while over a full-bleed hero, solid once scrolled past it
  var heroEl = document.querySelector('.hero-carousel');
  if (heroEl) {
    var ghostUpdate = function () {
      var limit = heroEl.offsetHeight - 90;
      wrap.classList.toggle('ghost', window.scrollY < limit);
    };
    window.addEventListener('scroll', ghostUpdate, { passive: true });
    window.addEventListener('resize', ghostUpdate);
    ghostUpdate();
  }

  // Scroll-in reveal for page sections
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduced && typeof IntersectionObserver !== 'undefined') {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('main > section').forEach(function (el) { el.classList.add('reveal'); io.observe(el); });
  }

  // Theme toggle (persisted)
  var root = document.documentElement;
  document.getElementById('htThemeToggle').addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('ht-theme', next); } catch (e) {}
  });

  // ---- Search (⌘K / "/" / dock button) ----
  (function () {
    var SEARCH = [
      { t: 'Home', d: 'HoovyTube - animations, assets, tutorials', href: '/', k: 'home hoovytube start main' },
      { t: 'Assets & Products', d: 'SFM particles, scenebuilds & animations', href: '/products/', k: 'assets products particles scenebuilds animations patreon steam workshop library packs tiers membership sfm' },
      { t: 'HoovyTools', d: 'Blender add-on - import SFM sessions into Blender', href: '/hoovytools/', k: 'hoovytools blender addon add-on sfm importer session dmx download audio tool' },
      { t: 'Learn SFM & Blender', d: 'Tutorials, sorted by difficulty', href: '/learn/', k: 'learn tutorials sfm blender easy medium hard playlist guide howto beginner advanced' },
      { t: 'Contact', d: 'Get in touch', href: '/contact/', k: 'contact email message support hello' },
      { t: 'Newsletter', d: 'Subscribe for updates', href: '/#newsletter', k: 'newsletter subscribe email updates signup' },
      { t: 'Download HoovyTools', d: 'Grab the latest .zip', href: '/hoovytools/', k: 'download zip install hoovytools blender addon' },
      { t: 'Patreon', d: 'Full asset library membership', href: 'https://www.patreon.com/c/hoovytube308/membership', k: 'patreon membership subscribe support full library packs', ext: true },
      { t: 'YouTube', d: 'Watch on YouTube', href: 'https://youtube.com/@HoovyTube', k: 'youtube videos watch channel subscribe', ext: true }
    ];
    var ov = document.createElement('div');
    ov.className = 'search-overlay';
    ov.innerHTML = '<div class="search-box" role="dialog" aria-label="Search HoovyTube">' +
      '<div class="search-inputwrap">' + svg(ICON.search) +
      '<input class="search-input" type="text" placeholder="Search HoovyTube…" aria-label="Search" autocomplete="off"></div>' +
      '<div class="search-results"></div></div>';
    document.body.appendChild(ov);
    var input = ov.querySelector('.search-input');
    var results = ov.querySelector('.search-results');
    var sel = 0;

    function render(q) {
      q = (q || '').trim().toLowerCase();
      var list = SEARCH.filter(function (e) {
        return !q || (e.t + ' ' + e.d + ' ' + e.k).toLowerCase().indexOf(q) !== -1;
      }).slice(0, 8);
      sel = 0;
      if (!list.length) { results.innerHTML = '<div class="search-empty">No results</div>'; return; }
      results.innerHTML = list.map(function (e, i) {
        return '<a class="search-result' + (i === 0 ? ' sel' : '') + '" href="' + e.href + '"' +
          (e.ext ? ' target="_blank" rel="noopener"' : '') + '><span class="st">' + e.t + '</span><span class="sd">' + e.d + '</span></a>';
      }).join('');
    }
    function open() { ov.classList.add('open'); input.value = ''; render(''); setTimeout(function () { input.focus(); }, 30); }
    function close() { ov.classList.remove('open'); }
    function move(d) {
      var els = results.querySelectorAll('.search-result'); if (!els.length) return;
      if (els[sel]) els[sel].classList.remove('sel');
      sel = (sel + d + els.length) % els.length;
      els[sel].classList.add('sel'); els[sel].scrollIntoView({ block: 'nearest' });
    }
    input.addEventListener('input', function () { render(input.value); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') { var els = results.querySelectorAll('.search-result'); if (els[sel]) els[sel].click(); }
      else if (e.key === 'Escape') { close(); }
    });
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    var sbtn = document.getElementById('htSearch');
    if (sbtn) sbtn.addEventListener('click', open);
    document.addEventListener('keydown', function (e) {
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      if (((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) ||
          (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA')) { e.preventDefault(); open(); }
    });
  })();

  // Magnetic magnify (pointer:fine only)
  if (window.matchMedia && window.matchMedia('(pointer: fine)').matches) {
    var dock = wrap.querySelector('.dock');
    var items = [].slice.call(dock.querySelectorAll('.dock-item'));
    var BASE = 48, MAX = 82, RANGE = 150, mouseX = Infinity;
    var cur = items.map(function () { return BASE; });
    dock.addEventListener('pointermove', function (e) { mouseX = e.clientX; });
    dock.addEventListener('pointerleave', function () { mouseX = Infinity; });
    (function tick() {
      for (var i = 0; i < items.length; i++) {
        var r = items[i].getBoundingClientRect(), c = r.left + r.width / 2, d = Math.abs(mouseX - c), target = BASE;
        if (d < RANGE) { var t = 1 - d / RANGE; target = BASE + (MAX - BASE) * t * t; }
        cur[i] += (target - cur[i]) * 0.2;
        if (Math.abs(cur[i] - target) < 0.1) cur[i] = target;
        items[i].style.width = items[i].style.height = cur[i] + 'px';
      }
      requestAnimationFrame(tick);
    })();
  }
})();

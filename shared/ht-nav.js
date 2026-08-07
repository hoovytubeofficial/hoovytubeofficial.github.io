/* HoovyTube shared nav — injects the magnetic dock on every page + theme toggle.
   Include on any page with:  <script defer src="/shared/ht-nav.js"></script>
   (Set data-theme early in <head> to avoid a flash.) */
(function () {
  var ICON = {
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><polyline points="3.3 7 12 12 20.7 7"/><line x1="12" y1="22" x2="12" y2="12"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    cap: '<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c3 2.5 9 2.5 12 0v-5"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    theme: '<path d="M12 8a2.83 2.83 0 0 0 4 4 4 4 0 1 1-4-4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/>'
  };
  var ITEMS = [
    { label: 'Home', href: '/', icon: ICON.home, match: ['/', '/index.html'] },
    { label: 'Assets & Products', href: '/products/', icon: ICON.box, match: ['/products/', '/products/index.html'] },
    { label: 'HoovyTools', href: '/hoovytools/', icon: ICON.wrench, match: ['/hoovytools/', '/hoovytools/index.html'] },
    { label: 'Learn SFM & Blender', href: '/learn/', icon: ICON.cap, match: ['/learn/', '/learn/index.html'] },
    { label: 'Contact', href: '/contact/', icon: ICON.mail, match: ['/contact/', '/contact/index.html'] }
  ];
  var svg = function (p) { return '<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>'; };
  var path = location.pathname.replace(/\/index\.html$/, '/');

  var html = '<nav class="dock" aria-label="Primary">';
  ITEMS.forEach(function (it) {
    var active = it.match.indexOf(path) !== -1 ? ' active' : '';
    html += '<a class="dock-item' + active + '" href="' + it.href + '"><span class="dock-label">' + it.label + '</span>' + svg(it.icon) + '</a>';
  });
  html += '<button class="dock-item" id="htThemeToggle" type="button" aria-label="Toggle theme"><span class="dock-label">Theme</span>' + svg(ICON.theme) + '</button>';
  html += '</nav>';

  var wrap = document.createElement('div');
  wrap.className = 'dock-wrap';
  wrap.innerHTML = html;
  document.body.appendChild(wrap);

  // Theme toggle (persisted)
  var root = document.documentElement;
  document.getElementById('htThemeToggle').addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('ht-theme', next); } catch (e) {}
  });

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

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
  // Placeholder icon for the Journal tab — reuses the site's existing arrow art.
  // TODO: swap for a dedicated /assets/icons/journal.png when one's drawn.
  var JOURNAL_IC = '/media/hoovytools/arrow.png';
  var ITEMS = [
    { label: 'Home', href: '/', ic: 'home', match: ['/', '/index.html'] },
    { label: 'HoovyTools SFM', href: '/products/', ic: 'product', match: ['/products/', '/products/index.html'] },
    { label: 'HoovyTools Blender', href: '/hoovytools/', ic: 'tools', match: ['/hoovytools/', '/hoovytools/index.html'] },
    { label: 'Learn SFM & Blender', href: '/learn/', ic: 'learn', match: ['/learn/', '/learn/index.html'] },
    { label: 'Journal', href: '/blog/', ic: JOURNAL_IC, match: ['/blog/', '/blog/index.html'] },
    { label: 'Contact', href: '/contact/', ic: 'contact', match: ['/contact/', '/contact/index.html'] }
  ];
  var svg = function (p) { return '<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>'; };
  // Accepts a bare icon name (→ /assets/icons/NAME.png) or a full URL / absolute path.
  var ic = function (n) { var src = /[:\/]/.test(n) ? n : '/assets/icons/' + n + '.png'; return '<img class="dock-ic" src="' + src + '" alt="" draggable="false">'; };
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
      { t: 'HoovyTools SFM', d: 'SFM particles, scenebuilds & animations', href: '/products/', k: 'assets products particles scenebuilds animations patreon steam workshop library packs tiers membership sfm hoovytools' },
      { t: 'HoovyTools Blender', d: 'Blender addon: import SFM sessions into Blender', href: '/hoovytools/', k: 'hoovytools blender addon sfm to blender importer session dmx download audio tool transposition' },
      { t: 'Learn SFM & Blender', d: 'Tutorials, sorted by difficulty', href: '/learn/', k: 'learn tutorials sfm blender easy medium hard playlist guide howto beginner advanced' },
      { t: 'Journal', d: 'Essays & notes from behind the tools', href: '/blog/', k: 'journal blog writing essays posts notes manifesto shoulders of giants read articles' },
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

/* ---- Footer social bar (PNG icons + magnetic grow) + Send-message popup ---- */
(function () {
  var SUPA = 'https://iglbfojatowaxbhjubvz.supabase.co';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnbGJmb2phdG93YXhiaGp1YnZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMzgyODUsImV4cCI6MjEwMTYxNDI4NX0.H7EeaGn3qQGn6pwFnDI_QRFW3uILnwDaWB54pUbWv6g';

  // --- Send-message popup (also used as the email icon's action) ---
  var modal = document.createElement('div');
  modal.className = 'msg-modal';
  modal.innerHTML =
    '<div class="mm-box" role="dialog" aria-modal="true" aria-label="Send a message">' +
      '<button class="mm-x" type="button" aria-label="Close">×</button>' +
      '<h3>Send a message</h3>' +
      '<p class="mm-sub">Questions, collabs, or just say hi — I read every message.</p>' +
      '<form class="mm-form" novalidate>' +
        '<div class="mm-row">' +
          '<div><label>Name</label><input name="name" type="text" autocomplete="name" required></div>' +
          '<div><label>Email</label><input name="email" type="email" autocomplete="email" required></div>' +
        '</div>' +
        '<label>Message</label>' +
        '<textarea name="message" required></textarea>' +
        '<div class="mm-actions">' +
          '<button type="button" class="mm-cancel">Cancel</button>' +
          '<button type="submit" class="mm-send">Send</button>' +
        '</div>' +
        '<div class="mm-msg" role="status" aria-live="polite"></div>' +
      '</form>' +
    '</div>';
  document.body.appendChild(modal);

  var mmForm = modal.querySelector('.mm-form');
  var mmMsg = modal.querySelector('.mm-msg');
  var mmSend = modal.querySelector('.mm-send');
  var lastFocus = null;
  function openModal(e) { if (e) e.preventDefault(); lastFocus = document.activeElement; modal.classList.add('open'); setTimeout(function () { var f = mmForm.querySelector('input[name=name]'); if (f) f.focus(); }, 30); }
  function closeModal() { modal.classList.remove('open'); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  modal.querySelector('.mm-x').addEventListener('click', closeModal);
  modal.querySelector('.mm-cancel').addEventListener('click', closeModal);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.classList.contains('open')) closeModal(); });

  mmForm.addEventListener('submit', function (e) {
    e.preventDefault();
    mmMsg.textContent = ''; mmMsg.className = 'mm-msg';
    var name = mmForm.name.value.trim(), email = mmForm.email.value.trim(), message = mmForm.message.value.trim();
    if (!name || !email || !message) { mmMsg.textContent = 'Please fill in your name, email, and message.'; mmMsg.className = 'mm-msg err'; return; }
    mmSend.disabled = true; mmSend.textContent = 'Sending…';
    fetch(SUPA + '/functions/v1/contact-form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': ANON, 'Authorization': 'Bearer ' + ANON },
      body: JSON.stringify({ name: name, email: email, subject: 'Message from site popup', message: message })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; });
    }).then(function (res) {
      if (res.ok) { mmMsg.textContent = 'Thanks — your message was sent!'; mmMsg.className = 'mm-msg ok'; mmForm.reset(); setTimeout(closeModal, 1400); }
      else { mmMsg.textContent = (res.d && res.d.error) || 'Something went wrong. Please try again.'; mmMsg.className = 'mm-msg err'; }
    }).catch(function () {
      mmMsg.textContent = 'Network error. Please try again.'; mmMsg.className = 'mm-msg err';
    }).then(function () { mmSend.disabled = false; mmSend.textContent = 'Send'; });
  });

  // --- Footer: social bar + sitemap, built on every page that has <footer class="site"> ---
  // Icons are inline SVG (they used to point at /assets/icons/social/*.png, which don't
  // exist in the repo - that's why the footer rendered five broken images).
  var SOC_SVG = {
    youtube: '<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>',
    patreon: '<circle cx="15.2" cy="9.6" r="7.8"/><rect x="1" y="1.8" width="5.2" height="20.4"/>',
    steam: '<path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.522 2.031 4.522 4.527s-2.028 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z"/>',
    discord: '<path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>'
  };
  var MAIL_SVG = '<rect x="2" y="4" width="20" height="16"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>';

  var foot = document.querySelector('footer.site');
  if (!foot) return;

  // Pages other than the homepage ship a bare footer - give them the bar too.
  var social = foot.querySelector('.social');
  if (!social) {
    social = document.createElement('div');
    social.className = 'social';
    foot.insertBefore(social, foot.firstChild);
  }

  var LINKS = [
    { n: 'youtube', label: 'YouTube', href: 'https://www.youtube.com/@HoovyTube' },
    { n: 'patreon', label: 'Patreon', href: 'https://www.patreon.com/c/hoovytube308/membership' },
    { n: 'steam', label: 'Steam Workshop', href: 'https://steamcommunity.com/id/HoovyTube/myworkshopfiles/' },
    { n: 'discord', label: 'Discord', href: 'https://discord.gg/VhUCwuuE84' },
    { n: 'email', label: 'Send a message', href: '/contact/', msg: true }
  ];
  social.innerHTML = LINKS.map(function (l) {
    var g = l.msg
      ? '<svg class="soc-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + MAIL_SVG + '</svg>'
      : '<svg class="soc-ic" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + SOC_SVG[l.n] + '</svg>';
    var inner = '<span class="soc-chip">' + g + '</span><span class="soc-label">' + l.label + '</span>';
    return l.msg
      ? '<a class="soc soc-msg" href="' + l.href + '" aria-label="' + l.label + '">' + inner + '</a>'
      : '<a class="soc" href="' + l.href + '" target="_blank" rel="noopener" aria-label="' + l.label + '">' + inner + '</a>';
  }).join('');

  // Sitemap row above the copyright line (once per page)
  if (!foot.querySelector('.foot-nav')) {
    var NAVL = [
      { t: 'Home', h: '/' }, { t: 'SFM Assets', h: '/products/' }, { t: 'HoovyTools', h: '/hoovytools/' },
      { t: 'Tutorials', h: '/learn/' }, { t: 'Journal', h: '/blog/' }, { t: 'Contact', h: '/contact/' }
    ];
    var fn = document.createElement('nav');
    fn.className = 'foot-nav';
    fn.setAttribute('aria-label', 'Footer');
    fn.innerHTML = NAVL.map(function (l) { return '<a href="' + l.h + '">' + l.t + '</a>'; }).join('');
    var small = foot.querySelector('small');
    if (small) foot.insertBefore(fn, small); else foot.appendChild(fn);
  }

  var msgLink = social.querySelector('.soc-msg');
  if (msgLink) msgLink.addEventListener('click', openModal);

  // Magnetic magnify (pointer:fine only) - same feel as the dock
  if (window.matchMedia && window.matchMedia('(pointer: fine)').matches) {
    var items = [].slice.call(social.querySelectorAll('.soc-chip'));
    var RANGE = 120, MAXS = 1.55, mouseX = Infinity, cur = items.map(function () { return 1; });
    social.addEventListener('pointermove', function (e) { mouseX = e.clientX; });
    social.addEventListener('pointerleave', function () { mouseX = Infinity; });
    (function tick() {
      for (var i = 0; i < items.length; i++) {
        var r = items[i].getBoundingClientRect(), c = r.left + r.width / 2, d = Math.abs(mouseX - c), t = 1;
        if (d < RANGE) { var k = 1 - d / RANGE; t = 1 + (MAXS - 1) * k * k; }
        cur[i] += (t - cur[i]) * 0.2; if (Math.abs(cur[i] - t) < 0.001) cur[i] = t;
        items[i].style.transform = 'scale(' + cur[i] + ')';
      }
      requestAnimationFrame(tick);
    })();
  }
})();

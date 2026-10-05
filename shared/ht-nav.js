/* HoovyTube shared chrome (design system v2) - load on every page:
     <script defer src="/shared/ht-nav.js?v=20"></script>
   Injects, with no page markup needed:
     - skip link + the fixed dock (Home, Patreon, Workshop, HoovyTools, Learn, Journal, Contact | Search, Theme)
     - theme handling (stored choice in localStorage 'ht-theme', else follows the OS)
     - thin scroll-progress bar, search palette (Ctrl/Cmd+K, "/", or any [data-search-open]), send-a-message modal
     - the sitewide Patreon CTA band right before <footer class="site"> (opt out: <body data-no-cta>)
     - the footer contents inside <footer class="site"></footer>
   Docs: /docs/DESIGN-SYSTEM.md */
(function () {
  'use strict';

  var URL_JOIN = 'https://www.patreon.com/c/hoovytube308/membership';
  var URL_SHOP = 'https://www.patreon.com/HoovyTube308/shop';
  var URL_PATREON = 'https://www.patreon.com/HoovyTube308';
  var URL_WORKSHOP = 'https://steamcommunity.com/id/HoovyTube/myworkshopfiles/';
  var URL_YOUTUBE = 'https://www.youtube.com/@HoovyTube';
  var URL_DISCORD = 'https://discord.gg/VhUCwuuE84';
  var EXT = ' target="_blank" rel="noopener"';

  var doc = document, root = doc.documentElement, body = doc.body;
  var path = location.pathname.replace(/index\.html$/, '');
  if (path.charAt(path.length - 1) !== '/' && !/\.[a-z0-9]+$/i.test(path)) path += '/';

  /* ------------------------------------------------------------ theme */
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function storedTheme() {
    try { var t = localStorage.getItem('ht-theme'); return (t === 'light' || t === 'dark') ? t : null; } catch (e) { return null; }
  }
  function osTheme() { return mq && mq.matches ? 'dark' : 'light'; }
  function currentTheme() { return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
  root.setAttribute('data-theme', storedTheme() || osTheme());
  if (mq) {
    var onOs = function () { if (!storedTheme()) { root.setAttribute('data-theme', osTheme()); syncThemeBtn(); } };
    if (mq.addEventListener) mq.addEventListener('change', onOs); else if (mq.addListener) mq.addListener(onOs);
  }

  /* ------------------------------------------------------------- dock */
  var ITEMS = [
    { label: 'Home', href: '/', icon: '/assets/icons/home.png', match: function (p) { return p === '/'; } },
    { label: 'Patreon', href: '/products/', icon: '/assets/icons/forged/patreon.png', cls: 'dock-patreon', text: true,
      match: function (p) { return p.indexOf('/products/') === 0 || p.indexOf('/patreon/') === 0; } },
    { label: 'Workshop', href: '/workshop/', icon: '/assets/icons/forged/steam.png', match: function (p) { return p.indexOf('/workshop/') === 0; } },
    { label: 'HoovyTools', href: '/hoovytools/', icon: '/assets/icons/tools.png', match: function (p) { return p.indexOf('/hoovytools/') === 0; } },
    { label: 'Learn', href: '/learn/', icon: '/assets/icons/learn.png', match: function (p) { return p.indexOf('/learn/') === 0; } },
    { label: 'Journal', href: '/blog/', icon: '/assets/icons/newsletter.png', more: true, match: function (p) { return p.indexOf('/blog/') === 0; } },
    { label: 'Contact', href: '/contact/', icon: '/assets/icons/contact.png', more: true, match: function (p) { return p.indexOf('/contact/') === 0; } }
  ];
  function img(src, cls) { return '<img class="' + (cls || 'dock-ic') + '" src="' + src + '" alt="" width="38" height="38" draggable="false">'; }

  var main = doc.querySelector('main');
  if (main && !main.id) main.id = 'main';
  var skip = doc.querySelector('.skip-link');
  if (!skip && main) {
    skip = doc.createElement('a');
    skip.className = 'skip-link';
    skip.href = '#' + main.id;
    skip.textContent = 'Skip to content';
    body.insertBefore(skip, body.firstChild);
  }

  /* Phones (<= 520px): Journal, Contact, Search and Theme move into the "More" menu (CSS hides the
     .dock-sm-hide controls and shows .dock-more), so every dock control keeps a 44px tap target. */
  var html = '<nav class="dock" aria-label="Primary">', menuHtml = '', moreCurrent = false;
  ITEMS.forEach(function (it) {
    var on = it.match(path);
    html += '<a class="dock-item' + (it.cls ? ' ' + it.cls : '') + (it.more ? ' dock-sm-hide' : '') + (on ? ' active' : '') + '" href="' + it.href + '"' +
      (on ? ' aria-current="page"' : '') + ' aria-label="' + it.label + '">' + img(it.icon) +
      (it.text ? '<span class="dock-text" aria-hidden="true">' + it.label + '</span>' : '') +
      '<span class="dock-label" aria-hidden="true">' + it.label + '</span></a>';
    if (it.more) {
      if (on) moreCurrent = true;
      menuHtml += '<a class="dock-menu-item" href="' + it.href + '"' + (on ? ' aria-current="page"' : '') + '>' + img(it.icon, 'dock-menu-ic') + it.label + '</a>';
    }
  });
  html += '<span class="dock-sep dock-sm-hide" aria-hidden="true"></span>';
  html += '<button class="dock-item dock-sm-hide" id="htSearch" type="button" aria-label="Search" aria-haspopup="dialog">' + img('/assets/icons/search.png') + '<span class="dock-label" aria-hidden="true">Search</span></button>';
  html += '<button class="dock-item dock-sm-hide" id="htThemeToggle" type="button" aria-label="Switch theme">' + img('/assets/icons/theme.png') + '<span class="dock-label" aria-hidden="true">Theme</span></button>';
  html += '<button class="dock-item dock-more' + (moreCurrent ? ' has-current' : '') + '" id="htMore" type="button" aria-label="More: Journal, Contact, Search, Theme" aria-expanded="false" aria-controls="htMoreMenu">' + img('/assets/icons/forged/menu.png') + '</button>';
  html += '</nav>';
  menuHtml += '<button class="dock-menu-item" type="button" data-more-search>' + img('/assets/icons/search.png', 'dock-menu-ic') + 'Search</button>';
  menuHtml += '<button class="dock-menu-item" type="button" data-more-theme>' + img('/assets/icons/theme.png', 'dock-menu-ic') + '<span>Theme</span></button>';
  html += '<div class="dock-menu" id="htMoreMenu" hidden>' + menuHtml + '</div>';

  var wrap = doc.createElement('header');
  wrap.className = 'dock-wrap';
  wrap.innerHTML = html;
  body.insertBefore(wrap, skip ? skip.nextSibling : body.firstChild);

  var themeBtn = doc.getElementById('htThemeToggle');
  var menuThemeBtn = wrap.querySelector('[data-more-theme]');
  function syncThemeBtn() {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    var word = next === 'dark' ? 'Dark theme' : 'Light theme';
    if (themeBtn) {
      themeBtn.setAttribute('aria-label', 'Switch to ' + next + ' theme');
      var lab = themeBtn.querySelector('.dock-label'); if (lab) lab.textContent = word;
    }
    if (menuThemeBtn) menuThemeBtn.lastChild.textContent = 'Switch to ' + next + ' theme';
  }
  function toggleTheme() {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('ht-theme', next); } catch (e) {}
    syncThemeBtn();
  }
  syncThemeBtn();
  themeBtn.addEventListener('click', toggleTheme);

  /* "More" menu (phones) */
  var moreBtn = doc.getElementById('htMore'), moreMenu = doc.getElementById('htMoreMenu');
  function moreOpen() { return moreBtn.getAttribute('aria-expanded') === 'true'; }
  function setMore(open, refocus) {
    moreBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    moreMenu.hidden = !open;
    if (open) { var first = moreMenu.querySelector('.dock-menu-item'); if (first) first.focus(); }
    else if (refocus) moreBtn.focus();
  }
  moreBtn.addEventListener('click', function () { setMore(!moreOpen()); });
  menuThemeBtn.addEventListener('click', toggleTheme);
  moreMenu.querySelector('[data-more-search]').addEventListener('click', function () { setMore(false); openSearch(); });
  doc.addEventListener('click', function (e) { if (moreOpen() && !wrap.contains(e.target)) setMore(false); });
  wrap.addEventListener('keydown', function (e) { if (e.key === 'Escape' && moreOpen()) { e.stopPropagation(); setMore(false, true); } });
  wrap.addEventListener('focusout', function (e) { if (moreOpen() && e.relatedTarget && !wrap.contains(e.relatedTarget)) setMore(false); });
  window.addEventListener('resize', function () { if (moreOpen() && moreBtn.offsetParent === null) setMore(false); });

  /* --------------------------------------------------- scroll progress */
  var sp = doc.createElement('div');
  sp.className = 'scroll-progress';
  sp.setAttribute('aria-hidden', 'true');
  sp.innerHTML = '<div class="scroll-progress-fill"></div>';
  body.appendChild(sp);
  var fill = sp.firstChild, ticking = false;
  function progress() {
    ticking = false;
    var max = root.scrollHeight - root.clientHeight;
    fill.style.width = (max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0) + '%';
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(progress); } }, { passive: true });
  window.addEventListener('resize', progress);
  progress();

  /* Keep Tab / Shift+Tab inside an open dialog (aria-modal promises it) */
  function trapTab(box, e) {
    if (e.key !== 'Tab') return;
    var f = [].filter.call(box.querySelectorAll('a[href], button:not([disabled]), input:not([type="hidden"]), textarea, select, [tabindex]:not([tabindex="-1"])'),
      function (el) { return el.offsetWidth || el.offsetHeight || el.getClientRects().length; });
    if (!f.length) { e.preventDefault(); return; }
    var first = f[0], last = f[f.length - 1], a = doc.activeElement;
    if (e.shiftKey && (a === first || !box.contains(a))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (a === last || !box.contains(a))) { e.preventDefault(); first.focus(); }
  }
  function escHtml(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ------------------------------------------------------------ search */
  var openSearch = function () {};
  (function () {
    /* What buyers type: pack and asset words from the library and the shop */
    var ASSET_WORDS = 'fire smoke explosion explosions airstrike skibidi toilet water splash electricity electric sparks spark lasers laser sci-fi scifi weapons weapon muzzle flash bullet bullets impacts impact blood gore debris destruction vehicles vehicle car jet robot core environment dust fog tf2 1980s hdri biome biomes city urban nature models hwm rigs idle walking running fighting combat shooting dialog crowd parkour props';
    var SEARCH = [
      { t: 'Home', d: 'SFM assets, Blender add-ons and free tutorials', href: '/', ic: '/assets/icons/home.png', k: 'home hoovytube start main' },
      { t: 'Patreon membership', d: 'The library: tiers, packs and what each tier includes', href: '/products/', ic: '/assets/icons/forged/patreon.png', p: true, k: 'patreon membership tiers library particles particle effects pcf scenebuilds scenebuild animations animation packs price join support assets products shop ' + ASSET_WORDS },
      { t: 'Join on Patreon', d: 'patreon.com - memberships from $20/month', href: URL_JOIN, ic: '/assets/icons/forged/patreon.png', ext: true, p: true, k: 'patreon join subscribe membership tiers support' },
      { t: 'Patreon shop', d: 'Single packs, bought once', href: URL_SHOP, ic: '/assets/icons/forged/patreon.png', ext: true, p: true, k: 'patreon shop pack packs buy single one-off particles particle scenebuild scenebuilds ' + ASSET_WORDS },
      { t: 'Steam Workshop', d: 'Free SFM items and free trials on the Workshop', href: '/workshop/', ic: '/assets/icons/forged/steam.png', k: 'steam workshop free items trial trials particles particle models sfm download subscribe fire smoke explosion explosions airstrike water splash candle electric arc skibidi tf2 scout soldier pyro medieval quarry terrain' },
      { t: 'HoovyTools', d: 'Free Blender add-ons: SFM sessions and .pcf particles', href: '/hoovytools/', ic: '/assets/icons/tools.png', k: 'hoovytools blender addon add-on sfm to blender importer session dmx particle import pcf geometry nodes download free' },
      { t: 'HoovyTools Particle Import', d: '.pcf particle effects as geometry nodes', href: '/hoovytools/#particles', ic: '/assets/icons/forged/sparks.png', k: 'particle import pcf geometry nodes blender sprites rope trail' },
      { t: 'HoovyTools session importer', d: 'SFM session .dmx into Blender', href: '/hoovytools/#sessions', ic: '/assets/icons/forged/blender-addon.png', k: 'session import dmx sfm blender sourceio cameras sounds shape keys' },
      { t: 'Learn', d: 'Free SFM & Blender tutorials, Easy to Hard', href: '/learn/', ic: '/assets/icons/learn.png', k: 'learn tutorials sfm blender easy medium hard playlist guide beginner advanced' },
      { t: 'Journal', d: 'Essays and notes from behind the tools', href: '/blog/', ic: '/assets/icons/newsletter.png', k: 'journal blog essays posts notes manifesto shoulders of giants' },
      { t: 'Contact', d: 'Questions, collabs, or just say hi', href: '/contact/', ic: '/assets/icons/contact.png', k: 'contact email message support hello' },
      { t: 'Newsletter', d: 'New videos, drops and HoovyTools updates', href: '#newsletter', ic: '/assets/icons/contact.png', k: 'newsletter subscribe email updates signup' },
      { t: 'YouTube', d: 'Watch on YouTube', href: URL_YOUTUBE, ic: '/assets/icons/forged/youtube.png', ext: true, k: 'youtube videos watch channel subscribe' },
      { t: 'Discord', d: 'The HoovyTube Discord server', href: URL_DISCORD, ic: '/assets/icons/forged/discord.png', ext: true, k: 'discord chat community server' }
    ];
    /* When nothing matches, offer the two places the assets live */
    var FALLBACK = [
      { t: 'Browse the Patreon library', d: 'Particles, scenebuilds and animations: tiers and single packs', href: '/products/', ic: '/assets/icons/forged/patreon.png', p: true },
      { t: 'Free Workshop items', d: 'Free SFM packs and free trials on Steam', href: '/workshop/', ic: '/assets/icons/forged/steam.png' }
    ];
    var ov = doc.createElement('div');
    ov.className = 'search-overlay';
    ov.innerHTML = '<div class="search-box" role="dialog" aria-modal="true" aria-label="Search HoovyTube">' +
      '<div class="search-inputwrap"><img src="/assets/icons/search.png" alt="" width="28" height="28">' +
      '<input class="search-input" type="search" placeholder="Search HoovyTube" aria-label="Search" autocomplete="off" spellcheck="false"></div>' +
      '<div class="search-results" role="listbox"></div></div>';
    body.appendChild(ov);
    var input = ov.querySelector('.search-input');
    var results = ov.querySelector('.search-results');
    var sel = 0, lastFocus = null;

    function row(e, i) {
      return '<a class="search-result' + (i === 0 ? ' sel' : '') + (e.p ? ' is-patreon' : '') + '" role="option" href="' + e.href + '"' + (e.ext ? EXT : '') + '>' +
        '<img src="' + e.ic + '" alt="" width="30" height="30"><span><span class="st">' + e.t + (e.ext ? ' <span aria-hidden="true">&#8599;</span>' : '') +
        '</span><span class="sd">' + e.d + '</span></span></a>';
    }
    function render(q) {
      q = (q || '').trim().toLowerCase();
      var terms = q.split(/\s+/).filter(Boolean);
      var list = SEARCH.filter(function (e) {
        var hay = (e.t + ' ' + e.d + ' ' + (e.k || '')).toLowerCase();
        return terms.every(function (w) { return hay.indexOf(w) !== -1; });
      }).slice(0, 9);
      sel = 0;
      if (!list.length) {
        results.innerHTML = '<p class="search-empty">Nothing matched &ldquo;' + escHtml(q) + '&rdquo;. The assets live in two places:</p>' + FALLBACK.map(row).join('');
        return;
      }
      results.innerHTML = list.map(row).join('');
    }
    function open() { lastFocus = doc.activeElement; ov.classList.add('open'); input.value = ''; render(''); setTimeout(function () { input.focus(); }, 20); }
    function close() { ov.classList.remove('open'); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
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
      else if (e.key === 'Enter') { var els = results.querySelectorAll('.search-result'); if (els[sel]) { e.preventDefault(); els[sel].click(); } }
      else if (e.key === 'Escape') { close(); }
    });
    results.addEventListener('click', function (e) { if (e.target.closest('.search-result')) setTimeout(close, 0); });
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    doc.addEventListener('keydown', function (e) { if (ov.classList.contains('open')) trapTab(ov.querySelector('.search-box'), e); });
    doc.getElementById('htSearch').addEventListener('click', open);
    openSearch = open;
    doc.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-search-open]');
      if (t) { e.preventDefault(); open(); }
    });
    doc.addEventListener('keydown', function (e) {
      var a = doc.activeElement, tag = (a && a.tagName) || '', typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (a && a.isContentEditable);
      if (((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) || (e.key === '/' && !typing)) { e.preventDefault(); open(); }
      else if (e.key === 'Escape' && ov.classList.contains('open')) close();
    });
  })();

  /* ------------------------------------------------ send-a-message modal */
  var SUPA = 'https://iglbfojatowaxbhjubvz.supabase.co';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnbGJmb2phdG93YXhiaGp1YnZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMzgyODUsImV4cCI6MjEwMTYxNDI4NX0.H7EeaGn3qQGn6pwFnDI_QRFW3uILnwDaWB54pUbWv6g';
  var modal = doc.createElement('div');
  modal.className = 'msg-modal';
  modal.innerHTML =
    '<div class="mm-box" role="dialog" aria-modal="true" aria-labelledby="mmTitle">' +
      '<button class="mm-x" type="button" aria-label="Close">&#215;</button>' +
      '<h3 id="mmTitle">Send a message</h3>' +
      '<p class="mm-sub">Questions, collabs, or just say hi - I read every message.</p>' +
      '<form class="mm-form" novalidate>' +
        '<div class="mm-row">' +
          '<div><label for="mmName">Name</label><input class="input" id="mmName" name="name" type="text" autocomplete="name" required></div>' +
          '<div><label for="mmEmail">Email</label><input class="input" id="mmEmail" name="email" type="email" autocomplete="email" required></div>' +
        '</div>' +
        '<label for="mmMessage">Message</label>' +
        '<textarea class="textarea" id="mmMessage" name="message" maxlength="5000" required></textarea>' +
        '<div class="mm-actions">' +
          '<button type="button" class="btn btn-ghost mm-cancel">Cancel</button>' +
          '<button type="submit" class="btn btn-primary mm-send">Send</button>' +
        '</div>' +
        '<div class="mm-msg" role="status" aria-live="polite"></div>' +
      '</form>' +
    '</div>';
  body.appendChild(modal);
  var mmForm = modal.querySelector('.mm-form'), mmMsg = modal.querySelector('.mm-msg'), mmSend = modal.querySelector('.mm-send');
  var mmLast = null;
  function openModal(e) {
    if (e && e.preventDefault) e.preventDefault();
    mmLast = doc.activeElement; modal.classList.add('open');
    setTimeout(function () { var f = mmForm.querySelector('input[name=name]'); if (f) f.focus(); }, 30);
  }
  function closeModal() { modal.classList.remove('open'); if (mmLast && mmLast.focus) mmLast.focus(); }
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  modal.querySelector('.mm-x').addEventListener('click', closeModal);
  modal.querySelector('.mm-cancel').addEventListener('click', closeModal);
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.classList.contains('open')) closeModal(); });
  doc.addEventListener('keydown', function (e) { if (modal.classList.contains('open')) trapTab(modal.querySelector('.mm-box'), e); });
  doc.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-message-open]');
    if (t) openModal(e);
  });
  mmForm.addEventListener('submit', function (e) {
    e.preventDefault();
    mmMsg.textContent = ''; mmMsg.className = 'mm-msg';
    var name = mmForm.name.value.trim(), email = mmForm.email.value.trim(), message = mmForm.message.value.trim();
    if (!name || !email || !message) { mmMsg.textContent = 'Please fill in your name, email, and message.'; mmMsg.className = 'mm-msg err'; return; }
    mmSend.disabled = true; mmSend.textContent = 'Sending...';
    fetch(SUPA + '/functions/v1/contact-form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: 'Bearer ' + ANON },
      body: JSON.stringify({ name: name, email: email, subject: 'Message from site popup', message: message })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; });
    }).then(function (res) {
      if (res.ok) { mmMsg.textContent = 'Thanks - your message was sent!'; mmMsg.className = 'mm-msg ok'; mmForm.reset(); setTimeout(closeModal, 1400); }
      else { mmMsg.textContent = (res.d && res.d.error) || 'Something went wrong. Please try again.'; mmMsg.className = 'mm-msg err'; }
    }).catch(function () {
      mmMsg.textContent = 'Network error. Please try again.'; mmMsg.className = 'mm-msg err';
    }).then(function () { mmSend.disabled = false; mmSend.textContent = 'Send'; });
  });

  window.HTNav = { openMessage: openModal, openSearch: function () { openSearch(); }, theme: currentTheme };

  /* ----------------------------------------------- Patreon CTA band */
  var foot = doc.querySelector('footer.site');
  var onPatreonPage = path.indexOf('/products/') === 0 || path.indexOf('/patreon/') === 0;
  if (foot && !body.hasAttribute('data-no-cta') && !doc.querySelector('.cta-band')) {
    var second = onPatreonPage
      ? '<a class="btn btn-ghost btn-lg" href="' + URL_SHOP + '"' + EXT + '>Browse the Patreon shop</a>'
      : '<a class="btn btn-ghost btn-lg" href="/products/">Compare the tiers</a>';
    var band = doc.createElement('section');
    band.className = 'cta-band';
    band.setAttribute('aria-labelledby', 'ctaBandTitle');
    band.innerHTML =
      '<div class="container"><div class="panel panel-patreon cta-band-panel">' +
        '<img class="cta-band-art" src="/assets/icons/forged/badge-patreon.png" alt="" width="132" height="174" loading="lazy">' +
        '<div class="cta-band-body">' +
          '<span class="eyebrow">Patreon membership</span>' +
          '<h2 id="ctaBandTitle">Skip the asset grind. Get the whole library.</h2>' +
          '<ul class="cta-band-stats" aria-label="What the library holds">' +
            '<li><b>900+</b> particle effects</li><li><b>600+</b> animations</li><li><b>30+</b> scenebuilds</li>' +
          '</ul>' +
          '<p>Sorted, documented and previewed, so your time goes into directing instead of building sprites. ' +
            'Memberships start at <mark class="hl">$20/month</mark>, or pick up single packs in the ' +
            '<a class="hl-patreon" href="' + URL_SHOP + '"' + EXT + '>Patreon shop</a>.</p>' +
          '<div class="btn-row">' +
            '<a class="btn btn-patreon btn-lg" href="' + URL_JOIN + '"' + EXT + '><img class="btn-icon" src="/assets/icons/forged/patreon.png" alt="" width="28" height="28">Join on Patreon</a>' +
            second +
          '</div>' +
        '</div>' +
      '</div></div>';
    foot.parentNode.insertBefore(band, foot);
  }

  /* ------------------------------------------------------------ footer */
  if (!foot) return;
  var SOC_SVG = {
    youtube: '<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>',
    patreon: '<circle cx="15.2" cy="9.6" r="7.8"/><rect x="1" y="1.8" width="5.2" height="20.4"/>',
    steam: '<path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.522 2.031 4.522 4.527s-2.028 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z"/>',
    discord: '<path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>'
  };
  var MAIL_SVG = '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>';
  var SOCIAL = [
    { n: 'youtube', label: 'YouTube', href: URL_YOUTUBE },
    { n: 'patreon', label: 'Patreon', href: URL_JOIN },
    { n: 'steam', label: 'Steam Workshop', href: URL_WORKSHOP },
    { n: 'discord', label: 'Discord', href: URL_DISCORD },
    { n: 'email', label: 'Send a message', href: '/contact/', msg: true }
  ];
  var socialHtml = SOCIAL.map(function (l) {
    var g = l.msg
      ? '<svg class="soc-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + MAIL_SVG + '</svg>'
      : '<svg class="soc-ic" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + SOC_SVG[l.n] + '</svg>';
    var inner = '<span class="soc-chip">' + g + '</span><span class="soc-label">' + l.label + '</span>';
    return l.msg
      ? '<a class="soc soc-msg" href="' + l.href + '" data-message-open title="' + l.label + '">' + inner + '</a>'
      : '<a class="soc soc-' + l.n + '" href="' + l.href + '"' + EXT + ' title="' + l.label + '">' + inner + '</a>';
  }).join('');

  var notes = [].slice.call(foot.querySelectorAll('.footer-note')).map(function (n) { return n.outerHTML; }).join('');
  var year = Math.max(2026, new Date().getFullYear());
  foot.innerHTML =
    '<div class="container"><div class="panel footer-panel">' +
      '<div class="footer-top">' +
        '<div class="footer-brand">' +
          '<a class="wordmark" href="/">HoovyTube</a>' +
          '<p>SFM particles, animations and scenebuilds, the free HoovyTools Blender add-ons, and free tutorials that teach all of it.</p>' +
          '<div class="social" aria-label="HoovyTube elsewhere">' + socialHtml + '</div>' +
        '</div>' +
        '<nav class="footer-col" aria-label="Explore"><h3>Explore</h3><ul>' +
          '<li><a href="/">Home</a></li>' +
          '<li><a href="/workshop/">Workshop</a></li>' +
          '<li><a href="/hoovytools/">HoovyTools</a></li>' +
          '<li><a href="/learn/">Learn</a></li>' +
          '<li><a href="/blog/">Journal</a></li>' +
        '</ul></nav>' +
        '<nav class="footer-col" aria-label="Patreon"><h3>Patreon</h3><ul>' +
          '<li><a class="hl-patreon" href="/products/">Membership &amp; tiers</a></li>' +
          '<li><a href="' + URL_JOIN + '"' + EXT + '>Join on Patreon&nbsp;<span aria-hidden="true">&#8599;</span></a></li>' +
          '<li><a href="' + URL_SHOP + '"' + EXT + '>Patreon shop&nbsp;<span aria-hidden="true">&#8599;</span></a></li>' +
          '<li><a href="' + URL_PATREON + '"' + EXT + '>Patreon page&nbsp;<span aria-hidden="true">&#8599;</span></a></li>' +
        '</ul></nav>' +
        '<nav class="footer-col" aria-label="Stay in touch"><h3>Stay in touch</h3><ul>' +
          '<li><a href="/contact/">Contact</a></li>' +
          '<li><a href="#newsletter" data-newsletter-open>Newsletter</a></li>' +
          '<li><a href="' + URL_YOUTUBE + '"' + EXT + '>YouTube&nbsp;<span aria-hidden="true">&#8599;</span></a></li>' +
          '<li><a href="' + URL_WORKSHOP + '"' + EXT + '>Steam Workshop&nbsp;<span aria-hidden="true">&#8599;</span></a></li>' +
          '<li><a href="' + URL_DISCORD + '"' + EXT + '>Discord&nbsp;<span aria-hidden="true">&#8599;</span></a></li>' +
        '</ul></nav>' +
      '</div>' +
      notes +
      '<div class="footer-bottom"><p>&copy; ' + year + ' HoovyTube. All rights reserved. Community animations &copy; their respective creators.</p></div>' +
    '</div></div>';
})();

/* HoovyTube shared UI behaviours (design system v2) - load on every page after ht-nav.js:
     <script defer src="/shared/ht-ui.js?v=20"></script>
   Everything is data-attribute driven; standard components need no per-page JS.
     Reveal      main > section, .cta-band and [data-reveal] fade/raise in once when scrolled into view.
                 [data-reveal="stagger"] reveals its children one after another. [data-no-reveal] opts out.
                 Anything already on screen at load is shown immediately (never hidden). Works for blocks of
                 any height: a block reveals as soon as its top edge enters the viewport, and a scroll/resize
                 failsafe shows anything on screen (or above it) that an observer callback missed.
     Count-up    [data-count] numbers count up once when 40% visible. Write the final value in the HTML
                 ("900+", "2,500+", "$20"); prefix/suffix/commas are kept. Optional data-count="900".
     Filter      [data-filter-group="g"] holds .chip[data-filter] buttons (aria-pressed). Items are the children
                 of [data-filter-target="g"] with data-tags="a b c". Optional [data-filter-status="g"] (live text)
                 and [data-filter-empty="g"] (shown when nothing matches). data-filter="all" shows everything.
     Video       video[data-play="visible"] plays muted while on screen; video[data-play="hover"] plays while the
                 pointer is over its .screen/.card/[data-play-scope]. Never autoplays under reduced motion.
     Accordion   [data-accordion] keeps one <details> open at a time (native name="" also works).
     Copy        [data-copy="#id"] or [data-copy-text="..."] copies text and confirms on the button.
     YouTube     a.yt-facade[data-youtube="VIDEO_ID"] (href = the youtube.com watch URL, data-title = video title)
                 is swapped for a youtube-nocookie player on click. Optional data-start="seconds".
     Carousel    legacy .hero-carousel controller (homepage), kept for old bodies.
   Re-run on content you inject later: window.HTUI.refresh(element)                                   */
(function () {
  'use strict';
  var doc = document;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = typeof IntersectionObserver !== 'undefined';
  function $all(sel, scope) { return [].slice.call((scope || doc).querySelectorAll(sel)); }

  /* ------------------------------------------------------------ reveal */
  // threshold 0 (not a visibility ratio): a ratio threshold can never be reached by a block taller than
  // viewport / ratio, which would leave a long journal post or catalogue invisible for good.
  var pending = [];
  var revealIO = (!reduced && hasIO) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) show(e.target); });
  }, { threshold: 0, rootMargin: '0px 0px -6% 0px' }) : null;

  function show(el) {
    el.classList.add('in');
    if (revealIO) revealIO.unobserve(el);
    var i = pending.indexOf(el);
    if (i !== -1) pending.splice(i, 1);
  }
  // Failsafe: on scroll/resize/load and shortly after boot, show every pending block whose top edge is above
  // the bottom of the viewport (on screen, or already scrolled past after an anchor jump).
  var sweepQueued = false;
  function sweep() {
    sweepQueued = false;
    var vh = window.innerHeight || 800;
    pending.slice().forEach(function (el) { if (el.getBoundingClientRect().top < vh) show(el); });
  }
  function queueSweep() { if (!sweepQueued && pending.length) { sweepQueued = true; requestAnimationFrame(sweep); } }
  if (revealIO) {
    window.addEventListener('scroll', queueSweep, { passive: true });
    window.addEventListener('resize', queueSweep);
    window.addEventListener('load', queueSweep);
    window.addEventListener('hashchange', queueSweep);
    window.addEventListener('beforeprint', function () { pending.slice().forEach(show); });
  }

  function initReveal(scope) {
    if (!revealIO) return;
    var targets = $all('main > section, .cta-band, [data-reveal]', scope || doc);
    var vh = window.innerHeight || 800;
    targets.forEach(function (el) {
      if (el.hasAttribute('data-no-reveal') || el.classList.contains('reveal')) return;
      if (el.getAttribute('data-reveal') === 'stagger') {
        [].forEach.call(el.children, function (c, i) { c.style.setProperty('--i', Math.min(i, 8)); });
      }
      if (el.getBoundingClientRect().top < vh * 0.92) return;   // on screen (or above it) at load: never hide it
      el.classList.add('reveal');
      pending.push(el);
      revealIO.observe(el);
    });
    setTimeout(sweep, 900);
  }

  /* ---------------------------------------------------------- count-up */
  function parseCount(el) {
    var txt = (el.textContent || '').trim();
    var m = txt.match(/^([^0-9]*)([0-9][0-9,.]*)(.*)$/);
    if (!m) return null;
    var attr = el.getAttribute('data-count');
    var num = attr && !isNaN(parseFloat(attr)) ? parseFloat(attr) : parseFloat(m[2].replace(/,/g, ''));
    if (isNaN(num)) return null;
    var decimals = (m[2].split('.')[1] || '').length;
    return { pre: el.getAttribute('data-prefix') || m[1], post: el.getAttribute('data-suffix') || m[3], n: num, commas: m[2].indexOf(',') !== -1, d: decimals };
  }
  function fmt(v, c) {
    var s = v.toFixed(c.d);
    if (c.commas) { var parts = s.split('.'); parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ','); s = parts.join('.'); }
    return c.pre + s + c.post;
  }
  var countIO = (!reduced && hasIO) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      countIO.unobserve(e.target);
      var el = e.target, c = el._htCount; if (!c) return;
      var t0 = null, dur = 1100;
      el.textContent = fmt(0, c);
      requestAnimationFrame(function step(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur), eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(c.n * eased, c);
        if (p < 1) requestAnimationFrame(step); else el.textContent = c.final;
      });
    });
  }, { threshold: 0.4 }) : null;
  function initCount(scope) {
    if (!countIO) return;
    $all('[data-count]', scope).forEach(function (el) {
      if (el._htCount) return;
      var c = parseCount(el); if (!c) return;
      c.final = el.textContent;
      el._htCount = c;
      countIO.observe(el);
    });
  }

  /* ------------------------------------------------------------ filter */
  function tagsOf(item) { return (' ' + (item.getAttribute('data-tags') || '').toLowerCase() + ' '); }
  function applyFilter(group) {
    var bar = doc.querySelector('[data-filter-group="' + group + '"]');
    var target = doc.querySelector('[data-filter-target="' + group + '"]');
    if (!bar || !target) return;
    var chips = $all('[data-filter]', bar);
    var active = chips.filter(function (c) { return c.getAttribute('aria-pressed') === 'true'; })[0];
    var f = active ? (active.getAttribute('data-filter') || 'all').toLowerCase() : 'all';
    var items = $all('[data-tags]', target);
    var shown = 0;
    items.forEach(function (it) {
      var ok = f === 'all' || tagsOf(it).indexOf(' ' + f + ' ') !== -1;
      it.hidden = !ok;
      if (ok) shown++;
    });
    chips.forEach(function (c) {
      var cnt = c.querySelector('.chip-count'); if (!cnt) return;
      var key = (c.getAttribute('data-filter') || 'all').toLowerCase();
      cnt.textContent = key === 'all' ? items.length : items.filter(function (it) { return tagsOf(it).indexOf(' ' + key + ' ') !== -1; }).length;
    });
    var status = doc.querySelector('[data-filter-status="' + group + '"]');
    if (status) status.textContent = 'Showing ' + shown + ' of ' + items.length + (active && f !== 'all' ? ' - ' + (active.getAttribute('data-filter-label') || active.textContent.replace(/\d+\s*$/, '').trim()) : '');
    var empty = doc.querySelector('[data-filter-empty="' + group + '"]');
    if (empty) empty.hidden = shown !== 0;
  }
  function initFilters(scope) {
    $all('[data-filter-group]', scope).forEach(function (bar) {
      var chips = $all('[data-filter]', bar);
      chips.forEach(function (c) { if (c.tagName === 'BUTTON' && !c.type) c.type = 'button'; if (!c.hasAttribute('aria-pressed')) c.setAttribute('aria-pressed', 'false'); });
      if (!chips.some(function (c) { return c.getAttribute('aria-pressed') === 'true'; }) && chips[0]) chips[0].setAttribute('aria-pressed', 'true');
      applyFilter(bar.getAttribute('data-filter-group'));
    });
  }
  doc.addEventListener('click', function (e) {
    var chip = e.target.closest && e.target.closest('[data-filter-group] [data-filter]');
    if (!chip) return;
    var bar = chip.closest('[data-filter-group]');
    $all('[data-filter]', bar).forEach(function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
    applyFilter(bar.getAttribute('data-filter-group'));
  });

  /* ------------------------------------------------------------- video */
  var vidIO = (!reduced && hasIO) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting && e.intersectionRatio >= 0.5) { v.muted = true; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      else if (!v.paused) v.pause();
    });
  }, { threshold: [0, 0.5] }) : null;
  function initVideo(scope) {
    if (reduced) return;
    $all('video[data-play="visible"]', scope).forEach(function (v) {
      if (v._htPlay) return; v._htPlay = 1; v.muted = true; v.setAttribute('playsinline', '');
      if (vidIO) vidIO.observe(v);
    });
    $all('video[data-play="hover"]', scope).forEach(function (v) {
      if (v._htPlay) return; v._htPlay = 1; v.muted = true; v.setAttribute('playsinline', '');
      var host = v.closest('[data-play-scope], .screen, .card, .item-card') || v;
      host.addEventListener('pointerenter', function () { var p = v.play(); if (p && p.catch) p.catch(function () {}); });
      host.addEventListener('pointerleave', function () { v.pause(); });
      host.addEventListener('focusin', function () { var p = v.play(); if (p && p.catch) p.catch(function () {}); });
      host.addEventListener('focusout', function () { v.pause(); });
    });
  }

  /* --------------------------------------------------------- accordion */
  doc.addEventListener('toggle', function (e) {
    var d = e.target;
    if (!d || d.tagName !== 'DETAILS' || !d.open) return;
    var group = d.parentElement && d.parentElement.closest('[data-accordion]');
    if (!group) return;
    $all('details[open]', group).forEach(function (o) { if (o !== d && o.parentElement.closest('[data-accordion]') === group) o.open = false; });
  }, true);

  /* -------------------------------------------------------------- copy */
  doc.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-copy], [data-copy-text]');
    if (!b) return;
    var text = b.getAttribute('data-copy-text');
    if (text === null) { var src = doc.querySelector(b.getAttribute('data-copy')); text = src ? (src.value !== undefined && src.tagName !== 'PRE' && src.tagName !== 'CODE' ? src.value : src.textContent) : ''; }
    var done = function () {
      var old = b.getAttribute('data-copy-done') || 'Copied';
      if (!b._htOld) b._htOld = b.innerHTML;
      b.textContent = old;
      clearTimeout(b._htT); b._htT = setTimeout(function () { b.innerHTML = b._htOld; }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done);
    else {
      var ta = doc.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      doc.body.appendChild(ta); ta.select(); try { doc.execCommand('copy'); } catch (x) {} ta.remove(); done();
    }
  });

  /* ----------------------------------------------------- YouTube facade */
  doc.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-youtube]');
    if (!a) return;
    var id = a.getAttribute('data-youtube') || '';
    if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return;          // malformed id: let the link open YouTube
    e.preventDefault();
    var start = parseInt(a.getAttribute('data-start'), 10);
    var f = doc.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0' + (start > 0 ? '&start=' + start : '');
    f.title = a.getAttribute('data-title') || a.getAttribute('aria-label') || 'YouTube video';
    f.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
    f.setAttribute('allowfullscreen', '');
    f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    a.parentNode.replaceChild(f, a);
    f.focus();
  });

  /* -------------------------------------- legacy homepage hero carousel */
  function initHeroCarousel() {
    var car = doc.querySelector('.hero-carousel'); if (!car) return;
    var track = car.querySelector('.hc-track'); if (!track) return;
    var slides = [].slice.call(track.children); if (!slides.length) return;
    var vids = slides.map(function (s) { return s.querySelector('video'); });
    var dotsWrap = car.querySelector('.hc-dots');
    var sound = car.querySelector('.hc-sound');
    var idx = 0, muted = true, timer = null, dots = [];
    if (dotsWrap) {
      slides.forEach(function (_, i) {
        var b = doc.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', 'Go to animation ' + (i + 1));
        if (i === 0) b.className = 'active';
        b.addEventListener('click', function () { go(i); rearm(); });
        dotsWrap.appendChild(b);
      });
      dots = [].slice.call(dotsWrap.children);
    }
    function playActive() {
      vids.forEach(function (v, i) {
        if (!v) return;
        if (i === idx && !reduced) { v.muted = muted; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        else v.pause();
      });
    }
    function go(i) {
      idx = (i + slides.length) % slides.length;
      track.style.transform = 'translateX(-' + idx * 100 + '%)';
      dots.forEach(function (d, j) { d.classList.toggle('active', j === idx); });
      playActive();
    }
    function rearm() { if (timer) clearInterval(timer); if (!reduced) timer = setInterval(function () { go(idx + 1); }, 7000); }
    var prev = car.querySelector('.hc-btn.prev'), next = car.querySelector('.hc-btn.next');
    if (prev) prev.addEventListener('click', function () { go(idx - 1); rearm(); });
    if (next) next.addEventListener('click', function () { go(idx + 1); rearm(); });
    if (sound) sound.addEventListener('click', function () {
      muted = !muted; sound.classList.toggle('on', !muted);
      if (vids[idx]) { vids[idx].muted = muted; if (!muted) { var p = vids[idx].play(); if (p && p.catch) p.catch(function () {}); } }
    });
    var scrollBtn = doc.querySelector('.hero-scroll');
    if (scrollBtn) scrollBtn.addEventListener('click', function () {
      var main = doc.querySelector('main');
      var top = main ? main.getBoundingClientRect().top + window.scrollY - 90 : window.innerHeight;
      window.scrollTo({ top: top, behavior: reduced ? 'auto' : 'smooth' });
    });
    go(0); rearm();
  }

  /* -------------------------------------------------------------- boot */
  function refresh(scope) {
    initReveal(scope); initCount(scope); initFilters(scope); initVideo(scope);
  }
  function boot() { initHeroCarousel(); refresh(doc); }
  window.HTUI = { refresh: function (el) { refresh(el || doc); }, filter: applyFilter };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

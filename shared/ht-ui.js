/* HoovyTube shared UI enhancements — loaded on every page (after ht-nav).
   Vanilla ports of: Spotlight (cursor-tracked border glow), Magnetic (cursor drift),
   plus the homepage hero-carousel controller with scroll parallax.
   Include with:  <script defer src="/shared/ht-ui.js"></script>            */
(function () {
  var fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Spotlight border: track cursor, light the ring ---------- */
  function initSpotlight() {
    if (!fine) return;
    [].forEach.call(document.querySelectorAll('.spot'), function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
        el.classList.add('lit');
      });
      el.addEventListener('pointerleave', function () { el.classList.remove('lit'); });
    });
  }

  /* ---------- Magnetic: elements drift toward the cursor ---------- */
  function initMagnetic() {
    if (!fine || reduced) return;
    var els = [].slice.call(document.querySelectorAll('[data-magnetic]')).map(function (el) {
      return {
        el: el,
        intensity: parseFloat(el.getAttribute('data-magnetic')) || 0.3,
        range: parseFloat(el.getAttribute('data-magnetic-range')) || 200,
        cx: 0, cy: 0, tx: 0, ty: 0
      };
    });
    if (!els.length) return;
    var mx = -99999, my = -99999;
    window.addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });
    (function tick() {
      for (var i = 0; i < els.length; i++) {
        var m = els[i], r = m.el.getBoundingClientRect();
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        var dx = mx - cx, dy = my - cy, dist = Math.hypot(dx, dy);
        if (dist < m.range) { m.tx = dx * m.intensity; m.ty = dy * m.intensity; }
        else { m.tx = 0; m.ty = 0; }
        m.cx += (m.tx - m.cx) * 0.18;
        m.cy += (m.ty - m.cy) * 0.18;
        if (Math.abs(m.cx) < 0.05 && Math.abs(m.tx) < 0.05) m.cx = 0;
        if (Math.abs(m.cy) < 0.05 && Math.abs(m.ty) < 0.05) m.cy = 0;
        m.el.style.transform = 'translate(' + m.cx.toFixed(2) + 'px,' + m.cy.toFixed(2) + 'px)';
      }
      requestAnimationFrame(tick);
    })();
  }

  /* ---------- Homepage hero carousel + scroll parallax ---------- */
  function initHeroCarousel() {
    var car = document.querySelector('.hero-carousel'); if (!car) return;
    var track = car.querySelector('.hc-track');
    var slides = [].slice.call(track.children);
    var vids = slides.map(function (s) { return s.querySelector('video'); });
    var dotsWrap = car.querySelector('.hc-dots');
    var sound = car.querySelector('.hc-sound');
    var idx = 0, muted = true, timer = null;

    slides.forEach(function (_, i) {
      var b = document.createElement('button');
      b.setAttribute('aria-label', 'Go to animation ' + (i + 1));
      if (i === 0) b.className = 'active';
      b.addEventListener('click', function () { go(i); rearm(); });
      dotsWrap.appendChild(b);
    });
    var dots = [].slice.call(dotsWrap.children);

    function playActive() {
      vids.forEach(function (v, i) {
        if (!v) return;
        if (i === idx) { v.muted = muted; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        else v.pause();
      });
    }
    function go(i) {
      idx = (i + slides.length) % slides.length;
      track.style.transform = 'translateX(-' + idx * 100 + '%)';
      dots.forEach(function (d, j) { d.classList.toggle('active', j === idx); });
      playActive();
    }
    function rearm() { if (timer) clearInterval(timer); timer = setInterval(function () { go(idx + 1); }, 7000); }

    var prev = car.querySelector('.hc-btn.prev'), next = car.querySelector('.hc-btn.next');
    if (prev) prev.addEventListener('click', function () { go(idx - 1); rearm(); });
    if (next) next.addEventListener('click', function () { go(idx + 1); rearm(); });
    if (sound) sound.addEventListener('click', function () {
      muted = !muted; sound.classList.toggle('on', !muted);
      if (vids[idx]) { vids[idx].muted = muted; if (!muted) { var p = vids[idx].play(); if (p && p.catch) p.catch(function () {}); } }
    });

    var scrollBtn = document.querySelector('.hero-scroll');
    if (scrollBtn) scrollBtn.addEventListener('click', function () {
      var main = document.querySelector('main');
      var top = main ? main.getBoundingClientRect().top + window.scrollY - 70 : window.innerHeight;
      window.scrollTo({ top: top, behavior: reduced ? 'auto' : 'smooth' });
    });

    go(0); rearm();

    /* scroll parallax: fade + lift the lockup, gently zoom the video */
    if (!reduced) {
      var lockup = car.querySelector('.hero-lockup');
      var onScroll = function () {
        var h = car.offsetHeight || 1;
        var p = Math.min(1, Math.max(0, window.scrollY / h));
        if (lockup) { lockup.style.transform = 'translateY(' + (-p * 60) + 'px)'; lockup.style.opacity = (1 - p * 1.15).toFixed(3); }
        track.style.transform = 'translateX(-' + idx * 100 + '%)';
        car.style.setProperty('--hc-zoom', (1 + p * 0.08).toFixed(4));
      };
      // apply zoom via a wrapper transform on each video
      vids.forEach(function (v) { if (v) v.style.transformOrigin = 'center 40%'; });
      var zoomTick = function () {
        var z = car.style.getPropertyValue('--hc-zoom') || 1;
        vids.forEach(function (v) { if (v) v.style.transform = 'scale(' + z + ')'; });
      };
      window.addEventListener('scroll', function () { onScroll(); zoomTick(); }, { passive: true });
      onScroll();
    }
  }

  function boot() { initSpotlight(); initMagnetic(); initHeroCarousel(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

/* Homepage (/) behaviours. Loaded with defer after the shared scripts:
     <script defer src="/shared/pages/home.js?v=1"></script>
   1. Hero showreel: one <video> plays the three reel clips in order while the screen is on view.
      A clip picker (1, 2, 3) and a Pause/Play button are added to the caption bar.
      Never autoplays under prefers-reduced-motion; the visitor can still press Play.
   2. Community wall: clips play on hover/focus on mouse devices, and while on screen on touch devices
      (the shared ht-ui.js video behaviour does the playing). */
(function () {
  'use strict';
  var doc = document;
  var mm = window.matchMedia ? function (q) { return window.matchMedia(q).matches; } : function () { return false; };
  var reduced = mm('(prefers-reduced-motion: reduce)');

  /* ------------------------------------------------------- 1. showreel */
  var fig = doc.querySelector('[data-reel]');
  var video = fig && fig.querySelector('video');
  var cap = fig && fig.querySelector('.screen-cap');
  if (fig && video && cap) {
    var CLIPS = [
      { src: '/media/home/reel-1.mp4', poster: '/media/posters/home-reel-1.jpg', label: 'a giant skull smashes through a fog-lit ruined city' },
      { src: '/media/home/reel-2.mp4', poster: '/media/posters/home-reel-2.jpg', label: 'an armoured mech pilot with drones, embers and orange haze' },
      { src: '/media/home/reel-3.mp4', poster: '/media/posters/home-reel-3.jpg', label: 'a costumed crowd brawls on a sunny field' }
    ];
    var idx = 0, inView = false, userPaused = false, userStarted = false;
    var now = cap.querySelector('.reel-now');

    var group = doc.createElement('span');
    group.className = 'reel-controls';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Showreel controls');
    var picks = CLIPS.map(function (c, i) {
      var b = doc.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = String(i + 1);
      b.setAttribute('aria-label', 'Clip ' + (i + 1) + ' of ' + CLIPS.length);
      b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      b.addEventListener('click', function () { userStarted = true; userPaused = false; setClip(i); play(); });
      group.appendChild(b);
      return b;
    });
    var toggle = doc.createElement('button');
    toggle.type = 'button';
    toggle.className = 'chip';
    toggle.addEventListener('click', function () {
      if (video.paused) { userStarted = true; userPaused = false; play(); }
      else { userPaused = true; video.pause(); }
    });
    group.appendChild(toggle);
    cap.appendChild(group);

    function syncToggle() {
      var playing = !video.paused && !video.ended;
      toggle.textContent = playing ? 'Pause' : 'Play';
      toggle.setAttribute('aria-label', (playing ? 'Pause' : 'Play') + ' the showreel');
    }
    function setClip(i) {
      idx = (i + CLIPS.length) % CLIPS.length;
      var c = CLIPS[idx];
      video.poster = c.poster;
      video.src = c.src;
      video.setAttribute('aria-label', 'Showreel clip ' + (idx + 1) + ' of ' + CLIPS.length + ': ' + c.label);
      picks.forEach(function (b, j) { b.setAttribute('aria-pressed', j === idx ? 'true' : 'false'); });
      if (now) now.textContent = 'Clip ' + (idx + 1) + ' of ' + CLIPS.length;
      syncToggle();
    }
    function play() {
      video.muted = true;
      var p = video.play();
      if (p && p.catch) p.catch(function () { syncToggle(); });
    }
    function wantsPlay() { return inView && !userPaused && (!reduced || userStarted); }

    video.muted = true;
    video.addEventListener('play', syncToggle);
    video.addEventListener('pause', syncToggle);
    video.addEventListener('ended', function () { setClip(idx + 1); if (wantsPlay()) play(); });
    if (now) now.textContent = 'Clip 1 of ' + CLIPS.length;
    syncToggle();

    if (typeof IntersectionObserver !== 'undefined') {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          inView = e.isIntersecting && e.intersectionRatio >= 0.35;
          if (wantsPlay()) play(); else if (!video.paused) video.pause();
        });
      }, { threshold: [0, 0.35] }).observe(fig);
    } else {
      inView = true;
      if (wantsPlay()) play();
    }
  }

  /* --------------------------------------------------- 2. community wall */
  var wall = doc.querySelector('[data-wall]');
  if (wall) {
    var mode = mm('(hover: hover) and (pointer: fine)') ? 'hover' : 'visible';
    [].forEach.call(wall.querySelectorAll('video[data-wall-video]'), function (v) { v.setAttribute('data-play', mode); });
    if (window.HTUI && window.HTUI.refresh) window.HTUI.refresh(wall);
  }
})();

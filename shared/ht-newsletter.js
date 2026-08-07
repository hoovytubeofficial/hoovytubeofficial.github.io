/* HoovyTube newsletter popover - dismissible bottom-right card.
   Opens shortly after page load, re-opens every 10-15 "button pushes",
   closable (with a reopen tab), opens on #newsletter, and stops for good
   once the visitor subscribes. Include on every page:
     <script defer src="/shared/ht-newsletter.js"></script>                 */
(function () {
  var SUPABASE_URL = 'https://iglbfojatowaxbhjubvz.supabase.co';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnbGJmb2phdG93YXhiaGp1YnZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMzgyODUsImV4cCI6MjEwMTYxNDI4NX0.H7EeaGn3qQGn6pwFnDI_QRFW3uILnwDaWB54pUbWv6g';

  var LS = window.localStorage, SS = window.sessionStorage;
  function get(store, k) { try { return store.getItem(k); } catch (e) { return null; } }
  function set(store, k, v) { try { store.setItem(k, v); } catch (e) {} }

  if (get(LS, 'htnews:sub') === '1') return; // already subscribed → never nag

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;

  function randThreshold() { return 10 + Math.floor(Math.random() * 6); } // 10..15

  function build() {
    var pop = document.createElement('div');
    pop.className = 'htnews';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', 'Newsletter signup');
    pop.innerHTML =
      '<button class="hn-close" type="button" aria-label="Close">✕</button>' +
      '<p class="hn-eyebrow">Newsletter</p>' +
      '<h3>Stay in the loop</h3>' +
      '<p>New videos, animations, asset drops &amp; HoovyTools updates - straight to your inbox. No spam.</p>' +
      '<form class="hn-form" novalidate>' +
        '<input type="email" placeholder="you@example.com" autocomplete="email" aria-label="Email" required>' +
        '<button class="btn btn-primary hn-submit" type="submit">Subscribe</button>' +
        '<div class="hn-msg" role="status" aria-live="polite"></div>' +
      '</form>';

    var tab = document.createElement('button');
    tab.className = 'htnews-tab';
    tab.type = 'button';
    tab.setAttribute('aria-label', 'Open newsletter signup');
    tab.innerHTML = '<img src="/assets/icons/newsletter.png" alt="" draggable="false" style="width:20px;height:20px;object-fit:contain">' +
      '<span>Newsletter</span>';

    document.body.appendChild(pop);
    document.body.appendChild(tab);
    return { pop: pop, tab: tab };
  }

  function magnetize(el) {
    if (!fine || reduced) return;
    var cx = 0, cy = 0, tx = 0, ty = 0, inside = false;
    el.style.willChange = 'transform';
    el.addEventListener('pointerenter', function () { inside = true; });
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      tx = (e.clientX - (r.left + r.width / 2)) * 0.35;
      ty = (e.clientY - (r.top + r.height / 2)) * 0.35;
    });
    el.addEventListener('pointerleave', function () { inside = false; tx = 0; ty = 0; });
    (function tick() {
      cx += ((inside ? tx : 0) - cx) * 0.2;
      cy += ((inside ? ty : 0) - cy) * 0.2;
      el.style.transform = 'translate(' + cx.toFixed(2) + 'px,' + cy.toFixed(2) + 'px)';
      requestAnimationFrame(tick);
    })();
  }

  function start() {
    var ui = build();
    var pop = ui.pop, tab = ui.tab;
    var form = pop.querySelector('.hn-form');
    var input = pop.querySelector('input');
    var submit = pop.querySelector('.hn-submit');
    var msg = pop.querySelector('.hn-msg');
    var isOpen = false, subscribed = false;
    var count = parseInt(get(SS, 'htnews:count') || '0', 10) || 0;
    var threshold = parseInt(get(SS, 'htnews:threshold') || '0', 10) || randThreshold();
    set(SS, 'htnews:threshold', String(threshold));

    magnetize(submit);

    function open() {
      if (isOpen || subscribed) return;
      isOpen = true;
      tab.classList.remove('show');
      pop.classList.add('open');
    }
    function close() {
      isOpen = false;
      pop.classList.remove('open');
      set(LS, 'htnews:closedAt', String(Date.now()));
      if (!subscribed) tab.classList.add('show');
      count = 0; set(SS, 'htnews:count', '0');
      threshold = randThreshold(); set(SS, 'htnews:threshold', String(threshold));
    }

    pop.querySelector('.hn-close').addEventListener('click', close);
    tab.addEventListener('click', open);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen) close(); });

    // Count "button pushes" anywhere on the page (outside the popover itself)
    document.addEventListener('click', function (e) {
      if (subscribed || isOpen) return;
      var t = e.target.closest('a, button, .btn, .dock-item, [role="button"]');
      if (!t) return;
      if (t.closest('.htnews') || t.closest('.htnews-tab')) return;
      count++; set(SS, 'htnews:count', String(count));
      if (count >= threshold) open();
    }, true);

    // Submit
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      msg.textContent = ''; msg.className = 'hn-msg';
      var email = (input.value || '').trim();
      if (!email) { msg.textContent = 'Please enter your email.'; msg.className = 'hn-msg err'; return; }
      submit.disabled = true; submit.textContent = 'Subscribing…';
      fetch(SUPABASE_URL + '/functions/v1/newsletter-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: 'Bearer ' + ANON },
        body: JSON.stringify({ email: email, source: 'popup:' + location.pathname })
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) { return { ok: res.ok, data: data }; });
      }).then(function (r) {
        if (r.ok) {
          subscribed = true; set(LS, 'htnews:sub', '1');
          msg.textContent = "You're in - thanks! 🎉"; msg.className = 'hn-msg ok';
          form.reset();
          setTimeout(function () { pop.classList.remove('open'); tab.remove(); }, 2600);
        } else {
          msg.textContent = (r.data && r.data.error) || 'Could not subscribe. Please try again.'; msg.className = 'hn-msg err';
        }
      }).catch(function () {
        msg.textContent = 'Network error. Please try again.'; msg.className = 'hn-msg err';
      }).finally(function () {
        submit.disabled = false; submit.textContent = 'Subscribe';
      });
    });

    // Auto-open once per browser session (i.e. when they first arrive at the
    // site), plus immediately on #newsletter. Internal page-to-page navigation
    // in the same session will NOT re-pop it.
    tab.classList.add('show');
    if (location.hash === '#newsletter') {
      setTimeout(open, 250);
    } else if (!get(SS, 'htnews:autoOpened')) {
      set(SS, 'htnews:autoOpened', '1');
      setTimeout(open, 3200);
    }

    // let other scripts open it via location.hash change
    window.addEventListener('hashchange', function () { if (location.hash === '#newsletter') open(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

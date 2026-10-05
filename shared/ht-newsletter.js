/* HoovyTube newsletter panel (design system v2) - load on every page:
     <script defer src="/shared/ht-newsletter.js?v=20"></script>
   Predictable and non-blocking:
     - Never shows on the first screen. It appears once per browser session, only after the visitor has
       scrolled past ~1.5 screens (or 45% of the page), as a compact panel bottom-right (bottom sheet on phones).
       It hides again if they scroll back up to the first screen.
     - Closing it counts as "no thanks": localStorage 'ht-newsletter-dismissed' stops auto-showing for 30 days.
     - Subscribing (localStorage 'htnews:sub' = '1') stops it for good.
     - Opens on request at any time: links to #newsletter, or any element with [data-newsletter-open].
       window.HTNewsletter.open() also works.                                                            */
(function () {
  'use strict';
  var SUPABASE_URL = 'https://iglbfojatowaxbhjubvz.supabase.co';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlnbGJmb2phdG93YXhiaGp1YnZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMzgyODUsImV4cCI6MjEwMTYxNDI4NX0.H7EeaGn3qQGn6pwFnDI_QRFW3uILnwDaWB54pUbWv6g';
  var DISMISS_KEY = 'ht-newsletter-dismissed', SUB_KEY = 'htnews:sub', SHOWN_KEY = 'htnews:shown';
  var DISMISS_DAYS = 30;

  function get(store, k) { try { return window[store].getItem(k); } catch (e) { return null; } }
  function set(store, k, v) { try { window[store].setItem(k, v); } catch (e) {} }

  function subscribed() { return get('localStorage', SUB_KEY) === '1'; }
  function dismissed() {
    var v = get('localStorage', DISMISS_KEY);
    if (!v) return false;
    var t = parseInt(v, 10);
    if (!t || t < 1e11) return true;                       // legacy / test flag like '1' = dismissed
    return (Date.now() - t) < DISMISS_DAYS * 864e5;
  }

  var pop = null, isOpen = false, explicit = false;

  function build() {
    pop = document.createElement('div');
    pop.className = 'htnews';
    pop.id = 'htNewsletter';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-labelledby', 'hnTitle');
    pop.innerHTML =
      '<button class="hn-close" type="button" aria-label="Close newsletter signup">&#215;</button>' +
      '<div class="hn-head"><img src="/assets/icons/contact.png" alt="" width="40" height="40"><h3 id="hnTitle">Stay in the loop</h3></div>' +
      '<p>New videos, asset drops and HoovyTools updates, straight to your inbox. No spam.</p>' +
      '<form class="hn-form" novalidate>' +
        '<label class="sr-only" for="hnEmail">Email address</label>' +
        '<input id="hnEmail" type="email" placeholder="you@example.com" autocomplete="email" required>' +
        '<input type="text" name="company" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">' +
        '<button class="btn btn-primary btn-sm hn-submit" type="submit">Subscribe</button>' +
        '<div class="hn-msg" role="status" aria-live="polite"></div>' +
      '</form>';
    document.body.appendChild(pop);

    var form = pop.querySelector('.hn-form');
    var input = pop.querySelector('#hnEmail');
    var honey = pop.querySelector('input[name=company]');
    var submit = pop.querySelector('.hn-submit');
    var msg = pop.querySelector('.hn-msg');

    pop.querySelector('.hn-close').addEventListener('click', function () {
      if (!subscribed()) set('localStorage', DISMISS_KEY, String(Date.now()));
      close();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      msg.textContent = ''; msg.className = 'hn-msg';
      var email = (input.value || '').trim();
      if (!email || email.indexOf('@') < 1) { msg.textContent = 'Please enter your email.'; msg.className = 'hn-msg err'; input.focus(); return; }
      if (honey.value) return;
      submit.disabled = true; submit.textContent = 'Subscribing...';
      fetch(SUPABASE_URL + '/functions/v1/newsletter-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: 'Bearer ' + ANON },
        body: JSON.stringify({ email: email, source: 'popup:' + location.pathname })
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) { return { ok: res.ok, data: data }; });
      }).then(function (r) {
        if (r.ok) {
          set('localStorage', SUB_KEY, '1');
          msg.textContent = "You're in - thanks!"; msg.className = 'hn-msg ok';
          form.reset();
          setTimeout(close, 2400);
        } else {
          msg.textContent = (r.data && r.data.error) || 'Could not subscribe. Please try again.'; msg.className = 'hn-msg err';
        }
      }).catch(function () {
        msg.textContent = 'Network error. Please try again.'; msg.className = 'hn-msg err';
      }).then(function () { submit.disabled = false; submit.textContent = 'Subscribe'; });
    });
  }

  function open(byUser) {
    if (!pop) build();
    explicit = !!byUser;
    if (isOpen) { if (byUser) pop.querySelector('#hnEmail').focus(); return; }
    isOpen = true;
    pop.classList.add('open');
    if (byUser) setTimeout(function () { var i = pop.querySelector('#hnEmail'); if (i) i.focus(); }, 60);
  }
  function close() {
    if (!pop) return;
    isOpen = false; explicit = false;
    pop.classList.remove('open');
  }

  /* explicit requests: #newsletter links, [data-newsletter-open], hash on load */
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-newsletter-open], a[href="#newsletter"], a[href="/#newsletter"]');
    if (!t) return;
    if (t.matches('a[href="/#newsletter"]') && location.pathname !== '/') return; // let it navigate home, hash opens there
    e.preventDefault();
    open(true);
  });
  window.addEventListener('hashchange', function () { if (location.hash === '#newsletter') open(true); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen) close(); });

  function start() {
    if (location.hash === '#newsletter') { open(true); return; }
    if (subscribed() || dismissed() || get('sessionStorage', SHOWN_KEY) === '1') return;

    var ticking = false, armed = true;
    function check() {
      ticking = false;
      var y = window.scrollY || 0, vh = window.innerHeight || 800;
      var max = Math.max(1, document.documentElement.scrollHeight - vh);
      var deep = y > vh * 1.5 || (y / max) > 0.45;
      if (armed && deep && y > vh) {
        armed = false;
        set('sessionStorage', SHOWN_KEY, '1');
        open(false);
      } else if (isOpen && !explicit && y < vh * 0.9) {
        close();
      }
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(check); } }, { passive: true });
  }

  window.HTNewsletter = { open: function () { open(true); }, close: close };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

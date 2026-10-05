/* /blog/ (Journal) page script. Renders the post list and single posts from window.HT_POSTS (/blog/posts.js)
   into <main id="main"> using design-system v2 markup only (ht.css). Routes: /blog/ and /blog/#/ = list,
   /blog/#/<slug> = post. Other hashes (#main, #newsletter...) are anchors and never re-render the page.
   Load with defer BEFORE /shared/ht-ui.js so the first render is in place when reveal boots. */
(function () {
  'use strict';
  var doc = document;
  var main = doc.getElementById('main');
  if (!main) return;

  var JOIN = 'https://www.patreon.com/c/hoovytube308/membership';
  var SHOP = 'https://www.patreon.com/HoovyTube308/shop';
  var EXT = ' target="_blank" rel="noopener"';
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var POSTS = (window.HT_POSTS || [])
    .filter(function (p) { return p && p.slug && p.title && !p.is_archived; })
    .sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });

  /* ------------------------------------------------------------ helpers */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // [text](url) -> link. Runs on already-escaped text. On-site links stay on the site (root-relative).
  function linkify(s) {
    return s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, text, url) {
      url = url.replace(/^https?:\/\/(www\.)?hoovytube\.com(?=\/|$)/i, '') || '/';
      var ext = /^https?:\/\//i.test(url);
      return '<a href="' + url + '"' + (ext ? EXT : '') + '>' + text + '</a>';
    });
  }
  function fmtDate(iso, short) {
    var p = String(iso || '').split('-');
    if (p.length !== 3) return esc(iso || '');
    var m = MONTHS[(+p[1]) - 1] || '';
    return (+p[2]) + ' ' + (short ? m.slice(0, 3) : m) + ' ' + p[0];
  }
  function plain(body) {
    return (body || []).map(function (b) { return typeof b === 'string' ? b : (b.quote || b.h || ''); }).join(' ');
  }
  function minutes(post) {
    var words = plain(post.body).replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 220));
  }
  function tagsHtml(post) {
    return (post.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('');
  }
  function metaHtml(post, short) {
    return '<p class="meta"><time datetime="' + esc(post.date) + '">' + fmtDate(post.date, short) + '</time>' +
      '<span>' + minutes(post) + ' min read</span>' + tagsHtml(post) + '</p>';
  }
  function postUrl(post) { return location.origin + location.pathname + '#/' + encodeURIComponent(post.slug); }
  function patreonBtn(label, size) {
    return '<a class="btn btn-patreon' + (size ? ' ' + size : '') + '" href="' + JOIN + '"' + EXT + '>' +
      '<img class="btn-icon" src="/assets/icons/forged/patreon.png" alt="" width="28" height="28">' + esc(label) + '</a>';
  }
  function section(inner, cls, id) {
    return '<section class="section' + (cls ? ' ' + cls : '') + '"' + (id ? ' id="' + id + '"' : '') + '><div class="container">' + inner + '</div></section>';
  }

  /* ---------------------------------------------------- shared blocks */
  function upsell() {
    return '<aside class="upsell" aria-label="Patreon membership">' +
      '<img class="upsell-art" src="/assets/icons/forged/badge-patreon.png" alt="" width="108" height="142" loading="lazy">' +
      '<div class="upsell-body">' +
        '<span class="eyebrow eyebrow-patreon">Support HoovyTube</span>' +
        '<h2 class="upsell-title">Like the free tools? The asset library is on Patreon</h2>' +
        '<p>HoovyTools, the tutorials and the Workshop items are free. The SFM asset library, <mark class="hl">900+ particle effects</mark>, 600+ animations and 30+ scenebuilds, sorted and previewed, is on <a class="hl-patreon" href="' + JOIN + '"' + EXT + '>Patreon</a> in three tiers; memberships start at $20/month. ' +
        'Want just one pack? Single packs are in the <a class="hl-patreon no-icon" href="' + SHOP + '"' + EXT + '>Patreon shop</a>.</p>' +
      '</div>' +
      '<div class="upsell-actions">' + patreonBtn('Join from $20/month') +
        '<a class="btn btn-ghost btn-sm" href="/products/">Compare the tiers</a></div>' +
    '</aside>';
  }
  function explore() {
    function card(href, icon, title, tag, text, attrs) {
      return '<a class="item-card" href="' + href + '"' + (attrs || '') + '>' +
        '<img class="item-icon" src="' + icon + '" alt="" width="56" height="56" loading="lazy">' +
        '<div class="item-body"><h3 class="item-title">' + title + '</h3>' +
        (tag ? '<p class="item-meta">' + tag + '</p>' : '') +
        '<p class="item-desc">' + text + '</p></div></a>';
    }
    var free = '<span class="tag tag-free">Free</span>';
    return '<header class="section-head"><span class="eyebrow eyebrow-olive">Free on HoovyTube</span><h2>Keep exploring</h2>' +
      '<p class="lead">The things the journal writes about, ready to use.</p></header>' +
      '<div class="grid grid-4 j-explore">' +
        card('/hoovytools/', '/assets/icons/forged/blender-addon.png', 'HoovyTools', free, 'Blender add-ons: whole SFM sessions into Blender, and .pcf particles as live geometry nodes.') +
        card('/learn/', '/assets/icons/forged/graduation.png', 'Tutorials', free, 'SFM and Blender tutorials, sorted Easy, Medium and Hard.') +
        card('/workshop/', '/assets/icons/forged/steam.png', 'Steam Workshop', free, 'Free SFM particle packs, models and free trials of the Patreon packs.') +
        card('#newsletter', '/assets/icons/forged/journal.png', 'Newsletter', free, 'New videos, asset drops and HoovyTools updates by email. No spam.', ' data-newsletter-open') +
      '</div>';
  }

  /* Per-route meta: the post routes share /blog/index.html, so keep the description and og/twitter text in step */
  function metaEl(sel) { return doc.querySelector(sel); }
  var META = {
    desc: metaEl('meta[name="description"]'), ogTitle: metaEl('meta[property="og:title"]'), ogDesc: metaEl('meta[property="og:description"]'),
    twTitle: metaEl('meta[name="twitter:title"]'), twDesc: metaEl('meta[name="twitter:description"]')
  };
  var META0 = {};
  Object.keys(META).forEach(function (k) { if (META[k]) META0[k] = META[k].getAttribute('content'); });
  function setMeta(title, desc) {
    if (META.desc) META.desc.setAttribute('content', desc || META0.desc);
    if (META.ogDesc) META.ogDesc.setAttribute('content', desc || META0.ogDesc);
    if (META.twDesc) META.twDesc.setAttribute('content', desc || META0.twDesc);
    if (META.ogTitle) META.ogTitle.setAttribute('content', title || META0.ogTitle);
    if (META.twTitle) META.twTitle.setAttribute('content', title || META0.twTitle);
  }

  /* ------------------------------------------------------------- list */
  function renderIndex() {
    doc.title = 'Journal - HoovyTube';
    setMeta(null, null);
    var latest = POSTS[0];
    var html = section(
      '<div class="panel page-hero">' +
        '<div class="page-hero-text">' +
          '<span class="eyebrow">Journal</span>' +
          '<h1 tabindex="-1">Notes from behind the tools</h1>' +
          '<p class="lead">Essays on making things, giving them away, and the shoulders worth standing on. Written in my own amateurish way.</p>' +
          '<div class="btn-row">' + patreonBtn('Support HoovyTube on Patreon', 'btn-lg') +
            (latest ? '<a class="btn btn-secondary btn-lg" href="#/' + esc(latest.slug) + '">Read the latest post</a>' : '') + '</div>' +
          '<p class="page-hero-note">HoovyTools and the tutorials are free. If you want to support HoovyTube, the SFM asset library is on <a class="hl-patreon" href="/products/">Patreon</a>; memberships start at $20/month.</p>' +
        '</div>' +
        '<div class="page-hero-media"><img class="page-hero-art is-icon" src="/assets/icons/forged/journal.png" alt="" width="256" height="256"></div>' +
      '</div>', 'j-hero');

    if (!latest) {
      html += section('<div class="panel text-center"><p>No posts yet. Join the newsletter for updates.</p>' +
        '<div class="btn-row center"><button class="btn btn-primary" type="button" data-newsletter-open>Join the newsletter</button></div></div>');
    } else {
      html += section(
        '<a class="panel j-feature" href="#/' + esc(latest.slug) + '">' +
          (latest.cover ? '<div class="card-media"><img src="' + esc(latest.cover) + '" alt="" width="1280" height="720"></div>' : '') +
          '<div class="j-feature-body">' +
            '<span class="eyebrow">Latest post</span>' +
            '<h2 class="j-feature-title">' + esc(latest.title) + '</h2>' +
            '<p class="lead">' + esc(latest.dek || '') + '</p>' +
            metaHtml(latest) +
            '<span class="btn btn-primary">Read the post</span>' +
          '</div>' +
        '</a>', '', 'latest');

      var rest = POSTS.slice(1);
      if (rest.length) {
        html += section(
          '<header class="section-head"><span class="eyebrow">Archive</span><h2>More writing</h2></header>' +
          '<div class="grid grid-2">' + rest.map(function (p) {
            return '<a class="card" href="#/' + esc(p.slug) + '">' +
              (p.cover ? '<div class="card-media"><img src="' + esc(p.cover) + '" alt="" loading="lazy" width="1280" height="720"></div>' : '') +
              metaHtml(p, true) +
              '<h3 class="card-title">' + esc(p.title) + '</h3>' +
              '<p class="card-text">' + esc(p.dek || '') + '</p></a>';
          }).join('') + '</div>', '', 'archive');
      } else {
        html += section(
          '<div class="panel panel-sm callout">' +
            '<img class="callout-icon" src="/assets/icons/forged/script.png" alt="" width="64" height="64" loading="lazy">' +
            '<div><h2 class="callout-title">More posts are on the way</h2>' +
            '<p>Join the newsletter for new videos, asset drops and HoovyTools updates.</p>' +
            '<div class="btn-row"><button class="btn btn-secondary btn-sm" type="button" data-newsletter-open>Join the newsletter</button></div></div>' +
          '</div>');
      }
    }
    html += section(upsell());
    html += section(explore());
    main.innerHTML = html;
  }

  /* ------------------------------------------------------------- post */
  function bodyHtml(post) {
    return (post.body || []).map(function (b) {
      if (typeof b === 'string') return '<p>' + linkify(esc(b)) + '</p>';
      if (!b) return '';
      if (b.h) return '<h2>' + esc(b.h) + '</h2>';
      if (b.quote) return '<blockquote><p>' + linkify(esc(b.quote)) + '</p></blockquote>';
      if (b.note) return '<div class="notice" role="note"><img src="/assets/icons/forged/script.png" alt="" width="28" height="28"><p>' + linkify(esc(b.note)) + '</p></div>';
      return '';
    }).join('');
  }

  function renderPost(post) {
    doc.title = post.title + ' - HoovyTube Journal';
    setMeta(doc.title, post.dek || null);
    var i = POSTS.indexOf(post), newer = POSTS[i - 1], older = POSTS[i + 1];
    var share = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(post.title) + '&url=' + encodeURIComponent(postUrl(post));

    var html = section(
      '<header class="panel page-hero">' +
        '<div class="page-hero-text">' +
          '<span class="eyebrow">Journal</span>' +
          '<h1 tabindex="-1">' + esc(post.title) + '</h1>' +
          (post.dek ? '<p class="lead">' + esc(post.dek) + '</p>' : '') +
          metaHtml(post) +
          '<div class="btn-row">' + patreonBtn('Support HoovyTube on Patreon', 'btn-lg') +
            '<a class="btn btn-ghost" href="#/">All posts</a></div>' +
        '</div>' +
        (post.cover ? '<div class="page-hero-media"><figure class="screen">' +
          '<div class="screen-media"><img src="' + esc(post.cover) + '" alt="' + esc(post.coverAlt || '') + '" width="1280" height="720"></div>' +
          (post.coverCaption ? '<figcaption class="screen-cap"><span class="screen-dot"></span>' + esc(post.coverCaption) + '</figcaption>' : '') +
        '</figure></div>' : '') +
      '</header>', 'j-post-hero');

    html += section(
      '<div class="j-layout">' +
        '<article class="panel j-article" aria-label="' + esc(post.title) + '">' +
          '<div class="prose j-prose">' + bodyHtml(post) + '</div>' +
        '</article>' +
        '<aside class="j-side flow" aria-label="About this post">' +
          '<div class="panel panel-sm">' +
            '<h2 class="h4">About this post</h2>' +
            '<dl class="j-facts">' +
              '<dt>Published</dt><dd><time datetime="' + esc(post.date) + '">' + fmtDate(post.date) + '</time></dd>' +
              '<dt>Reading</dt><dd>' + minutes(post) + ' min</dd>' +
              ((post.tags || []).length ? '<dt>Tags</dt><dd><span class="tags">' + tagsHtml(post) + '</span></dd>' : '') +
            '</dl>' +
            '<div class="btn-row">' +
              '<button class="btn btn-secondary btn-sm" type="button" data-copy-text="' + esc(postUrl(post)) + '" data-copy-done="Link copied">Copy link</button>' +
              '<a class="btn btn-secondary btn-sm" href="' + esc(share) + '"' + EXT + '>Post on X</a>' +
              '<a class="btn btn-ghost btn-sm" href="#/">All posts</a>' +
            '</div>' +
          '</div>' +
          '<div class="panel panel-patreon panel-sm j-side-cta">' +
            '<h2 class="h4">Support HoovyTube</h2>' +
            '<p>HoovyTools, the tutorials and the Workshop items are free. The SFM asset library, 900+ particle effects, 600+ animations and 30+ scenebuilds, is on <a class="hl-patreon" href="/products/">Patreon</a> in three tiers.</p>' +
            '<a class="btn btn-patreon btn-block" href="' + JOIN + '"' + EXT + '>Join from $20/month</a>' +
          '</div>' +
        '</aside>' +
      '</div>', 'j-post-body');

    html += section(upsell());

    var nav = '';
    if (newer || older) {
      nav = '<div class="grid grid-2 j-postnav">' +
        (older ? '<a class="card" href="#/' + esc(older.slug) + '"><p class="meta">Older post</p><h3 class="card-title">' + esc(older.title) + '</h3></a>' : '<div></div>') +
        (newer ? '<a class="card is-next" href="#/' + esc(newer.slug) + '"><p class="meta">Newer post</p><h3 class="card-title">' + esc(newer.title) + '</h3></a>' : '') +
      '</div>';
    }
    html += section((nav ? '<header class="section-head"><span class="eyebrow">Journal</span><h2>Keep reading</h2></header>' + nav : '') + explore());
    main.innerHTML = html;
  }

  /* ----------------------------------------------------------- router */
  var current = null;
  function viewFor(hash) {
    if (hash && hash.charAt(1) === '/') {
      var slug = decodeURIComponent(hash.slice(2)).trim();
      var post = slug && POSTS.filter(function (p) { return p.slug === slug; })[0];
      return post ? { key: 'post:' + post.slug, post: post } : { key: 'list' };
    }
    return { key: 'list' };
  }
  function render(first) {
    var hash = location.hash || '';
    // Plain anchors (#main, #latest, #newsletter) are in-page jumps, not routes.
    if (!first && hash && hash.charAt(1) !== '/') return;
    var v = viewFor(hash);
    if (v.key === current) return;
    current = v.key;
    if (v.post) renderPost(v.post); else renderIndex();
    if (first) return;
    window.scrollTo(0, 0);
    if (window.HTUI) window.HTUI.refresh(main);
    var h1 = main.querySelector('h1');
    if (h1) h1.focus({ preventScroll: true });
  }
  window.addEventListener('hashchange', function () { render(false); });

  // The skip link targets #main: jump without touching the hash, so it never collides with the post routes.
  doc.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a.skip-link, a[href="#main"]');
    if (!a) return;
    e.preventDefault();
    if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
    main.focus({ preventScroll: true });
    main.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  });

  render(true);
})();

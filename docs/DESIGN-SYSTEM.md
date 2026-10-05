# HoovyTube design system v2: "glossy die-cut"

Every surface looks like the forged TF2-style icons in `/assets/icons/forged/`: a **cream** (light theme) or **deep slate** (dark theme) plate, a **thick slate outline**, a **hard depth edge** offset straight down, a **glossy top band** (bright rim, soft horizon about 2.5rem down) with an inset rim light, and a soft ambient shadow. **Olive item-badge** plates are the secondary accent. **Patreon Rust** is used for Patreon and nothing else.

| What | Where |
|---|---|
| Stylesheet (tokens + all components) | `/styles/ht.css?v=20` |
| Dock, theme, search, message modal, Patreon CTA band, footer | `/shared/ht-nav.js?v=20` |
| Reveal, count-up, filter chips, video play, YouTube facade, accordion, copy | `/shared/ht-ui.js?v=20` |
| Newsletter panel | `/shared/ht-newsletter.js?v=20` |
| Live styleguide: every component, both themes, exact markup with Copy buttons | `/styleguide/` (noindex, not in the dock) |
| Self-hosted fonts (OFL) | `/assets/fonts/` (Inter 400/400i/500/600/700/800, Lilita One) |
| Default social image 1200x630 | `/assets/og/og-default.jpg` (source: `/assets/og/src/og-default.html`) |
| Icons | `/assets/icons/forged/*.png` (256px), dock icons `/assets/icons/*.png` (128px) |
| Not-found page (served by GitHub Pages for every unknown path) | `/404.html` |
| `/patreon/` alias (forwards to `/products/`, keeps the `#hash`) | `/patreon/index.html` |

No Google Fonts, no Tailwind on public pages. Everything ships as static files.

---

## 1. Rules checklist (from the site owner)

Run through this before you call a page done.

1. **Clean, predictable UI.** Same dock, same footer, same component shapes and the same spacing rhythm on every page. Build pages only from the components below. Never add your own margins between blocks (section 3.4). Motion is subtle (fade/raise on reveal, gentle hover lift) and switches off under `prefers-reduced-motion`. No magnify docks, cursor drift, parallax or auto-advancing carousels.
2. **Glossy die-cut panels.** Use `.panel` and its variants. Don't invent new surface styles, gradients or shadows in page CSS.
3. **No floating text.** Every heading, eyebrow, paragraph, caption, footnote, stat and label sits on a panel, plate, chip, button or table. The page background never carries text, and text never sits on video or images (captions go in `.screen-cap` on the bezel). Section titles go in `.section-head`.
4. **Every page sells Patreon:**
   - (a) a Patreon CTA (`.btn-patreon`) in the first screen / hero panel;
   - (b) at least **two** inline `a.hl-patreon` links in body copy;
   - (c) one **page-relevant** `.upsell` panel;
   - (d) the sitewide CTA band, which `ht-nav.js` injects automatically (don't remove it).
   - Patreon Rust (`--patreon*`, `.btn-patreon`, `.panel-patreon`, `.eyebrow-patreon`, `.tag-patreon`, `a.hl-patreon`, `.dock-patreon`, `badge-patreon.png`) is used **only** for Patreon.
   - **Price wording.** The $20 tier is All Particles only; the 600+ animations are in the $30 tier. Never pair "the whole/full library", "all of it" or the 600+ animations with "$20". Standard sentence: "The library (900+ particle effects, 600+ animations, 30+ scenebuilds) is on Patreon; memberships start at $20/month." Price format is always "from $20/month" (never "/mo").
   - **No funding claims.** Nothing in the research says Patreon revenue funds the free tools, and the journal says the paid packs aren't load-bearing for them. Support framing stays neutral: "HoovyTools is free, with no paywall. If it saves you time, the asset library on Patreon is the way to support HoovyTube." The Patreon CTA label is "Support HoovyTube on Patreon", never "Support the free tools".
   - The one exception is `/icon-forge/`, an internal `noindex` tool. It carries the CTA band and a Patreon line in its hero, but no hero button and no upsell.
5. **Facts only**, from `research/site-facts.md`, `workshop.json` and `patreon.json`. No invented prices, counts, ratings, download numbers, testimonials, reviews, guarantees or features. If something is uncertain, leave it out or word it neutrally (see section 10).
6. **Privacy.** Never show the creator's real name, age, city/country or other personal details. Remove any line that states or lets a reader work out the creator's age (an age in years, "since I was <age>", "<n> years ago, at the fork where most people choose to study...") and rephrase without ages ("since I was a kid", "the better part of a decade").
7. **Both themes polished, 390px with zero horizontal overflow, zero console errors** (including 404s for missing images).

Links (use exactly; external links get `target="_blank" rel="noopener"`):

| | URL |
|---|---|
| Join / tiers | `https://www.patreon.com/c/hoovytube308/membership` |
| Patreon shop (single packs) | `https://www.patreon.com/HoovyTube308/shop` |
| Patreon profile | `https://www.patreon.com/HoovyTube308` |
| Steam Workshop profile | `https://steamcommunity.com/id/HoovyTube/myworkshopfiles/` |
| Workshop item | `https://steamcommunity.com/sharedfiles/filedetails/?id=<id>` |
| YouTube | `https://www.youtube.com/@HoovyTube` |
| On-site Patreon page | `/products/` (`/patreon/` forwards there; always link `/products/`) |
| On-site Workshop page | `/workshop/` |

---

## 2. Page skeleton

Copy this for every page. The theme script must stay inline in `<head>` (before first paint). Asset versions are exactly `?v=20`.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page name - HoovyTube</title>
  <meta name="description" content="One factual sentence about this page.">
  <link rel="canonical" href="https://hoovytube.com/page/">
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="HoovyTube">
  <meta property="og:url" content="https://hoovytube.com/page/">
  <meta property="og:title" content="Page name - HoovyTube">
  <meta property="og:description" content="One factual sentence about this page.">
  <meta property="og:image" content="https://hoovytube.com/assets/og/og-default.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="HoovyTube - SFM assets, Blender add-ons and free tutorials">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Page name - HoovyTube">
  <meta name="twitter:description" content="One factual sentence about this page.">
  <meta name="twitter:image" content="https://hoovytube.com/assets/og/og-default.jpg">
  <link rel="preload" href="/assets/fonts/inter-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/inter-latin-600-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/inter-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/inter-latin-800-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/lilita-one-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/styles/ht.css?v=20">
  <script>(function(){try{var t=localStorage.getItem('ht-theme')}catch(e){}if(t!=='light'&&t!=='dark')t=window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.setAttribute('data-theme',t)})();</script>
  <!-- optional: <style> for page-only layout. Never redefine tokens or component looks here. -->
</head>
<body>
  <!-- ht-nav.js injects the skip link + the dock here (no markup needed) -->
  <main id="main">
    <section class="section">
      <div class="container">
        <div class="panel page-hero"> ...eyebrow, h1, lead, Patreon CTA + one secondary, media... </div>
      </div>
    </section>

    <section class="section" id="something">
      <div class="container">
        <header class="section-head">
          <span class="eyebrow">Eyebrow</span>
          <h2>Section title</h2>
          <p class="lead">One line on what this section shows.</p>
        </header>
        ...components, stacked straight inside .container (spacing is automatic)...
      </div>
    </section>

    <!-- one page-relevant .upsell somewhere in <main> -->
  </main>
  <!-- ht-nav.js inserts the Patreon CTA band here; opt out only with <body data-no-cta> -->
  <footer class="site"></footer>
  <script defer src="/shared/ht-nav.js?v=20"></script>
  <script defer src="/shared/ht-ui.js?v=20"></script>
  <script defer src="/shared/ht-newsletter.js?v=20"></script>
</body>
</html>
```

Notes:
- Do **not** hard-code `data-theme` on `<html>`. The script sets it to the stored choice or, without one, the OS preference. Without JS, CSS still follows `prefers-color-scheme`.
- Sections must be **direct children of `<main>`** (reveal animation) and hold one `.container` (block rhythm). `.container` is a plain block box: put a `.grid`, `.split` or `.bento` *inside* it, never make the container itself a grid or flex box.
- Sections can be any height. Reveal works for a 30-item catalogue or a long journal post (a block shows as soon as its top edge enters the viewport, with a failsafe). Splitting very long content into several `<section>`s is still nicer to read; `data-no-reveal` is only for blocks that should never animate.
- Keep page `<style>` blocks to layout glue (a grid template, a max-width). Visual styling and spacing between blocks come from `ht.css`.
- Inline page scripts must null-check what they query. The shared scripts are `defer`red and run after inline scripts.
- `body` already has `padding-top: var(--dock-space)` for the fixed dock. Don't add top spacing for it.
- Every URL in a page must be root-absolute (`/assets/...`, `/products/`), so the same markup also works when GitHub Pages serves it from `/404.html` at an unknown path.

### Theme mechanics
- Stored choice: `localStorage['ht-theme']` = `light` | `dark`, set by the sun button (`#htThemeToggle`) in the dock.
- No stored choice: follow `prefers-color-scheme`, and keep following live OS changes (handled in `ht-nav.js`).
- CSS: light tokens on `:root` / `:root[data-theme="light"]`; dark tokens on `:root[data-theme="dark"]` and inside `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {...} }`.
- To test: `localStorage.removeItem('ht-theme')` returns a browser to "follow the OS".

---

## 3. Tokens

### 3.1 Brand constants (identical in both themes)

| Token | Value | Use |
|---|---|---|
| `--patreon` / `--patreon-hi` | `#b9432a` | **Patreon Rust**, the fill (top of the fill gradient = base). `#fff6e8` on it = 5.0:1 |
| `--patreon-lo` | `#a33a21` | bottom of Patreon fills (6.1:1) |
| `--patreon-deep` | `#6c2212` | outline on Patreon fills |
| `--patreon-depth` | `#45140a` | hard depth edge on Patreon fills |
| `--patreon-ink` | `#fff6e8` | text on Patreon fills |
| `--olive-hi` / `--olive-lo` | `#546b42` / `#475c3b` | olive item-badge fill (`#fbf8dc` on `-hi` = 5.5:1) |
| `--olive-rim` / `--olive-depth` | `#2d4430` / `#16261a` | olive outline / depth |
| `--olive-frame` | `#cfe2a8` | inner frame line on olive |
| `--olive-ink` | `#fbf8dc` | text on olive (4.9:1+ including the sheen band) |
| `--gold` / `--gold-hi` / `--gold-ink` | `#f2cb5c` / `#f8dc84` / `#1b2a3a` | highlighter, "New" tag, selection |
| `--cream` / `--cream-hi` | `#f3e7cc` / `#fcf6ea` | fixed cream (buttons and the focus ring inside coloured plates, stickers) |
| `--slate` / `--slate-deep` | `#22364a` / `#0a131d` | fixed slate ink / outline |
| `--screen-hi` / `--screen-lo` | `#2c4157` / `#18273a` | media bezel (same in both themes) |

### 3.2 Theme tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` / `--bg-2` | `#c8d2dc` / `#e0e7ed` | `#121d29` / `#1d2c3c` | page background (+ radial glow) |
| `--plate-hi` / `--plate-lo` | `#f6ead3` / `#ebdcbe` | `#2b4158` / `#213448` | panel gradient |
| `--plate` | `#f1e3c9` | `#263a50` | flat plate tone (tooltips, small fills) |
| `--inset` | `#e6d7b8` | `#1a2a3b` | sunken surface inside a plate, inputs |
| `--sheen` / `--sheen-mid` | white 75% / 38% | white 8% / 4% | the glossy top band of every plate (rim → soft horizon at 2.3–2.75rem) |
| `--rim-light` | white 95% | white 16% | 2px inset highlight along the top edge |
| `--text` | `#22364a` | `#f0e6ca` | body text (9.1:1+ / 6.6:1+) |
| `--text-muted` | `#46566a` | `#b9c6d3` | secondary text (5.3:1+ / 4.8:1+) |
| `--heading` | `#1c3044` | `#f8eed4` | headings |
| `--outline` | `#586577` | `#64748a` | thick die-cut outline. Dark uses a light slate like the forged icons, so plates keep their cut edge (3.6:1 on `--bg`) |
| `--depth-color` | `#3b3a46` | `#343846` | hard depth edge |
| `--screen-outline` | `#0a131d` | `#64748a` | outline of `.screen` bezels |
| `--line` | slate 26% | slate-grey 18% | hairlines inside plates |
| `--invert-hi` / `--invert-lo` | `#2f465d` / `#21354a` | `#f8eedb` / `#e7d6b2` | `.panel-invert` (slate in light, cream in dark) |
| `--invert-text` / `--invert-muted` | `#f3e9cf` / `#b9c6d2` | `#1f3246` / `#44546a` | text on inverted plates |
| `--invert-outline` / `--invert-depth` | `#142333` / `#0b1520` | `#64748a` / `#343846` | inverted plate edge |
| `--primary-hi` / `--primary-lo` / `--primary-ink` | `#456a91` / `#34567a` / `#fff6e8` | `#f7ebcf` / `#e2cea2` / `#1c3044` | primary buttons, eyebrows, pressed chips, step tokens |
| `--secondary-hi` / `--secondary-lo` / `--secondary-ink` | `#fffaf0` / `#eadbbb` / `#22364a` | `#3a5570` / `#2b425a` / `#f3e9cf` | default buttons, chips, social chips |
| `--link` | `#2c5683` | `#a6ccf2` | plain links |
| `--focus` | `#1f63b5` | `#8cc4ff` | 3px focus ring |
| `--patreon-text` | `#94301a` | `#ffa47c` | `a.hl-patreon` text on plates |
| `--patreon-tint` / `--patreon-tint-strong` | rust 10% / 14% | deep rust `rgba(90,26,12)` 32% / 50% | `a.hl-patreon` swipe / its hover. In dark the swipe *darkens* the plate, so the text gains contrast |
| `--hl-bg` / `--hl-ink` | `#f5d36b` / `#1b2a3a` | `#f2cb5c` / `#1b2a3a` | `mark.hl` |
| `--ok` / `--err` | `#276b3d` / `#a3264f` | `#86d6a0` / `#ff93b4` | form messages (err is deliberately not rust) |
| `--check-rim` | `#2d4430` | `#9bb37e` | rim of the olive tick tokens (`.check-list`, `.tier-points`, `table.compare .yes`): the light rim keeps the tick visible on the dark plate |
| `--compare-featured` | rust 10% | light rust `rgba(255,164,124)` 9% | wash on `table.compare .col-featured` (plus a 2px rust edge on both sides of the column) |
| `--code-bg` / `--code-text` | `#1b2a3a` / `#f0e6ca` | `#0b141e` / `#f0e6ca` | `.code-block`, `.prose pre` |

**Contrast.** Every text style passes WCAG AA (4.5:1) in both themes, measured on rendered pixels under each text run (10th percentile), including the gloss bands, the `hl-patreon` swipe and hover states. Buttons keep their gloss in a band across the top quarter (`--btn-gloss`), never under the label.

**Automatic remaps.** Components keep their contrast on coloured plates because these plates redefine tokens for their contents:
- `.panel-invert`: `--text`, `--text-muted`, `--heading`, `--link`, `--focus`, `--line`, `--inset`, `--primary-*`, `--patreon-text`, `--patreon-tint`, `--patreon-tint-strong`.
- `.panel-olive` and `.panel-patreon`: `--text`, `--text-muted`, `--heading`, `--link`, `--line`, `--inset`, and `--focus` → cream (`--cream-hi`), so focus rings show on rust and olive (the sitewide CTA band included). Their own button flips to cream, and `a.hl-patreon` gets a solid rust (olive plate) or deep-rust (rust plate) swipe.
- `.screen` and `.code-block` (dark in both themes): `--focus` → `#8cc4ff`, `--link` → `#a6ccf2`.

Legacy names (`--panel`, `--panel-2`, `--muted`, `--accent`, `--accent-ink`, `--glow`...) still resolve for old page CSS; don't use them in new markup.

### 3.3 Type

- Fonts: `--font-display` = **Lilita One** (headings, prices, stat numbers, wordmark); `--font-body` = **Inter** 400/500/600/700/800 (+400 italic); `--font-mono` system mono; `--font-serif` Georgia (journal prose, if wanted).
- Fluid scale: `--fs-xs .75rem`, `--fs-sm .875rem`, `--fs-base clamp(1rem…1.0625rem)`, `--fs-lg clamp(1.075rem…1.25rem)`, `--fs-h4 clamp(1.1…1.25rem)`, `--fs-h3 clamp(1.25…1.6rem)`, `--fs-h2 clamp(1.7…2.6rem)`, `--fs-h1 clamp(2.15…3.75rem)`, `--fs-display clamp(2.6…5.25rem)`.
- `h1`–`h4` (and `.h1`–`.h4`) use Lilita One automatically. `.display` for hero titles only. `.lead` for the intro line under a heading.
- Line heights: `--lh-tight 1.06`, `--lh-snug 1.3`, `--lh-body 1.62`.

### 3.4 Spacing, rhythm, layout, shape, motion

- Spacing: `--s-1 .25rem`, `--s-2 .5rem`, `--s-3 .75rem`, `--s-4 1rem`, `--s-5 1.5rem`, `--s-6 2rem`, `--s-7 3rem`, `--s-8 4rem`, `--s-9 6rem`.
- Rhythm tokens: `--gutter` 16px→32px (page sides), `--gap` 1rem→1.5rem (grids), `--flow-gap` = `--gap` + `--depth` (between stacked blocks), `--section-space` 2.5rem→4.75rem (between sections; each `.section` pads half of it top and bottom), `--panel-pad` 1.15rem→2.25rem, `--panel-pad-sm` .9rem→1.25rem.
- **Block rhythm (automatic).** Every block stacked straight inside a section's `.container` (panel, upsell, notice, callout, table, screen, code block, grid, FAQ...) is spaced by `--flow-gap`: exactly one `--gap` of clear space below the previous block's depth edge, the same as between grid rows. After a wrapper whose children already reserve their depth edge (`.grid`, `.bento`, `.tiers`, `.stats`, `.faq`) the next block gets `--gap`, so the clear space stays identical. To get the same rhythm in any other wrapper (a `.split` column, a `<div>` group) add **`.flow`**. Don't set margins between blocks yourself.
- `.stack` is the *tight* flow inside a panel (`--flow` default 1rem; `.stack-sm` .5rem, `.stack-lg` 2rem). `.cluster` is a wrapping row (`--cluster-gap`, default .75rem).
- Containers: `.container` 1160px, `.container-narrow` 860px, `.container-wide` 1320px (all plus gutter). `--w-prose` 68ch.
- Layout grids: `.grid` (auto-fill, `--min` 260px), `.grid-2` / `.grid-3` / `.grid-4` (fixed column count from 1000px), `.split` (two columns from 880px; `.split-wide-left`, `.split-wide-right`; **`.split-fill`** makes both columns end level: plates stretch to the row and, in a `.flow` column, the last `.panel` grows, so a shorter column never leaves a hole of bare background), `.bento`. All tracks are `minmax(0, …)`, so long words or wide children can never widen the page.
- Shape: `--bw` 3px outline (`--bw-sm` 2px for chips, tags, inputs); `--depth` 6px panels, `--depth-sm` 4px buttons/tiles, `--depth-xs` 2px chips; radius `--r-lg` 18px panels, `--r-xl` 24px hero/CTA band, `--r-md` 12px buttons/tiles, `--r-sm` 9px inputs, `--r-pill` chips/tags.
- **Tap targets.** Up to 600px wide every small control is at least 40px tall: `.btn-sm`, `.chip`, the `.code-block` Copy button, footer links. Page-only links that act as controls (e.g. "What's inside" under a tier) get `padding-block: .65rem`. The dock keeps 44px items on phones (section 5).
- Motion: `--ease`, `--ease-out`, `--dur-fast .14s`, `--dur .24s`, `--dur-reveal .6s`, `--lift -3px`. Under `prefers-reduced-motion: reduce` every transition/animation is cut to ~0 and nothing is hidden.

---

## 4. Components (copy-paste)

The styleguide shows each of these live with its exact markup. Short versions:

### Surfaces
```html
<div class="panel">…</div>                    <!-- cream (light) / slate (dark) -->
<div class="panel panel-invert">…</div>       <!-- emphasis: slate in light, cream in dark -->
<div class="panel panel-olive">…</div>        <!-- free things, HoovyTools, Workshop -->
<div class="panel panel-patreon">…</div>      <!-- Patreon CTAs only -->
<div class="panel-inset">…</div>              <!-- sunken well inside a plate -->
<a class="panel" href="…">…</a>               <!-- interactive: hover lift + press (or .panel.is-link) -->
<!-- sizes: .panel-sm, .panel-lg -->
```

### Block rhythm
```html
<!-- inside <section class="section"><div class="container"> spacing is automatic -->
<div class="panel">…</div>
<aside class="upsell">…</aside>
<div class="notice">…</div>
<!-- anywhere else: wrap the group -->
<div class="split"><div class="flow"><div class="panel">…</div><div class="panel">…</div></div><figure class="screen">…</figure></div>
```

### Section head (titles never float)
```html
<header class="section-head">
  <span class="eyebrow">Patreon membership</span>
  <h2>One library, three tiers</h2>
  <p class="lead">Particle effects, animations and scenebuilds, organised, documented and previewed.</p>
</header>
<!-- left-aligned with actions on the right: -->
<header class="section-head section-head-split"><div><span class="eyebrow eyebrow-olive">Free on Steam</span><h2>Workshop items</h2></div><div class="btn-row">…</div></header>
```
Eyebrows: `.eyebrow` (primary), `.eyebrow-olive`, `.eyebrow-patreon` (Patreon only), `.eyebrow-cream`. Optional icon: `<span class="eyebrow eyebrow-patreon"><img src="/assets/icons/forged/patreon.png" alt="">Patreon</span>`. **Keep eyebrows to 28 characters or fewer** (2–4 words) so they stay on one line at 320px; a longer one wraps into a rounded tab instead of widening the layout, but it looks heavier. `.text-sticker` gives display text the die-cut lettering, only on olive, Patreon or slate plates (never on cream: its legibility comes from the outline). Since `.panel-invert` is cream in dark theme, don't use it there.

### Buttons
```html
<a class="btn btn-patreon" href="https://www.patreon.com/c/hoovytube308/membership" target="_blank" rel="noopener"><img class="btn-icon" src="/assets/icons/forged/patreon.png" alt="">Join on Patreon</a>
<a class="btn btn-primary" href="/learn/">Start learning</a>
<a class="btn btn-secondary" href="/hoovytools/">Get HoovyTools</a>
<a class="btn btn-olive" href="/downloads/…zip" download>Download</a>
<a class="btn btn-ghost" href="/blog/">Read the journal</a>
<!-- sizes: .btn-sm .btn-lg   width: .btn-block   group: <div class="btn-row"> (add .center to centre) -->
```
Always write a variant class (`.btn` on its own renders like `.btn-secondary`, but write `btn btn-secondary` so the intent is visible). Inside `.panel-patreon` / `.panel-olive` the matching button flips to cream automatically so it stays visible. One `.btn-patreon` per block.

### Highlighted text (the only two emphasis styles)
```html
<mark class="hl">900+ particle effects</mark>
<a class="hl-patreon" href="https://www.patreon.com/c/hoovytube308/membership" target="_blank" rel="noopener">Patreon membership</a>
<a class="hl-patreon no-icon" href="https://www.patreon.com/HoovyTube308/shop" target="_blank" rel="noopener">Patreon shop</a>
```
- `mark.hl` (always on `<mark>`): gold highlighter swipe, dark ink in both themes. Use it for one or two key facts per block, not whole sentences.
- `a.hl-patreon`: bold Patreon Rust text, tinted swipe, underline, and the mini Patreon mark drawn on the link's own left padding, so the mark can never wrap away from the first word. On hover the swipe deepens and the underline thickens; the focus ring is rust on plates and cream on olive/rust plates. **Every inline mention that links to Patreon (membership, shop, or /products/) uses it.** Plain `<a>` is for everything else. Works on every plate variant (colours remap automatically). Its right padding tucks under the next glyph (negative right margin), so put punctuation straight after `</a>`: "…in the Patreon shop." never shows a gap before the full stop.

### Stat tiles
```html
<div class="stats">
  <div class="stat"><img class="stat-icon" src="/assets/icons/forged/sparks.png" alt=""><b class="stat-num" data-count>900+</b><span class="stat-label">particle effects</span></div>
  …
</div>
```
Write the real final value; `data-count` animates it once. Inside a `.panel` the tiles become inset wells. `a.stat` lifts on hover.

### Feature list, check list
```html
<ul class="feature-list cols-2">
  <li><img class="feature-icon" src="/assets/icons/forged/fire.png" alt="" width="52" height="52">
      <div><h3 class="feature-title">All three renderers</h3><p>Camera-facing animated sprites, render_rope and render_sprite_trail.</p></div></li>
</ul>
<ul class="check-list"><li>PNG previews and expanded docs</li></ul>
```

### Media screen (videos, posters)
```html
<figure class="screen">
  <div class="screen-media">
    <video src="/media/home/particles.mp4" poster="/media/posters/home-particles.jpg" muted loop playsinline preload="none" data-play="visible" aria-label="…"></video>
  </div>
  <figcaption class="screen-cap"><span class="screen-dot"></span><b>Particle library</b> preview</figcaption>
</figure>
```
The caption is plain text flow: the gold dot, a `<b>` label and any length of text wrap together like a sentence. For a caption that also carries controls (the homepage showreel's clip picker), add `.is-row` to lay it out as a wrapping flex row. Every `<video>` gets a `poster` (`/media/posters/<folder>-<name>.jpg`). `data-play="visible"` plays muted while on screen, `data-play="hover"` while hovered/focused; neither autoplays under reduced motion. Ratios: default 16:9, `.screen-square`, `.screen-portrait`, `.screen-wide`. Credit community clips in the caption.

### YouTube embed (facade, never a raw iframe)
```html
<figure class="screen">
  <div class="screen-media">
    <a class="yt-facade" href="https://www.youtube.com/watch?v=VIDEO_ID" data-youtube="VIDEO_ID" data-title="Video title" target="_blank" rel="noopener" aria-label="Play: Video title">
      <img src="/media/posters/home-tutorials.jpg" alt="" loading="lazy" width="1280" height="720">
    </a>
  </div>
  <figcaption class="screen-cap"><span class="screen-dot"></span><b>Easy</b> Video title</figcaption>
</figure>
```
The forged play token is drawn automatically. On click `ht-ui.js` swaps the link for a `youtube-nocookie.com` player (autoplay, `title` from `data-title`, optional `data-start="seconds"`); nothing loads from YouTube before that, and without JS the link opens the video on YouTube. Poster: a local image, or `https://i.ytimg.com/vi/VIDEO_ID/hqdefault.jpg` (`width="480" height="360"`). Use the real title only when it is confirmed (site-facts §5 lists which are). Never put a made-up label ("Easy tutorial 2") in a title slot: for an unconfirmed video, leave the heading out and keep only the level/number meta and "Watch on YouTube". For a list of many videos (Learn has 15 unique ones), use a `.grid` of these figures, or of `a.card` links to `https://youtu.be/<id>` with the thumbnail in `.card-media`; never 15 live iframes. The whole playlist: `https://www.youtube.com/playlist?list=PLdWxIcNTL_v26r9za13U7_Ptw0cBAD-Cn`.

### Card grid and bento
```html
<div class="grid grid-3">                       <!-- .grid (auto, --min 260px) / .grid-2 / .grid-3 / .grid-4 -->
  <article class="card">
    <div class="card-media"><img src="/media/posters/home-tutorials.jpg" alt="" loading="lazy" width="1280" height="720"></div>
    <h3 class="card-title">Tutorials</h3>
    <p class="card-text">…</p>
    <div class="card-actions"><a class="btn btn-secondary btn-sm" href="/learn/">Start learning</a></div>
  </article>
  <a class="card" href="/learn/">…whole card is a link…</a>
</div>
<div class="bento"><div class="panel b-4 b-tall">…</div><div class="stat b-2">…</div>…</div>  <!-- .b-2 .b-3 .b-4 .b-6 .b-tall -->
```

### Pricing tiers (real tiers only)
```html
<div class="tiers">
  <article class="tier">
    <img class="tier-art" src="/assets/icons/forged/sparks.png" alt="" width="104" height="104">
    <p class="tier-kicker">Tier 1</p>
    <h3 class="tier-name">All Particles</h3>
    <p class="tier-price"><b>$20</b><span>/month</span></p>
    <ul class="tier-points"><li>900+ particle effects, 1GB+ of new SFM sprites</li>…</ul>
    <a class="btn btn-patreon btn-block" href="https://www.patreon.com/c/hoovytube308/membership" target="_blank" rel="noopener">Join All Particles</a>
  </article>
  <article class="tier is-featured"><span class="tier-flag">Best value</span>…</article>
</div>
```
Tier art suggestion: forged `sparks.png` (particles), `scenebuild.png` (scenebuilds), `film-reel.png` (animations). The old `/assets/tiers/*.png` stickers don't match their tier names (see section 10).

### Comparison table
```html
<div class="panel table-wrap"><div class="table-scroll">
  <table class="compare">
    <caption class="sr-only">What each Patreon tier includes</caption>
    <thead><tr><th scope="col">What you get</th><th scope="col">All Particles<span class="th-sub">$20/month</span></th>…<th scope="col" class="col-featured">The full library<span class="th-sub">$30/month</span></th></tr></thead>
    <tbody><tr><th scope="row">600+ animations</th><td class="no"><span class="sr-only">Not included</span></td>…<td class="yes col-featured"><span class="sr-only">Included</span></td></tr></tbody>
  </table>
</div></div>
```
Scrolls inside its plate on phones (min-width 600px); the page never scrolls sideways. `table.table` is a plain styled table.

### Steps
```html
<ol class="steps"><li><h3 class="step-title">Download the .zip</h3><p>Don't unzip it.</p></li>…</ol>   <!-- .steps-row = side by side -->
```

### Code block (install steps, paths, snippets)
```html
<div class="code-block">
  <div class="code-block-bar"><span>Blender add-on install</span><button class="btn" type="button" data-copy="#codeInstall">Copy</button></div>
  <pre><code id="codeInstall">Edit &gt; Preferences &gt; Add-ons &gt; Install from Disk</code></pre>
</div>
<div class="code-block is-wrap"><div class="code-block-bar"><span>Path</span></div><pre><code>…/usermod/particles/</code></pre></div>
```
Dark in both themes, inside or outside a panel. Long lines scroll inside the block (`.is-wrap` wraps them instead); the page never scrolls sideways. The bar is optional. Inline `<code>` in text is styled automatically; a bare `<pre>` only gets overflow handling, so always use `.code-block` (or `.prose pre` inside prose).

### FAQ accordion
```html
<div class="faq" data-accordion>
  <details class="faq-item" name="faq" open><summary>What's HoovyTools?</summary><div class="faq-body"><p>…</p></div></details>
</div>
```
Works without JS. Same `name` (or `data-accordion` on the wrapper) keeps one item open. The question's focus ring is drawn inside the item.

### Filter chips + item cards (no page JS)
```html
<div class="panel panel-sm filter-bar">
  <div class="chips" role="group" aria-label="Filter Workshop items" data-filter-group="ws">
    <button class="chip" type="button" data-filter="all" aria-pressed="true">All <span class="chip-count"></span></button>
    <button class="chip" type="button" data-filter="particles" aria-pressed="false">Particles <span class="chip-count"></span></button>
  </div>
  <p class="filter-status" data-filter-status="ws" aria-live="polite"></p>
</div>
<div class="grid grid-3" data-filter-target="ws">
  <article class="item-card" data-tags="particles trial">…</article>
</div>
<div class="panel filter-empty" data-filter-empty="ws" hidden><p>Nothing here yet.</p></div>
```
Single-select. Tags are space-separated, lowercase. The count badge on the pressed chip is full-strength cream (AA on the blue plate). Counts and the "Showing X of Y" line fill in automatically. If you render items with JS after load, call `HTUI.refresh(container)` (or `HTUI.filter('ws')`).

### Tags
`<span class="tag tag-free">Free</span>` · `tag-trial` (Free trial) · `tag-new` (New) · `tag-patreon` (Patreon; optional forged icon `<img>` inside) · `tag-version` (`v1.3.1`) · plain `tag` · `tag-muted` (In progress). Wrap several in `.tags`: a `<p class="tags">` of `<span>`s or a `<ul class="tags">` of `<li>`s render identically (the list reset and the item margins are handled in `ht.css`).

### Item card (icon + title + meta + action)
```html
<article class="item-card">
  <img class="item-icon" src="/assets/icons/forged/smoke.png" alt="" width="56" height="56">
  <div class="item-body">
    <h3 class="item-title">HoovyTube's Smoke Particles</h3>
    <p class="item-meta"><span class="tag tag-free">Free</span><span>7.7 MB</span></p>
    <p class="item-desc">Smoke particle pack for SFM.</p>
  </div>
  <div class="item-actions"><a class="btn btn-secondary btn-sm" href="https://steamcommunity.com/sharedfiles/filedetails/?id=3044947341" target="_blank" rel="noopener">View on Steam</a></div>
</article>
```
`.is-compact` puts a single `.item-action` on the right. `a.item-card` makes the whole card a link (drop the button). `.meta` is the same meta row for use outside item cards (dates, tags).

### Callout and upsell
```html
<div class="panel panel-olive callout">
  <img class="callout-icon" src="/assets/icons/forged/graduation.png" alt="" width="64" height="64">
  <div><h3 class="callout-title">You don't have to pay a cent</h3><p>…</p></div>
</div>

<aside class="upsell" aria-label="Patreon membership">
  <img class="upsell-art" src="/assets/icons/forged/badge-patreon.png" alt="" width="108" height="142">
  <div class="upsell-body">
    <span class="eyebrow eyebrow-patreon">All Particles tier</span>
    <h3 class="upsell-title">Every particle pack in one membership</h3>
    <p><mark class="hl">900+ particle effects</mark> … <a class="hl-patreon" href="…membership" target="_blank" rel="noopener">Patreon</a>.</p>
  </div>
  <div class="upsell-actions">
    <a class="btn btn-patreon" href="https://www.patreon.com/c/hoovytube308/membership" target="_blank" rel="noopener"><img class="btn-icon" src="/assets/icons/forged/patreon.png" alt="">Join from $20/month</a>
    <a class="btn btn-ghost btn-sm" href="/products/">Compare tiers</a>
  </div>
</aside>
```
`badge-patreon.png` is the rust Patreon item badge (the olive badges are for the Workshop and Tutorials). The upsell must fit the page (Workshop page: "liked the free trials? the full packs are on Patreon"; HoovyTools: "the packs the add-ons were verified against"; Learn: "skip the build, get the library"; Journal: "like the free tools? support HoovyTube"). Don't place it directly above the CTA band.

### Page hero panel (first thing in `<main>`, no breadcrumbs)
```html
<section class="section">
  <div class="container">
    <div class="panel page-hero">
      <div class="page-hero-text">
        <span class="eyebrow eyebrow-olive">Steam Workshop</span>
        <h1>Free SFM items, straight from the Workshop</h1>
        <p class="lead">…</p>
        <div class="btn-row">
          <a class="btn btn-patreon btn-lg" href="https://www.patreon.com/c/hoovytube308/membership" target="_blank" rel="noopener"><img class="btn-icon" src="/assets/icons/forged/patreon.png" alt="">Get the full packs</a>
          <a class="btn btn-secondary btn-lg" href="https://steamcommunity.com/id/HoovyTube/myworkshopfiles/" target="_blank" rel="noopener">Open the Workshop</a>
        </div>
        <p class="page-hero-note">The library is on <a class="hl-patreon" href="/products/">Patreon</a>; memberships start at $20/month.</p>
      </div>
      <div class="page-hero-media"><figure class="screen">…</figure> <!-- or <img class="page-hero-art" …> --></div>
    </div>
  </div>
</section>
```
`.page-hero.is-text-only` centres it without media. `.page-hero-art` is for the 390px-wide badges; add `.is-icon` for a 256px forged icon so it is never upscaled. The Patreon button must be visible in the first screen at 390px too (text comes before media on phones).

### Journal post and post list
```html
<section class="section"><div class="container container-narrow">
  <header class="panel page-hero is-text-only">
    <div>
      <span class="eyebrow">Journal</span>
      <h1>Post title</h1>
      <p class="lead">The dek.</p>
      <p class="meta"><time datetime="2026-08-17">17 August 2026</time><span class="tag">Manifesto</span></p>
      <!-- the hero Patreon CTA (rule 4a) goes here as a .btn-row -->
    </div>
  </header>
  <article class="panel"><div class="prose">…</div></article>
  <aside class="upsell">…</aside>
</div></section>

<div class="grid grid-2">   <!-- post list -->
  <a class="card" href="/blog/#/slug">
    <div class="card-media"><img src="…" alt="" loading="lazy" width="1280" height="720"></div>
    <p class="meta"><time datetime="2026-08-17">17 Aug 2026</time><span class="tag">Manifesto</span></p>
    <h3 class="card-title">Post title</h3>
    <p class="card-text">One-line summary.</p>
  </a>
</div>
```
No byline (the author is always HoovyTube; never a real name). Date and tags only; skip reading-time or view counts unless the page computes them from the text.

### Notice
```html
<div class="notice" role="note"><img src="/assets/icons/forged/script.png" alt=""><p>Session import runs on top of <strong>SourceIO</strong>.</p></div>
<!-- .notice-warn (gold edge), .notice-free (olive edge) -->
```

### Forms
```html
<div class="field"><label for="x">Name</label><input class="input" id="x" type="text"></div>
<textarea class="textarea"></textarea>   <select class="select">…</select>
<form class="inline-form"><input class="input" type="email"><button class="btn btn-primary">Subscribe</button></form>
<p class="form-msg ok" role="status">…</p>   <!-- .ok / .err -->
```
`data-newsletter-open` on any link/button opens the newsletter panel; `data-message-open` opens the send-a-message modal; `data-search-open` opens the search palette (`window.HTNav.openMessage()`, `window.HTNav.openSearch()`, `window.HTNewsletter.open()` also work).

### Prose (journal, long explanations)
`<article class="panel"><div class="prose">…h2, p, ul, blockquote, pre…</div></article>`

### Old class names (still work, don't use in new markup)
`.wrap` → `.container` · `.inset` → `.panel-inset` · `.btns` → `.btn-row.center` · `.hl` on anything but `<mark>` → use `<mark class="hl">` · `.pagehead`, `.page`, `.divider`, `.hero-carousel`, `.hero-lockup`, `.spot`, `.magnetic`, `.topbar` (legacy page bodies only).

---

## 5. Site chrome (automatic, from `ht-nav.js`)

- **Dock** (fixed, top centre): Home `/` · **Patreon** `/products/` (rust plate, forged Patreon icon, visible "Patreon" label ≥761px) · Workshop `/workshop/` (forged Steam icon) · HoovyTools `/hoovytools/` · Learn `/learn/` · Journal `/blog/` (newspaper icon) · Contact `/contact/` | Search · Theme. Active item gets `aria-current="page"` (prefix match, so `/blog/#/post` and `/patreon/` work). Tooltips on hover/focus.
  - **Phones (≤520px):** the dock shows Home, Patreon, Workshop, HoovyTools, Learn and **More** (forged `menu.png`). More opens a small menu plate under the dock with Journal, Contact, Search and the theme switch (48px rows; Esc or a click outside closes it and focus returns to More). On Journal/Contact the More button carries the active bar. Every dock control is 44x44 down to a 320px screen.
- **Search palette**: dock button, Ctrl/Cmd+K, `/`, or any `[data-search-open]` element. Every word typed must match (so "fire particles" works). The Patreon and Workshop entries carry the asset words buyers type (fire, smoke, explosion, skibidi, water, electricity, weapons, tf2, bullet, impacts, debris, scenebuild, animation, hdri...). No match never dead-ends: it shows "Nothing matched" plus two rows, "Browse the Patreon library" (`/products/`) and "Free Workshop items" (`/workshop/`).
- **Send-a-message modal**: footer mail chip or anything with `data-message-open`.
- **Dialogs** (search palette, message modal) keep Tab and Shift+Tab inside while open, and return focus to where it was on close.
- **Patreon CTA band**: inserted right before `<footer class="site">` on every page unless `<body data-no-cta>`. Content (facts only): the rust Patreon badge, "900+ particle effects / 600+ animations / 30+ scenebuilds", "Memberships start at $20/month", inline `hl-patreon` link to the shop, primary "Join on Patreon" (membership URL) and secondary "Compare the tiers" (`/products/`; on `/products/` and `/patreon/` it becomes "Browse the Patreon shop"). Don't build your own copy of it; it never needs editing per page. Opt out only on pages where a CTA makes no sense (none of the public pages).
- **Footer**: `ht-nav.js` fills `<footer class="site"></footer>`: brand line, social chips (YouTube, Patreon, Steam Workshop, Discord, mail), sitemap columns (Explore / Patreon (highlighted) / Stay in touch) and one copyright line: "© 2026 HoovyTube. All rights reserved. Community animations © their respective creators." Page-specific notes survive if written as `<p class="footer-note">…</p>` inside the footer.
- **Newsletter** (`ht-newsletter.js`): never on the first screen. It appears once per session, as a compact panel bottom-right (bottom sheet on phones, without the description line), only after the visitor scrolls past ~1.5 screens or 45% of the page. It hides again if they scroll back up. Closing it stores `localStorage['ht-newsletter-dismissed']` (30 days). Subscribing stores `htnews:sub = 1` (never again). `#newsletter` links and `[data-newsletter-open]` always open it.
- **Skip link** and `id="main"` on `<main>` are added if missing.
- **404 page** (`/404.html`): GitHub Pages serves it for every unknown path, at that path. It is a normal page on this skeleton (hero with search + Patreon CTA, upsell, "where to next" cards, CTA band, footer) and never redirects.
- **`/patreon/`**: a stub that forwards to `/products/` (meta refresh + `location.replace`, keeps `?query` and `#hash`; canonical `/products/`). Always link `/products/` directly.

## 6. Behaviours (`ht-ui.js`, data-attribute driven)

| Attribute / class | Effect |
|---|---|
| `main > section`, `.cta-band` (automatic), `[data-reveal]` | fade + raise 18px once, as soon as the block's top edge enters the viewport (any height works). A scroll/resize/load failsafe shows anything on screen or above it that an observer missed. Anything already on screen at load is never hidden. `[data-no-reveal]` opts out. |
| `[data-reveal="stagger"]` | reveals the element's children one after another (70ms apart, max 8 steps) |
| `[data-count]` | counts up once at 40% visibility, keeping prefix/suffix/commas ("900+", "2,500+", "$20"). Optional `data-count="900"`, `data-prefix`, `data-suffix`. |
| `[data-filter-group]`, `[data-filter]`, `[data-filter-target]`, `[data-tags]`, `[data-filter-status]`, `[data-filter-empty]` | chip filtering (see section 4) |
| `video[data-play="visible" \| "hover"]` | muted playback while visible / hovered (host = closest `.screen`, `.card`, `.item-card` or `[data-play-scope]`) |
| `a.yt-facade[data-youtube="ID"]` (+ `data-title`, `data-start`) | swapped for a youtube-nocookie player on click (see section 4) |
| `[data-accordion]` | one `<details>` open at a time |
| `[data-copy="#id"]` / `[data-copy-text="…"]` | copy to clipboard, button shows "Copied" (`data-copy-done` to change the word) |
| `[data-search-open]`, `[data-message-open]`, `[data-newsletter-open]` | open the search palette / message modal / newsletter (handled by `ht-nav.js` and `ht-newsletter.js`) |
| `window.HTUI.refresh(el)` | re-run reveal/count/filter/video setup on injected content |

All of it is skipped or instant under `prefers-reduced-motion: reduce`.

Retired (still harmless in old markup, don't use): the magnify dock, `[data-magnetic]` drift, `.spot` cursor ring, ghost/transparent dock, `body.home` flush hero, the 10-15-click newsletter re-pop, `.htnews-tab`. `.hero-carousel` still works for the old homepage but new pages should use `.page-hero` + `.screen`.

## 7. Icons

- Use forged icons (`/assets/icons/forged/<name>.png`, 256px, transparent) for bullets, stat icons, item cards and buttons: steam, youtube, workshop, patreon, discord, fire, smoke, water-splash, electricity, explosion, sparks, debris, candle, script, model, scenebuild, blender-addon, download, play, star, heart, film-reel, graduation, menu (the phone dock's More button), plus the pack icons (bomb, bullet, toilet, castle, skydome...) in the same folder. One item, one icon, on every page (Airstrike Explosion = `bomb`, 1980s bullet impacts = `bullet`); badges (390x513) `badge-patreon.png` (**rust**, Patreon only), `badge-workshop.png` and `badge-tutorials.png` (olive).
- Originals: dock icons `/assets/icons/{home,product,tools,learn,contact,search,theme,newsletter,speak}.png`; level badges `/media/assets/level-{easy,medium,hard}.png`; HoovyTools badges `/media/hoovytools/badge-*.png`. These originals are 210-440 KB each: on pages use the web copies, `/media/assets/level-*-336.png` (336px) and `/media/hoovytools/badge-*-340.png` (340x447), or the homepage's smaller `/media/home/` copies.
- Decorative icons always get `alt=""`. Give `width`/`height` attributes.
- New icon: draw a bold single-colour SVG into `assets/icons/src/<name>.svg`, then run
  `PLAYWRIGHT_MODULE=/opt/node22/lib/node_modules/playwright CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/forge-icons.mjs --only <name>` from the repo root. Badge plates and their colours (the rust Patreon badge included) are configured in `assets/icons/src/forge.config.json`.

## 8. OG image

`/assets/og/og-default.jpg` (1200x630) is the default `og:image` for every page. To re-render after editing `/assets/og/src/og-default.html`: serve the repo root, open that page in Playwright Chromium at a 1200x630 viewport (deviceScaleFactor 1), wait for `document.fonts.ready`, screenshot the viewport, and save it as JPEG quality ~88. Use only HoovyTube's own footage (not community clips).

## 9. How to use the CTA band and the highlight styles

- The CTA band is the closing pitch on every page. Your page still needs its own hero CTA, two or more inline `a.hl-patreon` links, and one topical `.upsell`. Don't put another full-width Patreon band (or the upsell) directly above it.
- Put `a.hl-patreon` where the copy naturally mentions the library, a tier, a pack or the shop ("…the full Fire Enhanced pack is on <a class="hl-patreon">Patreon</a>"). Never on unrelated words, and never more than one per sentence.
- `mark.hl` marks facts (numbers, "free", versions), at most one or two per paragraph. Don't nest it inside `hl-patreon`.
- Plain links (`<a>`) are for everything that isn't Patreon.

## 10. Facts that need care (from the research files)

- Library numbers: use **900+ particle effects, 600+ animations, 30+ scenebuilds** (the welcome email now says 900+ as well).
- Tiers: $20 All Particles, $25 Scenebuilds + Particles, $30 The full library. Only the site states the $30 tier, so phrase the entry point as "from $20/month".
- Members: the site says "2,500+ Patreon members". Patreon counts free members too, so never say "paying" or "subscribers".
- Tutorials: there are **15 unique** videos: Easy 7, Medium 4, Hard 4 (the duplicate was dropped from Medium; say "4 tutorials" for Medium everywhere). Don't write "16 free tutorials". Most video titles are unconfirmed; only use the ones site-facts §5 lists, and mark nothing as a title that isn't one.
- Particle Import's minimum Blender version conflicts (site 4.1+, add-on code 4.2). Say "Blender 4.2 or newer" or leave the number out. Session import: the v1.3.1 zip's metadata declares Blender 5.0.1, while the Workshop page mentions 4.0/5.0 support. State it only as "the minimum the add-on declares" (never as a bare requirement, and not in structured data) until the owner confirms.
- The `/assets/tiers/*.png` stickers show the SFM, Patreon and Blender logos, which don't match "Scenebuilds" and "Animations". Use the forged icons for tier art.
- Workshop: 31 items are identified in `workshop.json` (about 43-44 submissions in total, an estimate). Don't print a total count. Mark trials as "Free trial", and confirm item links before hard-coding them (the research could not open Steam). Three items are left off the site until the owner confirms authorship (their titles don't name HoovyTube and the attribution comes from search summaries): TF2 Skydomes (3650153513), 1980s Bullet Impact Particles (3583594749) and Colorable Smoke Particles (3559863230).
- Patreon links: only the three canonical forms (membership, shop, profile). Shop-item and post URLs from the research are unverified, so pack cards open the shop front ("Open the shop") until each deep link is checked.
- Don't promise process or guarantees the research doesn't state: no "cancel any time", "Patreon shows the exact price", "takes a few minutes", "no paywall, ever", "every week", or "no download yet". Neutral form: "Billing and cancelling are handled in your Patreon account."
- Structured data mirrors the visible page: FAQPage answers are the visible answer text, and the Product offers list only the $20 and $25 tiers (the $30 tier is visible on the page but not corroborated outside the site).
- The journal post uses a poster from `/media/posters/` as its cover (the old `/assets/blog/covers/…` path never existed). Nothing is appended inside a post's text: the Patreon pitch lives in the sidebar plate and the upsell, outside the creator's essay.
- Don't use: real name, age, city/country, the Gothic 2 creator jab from the journal post, external links the site doesn't already have (SourceFilmmakerTube, Boosty), or the alpaca leftovers (`shared/og-image.jpg`, `assets/branding/*`).

## 11. Ownership

- **Design system** (change only through it): `styles/ht.css`, `shared/ht-nav.js`, `shared/ht-ui.js`, `shared/ht-newsletter.js`, `styleguide/`, `docs/DESIGN-SYSTEM.md`, `assets/og/`, `assets/fonts/`, `404.html`, `patreon/index.html`, the rust `badge-patreon` entry in `assets/icons/src/forge.config.json`, and the dock's `menu` icon (`assets/icons/src/menu.svg`, `assets/icons/forged/menu.png`).
- **Pages** own their `index.html` and any page-only assets. If a page needs a new component or token, ask for it in the system instead of styling it locally.

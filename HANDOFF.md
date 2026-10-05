# Handoff — homepage revamp + footer icon fix

**Status:** done and pushed, **not live.** All work is on branch
`claude/happy-davinci-l64ytt`, commit `229b1f7`. `main` is untouched at `9e9575a`.
GitHub Pages serves hoovytube.com from `main`, which is why the live site looks
unchanged. Nothing is lost — it just needs merging.

## To pick this up in another session

```bash
git fetch origin
git checkout claude/happy-davinci-l64ytt
python3 -m http.server 8777   # then open http://localhost:8777/
```

To publish, merge to `main` and push (a push to main republishes the site):

```bash
git checkout main && git merge claude/happy-davinci-l64ytt && git push origin main
```

## What was asked

1. Revamp the site, especially the homepage — it was "non detailed and doesn't
   really sell what I do."
2. "The icons at the bottom are missing."

## What was done

### 1. The missing footer icons — root cause found and fixed

`shared/ht-nav.js` built the footer social bar from
`/assets/icons/social/{youtube,patreon,steam,discord,email}.png`. **That folder
has never existed in the repo** — `assets/icons/` only holds the dock icons. So
the homepage rendered five broken images, and every other page rendered nothing,
because only `index.html` even had a `.social` container for the script to fill.

- Icons are now **inline SVG** (YouTube, Patreon, Steam, Discord, mail), so there
  are no files left to go missing.
- The bar **builds itself** inside any `<footer class="site">`, so products,
  hoovytools, learn, blog and contact all get it now — each icon in a round chip
  with a label and the same magnetic grow the dock uses.
- Added a sitemap row above the copyright line.
- Added a footer to `contact/index.html`, which had none at all.
- Footer Patreon link now matches the URL the rest of the site uses
  (`patreon.com/c/hoovytube308/membership`).

Files: `shared/ht-nav.js`, `styles/ht.css`, `contact/index.html`.
Cache-bust bumped to `ht.css?v=10` / `ht-nav.js?v=11` across all six pages.

### 2. Homepage rebuilt (`index.html`)

The old page was a hero, three one-line blurbs and a 5-item FAQ. It never said
what's in the library, that the Blender add-ons exist, or that everything is
taught free. New structure, built from content already on the other pages (no
invented facts):

- **Hero** — real value line + proof strip (900+ / 600+ / 30+ / 2,500+),
  CTAs now "Browse the library" / "Get HoovyTools".
- **Intro + stat band** — the story behind the work, over four numbers that
  count up on scroll.
- **Three pillars** — assets / add-ons / tutorials, scannable in one screen.
- **Three feature sections** — now carry concrete detail (what's in each pack,
  what the importers do, what each tutorial level covers) instead of one vague
  sentence each, plus version chips (session import v1.3.1, particle import
  v0.23.0, Blender→SFM in progress).
- **Community wall** — the six creator clips in `media/community/`, hover to play.
- **Free-first callout + three-tier membership summary** — so "you don't have to
  pay a cent" lands before the pricing.
- **Journal teaser, 7-entry FAQ, closing CTA band.**
- Descriptive `<title>`, meta description, `og:image`, WebSite JSON-LD.

### Verification done

Rendered in Chromium at 390px and 1280px, light and dark. No JS errors, no 404s,
no horizontal overflow, five footer icons confirmed on all six pages. Three
layout bugs were found and fixed this way: `<b>` breaking out of the flex
bullets, stranded media columns, and a hero `<br>` eating a word space.

### Notes / not done

- `version.json` deliberately untouched — CI bumps it.
- `/blog/` logs a 404 for a missing cover image
  (`assets/blog/covers/shoulders-of-giants.jpg`). Pre-existing, and the blog
  already handles it with an `onerror` fallback, so it was left alone.
- No PR opened.
- Videos can't be previewed in a headless browser (no H.264 in Chromium); frames
  were pulled with ffmpeg to check layout. They play normally in a real browser.

## Possible next steps

- Merge to `main` to publish.
- Apply the same detail treatment to `/products/` and `/learn/`, which still
  lead with thin copy.
- Add the missing blog cover image, or drop the `cover` field from that post.

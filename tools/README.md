# Tools

## icon-forge.html — HoovyTube Icon Forge (offline edition)

Double-click `icon-forge.html` to open it in any modern browser (Chrome, Edge, Firefox).
It needs no server and no internet: the forge engine, fonts, sample icons and styles are all
inside the one file, so you can also copy it anywhere on its own.

What it does: drop in any icon (PNG, JPG, WebP, GIF or SVG, several at once, or paste SVG
code with Ctrl+V) and get it back in the HoovyTube TF2 style — cream fill, chunky slate
outline, 3D depth edge, bevel and soft shadow — or stamped onto an olive item badge with a
label. Every part is adjustable (outline, depth and its direction, bevel strength / width /
wrap, colours, presets, hole filling, mask mode), and you can download single PNGs or a
.zip of everything at 64–1024 px. Settings are remembered in your browser.

It is generated — don't edit it by hand. After changing the engine (`shared/icon-forge.js`,
`shared/icon-forge-worker.js`), the online tool page (`icon-forge/index.html`) or the site
styles (`styles/ht.css`), rebuild it from the repo root:

```
node scripts/build-local-icon-forge.mjs
```

The same engine powers the online version at https://hoovytube.com/icon-forge/ and the
batch script `scripts/forge-icons.mjs`, which regenerates `assets/icons/forged/` from the
SVG sources in `assets/icons/src/`.

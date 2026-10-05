#!/usr/bin/env node
// Builds tools/icon-forge.html: a single self-contained, offline copy of the Icon Forge
// (/icon-forge/) that opens straight from disk with a double-click - no server, no internet.
//
// Usage:  node scripts/build-local-icon-forge.mjs
//
// Everything the online tool loads is inlined: the forge engine (shared/icon-forge.js, turned
// into a classic script), its worker (rebuilt as a blob worker), the site stylesheet with its
// fonts as data URIs, the sample SVGs and the preview images. Re-run after changing any of them.
// Each source rewrite below asserts it matched, so a reshaped source fails the build loudly
// instead of shipping a half-working file.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'tools', 'icon-forge.html');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
function dataUri(rel) {
  const file = path.join(ROOT, rel.replace(/^\//, '').split('?')[0]);
  const mime = MIME[path.extname(file).toLowerCase()];
  if (!mime) throw new Error(`No MIME type for ${rel}`);
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
}

// Replace exactly-once (or at-least-once with all:true) and fail if the pattern is gone.
function swap(text, pattern, replacement, what, { all = false } = {}) {
  const re = pattern instanceof RegExp ? pattern : new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), all ? 'g' : '');
  const re2 = all && !re.global ? new RegExp(re.source, re.flags + 'g') : re;
  let n = 0;
  const out = text.replace(re2, (...m) => { n++; return typeof replacement === 'function' ? replacement(...m) : replacement; });
  if (!n) throw new Error(`build-local-icon-forge: could not find ${what}`);
  return out;
}
const safeInline = (code, what) => {
  if (/<\/script/i.test(code)) throw new Error(`${what} contains "</script" and cannot be inlined`);
  return code;
};

// 1. Engine: ES module -> classic script exposing a global IconForge (works in the page and in a blob worker).
let lib = read('shared/icon-forge.js');
lib = swap(lib, /const BUNDLED_FONTS = \{[^}]*\};/, `const BUNDLED_FONTS = { 'lilita one': '${dataUri('assets/fonts/lilita-one-latin-400-normal.woff2')}' };`, 'BUNDLED_FONTS');
lib = swap(lib, 'new URL(BUNDLED_FONTS[key], import.meta.url).href', 'BUNDLED_FONTS[key]', 'bundled font URL');
lib = swap(lib, /^export (?=(?:async )?function|const|let|class)/gm, '', 'exports');
lib = swap(lib, /^export default api;\s*$/m, 'return api;', 'default export');
if (/^\s*(import|export)\b|import\.meta/m.test(lib)) throw new Error('icon-forge.js still has module syntax after conversion');
const LIB = safeInline(`var IconForge = (function () {\n'use strict';\n${lib}\n})();`, 'icon-forge.js');

// 2. Worker body: same protocol, engine comes from the inlined library instead of an import.
let worker = read('shared/icon-forge-worker.js');
worker = swap(worker, /^import \{ forgeIcon, forgeBadge \} from '[^']+';$/m, 'const { forgeIcon, forgeBadge } = IconForge;', 'worker import');
const WORKER = safeInline(worker, 'icon-forge-worker.js');

// 3. Stylesheet with every url(/...) asset embedded.
let css = read('styles/ht.css');
css = css.replace(/url\((\/[^)'"]+)\)/g, (m, p) => `url(${dataUri(p)})`);
const LOCAL_CSS = `
/* Offline edition: no site dock, so reclaim its space and add a slim header. */
:root { --dock-space: 20px; }
.local-bar { padding-top: var(--s-4); }
.local-bar .panel { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--s-3); }
.local-bar .brand { display: flex; align-items: center; gap: var(--s-3); }
.local-bar .brand img { width: 44px; height: 44px; }
.local-bar .brand strong { font-family: var(--font-display); font-size: 1.35rem; font-weight: 400; display: block; line-height: 1.1; }
.local-bar .brand small { color: var(--text-muted); font-size: var(--fs-xs); font-weight: 600; }
.local-foot { padding: var(--s-5) 0 var(--s-6); }
.local-foot .panel { text-align: center; font-size: var(--fs-sm); color: var(--text-muted); }
`;

// 4. Page: the online tool's markup and script, rewired for file://.
let page = read('icon-forge/index.html');
const samplesMatch = page.match(/const SAMPLES = (\[[^\]]*\]);/);
if (!samplesMatch) throw new Error('build-local-icon-forge: could not find SAMPLES list');
const samples = JSON.parse(samplesMatch[1].replace(/'/g, '"'));
const SAMPLE_SVGS = Object.fromEntries(samples.map((n) => [n, read(`assets/icons/src/${n}.svg`)]));

page = swap(page, /<title>[^<]*<\/title>/, '<title>Icon Forge (offline) - HoovyTube</title>', 'title');
page = page.replace(/^\s*<link rel="(?:canonical|preload|apple-touch-icon)"[^>]*>\n/gm, '');
page = page.replace(/^\s*<meta (?:property="og:|name="twitter:)[^>]*>\n/gm, '');
page = swap(page, /<link rel="icon"[^>]*>/, `<link rel="icon" type="image/png" href="${dataUri('favicon.png')}">`, 'favicon');
page = swap(page, /<link rel="stylesheet" href="\/styles\/ht\.css[^"]*">/, () => `<style>\n${css}\n${LOCAL_CSS}</style>`, 'stylesheet link');

page = swap(page, /import \{([^}]+)\} from '\/shared\/icon-forge\.js[^']*';/, (m, names) => `const {${names}} = window.IconForge;\n    const LOCAL_SAMPLES = ${JSON.stringify(SAMPLE_SVGS)};`, 'engine import');
page = swap(page, "new Worker(new URL('/shared/icon-forge-worker.js?v=2', location.href), { type: 'module' })",
  "new Worker(URL.createObjectURL(new Blob([document.getElementById('iconforge-lib').textContent, '\\n', document.getElementById('iconforge-worker').textContent], { type: 'text/javascript' })))", 'worker constructor');
page = swap(page, "addInput('/assets/icons/src/' + n + '.svg', n)", 'addInput(LOCAL_SAMPLES[n], n)', 'sample loader');
page = swap(page, /<li>Same engine in code:[\s\S]*?<\/li>/, '<li>This is the offline edition: the engine, fonts and samples all live inside this one file, so it works without internet. Your settings are remembered in this browser.</li>', 'engine tip');
page = swap(page, /\s*<div class="btn-row" data-online-only>[\s\S]*?<\/div>/, '', 'online-only download row');
page = swap(page, /<span class="eyebrow">Internal tool<\/span>/, '<span class="eyebrow">Offline edition</span>', 'hero eyebrow');

page = page.replace(/(src|href)="(\/(?:assets|media)\/[^"]+\.(?:png|jpe?g|svg))"/g, (m, attr, p) => `${attr}="${dataUri(p)}"`);
page = page.replace(/href="\/([^"]*)"/g, 'href="https://hoovytube.com/$1" target="_blank" rel="noopener"');
page = swap(page, /^\s*<script defer src="\/shared\/ht-(?:nav|ui|newsletter)\.js[^"]*"><\/script>\n/gm, '', 'site scripts', { all: true });
if (/(?:src|href)="\/(?!\/)/.test(page)) throw new Error('page still references a root-relative URL: ' + page.match(/(?:src|href)="\/(?!\/)[^"]*"/)[0]);

const header = `<body>
  <header class="container local-bar">
    <div class="panel panel-sm">
      <div class="brand">
        <img src="${dataUri('assets/icons/forged/star.png')}" alt="" width="44" height="44">
        <div><strong>HoovyTube Icon Forge</strong><small>Offline edition &middot; engine v{{VERSION}} &middot; built {{DATE}}</small></div>
      </div>
      <div class="btn-row">
        <button type="button" class="btn btn-secondary btn-sm" id="localTheme" aria-label="Switch light or dark theme">Light / dark</button>
        <a class="btn btn-ghost btn-sm" href="https://hoovytube.com/icon-forge/" target="_blank" rel="noopener">Online version</a>
      </div>
    </div>
  </header>`;
const version = (lib.match(/const VERSION = '([^']+)'/) || [, '?'])[1];
page = swap(page, '<body>', header.replace('{{VERSION}}', version).replace('{{DATE}}', new Date().toISOString().slice(0, 10)), 'body tag');
page = swap(page, /<footer class="site"><\/footer>/, `<footer class="container local-foot"><div class="panel panel-sm">HoovyTube Icon Forge, offline edition. Generated by <code>scripts/build-local-icon-forge.mjs</code> from the same engine as <a href="https://hoovytube.com/icon-forge/" target="_blank" rel="noopener">hoovytube.com/icon-forge</a>.</div></footer>
  <script id="iconforge-lib">\n${LIB}\n</script>
  <script id="iconforge-worker" type="text/plain">\n${WORKER}\n</script>
  <script>
    document.getElementById('localTheme').addEventListener('click', function () {
      var r = document.documentElement, t = r.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      r.setAttribute('data-theme', t);
      try { localStorage.setItem('ht-theme', t); } catch (e) {}
    });
  </script>`, 'footer');
page = swap(page, /<!doctype html>/i, '<!DOCTYPE html>\n<!-- Generated by scripts/build-local-icon-forge.mjs - do not edit by hand; edit the sources and re-run. -->', 'doctype', {});

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, page);
console.log(`wrote ${path.relative(ROOT, OUT)} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB, engine v${version}, ${samples.length} samples)`);

#!/usr/bin/env node
// Icon Forge batch script (dev-only). Regenerates assets/icons/forged/ from assets/icons/src/ with the same
// module the browser tool uses (shared/icon-forge.js), running it in headless Chromium via Playwright.
//
// Usage:  node scripts/forge-icons.mjs [--src assets/icons/src] [--out assets/icons/forged] [--size 256] [--only steam,fire] [--font path/to/LilitaOne.woff2]
//
// Needs Playwright + a Chromium build: `npm i -D playwright && npx playwright install chromium`
// (or set PLAYWRIGHT_MODULE=/path/to/node_modules/playwright and CHROMIUM_PATH=/path/to/chrome).
// Per-icon options and the badge list live in <src>/forge.config.json:
//   { "defaults": {...forgeIcon options}, "icons": { "name": {...overrides} }, "badges": [{ "out", "icon", "label", ... }] }
// The badge label font: --font, else @fontsource/lilita-one if installed, else Google Fonts (needs network),
// else the module falls back to a system font.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const SRC = path.resolve(ROOT, arg('src', 'assets/icons/src'));
const OUT = path.resolve(ROOT, arg('out', 'assets/icons/forged'));
const SIZE = Number(arg('size', 0)) || null;
const ONLY = arg('only', '') ? new Set(arg('only', '').split(',').map((s) => s.trim())) : null;
const CONFIG = path.resolve(ROOT, arg('config', path.join(path.relative(ROOT, SRC), 'forge.config.json')));
const FONT = arg('font', '');

async function loadPlaywright() {
  const tries = [process.env.PLAYWRIGHT_MODULE, 'playwright', '/opt/node22/lib/node_modules/playwright'];
  try { tries.push(path.join(execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(), 'playwright')); } catch { /* no npm */ }
  const req = createRequire(import.meta.url);
  for (const t of tries.filter(Boolean)) {
    try { return req(t); } catch { /* next */ }
  }
  throw new Error('Playwright not found. Run `npm i -D playwright && npx playwright install chromium`, or set PLAYWRIGHT_MODULE.');
}

function findFont() {
  if (FONT) return path.resolve(process.cwd(), FONT);
  const rel = 'node_modules/@fontsource/lilita-one/files/lilita-one-latin-400-normal.woff2';
  for (const base of [ROOT, process.cwd()]) { const p = path.join(base, rel); if (fs.existsSync(p)) return p; }
  return null;
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json', '.woff2': 'font/woff2' };
const HARNESS = `<!doctype html><meta charset="utf-8"><title>forge</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lilita+One&display=swap">
<script type="module">import * as F from '/shared/icon-forge.js'; window.F = F; window.forgeReady = true;</script>`;

function serve() {
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (u === '/__forge__.html') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(HARNESS); }
    const p = path.join(ROOT, u);
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

function readSource(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.svg') return fs.readFileSync(file, 'utf8');
  return `data:${MIME[ext] || 'image/png'};base64,${fs.readFileSync(file).toString('base64')}`;
}

const main = async () => {
  const pw = await loadPlaywright();
  const config = fs.existsSync(CONFIG) ? JSON.parse(fs.readFileSync(CONFIG, 'utf8')) : {};
  const defaults = { size: 256, ...(config.defaults || {}) };
  if (SIZE) defaults.size = SIZE;
  const files = fs.readdirSync(SRC).filter((f) => /\.(svg|png|jpe?g|webp)$/i.test(f)).sort();
  fs.mkdirSync(OUT, { recursive: true });

  const server = await serve();
  const port = server.address().port;
  const exe = process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
  const browser = await pw.chromium.launch(exe ? { executablePath: exe } : {});
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|fonts\.googleapis|net::/.test(m.text())) errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${port}/__forge__.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.forgeReady === true, null, { timeout: 15000 });
  const fontFile = findFont();
  if (fontFile) {
    const b64 = fs.readFileSync(fontFile).toString('base64');
    await page.evaluate(async (d) => { await window.F.loadFont('Lilita One', d); }, `data:font/woff2;base64,${b64}`);
  }

  const written = [];
  const byName = {};
  for (const f of files) {
    const name = f.replace(/\.[^.]+$/, '');
    byName[name] = path.join(SRC, f);
    if (ONLY && !ONLY.has(name)) continue;
    const opts = { ...defaults, ...((config.icons || {})[name] || {}) };
    const t0 = Date.now();
    const res = await page.evaluate(async ({ src, opts }) => {
      const c = await window.F.forgeIcon(src, opts);
      return { url: c.toDataURL('image/png'), mode: c.forgeInfo.mode, warnings: c.forgeInfo.warnings };
    }, { src: readSource(path.join(SRC, f)), opts });
    const outFile = path.join(OUT, (opts.out || name) + '.png');
    fs.writeFileSync(outFile, Buffer.from(res.url.split(',')[1], 'base64'));
    written.push(path.relative(ROOT, outFile));
    console.log(`forged ${name.padEnd(16)} ${opts.preset || 'cream'} ${opts.size}px mask=${res.mode} ${Date.now() - t0}ms${res.warnings.length ? '  ! ' + res.warnings.join(' ') : ''}`);
  }
  for (const b of config.badges || []) {
    const name = (b.out || 'badge').replace(/\.png$/, '');
    if (ONLY && !ONLY.has(name) && !ONLY.has(b.icon)) continue;
    const src = b.icon ? readSource(byName[b.icon] || path.join(SRC, b.icon)) : null;
    const res = await page.evaluate(async ({ src, opts }) => {
      const c = await window.F.forgeBadge(src, opts);
      return c.toDataURL('image/png');
    }, { src, opts: { ...b, out: undefined, icon: b.iconOptions || {} } });
    const outFile = path.join(OUT, name + '.png');
    fs.writeFileSync(outFile, Buffer.from(res.split(',')[1], 'base64'));
    written.push(path.relative(ROOT, outFile));
    console.log(`badge  ${name.padEnd(16)} "${b.label || ''}"`);
  }
  await browser.close();
  server.close();
  if (errors.length) { console.error('Page errors:\n  ' + errors.join('\n  ')); process.exitCode = 1; }
  console.log(`\n${written.length} file(s) written to ${path.relative(ROOT, OUT) || '.'}${fontFile ? '' : '  (label font: Google Fonts / fallback)'}`);
};

main().catch((e) => { console.error(e); process.exit(1); });

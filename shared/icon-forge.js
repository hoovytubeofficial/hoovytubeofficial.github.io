/**
 * @file Icon Forge - turns any icon into HoovyTube's TF2-HUD "cookie-cutter" sticker look.
 *
 * Dependency-free ES module (no build step). Works in any modern browser and in headless Chromium.
 *
 * The look, measured from the hand-made site icons (assets/icons/*.png, media/assets/icon-*.png,
 * media/hoovytools/arrow.png): a warm cream fill with a gentle top-to-bottom gradient, a thick rounded
 * slate outline that wraps the whole silhouette, a darker slate extrusion straight down (the chunky
 * 3D edge), and a thin bevel inside the fill (light lip on edges facing the light, darker tan lip on
 * edges facing away). Holes stay see-through with an outline ring, like the house door, the magnifier
 * lens and the Discord eyes (the extrusion shows as a dark crescent at the top of each hole); pass
 * `fillHoles` to plug them with the outline or depth colour instead (optionally only the small ones).
 *
 * Pipeline: rasterise the source -> coverage mask (alpha, or difference from the background colour) -> auto-trim + fit ->
 * signed distance fields via an exact Euclidean distance transform (Felzenszwalb-Huttenlocher, with
 * sub-pixel seeding from anti-aliased coverage) -> outline / extrusion / bevel / ink / shadow layers
 * composited at 2x -> high-quality downscale.
 *
 * @example
 *   import { loadSource, forgeIcon, forgeToBlob, forgeBadge } from '/shared/icon-forge.js';
 *   const src = await loadSource(fileInput.files[0]);            // File, Blob, URL, SVG markup, <img>, <canvas>
 *   const canvas = await forgeIcon(src, { size: 256 });          // cream preset = dock icons
 *   const olive = await forgeIcon(src, { preset: 'olive' });     // like media/hoovytools/arrow.png
 *   const blob = await forgeToBlob(src, { size: 512 });          // PNG blob
 *   const badge = await forgeBadge(src, { label: 'Steam Workshop' }); // olive item-badge plate
 *
 * @module icon-forge
 */

export const VERSION = '1.0.0';

const INF = 1e20;
const MAX_WORK = 2048;          // largest supersampled working canvas side (px)
const SVG_RASTER = 2048;        // intrinsic long side SVG sources are rasterised at

/* ------------------------------------------------------------------------------------------------
 * Presets. Lengths are fractions of the output size (so they scale with `size`).
 * ---------------------------------------------------------------------------------------------- */

/**
 * @typedef {Object} ForgeColors
 * @property {string} [fillTop]        Fill colour at the top of the shape.
 * @property {string} [fillBottom]     Fill colour at the bottom of the shape.
 * @property {string} [outline]        Outline (plate) colour; also shows through holes and detail lines.
 * @property {string} [outlineBottom]  Optional second outline colour for a vertical gradient.
 * @property {string} [depth]          Extrusion (3D edge) colour.
 * @property {string} [highlight]      Bevel lip colour on edges facing the light.
 * @property {string} [shade]          Bevel lip colour on edges facing away from the light.
 * @property {string} [ink]            Thin contour line between fill and outline (when `ink` > 0).
 * @property {string} [plateHighlight] Outline-plate bevel light colour (when `plateBevel` > 0).
 * @property {string} [plateShade]     Outline-plate bevel dark colour (when `plateBevel` > 0).
 * @property {string} [shadow]         Drop shadow colour (when `shadow` is on).
 */

/**
 * Built-in looks. `cream` matches the dock icons, `teal` the larger SFM/Blender/Patreon/Discord icons,
 * `olive` the HoovyTools arrow, `slate` is a dark variant, `badge` is the icon style used on badge plates.
 * @type {Readonly<Record<string, Object>>}
 */
export const PRESETS = Object.freeze({
  cream: {
    label: 'Cream (dock icons)',
    colors: {
      fillTop: '#f7e7cf', fillBottom: '#e8cba5', outline: '#6a7686', outlineBottom: null, depth: '#3b3a46',
      highlight: '#fff6e6', shade: '#cdb193', ink: '#3b3a46',
      plateHighlight: '#8692a1', plateShade: '#525c6a', shadow: '#121a24',
    },
    fillStops: [[0, '#f7e7cf'], [0.47, '#f5e3c8'], [0.53, '#f3dfbf'], [0.78, '#ecd3ae'], [1, '#e8cba5']],
    outlineWidth: 0.036, depth: 0.045, depthAngle: 90,
    bevel: 1, bevelWidth: 0.028, bevelSide: 1, lightAngle: 270,
    ink: 0, plateBevel: 0, plateBevelWidth: 0.02,
    shadow: false, shadowOpacity: 0.3, shadowBlur: 0.03, shadowOffset: 0.03,
  },
  teal: {
    label: 'Teal (big site icons)',
    colors: {
      fillTop: '#f2e6c9', fillBottom: '#ead5a8', outline: '#4c7a8c', outlineBottom: '#486f86', depth: '#2f333c',
      highlight: '#fff6dd', shade: '#c0ab86', ink: '#2f333c',
      plateHighlight: '#6c9aab', plateShade: '#36596b', shadow: '#121a24',
    },
    fillStops: [[0, '#f2e6c9'], [0.25, '#f1e5c7'], [0.55, '#ead7ad'], [1, '#ead5a8']],
    outlineWidth: 0.024, depth: 0.033, depthAngle: 90,
    bevel: 1, bevelWidth: 0.018, bevelSide: 0, lightAngle: 270,
    ink: 0, plateBevel: 0, plateBevelWidth: 0.016,
    shadow: false, shadowOpacity: 0.3, shadowBlur: 0.03, shadowOffset: 0.03,
  },
  olive: {
    label: 'Olive (HoovyTools arrow)',
    colors: {
      fillTop: '#ebd2a4', fillBottom: '#e6cb9a', outline: '#74884f', outlineBottom: '#6c8049', depth: '#213819',
      highlight: '#fdf2d2', shade: '#b89f62', ink: '#13300f',
      plateHighlight: '#c9d68e', plateShade: '#4f6534', shadow: '#0c1608',
    },
    fillStops: [[0, '#ebd2a4'], [0.3, '#e9cf9f'], [1, '#e6cb9a']],
    outlineWidth: 0.072, depth: 0.045, depthAngle: 122,
    bevel: 1, bevelWidth: 0.024, bevelSide: 0.6, lightAngle: 270,
    ink: 0.009, plateBevel: 1, plateBevelWidth: 0.022, smooth: 0.1,
    shadow: false, shadowOpacity: 0.3, shadowBlur: 0.03, shadowOffset: 0.03,
  },
  slate: {
    label: 'Slate (dark variant)',
    colors: {
      fillTop: '#a9bccf', fillBottom: '#6d859f', outline: '#1d2c3c', outlineBottom: null, depth: '#0b131c',
      highlight: '#dde8f3', shade: '#4d647d', ink: '#0b131c',
      plateHighlight: '#3a4f66', plateShade: '#101b27', shadow: '#000000',
    },
    fillStops: [[0, '#a9bccf'], [0.47, '#9cb0c5'], [0.53, '#93a8be'], [0.78, '#7e95ae'], [1, '#6d859f']],
    outlineWidth: 0.036, depth: 0.045, depthAngle: 90,
    bevel: 1, bevelWidth: 0.028, bevelSide: 1, lightAngle: 270,
    ink: 0, plateBevel: 0, plateBevelWidth: 0.02,
    shadow: false, shadowOpacity: 0.35, shadowBlur: 0.03, shadowOffset: 0.03,
  },
  badge: {
    label: 'Badge icon (dark olive outline)',
    colors: {
      fillTop: '#f6edc8', fillBottom: '#dfc893', outline: '#2b432f', outlineBottom: null, depth: '#11211a',
      highlight: '#fffbe6', shade: '#b39a63', ink: '#11211a',
      plateHighlight: '#476a4c', plateShade: '#1b2c1f', shadow: '#0b1409',
    },
    fillStops: [[0, '#f6edc8'], [0.47, '#f2e5bb'], [0.53, '#efdfb1'], [0.78, '#e6d2a0'], [1, '#dfc893']],
    outlineWidth: 0.04, depth: 0.045, depthAngle: 90,
    bevel: 1, bevelWidth: 0.028, bevelSide: 1, lightAngle: 270,
    ink: 0, plateBevel: 0, plateBevelWidth: 0.02,
    shadow: false, shadowOpacity: 0.3, shadowBlur: 0.03, shadowOffset: 0.03,
  },
});

/** Option defaults that are not part of a preset's look. */
export const DEFAULTS = Object.freeze({
  size: 256,
  padding: 0.015,
  preset: 'cream',
  supersample: 2,
  mask: 'auto',
  threshold: 0.5,
  fillHoles: false,
  holeMaxArea: 0,
  detail: false,
  detailThreshold: 0.35,
  detailGrow: 0,
  grow: 0,
  smooth: 0,
  soften: 'auto',
  trim: true,
  background: null,
});

/**
 * @typedef {Object} ForgeOptions
 * @property {number} [size=256]          Output width and height in px (8..1024 recommended, up to 2048).
 * @property {number} [padding=0.015]     Empty margin on each side, fraction of size (0..0.4; the hand-made icons use ~1%).
 * @property {'cream'|'teal'|'olive'|'slate'|'badge'|'custom'} [preset='cream'] Base look. 'custom' starts from `base` (default cream).
 * @property {string} [base]              Preset that 'custom' starts from.
 * @property {ForgeColors} [colors]       Colour overrides (any CSS colour). Flat aliases also work:
 *                                        fillTop, fillBottom, outlineColor, depthColor, highlightColor, shadeColor, shadowColor, inkColor.
 * @property {Array<[number,string]>} [fillStops] Explicit fill gradient stops [[0..1, colour], ...] (top to bottom).
 * @property {number} [outlineWidth]      Outline thickness, fraction of size (cream 0.036).
 * @property {number} [depth]             Extrusion length, fraction of size (cream 0.045).
 * @property {number} [depthAngle=90]     Extrusion direction in degrees (90 = straight down, 45 = down-right).
 * @property {number} [bevel=1]           Bevel strength (0 = flat, 1 = like the originals, up to 2).
 * @property {number} [bevelWidth]        Bevel lip width, fraction of size.
 * @property {number} [bevelSide]         How far the dark lip wraps up the sides (1 = dock icons, 0 = only down-facing edges).
 * @property {number} [lightAngle=270]    Direction the light comes from, degrees (270 = straight above, 225 = top-left; y down).
 * @property {number} [ink=0]             Dark contour line between fill and outline, fraction of size (olive uses it).
 * @property {number} [plateBevel=0]      Bevel strength on the outline plate itself (olive uses it).
 * @property {number} [plateBevelWidth]   Plate bevel width, fraction of size.
 * @property {boolean} [shadow=false]     Soft drop shadow under the sticker (the originals have none).
 * @property {number} [shadowOpacity=0.3]
 * @property {number} [shadowBlur=0.03]   Fraction of size.
 * @property {number} [shadowOffset=0.03] Fraction of size (downwards).
 * @property {'auto'|'alpha'|'background'|'dark-on-light'|'light-on-dark'} [mask='auto'] How the silhouette is read:
 *                                        'alpha' = transparency; 'background' = anything that differs from the
 *                                        border colour (any colour, either polarity); the other two = only darker /
 *                                        only lighter than the border. 'auto' = alpha if the image has transparency,
 *                                        else 'background'.
 * @property {number} [threshold=0.5]     0..1 cut-off: how far from the background (0) toward the shape (1) a pixel
 *                                        must be to count. For opaque images both ends are measured from the image,
 *                                        so it works on any background colour. Higher = stricter.
 * @property {boolean|'outline'|'depth'} [fillHoles=false] Enclosed holes: false = see-through with an outline ring and
 *                                        the dark depth crescent at the top (house door, Discord eyes), true/'outline' =
 *                                        plugged with the outline colour, 'depth' = plugged with the flat depth colour.
 * @property {number} [holeMaxArea=0]     With `fillHoles`: only plug holes smaller than this fraction of the icon area
 *                                        (e.g. 0.01), so small detail holes fill in while big ones (a door) stay open. 0 = all.
 * @property {boolean} [detail=false]     Keep inner details as outline-coloured cuts: anything inside the shape whose
 *                                        colour stands out from the shape's main colour (dark line work, text, or light
 *                                        knock-outs like the play triangle in a logo). When off, `forgeInfo.hints` says
 *                                        if the source has such details.
 * @property {number} [detailThreshold=0.35] 0..1 colour difference from the shape's main colour above which a pixel
 *                                        counts as a detail. Lower = more detail.
 * @property {number} [detailGrow=0]      Thicken (+) or thin (-) detail lines, fraction of size.
 * @property {number} [grow=0]            Thicken (+) or thin (-) the whole silhouette first, fraction of size.
 * @property {number} [smooth=0]          Closing radius for the outline plate (one plate behind nearby parts, like the arrow), fraction of size.
 * @property {'auto'|number} [soften='auto'] Smooth stair-steps of upscaled low-res rasters before tracing (blur radius in
 *                                        source px, then re-threshold). 'auto' = 0.4 px when a raster is enlarged, 0 = off.
 * @property {boolean} [trim=true]        Auto-trim to the content bounds before fitting.
 * @property {number} [supersample=2]     Render scale before the final downscale.
 * @property {string|null} [background=null] Optional solid background colour for the output.
 */

/* ------------------------------------------------------------------------------------------------
 * Small helpers
 * ---------------------------------------------------------------------------------------------- */

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const hasDOM = typeof document !== 'undefined';

function makeCanvas(w, h) {
  if (hasDOM) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  return new OffscreenCanvas(w, h);
}
function ctx2d(c, read = false) {
  return c.getContext('2d', read ? { willReadFrequently: true } : undefined);
}

let _colorCtx = null;
/**
 * Parse any CSS colour (or [r,g,b]) into [r,g,b] 0..255.
 * @param {string|number[]} c
 * @returns {number[]}
 */
export function parseColor(c) {
  if (Array.isArray(c)) return [c[0], c[1], c[2]];
  if (typeof c !== 'string') return [0, 0, 0];
  let s = c.trim();
  let m = /^#([0-9a-f]{3,8})$/i.exec(s);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map((x) => x + x).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(s);
  if (m) return [+m[1], +m[2], +m[3]];
  try {
    if (!_colorCtx) _colorCtx = ctx2d(makeCanvas(1, 1));
    _colorCtx.fillStyle = '#000';
    _colorCtx.fillStyle = s;
    s = _colorCtx.fillStyle;
    if (s[0] === '#') return parseColor(s);
    m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(s);
    if (m) return [+m[1], +m[2], +m[3]];
  } catch (e) { /* fall through */ }
  return [0, 0, 0];
}
let _probeCtx = null;
/**
 * True if `c` is a colour `parseColor` can read (any CSS colour string, or an [r, g, b] array).
 * @param {*} c
 * @returns {boolean}
 */
export function isColor(c) {
  if (Array.isArray(c)) return c.length >= 3 && c.slice(0, 3).every((v) => Number.isFinite(+v));
  if (typeof c !== 'string' || !c.trim()) return false;
  const s = c.trim();
  if (/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s)) return true;
  if (/^#/.test(s)) return false;
  if (typeof CSS !== 'undefined' && CSS.supports) return CSS.supports('color', s);
  try {
    if (!_probeCtx) _probeCtx = ctx2d(makeCanvas(1, 1));
    // An invalid value leaves fillStyle unchanged: try two different sentinels.
    _probeCtx.fillStyle = '#010203'; _probeCtx.fillStyle = s;
    if (_probeCtx.fillStyle !== '#010203') return true;
    _probeCtx.fillStyle = '#040506'; _probeCtx.fillStyle = s;
    return _probeCtx.fillStyle !== '#040506';
  } catch (e) { return false; }
}
const lumOf = (rgb) => (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
const mixRGB = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const toHex = (rgb) => '#' + rgb.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');

function stripUndef(o) {
  const r = {};
  if (o) for (const k of Object.keys(o)) if (o[k] !== undefined) r[k] = o[k];
  return r;
}

/** Re-colour a preset's gradient stops so they run from `top` to `bottom` but keep the preset's curve. */
function deriveStops(stops, top, bottom) {
  const c0 = parseColor(stops[0][1]), c1 = parseColor(stops[stops.length - 1][1]);
  const l0 = lumOf(c0), l1 = lumOf(c1);
  const T = parseColor(top), B = parseColor(bottom);
  return stops.map(([pos, col], i) => {
    let t = i === 0 ? 0 : i === stops.length - 1 ? 1 : (Math.abs(l1 - l0) > 1e-4 ? clamp01((lumOf(parseColor(col)) - l0) / (l1 - l0)) : pos);
    return [pos, toHex(mixRGB(T, B, t))];
  });
}

/**
 * Merge a preset with user options. Returns a plain object with every option filled in.
 * @param {ForgeOptions} [options]
 * @returns {Object}
 */
export function resolveOptions(options = {}) {
  const name = options.preset === 'custom' ? (PRESETS[options.base] ? options.base : 'cream')
    : (PRESETS[options.preset] ? options.preset : 'cream');
  const p = PRESETS[name];
  const user = stripUndef(options);
  const o = { ...DEFAULTS, ...p, ...user };
  o.preset = options.preset === 'custom' ? 'custom' : name;
  o.colors = { ...p.colors, ...stripUndef(options.colors || {}) };
  const alias = { fillTop: 'fillTop', fillBottom: 'fillBottom', outlineColor: 'outline', depthColor: 'depth',
    highlightColor: 'highlight', shadeColor: 'shade', shadowColor: 'shadow', inkColor: 'ink' };
  for (const k of Object.keys(alias)) if (options[k] != null) o.colors[alias[k]] = options[k];
  // Unreadable colours fall back to the preset's colour (not black) and are reported.
  o.warnings = [];
  for (const k of Object.keys(o.colors)) {
    const v = o.colors[k];
    if (v == null || isColor(v)) continue;
    o.warnings.push(`"${String(v).slice(0, 40)}" is not a colour (${k}); used the preset colour.`);
    o.colors[k] = p.colors[k] !== undefined ? p.colors[k] : null;
  }
  if (Array.isArray(options.fillStops) && options.fillStops.length && options.fillStops.every((st) => Array.isArray(st) && isColor(st[1]))) {
    o.fillStops = options.fillStops;
  } else {
    if (options.fillStops) o.warnings.push('fillStops must look like [[0, "#fff"], [1, "#000"]]; used the preset gradient.');
    const top = o.colors.fillTop, bot = o.colors.fillBottom;
    const same = (a, b) => toHex(parseColor(a)) === toHex(parseColor(b));
    if (!same(top, p.colors.fillTop) || !same(bot, p.colors.fillBottom)) o.fillStops = deriveStops(p.fillStops, top, bot);
    else o.fillStops = p.fillStops;
  }
  return o;
}

/* ------------------------------------------------------------------------------------------------
 * Source loading
 * ---------------------------------------------------------------------------------------------- */

/**
 * A loaded, drawable source.
 * @typedef {Object} ForgeSource
 * @property {CanvasImageSource} image  Something `drawImage` accepts.
 * @property {number} width             Intrinsic width of `image` in px.
 * @property {number} height            Intrinsic height of `image` in px.
 * @property {string} kind              'svg' | 'raster' | 'canvas'
 * @property {string} [name]            File name or URL, when known.
 */

/**
 * True for SVG markup (as opposed to a URL). Any string that is not a data:/blob:/http(s) URL and contains an
 * <svg> tag counts; DOMParser then decides if it is valid. This accepts the XML declarations, comments and
 * DOCTYPEs with internal subsets (`[<!ENTITY ...>]`) that Illustrator and Inkscape exports start with.
 * @param {*} s
 * @returns {boolean}
 */
export const isSvgText = (s) => typeof s === 'string' && !/^\s*(data|blob|https?):/i.test(s) && /<svg[\s>]/i.test(s);

function loadImage(url, crossOrigin) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image: ' + String(url).slice(0, 120)));
    img.src = url;
  });
}

/** Normalise SVG markup so it has a viewBox and a large explicit raster size, then rasterise it. */
async function svgToSource(text, name) {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const svg = doc.documentElement;
  if (!svg || svg.nodeName.toLowerCase() !== 'svg' || doc.getElementsByTagName('parsererror').length) {
    throw new Error('That does not look like valid SVG markup.');
  }
  if (!svg.getAttribute('xmlns')) svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const num = (v) => { const m = /^\s*([\d.]+)\s*(px)?\s*$/.exec(v || ''); return m ? parseFloat(m[1]) : NaN; };
  let vb = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
  if (vb.length !== 4 || vb.some((v) => !isFinite(v)) || vb[2] <= 0 || vb[3] <= 0) {
    const w = num(svg.getAttribute('width')), h = num(svg.getAttribute('height'));
    vb = [0, 0, isFinite(w) && w > 0 ? w : 512, isFinite(h) && h > 0 ? h : (isFinite(w) && w > 0 ? w : 512)];
    svg.setAttribute('viewBox', vb.join(' '));
  }
  const k = SVG_RASTER / Math.max(vb[2], vb[3]);
  const W = Math.max(1, Math.round(vb[2] * k)), H = Math.max(1, Math.round(vb[3] * k));
  svg.setAttribute('width', String(W));
  svg.setAttribute('height', String(H));
  if (!svg.getAttribute('preserveAspectRatio')) svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  const out = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([out], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url, false);
    try { await img.decode(); } catch (e) { /* already decoded */ }
    return { image: img, width: W, height: H, kind: 'svg', name, svg: out };
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/**
 * Load anything image-like into a drawable source.
 * @param {File|Blob|string|HTMLImageElement|HTMLCanvasElement|OffscreenCanvas|ImageBitmap|ImageData|ForgeSource} input
 *   A File/Blob (PNG, JPG, WebP, GIF, SVG...), a URL (http(s), relative, data:, blob:), raw SVG markup,
 *   an <img>, a <canvas>, an ImageBitmap/ImageData, or an already-loaded source.
 * @returns {Promise<ForgeSource>}
 */
export async function loadSource(input) {
  if (!input) throw new Error('No image given.');
  if (input.image && input.width && input.kind) return input; // already loaded
  // SVG markup
  if (typeof input === 'string' && isSvgText(input)) {
    // Drop anything pasted around the markup (a BOM, a sentence, a code fence) before parsing.
    const from = input.search(/<(\?xml|!--|!DOCTYPE|svg[\s>])/i), end = input.toLowerCase().lastIndexOf('</svg>');
    return svgToSource(input.slice(Math.max(0, from), end >= 0 ? end + 6 : undefined), 'pasted.svg');
  }
  // File / Blob
  if (typeof Blob !== 'undefined' && input instanceof Blob) {
    const name = input.name || 'image';
    const isSvg = /svg/i.test(input.type) || /\.svg$/i.test(name);
    if (isSvg) return svgToSource(await input.text(), name);
    const url = URL.createObjectURL(input);
    try {
      const img = await loadImage(url, false);
      return { image: img, width: img.naturalWidth, height: img.naturalHeight, kind: 'raster', name };
    } finally { setTimeout(() => URL.revokeObjectURL(url), 0); }
  }
  // URL string
  if (typeof input === 'string') {
    const url = input.trim();
    if (/^data:image\/svg\+xml/i.test(url)) {
      const comma = url.indexOf(',');
      const meta = url.slice(0, comma), body = url.slice(comma + 1);
      return svgToSource(/;base64/i.test(meta) ? atob(body) : decodeURIComponent(body), 'data.svg');
    }
    if (/\.svg(\?|#|$)/i.test(url) && !/^data:/i.test(url)) {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Could not fetch ' + url + ' (' + res.status + ')');
      return svgToSource(await res.text(), url.split('/').pop());
    }
    const img = await loadImage(url, !/^(data|blob):/i.test(url));
    return { image: img, width: img.naturalWidth, height: img.naturalHeight, kind: 'raster', name: url.split('/').pop() };
  }
  // DOM / bitmap objects
  if (typeof HTMLImageElement !== 'undefined' && input instanceof HTMLImageElement) {
    if (!input.complete || !input.naturalWidth) { try { await input.decode(); } catch (e) { /* ignore */ } }
    const src = input.currentSrc || input.src || '';
    if (/\.svg(\?|#|$)/i.test(src) || /^data:image\/svg/i.test(src)) return loadSource(src);
    if (!input.naturalWidth) throw new Error('Image has no size (not loaded?)');
    return { image: input, width: input.naturalWidth, height: input.naturalHeight, kind: 'raster', name: src.split('/').pop() };
  }
  if (typeof ImageData !== 'undefined' && input instanceof ImageData) {
    const c = makeCanvas(input.width, input.height); ctx2d(c).putImageData(input, 0, 0);
    return { image: c, width: input.width, height: input.height, kind: 'canvas' };
  }
  if ((typeof HTMLCanvasElement !== 'undefined' && input instanceof HTMLCanvasElement) ||
      (typeof OffscreenCanvas !== 'undefined' && input instanceof OffscreenCanvas) ||
      (typeof ImageBitmap !== 'undefined' && input instanceof ImageBitmap)) {
    return { image: input, width: input.width, height: input.height, kind: 'canvas' };
  }
  if (typeof HTMLVideoElement !== 'undefined' && input instanceof HTMLVideoElement) {
    return { image: input, width: input.videoWidth, height: input.videoHeight, kind: 'canvas' };
  }
  throw new Error('Unsupported input type.');
}

/* ------------------------------------------------------------------------------------------------
 * Coverage (mask) extraction
 *
 * Transparent images use their alpha. Opaque images (JPEGs, screenshots, logos on a coloured card) are
 * read against their own background: the background colour is the median of the border pixels, every
 * pixel gets a "how far from the background" value, and the cut is placed between the background level
 * and the shape level measured from the image (Otsu split of that value's histogram). So a white heart
 * on orange or a dark logo on mid-blue gives the same clean mask as black on white, and the threshold
 * means the same thing for every mode: 0.5 = halfway between background and shape, higher = stricter.
 * ---------------------------------------------------------------------------------------------- */

/** Mask modes `forgeIcon` understands (plus 'auto'). */
export const MASK_MODES = Object.freeze(['alpha', 'background', 'dark-on-light', 'light-on-dark']);

const RGB_MAX_DIST = Math.sqrt(3) * 255;
const lum255 = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

/**
 * Guess how to read a silhouette from pixel data: 'alpha' when the image has real transparency,
 * otherwise 'background' (difference from the border colour, whatever that colour is).
 * @param {Uint8ClampedArray} data RGBA
 * @param {number} w
 * @param {number} h
 * @returns {'alpha'|'background'}
 */
export function detectMaskMode(data, w, h) {
  const n = w * h;
  let transparent = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 128) transparent++;
  return transparent > n * 0.01 ? 'alpha' : 'background';
}

/** Median of a 256-bin histogram holding `count` samples. */
function histMedian(hist, count, from = 0, to = 256) {
  let acc = 0;
  for (let v = from; v < to; v++) { acc += hist[v]; if (acc * 2 >= count) return v; }
  return to - 1;
}

/** Background colour (per-channel median of the border, composited on `matte`) and its luminance. */
function borderStats(data, w, h, matte) {
  const hr = new Uint32Array(256), hg = new Uint32Array(256), hb = new Uint32Array(256);
  let cnt = 0;
  const add = (x, y) => {
    const i = (y * w + x) * 4, a = data[i + 3] / 255, m = matte * (1 - a);
    hr[Math.round(data[i] * a + m)]++; hg[Math.round(data[i + 1] * a + m)]++; hb[Math.round(data[i + 2] * a + m)]++; cnt++;
  };
  for (let x = 0; x < w; x++) { add(x, 0); if (h > 1) add(x, h - 1); }
  for (let y = 1; y < h - 1; y++) { add(0, y); if (w > 1) add(w - 1, y); }
  const bg = [histMedian(hr, cnt), histMedian(hg, cnt), histMedian(hb, cnt)];
  return { bg, lumBg: lumOf(bg) };
}

/**
 * Per-pixel "shape-ness" before normalisation (0 = background). Transparent pixels count as background.
 * @returns {(r:number,g:number,b:number,a:number)=>number}
 */
function rawValueFn(mode, st) {
  if (mode === 'alpha') return (r, g, b, a) => a / 255;
  if (mode === 'dark-on-light') return (r, g, b, a) => { const t = a / 255; return st.lumBg - (t * lum255(r, g, b) + (1 - t)); };
  if (mode === 'light-on-dark') return (r, g, b, a) => (a / 255) * lum255(r, g, b) - st.lumBg;
  const [br, bgr, bb] = st.bg;
  return (r, g, b, a) => {
    const t = a / 255, dr = (r - br) * t, dg = (g - bgr) * t, db = (b - bb) * t; // composite on the background colour
    return Math.sqrt(dr * dr + dg * dg + db * db) / RGB_MAX_DIST;
  };
}

/**
 * Measure how to read a silhouette from pixel data (call on the whole source, not a padded canvas).
 * The background level comes from the border; the shape level is the 25th percentile of everything clearly
 * above the border's noise, so the cut lands below the weakest main colour of the shape (a cream disc with
 * black lines on white keeps the cream, not just the lines).
 * @returns {{mode:string, bg:number[], lumBg:number, lo:number, hi:number, flat:boolean}}
 *   lo/hi = background and shape levels of the raw value; `flat` = no usable contrast.
 */
function analyseMask(data, w, h, mode) {
  const st = { mode, bg: [255, 255, 255], lumBg: 1, lo: 0, hi: 1, flat: false };
  if (mode === 'alpha') return st;
  const matte = mode === 'light-on-dark' ? 0 : 255;
  // Real transparency: read the image on its matte (white, or black for light-on-dark) instead of the border,
  // which may be the logo itself when it runs to the edge.
  const onMatte = detectMaskMode(data, w, h) === 'alpha';
  if (onMatte) { st.bg = [matte, matte, matte]; st.lumBg = matte / 255; } else Object.assign(st, borderStats(data, w, h, matte));
  const val = rawValueFn(mode, st);
  const q = (v) => Math.round(clamp01(v) * 1023);
  // Border noise: median + 4 x median absolute deviation (robust even if the shape touches the edge a little).
  const bh = new Uint32Array(1024);
  let bc = 0;
  const addB = (x, y) => { const i = (y * w + x) * 4; bh[q(val(data[i], data[i + 1], data[i + 2], data[i + 3]))]++; bc++; };
  for (let x = 0; x < w; x++) { addB(x, 0); if (h > 1) addB(x, h - 1); }
  for (let y = 1; y < h - 1; y++) { addB(0, y); if (w > 1) addB(w - 1, y); }
  const pct = (hist, count, p) => { let acc = 0; for (let v = 0; v < hist.length; v++) { acc += hist[v]; if (acc >= count * p) return v / 1023; } return 1; };
  const med = onMatte ? 0 : pct(bh, bc, 0.5);
  const dev = new Uint32Array(1024);
  for (let v = 0; v < 1024; v++) if (bh[v]) dev[Math.min(1023, Math.round(Math.abs(v / 1023 - med) * 1023))] += bh[v];
  const noiseCut = Math.max(0.04, med + (onMatte ? 0 : 4 * pct(dev, bc, 0.5)));
  const hist = new Uint32Array(1024);
  let fg = 0, total = 0;
  for (let i = 0; i < data.length; i += 4) {
    const v = val(data[i], data[i + 1], data[i + 2], data[i + 3]); total++;
    if (v > noiseCut * 1.5) { hist[q(v)]++; fg++; }
  }
  st.lo = Math.max(0, med);
  st.hi = fg ? pct(hist, fg, 0.25) : st.lo;
  st.flat = st.hi - st.lo < 0.05 || fg < Math.max(4, total * 0.0005);
  return st;
}

/**
 * Most common colour among the given pixels (coarse 4-bit histogram, then the mean of the winning bin).
 * @returns {number[]|null}
 */
function dominantColor(data, n, pick) {
  const counts = new Uint32Array(4096);
  for (let i = 0, j = 0; i < n; i++, j += 4) if (pick(i)) counts[((data[j] >> 4) << 8) | ((data[j + 1] >> 4) << 4) | (data[j + 2] >> 4)]++;
  let bin = -1, max = 0;
  for (let b = 0; b < 4096; b++) if (counts[b] > max) { max = counts[b]; bin = b; }
  if (bin < 0) return null;
  let r = 0, g = 0, b = 0, c = 0;
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    if (pick(i) && (((data[j] >> 4) << 8) | ((data[j + 1] >> 4) << 4) | (data[j + 2] >> 4)) === bin) { r += data[j]; g += data[j + 1]; b += data[j + 2]; c++; }
  }
  return [r / c, g / c, b / c];
}

/** Zero every connected blob (8-connected, cov > 0) that never reaches 50 % coverage: JPEG noise, stray specks. */
function dropFaint(cov, w, h) {
  const n = w * h, seen = new Uint8Array(n), stack = new Int32Array(n), blob = [];
  for (let s = 0; s < n; s++) {
    if (seen[s] || cov[s] <= 0) continue;
    let sp = 0, peak = 0; blob.length = 0;
    seen[s] = 1; stack[sp++] = s;
    while (sp > 0) {
      const i = stack[--sp], x = i % w, y = (i - x) / w;
      blob.push(i); if (cov[i] > peak) peak = cov[i];
      for (let yy = Math.max(0, y - 1); yy <= Math.min(h - 1, y + 1); yy++) {
        for (let xx = Math.max(0, x - 1); xx <= Math.min(w - 1, x + 1); xx++) {
          const j = yy * w + xx;
          if (!seen[j] && cov[j] > 0) { seen[j] = 1; stack[sp++] = j; }
        }
      }
    }
    if (peak < 0.5) for (const i of blob) cov[i] = 0;
  }
  return cov;
}

/**
 * RGBA -> coverage 0..1, plus an optional detail map: pixels inside the shape whose colour stands out from
 * the shape's main colour (dark line work, or light knock-outs like the play triangle in a logo).
 * @param {Uint8ClampedArray} data
 * @param {number} n pixel count
 * @param {Object} st  result of analyseMask
 * @param {number} thr threshold 0..1
 * @param {{threshold:number}|null} detail  detail settings; null = do not build the detail map
 * @param {boolean} [measure] build the detail map anyway (to report how much detail there is)
 */
function coverageFromRGBA(data, n, st, thr, detail, measure = false) {
  const cov = new Float32Array(n);
  const t = clamp(+thr || 0.5, 0.01, 0.99);
  if (st.mode === 'alpha') {
    const soft = 0.25;
    for (let i = 0, j = 3; i < n; i++, j += 4) cov[i] = clamp01((data[j] / 255 - (t - soft)) / (2 * soft));
  } else if (!st.flat) {
    // Normalise to 0 (background level) .. 1 (shape level) and cut with a ramp relative to that contrast,
    // so leftover background (JPEG noise, a tinted card) drops to exactly 0 instead of a faint plate.
    const val = rawValueFn(st.mode, st), span = st.hi - st.lo, soft = 0.15;
    for (let i = 0, j = 0; i < n; i++, j += 4) {
      const u = (val(data[j], data[j + 1], data[j + 2], data[j + 3]) - st.lo) / span;
      const c = clamp01((u - (t - soft)) / (2 * soft));
      cov[i] = c < 0.04 ? 0 : c;
    }
  }
  if (!detail && !measure) return { cov, det: null };
  // Detail map: contrast against the shape's main colour. For opaque images, measure the distance to the
  // line between that colour and the background so anti-aliased rims (a blend of the two) never count.
  const opaque = st.mode !== 'alpha';
  const fillC = dominantColor(data, n, (i) => cov[i] > 0.9 && data[i * 4 + 3] > 128);
  if (!fillC) return { cov, det: null };
  const bgC = opaque ? st.bg : null;
  const seg = bgC ? [bgC[0] - fillC[0], bgC[1] - fillC[1], bgC[2] - fillC[2]] : null;
  const segL2 = seg ? seg[0] * seg[0] + seg[1] * seg[1] + seg[2] * seg[2] : 0;
  const dthr = clamp(detail && detail.threshold != null ? +detail.threshold : 0.35, 0.02, 0.98);
  const det = new Float32Array(n);
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    if (cov[i] <= 0 || data[j + 3] < 128) continue;
    let dr = data[j] - fillC[0], dg = data[j + 1] - fillC[1], db = data[j + 2] - fillC[2];
    if (segL2 > 1) {
      const k = clamp01((dr * seg[0] + dg * seg[1] + db * seg[2]) / segL2);
      dr -= k * seg[0]; dg -= k * seg[1]; db -= k * seg[2];
    }
    det[i] = clamp01((Math.sqrt(dr * dr + dg * dg + db * db) / RGB_MAX_DIST - (dthr - 0.06)) / 0.12);
  }
  return { cov, det, fill: fillC };
}

/* ------------------------------------------------------------------------------------------------
 * Distance fields (exact Euclidean distance transform, Felzenszwalb & Huttenlocher 2012)
 * ---------------------------------------------------------------------------------------------- */

function makeSdf(w, h) {
  const n = w * h, L = Math.max(w, h);
  const outer = new Float32Array(n), inner = new Float32Array(n);
  const f = new Float64Array(L), z = new Float64Array(L + 1), v = new Int32Array(L);

  function edt1d(grid, offset, stride, length) {
    v[0] = 0; z[0] = -INF; z[1] = INF; f[0] = grid[offset];
    for (let q = 1, k = 0, s = 0; q < length; q++) {
      f[q] = grid[offset + q * stride];
      const q2 = q * q;
      do { const r = v[k]; s = (f[q] - f[r] + q2 - r * r) / (q - r) / 2; } while (s <= z[k] && --k > -1);
      k++; v[k] = q; z[k] = s; z[k + 1] = INF;
    }
    for (let q = 0, k = 0; q < length; q++) {
      while (z[k + 1] < q) k++;
      const r = v[k], qr = q - r;
      grid[offset + q * stride] = f[r] + qr * qr;
    }
  }
  function edt(grid) {
    for (let x = 0; x < w; x++) edt1d(grid, x, w, h);
    for (let y = 0; y < h; y++) edt1d(grid, y * w, 1, w);
  }
  /**
   * Signed distance (px) from coverage: > 0 outside, < 0 inside, 0 on the 50% iso-line.
   * Partially covered pixels seed the transform with a sub-pixel offset (as in Mapbox tiny-sdf).
   */
  return function sdf(cov, out) {
    for (let i = 0; i < n; i++) {
      const a = cov[i];
      if (a >= 0.999) { outer[i] = 0; inner[i] = INF; }
      else if (a <= 0.001) { outer[i] = INF; inner[i] = 0; }
      else { const d = 0.5 - a; outer[i] = d > 0 ? d * d : 0; inner[i] = d < 0 ? d * d : 0; }
    }
    edt(outer); edt(inner);
    const D = out || new Float32Array(n);
    for (let i = 0; i < n; i++) D[i] = Math.sqrt(outer[i]) - Math.sqrt(inner[i]);
    return D;
  };
}

/** Coverage of the shape grown by k px (negative k shrinks). */
function offsetCov(D, k) {
  const n = D.length, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const v = 0.5 - (D[i] - k); c[i] = v <= 0 ? 0 : v >= 1 ? 1 : v; }
  return c;
}

/** out = max(out, src shifted by integer (ox, oy)). */
function maxShiftInt(out, src, w, h, ox, oy) {
  const y0 = Math.max(0, oy), y1 = Math.min(h, h + oy), x0 = Math.max(0, ox), x1 = Math.min(w, w + ox);
  for (let y = y0; y < y1; y++) {
    const o = y * w, so = (y - oy) * w - ox;
    for (let x = x0; x < x1; x++) { const v = src[so + x]; if (v > out[o + x]) out[o + x] = v; }
  }
}

/** out = max(out, src shifted by a fractional (ox, oy), bilinear). */
function maxShiftBilinear(out, src, w, h, ox, oy) {
  const ix = Math.floor(ox), iy = Math.floor(oy);
  const wx = 1 - (ox - ix), wy = 1 - (oy - iy); // weight of the (x0+1, y0+1) sample
  const xs = Math.max(0, ix), xe = Math.min(w, w + ix + 1), ys = Math.max(0, iy), ye = Math.min(h, h + iy + 1);
  for (let y = ys; y < ye; y++) {
    const y0 = y - iy - 1, y1 = y0 + 1;
    const r0 = y0 >= 0 && y0 < h ? y0 * w : -1, r1 = y1 >= 0 && y1 < h ? y1 * w : -1;
    const o = y * w;
    for (let x = xs; x < xe; x++) {
      const x0 = x - ix - 1, x1 = x0 + 1, in0 = x0 >= 0 && x0 < w, in1 = x1 >= 0 && x1 < w;
      const a00 = r0 >= 0 && in0 ? src[r0 + x0] : 0, a01 = r0 >= 0 && in1 ? src[r0 + x1] : 0;
      const a10 = r1 >= 0 && in0 ? src[r1 + x0] : 0, a11 = r1 >= 0 && in1 ? src[r1 + x1] : 0;
      const v = (1 - wy) * ((1 - wx) * a00 + wx * a01) + wy * ((1 - wx) * a10 + wx * a11);
      if (v > out[o + x]) out[o + x] = v;
    }
  }
}

/**
 * Union of the shape swept along (dx, dy): the extrusion / depth layer.
 * Minkowski sum with the segment, built by log-doubling integer shifts (O(n log L) instead of O(n L)),
 * plus one exact sub-pixel copy at the far end so the bottom edge stays anti-aliased.
 */
function extrude(src, w, h, dx, dy) {
  const out = Float32Array.from(src);
  const len = Math.hypot(dx, dy);
  if (len < 0.05) return out;
  const n = Math.max(1, Math.round(len));            // sweep in ~1px steps: offsets 0..n
  const ux = dx / n, uy = dy / n;
  const at = (k) => [Math.round(ux * k), Math.round(uy * k)];
  let span = 0;                                        // out currently covers steps 0..span
  for (let k = 1; span + k <= n; k *= 2) {
    const tmp = Float32Array.from(out), [ox, oy] = at(k);
    maxShiftInt(out, tmp, w, h, ox, oy);
    span += k;
  }
  if (span < n) { const tmp = Float32Array.from(out), [ox, oy] = at(n - span); maxShiftInt(out, tmp, w, h, ox, oy); }
  maxShiftBilinear(out, src, w, h, dx, dy);
  return out;
}

/** Separable box blur, `passes` times (3 passes ~ gaussian). */
function boxBlur(src, w, h, r, passes = 3) {
  r = Math.max(0, Math.round(r));
  let a = Float32Array.from(src);
  if (r < 1) return a;
  let b = new Float32Array(a.length);
  const inv = 1 / (2 * r + 1);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) { // horizontal
      const o = y * w; let acc = 0;
      for (let x = -r; x <= r; x++) acc += a[o + clamp(x, 0, w - 1)];
      for (let x = 0; x < w; x++) {
        b[o + x] = acc * inv;
        acc += a[o + Math.min(w - 1, x + r + 1)] - a[o + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) { // vertical
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += b[clamp(y, 0, h - 1) * w + x];
      for (let y = 0; y < h; y++) {
        a[y * w + x] = acc * inv;
        acc += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x];
      }
    }
  }
  return a;
}

/** Pixels of enclosed background regions (4-connected flood from the border). */
function findHoles(cov, w, h) {
  const n = w * h, seen = new Uint8Array(n), stack = new Int32Array(n);
  let sp = 0;
  const open = (i) => cov[i] < 0.999;
  const push = (i) => { if (!seen[i] && open(i)) { seen[i] = 1; stack[sp++] = i; } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (sp > 0) {
    const i = stack[--sp], x = i % w;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (i >= w) push(i - w);
    if (i < n - w) push(i + w);
  }
  const holes = new Float32Array(n);
  let count = 0;
  for (let i = 0; i < n; i++) if (!seen[i] && open(i)) { holes[i] = 1; count++; }
  return count ? holes : null;
}

/** Keep only the holes (4-connected blobs) smaller than `maxArea` px; bigger ones stay see-through. */
function keepSmallHoles(holes, w, h, maxArea) {
  const n = w * h, seen = new Uint8Array(n), stack = new Int32Array(n), blob = [];
  let kept = 0;
  for (let s = 0; s < n; s++) {
    if (seen[s] || !holes[s]) continue;
    let sp = 0; blob.length = 0; seen[s] = 1; stack[sp++] = s;
    while (sp > 0) {
      const i = stack[--sp], x = i % w; blob.push(i);
      if (x > 0 && !seen[i - 1] && holes[i - 1]) { seen[i - 1] = 1; stack[sp++] = i - 1; }
      if (x < w - 1 && !seen[i + 1] && holes[i + 1]) { seen[i + 1] = 1; stack[sp++] = i + 1; }
      if (i >= w && !seen[i - w] && holes[i - w]) { seen[i - w] = 1; stack[sp++] = i - w; }
      if (i < n - w && !seen[i + w] && holes[i + w]) { seen[i + w] = 1; stack[sp++] = i + w; }
    }
    if (blob.length >= maxArea) for (const i of blob) holes[i] = 0; else kept++;
  }
  return kept ? holes : null;
}

/** Unit outward normals from a (smoothed) signed distance field. */
function normalsFrom(D, w, h, smoothR) {
  const S = smoothR >= 1 ? boxBlur(D, w, h, smoothR, 2) : D;
  const nx = new Float32Array(w * h), ny = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const ym = y > 0 ? y - 1 : y, yp = y < h - 1 ? y + 1 : y;
    for (let x = 0; x < w; x++) {
      const xm = x > 0 ? x - 1 : x, xp = x < w - 1 ? x + 1 : x;
      const gx = S[y * w + xp] - S[y * w + xm], gy = S[yp * w + x] - S[ym * w + x];
      const l = Math.hypot(gx, gy) || 1;
      nx[y * w + x] = gx / l; ny[y * w + x] = gy / l;
    }
  }
  return { nx, ny };
}

function gradientRows(stops, y0, y1, h) {
  const parsed = stops.map(([p, c]) => [clamp01(+p), parseColor(c)]).sort((a, b) => a[0] - b[0]);
  const rows = new Float32Array(h * 3);
  for (let y = 0; y < h; y++) {
    const t = y1 > y0 ? clamp01((y + 0.5 - y0) / (y1 - y0)) : 0;
    let c = parsed[parsed.length - 1][1];
    if (t <= parsed[0][0]) c = parsed[0][1];
    else for (let k = 1; k < parsed.length; k++) {
      if (t <= parsed[k][0]) {
        const [p0, c0] = parsed[k - 1], [p1, c1] = parsed[k];
        c = mixRGB(c0, c1, p1 > p0 ? (t - p0) / (p1 - p0) : 0); break;
      }
    }
    rows[y * 3] = c[0]; rows[y * 3 + 1] = c[1]; rows[y * 3 + 2] = c[2];
  }
  return rows;
}

function rowRange(cov, w, h) {
  let y0 = -1, y1 = -1;
  for (let y = 0; y < h && y0 < 0; y++) for (let x = 0; x < w; x++) if (cov[y * w + x] > 0.5) { y0 = y; break; }
  for (let y = h - 1; y >= 0 && y1 < 0; y--) for (let x = 0; x < w; x++) if (cov[y * w + x] > 0.5) { y1 = y + 1; break; }
  return y0 < 0 ? [0, h] : [y0, y1];
}

/* ------------------------------------------------------------------------------------------------
 * The renderer: coverage mask -> styled RGBA (all lengths in working px)
 * ---------------------------------------------------------------------------------------------- */

/**
 * @param {Float32Array} cov  silhouette coverage (0..1)
 * @param {Float32Array|null} det  detail coverage (parts that stand out from the main colour), or null
 * @param {number} w
 * @param {number} h
 * @param {Object} P  pixel-space parameters (see forgeIcon). P.detailMode: 'cut' carves `det` out of the fill,
 *   'measure' only reports (as a hint) when the source has inner details the silhouette hides.
 * @returns {{data: Uint8ClampedArray, warnings: string[], hints: string[]}}
 */
function renderLayers(cov, det, w, h, P) {
  const n = w * h, sdf = makeSdf(w, h), warnings = [], hints = [];
  let D0 = sdf(cov);
  let sil = cov;
  let grow = P.grow;
  if (grow < -0.05) {
    // Never shrink a shape out of existence: cap the shrink at half of its thickest part.
    let deepest = 0;
    for (let i = 0; i < n; i++) if (-D0[i] > deepest) deepest = -D0[i];
    if (-grow > deepest - 1) {
      grow = -Math.max(0, deepest * 0.5);
      warnings.push('Shrink limited: the shape is thinner than the shrink amount, so it would have vanished.');
    }
  }
  if (Math.abs(grow) > 0.05) { sil = offsetCov(D0, grow); D0 = sdf(sil); }
  let silSum = 0;
  for (let i = 0; i < n; i++) silSum += sil[i];

  // Fill = silhouette minus carved details.
  let fill = sil, Dfill = D0;
  if (det) {
    const dc = new Float32Array(n);
    let dsum = 0, deep = 0;
    const deepPx = Math.max(2, 0.02 * Math.max(w, h));
    for (let i = 0; i < n; i++) {
      const inside = clamp01(-D0[i] - 0.75);
      dc[i] = Math.min(det[i], inside); dsum += dc[i];
      if (dc[i] > 0.5 && -D0[i] > deepPx) deep++;
    }
    if (P.detailMode === 'measure') {
      if (silSum > 0 && deep > silSum * 0.004 && dsum / silSum < 0.6) {
        hints.push('This image has inner parts in a contrasting colour (line work, or a knock-out like the play triangle in a logo) that the plain silhouette fills in. Tick "Keep inner details" to cut them out as slate.');
      }
    } else if (silSum > 0 && dsum / silSum > 0.6) {
      warnings.push('Inner details skipped: most of the shape differs from its main colour. Raise the detail contrast setting.');
    } else if (dsum > 0) {
      let dcov = dc;
      if (Math.abs(P.detailGrow) > 0.05) dcov = offsetCov(sdf(dc), P.detailGrow);
      fill = new Float32Array(n);
      for (let i = 0; i < n; i++) fill[i] = Math.max(0, sil[i] - dcov[i]);
      Dfill = sdf(fill);
    }
  }
  let fillSum = 0;
  for (let i = 0; i < n; i++) fillSum += fill[i];
  if (fillSum < 4) warnings.push('The shape came out empty. Lower the threshold, use less shrink, or pick another mask mode.');

  // Outline plate = silhouette grown by the outline width, then optionally closed (dilate + erode by `smooth`)
  // so nearby parts share one plate, like the HoovyTools arrow. Dplate = signed distance to the plate edge.
  let Dplate;
  if (P.smooth > 0.05) {
    // Done in a padded buffer so the dilate/erode pair is not clipped by the canvas edge.
    const M = Math.ceil(P.ow + P.smooth + 2), W2 = w + 2 * M, H2 = h + 2 * M, sdf2 = makeSdf(W2, H2);
    const pad = new Float32Array(W2 * H2);
    for (let y = 0; y < h; y++) pad.set(sil.subarray(y * w, y * w + w), (y + M) * W2 + M);
    const Dc = sdf2(offsetCov(sdf2(pad), P.ow + P.smooth));
    Dplate = new Float32Array(n);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) Dplate[y * w + x] = Dc[(y + M) * W2 + x + M] + P.smooth;
  } else Dplate = D0.map((v) => v - P.ow);
  let plate = offsetCov(Dplate, 0);
  let holes = null;
  if (P.fillHoles) {
    holes = findHoles(plate, w, h);
    if (holes && P.holeMaxArea > 0) holes = keepSmallHoles(holes, w, h, P.holeMaxArea * n);
    if (holes && P.fillHoles !== 'depth') for (let i = 0; i < n; i++) if (holes[i] > plate[i]) plate[i] = holes[i];
  }

  // Extrusion (3D edge).
  const depthCov = extrude(plate, w, h, P.dx, P.dy);
  if (holes && P.fillHoles === 'depth') {
    // Plugged with the flat depth colour (a dark socket); the outline ring still frames it.
    for (let i = 0; i < n; i++) if (holes[i] > depthCov[i]) depthCov[i] = holes[i];
  }

  // Soft drop shadow (optional).
  let shadowCov = null;
  if (P.shadow) {
    const u = new Float32Array(n);
    for (let i = 0; i < n; i++) u[i] = Math.max(plate[i], depthCov[i]);
    const bl = boxBlur(u, w, h, P.shadowBlur / 1.7, 3);
    const sx = Math.round(P.shadowX), sy = Math.round(P.shadowY);
    shadowCov = new Float32Array(n);
    for (let y = 0; y < h; y++) {
      const yy = y - sy; if (yy < 0 || yy >= h) continue;
      for (let x = 0; x < w; x++) { const xx = x - sx; if (xx >= 0 && xx < w) shadowCov[y * w + x] = bl[yy * w + xx]; }
    }
  }

  const inkCov = P.ink > 0.05 ? offsetCov(Dfill, P.ink) : null;

  // Bevel normals.
  const fN = P.bevel > 0 ? normalsFrom(Dfill, w, h, Math.max(1, Math.round(P.bw * 0.22))) : null;
  const pN = P.plateBevel > 0 ? normalsFrom(Dplate, w, h, Math.max(1, Math.round(P.pbw * 0.22))) : null;
  const lx = Math.cos(P.lightAngle * Math.PI / 180), ly = Math.sin(P.lightAngle * Math.PI / 180);

  const [fy0, fy1] = rowRange(fill, w, h);
  const fillRows = gradientRows(P.fillStops, fy0, fy1, h);
  const [py0, py1] = rowRange(plate, w, h);
  const C = P.colors;
  const plateRows = gradientRows([[0, C.outline], [1, C.outlineBottom || C.outline]], py0, py1, h);
  const cDepth = parseColor(C.depth), cHi = parseColor(C.highlight), cSh = parseColor(C.shade);
  const cInk = parseColor(C.ink), cShadow = parseColor(C.shadow);
  const cPHi = parseColor(C.plateHighlight), cPSh = parseColor(C.plateShade);

  const out = new Uint8ClampedArray(n * 4);
  const bw = Math.max(0.75, P.bw), pbw = Math.max(0.75, P.pbw);
  // Bevel lip model (fitted to the originals): k = n.L (+1 = edge faces the light). Edges facing away get a
  // dark lip that is widest on down-facing edges and narrows as it wraps up the sides; `side` (0..1) sets how
  // far up the sides it wraps. Edges facing the light get a bright lip instead. Writes SH / HI (0..1).
  let SH = 0, HI = 0;
  const lip = (k, d, w, side, strength) => {
    const c = -0.55 + 0.8 * side;
    const sK = smoothstep(c + 0.35, c - 0.35, k);
    const wS = w * (0.62 + 0.38 * (k < 0 ? Math.min(1, -k) : 0));
    SH = sK > 0 ? clamp01(sK * (1 - smoothstep(0.5 * wS, wS, d)) * strength) : 0;
    const hK = smoothstep(0.15, 0.65, k);
    const wH = w * 0.85;
    HI = hK > 0 ? clamp01(hK * (1 - smoothstep(0.45 * wH, wH, d)) * strength) : 0;
  };

  for (let y = 0, i = 0; y < h; y++) {
    const fr = fillRows[y * 3], fg = fillRows[y * 3 + 1], fb = fillRows[y * 3 + 2];
    const pr0 = plateRows[y * 3], pg0 = plateRows[y * 3 + 1], pb0 = plateRows[y * 3 + 2];
    for (let x = 0; x < w; x++, i++) {
      let R = 0, G = 0, B = 0, A = 0, a;
      if (shadowCov && (a = shadowCov[i] * P.shadowOpacity) > 0.002) {
        R = cShadow[0] * a; G = cShadow[1] * a; B = cShadow[2] * a; A = a;
      }
      if ((a = depthCov[i]) > 0) {
        R = cDepth[0] * a + R * (1 - a); G = cDepth[1] * a + G * (1 - a); B = cDepth[2] * a + B * (1 - a); A = a + A * (1 - a);
      }
      if ((a = plate[i]) > 0) {
        let r = pr0, g = pg0, b = pb0;
        if (pN) {
          const d = -Dplate[i];
          if (d < pbw) {
            lip(pN.nx[i] * lx + pN.ny[i] * ly, d, pbw, 0.5, P.plateBevel);
            r += (cPSh[0] - r) * SH; g += (cPSh[1] - g) * SH; b += (cPSh[2] - b) * SH;
            r += (cPHi[0] - r) * HI; g += (cPHi[1] - g) * HI; b += (cPHi[2] - b) * HI;
          }
        }
        R = r * a + R * (1 - a); G = g * a + G * (1 - a); B = b * a + B * (1 - a); A = a + A * (1 - a);
      }
      if (inkCov && (a = Math.min(inkCov[i], plate[i])) > 0) {
        // contact line: strongest under the shape (away from the light), faint on the lit side
        if (fN) a *= 0.3 + 0.7 * smoothstep(0.5, -0.4, fN.nx[i] * lx + fN.ny[i] * ly);
        R = cInk[0] * a + R * (1 - a); G = cInk[1] * a + G * (1 - a); B = cInk[2] * a + B * (1 - a); A = a + A * (1 - a);
      }
      if ((a = fill[i]) > 0) {
        let r = fr, g = fg, b = fb;
        if (fN) {
          const d = -Dfill[i];
          if (d < bw) {
            lip(fN.nx[i] * lx + fN.ny[i] * ly, d, bw, P.bevelSide, P.bevel);
            r += (cSh[0] - r) * SH; g += (cSh[1] - g) * SH; b += (cSh[2] - b) * SH;
            r += (cHi[0] - r) * HI; g += (cHi[1] - g) * HI; b += (cHi[2] - b) * HI;
          }
        }
        R = r * a + R * (1 - a); G = g * a + G * (1 - a); B = b * a + B * (1 - a); A = a + A * (1 - a);
      }
      if (A > 0.0005) {
        const j = i * 4;
        out[j] = R / A; out[j + 1] = G / A; out[j + 2] = B / A; out[j + 3] = A * 255 + 0.5;
      }
    }
  }
  return { data: out, warnings, hints };
}

/** Draw RGBA into a canvas, then downscale to the output size with good filtering. */
function finalize(data, w, h, outW, outH, background) {
  let work = makeCanvas(w, h);
  ctx2d(work).putImageData(new ImageData(data, w, h), 0, 0);
  // Progressive halving keeps big reductions crisp.
  let cw = w, ch = h;
  while (cw / 2 >= outW * 1.0001 && ch / 2 >= outH * 1.0001) {
    const nw = Math.round(cw / 2), nh = Math.round(ch / 2);
    const c = makeCanvas(nw, nh), x = ctx2d(c);
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(work, 0, 0, nw, nh);
    work = c; cw = nw; ch = nh;
  }
  const out = makeCanvas(outW, outH), x = ctx2d(out);
  if (background) { x.fillStyle = background; x.fillRect(0, 0, outW, outH); }
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  x.drawImage(work, 0, 0, outW, outH);
  return out;
}

/** Find the source's content box (in source px), the mask mode and the mask levels. */
function probe(src, o) {
  const long = Math.max(src.width, src.height);
  const k = Math.min(4, 768 / long);
  const pw = Math.max(1, Math.round(src.width * k)), ph = Math.max(1, Math.round(src.height * k));
  const c = makeCanvas(pw, ph), x = ctx2d(c, true);
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  x.drawImage(src.image, 0, 0, pw, ph);
  let data;
  try { data = x.getImageData(0, 0, pw, ph).data; }
  catch (e) { throw new Error('This image is cross-origin and cannot be read. Download it and drop the file in instead.'); }
  const mode = MASK_MODES.includes(o.mask) ? o.mask : detectMaskMode(data, pw, ph);
  const st = analyseMask(data, pw, ph, mode);
  if (st.flat) {
    throw new Error(mode === 'background'
      ? 'No shape found: the image is one flat colour, or the shape is too close to its background colour.'
      : 'No shape found for this mask mode. Try "Auto-detect" or another mask mode.');
  }
  const { cov } = coverageFromRGBA(data, pw * ph, st, o.threshold, null);
  dropFaint(cov, pw, ph);
  let x0 = pw, y0 = ph, x1 = -1, y1 = -1;
  for (let y = 0; y < ph; y++) for (let xx = 0; xx < pw; xx++) {
    if (cov[y * pw + xx] > 0.08) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) throw new Error('No shape found in this image. Try another mask mode or threshold.');
  if (!o.trim) return { st, box: { x: 0, y: 0, w: src.width, h: src.height } };
  const pad = 0.5;
  return { st, box: { x: (x0 - pad) / k, y: (y0 - pad) / k, w: (x1 - x0 + 1 + 2 * pad) / k, h: (y1 - y0 + 1 + 2 * pad) / k } };
}

/** Number(v), or `d` when v is missing or not a finite number. */
const num = (v, d) => { if (v == null || v === '') return d; const x = Number(v); return Number.isFinite(x) ? x : d; };

/**
 * Forge a single icon.
 * @param {ForgeSource|File|Blob|string|HTMLImageElement|HTMLCanvasElement} source Anything `loadSource` accepts.
 * @param {ForgeOptions} [options]
 * @returns {Promise<HTMLCanvasElement>} A size x size canvas. `canvas.forgeInfo` holds
 *   `{ mode, warnings, hints, options }`: the mask mode actually used, problems worth showing the user
 *   (bad option values, a shape that vanished...), gentle suggestions, and the resolved options.
 */
export async function forgeIcon(source, options = {}) {
  const o = resolveOptions(options);
  const warnings = [...o.warnings], hints = [];
  const src = await loadSource(source);
  const sizeIn = num(o.size, NaN);
  if (!Number.isFinite(sizeIn)) warnings.push(`Size "${o.size}" is not a number; used 256 px.`);
  const size = Math.round(clamp(Number.isFinite(sizeIn) ? sizeIn : 256, 8, MAX_WORK));
  const ss = clamp(num(o.supersample, 2), 1, 4);
  const W = Math.min(MAX_WORK, Math.round(size * ss));
  const px = (f) => num(f, 0) * W;

  const ow = Math.max(0, px(o.outlineWidth)), dlen = Math.max(0, px(o.depth)), ang = num(o.depthAngle, 90) * Math.PI / 180;
  const dx = Math.cos(ang) * dlen, dy = Math.sin(ang) * dlen;
  const grow = px(o.grow);
  const shadowBlur = Math.max(0, px(o.shadowBlur)), shadowY = px(o.shadowOffset);
  const padIn = num(o.padding, DEFAULTS.padding);
  if (padIn > 0.4) warnings.push(`Padding ${padIn} leaves no room for the icon; used 0.4.`);
  const pad = clamp(padIn, 0, 0.4) * W;

  const { st, box } = probe(src, o);

  // Fit the content box + outline + extrusion (+ shadow) inside the padded square.
  const ext = ow + Math.max(0, grow);
  let L = ext + Math.max(0, -dx), R = ext + Math.max(0, dx), T = ext + Math.max(0, -dy), B = ext + Math.max(0, dy);
  if (o.shadow) {
    // Three box-blur passes of radius blur/1.7 reach ~1.76 x blur past the edge (+ rounding).
    const spread = shadowBlur * 1.8 + 2;
    L += spread; R += spread; T += Math.max(0, spread - shadowY); B += Math.max(0, shadowY) + spread;
  }
  const avail = W - 2 * pad;
  const scale = Math.max(1e-6, Math.min((avail - L - R) / box.w, (avail - T - B) / box.h));
  const cw = box.w * scale, ch = box.h * scale;
  const ox = (W - (cw + L + R)) / 2 + L, oy = (W - (ch + T + B)) / 2 + T;

  const c = makeCanvas(W, W), x = ctx2d(c, true);
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  x.drawImage(src.image, box.x, box.y, box.w, box.h, ox, oy, cw, ch);
  const data = x.getImageData(0, 0, W, W).data;
  const detailOn = !!o.detail && o.detail !== 'false';
  let { cov, det } = coverageFromRGBA(data, W * W, st, o.threshold, detailOn ? { threshold: o.detailThreshold } : null, !detailOn);
  dropFaint(cov, W, W);

  // Upscaled rasters: blur away pixel stair-steps, then re-threshold to a crisp 1px ramp.
  const up = scale; // working px per source px
  const softSrc = o.soften === 'auto' || o.soften == null ? (src.kind !== 'svg' && up > 1.5 ? 0.4 : 0) : Math.max(0, num(o.soften, 0));
  const sigma = softSrc * up;
  if (sigma >= 0.6) {
    const r = Math.max(1, Math.round(sigma)), kk = 2.5 * r;
    const crisp = (m) => { const bl = boxBlur(m, W, W, r, 3); for (let i = 0; i < bl.length; i++) bl[i] = clamp01((bl[i] - 0.5) * kk + 0.5); return bl; };
    cov = crisp(cov);
    if (det && detailOn) det = crisp(det);
  }

  const fh = o.fillHoles === 'outline' || o.fillHoles === 'true' ? true : o.fillHoles === 'false' ? false : o.fillHoles;
  const P = {
    ow, dx, dy, grow, smooth: Math.max(0, px(o.smooth)),
    bw: px(o.bevelWidth), bevel: num(o.bevel, 0), bevelSide: num(o.bevelSide, 0), lightAngle: num(o.lightAngle, 270),
    ink: px(o.ink), plateBevel: num(o.plateBevel, 0), pbw: px(o.plateBevelWidth),
    fillHoles: fh, holeMaxArea: Math.max(0, num(o.holeMaxArea, 0)), detailGrow: px(o.detailGrow), detailMode: detailOn ? 'cut' : 'measure',
    shadow: !!o.shadow, shadowOpacity: num(o.shadowOpacity, 0), shadowBlur, shadowX: 0, shadowY,
    colors: o.colors, fillStops: o.fillStops,
  };
  const res = renderLayers(cov, det, W, W, P);
  const out = finalize(res.data, W, W, size, size, o.background);
  out.forgeInfo = { mode: st.mode, warnings: warnings.concat(res.warnings), hints: hints.concat(res.hints), options: o };
  return out;
}

/**
 * Encode a canvas as a Blob.
 * @param {HTMLCanvasElement|OffscreenCanvas} canvas
 * @param {string} [type='image/png']
 * @returns {Promise<Blob>}
 */
export function canvasToBlob(canvas, type = 'image/png', quality) {
  if (canvas.convertToBlob) return canvas.convertToBlob({ type, quality });
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), type, quality));
}

/**
 * Forge and return a PNG Blob.
 * @param {*} source Anything `loadSource` accepts.
 * @param {ForgeOptions} [options]
 * @returns {Promise<Blob>}
 */
export async function forgeToBlob(source, options = {}) {
  return canvasToBlob(await forgeIcon(source, options), options.type || 'image/png');
}

/**
 * Forge and return a PNG data: URL.
 * @param {*} source Anything `loadSource` accepts.
 * @param {ForgeOptions} [options]
 * @returns {Promise<string>}
 */
export async function forgeToDataURL(source, options = {}) {
  return (await forgeIcon(source, options)).toDataURL(options.type || 'image/png');
}

/* ------------------------------------------------------------------------------------------------
 * Badge plates (olive chamfered "item badge" with a stamped label, like badge-hoovytools.png)
 * ---------------------------------------------------------------------------------------------- */

/**
 * @typedef {Object} BadgeOptions
 * @property {string} [label='']          Label text (uppercased unless `uppercase: false`). Long labels wrap to 2 lines.
 * @property {number} [width=390]         Output width in px (24..1600).
 * @property {number} [height]            Output height. Give only one of the two to keep the original 487:640 ratio
 *                                        (e.g. `{ height: 128 }` gives a 97 x 128 badge).
 * @property {string} [font]              CSS font-family list for the label. Default 'Lilita One' (bundled in assets/fonts/).
 * @property {string|number} [fontWeight=400]
 * @property {boolean} [uppercase=true]
 * @property {string} [iconPreset='badge'] Preset for the icon on the plate (any forgeIcon preset).
 * @property {ForgeOptions} [icon]        Extra forgeIcon options for the icon.
 * @property {number} [iconSize=0.66]     Icon box size, fraction of width.
 * @property {number} [iconY=0.36]        Icon centre, fraction of height.
 * @property {number} [labelY=0.815]      Label centre, fraction of height.
 * @property {number} [chamfer=0.125]     Corner cut, fraction of width.
 * @property {Object} [colors]            rim, frameTop, frameSide, frameBottom, frameLine, panelTop, panelBottom, depth,
 *                                        labelTop, labelBottom, labelOutline, labelDepth, labelHighlight, labelShade.
 * @property {number} [supersample=2]
 */

const BADGE_DEFAULTS = {
  label: '', width: 390, height: null, font: "'Lilita One', 'Luckiest Guy', 'Bowlby One', 'Arial Black', Impact, sans-serif",
  fontWeight: 400, uppercase: true, iconPreset: 'badge', icon: {}, iconSize: 0.66, iconY: 0.36, labelY: 0.815,
  chamfer: 0.125, depth: 0.03, supersample: 2, horizon: 0.655,
  colors: {
    rim: '#2d4430', frameTop: '#f3f2b9', frameSide: '#adb376', frameBottom: '#55744b', frameLine: '#cfe2a8',
    panelTop: '#80976a', panelBottom: '#667d55', depth: '#0a2010',
    labelTop: '#f7f7d0', labelBottom: '#dedca4', labelOutline: '#1f3219', labelDepth: '#14230f',
    labelHighlight: '#fdfee6', labelShade: '#b9b785',
  },
};

/** Fonts shipped with the site (OFL), loaded from next to this module so labels never depend on Google Fonts. */
const BUNDLED_FONTS = { 'lilita one': '../assets/fonts/lilita-one-latin-400-normal.woff2' };
const _fontLoads = new Map();
const fontSet = () => (hasDOM && document.fonts) || (typeof self !== 'undefined' && self.fonts) || null;
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

/**
 * Make sure the label font is ready before drawing text with it. 'Lilita One' is loaded from the bundled
 * assets/fonts/ file; any other family must be declared on the page (or registered with `loadFont`).
 * Works on the main thread and in workers.
 * @param {string} family CSS font-family list; the first family is loaded.
 * @param {string|number} weight
 * @param {number} [px=64]
 * @returns {Promise<boolean>} false when the first family could not be loaded (a fallback font will be used).
 */
async function ensureFont(family, weight, px = 64) {
  const set = fontSet();
  if (!set) return false;
  const first = family.split(',')[0].trim().replace(/^['"]|['"]$/g, '');
  const key = first.toLowerCase();
  if (BUNDLED_FONTS[key] && typeof FontFace !== 'undefined') {
    if (!_fontLoads.has(key)) {
      _fontLoads.set(key, (async () => {
        try {
          const ff = new FontFace(first, `url(${new URL(BUNDLED_FONTS[key], import.meta.url).href}) format('woff2')`, { weight: '400', style: 'normal' });
          await withTimeout(ff.load(), 5000);
          set.add(ff);
          return true;
        } catch (e) { return false; }
      })());
    }
    if (await _fontLoads.get(key)) return true;
  }
  try {
    const faces = await withTimeout(set.load(`${weight} ${px}px "${first}"`, 'HOOVY'), 2500);
    return Array.isArray(faces) && faces.length > 0;
  } catch (e) { return false; }
}

/**
 * Register a font file under a family name (handy in scripts, or for a custom label font).
 * @param {string} family
 * @param {string} url  URL or data: URL of a woff2/woff/ttf file.
 * @param {FontFaceDescriptors} [descriptors]
 * @returns {Promise<FontFace>}
 */
export async function loadFont(family, url, descriptors) {
  const ff = new FontFace(family, `url(${url})`, descriptors);
  await ff.load();
  const set = fontSet();
  if (set) set.add(ff);
  return ff;
}

function polygonCoverage(points, w, h) {
  const c = makeCanvas(w, h), x = ctx2d(c, true);
  x.fillStyle = '#fff';
  x.beginPath();
  points.forEach(([px_, py], i) => (i ? x.lineTo(px_, py) : x.moveTo(px_, py)));
  x.closePath(); x.fill();
  const d = x.getImageData(0, 0, w, h).data, cov = new Float32Array(w * h);
  for (let i = 0; i < cov.length; i++) cov[i] = d[i * 4 + 3] / 255;
  return cov;
}

async function renderLabel(text, o, W) {
  const family = o.font, weight = o.fontWeight;
  const fontOk = await ensureFont(family, weight, 64);
  const measureC = makeCanvas(8, 8), mx = ctx2d(measureC);
  const maxW = W * 0.82;
  const words = text.split(/\s+/).filter(Boolean);
  const measure = (s, fs) => { mx.font = `${weight} ${fs}px ${family}`; return mx.measureText(s).width; };
  let lines = [words.join(' ')];
  let fs = W * 0.128;
  if (measure(lines[0], fs) > maxW && words.length > 1) {
    let best = null;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
      const m = Math.max(measure(a, 100), measure(b, 100));
      if (!best || m < best.m) best = { m, lines: [a, b] };
    }
    lines = best.lines;
    fs = W * 0.098;
  }
  const widest = Math.max(...lines.map((s) => measure(s, fs)));
  if (widest > maxW) fs *= maxW / widest;
  const lineH = fs * 1.02;
  const ow = fs * 0.085, depth = fs * 0.1;
  const padX = Math.ceil(ow + 6), padY = Math.ceil(ow + depth + 6);
  const LW = Math.ceil(W), LH = Math.ceil(lineH * lines.length + padY * 2 + fs * 0.25);
  const c = makeCanvas(LW, LH), x = ctx2d(c, true);
  x.font = `${weight} ${fs}px ${family}`;
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff';
  try { x.letterSpacing = (fs * 0.015).toFixed(2) + 'px'; } catch (e) { /* older browsers */ }
  const top = (LH - lineH * lines.length) / 2;
  lines.forEach((s, i) => x.fillText(s, LW / 2, top + lineH * (i + 0.5)));
  const d = x.getImageData(0, 0, LW, LH).data, cov = new Float32Array(LW * LH);
  for (let i = 0; i < cov.length; i++) cov[i] = d[i * 4 + 3] / 255;
  const C = o.colors;
  const P = {
    ow, dx: 0, dy: depth, grow: 0, smooth: 0, bw: fs * 0.07, bevel: 1, bevelSide: 0.5, lightAngle: 270,
    ink: 0, plateBevel: 0, pbw: 1, fillHoles: false, holeMaxArea: 0, detailGrow: 0, detailMode: 'cut', shadow: false, shadowOpacity: 0, shadowBlur: 0, shadowX: 0, shadowY: 0,
    colors: { outline: C.labelOutline, depth: C.labelDepth, highlight: C.labelHighlight, shade: C.labelShade, ink: C.labelOutline,
      shadow: '#000', plateHighlight: C.labelOutline, plateShade: C.labelOutline },
    fillStops: [[0, C.labelTop], [0.5, C.labelTop], [1, C.labelBottom]],
  };
  const { data } = renderLayers(cov, null, LW, LH, P);
  const out = makeCanvas(LW, LH);
  ctx2d(out).putImageData(new ImageData(data, LW, LH), 0, 0);
  out.fontOk = fontOk;
  return out;
}

/**
 * Forge an olive item-badge plate (like media/hoovytools/badge-hoovytools.png): chamfered bevelled plate,
 * the forged icon on top and a stamped label underneath.
 * @param {*} source Anything `loadSource` accepts, or null for a label-only plate.
 * @param {BadgeOptions} [options]
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function forgeBadge(source, options = {}) {
  const o = { ...BADGE_DEFAULTS, ...stripUndef(options) };
  o.colors = { ...BADGE_DEFAULTS.colors, ...stripUndef(options.colors || {}) };
  // Size from width and/or height; a missing side keeps the original 487:640 plate ratio.
  const wIn = num(options.width, 0), hIn = num(options.height, 0);
  let Wout, Hout;
  if (wIn > 0) { Wout = Math.round(clamp(wIn, 24, 1600)); Hout = hIn > 0 ? Math.round(clamp(hIn, 24, 2100)) : Math.round((Wout * 640) / 487); }
  else if (hIn > 0) { Hout = Math.round(clamp(hIn, 32, 2100)); Wout = Math.max(24, Math.round((Hout * 487) / 640)); }
  else { Wout = 390; Hout = Math.round((Wout * 640) / 487); }
  o.width = Wout; o.height = Hout;
  const warnings = [];
  let hints = [];
  const ss = clamp(+o.supersample || 2, 1, 3);
  const k = Math.min(ss, MAX_WORK / Math.max(Wout, Hout));
  const W = Math.round(Wout * k), H = Math.round(Hout * k);
  const C = o.colors;
  const n = W * H;

  const depthPx = o.depth * W, m = W * 0.006, ch = o.chamfer * W;
  const x0 = m, y0 = m, x1 = W - m, y1 = H - m - depthPx;
  const poly = [[x0 + ch, y0], [x1 - ch, y0], [x1, y0 + ch], [x1, y1 - ch], [x1 - ch, y1], [x0 + ch, y1], [x0, y1 - ch], [x0, y0 + ch]];
  const cov = polygonCoverage(poly, W, H);
  const sdf = makeSdf(W, H);
  const D = sdf(cov);
  const depthCov = extrude(cov, W, H, 0, depthPx);
  const rimW = 0.022 * W, frameW = 0.034 * W, lineW = 0.012 * W;
  const N = normalsFrom(D, W, H, 1);
  const cRim = parseColor(C.rim), cTop = parseColor(C.frameTop), cSide = parseColor(C.frameSide), cBot = parseColor(C.frameBottom);
  const cLine = parseColor(C.frameLine), cPT = parseColor(C.panelTop), cPB = parseColor(C.panelBottom), cDepth = parseColor(C.depth);
  const lx = 0, ly = -1; // light from straight above
  const hz = o.horizon * H;
  const rgba = new Uint8ClampedArray(n * 4);
  for (let y = 0, i = 0; y < H; y++) {
    for (let x = 0; x < W; x++, i++) {
      let R = 0, G = 0, B = 0, A = 0, a;
      const over = (c, al) => { R = c[0] * al + R * (1 - al); G = c[1] * al + G * (1 - al); B = c[2] * al + B * (1 - al); A = al + A * (1 - al); };
      if ((a = depthCov[i]) > 0) over(cDepth, a);
      if ((a = cov[i]) > 0) over(cRim, a);
      const d = D[i];
      if ((a = clamp01(0.5 - (d + rimW))) > 0) {
        const kk = N.nx[i] * lx + N.ny[i] * ly;
        over(kk >= 0 ? mixRGB(cSide, cTop, Math.min(1, kk * 1.15)) : mixRGB(cSide, cBot, Math.min(1, -kk * 1.15)), a);
      }
      if ((a = clamp01(0.5 - (d + rimW + frameW))) > 0) {
        const kk = N.nx[i] * lx + N.ny[i] * ly;
        over(kk < -0.5 ? mixRGB(cLine, cBot, 0.25) : cLine, a);
      }
      if ((a = clamp01(0.5 - (d + rimW + frameW + lineW))) > 0) {
        const u = (x - W / 2) / (W / 2);
        const yh = hz + u * u * H * 0.035;
        const t = clamp01(y - yh + 0.5);
        const g = clamp01((y / H - 0.1) / 0.6) * 0.06;
        const base = mixRGB(mixRGB(cPT, cPB, g), cPB, t);
        over(base, a);
        // thin darker seam just inside the light line
        const seam = clamp01(1 - Math.abs(d + rimW + frameW + lineW + 1.2) / 1.2) * 0.35;
        if (seam > 0) over(mixRGB(cPB, cRim, 0.3), seam * a);
      }
      if (A > 0.0005) { const j = i * 4; rgba[j] = R / A; rgba[j + 1] = G / A; rgba[j + 2] = B / A; rgba[j + 3] = A * 255 + 0.5; }
    }
  }
  const work = makeCanvas(W, H), wx = ctx2d(work);
  wx.putImageData(new ImageData(rgba, W, H), 0, 0);
  wx.imageSmoothingEnabled = true; wx.imageSmoothingQuality = 'high';

  if (source) {
    const iconPx = Math.round(o.iconSize * W);
    const icon = await forgeIcon(source, { padding: 0.02, ...o.icon, preset: o.iconPreset, size: iconPx, supersample: 2 });
    wx.drawImage(icon, Math.round(W / 2 - iconPx / 2), Math.round(o.iconY * H - iconPx / 2));
    warnings.push(...icon.forgeInfo.warnings);
    hints = icon.forgeInfo.hints;
  }
  if (o.label) {
    const text = o.uppercase ? String(o.label).toUpperCase() : String(o.label);
    const lab = await renderLabel(text, o, W);
    if (!lab.fontOk) warnings.push(`Label font ${o.font.split(',')[0].trim()} could not be loaded; the label uses a fallback font.`);
    wx.drawImage(lab, Math.round(W / 2 - lab.width / 2), Math.round(o.labelY * H - lab.height / 2));
  }
  const out = makeCanvas(Wout, Hout), ox = ctx2d(out);
  ox.imageSmoothingEnabled = true; ox.imageSmoothingQuality = 'high';
  ox.drawImage(work, 0, 0, Wout, Hout);
  out.forgeInfo = { kind: 'badge', warnings, hints, options: o };
  return out;
}

/**
 * Forge a badge and return a PNG Blob.
 * @param {*} source
 * @param {BadgeOptions} [options]
 * @returns {Promise<Blob>}
 */
export async function forgeBadgeToBlob(source, options = {}) {
  return canvasToBlob(await forgeBadge(source, options), 'image/png');
}

/** Everything as one object, for non-module script tags: `window.IconForge`. */
const api = { VERSION, PRESETS, DEFAULTS, MASK_MODES, resolveOptions, parseColor, isColor, isSvgText, loadSource, detectMaskMode, forgeIcon, forgeToBlob,
  forgeToDataURL, forgeBadge, forgeBadgeToBlob, canvasToBlob, loadFont };
if (typeof window !== 'undefined' && !window.IconForge) window.IconForge = api;
export default api;

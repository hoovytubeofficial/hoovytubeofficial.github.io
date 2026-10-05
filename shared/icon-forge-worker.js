/**
 * @file Icon Forge worker - runs forgeIcon / forgeBadge off the main thread so the Icon Forge page stays
 * responsive while it forges (a 1024 px olive icon or a badge takes 1-3 s).
 *
 * Protocol (module worker; every request carries an `id`, every reply echoes it):
 *   { type: 'source', key, bitmap, width, height, kind, name }  -> { id, ok }      store a source (ImageBitmap, transferred)
 *   { type: 'icon' | 'badge', key, opts }                        -> { id, ok, bitmap, info } | { id, ok: false, error }
 *   { type: 'drop', key }                                        (no reply)        forget a source
 * `info` is `{ mode, warnings, hints }` from the canvas's forgeInfo. SVG sources are rasterised on the main
 * thread (workers have no DOMParser) and arrive as bitmaps; `kind` keeps them from being softened as rasters.
 */
import { forgeIcon, forgeBadge } from './icon-forge.js?v=2';

const sources = new Map();

self.onmessage = async (e) => {
  const m = e.data || {};
  if (m.type === 'drop') {
    const s = sources.get(m.key);
    if (s && s.image && s.image.close) s.image.close();
    sources.delete(m.key);
    return;
  }
  try {
    if (m.type === 'source') {
      sources.set(m.key, { image: m.bitmap, width: m.width, height: m.height, kind: m.kind || 'raster', name: m.name });
      self.postMessage({ id: m.id, ok: true });
      return;
    }
    const src = sources.get(m.key);
    if (!src) throw new Error('Source not loaded in the worker.');
    const c = m.type === 'badge' ? await forgeBadge(src, m.opts) : await forgeIcon(src, m.opts);
    const fi = c.forgeInfo || {};
    const bitmap = c.transferToImageBitmap ? c.transferToImageBitmap() : await createImageBitmap(c);
    self.postMessage({ id: m.id, ok: true, bitmap, info: { mode: fi.mode, warnings: fi.warnings || [], hints: fi.hints || [] } }, [bitmap]);
  } catch (err) {
    self.postMessage({ id: m.id, ok: false, error: (err && err.message) || String(err) });
  }
};

// autobyteus-472 API/E2E round 3 (temporary): with the zoomed live-472.png open, reads what the phone viewer shows (the
// image's src (shortened), its pixel at natural (16, 16), a checker cell whose red channel is the colour the file was written
// with: 230 at setup, 120 / 230 alternating per rewrite), rewrites the file on the node, and samples every 250 ms for 20 s.
import { evaluate, sleep } from './droid.mjs'; import { IMAGE } from './state.mjs'; import { execFileSync } from 'node:child_process';
const shown = () => evaluate(`(async () => { const img = document.querySelector('[data-testid="image-viewer-picture"] img'); if (!img) return null;
  let red = null; try { const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const g = c.getContext('2d'); g.drawImage(img, 0, 0); red = g.getImageData(48, 16, 1, 1).data[0]; } catch (e) { red = 'tainted:' + e.name; }
  return { src: img.src.replace(/^(blob:[^/]+\\/\\/[^/]+\\/)?(.{0,12}).*$/, '$1$2…'), srcFull: img.src.length, red, loading: !!document.querySelector('[data-testid="mobile-file-preview-loading"]') }; })()`);
const before = { view: await evaluate(IMAGE), shown: await shown() };
const t0 = Date.now(); const rewrote = execFileSync('node', [new URL('./live-files.mjs', import.meta.url).pathname, 'rewrite', 'png'], { encoding: 'utf8' }).trim();
const samples = []; let last = null;
while (Date.now() - t0 < 20000) { const s = await shown(); const t = (await evaluate(IMAGE))?.transform ?? null; const key = JSON.stringify([s?.src, s?.red, s?.loading, t]);
  if (key !== last) { samples.push({ ms: Date.now() - t0, ...s, transform: t }); last = key; } await sleep(250); }
console.log(JSON.stringify({ rewrote, before, samples, after: { view: await evaluate(IMAGE), shown: await shown() } }, null, 1));

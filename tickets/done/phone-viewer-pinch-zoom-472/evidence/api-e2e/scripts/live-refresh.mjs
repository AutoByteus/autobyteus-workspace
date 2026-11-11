// autobyteus-472 API/E2E round 3 (temporary): AC-005 / REQ-006 live. With a zoomed PDF or image open in the phone viewer,
// rewrites the file on the node (live-files.mjs rewrite) and samples the viewer every 150 ms for 20 s. A reload is proven
// by the viewer element being replaced (a marker set on the old element is gone) or the "Opening…" state; then the zoom
// and position after the reload are compared with those before. Usage: node live-refresh.mjs <pdf|png>
import { evaluate, sleep } from './droid.mjs'; import { PDF, IMAGE } from './state.mjs'; import { execFileSync } from 'node:child_process';
const kind = process.argv[2]; const sel = kind === 'pdf' ? '[data-testid="pdf-viewer-pages"]' : '[data-testid="image-viewer-picture"]';
const view = kind === 'pdf' ? PDF : IMAGE;
await evaluate(`(() => { const e = document.querySelector('${sel}'); if (e) e.dataset.abtestOld = '1'; return !!e; })()`);
const before = await evaluate(view);
const t0 = Date.now(); const rewrote = execFileSync('node', [new URL('./live-files.mjs', import.meta.url).pathname, 'rewrite', kind], { encoding: 'utf8' }).trim();
const samples = []; let reloadedAt = null, settledAt = null, last = null;
while (Date.now() - t0 < 20000) {
  const v = await evaluate(`(() => { const e = document.querySelector('${sel}'); const loading = !!document.querySelector('[data-testid="mobile-file-preview-loading"]');
    const img = e?.querySelector('img'); return { loading, element: e ? (e.dataset.abtestOld ? 'old' : 'new') : 'none', imgSrcKind: img ? img.src.slice(0, 5) : null,
      state: ${view} }; })()`);
  const key = JSON.stringify([v.loading, v.element, v.state?.pagesCssWidth ?? v.state?.transform, v.state?.scroll?.top, v.state?.scroll?.left]);
  if (key !== last) { samples.push({ ms: Date.now() - t0, loading: v.loading, element: v.element, zoom: v.state?.pagesCssWidth ?? v.state?.transform ?? null, scroll: v.state?.scroll ? [v.state.scroll.left, v.state.scroll.top] : null }); last = key; }
  if (!reloadedAt && (v.loading || v.element !== 'old')) reloadedAt = Date.now() - t0;
  if (reloadedAt && !settledAt && v.element === 'new' && !v.loading && (kind !== 'pdf' || (v.state && v.state.allBitmapsMatch && !v.state.transform))) settledAt = Date.now() - t0;
  if (settledAt && Date.now() - t0 > settledAt + 2500) break;
  await sleep(150);
}
const after = await evaluate(view);
const pick = v => v && (kind === 'pdf' ? { pagesCssWidth: v.pagesCssWidth, scroll: v.scroll, firstVisiblePage: v.firstVisiblePage, allBitmapsMatch: v.allBitmapsMatch } : { transform: v.transform, natural: v.natural });
console.log(JSON.stringify({ kind, rewrote, reloadedAtMs: reloadedAt, settledAtMs: settledAt, before: pick(before), after: pick(after), samples }, null, 1));

// autobyteus-472 API/E2E round 4 (temporary): a live refresh that starts soon after a scroll. Each trial: settle at position X
// (2.5 s: remembered); a slow one-finger drag (no fling) to Y; then the file is rewritten on the node either at once
// (`soon`, inside the viewer's 200 ms remember delay) or after 2.5 s (`late`, control). Where does the refresh put the view:
// Y (the position when the refresh started) or X (the one remembered before)? Usage: node refresh-soon-after-scroll.mjs <n>
import { evaluate, swipe, sleep } from './droid.mjs'; import { execFileSync } from 'node:child_process';
const n = Number(process.argv[2] || 3); const modes = (process.argv[3] || 'soon,late').split(','); const out = [];
const startTrace = () => evaluate(`(() => { window.__trace = []; window.__t0 = performance.now(); let last = ''; const s0 = document.querySelector('[data-testid="pdf-viewer-scroller"]');
  if (!window.__scrollHooked2) { window.__scrollHooked2 = true; window.__se = []; s0.addEventListener('scroll', () => window.__se.push([Math.round(performance.now() - window.__t0), Math.round(s0.scrollTop)]), { passive: true }); } window.__se = [];
  const tick = () => { const s = document.querySelector('[data-testid="pdf-viewer-scroller"]'); const p = document.querySelector('[data-testid="pdf-viewer-pages"]'); const cs = p ? [...p.querySelectorAll('canvas')] : null;
    const v = s ? [Math.round(s.scrollTop), s.scrollHeight, cs ? cs.length : -1, cs ? cs.filter(c => c.style.width).length : -1] : null; const k = JSON.stringify(v);
    if (k !== last) { window.__trace.push([Math.round(performance.now() - window.__t0), ...(v ?? [])]); last = k; } if (performance.now() - window.__t0 < 15000) requestAnimationFrame(tick); };
  requestAnimationFrame(tick); return 1; })()`);
const top = () => evaluate(`Math.round(document.querySelector('[data-testid="pdf-viewer-scroller"]').scrollTop)`);
const rewrite = () => execFileSync('node', [new URL('./live-files.mjs', import.meta.url).pathname, 'rewrite', 'pdf']);
for (const mode of modes) for (let t = 1; t <= n; t++) {
  await swipe(200, 600, 200, 450, 900); await sleep(2500); const x = await top(); await startTrace();
  const t0 = Date.now(); await swipe(200, 650, 200, 350, 1200); const dragEnd = Date.now() - t0;
  if (mode === 'late') await sleep(2500);
  const y = await top(); const startedAt = Date.now() - t0; rewrite();
  await sleep(4000); const after = await top();
  out.push({ mode, trial: t, x, y, after, restoredTo: Math.abs(after - y) <= 2 ? 'Y (position at refresh)' : Math.abs(after - x) <= 2 ? 'X (remembered before the drag)' : 'other', dragEndMs: dragEnd, refreshStartedMs: startedAt, rewriteAtPageMs: null, trace: await evaluate('window.__trace'), scrollEvents: await evaluate('window.__se') });
}
console.log(JSON.stringify(out, null, 1));

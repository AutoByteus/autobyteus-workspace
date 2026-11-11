// autobyteus-472 API/E2E round 4 (temporary): finds when and against what layout a refreshed PDF's position is put back.
// A recorder in the page logs the scroller's scrollTop / scrollHeight every animation frame (only changes) while the open,
// zoomed PDF is rewritten on the node (live-files.mjs rewrite pdf). Usage: node restore-trace.mjs <trial count>
import { evaluate, swipe, sleep } from './droid.mjs'; import { execFileSync } from 'node:child_process';
const trials = Number(process.argv[2] || 3); const out = [];
for (let t = 1; t <= trials; t++) {
  await swipe(200, 640 - t * 15, 200, 300, 350); await sleep(2500);
  const before = await evaluate(`(() => { const s = document.querySelector('[data-testid="pdf-viewer-scroller"]'); return { top: Math.round(s.scrollTop), height: s.scrollHeight }; })()`);
  await evaluate(`(() => { window.__trace = []; const t0 = performance.now(); let last = '';
    const tick = () => { const s = document.querySelector('[data-testid="pdf-viewer-scroller"]'); const p = document.querySelector('[data-testid="pdf-viewer-pages"]');
      const v = s ? [Math.round(s.scrollTop), s.scrollHeight, p ? p.querySelectorAll('canvas').length : -1] : null; const k = JSON.stringify(v);
      if (k !== last) { window.__trace.push([Math.round(performance.now() - t0), ...(v ?? [])]); last = k; }
      if (performance.now() - t0 < 4000) requestAnimationFrame(tick); };
    requestAnimationFrame(tick); return 'recording'; })()`);
  execFileSync('node', [new URL('./live-files.mjs', import.meta.url).pathname, 'rewrite', 'pdf']);
  await sleep(4500);
  const trace = await evaluate('window.__trace');
  const after = trace.at(-1);
  out.push({ trial: t, before, after: { top: after[1], height: after[2] }, positionKept: Math.abs(after[1] - before.top) <= 2,
    trace: trace.map(([ms, top, height, canvases]) => ({ ms, top, height, canvases })) });
}
console.log(JSON.stringify(out, null, 1));

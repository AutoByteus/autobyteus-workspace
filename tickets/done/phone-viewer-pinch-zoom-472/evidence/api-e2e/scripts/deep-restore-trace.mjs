// autobyteus-472 API/E2E round 4 (temporary): a refresh of the zoomed PDF scrolled deep into it, traced frame by frame
// (scrollTop, scrollHeight, page canvases), to see the layout the position is put back against. The position is set by
// the scroller (scroll events fire, so the viewer remembers it), left 2.5 s to be remembered, then the file is rewritten.
// Usage: node deep-restore-trace.mjs <comma-separated scrollTop targets>
import { evaluate, sleep } from './droid.mjs'; import { execFileSync } from 'node:child_process';
const targets = (process.argv[2] || '9000,6000,3500,8000').split(',').map(Number); const out = [];
for (const target of targets) {
  await evaluate(`(() => { const s = document.querySelector('[data-testid="pdf-viewer-scroller"]'); s.scrollTop = ${target}; return Math.round(s.scrollTop); })()`);
  await sleep(2500);
  const before = await evaluate(`(() => { const s = document.querySelector('[data-testid="pdf-viewer-scroller"]'); return { top: Math.round(s.scrollTop), height: s.scrollHeight }; })()`);
  await evaluate(`(() => { window.__trace = []; const t0 = performance.now(); let last = '';
    const tick = () => { const s = document.querySelector('[data-testid="pdf-viewer-scroller"]'); const p = document.querySelector('[data-testid="pdf-viewer-pages"]');
      const cs = p ? [...p.querySelectorAll('canvas')] : null; const sized = cs ? cs.filter(c => c.style.width).length : -1;
      const v = s ? [Math.round(s.scrollTop), s.scrollHeight, cs ? cs.length : -1, sized] : null; const k = JSON.stringify(v);
      if (k !== last) { window.__trace.push([Math.round(performance.now() - t0), ...(v ?? [])]); last = k; }
      if (performance.now() - t0 < 4500) requestAnimationFrame(tick); };
    requestAnimationFrame(tick); return 'recording'; })()`);
  execFileSync('node', [new URL('./live-files.mjs', import.meta.url).pathname, 'rewrite', 'pdf']);
  await sleep(5000);
  const trace = await evaluate('window.__trace'); const end = trace.at(-1);
  out.push({ target, before, after: { top: end[1], height: end[2] }, kept: Math.abs(end[1] - before.top) <= 2,
    trace: trace.map(([ms, top, height, canvases, sizedCanvases]) => ({ ms, top, height, canvases, sizedCanvases })) });
}
console.log(JSON.stringify(out, null, 1));

// autobyteus-472 API/E2E round 4 (temporary): tries to reproduce the one refresh whose position came back wrong (rewrite 1:
// 751 → 486). Each trial: double tap back to 1× if zoomed; a frame recorder starts (scrollTop, scrollHeight, canvases, and
// each `scroll` event's time); pinch to 2× and, without waiting for the redraw, a one-finger fling; 1 s later the PDF is
// rewritten on the node; the recorder runs on through the refresh. Usage: node fling-after-pinch.mjs <trials>
import { evaluate, pinch, swipe, dtap, sleep } from './droid.mjs'; import { execFileSync } from 'node:child_process';
const trials = Number(process.argv[2] || 4); const out = [];
const width = () => evaluate(`document.querySelector('[data-testid="pdf-viewer-pages"]')?.getBoundingClientRect().width ?? 0`);
for (let t = 1; t <= trials; t++) {
  if ((await width()) > 400) { await dtap(150, 300); await sleep(2500); }
  await evaluate(`(() => { window.__trace = []; window.__scrollEvents = []; const t0 = performance.now(); window.__t0 = t0; let last = '';
    const s0 = document.querySelector('[data-testid="pdf-viewer-scroller"]'); if (!window.__scrollHooked) { window.__scrollHooked = true; s0.addEventListener('scroll', () => window.__scrollEvents.push([Math.round(performance.now() - window.__t0), Math.round(s0.scrollTop)]), { passive: true }); }
    const tick = () => { const s = document.querySelector('[data-testid="pdf-viewer-scroller"]'); const p = document.querySelector('[data-testid="pdf-viewer-pages"]');
      const v = s ? [Math.round(s.scrollTop), s.scrollHeight, p ? p.querySelectorAll('canvas').length : -1, p ? Math.round(p.getBoundingClientRect().width) : -1] : null; const k = JSON.stringify(v);
      if (k !== last) { window.__trace.push([Math.round(performance.now() - t0), ...(v ?? [])]); last = k; }
      if (performance.now() - t0 < 12000) requestAnimationFrame(tick); };
    requestAnimationFrame(tick); return 'recording'; })()`);
  await pinch(206, 400, 80, 160, 12);
  await swipe(200, 700, 200, 200, 250);
  await sleep(1000);
  const beforeRewrite = await evaluate(`Math.round(document.querySelector('[data-testid="pdf-viewer-scroller"]').scrollTop)`);
  const rewriteAt = await evaluate('Math.round(performance.now() - window.__t0)');
  execFileSync('node', [new URL('./live-files.mjs', import.meta.url).pathname, 'rewrite', 'pdf']);
  await sleep(4000);
  const trace = await evaluate('window.__trace'); const events = await evaluate('window.__scrollEvents');
  const end = trace.at(-1);
  out.push({ trial: t, beforeRewrite, after: end[1], kept: Math.abs(end[1] - beforeRewrite) <= 2, rewriteAtMs: rewriteAt,
    trace: trace.map(([ms, top, h, c, w]) => [ms, top, h, c, w]), scrollEvents: events.slice(-40) });
}
console.log(JSON.stringify(out));

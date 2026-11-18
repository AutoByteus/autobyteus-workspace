// autobyteus-472 API/E2E (temporary): rewrites inside-472.pdf on the node (say.mjs touch) and samples the phone viewer
// every 250 ms for 15 s: whether it went through its loading state ("Opening…" / no pages) and where it ends.
import { evaluate, sleep } from './droid.mjs'; import { PDF } from './state.mjs'; import { execFileSync } from 'node:child_process';
const before = await evaluate(PDF); const t0 = Date.now();
console.log(execFileSync('node', [new URL('./say.mjs', import.meta.url).pathname, 'touch'], { encoding: 'utf8' }).trim());
const samples = []; let sawLoading = false;
while (Date.now() - t0 < 15000) { const v = await evaluate(`(() => { const loading = !!document.querySelector('[data-testid="mobile-file-preview-loading"]'); const p = ${PDF}; return { loading, w: p?.pagesCssWidth ?? null, top: p?.scroll.top ?? null, left: p?.scroll.left ?? null }; })()`);
  if (v.loading || v.w === null) sawLoading = true; const last = samples.at(-1);
  if (!last || last.loading !== v.loading || last.w !== v.w || last.top !== v.top || last.left !== v.left) samples.push({ ms: Date.now() - t0, ...v }); await sleep(250); }
const after = await evaluate(PDF);
console.log(JSON.stringify({ before: { w: before.pagesCssWidth, scroll: before.scroll }, sawLoading, changes: samples, after: { w: after.pagesCssWidth, scroll: after.scroll, firstVisiblePage: after.firstVisiblePage, allBitmapsMatch: after.allBitmapsMatch } }, null, 1));

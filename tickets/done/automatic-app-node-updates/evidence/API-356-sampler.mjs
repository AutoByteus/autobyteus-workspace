// TEMPORARY API/E2E harness (autobyteus-356), kept as evidence; not repository test code.
// Samples an install from outside every 500 ms: the update state over CDP (until the window goes), the server's
// /rest/health, and whether a marker command (a busy agent's) is alive. One JSON line per change, plus a final summary.
// Usage (cwd = clean checkout): node API-356-sampler.mjs <controlPort> <serverPort> <out.jsonl> <seconds> [marker]
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { execFileSync } from 'node:child_process';
const [cp, sp, out, secs, marker] = process.argv.slice(2);
const { chromium } = createRequire(path.join(process.cwd(), 'autobyteus-web/package.json'))('playwright-core');
let page = null; try { const b = await chromium.connectOverCDP(`http://127.0.0.1:${cp}`); page = b.contexts().flatMap((c) => c.pages()).find((p) => p.url().includes('index.html')); } catch {}
const w = (o) => fs.appendFileSync(out, JSON.stringify(o) + '\n');
let last = ''; const end = Date.now() + Number(secs) * 1000; const firsts = {};
while (Date.now() < end) {
  let st = 'window-gone';
  if (page) { try { const s = await Promise.race([page.evaluate(() => window.electronAPI.getAppUpdateState()), new Promise((_, j) => setTimeout(() => j(new Error('t')), 1500))]); st = `${s.status}|preparing=${s.automaticInstallPreparing}|staged=${s.updateStaged}|${s.errorKind ?? ''}|${s.notification?.outcome ?? ''}`; } catch (e) { st = String(e).includes("'t'") || String(e).endsWith('t') ? 'window-slow' : 'window-gone'; if (st === 'window-gone') page = null; } }
  const h = await fetch(`http://127.0.0.1:${sp}/rest/health`, { signal: AbortSignal.timeout(800) }).then((r) => r.status, () => 0);
  const m = marker ? execFileSync('ps', ['-A', '-o', 'command='], { encoding: 'utf8' }).split('\n').some((l) => l.includes(marker) && /python/.test(l)) : null;
  const k = `${st} health=${h} marker=${m}`; if (!(k in firsts)) firsts[k] = new Date().toISOString();
  if (k !== last) { w({ at: new Date().toISOString(), state: st, health: h, marker: m }); last = k; }
  await new Promise((r) => setTimeout(r, 500));
}
w({ end: new Date().toISOString() }); process.exit(0);

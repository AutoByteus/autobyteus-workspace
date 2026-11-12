// autobyteus-473 API/E2E (temporary): steps of the Android journeys on the background-task section of the phone's Activity.
// Real taps (`droid.mjs`), the page read over the WebView's DevTools socket, the node's own view read with `say.mjs tasks`.
// Prints each step's facts as JSON; screenshots go to /tmp/abtest473/<label>.png.
//   node bg-steps.mjs open-activity <label>      the run's row → run screen → ⋮ → Activity (real taps)
//   node bg-steps.mjs rows <label>               the section's rows now, the node's view, a screenshot
//   node bg-steps.mjs wait <status> <n> <secs> <label>   until n rows have that status (or the time is up)
//   node bg-steps.mjs back                       the system Back key
import { evaluate, tap, adb, sleep } from './droid.mjs'; import { execFileSync } from 'node:child_process'; import fs from 'node:fs';
const ADB = `${process.env.HOME}/Library/Android/sdk/platform-tools/adb`;
const shot = name => fs.writeFileSync(`/tmp/abtest473/${name}.png`, execFileSync(ADB, ['-s', 'emulator-5640', 'exec-out', 'screencap', '-p'], { maxBuffer: 64 << 20 }));
const node = () => { try { return JSON.parse(execFileSync('node', [new URL('./say.mjs', import.meta.url).pathname, 'tasks'], { encoding: 'utf8' })); } catch (e) { return { error: String(e.message).slice(0, 200) }; } };
const ROWS = `(() => { const sec = document.querySelector('[data-testid="mobile-background-tasks"]');
  const rows = [...document.querySelectorAll('[data-testid="mobile-background-task"]')].map(r => ({ status: r.getAttribute('data-status'),
    text: r.textContent.replace(/\\s+/g, ' ').trim().slice(0, 220),
    end: r.querySelector('[data-testid^="mobile-background-task-end"], [data-testid="mobile-background-task-summary"]')?.textContent?.trim() ?? null }));
  const activity = document.querySelector('[data-testid="mobile-activity"]');
  const order = activity ? [...activity.querySelectorAll('[data-testid="mobile-background-tasks"], [data-testid^="mobile-activity-"]')].map(e => e.getAttribute('data-testid')).slice(0, 4) : null;
  return { activityOpen: !!activity, section: !!sec, counts: document.querySelector('[data-testid="mobile-background-tasks-counts"]')?.textContent?.trim() ?? null, rows, order,
    online: navigator.onLine, vvScale: visualViewport.scale }; })()`;
const [cmd, ...a] = process.argv.slice(2);
let out;
if (cmd === 'open-activity') {
  await tap('[data-testid^="mobile-run-row-"] [data-testid="mobile-run-open"]'); await sleep(4000);
  await tap('[data-testid="mobile-run-menu-button"]'); await sleep(1200);
  await tap('[data-testid="mobile-run-menu-activity"]'); await sleep(2500);
  out = { page: await evaluate(ROWS), node: node() }; shot(a[0] ?? 'activity');
} else if (cmd === 'rows') {
  out = { page: await evaluate(ROWS), node: node() }; shot(a[0] ?? 'rows');
} else if (cmd === 'wait') {
  const [status, n, secs, label] = a; const t0 = Date.now(); let p;
  while (Date.now() - t0 < Number(secs) * 1000) { p = await evaluate(ROWS); if (p.rows.filter(r => r.status === status).length >= Number(n)) break; await sleep(1000); }
  out = { waitedMs: Date.now() - t0, page: p, node: node() }; shot(label ?? `wait-${status}`);
} else if (cmd === 'back') { adb('shell', 'input', 'keyevent', 'KEYCODE_BACK'); await sleep(1500); out = { page: await evaluate(ROWS) }; }
console.log(JSON.stringify(out, null, 1));

// autobyteus-472 API/E2E (temporary): runs one named step of the Android journeys and prints its facts as JSON; each
// step's output is copied verbatim into the evidence. Usage: node step.mjs <step> [args]
import { evaluate, pinch, pan2, swipe, dtap, tap, adb, sleep, gesture2Hold, lift2 } from './droid.mjs';
import { TOUCH_COUNTER, PAGE, PDF, IMAGE } from './state.mjs';
import fs from 'node:fs';
const shot = name => fs.writeFileSync(`/tmp/abtest472/${name}.png`, execShot());
const execShot = () => require_('child_process').execFileSync(`${process.env.HOME}/Library/Android/sdk/platform-tools/adb`, ['-s', 'emulator-5640', 'exec-out', 'screencap', '-p'], { maxBuffer: 64 << 20 });
const require_ = m => ({ child_process: childProcess })[m];
import * as childProcess from 'node:child_process';
const until = async (expr, test, ms = 20000) => { const end = Date.now() + ms; let v; while (Date.now() < end) { v = await evaluate(expr); if (test(v)) return v; await sleep(250); } return v; };
const linkSel = name => `[data-event-monitor-file-action-control="true"][title$="/${name}"]`;
const steps = {
  // REQ-003: a pinch on the run screen (no viewer open) does not zoom the page.
  'run-screen-pinch': async () => {
    await evaluate(TOUCH_COUNTER); const before = await evaluate(PAGE);
    await pinch(206, 420, 80, 300); await sleep(1200); const after = await evaluate(PAGE); shot('run-screen-after-pinch');
    return { before, after };
  },
  // Open a file from its link in the conversation (a real tap) and wait for the viewer to show it.
  'open': async (name, kind) => {
    const r = await tap(linkSel(name)); const t0 = Date.now();
    const ready = kind === 'pdf' ? await until(PDF, v => v && v.canvases > 0 && v.canvasBitmap[0]?.[0] > 0, 30000) : await until(IMAGE, v => v && v.natural && v.natural[0] > 0, 30000);
    await sleep(800); const page = await evaluate(PAGE); shot(`open-${name}`);
    return { tapped: r.screenCentre, ms: Date.now() - t0, page, view: kind === 'pdf' ? await evaluate(PDF) : await evaluate(IMAGE) };
  },
  'live-refresh': async () => JSON.parse(childProcess.execFileSync('node', [new URL('./watch-reload.mjs', import.meta.url).pathname], { encoding: 'utf8' }).split('\n').slice(1).join('\n')),
  'download': async (name, label) => JSON.parse(childProcess.execFileSync('node', [new URL('./download.mjs', import.meta.url).pathname, name, label], { encoding: 'utf8' })),
  'refused-saves': async () => JSON.parse(childProcess.execFileSync('node', [new URL('./refused-saves.mjs', import.meta.url).pathname], { encoding: 'utf8' })),
  'pdf': async () => ({ page: await evaluate(PAGE), pdf: await evaluate(PDF) }),
  'image': async () => ({ page: await evaluate(PAGE), image: await evaluate(IMAGE) }),
  // A pinch around (cx, cy) CSS px from d0 to d1; reads the live state right after the fingers lift and after the redraw.
  'pinch': async (cx, cy, d0, d1, label = 'pinch', kind = 'pdf') => {
    await evaluate(TOUCH_COUNTER); const before = await evaluate(kind === 'pdf' ? PDF : IMAGE);
    const g = await pinch(+cx, +cy, +d0, +d1, 20); const atLift = await evaluate(kind === 'pdf' ? PDF : IMAGE);
    const settled = kind === 'pdf' ? await until(PDF, v => v && !v.transform && v.allBitmapsMatch, 15000) : (await sleep(800), await evaluate(IMAGE));
    const page = await evaluate(PAGE); shot(label); return { gesture: g, before, atLift, settled, page };
  },
  'pan2': async (cx, cy, dx, dy, label = 'pan2', kind = 'pdf') => {
    await evaluate(TOUCH_COUNTER); const before = await evaluate(kind === 'pdf' ? PDF : IMAGE);
    await pan2(+cx, +cy, +dx, +dy, 16); await sleep(1500); const after = await evaluate(kind === 'pdf' ? PDF : IMAGE); const page = await evaluate(PAGE); shot(label);
    return { before, after, page };
  },
  // A two-finger drag at constant spacing: the live view while the fingers are still down, then after they lift.
  'pan2-hold': async (cx, cy, dx, dy, label = 'pan2-hold') => {
    const c = [+cx, +cy], d = [+dx, +dy]; const before = await evaluate(PDF);
    await gesture2Hold([[c[0] - 30, c[1]], [c[0] + 30, c[1]]], [[c[0] - 30 + d[0], c[1] + d[1]], [c[0] + 30 + d[0], c[1] + d[1]]], 16);
    await sleep(400); const down = await evaluate(PDF); shot(`${label}-fingers-down`);
    lift2(); await sleep(1500); const lifted = await evaluate(PDF); shot(`${label}-lifted`);
    return { before, fingersDown: down, lifted };
  },
  'swipe': async (x0, y0, x1, y1, label = 'swipe', kind = 'pdf') => {
    await evaluate(TOUCH_COUNTER); const before = await evaluate(kind === 'pdf' ? PDF : IMAGE);
    await swipe(+x0, +y0, +x1, +y1, 500); await sleep(1500); const after = await evaluate(kind === 'pdf' ? PDF : IMAGE); const page = await evaluate(PAGE); shot(label);
    return { before, after, page };
  },
  'dtap': async (x, y, label = 'dtap', kind = 'pdf') => {
    await evaluate(TOUCH_COUNTER); const before = await evaluate(kind === 'pdf' ? PDF : IMAGE);
    await dtap(+x, +y); const after = kind === 'pdf' ? (await sleep(500), await until(PDF, v => v && !v.transform && v.allBitmapsMatch, 15000)) : (await sleep(1000), await evaluate(IMAGE));
    const page = await evaluate(PAGE); shot(label); return { before, after, page };
  },
  'back': async () => { const r = await tap('[data-testid="mobile-file-viewer"] [data-testid="mobile-screen-back"]'); await sleep(1500); const page = await evaluate(PAGE); shot('after-back'); return { tapped: r.screenCentre, page }; },
  'meminfo': async (label) => {
    const pss = pid => { const m = adb('shell', 'dumpsys', 'meminfo', pid); return { totalPssKb: +((/TOTAL PSS:\s+(\d+)/.exec(m) ?? /TOTAL\s+(\d+)/.exec(m) ?? [])[1] ?? NaN), graphicsKb: +((/Graphics:\s+(\d+)/.exec(m) ?? [])[1] ?? NaN), nativeHeapKb: +((/Native Heap:\s+(\d+)/.exec(m) ?? [])[1] ?? NaN) }; };
    const ps = adb('shell', 'ps', '-A', '-o', 'PID,NAME').split('\n').map(l => l.trim().split(/\s+/)).filter(([, n]) => n);
    const app = ps.find(([, n]) => n === 'org.autobyteus.mobile'); const renderer = ps.find(([, n]) => /sandboxed_process/.test(n)); const gpu = ps.find(([, n]) => /webview:webview_service|gpu/.test(n) && !/zygote/.test(n));
    return { label, app: app && { pid: app[0], ...pss(app[0]) }, renderer: renderer && { pid: renderer[0], name: renderer[1].slice(0, 60), ...pss(renderer[0]) } }; },
};
const [name, ...args] = process.argv.slice(2);
console.log(JSON.stringify(await steps[name](...args), null, 1));

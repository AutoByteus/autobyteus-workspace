// autobyteus-473 API/E2E (temporary; from autobyteus-472's tools): drives the app on the test-owned emulator (serial emulator-5640).
// - Page state: the debug build's WebView DevTools socket, forwarded to tcp:9472, with a minimal CDP client (Runtime.evaluate).
// - Input: real Android input events. Taps and one-finger swipes through `input`; two-finger gestures and double taps
//   through `sendevent` on the emulator's touchscreen (multi-touch protocol B, /dev/input/event1, 0..32767 per axis),
//   so the WebView receives MotionEvents exactly as from fingers.
// - Page CSS px → screen px: the WebView's bounds (uiautomator, portrait only) + CSS px × devicePixelRatio.
// Usage: node droid.mjs <command> [args]   (prints JSON)
//   eval '<expression>'                 evaluate in the page (await allowed)
//   rect '<selector>'                   the element's rect in CSS px and in screen px
//   tap '<selector>' | tapxy <x> <y>    real tap at the element's centre / at screen px
//   pinch <cx> <cy> <d0> <d1> [steps]   two fingers on a horizontal line around (cx, cy) CSS px, from distance d0 to d1 CSS px
//   pan2 <cx> <cy> <dx> <dy> [steps]    two fingers (60 CSS px apart) moving by (dx, dy) CSS px
//   swipe <x0> <y0> <x1> <y1> [ms]      one finger, CSS px
//   dtap <x> <y>                        double tap at CSS px (two quick taps)
import { execFileSync } from 'node:child_process'; import fs from 'node:fs';
const ADB = `${process.env.HOME}/Library/Android/sdk/platform-tools/adb`; const SERIAL = 'emulator-5640'; const PKG = 'org.autobyteus.mobile'; const PORT = 9472;
const DEV = '/dev/input/event1'; const SCREEN = { w: 1080, h: 2400 };
const adb = (...a) => execFileSync(ADB, ['-s', SERIAL, ...a], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'pipe'] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const forward = () => {
  const pid = adb('shell', 'pidof', PKG).trim();
  const sock = adb('shell', 'cat', '/proc/net/unix').split('\n').map(l => l.trim().split(/\s+/).pop()).find(n => n === `@webview_devtools_remote_${pid}`)?.slice(1);
  if (!sock) throw new Error('no WebView DevTools socket');
  adb('forward', `tcp:${PORT}`, `localabstract:${sock}`);
};
export const evaluate = async (expression) => {
  let list; try { list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); } catch { forward(); list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); }
  let target = list.find(t => t.type === 'page' && t.url.includes('/mobile'));
  if (!target) { forward(); list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); target = list.find(t => t.type === 'page' && t.url.includes('/mobile')); }
  const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  const reply = await new Promise(r => { ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id === 1) r(m); }; ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: `(async () => (${expression}))()`, awaitPromise: true, returnByValue: true } })); });
  ws.close();
  if (reply.result?.exceptionDetails) throw new Error(reply.result.exceptionDetails.exception?.description ?? 'evaluate failed');
  return reply.result?.result?.value;
};
let webviewBounds = null;
const bounds = () => {
  if (webviewBounds) return webviewBounds;
  const cache = '/tmp/abtest473/webview-bounds.json';
  if (fs.existsSync(cache)) return (webviewBounds = JSON.parse(fs.readFileSync(cache, 'utf8')));
  adb('shell', 'uiautomator', 'dump', '/sdcard/ui.xml'); const xml = adb('shell', 'cat', '/sdcard/ui.xml');
  const m = /class="android\.webkit\.WebView"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(xml); if (!m) throw new Error('no WebView in the window');
  webviewBounds = { left: +m[1], top: +m[2], right: +m[3], bottom: +m[4] }; fs.writeFileSync(cache, JSON.stringify(webviewBounds)); return webviewBounds;
};
let dpr = null;
const toScreen = async (x, y) => { dpr ??= await evaluate('devicePixelRatio'); const b = bounds(); return { x: Math.round(b.left + x * dpr), y: Math.round(b.top + y * dpr) }; };
const raw = p => ({ x: Math.round(p.x * 32767 / (SCREEN.w - 1)), y: Math.round(p.y * 32767 / (SCREEN.h - 1)) });
const se = (t, c, v) => `sendevent ${DEV} ${t} ${c} ${v}`;
const frame = (fingers, first) => { const o = []; fingers.forEach((p, i) => { const r = raw(p); o.push(se(3, 47, i)); if (first) o.push(se(3, 57, 100 + i)); o.push(se(3, 53, r.x), se(3, 54, r.y), se(3, 58, 50)); }); if (first) o.push(se(1, 330, 1)); o.push(se(0, 0, 0)); return o; };
const up = n => { const o = []; for (let i = 0; i < n; i++) o.push(se(3, 47, i), se(3, 57, -1)); o.push(se(1, 330, 0), se(0, 0, 0)); return o; };
const runScript = cmds => adb('shell', cmds.join(';'));
export const gesture2 = async (from, to, steps = 16) => { // from/to: [[x,y],[x,y]] CSS px
  const s0 = await Promise.all(from.map(([x, y]) => toScreen(x, y))), s1 = await Promise.all(to.map(([x, y]) => toScreen(x, y)));
  const cmds = [];
  for (let k = 0; k <= steps; k++) { const t = k / steps; cmds.push(...frame(s0.map((p, i) => ({ x: p.x + (s1[i].x - p.x) * t, y: p.y + (s1[i].y - p.y) * t })), k === 0)); }
  cmds.push(...up(2)); runScript(cmds); return { screenFrom: s0, screenTo: s1 };
};
/** Two fingers move from `from` to `to` and stay down (no lift); `lift2()` lifts them. */
export const gesture2Hold = async (from, to, steps = 16) => {
  const s0 = await Promise.all(from.map(([x, y]) => toScreen(x, y))), s1 = await Promise.all(to.map(([x, y]) => toScreen(x, y)));
  const cmds = []; for (let k = 0; k <= steps; k++) { const t = k / steps; cmds.push(...frame(s0.map((p, i) => ({ x: p.x + (s1[i].x - p.x) * t, y: p.y + (s1[i].y - p.y) * t })), k === 0)); }
  runScript(cmds); return { screenFrom: s0, screenTo: s1 };
};
export const lift2 = () => runScript(up(2));
// A tap written to the touch device in one write (24-byte input_event records: timeval, type, code, value), so a
// double tap's two taps land well inside the 300 ms window (one sendevent process per event is too slow for that).
const tapBytes = (p) => { const r = raw(p); const ev = []; const e = (t, c, v) => { const b = Buffer.alloc(24); b.writeUInt16LE(t, 16); b.writeUInt16LE(c, 18); b.writeInt32LE(v, 20); ev.push(b); };
  e(3, 47, 0); e(3, 57, 200); e(3, 53, r.x); e(3, 54, r.y); e(3, 58, 50); e(1, 330, 1); e(0, 0, 0); e(3, 57, -1); e(1, 330, 0); e(0, 0, 0); return Buffer.concat(ev); };
export const dtap = async (x, y, gapMs = 120) => { const p = await toScreen(x, y); fs.writeFileSync('/tmp/abtest473/tap.bin', tapBytes(p));
  adb('push', '/tmp/abtest473/tap.bin', '/data/local/tmp/tap.bin'); adb('shell', `cat /data/local/tmp/tap.bin > ${DEV}; sleep ${gapMs / 1000}; cat /data/local/tmp/tap.bin > ${DEV}`); return p; };
export const tapxy = (x, y) => adb('shell', 'input', 'tap', String(x), String(y));
export const rect = async sel => { const r = await evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const b = e.getClientRects()[0] ?? e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; })()`);
  if (!r) return null; const c = await toScreen(r.x + r.w / 2, r.y + r.h / 2); return { css: r, screenCentre: c }; };
export const tap = async sel => { await evaluate(`document.querySelector(${JSON.stringify(sel)})?.scrollIntoView({ block: 'center' })`); await sleep(600); const r = await rect(sel); if (!r) throw new Error(`no ${sel}`); tapxy(r.screenCentre.x, r.screenCentre.y); return r; };
export const swipe = async (x0, y0, x1, y1, ms = 400) => { const a = await toScreen(x0, y0), b = await toScreen(x1, y1); adb('shell', 'input', 'swipe', String(a.x), String(a.y), String(b.x), String(b.y), String(ms)); return { a, b }; };
export const pinch = (cx, cy, d0, d1, steps = 16) => gesture2([[cx - d0 / 2, cy], [cx + d0 / 2, cy]], [[cx - d1 / 2, cy], [cx + d1 / 2, cy]], steps);
export const pan2 = (cx, cy, dx, dy, steps = 16) => gesture2([[cx - 30, cy], [cx + 30, cy]], [[cx - 30 + dx, cy + dy], [cx + 30 + dx, cy + dy]], steps);
export { adb, sleep };
if (process.argv[1]?.endsWith('droid.mjs')) {
  const [cmd, ...a] = process.argv.slice(2); const n = a.map(Number);
  const r = cmd === 'eval' ? await evaluate(a[0]) : cmd === 'rect' ? await rect(a[0]) : cmd === 'tap' ? await tap(a[0]) : cmd === 'tapxy' ? tapxy(n[0], n[1])
    : cmd === 'pinch' ? await pinch(n[0], n[1], n[2], n[3], n[4] || 16) : cmd === 'pan2' ? await pan2(n[0], n[1], n[2], n[3], n[4] || 16)
      : cmd === 'swipe' ? await swipe(n[0], n[1], n[2], n[3], n[4] || 400) : cmd === 'dtap' ? await dtap(n[0], n[1]) : (() => { throw new Error(`unknown ${cmd}`); })();
  console.log(JSON.stringify(r ?? null, null, 1));
}

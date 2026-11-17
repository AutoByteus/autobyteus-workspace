// autobyteus-525 API/E2E round 2, API-12 (temporary, ticket-owned): the phone VNC Viewer on the Android app at Largest, by
// real taps, connected to node-525's live node desktop; at the Pixel 6 width (412 CSS px) and at 360 CSS px (`wm density 480`).
// Usage: node android-vnc.mjs   (OUT env: evidence dir)
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import { evaluate, tap, tapxy, rect, adb, sleep } from './droid.mjs';
const OUT = process.env.OUT; fs.mkdirSync(OUT, { recursive: true });
const shot = (name) => { fs.writeFileSync(path.join(OUT, `API-12-${name}.png`), execFileSync(`${process.env.HOME}/Library/Android/sdk/platform-tools/adb`, ['-s', 'emulator-5650', 'exec-out', 'screencap', '-p'], { maxBuffer: 64 << 20 })); return `API-12-${name}.png`; };
const waitFor = async (what, fn, ms = 60_000) => { const end = Date.now() + ms; let last; while (Date.now() < end) { try { last = await fn(); if (last) return last; } catch (e) { last = e.message; } await sleep(500); } throw new Error(`timed out: ${what} (${JSON.stringify(last)})`); };
const visible = (id) => evaluate(`Boolean([...document.querySelectorAll('[data-testid="${id}"]')].find(el => el.getBoundingClientRect().width > 0))`);
const measure = () => evaluate(`(() => { const b = id => { const e = [...document.querySelectorAll('[data-testid="' + id + '"]')].find(x => x.getBoundingClientRect().width > 0); if (!e) return null; const r = e.getBoundingClientRect(); return { left: +r.left.toFixed(1), right: +r.right.toFixed(1), w: +r.width.toFixed(1), text: e.textContent.trim().slice(0, 30) }; };
  const de = document.documentElement; const bar = document.querySelector('[data-testid="mobile-node-desktop"] [data-testid="mobile-screen-bar"]'); const row = document.querySelector('[data-testid="mobile-node-desktop-status-bar"]');
  return { width: innerWidth, dpr: devicePixelRatio, root: getComputedStyle(de).fontSize, step: de.getAttribute('data-phone-text-size'), mode: document.querySelector('[data-testid="mobile-node-desktop"]')?.getAttribute('data-mode'),
    font: getComputedStyle(document.body).fontFamily.slice(0, 60), barScrollWidth: bar?.scrollWidth, rowScrollWidth: row?.scrollWidth, sideways: de.scrollWidth > de.clientWidth,
    title: b('mobile-screen-title'), modeButton: b('mobile-node-desktop-mode'), fullScreen: b('mobile-node-desktop-full-screen'), status: b('mobile-node-desktop-status'), keyboard: b('mobile-node-desktop-keyboard'), clipboard: b('mobile-node-desktop-clipboard-open'),
    canvas: (() => { const c = document.querySelector('[data-testid="mobile-node-desktop-picture"] canvas'); return c ? c.width + 'x' + c.height : null; })() }; })()`);
const fits = m => [m.title, m.modeButton, m.fullScreen, m.status, m.keyboard, m.clipboard].filter(Boolean).every(x => x.left >= -0.5 && x.right <= m.width + 0.5) && m.barScrollWidth <= m.width && m.rowScrollWidth <= m.width && !m.sideways;
const log = (o) => { fs.appendFileSync(path.join(OUT, 'API-12-android-vnc.jsonl'), JSON.stringify({ at: new Date().toISOString(), ...o }) + '\n'); console.log(JSON.stringify(o)); };
const only360 = process.argv[2] === 'only360';
if (!only360) {
// Largest from the home screen's ⋮ (real taps).
await waitFor('the run list', () => visible('mobile-run-tree'), 60_000);
await tap('[data-testid="mobile-on-this-phone-button"]'); await waitFor('the menu', () => visible('mobile-on-this-phone-menu'));
await tap('[data-testid="mobile-text-size-largest"]'); await sleep(1000);
// Close by a real tap outside the menu, below it on the list.
{ const m = await rect('[data-testid="mobile-on-this-phone-menu"]'); const dpr = await evaluate('devicePixelRatio'); const wb = JSON.parse(fs.readFileSync('/tmp/abtest525/webview-bounds.json', 'utf8'));
  tapxy(Math.round(wb.left + 24 * dpr), Math.round(wb.top + (m.css.y + m.css.h + 120) * dpr)); }
await waitFor('the menu closed', async () => !(await visible('mobile-on-this-phone-menu')), 10_000);
await sleep(800);
await tap('[data-test="mobile-run-row"] [data-testid="mobile-run-open"]'); await waitFor('the run', () => visible('mobile-run-menu-button'), 30_000); await sleep(1200);
await tap('[data-testid="mobile-run-menu-button"]'); await waitFor('the run menu', () => visible('mobile-run-menu'));
await tap('[data-testid="mobile-run-menu-desktop"]'); await waitFor('the VNC Viewer', () => visible('mobile-node-desktop'), 20_000);
if (await visible('mobile-node-desktop-connect')) await tap('[data-testid="mobile-node-desktop-connect"]');
await waitFor('connected', () => evaluate(`!document.querySelector('[data-testid="mobile-node-desktop-mode"]')?.disabled`), 90_000); await sleep(2500);
const view412 = await measure(); log({ at412: 'view', fits: fits(view412), ...view412, shot: shot('412-largest-view') });
await tap('[data-testid="mobile-node-desktop-mode"]'); await waitFor('Control', () => visible('mobile-node-desktop-keyboard'), 20_000); await sleep(1500);
const control412 = await measure(); log({ at412: 'control', fits: fits(control412), ...control412, shot: shot('412-largest-control') });
}
// 360 CSS px: the same phone at density 480 (1080 / 3).
if (!only360) {
adb('shell', 'wm', 'density', '480'); await sleep(5000);
}
fs.rmSync('/tmp/abtest525/webview-bounds.json', { force: true });
await waitFor('the page at 360', () => evaluate('innerWidth === 360'), 30_000); await sleep(2000);
// A density change recreates the activity: the page reloads and the viewer reconnects in View only (its default).
await waitFor('the VNC Viewer at 360', () => visible('mobile-node-desktop'), 60_000);
if (await visible('mobile-node-desktop-connect')) await tap('[data-testid="mobile-node-desktop-connect"]');
await waitFor('connected at 360', () => evaluate(`!document.querySelector('[data-testid="mobile-node-desktop-mode"]')?.disabled`), 90_000); await sleep(2000);
const view360 = await measure(); log({ at360: 'view', fits: fits(view360), ...view360, shot: shot('360-largest-view') });
if ((await evaluate(`document.querySelector('[data-testid="mobile-node-desktop"]').getAttribute('data-mode')`)) === 'view') {
  await tap('[data-testid="mobile-node-desktop-mode"]'); await waitFor('Control at 360', () => visible('mobile-node-desktop-keyboard'), 20_000); await sleep(1500);
}
const control360 = await measure(); log({ at360: 'control', fits: fits(control360), ...control360, shot: shot('360-largest-control') });
await tap('[data-testid="mobile-node-desktop-clipboard-open"]'); await sleep(1500);
const sheet = await evaluate(`(() => { const s = document.querySelector('[data-testid="mobile-node-desktop-clipboard"]'); if (!s) return null; const r = s.getBoundingClientRect(); return { left: r.left, right: r.right, width: innerWidth, sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth }; })()`);
log({ at360: 'clipboard sheet', sheet, shot: shot('360-largest-clipboard') });
adb('shell', 'wm', 'density', 'reset'); fs.rmSync('/tmp/abtest525/webview-bounds.json', { force: true });

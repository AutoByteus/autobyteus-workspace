// autobyteus-534 API/E2E (from autobyteus-525) API-09 (temporary, ticket-owned): the Android app on the test-owned emulator (emulator-5650),
// paired with the held probe stack's alpha (http://10.0.2.2:<port>). Real taps (`input tap`) on the WebView; page state
// read through the debug build's WebView DevTools (droid.mjs). Screenshots with `screencap`.
// Usage: node android.mjs pair | steps | restart       (writes JSON lines to <OUT>/API-09-android.jsonl, PNGs to <OUT>)
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import { evaluate, tap, tapxy, adb, sleep } from './droid.mjs';
const OUT = process.env.OUT; fs.mkdirSync(OUT, { recursive: true });
const PKG = 'org.autobyteus.mobile';
const log = (entry) => { const line = JSON.stringify({ at: new Date().toISOString(), ...entry }); fs.appendFileSync(path.join(OUT, 'API-09-android.jsonl'), `${line}\n`); console.log(line); };
const shot = (name) => { const png = execFileSync(`${process.env.HOME}/Library/Android/sdk/platform-tools/adb`, ['-s', 'emulator-5650', 'exec-out', 'screencap', '-p'], { maxBuffer: 64 << 20 }); fs.writeFileSync(path.join(OUT, `API-09-${name}.png`), png); return `API-09-${name}.png`; };
const waitFor = async (what, fn, ms = 60_000) => { const end = Date.now() + ms; let last; while (Date.now() < end) { try { last = await fn(); if (last) return last; } catch (e) { last = e.message; } await sleep(500); } throw new Error(`timed out: ${what} (${JSON.stringify(last)})`); };
const sizes = () => evaluate(`(() => {
  const px = el => (el ? parseFloat(getComputedStyle(el).fontSize) : null);
  const name = [...document.querySelectorAll('[data-testid="mobile-run-name"]')].find(el => el.getBoundingClientRect().width > 0);
  const de = document.documentElement;
  return { url: location.pathname, stored: localStorage.getItem('autobyteus.phone.textSize'), step: de.getAttribute('data-phone-text-size'), root: px(de), rootStyle: de.style.fontSize,
    runName: px(name), runNameText: name?.textContent?.trim() ?? null, feed: px(document.querySelector('[data-testid="mobile-run-conversation"] .conv-feed')),
    menuOpen: Boolean(document.querySelector('[data-testid="mobile-on-this-phone-menu"]')),
    pressed: document.querySelector('[data-testid="mobile-text-size"] [aria-pressed="true"]')?.getAttribute('data-testid') ?? null,
    sideways: de.scrollWidth > de.clientWidth, width: innerWidth, dpr: devicePixelRatio, ua: navigator.userAgent.match(/Chrome\\/[\\d.]+/)?.[0] ?? null };
})()`);
const visible = (testid) => evaluate(`Boolean([...document.querySelectorAll('[data-testid="${testid}"]')].find(el => el.getBoundingClientRect().width > 0))`);

const [cmd] = process.argv.slice(2);
if (cmd === 'pair') {
  const link = fs.readFileSync('/tmp/abtest534/emulator-link.txt', 'utf8').trim();
  adb('install', '-r', '/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-three-steps-534/autobyteus-android/app/build/outputs/apk/debug/app-debug.apk');
  adb('shell', 'pm', 'clear', PKG);
  adb('shell', 'am', 'start', '-a', 'android.intent.action.SEND', '-t', 'text/plain', '--es', 'android.intent.extra.TEXT', `'${link}'`, '-n', `${PKG}/.MainActivity`);
  await waitFor('the WebView DevTools socket', async () => adb('shell', 'cat', '/proc/net/unix').includes('webview_devtools_remote'), 120_000);
  // In the app a shared link pairs at once; a pair button is tapped when the page shows one.
  const first = await waitFor('the pairing page or the run list', async () => ((await visible('mobile-run-tree')) && 'list') || ((await visible('mobile-pair-button')) && 'button')
    || ((await visible('mobile-pairing-failed')) && 'failed'), 120_000);
  shot('0-after-link');
  if (first === 'failed') throw new Error(`pairing failed: ${await evaluate('document.querySelector(\'[data-testid="mobile-pairing-in-app"]\')?.innerText')}`);
  if (first === 'button') await tap('[data-testid="mobile-pair-button"]');
  await waitFor('the run list', () => visible('mobile-run-tree'), 120_000);
  await sleep(3000);
  log({ step: 'paired', ...(await sizes()) }); shot('0-run-list-default');
  // The phone's stored pairing, for the host Chrome phone of API-05…07 (not evidence: holds the phone credential).
  fs.writeFileSync('/tmp/abtest534/phone-storage.json', await evaluate('JSON.stringify(Object.fromEntries(Object.entries(localStorage)))'));
  console.log('storage copied');
}
if (cmd === 'steps') {
  const run = process.env.RUN_NAME ?? 'Project Task Manager';
  for (const step of ['standard', 'large', 'largest']) { // autobyteus-534: three steps
    await waitFor('the run list', () => visible('mobile-run-tree'), 30_000);
    await tap('[data-testid="mobile-on-this-phone-button"]');
    await waitFor('the menu', () => visible('mobile-on-this-phone-menu'), 15_000);
    await tap(`[data-testid="mobile-text-size-${step}"]`);
    await sleep(1200);
    const withMenu = await sizes(); const menuShot = shot(`${step}-1-home-menu`);
    // Close by a tap outside the menu (on the list below it).
    const r = await evaluate(`(() => { const m = document.querySelector('[data-testid="mobile-on-this-phone-menu"]').getBoundingClientRect(); return { bottom: m.bottom, w: innerWidth, h: innerHeight }; })()`);
    const dpr = withMenu.dpr; const wb = JSON.parse(fs.readFileSync('/tmp/abtest534/webview-bounds.json', 'utf8'));
    tapxy(Math.round(wb.left + 24 * dpr), Math.round(wb.top + Math.min(r.h - 40, r.bottom + 120) * dpr));
    await sleep(1000);
    const home = await sizes(); const homeShot = shot(`${step}-2-home`);
    await tap('[data-test="mobile-run-row"] [data-testid="mobile-run-open"]'); // the first run of the list
    await waitFor('the conversation', () => visible('mobile-run-conversation'), 30_000);
    await sleep(2500);
    const conversation = await sizes(); const convShot = shot(`${step}-3-conversation`);
    await tap('[data-testid="mobile-run-back"]');
    await sleep(1200);
    log({ step, withMenu, home, conversation, shots: [menuShot, homeShot, convShot] });
  }
}
if (cmd === 'restart') {
  // The app closed and started again at the chosen step: the step from the first screen (QR-001), recorded on screen too.
  const before = await sizes();
  adb('shell', 'am', 'force-stop', PKG);
  await sleep(1500);
  const rec = '/sdcard/API-09-restart.mp4';
  const recorder = (await import('node:child_process')).spawn(`${process.env.HOME}/Library/Android/sdk/platform-tools/adb`, ['-s', 'emulator-5650', 'shell', 'screenrecord', '--time-limit', '15', rec]);
  const recorded = new Promise(r => recorder.on('close', r));
  await sleep(800);
  adb('shell', 'am', 'start', '-n', `${PKG}/.MainActivity`);
  const polls = [];
  const first = await waitFor('the first phone screen after the start', async () => {
    const s = await evaluate(`(() => { const de = document.documentElement; const list = document.querySelector('[data-testid="mobile-run-tree"], [data-testid="mobile-run-screen"]');
      return { shown: Boolean(list), root: getComputedStyle(de).fontSize, step: de.getAttribute('data-phone-text-size'), t: performance.now() }; })()`).catch(e => ({ err: e.message.slice(0, 80) }));
    polls.push(s); return s.shown ? s : null;
  }, 120_000);
  await sleep(4000);
  const after = await sizes(); const s = shot('restart-run-list');
  await recorded;
  execFileSync(`${process.env.HOME}/Library/Android/sdk/platform-tools/adb`, ['-s', 'emulator-5650', 'pull', rec, path.join(OUT, 'API-09-restart.mp4')]);
  log({ step: 'restart', before, firstScreen: first, polls: polls.slice(-5), pollCount: polls.length, after, shot: s, video: 'API-09-restart.mp4' });
}

if (cmd === 'run-menu') {
  // autobyteus-534 SR-002: the run's ⋮ order on the device, the agent run and the Team's lead (real taps).
  const rows = () => evaluate(`[...document.querySelectorAll('[data-test="mobile-run-row"]')].map(li => ({ key: li.getAttribute('data-testid').replace('mobile-run-row-', ''), depth: Number(li.getAttribute('data-depth')), expanded: li.getAttribute('aria-expanded'), name: li.querySelector('[data-testid="mobile-run-name"]')?.textContent?.trim() }))`);
  const back = async () => { if (await visible('mobile-run-back')) await tap('[data-testid="mobile-run-back"]'); await sleep(1200); };
  for (const [label, name, depth] of [['agent-run', 'Desktop Helper', 0], ['team-lead', 'lead', 1]]) {
    await waitFor('the run list', () => visible('mobile-run-tree'), 30_000);
    if (depth > 0) { const t = (await rows()).find(r => r.depth === 0 && r.name === 'Desk Team'); if (t?.expanded === 'false') { await tap(`[data-testid="mobile-run-row-${t.key}"] [data-testid="mobile-run-toggle"]`); await sleep(2000); } }
    const row = await waitFor(`row ${name}`, async () => (await rows()).find(r => r.depth === depth && r.name.toLowerCase() === name.toLowerCase()), 30_000);
    await tap(`[data-testid="mobile-run-row-${row.key}"] [data-testid="mobile-run-open"]`);
    await waitFor('the run', () => visible('mobile-run-menu-button'), 30_000); await sleep(1500);
    await tap('[data-testid="mobile-run-menu-button"]'); await waitFor('the menu', () => visible('mobile-run-menu')); await sleep(800);
    const entries = await evaluate(`[...document.querySelectorAll('[data-testid="mobile-run-menu"] [role="menuitem"]')].map(i => i.textContent.trim())`);
    const step = await evaluate(`document.documentElement.getAttribute('data-phone-text-size')`);
    log({ step: `run-menu ${label}`, textSize: step, entries, shot: shot(`run-menu-${label}`) });
    await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`); await sleep(500);
    if (await visible('mobile-run-menu')) { adb('shell', 'input', 'keyevent', 'KEYCODE_ESCAPE'); await sleep(500); }
    await back();
  }
}

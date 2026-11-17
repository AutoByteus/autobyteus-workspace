// autobyteus-522 API/E2E (temporary; from autobyteus-458): one step of the Android journeys in the app (emulator-5640), with real taps (`input tap`
// at the element's centre, droid.mjs) and the page's state read over the WebView's DevTools socket. Prints JSON.
// Usage: node ph.mjs <step> [args]
//   state                       the screen: run screen state and conversation layout, the Settings screen, the ⋮ menu, toasts
//   tap <testid>                a real tap on [data-testid=<testid>] (the first visible one)
//   tapsel <css>                a real tap on the first visible element matching <css>
//   option <row> <regex>        Runtime/Model sheet: a real tap on the option whose text matches (row = runtime | model)
//   row <regex>                 the run list: a real tap on the row whose text matches (the last match: the most nested)
//   type <text>                 a real tap on the composer, `input text`, then a real tap on its Send button
//   back                        the Android Back key
//   shot <name>                 a screenshot into the journey's shots folder
//   wait <ms>
import { evaluate, tapxy, rect, adb, sleep } from './droid.mjs';
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const SHOTS = process.env.SHOTS ?? '/tmp/abtest522/shots';
const STATE = `(() => {
  const q = (s, r = document) => r.querySelector(s); const vis = e => e && e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== 'none';
  const txt = e => e?.textContent?.replace(/\\s+/g, ' ').trim() ?? null;
  const settings = q('[data-testid="mobile-run-settings"]');
  const s = settings ? (() => { const stop = q('[data-testid="mobile-run-settings-stop"]', settings); return {
    subject: txt(q('[data-testid="mobile-run-settings-subject"]', settings)), status: txt(q('[data-testid="mobile-run-settings-status"]', settings)),
    runtime: txt(q('[data-testid="mobile-run-runtime-select-value"]', settings)), model: txt(q('[data-testid="mobile-run-model-select-value"]', settings)),
    runtimeDisabled: q('[data-testid="mobile-run-runtime-select-toggle"]', settings)?.disabled ?? null, modelDisabled: q('[data-testid="mobile-run-model-select-toggle"]', settings)?.disabled ?? null,
    saveDisabled: q('[data-testid="mobile-run-settings-save"]', settings)?.disabled ?? null,
    stop: stop ? { label: stop.getAttribute('aria-label'), title: stop.getAttribute('title'), text: stop.textContent.trim(), color: getComputedStyle(stop).color } : null,
    error: txt(q('[data-testid="mobile-run-settings-error"]', settings)),
    sheet: [...document.querySelectorAll('[data-testid$="-select-option"]')].filter(vis).map(txt) }; })() : null;
  const monitor = q('[data-testid="mobile-run-conversation"]'); const feed = monitor?.querySelector('.conv-feed');
  const rows = [...(monitor?.querySelectorAll('.conv-row') ?? [])].filter(r => r.querySelector('.conv-body'));
  const box = monitor?.querySelector('textarea')?.closest('.rounded-xl.border-gray-200')?.getBoundingClientRect();
  const ta = monitor?.querySelector('textarea');
  const menu = q('[data-testid="mobile-run-menu"]');
  return { url: location.pathname + location.search.replace(/pairing=[^&]+/, 'pairing=…'), innerWidth, dpr: devicePixelRatio,
    runScreen: q('[data-testid="mobile-run-screen"]')?.getAttribute('data-state') ?? null,
    title: txt(q('[data-testid="mobile-run-screen"] [data-testid="mobile-screen-title"]')) ?? txt(q('[data-testid="mobile-screen-title"]')),
    statusLine: txt(q('[data-testid="mobile-run-status-line"]')),
    conversation: monitor ? { phone: monitor.classList.contains('phone-conversation'), textSize: monitor.getAttribute('data-text-size'),
      fontSize: feed ? parseFloat(getComputedStyle(feed).fontSize) : null, lineHeight: feed ? parseFloat(getComputedStyle(feed).lineHeight) : null,
      bodies: rows.slice(-4).map(r => { const b = r.querySelector('.conv-body').getBoundingClientRect(); return [Math.round(b.left), Math.round(b.width), r.getAttribute('data-speaker')]; }),
      lastText: txt(rows[rows.length - 1]?.querySelector('.conv-body'))?.slice(0, 160) ?? null,
      composerGap: box ? Math.round(innerHeight - box.bottom) : null,
      composerCorners: ta ? (() => { const cs = getComputedStyle(ta.closest('[class*="rounded-b-"]') ?? ta); return [cs.borderBottomLeftRadius, cs.borderBottomRightRadius]; })() : null } : null,
    menu: menu ? { items: [...menu.querySelectorAll('[role="menuitem"]')].map(txt), textSize: [...menu.querySelectorAll('[data-testid^="mobile-text-size-"]')].map(b => [b.getAttribute('data-testid').slice(17), b.getAttribute('aria-pressed')]) } : null,
    settings: s, toasts: [...document.querySelectorAll('[data-testid="toast-container"] > div > div, [role="alert"]')].filter(vis).map(txt).filter(Boolean).slice(0, 5),
    toastLog: window.__toastLog ?? null,
    textSizeStored: localStorage.getItem('autobyteus.phone.textSize') };
})()`;
const visRect = async (css) => {
  const r = await evaluate(`(() => { const e = [...document.querySelectorAll(${JSON.stringify(css)})].find(e => e.getBoundingClientRect().width > 0); if (!e) return null; e.scrollIntoView({ block: 'nearest' }); const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; })()`);
  if (!r) throw new Error(`nothing visible matches ${css}`); return r;
};
const tapCss = async (css) => { await visRect(css); await sleep(300); const tagged = `[data-ph-target]`;
  await evaluate(`(() => { document.querySelectorAll('[data-ph-target]').forEach(e => e.removeAttribute('data-ph-target')); const e = [...document.querySelectorAll(${JSON.stringify(css)})].find(e => e.getBoundingClientRect().width > 0); e.setAttribute('data-ph-target', '1'); return true; })()`);
  const r = await rect(tagged); tapxy(r.screenCentre.x, r.screenCentre.y); return { css, at: r.screenCentre, box: r.css }; };
const tapMatching = async (css, pattern, last = false) => {
  const ok = await evaluate(`(() => { document.querySelectorAll('[data-ph-target]').forEach(e => e.removeAttribute('data-ph-target')); const re = new RegExp(${JSON.stringify(pattern)}, 'i');
    const list = [...document.querySelectorAll(${JSON.stringify(css)})].filter(e => e.getBoundingClientRect().width > 0 && re.test(e.textContent)); const e = ${last ? 'list[list.length - 1]' : 'list[0]'};
    if (!e) return null; e.scrollIntoView({ block: 'center' }); e.setAttribute('data-ph-target', '1'); return e.textContent.replace(/\\s+/g, ' ').trim().slice(0, 80); })()`);
  if (!ok) throw new Error(`no visible ${css} matching ${pattern}`); await sleep(400); const r = await rect('[data-ph-target]'); tapxy(r.screenCentre.x, r.screenCentre.y); return { tapped: ok, at: r.screenCentre };
};
const steps = {
  state: async () => evaluate(STATE),
  tap: async (id) => { const r = await tapCss(`[data-testid="${id}"]`); await sleep(1200); return { ...r, after: await evaluate(STATE) }; },
  tapsel: async (css) => { const r = await tapCss(css); await sleep(1200); return { ...r, after: await evaluate(STATE) }; },
  option: async (row, pattern) => { const r = await tapMatching(`[data-testid="mobile-run-${row}-select-option"]`, pattern); await sleep(1200); return { ...r, after: await evaluate(STATE) }; },
  row: async (pattern) => { const r = await tapMatching('[data-testid^="mobile-run-row-"] button, [data-testid^="mobile-run-row-"] [role="button"], [data-testid^="mobile-run-row-"]', pattern, true); await sleep(2500); return { ...r, after: await evaluate(STATE) }; },
  type: async (text) => {
    await tapCss('[data-testid="mobile-run-conversation"] textarea'); await sleep(800);
    adb('shell', 'input', 'text', text.replace(/ /g, '%s')); await sleep(800);
    const typed = await evaluate(`[...document.querySelectorAll('[data-testid="mobile-run-conversation"] textarea')].find(e => e.getBoundingClientRect().width > 0)?.value`);
    const r = await tapCss('[data-testid="mobile-run-conversation"] button[aria-label="Send message"]'); await sleep(2000);
    return { typed, send: r.at, after: await evaluate(STATE) };
  },
  back: async () => { adb('shell', 'input', 'keyevent', '4'); await sleep(1500); return { after: await evaluate(STATE) }; },
  shot: async (name) => { fs.mkdirSync(SHOTS, { recursive: true }); const f = path.join(SHOTS, `${name}.png`);
    fs.writeFileSync(f, execFileSync(`${process.env.HOME}/Library/Android/sdk/platform-tools/adb`, ['-s', 'emulator-5640', 'exec-out', 'screencap', '-p'], { maxBuffer: 64 << 20 })); return { shot: path.basename(f) }; },
  wait: async (ms) => { await sleep(+ms); return { waited: +ms }; },
  // Records every toast the app shows from now on (text, ms since recording began) in window.__toastLog.
  toastrec: async () => evaluate(`(() => { window.__toastLog = []; const t0 = performance.now(); window.__toastObs?.disconnect();
    const c = document.querySelector('[data-testid="toast-container"]'); if (!c) return 'no toast container';
    window.__toastObs = new MutationObserver(() => { for (const el of c.querySelectorAll(':scope > div > div')) { const s = el.textContent.replace(/\\s+/g, ' ').trim();
      if (s && !window.__toastLog.some(e => e.text === s)) window.__toastLog.push({ text: s, at: Math.round(performance.now() - t0) }); } });
    window.__toastObs.observe(c, { childList: true, subtree: true, characterData: true }); return 'recording'; })()`),
};
const [step, ...args] = process.argv.slice(2);
if (!steps[step]) throw new Error(`unknown step ${step}`);
console.log(JSON.stringify(await steps[step](...args), null, 1));

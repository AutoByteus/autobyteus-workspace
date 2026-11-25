// Temporary driver step (autobyteus-574 API/E2E, Android): raw CDP to the app's WebView page (the forwarded DevTools
// socket on 127.0.0.1:9642), one action per call. Usage: node android-step.mjs <action> [args]
import fs from 'node:fs';
const info = JSON.parse(fs.readFileSync('/tmp/api642/stack-android/stack-info.json', 'utf8'));
const [action, ...rest] = process.argv.slice(2);
const target = (await (await fetch('http://127.0.0.1:9642/json')).json()).find((entry) => entry.type === 'page');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let id = 0; const pending = new Map();
socket.onmessage = (event) => { const message = JSON.parse(event.data); pending.get(message.id)?.(message); pending.delete(message.id); };
const send = (method, params = {}) => new Promise((resolve) => { id += 1; pending.set(id, resolve); socket.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expression) => {
  const answer = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (answer.result?.exceptionDetails) throw new Error(JSON.stringify(answer.result.exceptionDetails).slice(0, 400));
  return answer.result?.result?.value;
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitFor = async (label, expression, ms = 30_000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await evaluate(expression)) return true; await sleep(250); } throw new Error(`timed out: ${label}`); };
const out = (value) => console.log(JSON.stringify(value));
try {
  if (action === 'state') {
    out(await evaluate(`({ url: location.pathname + location.search.replace(/pairing=[^&]*/, 'pairing=<redacted>'), text: document.body.innerText.replace(/\\s+/g, ' ').slice(0, 300) })`));
  } else if (action === 'openRun') {
    await evaluate(`document.querySelector('[data-testid="mobile-run-row-agent:${info.runId}"] [data-testid="mobile-run-open"]').click(), true`);
    await waitFor('the conversation', `Boolean(document.querySelector('[data-testid="mobile-run-conversation"]'))`);
    out({ opened: true });
  } else if (action === 'clickLink') {
    const file = info.files[rest[0]].path;
    const selector = `[data-event-monitor-file-action-control="true"][title="${file}"]`;
    await waitFor('the link', `document.querySelectorAll(${JSON.stringify(selector)}).length > 0`);
    // The tap's time on the device's own clock (the WebView's Date.now()), the clock of the device's logs.
    const at = await evaluate(`(() => { const all = document.querySelectorAll(${JSON.stringify(selector)}); const t = Date.now(); all[all.length - 1].click(); return t; })()`);
    out({ clicked: rest[0], at });
  } else if (action === 'gotoRun') {
    await evaluate(`location.href = '/mobile/?row=agent:${info.runId}&screen=run', true`);
    await sleep(1500);
    await waitFor('the conversation', `Boolean(document.querySelector('[data-testid="mobile-run-conversation"]'))`, 60_000);
    out({ atRun: true });
  } else if (action === 'openFile') {
    // ⋮ → Files → the file's row (the name), tapped; the tap's time on the device's clock.
    const name = rest[0];
    if (!(await evaluate(`Boolean(document.querySelector('[data-testid="mobile-files-list"]'))`))) {
      await evaluate(`document.querySelector('[data-testid="mobile-run-menu-button"]').click(), true`);
      await waitFor('the menu', `Boolean(document.querySelector('[data-testid="mobile-run-menu-files"]'))`);
      await evaluate(`document.querySelector('[data-testid="mobile-run-menu-files"]').click(), true`);
      await waitFor('the Files list', `[...document.querySelectorAll('[data-testid="mobile-files-row"]')].some((row) => row.innerText.includes(${JSON.stringify(name)}))`);
    }
    const at = await evaluate(`(() => { const row = [...document.querySelectorAll('[data-testid="mobile-files-row"]')].find((r) => r.innerText.includes(${JSON.stringify(name)})); const t = Date.now(); row.click(); return t; })()`);
    out({ opened: name, at });
  } else if (action === 'gotoTeam') {
    await evaluate(`location.href = '/mobile/?row=team:${info.team.teamRunId}&screen=run', true`);
    await sleep(1500);
    await waitFor('the Team run screen', `document.querySelector('[data-testid="mobile-run-screen"]')?.getAttribute('data-state') === 'open'`, 60_000);
    out({ atTeam: true });
  } else if (action === 'openReference') {
    // The run's ⋮ → Messages → the reference row of that file name (tapped); the tap's time on the device's clock.
    const name = rest[0];
    if (!(await evaluate(`Boolean(document.querySelector('[data-testid="mobile-messages"]'))`))) {
      await evaluate(`document.querySelector('[data-testid="mobile-run-menu-button"]').click(), true`);
      await waitFor('the menu', `Boolean(document.querySelector('[data-testid="mobile-run-menu-messages"]'))`);
      await evaluate(`document.querySelector('[data-testid="mobile-run-menu-messages"]').click(), true`);
      await waitFor('the Messages', `Boolean(document.querySelector('[data-testid="mobile-messages"]'))`, 20_000);
    }
    await waitFor('the reference row', `[...document.querySelectorAll('[data-testid="mobile-team-reference-row"]')].some((r) => r.innerText.includes(${JSON.stringify(name)}))`, 30_000);
    const at = await evaluate(`(() => { const row = [...document.querySelectorAll('[data-testid="mobile-team-reference-row"]')].find((r) => r.innerText.includes(${JSON.stringify(name)})); const t = Date.now(); row.click(); return t; })()`);
    out({ opened: name, at });
  } else if (action === 'eval') {
    out(await evaluate(rest.join(' ')));
  } else if (action === 'credentialScan') {
    // The phone's credential, read in memory only to scan files for it; never printed.
    const credential = await evaluate(`(() => { try { const s = JSON.parse(localStorage.getItem('autobyteus.remote_access.mobile_session') ?? 'null'); return s?.credential ?? s?.token ?? s?.accessToken ?? null; } catch { return null; } })()`);
    const hits = Object.fromEntries(rest.map((file) => [file, credential ? fs.readFileSync(file, 'latin1').split(credential).length - 1 : null]));
    out({ credentialRead: Boolean(credential), startsWithMra: credential?.startsWith('mra_') ?? null, hits });
  }
} finally { socket.close(); }

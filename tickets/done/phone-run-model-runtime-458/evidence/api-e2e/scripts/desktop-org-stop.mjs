// autobyteus-458 API/E2E (temporary): round 2, the desktop's Org-member Settings stop (preserved by CR-001's fix: the desktop
// passes no shell, so its stop still writes `/workspace` in history mode). `pnpm dev` of this worktree on 127.0.0.1:5458 against
// the host node (node-458.mjs), headless Chrome 1440×1000 with the node's credential on loopback requests only.
// For each member (the Org's direct agent `/planner`, the Org Team member `/squad/reviewer`): a new Delivery Org run, the member
// held live (`HOLD_TURN`); the window opens the Org at that member (the route keys the phone and the desktop share), opens its
// Settings (`workspace-header-edit-config`), checks the Org's stop icon, clicks it once; then reads the node, the route, the
// Settings view and every toast. Arg: <outDir>.
import fs from 'node:fs'; import path from 'node:path'; import { spawn, execFileSync } from 'node:child_process'; import { createRequire } from 'node:module';
const W = '/Users/normy/autobyteus_org/autobyteus-worktrees/phone-run-model-runtime-458';
const require = createRequire(`${W}/autobyteus-web/package.json`); const { chromium } = require('playwright-core');
const [out] = process.argv.slice(2);
const s = JSON.parse(fs.readFileSync('/tmp/abtest458/state.json', 'utf8'));
const FRONT = 'http://127.0.0.1:5458'; const sleep = ms => new Promise(r => setTimeout(r, ms));
const API = path.join(path.dirname(new URL(import.meta.url).pathname), 'api.mjs');
const api = (...a) => JSON.parse(execFileSync('node', [API, ...a], { encoding: 'utf8' }));
const lines = []; const log = (...a) => { const l = a.join(' ').split(s.owner).join('own_…'); lines.push(l); console.log(l); };
const frontendLog = fs.createWriteStream(path.join(out, 'desktop-org-frontend.log'));
const frontend = spawn('corepack', ['pnpm', 'dev', '--host', '127.0.0.1', '--port', '5458'], { cwd: `${W}/autobyteus-web`, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, NODE_ENV: 'development', BACKEND_NODE_BASE_URL: s.base } });
frontend.stdout.pipe(frontendLog); frontend.stderr.pipe(frontendLog);
const TOASTS = `(() => { window.__toastLog ??= []; const c = document.querySelector('[data-testid="toast-container"]'); if (!c || window.__toastObs) return 'ok';
  window.__toastObs = new MutationObserver(() => { for (const el of c.querySelectorAll(':scope > div > div')) { const t = el.textContent.replace(/\\s+/g, ' ').trim();
    if (t && !window.__toastLog.some(e => e.text === t)) window.__toastLog.push({ text: t, at: Date.now() }); } });
  window.__toastObs.observe(c, { childList: true, subtree: true, characterData: true }); return 'recording'; })()`;
let browser; let ok = true;
try {
  for (let i = 0; i < 240 && !(await fetch(FRONT).then(r => r.ok).catch(() => false)); i++) await sleep(1000);
  browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' });
  await ctx.setExtraHTTPHeaders({ authorization: `Bearer ${s.owner}` });
  await ctx.route(u => !/^(https?|wss?):\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(u.href), route => { const h = { ...route.request().headers() }; delete h.authorization; return route.fallback({ headers: h }); });
  await ctx.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
  const page = await ctx.newPage();
  const consoleLines = []; page.on('console', m => { if (['warning', 'error'].includes(m.type())) consoleLines.push(`${m.type()}: ${m.text().slice(0, 300)}`); });
  await page.goto(FRONT, { waitUntil: 'networkidle', timeout: 240000 }).catch(() => undefined); await sleep(4000);
  for (const address of ['/planner', '/squad/reviewer']) {
    const org = api('new-org'); const member = org.members.find(m => m.address === address);
    api('say-org', org.agentOrgRunId, member.agentRunId, `ORG-STOP-458 ${address} HOLD_TURN`);
    let active = false; for (let i = 0; i < 30 && !(active = api('org', org.agentOrgRunId).isActive); i++) await sleep(1000);
    await sleep(3000);
    const query = new URLSearchParams({ rootSubjectKind: 'agent_org', definitionId: 'delivery-org', orgRunId: org.agentOrgRunId, mode: 'active', memberAddress: address });
    await page.goto(`${FRONT}/workspace?${query}`, { waitUntil: 'domcontentloaded', timeout: 120000 }); await sleep(5000);
    await page.evaluate(TOASTS);
    await page.locator('[data-test="workspace-header-edit-config"]').click({ timeout: 60000 });
    const view = page.locator('[data-test="existing-run-settings"]'); await view.waitFor({ timeout: 60000 }); await sleep(2500);
    const subject = (await page.locator('[data-test="existing-run-subject-card"]').first().innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 120);
    const stop = page.locator('[data-test="existing-run-stop"]').first();
    const stopShown = await stop.isVisible().catch(() => false);
    await page.screenshot({ path: path.join(out, `desktop-org-settings-live${address.replace(/\//g, '-')}.png`) });
    const t0 = Date.now(); if (stopShown) await stop.click();
    let nodeActive = true; for (let i = 0; i < 60 && (nodeActive = api('org', org.agentOrgRunId).isActive); i++) await sleep(1000);
    await sleep(4000);
    const after = { url: decodeURIComponent(new URL(page.url()).pathname + new URL(page.url()).search), settingsOpen: await view.isVisible().catch(() => false),
      stopStill: await page.locator('[data-test="existing-run-stop"]').first().isVisible().catch(() => false),
      alerts: (await page.locator('[data-test="existing-run-settings"] [role="alert"]').allInnerTexts().catch(() => [])).map(x => x.trim()).filter(Boolean),
      toasts: (await page.evaluate(() => window.__toastLog ?? [])).filter(x => x.at >= t0).map(x => x.text) };
    await page.screenshot({ path: path.join(out, `desktop-org-settings-after-stop${address.replace(/\//g, '-')}.png`) });
    const r = { address, orgRunId: org.agentOrgRunId, activeBeforeStop: active, subject, stopShown, nodeActiveAfterStop: nodeActive, stopMs: Date.now() - t0, after };
    log(JSON.stringify(r));
    // The preserved desktop behavior: the Org stops, the window shows the Org on /workspace in history mode, no failure. Whether
    // Settings stay open is recorded as observed (the desktop path is unchanged by the fix).
    const pass = stopShown && !nodeActive && after.url.startsWith('/workspace') && /mode=history/.test(after.url) && !after.stopStill && after.alerts.length === 0
      && !after.toasts.some(x => /fail|could not|did not/i.test(x));
    log(`${pass ? 'PASS' : 'FAIL'} ${address}: the Org's stop in desktop Settings stops the Org; the window shows it on /workspace in history mode, no stop icon, no failure (Settings open: ${after.settingsOpen})`);
    if (!pass) ok = false;
  }
  log(`console warnings/errors: ${JSON.stringify(consoleLines.filter(l => /stop|terminat|Org/i.test(l)).slice(0, 10))}`);
} catch (e) { ok = false; log('ERROR', e.stack); }
finally { if (browser) await browser.close(); try { process.kill(-frontend.pid, 'SIGTERM'); } catch {} log(`result ${ok ? 'Pass' : 'Fail'}`); fs.writeFileSync(path.join(out, 'desktop-org-stop.log'), lines.join('\n') + '\n'); process.exitCode = ok ? 0 : 1; }

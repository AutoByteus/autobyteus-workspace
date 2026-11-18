// autobyteus-458 API/E2E (temporary): API-05 in a desktop window. `pnpm dev` of this worktree on 127.0.0.1:5458 against the host
// node (node-458.mjs; BACKEND_NODE_BASE_URL, as the probes start their desktop window), headless Chrome 1440×1000 with the node's
// credential on loopback requests only. For each round: a new Delivery Team run whose lead holds its turn (`HOLD_TURN`, Running);
// the Runs view's Team row → "Terminate team" (one click); every toast the window shows is recorded; the node must report the
// Team stopped and the window must show no "Failed to terminate team". Round kinds: `closed` (the Team never opened in the window:
// no input state when the stop begins) and `open` (the lead's conversation open: its input state arrives as it streams).
// Also AC-003 on the desktop: the open conversation's composer box and its text area's lower corners (radius, screenshot).
// Args: <outDir> <rounds per kind>.
import fs from 'node:fs'; import path from 'node:path'; import { spawn, execFileSync } from 'node:child_process'; import { createRequire } from 'node:module';
const W = '/Users/normy/autobyteus_org/autobyteus-worktrees/phone-run-model-runtime-458';
const require = createRequire(`${W}/autobyteus-web/package.json`); const { chromium } = require('playwright-core');
const [out, roundsArg] = process.argv.slice(2); const rounds = Number(roundsArg || 2);
const s = JSON.parse(fs.readFileSync('/tmp/abtest458/state.json', 'utf8'));
const FRONT = 'http://127.0.0.1:5458'; const sleep = ms => new Promise(r => setTimeout(r, ms));
const API = path.join(path.dirname(new URL(import.meta.url).pathname), 'api.mjs');
const api = (...a) => JSON.parse(execFileSync('node', [API, ...a], { encoding: 'utf8' }));
const lines = []; const log = (...a) => { const l = a.join(' ').split(s.owner).join('own_…'); lines.push(l); console.log(l); };
const frontendLog = fs.createWriteStream(path.join(out, 'desktop-frontend.log'));
const frontend = spawn('corepack', ['pnpm', 'dev', '--host', '127.0.0.1', '--port', '5458'], { cwd: `${W}/autobyteus-web`, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, NODE_ENV: 'development', BACKEND_NODE_BASE_URL: s.base } });
frontend.stdout.pipe(frontendLog); frontend.stderr.pipe(frontendLog);
let browser; let ok = true;
const TOASTS = `(() => { window.__toastLog ??= []; const c = document.querySelector('[data-testid="toast-container"]'); if (!c || window.__toastObs) return 'ok';
  window.__toastObs = new MutationObserver(() => { for (const el of c.querySelectorAll(':scope > div > div')) { const t = el.textContent.replace(/\\s+/g, ' ').trim();
    if (t && !window.__toastLog.some(e => e.text === t)) window.__toastLog.push({ text: t, at: Date.now() }); } });
  window.__toastObs.observe(c, { childList: true, subtree: true, characterData: true }); return 'recording'; })()`;
try {
  for (let i = 0; i < 240 && !(await fetch(FRONT).then(r => r.ok).catch(() => false)); i++) await sleep(1000);
  browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' });
  await ctx.setExtraHTTPHeaders({ authorization: `Bearer ${s.owner}` });
  await ctx.route(u => !/^(https?|wss?):\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(u.href), route => { const h = { ...route.request().headers() }; delete h.authorization; return route.fallback({ headers: h }); });
  await ctx.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
  const page = await ctx.newPage();
  const consoleLines = []; page.on('console', m => { if (['warning', 'error'].includes(m.type()) && /terminat|stop/i.test(m.text())) consoleLines.push(`${m.type()}: ${m.text().slice(0, 300)}`); });
  // A cold dev server re-optimizes and reloads: warm it up first (TESTING.md, Browser probes).
  await page.goto(FRONT, { waitUntil: 'networkidle', timeout: 240000 }).catch(() => undefined); await sleep(4000);
  const runsView = async () => {
    await page.goto(FRONT, { waitUntil: 'domcontentloaded', timeout: 120000 }).catch(() => undefined); await sleep(2500);
    await page.locator('[data-test="run-section-view-menu"]').waitFor({ timeout: 60000 });
    if ((await page.locator('[data-test="run-section-title"]').innerText().catch(() => '')).trim() !== 'Runs') {
      await page.locator('[data-test="run-section-view-menu"]').click(); await page.locator('[data-test="run-section-view-runs"]').click(); }
    await page.evaluate(TOASTS);
  };
  const results = [];
  for (const kind of ['closed', 'open']) for (let n = 1; n <= rounds; n++) {
    const team = api('new-team'); const tag = `${kind}-${n}`;
    api('say-team', team.teamRunId, team.lead, `STOP-458-${tag} HOLD_TURN`);
    let active = false; for (let i = 0; i < 30 && !(active = api('team', team.teamRunId).isActive); i++) await sleep(1000);
    await sleep(3000);
    await runsView();
    const row = page.locator(`[data-test="run-list-row"][data-run-id="${team.teamRunId}"]`).first();
    await row.waitFor({ timeout: 60000 });
    let leadStatus = null;
    if (kind === 'open') {
      await row.locator('[data-test="run-list-row-name"]').first().click(); await sleep(4000);
      leadStatus = (await page.locator('main').innerText().catch(() => '')).match(/STOP-458-[a-z]+-\d/)?.[0] ?? null;
      if (n === 1) {
        // AC-003 (desktop): the composer box's text area keeps the box's rounded lower corners.
        const corner = await page.evaluate(() => { const ta = [...document.querySelectorAll('textarea')].find(e => e.getBoundingClientRect().width > 0);
          const area = ta?.closest('[class*="rounded-b-"]'); const box = ta?.closest('.rounded-xl'); const cs = area ? getComputedStyle(area) : null; const bs = box ? getComputedStyle(box) : null;
          return { areaRadius: cs ? [cs.borderBottomLeftRadius, cs.borderBottomRightRadius] : null, boxRadius: bs ? bs.borderBottomLeftRadius : null, boxBorder: bs ? bs.borderBottomWidth : null };
        });
        log(`AC-003 desktop composer: ${JSON.stringify(corner)}`);
        const box = page.locator('textarea:visible').first().locator('xpath=ancestor::*[contains(@class,"rounded-xl")][1]');
        await box.screenshot({ path: path.join(out, 'desktop-composer-corner.png') }).catch(e => log('composer shot:', e.message.slice(0, 100)));
        if (!corner.areaRadius || corner.areaRadius.some(r => r !== '11px')) ok = false;
      }
      await page.evaluate(TOASTS);
    }
    await row.hover(); const stop = row.getByRole('button', { name: 'Terminate team', exact: true }).first();
    await stop.waitFor({ timeout: 20000 });
    const t0 = Date.now(); await stop.click();
    let nodeActive = true; for (let i = 0; i < 60 && (nodeActive = api('team', team.teamRunId).isActive); i++) await sleep(1000);
    await sleep(3000);
    const toasts = await page.evaluate(() => window.__toastLog ?? []);
    const failed = toasts.filter(x => x.at >= t0 && /Failed to terminate|did not stop|Could not stop/i.test(x.text));
    await page.screenshot({ path: path.join(out, `desktop-team-stop-${tag}.png`) });
    const r = { tag, teamRunId: team.teamRunId, activeBeforeStop: active, conversationShown: leadStatus, nodeActiveAfterStop: nodeActive, stopMs: Date.now() - t0, toastsAfterStop: toasts.filter(x => x.at >= t0).map(x => x.text) };
    results.push(r); log(JSON.stringify(r));
    log(`${!nodeActive && failed.length === 0 ? 'PASS' : 'FAIL'} ${tag}: the Team stopped on the node and the window shows no stop failure`);
    if (nodeActive || failed.length) ok = false;
  }
  log(`console (stop/terminate warnings and errors): ${JSON.stringify(consoleLines)}`);
  if (consoleLines.some(l => /Failed to terminate/i.test(l))) ok = false;
} catch (e) { ok = false; log('ERROR', e.stack); }
finally { if (browser) await browser.close(); try { process.kill(-frontend.pid, 'SIGTERM'); } catch {} log(`result ${ok ? 'Pass' : 'Fail'}`); fs.writeFileSync(path.join(out, 'desktop-team-stop.log'), lines.join('\n') + '\n'); process.exitCode = ok ? 0 : 1; }

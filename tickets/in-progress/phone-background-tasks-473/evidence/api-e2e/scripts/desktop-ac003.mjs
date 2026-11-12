// autobyteus-473 API/E2E (temporary): AC-003 in a desktop window. `pnpm dev` of this worktree on 127.0.0.1:5473 against the
// host node (BACKEND_NODE_BASE_URL, as the phone probe starts its desktop window), headless Chrome 1440×1000 with the node's
// credential on loopback requests only (as `attachToBrowserContext`). With the Claude run's background task running: open the
// run, the Activity tab's Background Tasks section; reload the window; read it again. Arg: <outDir>.
import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process'; import { createRequire } from 'node:module';
const W = '/Users/normy/autobyteus_org/autobyteus-worktrees/phone-background-tasks-473';
const require = createRequire(`${W}/autobyteus-web/package.json`); const { chromium } = require('playwright-core');
const out = process.argv[2]; const s = JSON.parse(fs.readFileSync('/tmp/abtest473/state.json', 'utf8'));
const FRONT = 'http://127.0.0.1:5473'; const sleep = ms => new Promise(r => setTimeout(r, ms));
const lines = []; const log = (...a) => { const l = a.join(' ').split(s.owner).join('own_…'); lines.push(l); console.log(l); };
const frontendLog = fs.createWriteStream(path.join(out, 'desktop-frontend.log'));
const frontend = spawn('corepack', ['pnpm', 'dev', '--host', '127.0.0.1', '--port', '5473'], { cwd: `${W}/autobyteus-web`, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, NODE_ENV: 'development', BACKEND_NODE_BASE_URL: s.base } });
frontend.stdout.pipe(frontendLog); frontend.stderr.pipe(frontendLog);
let browser; let ok = true;
try {
  for (let i = 0; i < 240 && !(await fetch(FRONT).then(r => r.ok).catch(() => false)); i++) await sleep(1000);
  browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' });
  await ctx.setExtraHTTPHeaders({ authorization: `Bearer ${s.owner}` });
  await ctx.route(u => !/^(https?|wss?):\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(u.href), route => { const h = { ...route.request().headers() }; delete h.authorization; return route.fallback({ headers: h }); });
  await ctx.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
  const page = await ctx.newPage();
  const ops = []; page.on('request', q => { if (q.url().includes('/graphql') && q.method() === 'POST') { try { const op = JSON.parse(q.postData() ?? '{}').operationName; if (/Background/.test(op ?? '')) ops.push({ at: Date.now(), op }); } catch {} } });
  // A cold dev server re-optimizes and reloads: warm it up first (TESTING.md, Browser probes).
  await page.goto(FRONT, { waitUntil: 'networkidle', timeout: 240000 }).catch(() => undefined); await sleep(4000);
  const read = async (label, select) => {
    if (select) {
      await page.goto(FRONT, { waitUntil: 'domcontentloaded', timeout: 120000 }).catch(() => undefined); await sleep(2500);
      // The left section's Runs view lists the run (as the phone probe's MSP-46 opens it): switch to it, click the run's row.
      await page.locator('[data-test="run-section-view-menu"]').waitFor({ timeout: 60000 }).catch(e => log('runs menu:', e.message.slice(0, 100)));
      if ((await page.locator('[data-test="run-section-title"]').innerText().catch(() => '')).trim() !== 'Runs') {
        await page.locator('[data-test="run-section-view-menu"]').click(); await page.locator('[data-test="run-section-view-runs"]').click(); }
      const row = page.locator(`[data-test="run-list-row"][data-run-id="${s.run}"] [data-test="workspace-agent-run-row"]`).first();
      await row.waitFor({ timeout: 60000 }).catch(e => log('run row:', e.message.slice(0, 100)));
      await row.click().catch(e => log('click run:', e.message.slice(0, 100)));
    }
    await sleep(3000);
    const show = page.getByRole('button', { name: 'Show tools', exact: true }); if (await show.isVisible().catch(() => false)) await show.click();
    await page.locator('[data-test="right-side-tab-list"]').getByText('Activity', { exact: true }).first().click({ timeout: 30000 }).catch(e => log('activity tab:', e.message.slice(0, 120)));
    await sleep(1500);
    const header = page.locator('[data-test="background-tasks-header"]').first();
    if (await header.count() && !(await page.locator('[data-test="background-tasks-list"]:visible, [data-test="background-tasks-empty"]:visible, [data-test="background-tasks-availability"]:visible').count())) await header.click();
    let rows = []; for (let i = 0; i < 20; i++) { rows = await page.evaluate(() => [...document.querySelectorAll('[data-test="background-task-row"]')].map(r => r.textContent.replace(/\s+/g, ' ').trim().slice(0, 200))); if (rows.length) break; await sleep(500); }
    await page.screenshot({ path: path.join(out, `desktop-${label}.png`) });
    return { url: page.url().replace(FRONT, '').replace(/[?&]?pairing=[^&]*/, ''), selected: (await page.locator('main').innerText().catch(() => '')).includes('No agent or team run selected') ? 'none' : 'a run', rows, header: (await header.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 120) };
  };
  log(`# AC-003 desktop window; run ${s.run}; ${new Date().toISOString()}`);
  const first = await read('opened', true); log(`opened: ${JSON.stringify(first)}`);
  const before = ops.length; await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(2000);
  const afterReload = await read('after-reload', false); log(`after reload: ${JSON.stringify(afterReload)}`);
  log(`background-task view reads after the reload: ${JSON.stringify(ops.slice(before).map(o => o.op))}`);
  const running = r => r.rows.some(t => /running/i.test(t) && /BG-473-FOUR/.test(t));
  log(`${running(first) ? 'PASS' : 'FAIL'} the running task is listed when the window opens the run`); if (!running(first)) ok = false;
  log(`${running(afterReload) ? 'PASS' : 'FAIL'} after a reload the Progress/Activity panel lists the running task (AC-003)`); if (!running(afterReload)) ok = false;
} catch (e) { ok = false; log('ERROR', e.stack); }
finally { if (browser) await browser.close(); try { process.kill(-frontend.pid, 'SIGTERM'); } catch {} log(`result ${ok ? 'Pass' : 'Fail'}`); fs.writeFileSync(path.join(out, 'desktop-ac003.log'), lines.join('\n') + '\n'); process.exitCode = ok ? 0 : 1; }

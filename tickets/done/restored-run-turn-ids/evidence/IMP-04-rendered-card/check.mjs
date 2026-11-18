import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { createRequire } from 'node:module';
const web = '/Users/normy/autobyteus_org/autobyteus-worktrees/restored-run-turn-ids/autobyteus-web';
const out = process.argv[2];
const { chromium } = createRequire(path.join(web, 'package.json'))('playwright-core');
const route = path.join(web, 'pages/probe-restart-reminder-card.vue');
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = async () => { const s = net.createServer(); await new Promise((r) => s.listen(0, '127.0.0.1', r)); const p = s.address().port; await new Promise((r) => s.close(r)); return p; };
const result = { errors: [], cases: {} };
let child, browser;
await fs.mkdir(out, { recursive: true });
try {
  await fs.copyFile('/tmp/rc526/reminder-card.page.vue', route);
  const port = await freePort();
  const log = createWriteStream(path.join(out, 'nuxt.log'));
  child = spawn(path.join(web, 'node_modules/.bin/nuxi'), ['dev', '--host', '127.0.0.1', '--port', String(port)], { cwd: web, detached: true,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, NUXT_TELEMETRY_DISABLED: '1', BACKEND_NODE_BASE_URL: `http://127.0.0.1:${await freePort()}` }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log); child.stderr.pipe(log);
  const url = `http://127.0.0.1:${port}/probe-restart-reminder-card`;
  const deadline = Date.now() + 180000;
  while (true) { if (Date.now() > deadline) throw new Error('nuxt not ready'); try { if ((await fetch(url)).ok) break; } catch {} await pause(500); }
  browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  for (const [name, viewport, timezoneId] of [['desktop-berlin', { width: 1280, height: 600 }, 'Europe/Berlin'], ['phone-berlin', { width: 390, height: 844 }, 'Europe/Berlin'], ['desktop-tokyo', { width: 1280, height: 600 }, 'Asia/Tokyo']]) {
    const page = await browser.newPage({ viewport, locale: 'en-US', timezoneId });
    page.on('pageerror', (e) => result.errors.push(`${name} pageerror: ${e.message}`));
    await page.route('**/rest/health', (r) => r.fulfill({ contentType: 'application/json', body: '{"status":"ok"}' }));
    await page.route('**/graphql', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: {} }) }));
    await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
    await page.locator('[data-testid="system-task-notification-segment"]').waitFor({ timeout: 60000 });
    await pause(1500);
    const card = (await page.locator('[data-testid="system-task-notification-segment"]').innerText()).trim();
    const content = (await page.locator('[data-test="probe-segment-content"]').innerText()).trim();
    const box = await page.locator('[data-test="probe-card"]').boundingBox();
    await page.screenshot({ path: path.join(out, `${name}.png`) });
    result.cases[name] = { card, segmentContentKeepsUtc: content.includes('2026-11-18 05:41 UTC'), cardWidth: box?.width };
    await page.close();
  }
} catch (e) { result.errors.push(String(e)); }
finally {
  await browser?.close().catch(() => {});
  if (child) { try { process.kill(-child.pid, 'SIGTERM'); } catch {} }
  await fs.rm(route, { force: true });
  result.routeRemoved = !(await fs.stat(route).then(() => true, () => false));
  await fs.writeFile(path.join(out, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}

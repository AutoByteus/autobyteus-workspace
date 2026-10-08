// Implementation-only changed-component preview. Not an API/E2E or desktop certification.
// Run from worktree root: node tickets/in-progress/restore-team-group-icon/evidence/implementation/preview.mjs <fresh-output-dir>
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import net from 'node:net';
import assert from 'node:assert/strict';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = process.cwd(), web = path.join(root, 'autobyteus-web');
const require = createRequire(path.join(web, 'package.json'));
const { chromium } = require('playwright-core');
const out = path.resolve(process.argv[2]);
await fs.mkdir(out); // refuse previous evidence overwrite
const installed = path.join(web, 'pages/implementation-team-icons.vue');
await fs.copyFile(path.join(here, 'preview.page.vue'), installed, 1);
const evidence = { layer: 'Implementation rendered self-check', source: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root }).toString().trim(), events: [], checks: [], cleanup: {} };
await fs.writeFile(path.join(out, 'source.diff'), execFileSync('git', ['diff', '--', 'autobyteus-web/components'], { cwd: root }));
const freePort = async () => { const s = net.createServer(); await new Promise(r => s.listen(0, '127.0.0.1', r)); const p = s.address().port; await new Promise(r => s.close(r)); return p; };
const port = await freePort(), backendPort = await freePort();
evidence.ports = { port, backendPort };
const log = createWriteStream(path.join(out, 'nuxt.log'));
const child = spawn('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(port)], { cwd: web, detached: true, env: { ...process.env, NUXT_TELEMETRY_DISABLED: '1', BACKEND_NODE_BASE_URL: `http://127.0.0.1:${backendPort}` }, stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.pipe(log); child.stderr.pipe(log);
evidence.nuxtPid = child.pid;
const url = `http://127.0.0.1:${port}/implementation-team-icons`;
let browser;
const pause = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (fn, timeout = 120000) => { const deadline = Date.now() + timeout; while (Date.now() < deadline) { if (await fn()) return; await pause(200); } throw new Error('Preview readiness timed out'); };
try {
  await waitFor(async () => { try { return (await fetch(url)).ok; } catch { return false; } });
  browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
  page.on('response', r => { if (r.status() >= 400) evidence.events.push({ kind: 'http-error', status: r.status(), url: r.url() }); });
  page.on('pageerror', e => evidence.events.push({ kind: 'pageerror', text: e.message }));
  page.on('console', e => { if (['error', 'warning'].includes(e.type())) evidence.events.push({ kind: e.type(), text: e.text() }); });
  await page.route('**/rest/health', route => route.fulfill({ contentType: 'application/json', body: '{"status":"ok"}' }));
  await page.route('**/graphql', async route => {
    const query = route.request().postDataJSON()?.query ?? '';
    const data = query.includes('serverSettings') ? { serverSettings: [] } : query.includes('agentDefinitions') ? { agentDefinitions: [] } : query.includes('agentTeamDefinitions') ? { agentTeamDefinitions: [] } : query.includes('workspaces') ? { workspaces: [] } : {};
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(route.request().url().includes('health') ? { status: 'ok' } : { data }) });
  });
  await page.goto(url);
  await page.locator('[data-preview="team-icons"]').waitFor();
  // Wait for genuine Iconify SVGs; no stubs or icon injection.
  await page.locator('[data-team-icon="temporary-task-team"] svg').first().waitFor();
  await pause(3000); // cold Vite optimization can reload once; no action is taken before settling
  const iconUrl = 'https://api.iconify.design/heroicons.json?icons=user-group-20-solid';
  const iconData = await (await fetch(iconUrl)).json();
  assert(iconData.icons?.['user-group-20-solid']?.body);
  await fs.writeFile(path.join(out, 'reference-icon.json'), JSON.stringify({ url: iconUrl, ...iconData }, null, 2));
  const inspect = async (width) => {
    await page.setViewportSize({ width, height: 1080 });
    const result = await page.evaluate((body) => {
      const expected = [...new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${body}</svg>`, 'image/svg+xml').querySelectorAll('path')].map(p => p.getAttribute('d'));
      const selectors = [
        '[data-preview="transient"] [data-team-icon] svg',
        '[data-test="agent-org-task-team-row-team-task"] > svg.iconify--heroicons:not([data-test])',
        '[data-test="agent-org-task-team-row-product-run"] > svg.iconify--heroicons:not([data-test])',
        '[data-test="agent-org-team-row-team-configured"] > svg.iconify--heroicons',
        '[data-preview="workers"] [aria-hidden="true"] > svg',
        '[data-test="memory-member-group-header"] svg',
      ];
      const icons = [...new Set(selectors.flatMap(s => [...document.querySelectorAll(s)]))].filter(el => [...el.querySelectorAll('path')].map(p => p.getAttribute('d')).join('|') === expected.join('|'));
      return { expectedPathCount: expected.length, icons: icons.map(el => { const r = el.getBoundingClientRect(); return { width: r.width, height: r.height, color: getComputedStyle(el).color, paths: [...el.querySelectorAll('path')].map(p => p.getAttribute('d')) }; }), overflow: document.documentElement.scrollWidth > innerWidth };
    }, iconData.icons['user-group-20-solid'].body);
    assert.equal(result.icons.length, 13); // 3 transient + 3 Org + 4 workers + 3 Memory
    assert(result.expectedPathCount > 0);
    assert.deepEqual(result.icons.map(x => x.width).sort((a,b) => a-b), [12,12,14,14,16,16,16,16,16,16,16,16,16]);
    assert.equal(result.overflow, false);
    evidence.checks.push({ name: `Actual group SVG, size/color and no overflow at ${width}px`, ...result });
    await page.screenshot({ path: path.join(out, `preview-${width}.png`), fullPage: true });
  };
  await inspect(1440); await inspect(768);
  const row = page.locator('[data-preview="transient"] [role="treeitem"]').first();
  await row.click(); assert.equal(await row.getAttribute('aria-expanded'), 'false');
  await row.focus(); await page.keyboard.press('Enter'); assert.equal(await row.getAttribute('aria-expanded'), 'true');
  await page.keyboard.press('Space'); assert.equal(await row.getAttribute('aria-expanded'), 'false');
  assert.equal(await row.getAttribute('aria-selected'), 'true');
  assert(await row.evaluate(el => el === document.activeElement));
  await page.screenshot({ path: path.join(out, 'focused-row.png'), fullPage: true });
  const org = page.locator('[data-test="agent-org-task-team-row-team-task"]');
  await org.click(); assert.equal(await org.getAttribute('aria-expanded'), 'false');
  await org.focus(); await page.keyboard.press('Enter'); assert.equal(await org.getAttribute('aria-expanded'), 'true');
  await page.locator('[data-preview="memory"] article button').last().click();
  assert.match(await page.locator('[data-preview="team-icons"] > p').innerText(), /selections=3 inspections=3/);
  assert.equal(await page.locator('[data-preview="worker-row"] [data-openable="true"]').count(), 1);
  assert.equal(await page.locator('[data-preview="worker-closed"] button').count(), 0);
  assert.equal(await page.locator('[data-preview="worker-failed"] button').count(), 0);
  evidence.checks.push({ name: 'Pointer/Enter/Space selection/disclosure/focus; Org inspect; Memory inspect; worker openability semantics', result: 'Pass' });
  assert.equal(evidence.events.filter(e => ['pageerror', 'error', 'http-error'].includes(e.kind)).length, 0, JSON.stringify(evidence.events));
  evidence.result = 'Pass';
} catch (error) { evidence.result = 'Fail'; evidence.error = error.stack; process.exitCode = 1; }
finally {
  if (browser) { await browser.close(); evidence.cleanup.browserClosed = true; }
  process.kill(-child.pid, 'SIGTERM');
  await waitFor(async () => child.exitCode !== null || child.signalCode !== null, 10000);
  evidence.cleanup.nuxtExited = true;
  await fs.rm(installed); evidence.cleanup.routeRemoved = true;
  const server = net.createServer();
  await new Promise((resolve,reject) => server.once('error',reject).listen(port,'127.0.0.1',resolve));
  await new Promise(resolve => server.close(resolve)); evidence.cleanup.portReleased = true;
  log.end();
  await fs.writeFile(path.join(out, 'result.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ result: evidence.result, error: evidence.error, cleanup: evidence.cleanup }));
}

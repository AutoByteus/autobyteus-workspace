#!/usr/bin/env node
// IMP-12: rendered check of Settings -> Agent Runtimes in a window bound to a real Docker node that reports
// agentRuntimeSignInBrowserAvailable=true (implementation self-validation, not API/E2E sign-off).
// Stack: a throwaway container of autobyteus/autobyteus-server:beta with this worktree's server dist mounted read-only,
// on 127.0.0.1 with fresh volumes (runtimes signed out); this worktree's Nuxt dev server; headless Chrome. The window is
// bound to the container under a non-embedded node id, as a remote node's window is bound.
// Usage: node IMP-render-remote-desktop-node.mjs <worktree> <output-dir>
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';

const [worktree, outputDir] = process.argv.slice(2);
const webDir = path.join(worktree, 'autobyteus-web');
const { chromium } = createRequire(path.join(webDir, 'package.json'))('playwright-core');
const NAME = 'imp-render-probe';
const BACKEND_PORT = 18093;
const backend = `http://127.0.0.1:${BACKEND_PORT}`;
const results = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const waitFor = async (what, fn, ms = 60000) => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) { try { if (await fn()) return; } catch {} await sleep(300); }
  throw new Error(`Timed out waiting for ${what}`);
};
const freePort = () => new Promise((resolve) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8' });
const nodeTabs = () => docker('exec', NAME, 'bash', '-lc', 'curl -s http://127.0.0.1:9222/json')
  .split('\n').filter((line) => line.includes('"url"') && !line.includes('chrome')).map((line) => line.trim().replace(/\?.*$/, '?<query redacted>'));

let frontend, browser;
try {
  await fs.mkdir(outputDir, { recursive: true });
  docker('run', '-d', '--name', NAME, '--security-opt', 'seccomp=unconfined', '--cap-add', 'SYS_ADMIN',
    '-p', `127.0.0.1:${BACKEND_PORT}:8000`, '-v', `${worktree}/autobyteus-server-ts/dist:/app/autobyteus-server-ts/dist:ro`,
    '-e', `AUTOBYTEUS_SERVER_HOST=http://localhost:${BACKEND_PORT}`, 'autobyteus/autobyteus-server:beta');
  await waitFor('backend', async () => (await fetch(`${backend}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"query":"{ __typename }"}' })).ok, 120000);

  const port = await freePort();
  const frontendUrl = `http://127.0.0.1:${port}`;
  const log = await fs.open(path.join(outputDir, 'frontend.log'), 'w');
  frontend = spawn('corepack', ['pnpm', 'dev', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: webDir, detached: true, stdio: ['ignore', log.fd, log.fd],
    env: { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('AUTOBYTEUS_'))), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backend },
  });
  await waitFor('frontend', async () => (await fetch(frontendUrl)).ok, 240000);

  browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/google-chrome', args: ['--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' });
  await context.addInitScript(() => { if (!localStorage.getItem('autobyteus.localization.preference-mode')) localStorage.setItem('autobyteus.localization.preference-mode', 'en'); });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const byId = (id) => page.locator(`[data-testid="${id}"]`);
  const text = async (id) => (await byId(id).innerText()).replace(/\s+/g, ' ').trim();
  const shot = (name) => page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: true });
  const open = async () => {
    await page.goto(`${frontendUrl}/settings?section=agent-runtimes`, { waitUntil: 'domcontentloaded' });
    await byId('agent-runtimes-card').waitFor({ timeout: 120000 });
  };
  const bindRemote = () => page.evaluate((url) => {
    const pinia = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia;
    pinia._s.get('windowNodeContext').bindNodeContext('docker-check-node', url);
  }, backend);
  const step = async (name, fn) => {
    try { await fn(); results.push({ name, result: 'Pass' }); } catch (error) { results.push({ name, result: 'Fail', error: error.message }); }
  };

  await open();
  await sleep(4000); // cold Nuxt dev server warm-up (TESTING.md)
  await open();
  await bindRemote();
  await waitFor('remote note', async () => (await byId('agent-runtimes-remote-note').count()) > 0);
  await waitFor('accounts read', async () => (await text('runtime-codex_app_server-signin')) === 'Not signed in', 90000);

  await step('Remote desktop node: note, Sign in for Codex/Grok, command-line hint for Claude/Antigravity, no Update (AC-003, AC-004)', async () => {
    assert(/·\s*Remote node$/.test(await text('agent-runtimes-node')), `node line ${await text('agent-runtimes-node')}`);
    assert(await text('agent-runtimes-remote-note') === "Sign-in opens the browser on that node; finish it in the VNC Viewer. Update these runtimes on that node's computer.", `note ${await text('agent-runtimes-remote-note')}`);
    for (const kind of ['codex_app_server', 'grok_build']) {
      assert(await text(`runtime-${kind}-signin-button`) === 'Sign in', `${kind} Sign in`);
    }
    for (const kind of ['claude_agent_sdk', 'antigravity_cli']) {
      assert(await text(`runtime-${kind}-signin-hint`) === 'Sign in from its command line on that node.', `${kind} hint`);
      assert((await byId(`runtime-${kind}-signin-button`).count()) === 0, `${kind} has no button`);
    }
    assert((await page.locator('[data-testid$="-update"], [data-testid$="-blocked"]').count()) === 0, 'no Update or blocked line');
    await shot('IMP-12a-remote-desktop-node-1440');
  });

  await step('Codex Sign in: Signing in..., remote waiting copy with Cancel; the vendor page opens in the node Chromium; Cancel returns to Sign in (AC-001 up to the vendor page)', async () => {
    await byId('runtime-codex_app_server-signin-button').click();
    await waitFor('waiting copy', async () => (await byId('runtime-codex_app_server-signin-waiting').count()) > 0, 30000);
    assert(await text('runtime-codex_app_server-signin-waiting') === 'Finish signing in to Codex in the browser on that node (VNC Viewer).', 'waiting copy');
    assert(await text('runtime-codex_app_server-signin-button') === 'Signing in…', 'signing in label');
    await waitFor('vendor tab in node Chromium', async () => nodeTabs().some((line) => line.includes('auth.openai.com')), 30000);
    results.push({ name: 'node Chromium tabs while signing in', tabs: nodeTabs() });
    await shot('IMP-12b-remote-codex-signing-in');
    await byId('runtime-codex_app_server-signin-cancel').click();
    await waitFor('back to Sign in', async () => (await byId('runtime-codex_app_server-signin-outcome').count()) === 0
      && (await text('runtime-codex_app_server-signin-button')) === 'Sign in', 30000);
  });

  await step('Stacked layout at 739 px stays readable with the remote note and Sign in', async () => {
    await page.setViewportSize({ width: 739, height: 1100 });
    await sleep(500);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    assert(!overflow, 'page overflows horizontally');
    await shot('IMP-12c-remote-desktop-node-739');
    await page.setViewportSize({ width: 1440, height: 1000 });
  });

  await step('zh-CN: remote note and hint in Chinese', async () => {
    await page.evaluate(() => localStorage.setItem('autobyteus.localization.preference-mode', 'zh-CN'));
    await open();
    await bindRemote();
    await waitFor('zh note', async () => (await byId('agent-runtimes-remote-note').count()) > 0
      && (await text('agent-runtimes-remote-note')).includes('VNC 查看器'), 90000);
    await waitFor('zh hint', async () => (await byId('runtime-claude_agent_sdk-signin-hint').count()) > 0, 90000);
    assert(await text('runtime-claude_agent_sdk-signin-hint') === '请在该节点的命令行中登录。', 'zh hint');
    await shot('IMP-12d-remote-desktop-node-zh-CN');
  });

  results.push({ name: 'browser errors', errors });
} finally {
  await browser?.close().catch(() => {});
  if (frontend) { try { process.kill(-frontend.pid, 'SIGTERM'); } catch {} }
  try { docker('rm', '-f', '-v', NAME); } catch {}
  results.push({ cleanup: { container: 'removed', frontend: frontend ? `terminated:${frontend.pid}` : 'not started' } });
  await fs.writeFile(path.join(outputDir, 'result.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
}

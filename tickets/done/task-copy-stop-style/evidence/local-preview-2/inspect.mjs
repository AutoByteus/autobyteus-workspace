// Ticket-local implementation visual inspection, not API/E2E sign-off.
// Start only after local builds/tests exit; imports product rows into a temporary Nuxt page.
import fs from 'node:fs/promises';
import { createWriteStream, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const out = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(out, '../../../../..');
const web = path.join(root, 'autobyteus-web');
const { chromium } = createRequire(path.join(web, 'package.json'))('playwright-core');
const installed = path.join(web, 'pages/implementation-stop-preview.vue');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const freePort = async () => { const s = net.createServer(); await new Promise(r => s.listen(0, '127.0.0.1', r)); const p = s.address().port; await new Promise(r => s.close(r)); return p; };
const waitFor = async fn => { for (let i = 0; i < 900; i++) { if (await fn()) return; await sleep(200); } throw new Error('Preview readiness timed out'); };
const evidence = { layer: 'Local implementation rendered self-check; fixture contexts and intercepted HTTP only', states: {}, requests: [], errors: [], cleanup: {} };
let child, browser, owned = false;
const log = createWriteStream(path.join(out, 'nuxt.log'));
try {
  assert(!existsSync(installed)); await fs.copyFile(path.join(out, 'preview.vue'), installed, 1); owned = true;
  const home = await fs.mkdtemp('/tmp/stop-style-preview-home-'); evidence.home = home;
  const port = await freePort(), backendPort = await freePort(); evidence.ports = [port, backendPort];
  const env = { PATH: process.env.PATH, HOME: home, LANG: 'C.UTF-8', NUXT_TELEMETRY_DISABLED: '1', BACKEND_NODE_BASE_URL: `http://127.0.0.1:${backendPort}` };
  child = spawn(path.join(web, 'node_modules/.bin/nuxi'), ['dev', '--host', '127.0.0.1', '--port', String(port)], { cwd: web, env, detached: true, stdio: ['ignore','pipe','pipe'] });
  evidence.nuxtPid = child.pid; child.stdout.pipe(log); child.stderr.pipe(log);
  const url = `http://127.0.0.1:${port}/implementation-stop-preview`;
  await waitFor(async () => { try { return (await fetch(url)).ok; } catch { return false; } });
  browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true });
  evidence.browser = browser.version();
  const page = await browser.newPage({ viewport: { width: 1000, height: 600 }, locale: 'en-US' });
  page.on('pageerror', e => evidence.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') evidence.errors.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400) evidence.errors.push(`${r.status()} ${r.url()}`); });
  await page.route('**/rest/health', route => route.fulfill({ contentType: 'application/json', body: '{"status":"ok"}' }));
  let release;
  await page.route('**/graphql', async route => {
    const payload = route.request().postDataJSON();
    if (payload.operationName === 'StopDelegatedExecution') {
      evidence.requests.push(payload.variables.input);
      await new Promise(r => { release = r; });
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: { stopDelegatedExecution: { success: true, outcome: 'STOPPED', message: 'Stopped.', notStoppedUnattributed: 0 } } }) });
    }
    const query = payload.query ?? '';
    const data = query.includes('serverSettings') ? { serverSettings: [] } : query.includes('agentDefinitions') ? { agentDefinitions: [] }
      : query.includes('agentTeamDefinitions') ? { agentTeamDefinitions: [] } : query.includes('workspaces') ? { workspaces: [] } : {};
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data }) });
  });
  await page.routeWebSocket(/\/ws\/agent-package-definitions(\?|$)/, ws => { ws.send(JSON.stringify({ type: 'connected' })); });
  await page.goto(url);
  await page.locator('[data-test="workspace-delegated-stop"] svg').first().waitFor({ timeout: 120000 });
  await sleep(3000); // cold Nuxt dependency reload
  const style = loc => loc.evaluate(el => { const s = getComputedStyle(el); return { color: s.color, background: s.backgroundColor, transition: s.transitionDuration, focus: el.matches(':focus-visible'), shadow: s.boxShadow }; });
  const picture = async name => { await page.screenshot({ path: path.join(out, `${name}.png`) }); };
  const neutral = async () => { await page.mouse.move(900, 500); await sleep(220); };
  const reference = page.locator('[data-preview="reference"]');
  await neutral(); evidence.referenceRest = await style(reference);
  await reference.hover(); await sleep(220); evidence.referenceHover = await style(reference); await neutral();
  const refColors = state => ({ color: state.color, background: state.background, transition: state.transition });
  for (const kind of ['agent', 'team']) {
    const row = page.locator(`[data-transient-kind="task_${kind}"]`), button = row.locator('[data-test="workspace-delegated-stop"]');
    for (const selected of [false, true]) {
      if (selected) await row.click({ position: { x: 160, y: 14 } });
      await neutral(); const key = `${kind}-${selected ? 'selected' : 'unselected'}`;
      const rest = await style(button); await picture(`${key}-rest`);
      await button.hover(); await sleep(220); const hover = await style(button); await picture(`${key}-hover`);
      await neutral(); const leave = await style(button); await picture(`${key}-leave`);
      assert.deepEqual(refColors(rest), refColors(evidence.referenceRest));
      assert.deepEqual(refColors(hover), refColors(evidence.referenceHover));
      assert.deepEqual(refColors(leave), refColors(rest)); evidence.states[key] = { rest, hover, leave };
    }
    // Focus row then Tab through its disclosure to Stop: native keyboard activation, no synthetic click.
    await row.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
    assert(await button.evaluate(el => document.activeElement === el));
    evidence.states[`${kind}-focus`] = await style(button);
    assert(evidence.states[`${kind}-focus`].focus); assert.notEqual(evidence.states[`${kind}-focus`].shadow, 'none');
    await picture(`${kind}-focus`);
    const counts = await page.locator('[data-preview="counts"]').textContent();
    await page.keyboard.press(kind === 'agent' ? 'Enter' : 'Space');
    await waitFor(async () => Boolean(release));
    assert(await button.isDisabled()); assert.equal(await page.locator('[data-preview="counts"]').textContent(), counts);
    evidence.states[`${kind}-pending`] = { label: await button.getAttribute('aria-label'), disabled: await button.isDisabled(), iconClasses: await button.locator('svg').getAttribute('class') };
    assert.match(evidence.states[`${kind}-pending`].iconClasses, /animate-pulse/);
    await picture(`${kind}-pending`);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await button.locator('svg').evaluate(el => getComputedStyle(el).animationName), 'none');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    release(); release = null; await waitFor(async () => !(await button.isDisabled()));
  }
  assert.deepEqual(evidence.requests, [{ rootKind: 'AGENT', rootRunId: 'host-run', agentRunId: 'writer-run' }, { rootKind: 'AGENT', rootRunId: 'host-run', teamRunId: 'review-team' }]);
  assert.deepEqual(evidence.errors, []); evidence.result = 'PASS — local preview only';
} catch (e) { evidence.result = 'FAIL'; evidence.failure = e.stack; process.exitCode = 1; }
finally {
  if (browser) { await browser.close(); evidence.cleanup.browserClosed = true; }
  if (child && child.exitCode === null) { process.kill(-child.pid, 'SIGTERM'); await waitFor(async () => child.exitCode !== null || child.signalCode !== null); evidence.cleanup.nuxtStopped = true; }
  if (owned) { await fs.rm(installed); evidence.cleanup.routeRemoved = true; }
  if (evidence.home) { await fs.rm(evidence.home, { recursive: true, force: true }); evidence.cleanup.homeRemoved = true; }
  evidence.cleanup.portsReleased = true;
  for (const port of evidence.ports ?? []) { const s = net.createServer(); try { await new Promise((r,j) => s.once('error',j).listen(port,'127.0.0.1',r)); await new Promise(r => s.close(r)); } catch { evidence.cleanup.portsReleased = false; } }
  await new Promise(r => log.end(r));
  await fs.writeFile(path.join(out, 'result.json'), JSON.stringify(evidence, null, 2)); console.log(JSON.stringify(evidence, null, 2));
}

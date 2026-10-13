// Ticket-local implementation visual inspection. Fixture callbacks/HTTP; NOT API/E2E sign-off.
import fs from 'node:fs/promises';
import { createWriteStream, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const out = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(out, '../../../../..'), web = path.join(root, 'autobyteus-web');
const { chromium } = createRequire(path.join(web, 'package.json'))('playwright-core');
const installed = path.join(web, 'pages/implementation-red-stop-preview.vue');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const freePort = async () => { const s = net.createServer(); await new Promise(r => s.listen(0, '127.0.0.1', r)); const p = s.address().port; await new Promise(r => s.close(r)); return p; };
const waitFor = async fn => { for (let i = 0; i < 900; i++) { if (await fn()) return; await sleep(200); } throw new Error('Preview readiness timed out'); };
const evidence = { layer: 'Implementation rendered self-check: actual components, fixture contexts and intercepted HTTP', states: {}, requests: [], errors: [], cleanup: {} };
let child, browser, owned = false;
const log = createWriteStream(path.join(out, 'nuxt.log'));
try {
  assert(!existsSync(installed)); await fs.copyFile(path.join(out, 'preview.vue'), installed, 1); owned = true;
  const home = await fs.mkdtemp('/tmp/red-stop-preview-home-'); evidence.home = home;
  const port = await freePort(), backendPort = await freePort(); evidence.ports = [port, backendPort];
  child = spawn(path.join(web, 'node_modules/.bin/nuxi'), ['dev', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: web, env: { PATH: process.env.PATH, HOME: home, LANG: 'C.UTF-8', NUXT_TELEMETRY_DISABLED: '1', BACKEND_NODE_BASE_URL: `http://127.0.0.1:${backendPort}` },
    detached: true, stdio: ['ignore','pipe','pipe'],
  });
  evidence.nuxtPid = child.pid; child.stdout.pipe(log); child.stderr.pipe(log);
  const url = `http://127.0.0.1:${port}/implementation-red-stop-preview`;
  await waitFor(async () => { try { return (await fetch(url)).ok; } catch { return false; } });
  browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true }); evidence.browser = browser.version();
  const page = await browser.newPage({ viewport: { width: 1000, height: 750 }, locale: 'en-US' });
  page.on('pageerror', e => evidence.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') evidence.errors.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400) evidence.errors.push(`${r.status()} ${r.url()}`); });
  await page.route('**/rest/health', r => r.fulfill({ contentType: 'application/json', body: '{"status":"ok"}' }));
  let release;
  await page.route('**/graphql', async route => {
    const payload = route.request().postDataJSON();
    if (payload.operationName === 'StopDelegatedExecution') {
      evidence.requests.push(payload.variables.input); await new Promise(r => { release = r; });
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: { stopDelegatedExecution: { success: true, outcome: 'STOPPED', message: 'Fixture response.', notStoppedUnattributed: 0 } } }) });
    }
    const q = payload.query ?? '';
    const data = q.includes('serverSettings') ? { serverSettings: [] } : q.includes('agentDefinitions') ? { agentDefinitions: [] }
      : q.includes('agentTeamDefinitions') ? { agentTeamDefinitions: [] } : q.includes('workspaces') ? { workspaces: [] } : {};
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data }) });
  });
  await page.routeWebSocket(/\/ws\/agent-package-definitions(\?|$)/, ws => ws.send(JSON.stringify({ type: 'connected' })));
  await page.goto(url);
  await page.locator('[data-test="workspace-delegated-stop"] svg').first().waitFor({ timeout: 120000 });
  await sleep(3000); // settle cold Nuxt optimizer reload
  const style = loc => loc.evaluate(el => { const s = getComputedStyle(el); return { color: s.color, background: s.backgroundColor, opacity: s.opacity, cursor: s.cursor, transition: s.transitionDuration, focus: el.matches(':focus-visible'), outline: s.outlineStyle, shadow: s.boxShadow }; });
  const colors = s => ({ color: s.color, background: s.background });
  const restExpected = { color: 'rgb(239, 68, 68)', background: 'rgba(0, 0, 0, 0)' };
  const disabledExpected = { color: 'rgb(153, 153, 153)', background: 'rgba(0, 0, 0, 0)' };
  const hoverExpected = { color: 'rgb(220, 38, 38)', background: 'rgb(254, 242, 242)' };
  const shot = name => page.screenshot({ path: path.join(out, `${name}.png`) });
  const leave = async () => { await page.mouse.move(900, 680); await sleep(230); };
  const copyAgent = '[data-transient-kind="task_agent"] [data-test="workspace-delegated-stop"]';
  const copyTeam = '[data-transient-kind="task_team"] [data-test="workspace-delegated-stop"]';
  const variants = [ ['agent-root', '[data-test="terminate-agent-run"]'], ['team-root', 'button[title="Terminate team"]'], ['org-root', 'button[title="Stop Agent Org"]'], ['agent-copy', copyAgent], ['team-copy', copyTeam] ];
  for (let index = 0; index < variants.length; index++) {
    const [id, selector] = variants[index], button = page.locator(selector);
    await leave(); const rest = await style(button); await shot(`${id}-rest`); assert.deepEqual(colors(rest), restExpected);
    await button.hover(); await sleep(230); const hover = await style(button); await shot(`${id}-hover`); assert.deepEqual(colors(hover), hoverExpected);
    await leave(); const afterLeave = await style(button); await shot(`${id}-leave`); assert.deepEqual(colors(afterLeave), restExpected);
    // Native Tab navigation (not a synthesized click); each existing root/copy retains its focus convention.
    for (let tab = 0; tab < 60 && !(await button.evaluate(el => document.activeElement === el)); tab++) await page.keyboard.press('Tab');
    assert(await button.evaluate(el => document.activeElement === el));
    const focus = await style(button); assert(focus.focus); assert(focus.outline !== 'none' || focus.shadow !== 'none'); await shot(`${id}-focus`);
    const counts = await page.locator('[data-preview="counts"]').textContent();
    const rootCount = JSON.parse(await page.locator('[data-preview="root-actions"]').textContent()).length;
    const requestCount = evidence.requests.length;
    await page.keyboard.press(index % 2 ? 'Space' : 'Enter');
    await waitFor(async () => await button.isDisabled());
    if (id.endsWith('copy')) await waitFor(async () => Boolean(release));
    await leave(); const pending = await style(button); assert.deepEqual(colors(pending), disabledExpected); await shot(`${id}-pending`);
    // Playwright hover normally waits for enabled; force pointer over the actual disabled rectangle instead.
    const box = await button.boundingBox(); await page.mouse.move(box.x + box.width/2, box.y + box.height/2); await sleep(230);
    const disabledHover = await style(button); assert.deepEqual(colors(disabledHover), disabledExpected); await shot(`${id}-disabled-hover`);
    await page.mouse.click(box.x + box.width/2, box.y + box.height/2); await sleep(100);
    assert.equal(await page.locator('[data-preview="counts"]').textContent(), counts);
    if (id.endsWith('copy')) {
      assert.equal(evidence.requests.length, requestCount + 1);
      assert.match(await button.getAttribute('aria-label'), /^Stopping /);
      assert.match(await button.locator('svg').getAttribute('class'), /animate-pulse/);
      await page.emulateMedia({ reducedMotion: 'reduce' }); assert.equal(await button.locator('svg').evaluate(el => getComputedStyle(el).animationName), 'none'); await page.emulateMedia({ reducedMotion: 'no-preference' });
      release(); release = null; await waitFor(async () => !(await button.isDisabled()));
    } else {
      assert.equal(JSON.parse(await page.locator('[data-preview="root-actions"]').textContent()).length, rootCount + 1);
      await page.locator('[data-preview="reset"]').click();
    }
    await leave(); const afterRelease = await style(button); assert.deepEqual(colors(afterRelease), restExpected);
    evidence.states[id] = { rest, hover, leave: afterLeave, focus, pending, disabledHover, afterRelease, label: await button.getAttribute('aria-label') };
  }
  evidence.rootActions = JSON.parse(await page.locator('[data-preview="root-actions"]').textContent());
  assert.deepEqual(evidence.rootActions, [{ kind:'Agent', id:'agent-root' }, { kind:'Team', id:'team-root' }, { kind:'Org', id:'org-root' }]);
  assert.deepEqual(evidence.requests, [{ rootKind:'AGENT', rootRunId:'host-run', agentRunId:'writer-run' }, { rootKind:'AGENT', rootRunId:'host-run', teamRunId:'review-team' }]);
  assert.deepEqual(evidence.errors, []); evidence.result = 'PASS — implementation preview only';
} catch (error) { evidence.result = 'FAIL'; evidence.failure = error.stack; process.exitCode = 1; }
finally {
  if (browser) { await browser.close(); evidence.cleanup.browserClosed = true; }
  if (child && child.exitCode === null) { process.kill(-child.pid, 'SIGTERM'); await waitFor(async () => child.exitCode !== null || child.signalCode !== null); evidence.cleanup.nuxtStopped = true; }
  if (owned) { await fs.rm(installed); evidence.cleanup.routeRemoved = true; }
  if (evidence.home) { await fs.rm(evidence.home, { recursive:true, force:true }); evidence.cleanup.homeRemoved = true; }
  evidence.cleanup.portsReleased = true;
  for (const port of evidence.ports ?? []) { const s = net.createServer(); try { await new Promise((r,j) => s.once('error',j).listen(port,'127.0.0.1',r)); await new Promise(r => s.close(r)); } catch { evidence.cleanup.portsReleased = false; } }
  await new Promise(r => log.end(r)); await fs.writeFile(path.join(out,'result.json'), JSON.stringify(evidence,null,2)); console.log(JSON.stringify(evidence,null,2));
}

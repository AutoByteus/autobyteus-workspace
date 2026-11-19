#!/usr/bin/env node
/**
 * Renderer-only Team identity regression (restore-team-group-icon AC-001/002/003/005).
 * Prerequisites: pnpm --filter 'autobyteus^...' build; pnpm -C autobyteus-web exec nuxt prepare;
 * installed Chrome (or PLAYWRIGHT_CHROME_EXECUTABLE_PATH). Run builds/tests/dev serially.
 * Run: pnpm -C autobyteus-web test:e2e:team-group-icon --output-dir <fresh-dir>
 * Optional --ledger-file <existing-file> appends each case immediately.
 * Real components, Agent context/store, Org projector, browser and Iconify SVG; controlled
 * public Team row props/bootstrap HTTP. Not backend, paid-model, full-page/worker navigation,
 * physical mobile, Electron-shell or explicit-user-acceptance proof. Owns all temporary resources.
 */
import fs from 'node:fs/promises';
import { createWriteStream, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';
import net from 'node:net';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright-core';
import { routeTaskWorkerBoundaries } from './fixtures/task-worker-boundaries.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const web = path.resolve(here, '../..'), root = path.resolve(web, '..');
const arg = (name, fallback) => {
  const inline = process.argv.find(value => value.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index < 0 ? fallback : process.argv[index + 1];
};
const out = path.resolve(web, arg('output-dir', 'test-results/team-group-icon'));
const ledger = arg('ledger-file');
const installed = path.join(web, 'pages/api-e2e-team-group-icon.vue');
const executable = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
assert(executable, 'Chrome required; set PLAYWRIGHT_CHROME_EXECUTABLE_PATH');
assert(!existsSync(installed), 'Refusing to overwrite an existing probe route');
if (ledger) assert(existsSync(ledger), 'Initialize the ledger before execution');
await fs.mkdir(out, { recursive: false }); // refuse evidence overwrite
const evidence = { startedAt: new Date().toISOString(), layer: 'Renderer browser integration',
  source: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root }).toString().trim(),
  platform: `${process.platform}-${process.arch}`, node: process.version, cases: {}, events: [], cleanup: {} };
evidence.sourceFiles = {};
for (const relative of ['tests/e2e/team-group-icon-probe.mjs', 'tests/e2e/fixtures/team-group-icon.page.vue',
  'components/workspace/history/WorkspaceDelegatedRunRow.vue', 'components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue',
  'components/projects/ProjectTaskWorkers.vue', 'components/memory/CollaborationMemoryDetail.vue']) {
  evidence.sourceFiles[relative] = createHash('sha256').update(await fs.readFile(path.join(web, relative))).digest('hex');
}
await fs.writeFile(path.join(out, 'source.diff'), execFileSync('git', ['diff', '--', 'autobyteus-web', 'TESTING.md'], { cwd: root }));
const save = () => fs.writeFile(path.join(out, 'result.json'), JSON.stringify(evidence, null, 2));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const waitFor = async (fn, timeout = 120000) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { if (await fn()) return; await pause(100); }
  throw new Error('Readiness/cleanup timed out');
};
const freePort = async () => {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve)); return port;
};
const record = async (id, event, result, detail = '') => {
  if (ledger) await fs.appendFile(ledger, `\n- ${new Date().toISOString()} ${id} ${event}: ${result}. ${detail} Evidence: ${out}/result.json\n`);
};
const runCase = async (id, description, fn) => {
  await record(id, 'Started', 'N/A', description);
  const current = evidence.cases[id] = { description, startedAt: new Date().toISOString() };
  try { current.details = await fn(); current.result = 'Pass'; }
  catch (error) { current.result = 'Fail'; current.error = error.stack; throw error; }
  finally { await save(); await record(id, 'Completed', current.result, current.error?.split('\n')[0] || description); }
};
const errors = () => evidence.events.filter(event => ['pageerror', 'error', 'http-error'].includes(event.kind));
let browser, child, log, routeOwned = false;
try {
  await fs.copyFile(path.join(here, 'fixtures/team-group-icon.page.vue'), installed, 1); routeOwned = true;
  const port = await freePort(), backendPort = await freePort(); evidence.ports = { port, backendPort };
  log = createWriteStream(path.join(out, 'nuxt.log'));
  child = spawn(path.join(web, 'node_modules/.bin/nuxi'), ['dev', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: web, detached: true, env: { ...process.env, NUXT_TELEMETRY_DISABLED: '1', BACKEND_NODE_BASE_URL: `http://127.0.0.1:${backendPort}` },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.pipe(log); child.stderr.pipe(log); evidence.nuxtPid = child.pid;
  child.on('error', error => { evidence.spawnError = error.message; });
  const url = `http://127.0.0.1:${port}/api-e2e-team-group-icon`;
  await waitFor(async () => {
    if (evidence.spawnError || child.exitCode !== null) throw new Error(evidence.spawnError || 'Nuxt exited before ready');
    try { return (await fetch(url)).ok; } catch { return false; }
  });
  browser = await chromium.launch({ headless: true, executablePath: executable });
  evidence.browser = browser.version();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 }, locale: 'en-US' });
  // app.vue opens the node's agent-package definition change feed on every page; the fixture has no backend.
  await page.routeWebSocket(/\/ws\/agent-package-definitions(\?|$)/, (ws) => ws.send(JSON.stringify({ type: 'connected' })));
  page.on('response', response => { if (response.status() >= 400) evidence.events.push({ kind: 'http-error', status: response.status(), url: response.url() }); });
  page.on('pageerror', error => evidence.events.push({ kind: 'pageerror', text: error.message }));
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) evidence.events.push({ kind: message.type(), text: message.text() }); });
  await page.route('**/rest/health', route => route.fulfill({ contentType: 'application/json', body: '{"status":"ok"}' }));
  await page.route('**/graphql', route => {
    const query = route.request().postDataJSON()?.query ?? '';
    // autobyteus-461 SR-084: the fixture seeds its run trees in the store (as the server's rows); a read of a tree is left
    // unanswered so it neither fails nor replaces them.
    if (query.includes('runTree(')) return undefined;
    const data = query.includes('serverSettings') ? { serverSettings: [] } : query.includes('agentDefinitions') ? { agentDefinitions: [] }
      : query.includes('agentTeamDefinitions') ? { agentTeamDefinitions: [] } : query.includes('workspaces') ? { workspaces: [] } : null;
    // autobyteus-461 rule 2: opening a row opens its run (its own reads); the fixture has no backend, so a read it does not
    // know is left unanswered rather than answered empty (an empty answer is an error to the client).
    if (data === null) return undefined;
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data }) });
  });
  // delegated-copy-task-locator: Task-worker rows read their Task and retain the Projects feed.
  await routeTaskWorkerBoundaries(page);
  // The definitions change feed the Workspaces shell opens; the fixture has no backend (baseline fix).
  await page.routeWebSocket(/\/ws\/agent-package-definitions(\?|$)/, (ws) => ws.send(JSON.stringify({ type: 'connected' })));
  // The window also opens the update-notifications stream (base) and holds the shown runs' statuses on /ws/run-status
  // (autobyteus-461 SR-082); the fixture has no backend.
  await page.routeWebSocket(/\/ws\/update-notifications(\?|$)/, () => undefined);
  await page.routeWebSocket(/\/ws\/run-status(\?|$)/, () => undefined);
  await page.goto(url);
  await page.locator('[data-preview="team-icons"]').waitFor();
  await page.locator('[data-team-icon="temporary-task-team"] svg').first().waitFor();
  await pause(3000); // let cold Vite dependency reload settle before interactions
  const referenceUrl = 'https://api.iconify.design/heroicons.json?icons=user-group-20-solid';
  const reference = await (await fetch(referenceUrl)).json();
  const body = reference.icons?.['user-group-20-solid']?.body;
  assert(body, 'Actual reference icon data required; no Icon stub/injection');
  await fs.writeFile(path.join(out, 'reference-icon.json'), JSON.stringify({ url: referenceUrl, ...reference }, null, 2));
  const checkIcons = async (selector, sizes) => {
    const icons = page.locator(selector);
    try { await waitFor(async () => await icons.count() === sizes.length, 10000); }
    catch { assert.equal(await icons.count(), sizes.length, `SVG count for ${selector}`); }
    const actual = await icons.evaluateAll((elements, svgBody) => {
      const paths = el => [...el.querySelectorAll('path')].map(p => p.getAttribute('d'));
      const expected = paths(new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${svgBody}</svg>`, 'image/svg+xml'));
      return elements.map(el => ({ expected, paths: paths(el), width: el.getBoundingClientRect().width,
        height: el.getBoundingClientRect().height, color: getComputedStyle(el).color }));
    }, body);
    actual.forEach((icon, index) => {
      assert(icon.expected.length > 0); assert.deepEqual(icon.paths, icon.expected, `Wrong Team shape: ${selector} #${index}`);
      assert.equal(icon.width, sizes[index]); assert.equal(icon.height, sizes[index]);
    });
    return actual;
  };
  await runCase('B01', 'Shared + Agent/Team parent icons, pointer/keyboard/disclosure/focus at normal/constrained widths', async () => {
    const widths = [];
    for (const width of [1440, 768]) {
      await page.setViewportSize({ width, height: 1200 });
      widths.push({ width, shared: await checkIcons('[data-preview="transient"] [data-team-icon] svg', [16,16,16]),
        agent: await checkIcons('[data-preview="agent-parent"] [data-team-icon] svg', [16,16]),
        team: await checkIcons('[data-preview="team-parent"] [data-team-icon] svg', [16,16]) });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: path.join(out, `icons-${width}.png`), fullPage: true });
    }
    // autobyteus-461 CR-461-108: opening a row reveals what it opens. A click, Enter or Space opens a Team row and leaves it
    // expanded (it never folds on open); only its chevron folds it.
    const chevron = (locator) => locator.locator('[data-test="workspace-team-transient-disclosure"]');
    const row = page.locator('[data-preview="transient"] [role="treeitem"]').first();
    await row.click(); assert.equal(await row.getAttribute('aria-expanded'), 'true');
    await chevron(row).click(); assert.equal(await row.getAttribute('aria-expanded'), 'false');
    await row.focus(); await page.keyboard.press('Enter'); assert.equal(await row.getAttribute('aria-expanded'), 'true');
    await page.keyboard.press('Space'); assert.equal(await row.getAttribute('aria-expanded'), 'true');
    assert.equal(await row.getAttribute('aria-selected'), 'true'); assert(await row.evaluate(el => el === document.activeElement));
    const agentTeams = page.locator('[data-preview="agent-parent"] [data-node-kind="agent_team"]');
    for (const index of [0, 1]) {
      const team = agentTeams.nth(index);
      await team.click(); assert.equal(await team.getAttribute('aria-expanded'), 'true');
      // A delegated Team opens at its coordinator: the one selected (current) row is an agent row inside this Team's rows.
      const placement = await page.locator('[data-preview="agent-parent"] [role="treeitem"]').evaluateAll((els, teamIndex) => {
        const teams = els.map((el, at) => el.getAttribute('data-node-kind') === 'agent_team' ? at : -1).filter((at) => at >= 0);
        const selected = els.map((el, at) => el.getAttribute('aria-selected') === 'true' ? at : -1).filter((at) => at >= 0);
        const from = teams[teamIndex], to = teams[teamIndex + 1] ?? els.length;
        return { selected, from, to, selectedKind: selected.map((at) => els[at].getAttribute('data-node-kind')), current: selected.map((at) => els[at].getAttribute('aria-current')) };
      }, index);
      assert(placement.selected.length === 1 && placement.selected[0] > placement.from && placement.selected[0] < placement.to
        && placement.selectedKind[0] === 'agent' && placement.current[0] === 'true', `Team ${index}: the opened Team marks its coordinator ${JSON.stringify(placement)}`);
      await chevron(team).click(); assert.equal(await team.getAttribute('aria-expanded'), 'false');
      await team.focus(); await page.keyboard.press('Enter'); assert.equal(await team.getAttribute('aria-expanded'), 'true');
      assert(await team.evaluate(el => el === document.activeElement));
    }
    const teamCopy = page.locator('[data-preview="team-parent"] [role="treeitem"][data-member-address="/preview_0"]');
    await teamCopy.click(); assert.equal(await teamCopy.getAttribute('aria-expanded'), 'true');
    await chevron(teamCopy).click(); assert.equal(await teamCopy.getAttribute('aria-expanded'), 'false');
    await teamCopy.focus(); await page.keyboard.press('Space'); assert.equal(await teamCopy.getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator('[data-preview="team-selection"]').innerText(), 'preview-0');
    assert.equal(await page.locator('[data-preview="transient"] [data-member-address="/preview_2"]').getAttribute('aria-expanded'), null);
    assert.equal(await page.locator('[data-preview="transient"] [data-node-kind="agent"] [data-team-icon]').count(), 0);
    await page.screenshot({ path: path.join(out, 'focused-team.png'), fullPage: true });
    assert.deepEqual(errors(), []); return widths;
  });
  await runCase('B02', 'Org configured/collaborator/delegated group and exact disclosure/inspect intent', async () => {
    // autobyteus-461 FU-031: an Org's delegated Team rows are the shared row (its people-group icon in `[data-team-icon]`); the
    // Org's own mounted Team keeps its row.
    const ORG_TASK_TEAMS = '[data-preview="org"] [data-test="workspace-team-transient-execution-row"][data-delegated-run-kind="task_team"]';
    const icons = await checkIcons(`${ORG_TASK_TEAMS} [data-team-icon] svg, [data-test="agent-org-team-row-team-configured"] > svg.h-4.w-4`, [16,16,16]);
    // CR-461-108: opening the delegated Team row reveals it (expanded, never folded on open); its chevron folds it.
    const org = page.locator(ORG_TASK_TEAMS).first();
    await org.click(); assert.equal(await org.getAttribute('aria-expanded'), 'true');
    await org.locator('[data-test="workspace-team-transient-disclosure"]').click(); assert.equal(await org.getAttribute('aria-expanded'), 'false');
    await org.focus(); await page.keyboard.press('Enter'); assert.equal(await org.getAttribute('aria-expanded'), 'true');
    assert.deepEqual(errors(), []); return { icons };
  });
  await runCase('B03', 'Task Team compact/detail/live/closed/failed glyphs; Agent and disabled semantics', async () => {
    const icons = await checkIcons('[data-preview="workers"] [aria-hidden="true"] > svg', [14,16,14,16]);
    assert.equal(await page.locator('[data-preview="worker-row"] button[data-openable="true"]').count(), 1);
    assert.equal(await page.locator('[data-preview="worker-detail"] button[data-openable="true"]').count(), 1);
    for (const state of ['closed','failed']) {
      const panel = page.locator(`[data-preview="worker-${state}"]`);
      assert.equal(await panel.locator('button').count(), 0);
      assert.equal(await panel.locator('[tabindex]').count(), 0);
      assert.equal(await panel.locator('[data-openable="false"]').count(), 1);
    }
    assert.match(await page.locator('[data-preview="workers"]').innerText(), /RW/);
    assert.match(await page.locator('[data-preview="worker-failed"]').innerText(), /No model configured/);
    assert.deepEqual(errors(), []); return { icons, navigation: 'Intent covered by component spec; full worker navigation not run' };
  });
  await runCase('B04', 'Memory configured/task/delegated group paths, role boxes and inspect-member', async () => {
    const icons = await checkIcons('[data-test="memory-member-group-header"] svg', [16,12,12]);
    assert.equal(await page.locator('[data-test="memory-member-group-header"] .border-dashed').count(), 2);
    await page.locator('[data-preview="memory"] article button').last().click();
    assert.match(await page.locator('[data-preview="team-icons"] > p').innerText(), /inspections=3/);
    assert.deepEqual(errors(), []); return { icons };
  });
  evidence.result = 'Pass';
} catch (error) { evidence.result = 'Fail'; evidence.error = error.stack; process.exitCode = 1; }
finally {
  const cleanup = async (name, fn) => {
    try { evidence.cleanup[name] = await fn(); }
    catch (error) { evidence.cleanup[name] = { error: error.message }; evidence.result = 'Fail'; process.exitCode = 1; }
  };
  await cleanup('browserClosed', async () => { if (browser) await browser.close(); return true; });
  await cleanup('nuxtExited', async () => {
    if (!child?.pid) return 'not-started';
    const exited = () => child.exitCode !== null || child.signalCode !== null;
    if (!exited()) {
      process.kill(-child.pid, 'SIGTERM');
      try { await waitFor(exited, 10000); } catch { process.kill(-child.pid, 'SIGKILL'); await waitFor(exited, 5000); }
    }
    return { pid: child.pid, exitCode: child.exitCode, signal: child.signalCode };
  });
  await cleanup('routeRemoved', async () => { if (routeOwned) await fs.rm(installed); return !routeOwned || !existsSync(installed); });
  await cleanup('portsReleased', async () => {
    for (const port of Object.values(evidence.ports || {})) {
      const server = net.createServer();
      await new Promise((resolve, reject) => server.once('error', reject).listen(port, '127.0.0.1', resolve));
      await new Promise(resolve => server.close(resolve));
    }
    return true;
  });
  if (log) await new Promise(resolve => log.end(resolve));
  evidence.finishedAt = new Date().toISOString(); await save();
  console.log(JSON.stringify({ result: evidence.result, error: evidence.error, cases: evidence.cases, cleanup: evidence.cleanup }, null, 2));
}

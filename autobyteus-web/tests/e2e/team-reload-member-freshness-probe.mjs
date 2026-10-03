#!/usr/bin/env node
// Real product regression: completed local source edit -> Team Reload -> member inspection.
// Prerequisites: installed workspace dependencies, graphical macOS/Linux, isolated-launch support.
// Builds this worktree by default. --skip-build reuses ONLY its current packaged artifact.
// Owns all instances/data/fixtures it creates; never attaches to an existing/user app.
// Usage: pnpm test:e2e:team-reload-member-freshness [--skip-build] [--output-dir <dir>]
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright-core');
const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i < 0 ? fallback : process.argv[i + 1];
};
const output = path.resolve(webRoot, arg('output-dir', 'test-results/team-reload-member-freshness'));
await fs.mkdir(output, { recursive: true });
const evidencePath = path.join(output, 'evidence.json');
const ledgerFile = arg('ledger-file');
const ledger = async (id, event, result) => {
  if (ledgerFile) await fs.appendFile(path.resolve(ledgerFile), `\n- ${new Date().toISOString()} ${id} ${event}: ${result}; ${evidencePath}.\n`);
};
const evidence = { startedAt: new Date().toISOString(), platform: `${process.platform}-${process.arch}`,
  cases: {}, requests: [], responses: [], consoleErrors: [], pageErrors: [], cleanup: {} };
const save = () => fs.writeFile(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const wait = async (description, callback) => {
  const until = Date.now() + 30000;
  while (Date.now() < until) { if (await callback()) return; await delay(100); }
  throw new Error(`Timeout: ${description}`);
};
async function cli(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(webRoot, 'scripts/isolated-app/cli.mjs'), ...args],
      { cwd: webRoot, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', value => { stdout += value; });
    child.stderr.on('data', value => { stderr += value; });
    child.once('error', reject);
    child.once('close', async code => {
      try {
        await fs.writeFile(path.join(output, `${args[0]}.log`), stderr);
        const payload = JSON.parse(stdout);
        await fs.writeFile(path.join(output, `${args[0]}.json`), JSON.stringify(payload, null, 2));
        assert.equal(code, 0, JSON.stringify(payload)); assert.equal(payload.ok, true);
        resolve(payload.result);
      } catch (error) { reject(error); }
    });
  });
}
async function run(id, title, action) {
  const record = evidence.cases[id] = { title, startedAt: new Date().toISOString(), result: 'Started' };
  await save(); await ledger(id, 'Started', title);
  try { record.details = await action(); record.result = 'Pass'; }
  catch (error) { record.result = 'Fail'; record.error = error.stack; throw error; }
  finally { record.finishedAt = new Date().toISOString(); await save(); await ledger(id, 'Completed', record.result); }
}
const teamId = 'reload-proof-team';
const localId = `team-local-agent:${teamId}:worker`;
const sharedId = 'reload-proof-shared';
const teamName = 'Reload Proof Team';
const tools = version => version === 1 ? ['read_file', 'write_file', 'run_bash']
  : version === 2 ? ['read_file', 'write_file'] : version === 3 ? ['read_file'] : ['write_file'];
let fixture, instance, browser, page;
const pendingResponses = new Set();
let releaseRead, heldRead;
const memberRoutes = {};
async function writeVersion(version) {
  const write = async (relative, value) => {
    const filename = path.join(fixture, relative);
    await fs.mkdir(path.dirname(filename), { recursive: true }); await fs.writeFile(filename, value);
  };
  for (const [base, name, marker] of [
    [`agent-teams/${teamId}/agents/worker`, 'Reload Proof Worker', 'Worker'],
    [`agents/${sharedId}`, 'Reload Proof Shared', 'Shared'],
  ]) {
    await write(`${base}/agent.md`, `---\nname: ${name}\ndescription: ${marker} description v${version}.\ncategory: test\n---\n\n${marker} instructions v${version}.\n`);
    await write(`${base}/agent-config.json`, JSON.stringify({ toolNames: tools(version), skillNames: [] }, null, 2));
  }
  await write(`agent-teams/${teamId}/team.md`, `---\nname: ${teamName}\ndescription: Team description v${version}.\ncategory: test\n---\n\nTeam instructions v${version}.\n`);
  await write(`agent-teams/${teamId}/team-config.json`, JSON.stringify({ coordinatorMemberName: 'worker',
    members: [{ memberName: 'worker', ref: 'worker', refType: 'agent', refScope: 'team_local' },
      { memberName: 'shared', ref: sharedId, refType: 'agent', refScope: 'shared' }], handoffs: [] }, null, 2));
}
async function sourceSnapshot() {
  const result = {};
  async function visit(dir) { for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const filename = path.join(dir, entry.name);
    if (entry.isDirectory()) await visit(filename);
    else result[path.relative(fixture, filename)] = await fs.readFile(filename, 'utf8');
  } }
  await visit(fixture); return result;
}
async function snap(name) {
  const text = await page.locator('body').innerText();
  await fs.writeFile(path.join(output, `${name}.txt`), text);
  await page.screenshot({ path: path.join(output, `${name}.png`) });
  return { url: page.url(), text };
}
async function openTeam(version) {
  await page.locator('#team-search').fill(teamName);
  await page.getByRole('button', { name: /View Details/ }).click();
  await wait('current Team instruction', async () => (await page.locator('[data-test="instruction-viewport"]').innerText()).trim() === `Team instructions v${version}.`);
  assert((await page.locator('body').innerText()).includes(`Team description v${version}.`));
  const url = new URL(page.url().split('#')[1], 'http://local');
  assert.equal(url.searchParams.get('id'), teamId);
}
async function inspectMember(member, version) {
  const row = page.locator('article').filter({ has: page.locator('p').filter({ hasText: new RegExp(`^${member}$`) }) });
  await row.locator('[data-test="agent-member-view"]').click();
  const marker = member === 'worker' ? 'Worker' : 'Shared';
  const id = member === 'worker' ? localId : sharedId;
  await wait('current member instructions', async () => (await page.locator('[data-test="instruction-viewport"]').innerText()).trim() === `${marker} instructions v${version}.`);
  const text = await page.locator('body').innerText();
  assert(text.includes(`${marker} description v${version}.`));
  const list = page.locator('section > div').filter({ has: page.getByRole('heading', { name: 'Tools', exact: true }) });
  assert.deepEqual(await list.locator('li').allTextContents(), tools(version));
  const url = new URL(page.url().split('#')[1], 'http://local');
  assert.equal(url.searchParams.get('id'), id); assert.equal(url.searchParams.get('returnToTeam'), teamId);
  if (memberRoutes[member]) assert.equal(page.url(), memberRoutes[member]);
  memberRoutes[member] = page.url();
  if (member === 'worker') { assert(text.includes('Team-local')); assert.equal(await page.getByRole('button', { name: 'Delete', exact: true }).count(), 0); }
  await snap(`${member}-v${version}`);
  await page.getByRole('button', { name: 'Back to team', exact: true }).click();
}
async function inspectVersion(version) {
  await openTeam(version); await snap(`team-v${version}`);
  await inspectMember('worker', version); await inspectMember('shared', version);
  await page.getByRole('button', { name: 'Back to Agent Teams', exact: true }).click();
}
const catalogOps = requests => requests.filter(name => /(?:AgentDefinitions|AgentTeamDefinitions|DefinitionCatalog)$/.test(name));
async function reload() {
  const start = evidence.requests.length;
  const before = await sourceSnapshot();
  await page.getByRole('button', { name: 'Reload', exact: true }).click();
  await wait('Reload finished', async () => await page.getByRole('button', { name: 'Reload', exact: true }).isEnabled());
  const ops = catalogOps(evidence.requests.slice(start).map(request => request.operationName));
  assert.deepEqual(ops, ['RefreshAgentTeamDefinitionCatalog', 'GetAgentDefinitions', 'GetAgentTeamDefinitions']);
  assert.deepEqual(await sourceSnapshot(), before, 'Reload rewrote package sources');
  return ops;
}
try {
  await run('E-001', 'owned current-worktree packaged instance', async () => {
    fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-team-reload-proof-'));
    evidence.fixture = fixture; await writeVersion(1);
    instance = await cli(['start', process.argv.includes('--skip-build') ? '--from-worktree' : '--build']);
    evidence.instance = instance; await save();
    assert.equal(new URL(instance.backendUrl).hostname, '127.0.0.1');
    browser = await chromium.connectOverCDP(instance.controlEndpoint);
    evidence.browserVersion = browser.version(); evidence.nodeVersion = process.version;
    const pages = browser.contexts().flatMap(context => context.pages());
    page = pages.find(candidate => candidate.url().includes('/renderer/index.html'));
    assert(page?.url().startsWith('file:'), 'Expected packaged renderer, not browser dev surface');
    assert(page, 'Owned main renderer unavailable'); page.setDefaultTimeout(30000);
    page.on('request', request => {
      if (request.url() === instance.graphqlUrl) {
        const body = request.postDataJSON(); evidence.requests.push({ operationName: body?.operationName,
          query: body?.query, timestamp: new Date().toISOString() });
      }
    });
    page.on('response', response => {
      if (response.url() !== instance.graphqlUrl) return;
      const task = response.json().then(body => evidence.responses.push({
        operationName: response.request().postDataJSON()?.operationName, status: response.status(), body,
      })).catch(() => {}).finally(() => pendingResponses.delete(task));
      pendingResponses.add(task);
    });
    page.on('pageerror', error => evidence.pageErrors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') evidence.consoleErrors.push(message.text()); });
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByTestId('settings-nav-agent-packages').click();
    await page.getByTestId('agent-package-source-input').fill(fixture);
    await page.getByTestId('agent-package-import-button').click();
    await page.getByTestId('agent-packages-success').waitFor();
    await snap('import');
    // Normal new renderer session, then genuine first Team/member discovery.
    await page.reload();
    return { instanceId: instance.instanceId, sourceFixture: fixture };
  });
  await run('E-002', 'first discovery with empty renderer catalogs', async () => {
    await page.getByTestId('settings-nav-back').click();
    await page.getByRole('button', { name: 'Agent Teams', exact: true }).click();
    await page.locator('#team-search').waitFor();
    await inspectVersion(1); return { memberRoutes: { ...memberRoutes } };
  });
  for (const version of [2, 3]) await run(version === 2 ? 'E-003' : 'E-004', `completed edit v${version}; Team Reload only; scoped/shared views`, async () => {
    await writeVersion(version); const operations = await reload(); await inspectVersion(version);
    return { version, operations, memberRoutes: { ...memberRoutes } };
  });
  await run('E-005', 'required Agent HTTP read failure; existing error and same-button retry', async () => {
    await writeVersion(4);
    const before = await sourceSnapshot();
    let injected = false;
    heldRead = new Promise(resolve => { releaseRead = resolve; });
    const handler = async route => {
      if (!injected && route.request().postDataJSON()?.operationName === 'GetAgentDefinitions') {
        injected = true; await heldRead;
        await route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ errors: [{ message: 'E2E required member read unavailable' }] }) });
      } else await route.continue();
    };
    await page.route(instance.graphqlUrl, handler);
    const start = evidence.requests.length;
    await page.getByRole('button', { name: 'Reload', exact: true }).click();
    await wait('required Agent read pending', async () => injected);
    assert(await page.getByRole('button', { name: /Reloading/ }).isDisabled());
    await snap('pending-read'); releaseRead();
    await page.getByText('E2E required member read unavailable', { exact: true }).waitFor();
    assert(await page.getByRole('button', { name: 'Reload', exact: true }).isEnabled());
    assert.deepEqual(catalogOps(evidence.requests.slice(start).map(request => request.operationName)),
      ['RefreshAgentTeamDefinitionCatalog', 'GetAgentDefinitions']);
    await snap('read-error'); await page.unroute(instance.graphqlUrl, handler);
    const operations = await reload();
    assert.equal(await page.getByText('E2E required member read unavailable', { exact: true }).count(), 0);
    await inspectVersion(4);
    assert.deepEqual(await sourceSnapshot(), before, 'Failure/retry rewrote package sources');
    return { injected, retryOperations: operations, recoveredVersion: 4 };
  });
  await run('E-006', 'API identity/scope and source-preservation checks', async () => {
    await Promise.all([...pendingResponses]);
    const reads = evidence.responses.filter(response => response.operationName === 'GetAgentDefinitions' && response.body.data);
    assert(reads.length > 0, 'No real successful Agent HTTP responses');
    const agents = reads.at(-1).body.data.agentDefinitions;
    const local = agents.find(agent => agent.id === localId); const shared = agents.find(agent => agent.id === sharedId);
    assert.equal(local.ownershipScope, 'TEAM_LOCAL'); assert.equal(local.ownerTeamId, teamId);
    assert.equal(shared.ownershipScope, 'SHARED'); assert.equal(shared.ownerTeamId, null);
    assert.deepEqual(local.toolNames, tools(4)); assert.deepEqual(shared.toolNames, tools(4));
    assert.deepEqual(evidence.pageErrors, [], 'Unexpected renderer errors');
    assert.deepEqual(evidence.consoleErrors.filter(message => !message.includes('E2E required member read unavailable')), [], 'Unexpected console errors');
    const sources = await sourceSnapshot(); await fs.writeFile(path.join(output, 'final-sources.json'), JSON.stringify(sources, null, 2));
    return { local, shared, sourceFiles: Object.keys(sources), preservation: 'byte-identical before/after every successful Reload' };
  });
  evidence.result = 'Pass';
} catch (error) {
  evidence.result = 'Fail'; evidence.error = error.stack;
  if (page) await snap('failure').catch(() => {});
} finally {
  releaseRead?.();
  try {
    await run('E-007', 'owned process/port/data/fixture cleanup', async () => {
    if (instance) {
      await fs.copyFile(instance.logPath, path.join(output, 'app.log')).catch(error => { evidence.cleanup.logCopyError = error.message; });
      evidence.cleanup.stop = await cli(['stop', instance.instanceId]);
      assert.equal(evidence.cleanup.stop.dataRootRemoved, true);
      assert.equal(evidence.cleanup.stop.controlPortReleased, true);
      assert.equal(evidence.cleanup.stop.serverPortReleased, true);
      evidence.cleanup.list = await cli(['list']);
      assert(!evidence.cleanup.list.instances.some(record => record.instanceId === instance.instanceId), 'Owned instance remains recorded');
    }
    if (fixture) { await fs.rm(fixture, { recursive: true, force: true }); evidence.cleanup.fixtureRemoved = true; }
    return evidence.cleanup;
    });
  } catch (error) { evidence.result = 'Fail'; evidence.cleanup.error = error.stack; }
  // Do not browser.close(): the lifecycle CLI alone owns process shutdown.
  evidence.finishedAt = new Date().toISOString(); await save();
}
console.log(`${evidence.result}: ${evidencePath}`);
if (evidence.result !== 'Pass') process.exitCode = 1;

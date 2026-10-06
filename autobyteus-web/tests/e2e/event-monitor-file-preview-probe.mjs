#!/usr/bin/env node
// Current-worktree packaged Electron regression; graphical macOS/Linux + pnpm dependencies.
// Builds by default. --skip-build requires this worktree's source-current packaged artifact.
// Saved Org/member GraphQL projections and initial metadata failure are controlled; later
// metadata HTTP, real Markdown action/lazy monitor/shell/Files, preload/main/bytes are real.
// No model/credentials/user app/data. Device metrics cases are renderer emulation, NOT OS resize.
// pnpm test:e2e:event-monitor-file-preview [--skip-build] [--output-dir <fresh-dir>] [--ledger-file <file>]
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core'), ts = require('typescript');
const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? fallback : process.argv[i + 1]; };
if (process.getuid?.() === 0) throw new Error('Permission-error case requires a non-root account');
const output = path.resolve(webRoot, arg('output-dir', 'test-results/event-monitor-file-preview'));
await fs.mkdir(output, { recursive: true });
const evidencePath = path.join(output, 'evidence.json'), ledgerFile = arg('ledger-file');
try { await fs.access(evidencePath); throw new Error(`Refusing existing evidence: ${evidencePath}`); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const evidence = { startedAt: new Date().toISOString(), platform: `${process.platform}-${process.arch}`,
  boundaries: 'GraphQL saved Org/member fixture + initial metadata failure; subsequent metadata/registration HTTP, native IPC/bytes, production renderer/shell real. Responsive device metrics explicitly emulated.',
  cases: {}, requests: [], pageErrors: [], cleanup: {} };
const save = () => fs.writeFile(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
const ledger = async (id, event) => { if (ledgerFile) await fs.appendFile(path.resolve(ledgerFile), `\n- ${new Date().toISOString()} ${id}: ${event}; ${evidencePath}.\n`); };
async function run(id, title, action) {
  const record = evidence.cases[id] = { title, result: 'Started' }; await save(); await ledger(id, 'Started');
  try { record.details = await action(); record.result = 'Pass'; }
  catch (error) {
    record.result = 'Fail'; record.error = error.stack;
    if (page && id !== 'N-008') {
      try { record.failureState = await state(); await screenshot(`failed-${id}`); }
      catch (observationError) { record.observationError = String(observationError); }
    }
    throw error;
  }
  finally { record.finishedAt = new Date().toISOString(); await save(); await ledger(id, record.result); }
}
async function cli(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(webRoot, 'scripts/isolated-app/cli.mjs'), ...args], { cwd: webRoot, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', value => { stdout += value; }); child.stderr.on('data', value => { stderr += value; });
    child.once('error', reject); child.once('close', async code => {
      try {
        await fs.writeFile(path.join(output, `${args[0]}.log`), stderr);
        const payload = JSON.parse(stdout); await fs.writeFile(path.join(output, `${args[0]}.json`), JSON.stringify(payload, null, 2) + '\n');
        assert.equal(code, 0, JSON.stringify(payload)); assert.equal(payload.ok, true); resolve(payload.result);
      } catch (error) { reject(error); }
    });
  });
}
let fixture, instance, browser, page, session, rootA, rootB, rootC;
let metadataEnabled = false, holdRoot = null;
const pendingMetadata = new Set();
const scope = `preview-${Date.now()}`;
const selectedId = 'agent-task-lead';
const markdown = '# NATIVE SELECTED B PROOF\n\nReal native file bytes; incidental read-only preview.\n';
let files;
const opOf = body => body.operationName || /(?:query|mutation)\s+(\w+)/.exec(body.query)?.[1];
const state = () => page.evaluate(() => {
  // Read-only evidence, never setup by mutating private stores.
  const pinia = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia;
  const target = pinia._s.get('activeContext')?.activeWorkspaceTarget, store = pinia._s.get('fileExplorer');
  const id = target?.context.config.workspaceId, viewer = document.querySelector('#contentViewer');
  const tab = document.querySelector('[data-event-monitor-active-file-tab="true"]');
  return { url: location.href, width: innerWidth, height: innerHeight,
    target: { runId: target?.context.state.runId, root: target?.workspaceRootPath, id, metadata: target?.context.config.workspaceMetadata },
    preview: id ? store.getActiveFileData(id) : null, files: id ? store.getOpenFiles(id) : [],
    visible: !!viewer && viewer.getBoundingClientRect().width > 0 && viewer.getBoundingClientRect().height > 0,
    text: viewer?.innerText, alert: viewer?.querySelector('[role="alert"]')?.innerText,
    drawer: !!document.querySelector('[data-test="workspace-right-tool-drawer"]'),
    dock: !!document.querySelector('[data-test="workspace-right-panel"]'),
    tabFocused: !!tab && document.activeElement === tab,
    focusText: document.activeElement?.textContent, hostOnly: document.body.innerText.includes('available only on the host workspace') };
});
const waitState = async predicate => {
  const until = Date.now() + 30000; let last;
  while (Date.now() < until) { last = await state(); if (predicate(last)) return last; await page.waitForTimeout(50); }
  throw new Error(`State timeout: ${JSON.stringify(last)}`);
};
const link = label => page.getByText(label, { exact: true });
const activate = async (label, options = {}) => {
  await link(label).click();
  const result = await waitState(s => s.visible && !s.preview?.isLoading && (options.error ? s.preview?.error === options.error : s.text?.includes(options.content || 'NATIVE SELECTED B PROOF')));
  assert.equal(result.target.runId, selectedId); assert.equal(result.hostOnly, false); assert.equal(result.preview.accessIntent.readOnly, true);
  if (options.error) { assert(result.alert); assert(!result.alert.includes('host workspace')); }
  else assert(result.tabFocused);
  return result;
};
const navigate = async (orgRunId, memberAddress = '/team/lead', agentRunId = selectedId) => {
  await page.evaluate(({ orgRunId, memberAddress, agentRunId }) => {
    location.hash = `/workspace?rootSubjectKind=agent_org&orgRunId=${orgRunId}&mode=history&memberAddress=${encodeURIComponent(memberAddress)}&agentRunId=${agentRunId}`;
  }, { orgRunId, memberAddress, agentRunId });
  return waitState(s => s.target.runId === agentRunId && s.url.includes(orgRunId));
};
async function screenshot(name) { await page.screenshot({ path: path.join(output, `${name}.png`) }); }
try {
  await run('N-001', 'owned packaged launch and passive selected missing metadata', async () => {
    fixture = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-file-preview-proof-'));
    rootA = path.join(fixture, 'A'); rootB = path.join(fixture, 'B'); rootC = path.join(fixture, 'C');
    for (const root of [rootA, rootB, rootC]) await fs.mkdir(root);
    files = Object.fromEntries(['brief', 'user', 'missing', 'directory', 'unreadable'].map(name => [name, path.join(rootB, `${name}.md`)]));
    await fs.writeFile(files.brief, markdown); await fs.writeFile(files.user, '# SECOND OWNED TAB\n'); await fs.mkdir(files.directory);
    await fs.writeFile(files.unreadable, 'PERMISSION SECRET MUST NOT LEAK'); await fs.chmod(files.unreadable, 0);
    await fs.writeFile(path.join(rootA, 'private.md'), 'OUTSIDE A SECRET MUST NOT LEAK');
    await fs.writeFile(path.join(rootC, 'brief.md'), '# C MUST NOT REVEAL\n');
    evidence.fixture = fixture;
    instance = await cli(['start', process.argv.includes('--skip-build') ? '--from-worktree' : '--build']); evidence.instance = instance;
    const appAsar = path.resolve(instance.executablePath, '../../Resources/app.asar');
    evidence.appAsarSha256 = createHash('sha256').update(await fs.readFile(appAsar)).digest('hex');
    browser = await chromium.connectOverCDP(instance.controlEndpoint);
    page = browser.contexts()[0].pages().find(p => p.url().includes('/renderer/index.html')); assert(page);
    evidence.engine = await browser.version(); page.on('pageerror', error => evidence.pageErrors.push(String(error)));
    session = await page.context().newCDPSession(page);
    const module = { exports: {} };
    const source = await fs.readFile(path.join(webRoot, 'services/agentOrgExecution/__tests__/taskBearingOrgFixture.ts'), 'utf8');
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module, exports: module.exports });
    await page.route('**/graphql', async route => {
      if (route.request().method() !== 'POST') return route.continue();
      const body = route.request().postDataJSON(), op = opOf(body), variables = body.variables || {};
      evidence.requests.push({ op, variables, metadataEnabled });
      let response;
      if (op === 'GetAgentOrgRunInspection') {
        const view = JSON.parse(JSON.stringify(module.exports.taskBearingView()));
        const root = view.execution_tree.rootOrg, id = variables.orgRunId;
        root.orgRunId = id; view.communication_messages.orgRunId = id; view.is_active = false; view.agent_statuses = [];
        root.members[0].launchConfiguration.workspaceRootPath = rootA;
        const selectedRoot = id === `${scope}-pending` ? rootC : rootB;
        root.members[2].defaultLaunchConfiguration.workspaceRootPath = selectedRoot;
        root.members[2].members.forEach(member => { member.launchConfiguration.workspaceRootPath = selectedRoot; });
        response = { data: { getAgentOrgRunInspection: { root_subject_kind: 'agent_org', root_run_id: id, root_org: view } } };
      }
      if (op === 'GetAgentOrgMemberRunProjection') {
        const pending = variables.orgRunId === `${scope}-pending`;
        response = { data: { getAgentOrgMemberRunProjection: { ...variables, summary: 'Owned member', lastActivityAt: '2026-10-06T18:00:00.000Z',
          conversation: variables.agentRunId === selectedId ? [{ kind: 'message', role: 'assistant', ts: 1791309600,
            content: pending ? `[Open pending](${path.join(rootC, 'brief.md')})` : Object.entries(files).map(([name, file]) => `[${{ brief: 'Open brief', user: 'Open user tab', missing: 'Missing file', directory: 'Directory file', unreadable: 'Unreadable file' }[name]}](${file})`).join('\n\n') }] : [],
          activities: [], hasEarlierActiveTraceEvents: false } } };
      }
      if (op === 'GetWorkspaceMetadata' && !metadataEnabled) response = { errors: [{ message: 'Controlled initial metadata unavailable' }], data: null };
      if (op === 'GetWorkspaceMetadata' && metadataEnabled && variables.rootPath === holdRoot) {
        let release; const held = new Promise(resolve => { release = resolve; });
        pendingMetadata.add(release); await held; pendingMetadata.delete(release);
      }
      if (op === 'GetRunFileChanges') response = { data: { getRunFileChanges: [] } };
      if (response) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) });
      return route.continue();
    });
    await navigate(scope); await link('Open brief').waitFor(); await page.waitForTimeout(300);
    const result = await state(); assert.equal(result.target.root, rootB); assert.equal(result.target.id, null); assert.equal(result.target.metadata, null);
    assert.equal(result.visible, false); assert.equal(result.files.length, 0); return result;
  });
  await run('N-002', 'one real file action recovers selected B and reveals native read-only content', async () => {
    metadataEnabled = true;
    const result = await activate('Open brief'); assert.equal(result.target.root, rootB); assert(result.target.id); assert.equal(result.drawer, true);
    assert(evidence.requests.some(r => r.op === 'GetWorkspaceMetadata' && r.variables.rootPath === rootB && r.metadataEnabled));
    await screenshot('first-native-activation'); return result;
  });
  await run('N-003', 'full metadata/reopen/dedupe/other tab/readOnly/focus', async () => {
    await page.keyboard.press('Meta+s'); await page.waitForTimeout(100);
    await page.keyboard.press('Escape'); let result = await waitState(s => !s.visible);
    assert(result.focusText?.includes('Open brief'));
    await page.keyboard.press('Enter'); await waitState(s => s.visible && s.tabFocused);
    await page.keyboard.press('Escape'); await activate('Open user tab', { content: 'SECOND OWNED TAB' });
    await page.keyboard.press('Escape'); result = await activate('Open brief');
    assert.equal(result.files.length, 2); assert.equal(new Set(result.files).size, 2);
    assert.equal(await page.locator('#contentViewer').getByRole('button', { name: /^(Edit|Save)$/ }).count(), 0);
    await screenshot('readonly-deduped'); return result;
  });
  await run('N-004', 'native missing/non-regular errors visible without strip click', async () => {
    const results = [];
    for (const [label, code] of [['Missing file', 'unavailable'], ['Directory file', 'not-regular-file'], ['Unreadable file', 'unreadable']]) {
      await page.keyboard.press('Escape'); results.push(await activate(label, { error: `local-file-preview:${code}` }));
      await screenshot(label.toLowerCase().replaceAll(' ', '-'));
      assert(!results.at(-1).text?.includes('PERMISSION SECRET MUST NOT LEAK'));
    } return results;
  });
  await run('N-005', 'emulated narrow/short drawer and fitting hidden-to-dock', async () => {
    const results = [];
    for (const [width, height, dock] of [[650, 700, false], [1440, 450, false], [1600, 900, true]]) {
      await page.keyboard.press('Escape');
      await session.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
      await waitState(s => s.width === width && s.height === height);
      if (dock) {
        await page.locator('[data-test="right-side-panel-toggle"]').click(); await waitState(s => !s.dock);
      }
      const result = await activate('Open brief'); assert.equal(result.dock, dock); assert.equal(result.drawer, !dock); results.push(result);
    }
    await screenshot('emulated-wide-redock'); await session.send('Emulation.clearDeviceMetricsOverride'); return results;
  });
  await run('N-009', 'real public workspace-relative content and out-of-root denial', async () => {
    const workspaceId = (await state()).target.id;
    const query = 'query GetFileContent($workspaceId: String!, $filePath: String!) { fileContent(workspaceId: $workspaceId, filePath: $filePath) }';
    const read = async filePath => {
      const response = await fetch(instance.graphqlUrl, { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ operationName: 'GetFileContent', query, variables: { workspaceId, filePath } }), signal: AbortSignal.timeout(10000) });
      assert.equal(response.status, 200); return response.json();
    };
    const inside = await read('brief.md'); assert.equal(inside.data?.fileContent, markdown); assert(!inside.errors);
    const outside = await read('../A/private.md');
    evidence.workspaceContentHttp = { workspaceId, inside, outside }; await save();
    // This current public query deliberately returns content-or-JSON-error strings.
    assert.match(JSON.parse(outside.data.fileContent).error, /Access denied: File is outside the workspace/);
    assert(!JSON.stringify(outside).includes('OUTSIDE A SECRET MUST NOT LEAK'));
    return { workspaceId, inside, outside };
  });
  await run('N-006', 'pending exact-source metadata cannot reveal after normal member navigation', async () => {
    metadataEnabled = false; await navigate(`${scope}-pending`); await link('Open pending').waitFor();
    const before = await state(); assert.equal(before.target.id, null);
    metadataEnabled = true; holdRoot = rootC; await link('Open pending').click();
    const until = Date.now() + 10000;
    while (!pendingMetadata.size && Date.now() < until) await page.waitForTimeout(50);
    assert(pendingMetadata.size > 0, 'No held metadata query from explicit activation');
    await navigate(`${scope}-pending`, '/director', 'agent-director');
    for (const release of pendingMetadata) release(); holdRoot = null;
    await page.waitForTimeout(500); const result = await state();
    assert.equal(result.target.runId, 'agent-director'); assert.equal(result.visible, false);
    assert(!result.text?.includes('C MUST NOT REVEAL')); return { before, after: result };
  });
  await run('N-007', 'no page errors/write requests/owned file mutations', async () => {
    assert.deepEqual(evidence.pageErrors, []);
    assert.equal(evidence.requests.filter(r => /WriteFile|SaveFile/i.test(r.op || '')).length, 0);
    assert.equal(await fs.readFile(files.brief, 'utf8'), markdown);
    assert.equal(await fs.readFile(files.user, 'utf8'), '# SECOND OWNED TAB\n');
    return { pageErrors: evidence.pageErrors, writeRequests: 0, bytesUnchanged: true };
  });
} catch (error) { evidence.failure = error.stack; process.exitCode = 1; }
finally {
  try {
    await run('N-008', 'owned resources cleaned and ports released', async () => {
      for (const release of pendingMetadata) release(); holdRoot = null;
      const errors = [];
      const attempt = async action => { try { await action(); } catch (error) { errors.push(error); } };
      await attempt(async () => { if (page) await page.unrouteAll({ behavior: 'wait' }); });
      await attempt(async () => { if (session) await session.detach(); });
      await attempt(async () => { if (browser) await browser.close(); });
      await attempt(async () => {
        if (!instance) return;
        const stop = await cli(['stop', instance.instanceId]); evidence.cleanup.stop = stop;
        assert.equal(stop.controlPortReleased, true); assert.equal(stop.serverPortReleased, true);
        assert.equal(stop.dataRootRemoved, true);
      });
      await attempt(async () => { if (fixture) { await fs.rm(fixture, { recursive: true, force: true }); evidence.cleanup.fixtureRemoved = true; } });
      await attempt(async () => {
        evidence.cleanup.instances = await cli(['list']);
        assert(!evidence.cleanup.instances.instances.some(entry => entry.instanceId === instance?.instanceId));
      });
      if (errors.length) throw new AggregateError(errors, 'Owned cleanup incomplete');
      return evidence.cleanup;
    });
  } catch (error) { evidence.cleanupError = error.stack; process.exitCode = 1; }
  evidence.finishedAt = new Date().toISOString(); await save();
}
console.log(JSON.stringify({ ok: !process.exitCode, evidence: evidencePath, cases: Object.fromEntries(Object.entries(evidence.cases).map(([id, record]) => [id, record.result])), cleanup: evidence.cleanup }));

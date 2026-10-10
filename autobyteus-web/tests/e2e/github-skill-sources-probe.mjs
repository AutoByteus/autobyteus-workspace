#!/usr/bin/env node
// Real web frontend + built backend + fresh Chrome. Only outbound GitHub is controlled.
// Run from repo root: node autobyteus-web/tests/e2e/github-skill-sources-probe.mjs <fresh-output-dir> [ledger]
// Prerequisites: normal server prebuild/build, installed workspace deps, Chrome. No Electron/provider credentials.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { existsSync, createWriteStream } from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const root = path.dirname(web), server = path.join(root, 'autobyteus-server-ts');
const { create: tar } = createRequire(path.join(server, 'package.json'))('tar');
const out = path.resolve(process.argv[2] || path.join(web, 'test-results/github-skill-sources'));
const ledger = process.argv[3];
assert(!existsSync(out), 'Use a fresh output directory');
await fs.mkdir(out, { recursive: true });
const evidence = { startedAt: new Date().toISOString(), cases: {}, requests: [], sockets: [], pageErrors: [], cleanup: {} };
const save = () => fs.writeFile(path.join(out, 'result.json'), JSON.stringify(evidence, null, 2) + '\n');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const wait = async (label, fn, ms = 30000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return; await sleep(100); } throw new Error('Timeout: ' + label); };
const freePort = () => new Promise(resolve => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });
const children = [];
const env = Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'LANG'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
let owned, backend, browser, page, backendUrl, stateFile;
const start = (cmd, args, cwd, extra, name) => {
  const log = createWriteStream(path.join(out, name + '.log'), { flags: 'a' });
  const child = spawn(cmd, args, { cwd, env: { ...env, ...extra }, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log); child.stderr.pipe(log); child.once('close', () => log.end()); children.push(child); return child;
};
const stop = async child => {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  process.kill(-child.pid, 'SIGTERM');
  await wait('owned process exit', () => child.exitCode !== null || child.signalCode !== null, 12000).catch(async () => {
    process.kill(-child.pid, 'SIGKILL'); await wait('owned killed process exit', () => child.exitCode !== null || child.signalCode !== null);
  });
};
const gql = async (query, variables = {}) => {
  const response = await fetch(backendUrl + '/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const body = await response.json(); assert.equal(response.status, 200); assert.equal(body.errors, undefined, JSON.stringify(body.errors)); return body.data;
};
const fields = 'sourceId path skillCount github { installedRevision latestRevision status }';
const source = async () => (await gql(`{skillSources {${fields}}}`)).skillSources.find(s => s.github);
const card = name => page.locator('.skill-card').filter({ has: page.getByText(name, { exact: true }) });
const row = () => page.locator('li[data-testid^="skill-source-row-"]').filter({ hasText: 'https://github.com/api-e2e/skills' });
const dialog = () => page.getByRole('dialog', { name: 'Manage Skill Sources' });
const sources = async () => { await page.getByRole('button', { name: 'Sources', exact: true }).click(); await dialog().waitFor(); await wait('source not busy', async () => !(await row().count()) || await row().getAttribute('aria-busy') === 'false'); };
const done = () => dialog().getByRole('button', { name: 'Done', exact: true }).click();
// The row's trash button is named after the source; the confirmation button keeps the plain action name.
const rowActionName = action => action === 'Remove' ? 'Remove api-e2e/skills' : action;
const confirm = async action => { await row().getByRole('button', { name: rowActionName(action), exact: true }).click();await page.getByRole('button', { name: action, exact: true }).last().click(); };
const record = async (id, fn) => {
  evidence.cases[id] = { result: 'Running' }; await save();
  try { evidence.cases[id].observed = await fn(); evidence.cases[id].result = 'Pass'; await page.screenshot({ path: path.join(out, id + '.png') }); }
  catch (e) { evidence.cases[id] = { result: 'Fail', error: e.stack, body: await page.locator('body').innerText().catch(() => '') }; await page.screenshot({ path: path.join(out, id + '-failure.png') }).catch(() => {}); throw e; }
  finally { await save(); if (ledger) await fs.appendFile(ledger, `\n- ${id}: ${evidence.cases[id].result}; ${path.join(out, 'result.json')}\n`); }
};
try {
  owned = await fs.mkdtemp(path.join(os.tmpdir(), 'github-skills-web-'));
  const data = path.join(owned, 'data'); await fs.mkdir(path.join(data, 'db'), { recursive: true });
  const port = await freePort(), webPort = await freePort(); backendUrl = `http://127.0.0.1:${port}`;
  const database = pathToFileURL(path.join(data, 'db', 'test.db')).href;
  const providerRecord = path.join(owned, 'provider.jsonl');
  await fs.mkdir(path.join(owned, 'home'));
  const backendEnv = { HOME: path.join(owned, 'home'), CODEX_APP_SERVER_COMMAND: process.execPath, CODEX_APP_SERVER_ARGS_JSON: JSON.stringify([path.join(web, 'tests/e2e/fixtures/skill-codex-app-server.mjs')]), SKILL_SOURCE_PROVIDER_RECORD: providerRecord, APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: database, AUTOBYTEUS_SERVER_HOST: backendUrl, AUTOBYTEUS_MEMORY_DIR: path.join(data, 'memory'), AUTOBYTEUS_LOG_DIR: path.join(data, 'logs'), AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(data, 'workspaces'), CODEX_HOME: path.join(owned, 'codex') };
  await fs.writeFile(path.join(data, '.env'), `APP_ENV=development\nDB_TYPE=sqlite\nDATABASE_URL=${database}\nAUTOBYTEUS_SERVER_HOST=${backendUrl}\n`);
  const migrate = start('pnpm', ['exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], server, backendEnv, 'migrate');
  await new Promise((resolve, reject) => { migrate.once('error', reject); migrate.once('close', code => code === 0 ? resolve() : reject(new Error('migration failed'))); });
  const archives = {};
  for (const version of [1, 2]) {
    const wrapper = path.join(owned, 'v' + version, 'wrapper');
    const addSkill = async (folder, name) => { await fs.mkdir(path.join(wrapper, folder), { recursive: true }); await fs.writeFile(path.join(wrapper, folder, 'SKILL.md'), `---\nname: ${name}\ndescription: Browser fixture version ${version}\n---\nBrowser version ${version}\n`); };
    await addSkill('writer', 'web-writer'); await addSkill(version === 1 ? 'removed' : 'added', version === 1 ? 'web-removed' : 'web-added');
    await fs.writeFile(path.join(wrapper, 'writer', `version-${version}.txt`), `Supporting file version ${version}`);
    archives[version] = path.join(owned, `v${version}.tar.gz`); await tar({ cwd: path.dirname(wrapper), file: archives[version], gzip: true, portable: true }, ['wrapper']);
  }
  stateFile = path.join(owned, 'control.json');
  const upstream = async (version, fail = false) => fs.writeFile(stateFile, JSON.stringify({ revision: (version === 1 ? 'a' : 'b').repeat(40), archive: archives[version], fail }));
  await upstream(1);
  const startBackend = async () => {
    backend = start(process.execPath, ['--import', path.join(web, 'tests/e2e/fixtures/github-skill-upstream.mjs'), path.join(server, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(port), '--data-dir', data], server, { ...backendEnv, SKILL_SOURCE_PROBE_CONTROL: stateFile }, 'backend');
    await wait('backend health', async () => { assert.equal(backend.exitCode, null); return fetch(backendUrl + '/rest/health').then(r => r.ok).catch(() => false); }, 120000);
  };
  await startBackend();
  const frontend = start('pnpm', ['exec', 'nuxt', 'dev', '--host', '127.0.0.1', '--port', String(webPort)], web, { NODE_ENV: 'development', BACKEND_NODE_BASE_URL: backendUrl }, 'frontend');
  const base = `http://127.0.0.1:${webPort}`;
  evidence.isolation = { owned, data, backendUrl, frontendUrl: base };
  await wait('Nuxt ready', async () => { assert.equal(frontend.exitCode, null); return fetch(base + '/skills').then(r => r.ok).catch(() => false); }, 240000);
  const executablePath = process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
  browser = await chromium.launch({ executablePath, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' });
  await context.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
  page = await context.newPage(); page.setDefaultTimeout(30000);
  page.on('pageerror', e => evidence.pageErrors.push(e.message));
  page.on('request', r => { if (r.url() === backendUrl + '/graphql') evidence.requests.push(r.postDataJSON()); });
  page.on('websocket', ws => { const item = { url: ws.url(), closed: false, connected: false }; evidence.sockets.push(item); ws.on('close', () => item.closed = true); ws.on('framereceived', f => { if (String(f.payload).includes('CONNECTED')) item.connected = true; }); });
  await gql('mutation { createSkill(input:{name:"local-untouched",description:"Local remains",content:"preserve local"}) {name} }');
  await page.goto(base + '/skills'); await page.getByRole('button', { name: 'Sources', exact: true }).waitFor();
  let old, runA, runB;
  const workspace = path.join(owned, 'chat-workspace'); await fs.mkdir(workspace);
  const sel = t => page.locator(`[data-test="${t}"]`);
  const providerRows = async () => existsSync(providerRecord) ? (await fs.readFile(providerRecord, 'utf8')).trim().split('\n').map(JSON.parse) : [];
  const sendChat = async marker => {
    await sel('chat-composer').locator('textarea').first().fill('Report the exposed skill version');
    await sel('chat-primary-action').first().click();
    await page.waitForURL(u => /\/chat\?id=/.test(u.toString()) && !u.searchParams.get('id').startsWith('temp-'), { timeout: 60000 });
    await page.getByText(marker, { exact: true }).first().waitFor();
    return new URL(page.url()).searchParams.get('id');
  };
  const resume = id => gql('query($id:String!){getAgentRunResumeConfig(runId:$id){isActive metadataConfig{workspaceRootPath runtimeKind}}}', { id });

  await record('WEB-001-import-explorer', async () => {
    await sources();
    await dialog().getByRole('textbox', { name: 'Add skill source' }).fill('https://github.com/api-e2e/skills');
    await dialog().getByRole('button', { name: 'Add', exact: true }).click(); await row().waitFor();
    await wait('imported', async () => (await source())?.skillCount === 2); old = await source(); await done();
    await card('web-writer').getByRole('button', { name: 'View', exact: true }).click();
    await page.locator('span:visible').filter({ hasText: /^version-1\.txt$/ }).waitFor();
    await wait('file socket connects', () => evidence.sockets.some(s => s.url.includes('skill_ws_web-writer') && s.connected));
    await page.locator('.btn-back').click();
    await wait('file socket closes', () => evidence.sockets.filter(s => s.url.includes('skill_ws_web-writer')).every(s => s.closed));
    return old;
  });
  await record('WEB-CHAT-A', async () => {
    await page.goto(base + '/chat'); await sel('chat-new').waitFor();
    await sel('chat-model-trigger').click(); await sel('chat-runtime-codex_app_server').click();
    await sel('chat-model-option-skill-fixture-model').click();
    await sel('chat-workspace-trigger').click(); await sel('chat-workspace-open-folder').click();
    const input = sel('chat-workspace-folder-form').locator('input'); await input.fill(workspace); await input.press('Enter');
    runA = await sendChat('SKILL_VERSION_ONE');
    assert.equal((await resume(runA)).getAgentRunResumeConfig.isActive, true);
    assert((await providerRows()).some(r => r.method === 'turn/start' && r.content?.includes('version 1')));
    await page.goto(base + '/skills'); await card('web-writer').waitFor(); return { runA, workspace };
  });
  await record('WEB-002-check-cancel', async () => {
    await fs.writeFile(path.join(old.path, 'writer', 'local-edit.txt'), 'keep until confirmed');
    await upstream(2); await sources();
    await wait('update available', async () => (await source()).github.status === 'UPDATE_AVAILABLE');
    assert.equal((await source()).path, old.path);
    await row().getByRole('button', { name: 'Update', exact: true }).click();
    assert.match(await page.locator('body').innerText(), /local edits/i);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.equal(await fs.readFile(path.join(old.path, 'writer', 'local-edit.txt'), 'utf8'), 'keep until confirmed');
    assert.equal((await source()).github.installedRevision, 'a'.repeat(40));
    const requests = (await fs.readFile(path.join(owned, 'upstream-requests.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
    assert.equal(requests.filter(r => r.url.includes('codeload')).length, 1, 'Check and cancel never download');
  });
  await record('WEB-003-failed-update-retains-install', async () => {
    await upstream(2, true); await confirm('Update');
    await dialog().getByRole('alert').filter({ hasText: 'Fixture GitHub temporarily unavailable' }).waitFor();
    assert.equal((await source()).path, old.path);
    assert.equal(await fs.readFile(path.join(old.path, 'writer', 'local-edit.txt'), 'utf8'), 'keep until confirmed');
    assert.match((await gql('{skills{name content}}')).skills.find(s => s.name === 'web-writer').content, /version 1/);
  });
  await record('WEB-004-retry-update-and-reopen', async () => {
    await upstream(2); await confirm('Update');
    await wait('updated revision', async () => (await source()).github.installedRevision === 'b'.repeat(40));
    const current = await source(); assert.notEqual(current.path, old.path); assert(!existsSync(old.path));
    assert(!existsSync(path.join(current.path, 'writer', 'local-edit.txt')));
    await done(); await card('web-added').waitFor(); assert.equal(await card('web-removed').count(), 0);
    await card('web-writer').getByRole('button', { name: 'View', exact: true }).click();
    await page.locator('span:visible').filter({ hasText: /^version-2\.txt$/ }).waitFor();
    await page.screenshot({ path: path.join(out, 'updated-skill-files.png') });
    assert.equal(await page.locator('span:visible').filter({ hasText: /^version-1\.txt$/ }).count(), 0);
    await wait('new explorer connection', () => evidence.sockets.filter(s => s.url.includes('skill_ws_web-writer') && s.connected).length >= 2);
    await page.locator('.btn-back').click(); return current;
  });
  await record('WEB-CHAT-B-header-plus-after-update', async () => {
    assert.equal((await resume(runA)).getAgentRunResumeConfig.isActive, true);
    await page.goto(base + '/chat?id=' + runA); await sel('workspace-header-new-run').click();
    await sel('chat-new').waitFor(); assert.match(await sel('chat-workspace-trigger').innerText(), /chat-workspace/);
    runB = await sendChat('SKILL_VERSION_TWO'); assert.notEqual(runB, runA);
    await page.screenshot({ path: path.join(out, 'updated-skill-new-chat.png') });
    assert.equal((await resume(runA)).getAgentRunResumeConfig.isActive, true);
    assert.equal((await resume(runB)).getAgentRunResumeConfig.metadataConfig.workspaceRootPath, workspace);
    assert((await providerRows()).some(r => r.method === 'turn/start' && r.content?.includes('version 2')));
    const link = path.join(workspace, '.codex', 'skills', 'web-writer');
    await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id: runA });
    assert.match(await fs.readFile(path.join(link, 'SKILL.md'), 'utf8'), /version 2/);
    await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id: runB });
    assert(!existsSync(link)); await page.goto(base + '/skills'); await card('web-writer').waitFor();
    return { runA, runB, workspace, provider: 'scripted external CLI; real Codex adapter and transport' };
  });
  await record('WEB-INTERRUPT-download-restart', async () => {
    const before = await source();
    await fs.writeFile(stateFile, JSON.stringify({ revision: 'c'.repeat(40), archive: archives[1], holdArchive: true }));
    const pending = gql('mutation($id:String!){updateGitHubSkillSource(sourceId:$id){sources{sourceId}}}', { id: before.sourceId }).catch(error => ({ interrupted: error.message }));
    await wait('third revision download entered', async () => (await fs.readFile(path.join(owned, 'upstream-requests.jsonl'), 'utf8')).includes('tar.gz/' + 'c'.repeat(40)));
    const killedPid = backend.pid; process.kill(-killedPid, 'SIGKILL');
    await wait('interrupted backend exits', () => backend.signalCode !== null);
    await upstream(2); await startBackend(); await pending;
    assert.equal((await source()).github.installedRevision, 'b'.repeat(40));
    assert.equal((await source()).path, before.path);
    assert.match((await gql('{skills{name content}}')).skills.find(s => s.name === 'web-writer').content, /version 2/);
    await page.reload(); await card('web-writer').waitFor(); return { killedPid, restartedPid: backend.pid, preservedPath: before.path };
  });
  await record('WEB-005-reload-restart-remove', async () => {
    const before = await source(); await stop(backend); await startBackend();
    await page.reload(); await card('web-writer').waitFor(); assert.deepEqual(await source(), before);
    await page.getByRole('button', { name: /Reload/ }).click(); await card('web-added').waitFor();
    await sources();
    // Real host permission failure, not mocked GraphQL: registry stays writable; owned source deletion cannot finish.
    const sourceDirectory = path.dirname(path.dirname(path.dirname(before.path)));
    await fs.chmod(sourceDirectory, 0o500);
    try {
      await confirm('Remove'); await row().getByRole('button', { name: 'Retry removal', exact: true }).waitFor();
      assert.equal((await source()).github.status, 'REMOVING');
      assert.equal((await gql('{skills{name}}')).skills.some(s => s.name === 'web-writer'), false);
    } finally { await fs.chmod(sourceDirectory, 0o700); }
    await stop(backend); await startBackend(); await page.reload(); await card('local-untouched').waitFor();
    await sources(); assert.equal((await source()).github.status, 'REMOVING');
    await row().getByRole('button', { name: 'Retry removal', exact: true }).click();
    await page.getByRole('button', { name: 'Remove', exact: true }).last().click();
    await row().waitFor({ state: 'detached' }); await done();
    assert.equal(await source(), undefined); assert(!existsSync(before.path));
    assert.equal(await card('web-writer').count(), 0); await card('local-untouched').waitFor();
    assert.equal((await gql('{skills{name content}}')).skills.find(s => s.name === 'local-untouched').content, 'preserve local');
  });
  assert.deepEqual(evidence.pageErrors, []); evidence.result = 'Pass';
} catch (e) { evidence.result = 'Fail'; evidence.error = e.stack; }
finally {
  if (browser) await browser.close(); evidence.cleanup.browserClosed = true;
  for (const child of children.toReversed()) await stop(child);
  evidence.cleanup.childrenStopped = children.every(c => c.exitCode !== null || c.signalCode !== null);
  const listening = address => new Promise(resolve => { const url = new URL(address); const socket = net.connect(Number(url.port), '127.0.0.1'); socket.once('connect', () => { socket.destroy(); resolve(true); }); socket.once('error', () => resolve(false)); });
  if (evidence.isolation) {
    evidence.cleanup.backendPortReleased = !(await listening(evidence.isolation.backendUrl));
    evidence.cleanup.frontendPortReleased = !(await listening(evidence.isolation.frontendUrl));
    if (!evidence.cleanup.backendPortReleased || !evidence.cleanup.frontendPortReleased) evidence.result = 'Fail';
  }
  if (owned) { const provider = path.join(owned, 'provider.jsonl'); if (existsSync(provider)) await fs.copyFile(provider, path.join(out, 'provider.jsonl')); const requests = path.join(owned, 'upstream-requests.jsonl'); if (existsSync(requests)) await fs.copyFile(requests, path.join(out, 'upstream-requests.jsonl')); await fs.rm(owned, { recursive: true }); }
  evidence.cleanup.dataRemoved = !owned || !existsSync(owned);
  evidence.finishedAt = new Date().toISOString(); await save(); console.log(JSON.stringify(evidence));
}
if (evidence.result !== 'Pass') process.exitCode = 1;

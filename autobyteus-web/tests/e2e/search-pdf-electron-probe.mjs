#!/usr/bin/env node
/**
 * SCN-001–003: full actual packaged Electron New chat -> workspace -> Files -> PDF.
 * Linux/macOS; installed workspace deps, Node22/pnpm10, graphical display and
 * Chromium sandbox capability required. Never run the Electron app as root.
 * pnpm -C autobyteus-web test:e2e:search-pdf-electron --output-dir <fresh>
 * [--skip-build] [--ledger-file <canonical>]
 * Default isolated-app start --build; --skip-build requires CURRENT worktree package.
 * Linux containers: build as the worktree owner; launch as an unprivileged UID under
 * an owned Xvfb display, with private HOME/TMPDIR/XDG_RUNTIME_DIR/XAUTHORITY.
 * Own fixtures/root/ports/instance; no providers, user files, fixture routes,
 * GraphQL mocks, private store setup or sandbox-disabling switches.
 * API-006 packaged launch; API-002 real HTTP bytes/security; API-003 actual UI;
 * API-007 restart/persisted registration and canonical stop/list cleanup.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const repo = path.dirname(web);
const arg = (name, fallback) => {
  const i = process.argv.indexOf('--' + name); return i < 0 ? fallback : process.argv[i + 1];
};
assert(['linux', 'darwin'].includes(process.platform), 'Isolated desktop supports Linux/macOS');
assert(process.getuid?.() !== 0, 'Electron must run as a non-root user; retain sandbox, do not use --no-sandbox');
const out = path.resolve(web, arg('output-dir', 'test-results/search-pdf-electron'));
await fs.mkdir(out, { recursive: true });
const evidenceFile = path.join(out, 'evidence.json'), ledger = arg('ledger-file');
assert(!existsSync(evidenceFile), 'Refusing previous evidence');
const ev = { startedAt: new Date().toISOString(), platform: process.platform + '-' + process.arch,
  node: process.version, uid: process.getuid?.(), display: process.env.DISPLAY,
  cases: {}, requests: [], browserErrors: [], cleanup: {} };
const save = () => fs.writeFile(evidenceFile, JSON.stringify(ev, null, 2) + '\n');
const event = async (id, message) => {
  console.log(id + ': ' + message);
  if (ledger) await fs.appendFile(ledger, '\n- ' + new Date().toISOString() + ' ' + id + ': ' + message + '; ' + evidenceFile + '.\n');
};
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(label, action, timeout = 60000) {
  let error;
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    try { if (await action()) return; } catch (value) { error = value; }
    await delay(100);
  }
  throw new Error('Timeout ' + label + ': ' + (error || 'condition not reached'));
}
const hash = value => createHash('sha256').update(value).digest('hex');
let fixture, instance, browser, page, id, agent;
const pdfPath = 'applications/nested/resume sample.pdf';
const textPath = 'resume-notes.md';
const text = '# ELECTRON SYNTHETIC RESUME NOTES\n\nReal packaged workspace reader.\n';
const sentinel = 'OUTSIDE-ELECTRON-SENTINEL-DO-NOT-RETURN';
const pdf = await fs.readFile(path.join(repo, 'test-support/file-explorer/resume-preview.pdf'));
const cleanEnv = () => Object.fromEntries(['PATH', 'HOME', 'TMPDIR', 'DISPLAY', 'XAUTHORITY', 'XDG_RUNTIME_DIR', 'LANG', 'TZ']
  .filter(key => process.env[key] !== undefined).map(key => [key, process.env[key]]));
async function cli(args) {
  const label = args[0] + '-' + Date.now();
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(web, 'scripts/isolated-app/cli.mjs'), ...args],
      { cwd: repo, env: cleanEnv(), stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', data => stdout += data); child.stderr.on('data', data => stderr += data);
    child.once('error', reject);
    child.once('close', async code => {
      try {
        await fs.writeFile(path.join(out, label + '.log'), stderr);
        await fs.writeFile(path.join(out, label + '.json'), stdout);
        const payload = JSON.parse(stdout);
        assert.equal(code, 0, stdout); assert.equal(payload.ok, true, stdout);
        resolve(payload.result);
      } catch (error) { reject(error); }
    });
  });
}
const gql = async (query, variables = {}) => {
  const response = await fetch(instance.graphqlUrl, { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200);
  const result = await response.json(); assert(!result.errors, JSON.stringify(result.errors));
  return result.data;
};
const content = locator => fetch(instance.backendUrl + '/rest/workspaces/' + id + '/content?' + new URLSearchParams({ path: locator }));
const test = name => page.locator('[data-test="' + name + '"]');
const state = () => page.evaluate(workspaceId => {
  // Read-only observations. All setup/actions use real public API or actual UI.
  const pinia = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia;
  const store = pinia._s.get('fileExplorer'), ws = store?._getWorkspaceState(workspaceId);
  const flatten = node => node ? [node, ...(node.children || []).flatMap(flatten)] : [];
  const nodes = flatten(ws?.tree), results = ws?.searchResults || [];
  return { workspaceId, url: location.href, electron: !!window.electronAPI,
    paths: nodes.map(node => node.path), openFolders: ws?.openFolders,
    results: results.map(node => ({ path: node.path, id: node.id, reused: nodes.includes(node) })),
    preview: store?.getActiveFileData(workspaceId), openFiles: store?.getOpenFiles(workspaceId),
    searchLoading: ws?.searchLoading, spinner: !!document.querySelector('.pdf-viewer-container .animate-spin'),
    alerts: [...document.querySelectorAll('[role="alert"]')].map(node => node.textContent),
    canvases: [...document.querySelectorAll('.pdf-content canvas')].map(canvas => {
      const rgba = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let ink = 0;
      for (let i = 0; i < rgba.length; i += 4) if (rgba[i + 3] && rgba[i] < 180 && rgba[i + 1] < 180 && rgba[i + 2] < 180) ink++;
      return { width: canvas.width, height: canvas.height, ink };
    }) };
}, id);
async function attach() {
  browser = await chromium.connectOverCDP(instance.controlEndpoint);
  ev.browser = browser.version();
  page = browser.contexts()[0].pages().find(candidate => candidate.url().includes('/renderer/index.html'));
  assert(page, 'Actual packaged main renderer not found');
  ev.userAgent = await page.evaluate(() => navigator.userAgent);
  page.setDefaultTimeout(60000);
  page.on('pageerror', error => ev.browserErrors.push({ kind: 'pageerror', message: String(error) }));
  page.on('console', message => { if (message.type() === 'error') ev.browserErrors.push({ kind: 'console', message: message.text() }); });
  page.on('response', async response => {
    if (response.url().includes('/graphql')) {
      try { ev.requests.push({ url: response.url(), request: response.request().postDataJSON(), result: await response.json() }); } catch {}
    } else if (response.url().includes('/content?')) {
      ev.requests.push({ url: response.url(), status: response.status(), contentType: response.headers()['content-type'] });
    }
  });
}
async function run(caseId, action) {
  ev.cases[caseId] = { result: 'Started' }; await save(); await event(caseId, 'Started');
  try { ev.cases[caseId].details = await action(); ev.cases[caseId].result = 'Pass'; }
  catch (error) {
    ev.cases[caseId].result = 'Fail'; ev.cases[caseId].error = error.stack;
    if (page) {
      await page.screenshot({ path: path.join(out, 'failed-' + caseId + '.png') }).catch(() => {});
      await fs.writeFile(path.join(out, 'failed-' + caseId + '.txt'), await page.locator('body').innerText()).catch(() => {});
    }
    throw error;
  } finally { await save(); await event(caseId, ev.cases[caseId].result); }
}
async function openWorkspaceFiles() {
    await page.evaluate(() => { location.hash = '/chat'; });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await test('run-target-switcher-trigger').click();
    await test('run-target-switcher-option-' + agent).click();
    await test('chat-workspace-trigger').click();
    await test('chat-workspace-option-' + id).click();
    if (await test('start-surface-tools-toggle').isVisible()) await test('start-surface-tools-toggle').click();
    await page.locator('[data-test="right-side-tab-list"] [data-tab-name="files"]').click();
    await page.locator('.file-explorer input').waitFor();
}

try {
  await run('API-006', async () => {
    fixture = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'electron-resume-fixture-')));
    const root = path.join(fixture, 'workspace');
    await fs.mkdir(path.join(root, 'applications/nested'), { recursive: true });
    await fs.mkdir(path.join(fixture, 'workspace-sibling'));
    await fs.writeFile(path.join(root, pdfPath), pdf); await fs.writeFile(path.join(root, textPath), text);
    await fs.writeFile(path.join(fixture, 'outside.txt'), sentinel);
    await fs.writeFile(path.join(fixture, 'workspace-sibling/leak.txt'), sentinel);
    ev.fixture = { fixture, root, pdfPath, textPath, pdfSha256: hash(pdf) };
    instance = await cli(['start', process.argv.includes('--skip-build') ? '--from-worktree' : '--build']);
    ev.instance = instance;
    const resources = process.platform === 'darwin'
      ? path.resolve(instance.executablePath, '../../Resources')
      : path.join(path.dirname(instance.executablePath), 'resources');
    const asar = path.join(resources, 'app.asar');
    const current = path.join(repo, 'autobyteus-server-ts/dist/file-explorer/file-explorer.js');
    const embedded = path.join(resources, 'server/dist/file-explorer/file-explorer.js');
    assert((await fs.stat(asar)).mtimeMs >= (await fs.stat(path.join(repo, 'autobyteus-server-ts/src/file-explorer/file-explorer.ts'))).mtimeMs,
      'Package must be source-current');
    assert.equal(hash(await fs.readFile(embedded)), hash(await fs.readFile(current)), 'Embedded server differs from current build');
    ev.build = { head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(),
      executable: instance.executablePath, asar, asarSha256: hash(await fs.readFile(asar)),
      embedded, embeddedSha256: hash(await fs.readFile(embedded)),
      sourceSha256: hash(await fs.readFile(path.join(repo, 'autobyteus-server-ts/src/file-explorer/file-explorer.ts'))) };
    const created = await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: root } });
    id = created.createWorkspace.workspaceId; ev.workspaceId = id;
    agent = (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}', {
      input: { name: 'Electron Resume Test', description: 'Synthetic owned preview validation, no inference.',
        instructions: 'Test fixture; no model messages.', toolNames: [] } })).createAgentDefinition.id;
    await attach();
    assert(page.url().startsWith('file://'), 'Must use packaged renderer, not Nuxt dev');
    return { instance, build: ev.build, workspaceId: id, agentId: agent };
  });
  await run('API-002', async () => {
    const found = await gql('query($id:String!){searchFiles(workspaceId:$id,query:"resume")}', { id });
    assert.deepEqual(new Set(found.searchFiles), new Set([pdfPath, textPath]));
    const response = await content(found.searchFiles.find(locator => locator.endsWith('.pdf')));
    assert.equal(response.status, 200); assert.match(response.headers.get('content-type'), /^application\/pdf/);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), pdf);
    const read = await gql('query($id:String!,$path:String!){fileContent(workspaceId:$id,filePath:$path)}', { id, path: textPath });
    assert.equal(read.fileContent, text);
    const denied = [];
    for (const locator of [path.join(ev.fixture.root, pdfPath), path.join(fixture, 'outside.txt'), '../outside.txt', '../workspace-sibling/leak.txt']) {
      const res = await content(locator), body = await res.text();
      assert.equal(res.status, 400);
      assert.deepEqual(JSON.parse(body), { detail: 'Access denied: Path resolves outside the workspace boundary.' });
      assert(!body.includes(sentinel) && !body.includes('%PDF'));
      denied.push({ locator, status: res.status, body });
    }
    return { paths: found.searchFiles, pdfSha256: hash(pdf), denied, textRead: true };
  });
  await run('API-003', async () => {
    await openWorkspaceFiles();
    await until('shallow workspace tree', async () => (await state()).paths.includes(textPath));
    const before = await state();
    assert.equal(before.electron, true); assert.equal(before.preview, null);
    assert(!before.paths.includes(pdfPath)); assert(!before.openFolders.applications);
    await page.locator('.file-explorer input').fill('resume');
    const selected = page.locator('.file-explorer .file-header').filter({ hasText: 'resume sample.pdf' });
    await selected.waitFor();
    const searched = await state();
    assert.equal(searched.results.find(node => node.path === pdfPath).reused, false);
    assert.equal(searched.results.find(node => node.path === textPath).reused, true);
    const request = page.waitForResponse(response => response.url().includes('/content?') &&
      new URL(response.url()).searchParams.get('path') === pdfPath);
    await selected.click();
    const response = await request;
    assert.equal(response.status(), 200); assert.match(response.headers()['content-type'], /^application\/pdf/);
    assert.deepEqual(await response.body(), pdf);
    await until('2 actual Electron PDF canvases/loading completion', async () => {
      const value = await state();
      return value.canvases.length === 2 && value.canvases.every(canvas => canvas.width > 0 && canvas.height > 0 && canvas.ink > 100) && !value.spinner;
    });
    const rendered = await state();
    assert.equal(rendered.preview.path, pdfPath); assert.equal(rendered.preview.relativeResourceContext.workspaceId, id);
    assert.equal(new URL(rendered.preview.url).origin, instance.backendUrl);
    assert.equal(rendered.preview.isLoading, false); assert.equal(rendered.preview.error, null);
    assert.deepEqual(rendered.alerts, []);
    await page.screenshot({ path: path.join(out, 'electron-pdf-page-one.png') });
    await page.locator('.pdf-content canvas').nth(1).evaluate(canvas => canvas.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: path.join(out, 'electron-pdf-page-two.png') });
    await event('API-003', 'Checkpoint actual packaged2page PDF rendered through protected200 bytes');
    await page.locator('.file-explorer .file-header').filter({ hasText: 'resume-notes.md' }).click();
    await page.locator('#contentViewer').getByText('ELECTRON SYNTHETIC RESUME NOTES', { exact: true }).waitFor();
    const searchedText = await state(); assert.equal(searchedText.preview.content, text);
    await page.locator('.file-explorer input').fill('');
    await until('empty search settled', async () => !(await state()).searchLoading);
    await page.locator('.file-explorer .file-header').filter({ hasText: 'resume-notes.md' }).click();
    const treeText = await state(); assert.equal(treeText.preview.path, searchedText.preview.path); assert.equal(treeText.preview.content, text);
    await page.locator('.file-explorer .file-header').filter({ hasText: /^applications$/ }).click();
    await page.locator('.file-explorer .file-header').filter({ hasText: /^nested$/ }).click();
    await page.locator('.file-explorer .file-header').filter({ hasText: 'resume sample.pdf' }).click();
    await until('tree-selected PDF rendered', async () => (await state()).canvases.length === 2 && !(await state()).spinner);
    const treePdf = await state();
    assert.equal(treePdf.preview.path, pdfPath); assert.equal(treePdf.preview.relativeResourceContext.workspaceId, id);
    assert.deepEqual(ev.browserErrors, [], 'Every actual packaged renderer error is fatal');
    return { before, searched, rendered, searchedText, treeText, treePdf };
  });
  await run('API-007', async () => {
    const targetsBefore = await (await fetch(instance.controlEndpoint + '/json/list')).json();
    const previous = instance;
    instance = await cli(['restart', instance.instanceId]);
    assert.equal(instance.instanceId, previous.instanceId);
    assert.equal(instance.controlPort, previous.controlPort); assert.equal(instance.serverPort, previous.serverPort);
    assert.equal(instance.dataRoot, previous.dataRoot);
    const targetsAfter = await (await fetch(instance.controlEndpoint + '/json/list')).json();
    const main = list => list.find(target => String(target.url).includes('/renderer/index.html'));
    assert.notEqual(main(targetsAfter).id, main(targetsBefore).id, 'Restart must create a fresh renderer target');
    await attach();
    const registered = await gql('{workspaces{workspaceId absolutePath}}');
    assert(registered.workspaces.some(workspace => workspace.workspaceId === id && workspace.absolutePath === ev.fixture.root));
    // Registration metadata is intentionally lazy. Resume through the real actor's
    // Files activation/search/click path, not a cold raw REST request.
    await openWorkspaceFiles();
    await page.locator('.file-explorer input').fill('resume');
    const selected = page.locator('.file-explorer .file-header').filter({ hasText: 'resume sample.pdf' });
    await selected.waitFor();
    const request = page.waitForResponse(response => response.url().includes('/content?') &&
      new URL(response.url()).searchParams.get('path') === pdfPath);
    await selected.click();
    const response = await request;
    assert.equal(response.status(), 200); assert(response.headers()['content-type'].startsWith('application/pdf'));
    assert.deepEqual(await response.body(), pdf);
    await until('restarted actual PDF render', async () => {
      const value = await state();
      return value.canvases.length === 2 && value.canvases.every(canvas => canvas.ink > 100) && !value.spinner;
    });
    const recovered = await state();
    assert.equal(recovered.preview.path, pdfPath); assert.equal(recovered.preview.relativeResourceContext.workspaceId, id);
    assert.deepEqual(recovered.alerts, []);
    await page.screenshot({ path: path.join(out, 'electron-after-restart.png') });
    assert.deepEqual(ev.browserErrors, []);
    return { instance, oldTargetId: main(targetsBefore).id, newTargetId: main(targetsAfter).id, registrationSurvived: true, recovered };
  });
} catch (error) { ev.failure = error.stack; process.exitCode = 1; }
finally {
  if (instance) {
    try {
      await fs.copyFile(instance.logPath, path.join(out, 'desktop.log'));
      const stopped = await cli(['stop', instance.instanceId]); ev.cleanup.stop = stopped;
      const remaining = await cli(['list']); ev.cleanup.list = remaining;
      const records = Array.isArray(remaining) ? remaining : remaining.instances || [];
      assert(!records.some(record => record.instanceId === instance.instanceId || record.id === instance.instanceId));
      assert(!existsSync(instance.dataRoot), 'Owned isolated root not removed');
      ev.cleanup.dataRootRemoved = true;
    } catch (error) { ev.cleanup.stopError = error.stack; process.exitCode = 1; }
  }
  if (browser) { await browser.close().catch(() => {}); ev.cleanup.cdpClosed = true; }
  if (fixture) { await fs.rm(fixture, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); ev.cleanup.fixtureRemoved = !existsSync(fixture); }
  ev.finishedAt = new Date().toISOString(); await save();
  console.log(JSON.stringify({ cases: Object.fromEntries(Object.entries(ev.cases).map(([id, value]) => [id, value.result])),
    failure: ev.failure, cleanup: ev.cleanup }));
}

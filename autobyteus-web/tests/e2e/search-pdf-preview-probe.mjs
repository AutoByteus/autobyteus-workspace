#!/usr/bin/env node
/**
 * AC-001–003 web-equivalent Files journey with real GraphQL/REST/WebSocket/renderer.
 * Prerequisites: installed dependencies, server prebuild + CURRENT build, nuxt prepare,
 * headless Chromium. No RUN gate, providers, credentials or user files.
 * pnpm -C autobyteus-web test:e2e:search-pdf-preview --output-dir <FRESH-dir>
 * [--browser-executable /usr/bin/chromium] [--ledger-file <canonical-ledger>]
 * Own free ports, clean HOME/data/DB, temporary component-host page, browser/processes.
 * The host mounts unchanged product FileExplorerLayout; all file selection is real UI.
 * API-002 real search/bytes/denials; API-003 lazy click/render and tree/text identity.
 * Does not prove Electron shell, packaged/live8001 deployment or user verification.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createWriteStream, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const repo = path.dirname(web), server = path.join(repo, 'autobyteus-server-ts');
const arg = (key, fallback) => { const i = process.argv.indexOf(`--${key}`); return i < 0 ? fallback : process.argv[i + 1]; };
const out = path.resolve(web, arg('output-dir', 'test-results/search-pdf-preview'));
const ledger = arg('ledger-file');
await fs.mkdir(out, { recursive: true });
assert(!existsSync(path.join(out, 'evidence.json')), 'Refusing existing evidence');
const fixturePage = path.join(web, 'pages/api-e2e-search-pdf.vue');
const fixturePdf = path.join(repo, 'test-support/file-explorer/resume-preview.pdf');
const pdfPath = 'applications/nested/resume sample.pdf', textPath = 'resume-notes.md';
const text = '# SYNTHETIC RESUME NOTES\n\nSame workspace-relative text reader.\n';
const sentinel = 'OUTSIDE-SENTINEL-DO-NOT-RETURN';
const ev = { startedAt: new Date().toISOString(), node: process.version, cases: {}, processes: [], requests: [], browserErrors: [], cleanup: {} };
const save = () => fs.writeFile(path.join(out, 'evidence.json'), JSON.stringify(ev, null, 2) + '\n');
const event = async (id, message) => { console.log(`${id}: ${message}`); if (ledger) await fs.appendFile(ledger, `
- ${new Date().toISOString()} ${id} ${message}; ${out}/evidence.json.
`); };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(label, action, timeout = 120000) {
  const end = Date.now() + timeout; let last;
  while (Date.now() < end) { try { if (await action()) return; } catch (error) { last = error; } await delay(200); }
  throw new Error(`Timeout: ${label}; ${last || ''}`);
}
const port = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.on('error', reject);
  s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); });
});
let owned, base, front, browser, page, id, installedPage = false;
const children = [];
function start(label, command, args, cwd, env) {
  const log = createWriteStream(path.join(out, `${label}.log`));
  const child = spawn(command, args, { cwd, env, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log); child.stderr.pipe(log); children.push(child);
  child.on('error', error => { ev.processError = String(error); });
  ev.processes.push({ label, pid: child.pid }); return child;
}
const liveGroupMembers = pid => execFileSync('ps', ['-eo', 'pid=,pgid=,stat='], { encoding: 'utf8' })
  .trim().split('\n').map(line => line.trim().split(/\s+/))
  .filter(([, group, state]) => Number(group) === pid && !state.startsWith('Z'));
async function stop(child) {
  // pnpm's exit can precede Nuxt descendants' exit/compile-cache flush.
  const signalGroup = signal => {
    try { process.kill(-child.pid, signal); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  };
  signalGroup('SIGTERM');
  await until('owned process group ' + child.pid + ' exit', async () => liveGroupMembers(child.pid).length === 0, 10000)
    .catch(async () => { signalGroup('SIGKILL'); await until('owned group SIGKILL exit', async () => liveGroupMembers(child.pid).length === 0, 5000); });
  assert(child.exitCode !== null || child.signalCode, 'Process not stopped: ' + child.pid);
  return { pid: child.pid, exitCode: child.exitCode, signal: child.signalCode, liveGroupMembers: liveGroupMembers(child.pid).length };
}
const gql = async (query, variables = {}) => {
  const res = await fetch(`${base}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(30000) });
  assert.equal(res.status, 200); const json = await res.json(); assert(!json.errors, JSON.stringify(json.errors)); return json.data;
};
const content = locator => fetch(`${base}/rest/workspaces/${id}/content?${new URLSearchParams({ path: locator })}`);
const hash = data => createHash('sha256').update(data).digest('hex');
async function run(caseId, action) {
  ev.cases[caseId] = { result: 'Started' }; await save(); await event(caseId, 'Started');
  try { ev.cases[caseId].details = await action(); ev.cases[caseId].result = 'Pass'; }
  catch (error) {
    ev.cases[caseId].result = 'Fail'; ev.cases[caseId].error = error.stack;
    if (page) { await page.screenshot({ path: path.join(out, `failed-${caseId}.png`) }).catch(() => {}); await fs.writeFile(path.join(out, `failed-${caseId}.txt`), await page.locator('body').innerText()).catch(() => {}); }
    throw error;
  } finally { await save(); await event(caseId, ev.cases[caseId].result); }
}
const state = () => page.evaluate(id => {
  // Read-only observations; no private writes/test bridge.
  const pinia = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia;
  const store = pinia._s.get('fileExplorer'), ws = store?._getWorkspaceState(id);
  const flatten = node => node ? [node, ...(node.children || []).flatMap(flatten)] : [];
  const nodes = flatten(ws?.tree), results = ws?.searchResults || [];
  return {
    workspaceId: id, paths: nodes.map(n => n.path), openFolders: ws?.openFolders,
    results: results.map(n => ({ path: n.path, id: n.id, reused: nodes.includes(n) })),
    preview: store?.getActiveFileData(id), searchLoading: ws?.searchLoading,
    canvases: [...document.querySelectorAll('.pdf-content canvas')].map(c => {
      const pixels = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let ink = 0; for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3] && pixels[i] < 180 && pixels[i + 1] < 180 && pixels[i + 2] < 180) ink++;
      return { width: c.width, height: c.height, ink };
    }),
    spinner: !!document.querySelector('.pdf-viewer-container .animate-spin'),
    alerts: [...document.querySelectorAll('[role="alert"]')].map(e => e.textContent),
  };
}, id);
try {
  assert(!existsSync(fixturePage), 'Refusing existing fixture page');
  const src = path.join(server, 'src/file-explorer/file-explorer.ts'), dist = path.join(server, 'dist/file-explorer/file-explorer.js');
  assert((await fs.stat(dist)).mtimeMs >= (await fs.stat(src)).mtimeMs, 'Build current worktree server first');
  ev.build = { source: src, sourceSha256: hash(await fs.readFile(src)), dist, distSha256: hash(await fs.readFile(dist)), gitHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim() };
  owned = await fs.mkdtemp(path.join(os.tmpdir(), 'search-pdf-preview-'));
  const root = path.join(owned, 'workspace'), data = path.join(owned, 'data'), home = path.join(owned, 'home');
  await fs.mkdir(path.join(root, 'applications/nested'), { recursive: true });
  await fs.mkdir(path.join(owned, 'workspace-sibling')); await fs.mkdir(path.join(data, 'db'), { recursive: true }); await fs.mkdir(home);
  const pdf = await fs.readFile(fixturePdf);
  await fs.writeFile(path.join(root, pdfPath), pdf); await fs.writeFile(path.join(root, textPath), text);
  await fs.writeFile(path.join(owned, 'outside.txt'), sentinel); await fs.writeFile(path.join(owned, 'workspace-sibling/leak.txt'), sentinel);
  const backendPort = await port(), frontendPort = await port();
  base = `http://127.0.0.1:${backendPort}`; front = `http://127.0.0.1:${frontendPort}`;
  ev.fixture = { owned, root, pdfPath, textPath, pdfSha256: hash(pdf) }; ev.endpoints = { base, front };
  const clean = { PATH: process.env.PATH, HOME: home, TMPDIR: owned, LANG: 'C.UTF-8', TZ: 'UTC' };
  const db = `file:${path.join(data, 'db/probe.db')}`;
  await fs.writeFile(path.join(data, '.env'), `APP_ENV=development
DB_TYPE=sqlite
DATABASE_URL=${db}
AUTOBYTEUS_SERVER_HOST=${base}
`);
  const backend = start('backend', process.execPath, [path.join(server, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', data], server, { ...clean, APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: db, AUTOBYTEUS_SERVER_HOST: base });
  await until('backend ready', async () => { assert.equal(backend.exitCode, null); return (await fetch(`${base}/rest/health`, { signal: AbortSignal.timeout(2000) })).ok; });
  const created = await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: root } }); id = created.createWorkspace.workspaceId; ev.workspaceId = id;
  await run('API-002', async () => {
    const found = await gql('query($id:String!){searchFiles(workspaceId:$id,query:"resume")}', { id });
    assert.deepEqual(new Set(found.searchFiles), new Set([pdfPath, textPath]));
    const res = await content(found.searchFiles.find(p => p.endsWith('.pdf')));
    assert.equal(res.status, 200); assert.match(res.headers.get('content-type'), /^application\/pdf/);
    assert.deepEqual(Buffer.from(await res.arrayBuffer()), pdf);
    const read = await gql('query($id:String!,$path:String!){fileContent(workspaceId:$id,filePath:$path)}', { id, path: textPath });
    assert.equal(read.fileContent, text);
    const denied = [];
    for (const locator of [path.join(root, pdfPath), path.join(owned, 'outside.txt'), '../outside.txt', '../workspace-sibling/leak.txt']) {
      const response = await content(locator), body = await response.text();
      assert.equal(response.status, 400); assert.deepEqual(JSON.parse(body), { detail: 'Access denied: Path resolves outside the workspace boundary.' });
      assert(!body.includes(sentinel) && !body.includes('%PDF')); denied.push({ locator, status: response.status, body });
    }
    return { found: found.searchFiles, pdfStatus: 200, pdfSha256: hash(pdf), denied, textRead: true };
  });
  await fs.copyFile(path.join(web, 'tests/e2e/fixtures/search-pdf-preview.page.vue'), fixturePage); installedPage = true;
  const frontend = start('frontend', 'pnpm', ['dev', '--host', '127.0.0.1', '--port', String(frontendPort)], web, { ...clean, NODE_ENV: 'development', BACKEND_NODE_BASE_URL: base });
  await until('Nuxt ready', async () => { assert.equal(frontend.exitCode, null); return (await fetch(`${front}/api-e2e-search-pdf`, { signal: AbortSignal.timeout(5000) })).ok; }, 180000);
  browser = await chromium.launch({ headless: true, executablePath: arg('browser-executable', ['/usr/bin/chromium', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync)), args: ['--no-sandbox'] });
  ev.browser = await browser.version();
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' }); page.setDefaultTimeout(60000);
  const observe = (target, errors) => {
    target.on('pageerror', error => errors.push({ kind: 'pageerror', message: String(error) }));
    target.on('console', message => { if (message.type() === 'error') errors.push({ kind: 'console', message: message.text() }); });
    target.on('response', async response => {
    if (response.url().includes('/graphql')) { try { ev.requests.push({ url: response.url(), request: response.request().postDataJSON(), response: await response.json() }); } catch {} }
    if (response.url().includes('/content?')) ev.requests.push({ url: response.url(), status: response.status(), contentType: response.headers()['content-type'] });
  });
  };
  ev.warmupBrowserErrors = [];
  observe(page, ev.warmupBrowserErrors);
  const route = `${front}/api-e2e-search-pdf?workspaceId=${id}`;
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.locator('.file-explorer input').waitFor(); await page.waitForTimeout(4000); // cold Vite warmup
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.locator('.file-explorer input').waitFor();
  // TESTING.md: cold Nuxt optimizer reloads are harness warmup, not the journey.
  // Retain their errors separately; use a fresh page/context and fail on EVERY
  // actual validation-page error. Never filter/clear errors from the real case.
  await page.close();
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' });
  page.setDefaultTimeout(60000);
  observe(page, ev.browserErrors);
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.locator('.file-explorer input').waitFor();
  await until('initial shallow tree ready', async () => (await state()).paths.includes(textPath));
  await run('API-003', async () => {
    const before = await state();
    assert(!before.paths.includes(pdfPath), 'Nested PDF must be unloaded initially');
    assert(!before.openFolders['applications']);
    await page.locator('.file-explorer input').fill('resume');
    const result = page.locator('.file-explorer .file-header').filter({ hasText: 'resume sample.pdf' });
    await result.waitFor(); const searched = await state();
    assert.equal(searched.results.find(r => r.path === pdfPath).reused, false);
    assert.equal(searched.results.find(r => r.path === textPath).reused, true);
    const responsePromise = page.waitForResponse(response => response.url().includes('/content?') && new URL(response.url()).searchParams.get('path') === pdfPath);
    await result.click();
    const response = await responsePromise; assert.equal(response.status(), 200);
    assert.match(response.headers()['content-type'], /^application\/pdf/); assert.deepEqual(await response.body(), pdf);
    await until('2 rendered ink-bearing canvases, loading complete', async () => {
      const s = await state(); return s.canvases.length === 2 && s.canvases.every(c => c.width > 0 && c.height > 0 && c.ink > 100) && !s.spinner;
    });
    const rendered = await state(); assert.equal(rendered.preview.path, pdfPath);
    assert.equal(rendered.preview.relativeResourceContext.workspaceId, id); assert.equal(rendered.preview.isLoading, false);
    assert.deepEqual(rendered.alerts, []);
    await page.screenshot({ path: path.join(out, 'pdf-rendered.png'), fullPage: true });
    await page.locator('.pdf-content canvas').nth(1).evaluate(canvas => canvas.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: path.join(out, 'pdf-second-page.png') });
    await page.locator('.file-explorer .file-header').filter({ hasText: 'resume-notes.md' }).click();
    await page.locator('#contentViewer').getByText('SYNTHETIC RESUME NOTES', { exact: true }).waitFor();
    const searchedText = await state(); assert.equal(searchedText.preview.path, textPath); assert.equal(searchedText.preview.content, text);
    await page.locator('.file-explorer input').fill('');
    await until('search cleared', async () => !(await state()).searchLoading);
    await page.locator('.file-explorer .file-header').filter({ hasText: 'resume-notes.md' }).click();
    const treeText = await state(); assert.equal(treeText.preview.path, searchedText.preview.path); assert.equal(treeText.preview.content, text);
    await page.locator('.file-explorer .file-header').filter({ hasText: /^applications$/ }).click();
    await page.locator('.file-explorer .file-header').filter({ hasText: /^nested$/ }).click();
    await page.locator('.file-explorer .file-header').filter({ hasText: 'resume sample.pdf' }).click();
    await until('tree PDF render', async () => (await state()).canvases.length === 2 && !(await state()).spinner);
    const treePdf = await state(); assert.equal(treePdf.preview.path, rendered.preview.path);
    assert.equal(treePdf.preview.relativeResourceContext.workspaceId, id);
    assert.deepEqual(ev.browserErrors, [], 'Browser errors are not waived');
    return { before, searched, rendered, searchedText, treeText, treePdf };
  });
} catch (error) { ev.failure = error.stack; process.exitCode = 1; }
finally {
  if (browser) { await browser.close(); ev.cleanup.browserClosed = true; }
  ev.cleanup.processes = [];
  for (const child of children.reverse()) {
    try { ev.cleanup.processes.push(await stop(child)); } catch (error) { ev.cleanup.error = String(error); process.exitCode = 1; }
  }
  if (installedPage) { await fs.unlink(fixturePage); ev.cleanup.fixturePageRemoved = !existsSync(fixturePage); }
  if (owned) {
    try { await fs.rm(owned, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); ev.cleanup.ownedRootRemoved = !existsSync(owned); }
    catch (error) { ev.cleanup.rootError = String(error); process.exitCode = 1; }
  }
  for (const [name, url] of Object.entries({ base, front })) if (url) {
    try { await fetch(`${url}/rest/health`, { signal: AbortSignal.timeout(1000) }); ev.cleanup[`${name}Closed`] = false; process.exitCode = 1; }
    catch { ev.cleanup[`${name}Closed`] = true; }
  }
  ev.finishedAt = new Date().toISOString(); await save();
  console.log(JSON.stringify({ cases: Object.fromEntries(Object.entries(ev.cases).map(([id, c]) => [id, c.result])), failure: ev.failure, cleanup: ev.cleanup }));
}

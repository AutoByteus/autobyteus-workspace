#!/usr/bin/env node
/**
 * File Explorer pending-Save draft preservation against REAL Monaco, real renderer, real server.
 * Ticket: file-explorer-pending-save-draft-preservation (AC-001..AC-006, AC-008, RSK-001).
 * Prerequisites: installed deps, server prebuild + CURRENT build (`pnpm -C autobyteus-server-ts build`),
 *   nuxt prepare, Chrome/Chromium, network to cdn.jsdelivr.net (@monaco-editor/loader fetches Monaco there).
 * Command: pnpm -C autobyteus-web test:e2e:file-explorer-pending-save-draft --output-dir <FRESH-dir>
 *   [--browser-executable <path>]
 * Own free ports, clean HOME/data/DB, temporary component-host page (removed on exit), own browser.
 * The mounted component is the unchanged product FileExplorerLayout; files are opened from the real tree,
 * typing / undo / Ctrl-Cmd+S are real keyboard input into Monaco. Only the writeFileContent response is
 * HELD (the real server still performs the write) or FAILED, to create the pending-Save window that a slow
 * network or disk produces in real use.
 * Cases: PSD-001 undo-to-original, PSD-002 retype-original, PSD-003 clear-all, PSD-004 different later edit,
 * PSD-005 later input equals saved text, PSD-006 failed Save + differing edit, PSD-007 failed Save + revert,
 * PSD-008 ordinary Save (no echo), PSD-009 undo with no Save pending,
 * PSD-010/011 Save pending then FAILS (differing later edit kept; revert-to-committed becomes clean).
 * Does not prove the Electron shell.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createWriteStream, existsSync } from 'node:fs';
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
const out = path.resolve(web, arg('output-dir', 'test-results/file-explorer-pending-save-draft'));
await fs.mkdir(out, { recursive: true });
assert(!existsSync(path.join(out, 'evidence.json')), 'Refusing existing evidence');
const fixturePage = path.join(web, 'pages/api-e2e-pending-save-draft.vue');
const ORIGINAL = 'draft-a original', SAVED = 'saved checkpoint', OTHER = 'a different later edit';
const files = {
  'psd001.txt': ORIGINAL, 'psd002.txt': ORIGINAL, 'psd003.txt': ORIGINAL, 'psd004.txt': ORIGINAL, 'psd005.txt': ORIGINAL,
  'psd006.txt': ORIGINAL, 'psd007.txt': ORIGINAL, 'psd008.txt': ORIGINAL, 'psd009.txt': ORIGINAL, 'psd010.txt': ORIGINAL, 'psd011.txt': ORIGINAL,
};
const ev = { startedAt: new Date().toISOString(), node: process.version, cases: {}, processes: [], writes: [], browserErrors: [], expectedFailedSaveConsoleErrors: [], monacoCancellations: [], cleanup: {} };
const save = () => fs.writeFile(path.join(out, 'evidence.json'), JSON.stringify(ev, null, 2) + '\n');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(label, action, timeout = 60000) {
  const end = Date.now() + timeout; let last;
  while (Date.now() < end) { try { if (await action()) return; } catch (error) { last = error; } await delay(100); }
  throw new Error(`Timeout: ${label}; ${last || ''}`);
}
const port = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.on('error', reject);
  s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); });
});
let owned, base, front, browser, page, id, installedPage = false, root;
const children = [];
function start(label, command, args, cwd, env) {
  const log = createWriteStream(path.join(out, `${label}.log`));
  const child = spawn(command, args, { cwd, env, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log); child.stderr.pipe(log); children.push(child);
  ev.processes.push({ label, pid: child.pid }); return child;
}
const liveGroupMembers = pid => execFileSync('ps', ['-eo', 'pid=,pgid=,stat='], { encoding: 'utf8' })
  .trim().split('\n').map(line => line.trim().split(/\s+/)).filter(([, group, state]) => Number(group) === pid && !state.startsWith('Z'));
async function stop(child) {
  const signalGroup = signal => { try { process.kill(-child.pid, signal); } catch (error) { if (error.code !== 'ESRCH') throw error; } };
  signalGroup('SIGTERM');
  await until('group exit ' + child.pid, async () => liveGroupMembers(child.pid).length === 0, 10000)
    .catch(async () => { signalGroup('SIGKILL'); await until('group SIGKILL exit', async () => liveGroupMembers(child.pid).length === 0, 5000); });
  return { pid: child.pid, exitCode: child.exitCode, signal: child.signalCode, liveGroupMembers: liveGroupMembers(child.pid).length };
}
const gql = async (query, variables = {}) => {
  const res = await fetch(`${base}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(30000) });
  assert.equal(res.status, 200); const json = await res.json(); assert(!json.errors, JSON.stringify(json.errors)); return json.data;
};

// ---- write-mutation control: 'pass' | 'hold' | 'fail'. Held/failed per request in order of arrival.
let mode = 'pass', held = null, currentCase = null;
const writeLog = () => ev.writes.filter(w => w.case === currentCase);
async function installRoute() {
  await page.route('**/graphql', async route => {
    const body = route.request().postDataJSON();
    if (!body?.query?.includes('writeFileContent')) return route.continue();
    const content = body.variables?.content, filePath = body.variables?.filePath;
    const record = { case: currentCase, filePath, content, mode, at: Date.now() };
    ev.writes.push(record);
    if (mode === 'fail') { record.outcome = 'failed-by-probe'; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ errors: [{ message: 'PROBE-INJECTED-SAVE-FAILURE' }], data: null }) }); }
    if (mode === 'holdfail') { // Save is pending; the reply arrives later as an error and the server is never reached
      held = { release: null, record };
      await new Promise(resolve => { held.release = resolve; record.heldAt = Date.now(); });
      record.outcome = 'held-then-failed-by-probe'; held = null;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ errors: [{ message: 'PROBE-INJECTED-SAVE-FAILURE' }], data: null }) });
    }
    if (mode === 'hold') {
      const response = await route.fetch(); // real server performs the write now; only the reply is held
      held = { release: null, record };
      await new Promise(resolve => { held.release = resolve; record.heldAt = Date.now(); });
      record.outcome = 'held-then-released'; held = null;
      return route.fulfill({ response });
    }
    record.outcome = 'passed'; return route.continue();
  });
}
const releaseHeld = async () => { await until('a Save response is held', async () => held && held.release); const r = held.release; r(); await until('held released', async () => held === null); };

// ---- observations (read-only)
const fileState = p => page.evaluate(([wid, p]) => {
  const pinia = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia;
  const s = pinia._s.get('fileExplorer'), ws = s._getWorkspaceState(wid);
  const f = ws.openFiles.find(x => x.path === p);
  return { content: f?.content, draft: f?.editorDraft ? f.editorDraft.content : undefined, hasDraft: !!f?.editorDraft, saving: !!ws.saveContentLoading[p], error: ws.saveContentError[p] ?? null };
}, [id, p]);
const editorValue = () => page.evaluate(() => window.monaco.editor.getEditors()[0].getValue());
const mod = 'ControlOrMeta';
// Content-change counter installed on the real Monaco model; counts every change event with its flush flag.
const installProbe = () => page.evaluate(() => {
  const ed = window.monaco.editor.getEditors()[0];
  window.__psd = { events: [], disposables: [] };
  const model = ed.getModel();
  window.__psd.events = [];
  window.__psd.disposables.push(model.onDidChangeContent(e => window.__psd.events.push({ flush: e.isFlush, n: e.changes.length, t: Date.now() })));
});
const probeEvents = () => page.evaluate(() => window.__psd.events.length);
const resetProbeEvents = () => page.evaluate(() => { window.__psd.events.length = 0; });
const flushEvents = () => page.evaluate(() => window.__psd.events.filter(e => e.flush).length);
async function openFile(name) {
  await page.locator('.file-explorer .file-header').filter({ hasText: new RegExp(`^${name}$`) }).first().click();
  await page.locator('.monaco-editor textarea').first().waitFor({ state: 'attached' });
  await until(`${name} loaded in Monaco`, async () => (await editorValue()) === files[name]);
  await installProbe();
}
async function replaceAll(text) {
  await page.locator('.monaco-editor .view-lines').first().click();
  await page.keyboard.press(`${mod}+A`);
  if (text === '') await page.keyboard.press('Delete'); else await page.keyboard.type(text);
  await until(`editor shows ${JSON.stringify(text)}`, async () => (await editorValue()) === text);
}
async function undoTo(text) {
  for (let i = 0; i < 60; i++) {
    if ((await editorValue()) === text) return i;
    await page.keyboard.press(`${mod}+Z`); await page.waitForTimeout(40);
  }
  throw new Error(`Undo never reached ${JSON.stringify(text)}; at ${JSON.stringify(await editorValue())}`);
}
const savingVisible = () => page.getByText('Saving...', { exact: true }).isVisible();
const disk = name => fs.readFile(path.join(root, name), 'utf8');
async function pressSave() { await page.keyboard.press(`${mod}+S`); }
async function run(caseId, name, action) {
  currentCase = caseId; mode = 'pass'; held = null;
  ev.cases[caseId] = { result: 'Started', name }; await save(); console.log(`${caseId}: Started`);
  try { ev.cases[caseId].details = await action(); ev.cases[caseId].result = 'Pass'; }
  catch (error) {
    ev.cases[caseId].result = 'Fail'; ev.cases[caseId].error = error.stack;
    await page.screenshot({ path: path.join(out, `failed-${caseId}.png`) }).catch(() => {});
    if (held?.release) held.release();
  } finally { await save(); console.log(`${caseId}: ${ev.cases[caseId].result}`); }
}
// Common beginning: open, type SAVED, Save with held response, wait until Save is really pending.
async function pendingSave(name, firstText = SAVED, holdMode = 'hold') {
  await openFile(name);
  await replaceAll(firstText);
  mode = holdMode; await pressSave();
  await until('Save pending (store + UI)', async () => (await fileState(name)).saving && await savingVisible());
  mode = 'pass';
}
try {
  assert(!existsSync(fixturePage), 'Refusing existing fixture page');
  const src = path.join(server, 'src/file-explorer/file-explorer.ts'), dist = path.join(server, 'dist/file-explorer/file-explorer.js');
  assert((await fs.stat(dist)).mtimeMs >= (await fs.stat(src)).mtimeMs, 'Build current worktree server first');
  ev.gitHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
  ev.gitStatusWeb = execFileSync('git', ['status', '--short', '--', 'autobyteus-web'], { cwd: repo, encoding: 'utf8' }).trim();
  owned = await fs.mkdtemp(path.join(os.tmpdir(), 'pending-save-draft-'));
  root = path.join(owned, 'workspace'); const data = path.join(owned, 'data'), home = path.join(owned, 'home');
  await fs.mkdir(root); await fs.mkdir(path.join(data, 'db'), { recursive: true }); await fs.mkdir(home);
  for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(root, name), text);
  const backendPort = await port(), frontendPort = await port();
  base = `http://127.0.0.1:${backendPort}`; front = `http://127.0.0.1:${frontendPort}`; ev.endpoints = { base, front }; ev.owned = owned;
  const clean = { PATH: process.env.PATH, HOME: home, TMPDIR: owned, LANG: 'C.UTF-8', TZ: 'UTC' };
  const db = `file:${path.join(data, 'db/probe.db')}`;
  await fs.writeFile(path.join(data, '.env'), `APP_ENV=development\nDB_TYPE=sqlite\nDATABASE_URL=${db}\nAUTOBYTEUS_SERVER_HOST=${base}\n`);
  const backend = start('backend', process.execPath, [path.join(server, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', data], server, { ...clean, APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: db, AUTOBYTEUS_SERVER_HOST: base });
  await until('backend ready', async () => { assert.equal(backend.exitCode, null); return (await fetch(`${base}/rest/health`, { signal: AbortSignal.timeout(2000) })).ok; }, 120000);
  id = (await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: root } })).createWorkspace.workspaceId; ev.workspaceId = id;
  await fs.copyFile(path.join(web, 'tests/e2e/fixtures/file-explorer-pending-save-draft.page.vue'), fixturePage); installedPage = true;
  const frontend = start('frontend', 'pnpm', ['dev', '--host', '127.0.0.1', '--port', String(frontendPort)], web, { ...clean, NODE_ENV: 'development', BACKEND_NODE_BASE_URL: base });
  await until('Nuxt ready', async () => { assert.equal(frontend.exitCode, null); return (await fetch(`${front}/api-e2e-pending-save-draft`, { signal: AbortSignal.timeout(5000) })).ok; }, 240000);
  browser = await chromium.launch({ headless: true, executablePath: arg('browser-executable', ['/usr/bin/chromium', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync)), args: ['--no-sandbox'] });
  ev.browser = await browser.version();
  const route = `${front}/api-e2e-pending-save-draft?workspaceId=${id}`;
  // Cold Vite optimizer warmup page (errors from reloads are harness warmup, kept separately).
  let warm = await browser.newPage(); ev.warmupErrors = [];
  warm.on('pageerror', e => ev.warmupErrors.push(String(e)));
  await warm.goto(route, { waitUntil: 'domcontentloaded' }); await warm.locator('.file-explorer input').waitFor(); await warm.waitForTimeout(4000);
  await warm.reload({ waitUntil: 'domcontentloaded' }); await warm.locator('.file-explorer input').waitFor(); await warm.close();
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' }); page.setDefaultTimeout(30000);
  // Monaco's own unhandled CancellationError ("Canceled: Canceled", raised when an in-flight editor-internal
  // request is cancelled on file switch/dispose) is recorded separately, NOT waived: it is reproduced on the
  // unmodified base store (evidence/api-e2e-base-run1) and is independent of Save/draft behavior. Anything else fails the run.
  page.on('pageerror', e => (/^(Uncaught \(in promise\) )?Canceled(: Canceled)?$/.test(String(e.message ?? e)) ? ev.monacoCancellations : ev.browserErrors)
    .push({ kind: 'pageerror', message: String(e.message ?? e), case: currentCase, at: Date.now() }));
  page.on('console', m => { if (m.type() !== 'error') return;
    const rec = { kind: 'console', message: m.text(), case: currentCase };
    (/Save operation failed|PROBE-INJECTED|Failed to load resource/.test(m.text()) && ['PSD-006', 'PSD-007', 'PSD-010', 'PSD-011'].includes(currentCase) ? ev.expectedFailedSaveConsoleErrors : ev.browserErrors).push(rec); });
  await installRoute();
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.locator('.file-explorer input').waitFor();
  await until('tree ready', async () => (await page.locator('.file-explorer .file-header').filter({ hasText: /^psd001\.txt$/ }).count()) > 0);

  await run('PSD-001', 'AC-001 real typing, Save held, real Ctrl/Cmd+Z back to original, release, Save again', async () => {
    const n = 'psd001.txt';
    await pendingSave(n);
    const undone = await undoTo(ORIGINAL);
    const mid = await fileState(n); assert.equal(mid.hasDraft, true, 'draft exists while pending'); assert.equal(mid.draft, ORIGINAL);
    await resetProbeEvents();
    await releaseHeld();
    await until('Save settled', async () => !(await fileState(n)).saving);
    await page.waitForTimeout(800); // allow any async echo / watcher refresh to land
    const after = await fileState(n);
    assert.equal(await editorValue(), ORIGINAL, 'editor still shows the later input');
    assert.equal(after.content, SAVED, 'committed content is the saved snapshot'); assert.equal(after.hasDraft, true); assert.equal(after.draft, ORIGINAL);
    const echoed = await probeEvents(); assert.equal(echoed, 0, 'no model content change / replacement after release');
    assert.equal(await disk(n), SAVED, 'disk holds the first save');
    mode = 'pass'; await pressSave();
    await until('second Save done', async () => { const s = await fileState(n); return !s.saving && !s.hasDraft; });
    assert.deepEqual(writeLog().map(w => w.content), [SAVED, ORIGINAL]);
    assert.equal(await disk(n), ORIGINAL); assert.equal(await editorValue(), ORIGINAL);
    const fin = await fileState(n); assert.equal(fin.content, ORIGINAL);
    await page.screenshot({ path: path.join(out, 'PSD-001-final.png') });
    return { undoSteps: undone, mid, after, echoedEventsAfterRelease: echoed, payloads: writeLog().map(w => w.content), disk: await disk(n), final: fin };
  });

  await run('PSD-002', 'AC-001 variant: revert by retyping the original text', async () => {
    const n = 'psd002.txt'; await pendingSave(n); await replaceAll(ORIGINAL); await resetProbeEvents();
    await releaseHeld(); await until('settled', async () => !(await fileState(n)).saving); await page.waitForTimeout(800);
    const after = await fileState(n);
    assert.equal(await editorValue(), ORIGINAL); assert.equal(after.hasDraft, true); assert.equal(after.content, SAVED); assert.equal(await probeEvents(), 0);
    await pressSave(); await until('second Save', async () => { const s = await fileState(n); return !s.saving && !s.hasDraft; });
    assert.deepEqual(writeLog().map(w => w.content), [SAVED, ORIGINAL]); assert.equal(await disk(n), ORIGINAL);
    return { after, payloads: writeLog().map(w => w.content) };
  });

  await run('PSD-003', 'AC-002 clear-all while Save pending', async () => {
    const n = 'psd003.txt'; await pendingSave(n); await replaceAll(''); await resetProbeEvents();
    await releaseHeld(); await until('settled', async () => !(await fileState(n)).saving); await page.waitForTimeout(800);
    const after = await fileState(n);
    assert.equal(await editorValue(), ''); assert.equal(after.hasDraft, true); assert.equal(after.draft, ''); assert.equal(await probeEvents(), 0);
    await pressSave(); await until('second Save', async () => { const s = await fileState(n); return !s.saving && !s.hasDraft; });
    assert.deepEqual(writeLog().map(w => w.content), [SAVED, '']); assert.equal(await disk(n), ''); assert.equal(await editorValue(), '');
    return { after, payloads: writeLog().map(w => w.content) };
  });

  await run('PSD-004', 'AC-005 later edit different from both texts', async () => {
    const n = 'psd004.txt'; await pendingSave(n); await replaceAll(OTHER); await resetProbeEvents();
    await releaseHeld(); await until('settled', async () => !(await fileState(n)).saving); await page.waitForTimeout(800);
    const after = await fileState(n);
    assert.equal(await editorValue(), OTHER); assert.equal(after.draft, OTHER); assert.equal(await probeEvents(), 0);
    await pressSave(); await until('second Save', async () => { const s = await fileState(n); return !s.saving && !s.hasDraft; });
    assert.deepEqual(writeLog().map(w => w.content), [SAVED, OTHER]); assert.equal(await disk(n), OTHER);
    return { after, payloads: writeLog().map(w => w.content) };
  });

  await run('PSD-005', 'AC-003 later input ends equal to the saved content', async () => {
    const n = 'psd005.txt'; await pendingSave(n); await replaceAll(ORIGINAL); await replaceAll(SAVED); await resetProbeEvents();
    await releaseHeld(); await until('settled', async () => !(await fileState(n)).saving); await page.waitForTimeout(800);
    const after = await fileState(n);
    assert.equal(await editorValue(), SAVED); assert.equal(after.hasDraft, false, 'clean after settle'); assert.equal(after.content, SAVED);
    assert.equal(await probeEvents(), 0); assert.equal(await disk(n), SAVED); assert.equal(writeLog().length, 1);
    return { after, payloads: writeLog().map(w => w.content) };
  });

  await run('PSD-006', 'AC-004a failed Save with a differing later edit keeps draft + error, next Save submits it', async () => {
    const n = 'psd006.txt'; await openFile(n); await replaceAll(SAVED);
    mode = 'fail'; await pressSave();
    await until('failed Save settled', async () => { const s = await fileState(n); return !s.saving && s.error; });
    const failed = await fileState(n);
    assert.equal(failed.hasDraft, true); assert.equal(failed.draft, SAVED); assert.equal(failed.content, ORIGINAL); assert.equal(await editorValue(), SAVED);
    // Also: failure with a later edit made while the (failing) Save was pending. Hold-then-fail is not producible with one route mode,
    // so the pending-then-fail window is exercised by unit regressions; here a later edit after the failure must be kept and Save-able.
    await replaceAll(OTHER); mode = 'pass'; await pressSave();
    await until('next Save done', async () => { const s = await fileState(n); return !s.saving && !s.hasDraft; });
    assert.equal(await disk(n), OTHER);
    return { failed, payloads: writeLog().map(w => [w.content, w.outcome]) };
  });

  await run('PSD-007', 'AC-004b failed Save, input reverted to unchanged committed text becomes clean', async () => {
    const n = 'psd007.txt'; await openFile(n); await replaceAll(SAVED);
    mode = 'fail'; await pressSave();
    await until('failed Save settled', async () => { const s = await fileState(n); return !s.saving && s.error; });
    await replaceAll(ORIGINAL);
    const after = await fileState(n);
    assert.equal(after.hasDraft, false, 'clean once input equals the unchanged committed text'); assert.equal(await editorValue(), ORIGINAL);
    assert.equal(await disk(n), ORIGINAL);
    return { after, payloads: writeLog().map(w => [w.content, w.outcome]) };
  });

  await run('PSD-008', 'AC-008 ordinary Save with no later input: clean, no model replacement', async () => {
    const n = 'psd008.txt'; await openFile(n); await replaceAll(SAVED); await resetProbeEvents();
    mode = 'pass'; await pressSave();
    await until('Save done', async () => { const s = await fileState(n); return !s.saving && !s.hasDraft && s.content === SAVED; });
    await page.waitForTimeout(800);
    const events = await probeEvents(); assert.equal(events, 0, 'no model content change after Save');
    assert.equal(await editorValue(), SAVED); assert.equal(await disk(n), SAVED);
    assert.equal(await page.getByText('Changes saved').isVisible(), true);
    return { eventsAfterSave: events, payloads: writeLog().map(w => w.content) };
  });

  await run('PSD-009', 'AC-006 no Save pending: type then undo to committed text is clean', async () => {
    const n = 'psd009.txt'; await openFile(n); await replaceAll(SAVED);
    assert.equal((await fileState(n)).hasDraft, true);
    await undoTo(ORIGINAL);
    const after = await fileState(n); assert.equal(after.hasDraft, false); assert.equal(writeLog().length, 0);
    return { after };
  });
  await run('PSD-010', 'AC-004a Save pending, differing later edit, Save then FAILS: draft + error kept, next Save submits it', async () => {
    const n = 'psd010.txt'; await pendingSave(n, SAVED, 'holdfail'); await replaceAll(OTHER);
    await releaseHeld(); await until('failed Save settled', async () => { const s = await fileState(n); return !s.saving && s.error; }); await page.waitForTimeout(500);
    const failed = await fileState(n);
    assert.equal(failed.hasDraft, true); assert.equal(failed.draft, OTHER); assert.equal(failed.content, ORIGINAL); assert.equal(await editorValue(), OTHER);
    mode = 'pass'; await pressSave(); await until('next Save done', async () => { const s = await fileState(n); return !s.saving && !s.hasDraft; });
    assert.deepEqual(writeLog().map(w => w.content), [SAVED, OTHER]); assert.equal(await disk(n), OTHER);
    return { failed, payloads: writeLog().map(w => [w.content, w.outcome]) };
  });

  await run('PSD-011', 'AC-004b Save pending, input reverted to unchanged committed text, Save then FAILS: clean, no draft', async () => {
    const n = 'psd011.txt'; await pendingSave(n, SAVED, 'holdfail'); await undoTo(ORIGINAL);
    assert.equal((await fileState(n)).hasDraft, true, 'held as draft while pending');
    await releaseHeld(); await until('failed Save settled', async () => { const s = await fileState(n); return !s.saving && s.error; }); await page.waitForTimeout(500);
    const failed = await fileState(n);
    assert.equal(failed.hasDraft, false, 'clean: equals unchanged committed text'); assert.equal(failed.content, ORIGINAL); assert.equal(await editorValue(), ORIGINAL);
    assert.equal(await disk(n), ORIGINAL);
    return { failed, payloads: writeLog().map(w => [w.content, w.outcome]) };
  });
  assert.deepEqual(ev.browserErrors, [], 'Browser errors are not waived');
  if (Object.values(ev.cases).some(c => c.result !== 'Pass')) process.exitCode = 1;
} catch (error) { ev.failure = error.stack; process.exitCode = 1; }
finally {
  if (held?.release) held.release();
  if (browser) { await browser.close(); ev.cleanup.browserClosed = true; }
  ev.cleanup.processes = [];
  for (const child of children.reverse()) { try { ev.cleanup.processes.push(await stop(child)); } catch (error) { ev.cleanup.error = String(error); process.exitCode = 1; } }
  if (installedPage) { await fs.unlink(fixturePage); ev.cleanup.fixturePageRemoved = !existsSync(fixturePage); }
  if (owned) { try { await fs.rm(owned, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); ev.cleanup.ownedRootRemoved = !existsSync(owned); } catch (error) { ev.cleanup.rootError = String(error); process.exitCode = 1; } }
  for (const [name, url] of Object.entries({ base, front })) if (url) {
    try { await fetch(`${url}/rest/health`, { signal: AbortSignal.timeout(1000) }); ev.cleanup[`${name}Closed`] = false; process.exitCode = 1; } catch { ev.cleanup[`${name}Closed`] = true; }
  }
  ev.finishedAt = new Date().toISOString(); await save();
  console.log(JSON.stringify({ cases: Object.fromEntries(Object.entries(ev.cases).map(([k, c]) => [k, c.result])), failure: ev.failure, cleanup: ev.cleanup }));
}

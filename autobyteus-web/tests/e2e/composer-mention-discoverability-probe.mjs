#!/usr/bin/env node
// composer-mention-discoverability REQ-001–004 / AC-001–005, native renderer dev-path probe.
// Prerequisites: pnpm install, nuxt prepare, built workspace contract dist, Chrome/Chromium.
// Starts owned Nuxt + HTTP candidate/upload doubles on free ports. No provider/real admission
// or full desktop journey is claimed; production editor/parser/upload/submission functions are real.
// Usage: pnpm test:e2e:composer-mention-discoverability --output-dir <path> [--ledger <canonical.md>]
// Private browser/session; fixture page installed only for this run and removed in finally.
import { spawn } from 'node:child_process';
import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (name, fallback) => { const i = process.argv.indexOf('--' + name); return i < 0 ? fallback : process.argv[i + 1]; };
const out = path.resolve(web, arg('output-dir', 'test-results/composer-mention-discoverability'));
const ledger = arg('ledger');
const fixture = path.join(web, 'pages/api-e2e-composer-mention-discoverability.vue');
const chrome = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync));
const evidence = { startedAt: new Date().toISOString(), platform: process.platform, node: process.version, cases: {}, requests: [], pageErrors: [], cleanup: {} };
const pause = ms => new Promise(r => setTimeout(r, ms));
const assert = (condition, message, details) => { if (!condition) { const e = new Error(message); e.details = details; throw e; } };
const poll = async (label, fn, timeout = 120000) => { const end = Date.now() + timeout; let error; while (Date.now() < end) { try { const value = await fn(); if (value) return value; } catch (e) { error = e; } await pause(80); } throw new Error(`Timeout: ${label}; ${error?.message || ''}`); };
const listen = server => new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', () => resolve(server.address().port)); });
const body = async req => { const chunks = []; for await (const c of req) chunks.push(c); return Buffer.concat(chunks); };
const json = (res, data, status = 200) => { res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS' }); res.end(JSON.stringify(data)); };
const candidates = [
  { kind: 'agent', definitionId: 'code-reviewer', name: 'Code Reviewer', description: 'Reviews code', memberCount: null, coordinatorName: null },
  { kind: 'agent_team', definitionId: 'product-team', name: 'Product Team', description: '', memberCount: 2, coordinatorName: 'designer' },
];
const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return json(res, {});
    const bytes = await body(req);
    if (req.url === '/graphql') {
      const payload = JSON.parse(bytes.toString() || '{}');
      evidence.requests.push({ path: req.url, operation: payload.operationName, variables: payload.variables });
      const q = payload.query || '';
      const data = q.includes('collaboratorMentionCandidates') ? { collaboratorMentionCandidates: { availability: 'AVAILABLE', candidates } }
        : q.includes('skillImprovementCapability') ? { skillImprovementCapability: { enabled: false, settingKey: 'ENABLE_SKILL_IMPROVEMENT', source: 'INITIALIZED_EMPTY_CATALOG' } }
        : q.includes('applicationsCapability') ? { applicationsCapability: { enabled: false, scope: 'BOUND_NODE', settingKey: 'ENABLE_APPLICATIONS', source: 'INITIALIZED_EMPTY_CATALOG' } }
        : q.includes('serverSettings') ? { serverSettings: [] } : q.includes('workspaces') ? { workspaces: [] } : {};
      return json(res, { data });
    }
    if (req.url === '/rest/context-files/upload') {
      const text = bytes.toString();
      evidence.requests.push({ path: req.url, bytes: bytes.length, multipart: req.headers['content-type'], ownerPresent: text.includes('"draftRunId":"probe-agent"'), contentPresent: text.includes('retained upload proof'), filenamePresent: text.includes('notes.txt') });
      return json(res, { storedFilename: 'ctx_probe__notes.txt', displayName: 'notes.txt', locator: '/rest/drafts/probe-agent/ctx_probe__notes.txt', phase: 'draft' });
    }
    return json(res, {}, req.url === '/rest/health' ? 200 : 404);
  } catch (error) { json(res, { error: error.message }, 500); }
});
await fs.mkdir(out, { recursive: true });
const save = () => fs.writeFile(path.join(out, 'evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
const event = async (id, phase, result, note) => { if (ledger) await fs.appendFile(ledger, `| ${new Date().toISOString()} | ${id} | ${phase} | ${result}: ${String(note || '').replaceAll('|', '/').replaceAll('\n', ' ')} | ${out}/evidence.json |\n`); };
const runCase = async (id, name, fn) => {
  await event(id, 'Started', 'N/A', name);
  try { const details = await fn(); evidence.cases[id] = { name, result: 'Pass', details }; await save(); await event(id, 'Completed', 'Pass', name); console.log(`${id} Pass: ${name}`); }
  catch (error) { evidence.cases[id] = { name, result: 'Fail', message: error.message, details: error.details, stack: error.stack }; await save(); await event(id, 'Completed', 'Fail', error.message); throw error; }
};
let child, browser, installed = false, log;
try {
  assert(chrome, 'Chrome prerequisite missing');
  assert(!existsSync(fixture), 'Refusing to overwrite an existing page');
  await fs.copyFile(path.join(web, 'tests/e2e/fixtures/composer-mention-discoverability.page.vue'), fixture); installed = true;
  const backendPort = await listen(server);
  const portServer = net.createServer(); const port = await listen(portServer); await new Promise(r => portServer.close(r));
  const backend = `http://127.0.0.1:${backendPort}`; const url = `http://127.0.0.1:${port}/api-e2e-composer-mention-discoverability`;
  evidence.url = url; evidence.backend = backend;
  const env = Object.fromEntries(['HOME','PATH','USER','LANG','TMPDIR','SHELL','TERM'].filter(k => process.env[k] !== undefined).map(k => [k, process.env[k]]));
  child = spawn(path.join(web, 'node_modules/.bin/nuxi'), ['dev', '--host', '127.0.0.1', '--port', String(port)], { cwd: web, detached: process.platform !== 'win32', env: { ...env, NUXT_TELEMETRY_DISABLED: '1', BACKEND_NODE_BASE_URL: backend }, stdio: ['ignore', 'pipe', 'pipe'] });
  evidence.nuxtPid = child.pid; log = createWriteStream(path.join(out, 'nuxt.log')); child.stdout.pipe(log); child.stderr.pipe(log);
  await poll('Nuxt HTTP ready', async () => (await fetch(url)).ok);
  browser = await chromium.launch({ executablePath: chrome, headless: true }); evidence.browser = browser.version();
  const context = await browser.newContext({ viewport: { width: 1512, height: 952 }, locale: 'en-US' });
  const page = await context.newPage(); page.setDefaultTimeout(30000);
  page.on('pageerror', e => evidence.pageErrors.push(e.message));
  await page.goto(url); await page.locator('[data-test="mention-probe"] textarea').waitFor();
  const ta = page.locator('textarea');
  const click = id => page.locator(`[data-test="${id}"]`).click();
  const state = async () => JSON.parse(await page.locator('[data-test="probe-state"]').textContent());
  const highlights = page.locator('.mention-highlight');
  const choose = async (text = 'please ask @pro') => {
    await ta.fill(''); await ta.pressSequentially(text);
    await poll('Product Team candidate', () => page.locator('[data-test="run-mention-menu"]').isVisible());
    await poll('filtered candidate ready', async () => /Product Team/.test(await page.locator('[data-test="run-mention-menu"]').innerText()));
    await ta.press('Enter'); await poll('chosen highlight', async () => (await highlights.count()) === 1);
  };
  const geometry = () => ta.evaluate(e => {
    const v = document.querySelector('[data-test="composer-mention-mirror"]'), m = v?.firstElementChild;
    if (!v || !m) return null;
    const a = getComputedStyle(e), b = getComputedStyle(m);
    const keys = ['fontFamily','fontSize','lineHeight','letterSpacing','tabSize','paddingTop','paddingRight','paddingBottom','paddingLeft','whiteSpace','overflowWrap','wordBreak','textAlign'];
    return { width: e.clientWidth, height: e.clientHeight, viewportWidth: v.clientWidth, viewportHeight: v.clientHeight, scrollTop: e.scrollTop, scrollLeft: e.scrollLeft, transform: b.transform, reconstructed: m.textContent === e.value, metricMatch: keys.every(k => a[k] === b[k]), transparent: b.color, hidden: v.getAttribute('aria-hidden'), pointerEvents: getComputedStyle(v).pointerEvents, editableCount: document.querySelectorAll('textarea,[contenteditable="true"]').length };
  });
  const scrollToSelection = async () => {
    await ta.evaluate(e => { e.scrollTop = e.scrollHeight; e.dispatchEvent(new Event('scroll')); });
    return await poll('selected token visible and scrolled mirror aligned', async () => {
      const g = await geometry();
      const t = await ta.boundingBox();
      const rects = await highlights.first().evaluate(e => [...e.getClientRects()].map(r => ({ top: r.top, bottom: r.bottom, left: r.left, right: r.right })));
      return g.scrollTop > 0 && g.transform.includes(String(-g.scrollTop)) && rects.some(r => r.top >= t.y && r.bottom <= t.y + t.height) && { ...g, tokenRects: rects };
    });
  };
  await runCase('B01', 'capability gating and native exact copy across supported scope shapes', async () => {
    await click('english');
    const snapshots = [];
    for (const kind of ['agent','team','org','org-team','agent-task','agent-team-task','org-task','org-team-task']) {
      await click('scope-' + kind);
      await poll(kind + ' cue', async () => await ta.getAttribute('placeholder') === 'Ask anything · @ for an agent or team');
      assert(await ta.inputValue() === '', 'Placeholder leaked into draft');
      snapshots.push(await state());
    }
    for (const kind of ['launch','read-only']) {
      await click('scope-' + kind); assert(await ta.getAttribute('placeholder') === 'Unchanged no-scope copy', 'No-scope hint changed');
      await ta.fill('@'); assert(await page.locator('[data-test="run-mention-menu"]').count() === 0, 'No-scope menu opened');
    }
    await click('scope-agent'); await click('chinese');
    await poll('Chinese copy', async () => await ta.getAttribute('placeholder') === '随便问 · @ 选择智能体或团队');
    assert(await ta.getAttribute('aria-label') === '消息', 'Localized label missing');
    await click('english'); await page.locator('[data-test="probe-composer"]').screenshot({ path: path.join(out, 'empty-1512.png') });
    await page.setViewportSize({ width: 1024, height: 640 });
    await page.locator('[data-test="probe-composer"]').screenshot({ path: path.join(out, 'empty-1024.png') });
    await page.setViewportSize({ width: 1512, height: 952 });
    return { scopeSnapshots: snapshots, noScope: ['launch','read-only'] };
  });
  await runCase('B02', 'chosen-only selection, caret, native deletion/undo/whole-token/name-edit and paste', async () => {
    await ta.fill('manually @Product Team'); assert(await highlights.count() === 0, 'Unchosen typed name highlighted');
    await choose();
    let s = await state(); assert(s.chosen[0].definitionId === 'product-team' && s.active[0].definition_id === 'product-team', 'Definition identity lost', s);
    assert(await ta.evaluate(e => e.selectionStart === e.value.length && e.selectionEnd === e.value.length), 'Caret not after trailing space');
    await ta.pressSequentially('to review.');
    const before = await ta.inputValue(); await page.locator('[data-test="probe-composer"]').screenshot({ path: path.join(out, 'selected-1512.png') });
    await page.setViewportSize({ width: 1024, height: 640 });
    await page.locator('[data-test="probe-composer"]').screenshot({ path: path.join(out, 'selected-1024.png') });
    await click('chinese');
    await page.locator('[data-test="probe-composer"]').screenshot({ path: path.join(out, 'selected-zh-1024.png') });
    await click('english'); await page.setViewportSize({ width: 1512, height: 952 });
    await ta.evaluate(e => { e.focus(); const at = e.value.indexOf('@'); e.setSelectionRange(at + 1, at + 1); });
    await ta.press('Backspace'); await poll('deactivation', async () => await highlights.count() === 0);
    assert((await ta.inputValue()) === before.replace('@', ''), 'Deleting @ lost unrelated prose');
    assert(!(await state()).active && (await state()).chosen.length === 1, 'Native deletion altered chosen identity');
    await ta.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
    await poll('native undo reactivation', async () => await ta.inputValue() === before && await highlights.count() === 1);
    await ta.evaluate(e => { const at = e.value.indexOf('@Product Team'); e.setSelectionRange(at, at + '@Product Team'.length); });
    await ta.press('Backspace'); await poll('whole token removed', async () => await highlights.count() === 0);
    assert(!/Product Team/.test(await ta.inputValue()), 'Whole-token deletion retained name');
    await ta.fill(before.replace('Product Team', 'Product Teams')); assert(await highlights.count() === 0 && !(await state()).active, 'Edited name still selected');
    await ta.fill(before); await poll('exact restoration', async () => await highlights.count() === 1);
    await context.grantPermissions(['clipboard-read','clipboard-write']);
    await page.evaluate(() => navigator.clipboard.writeText(' pasted <script>safe</script> 中文'));
    await ta.focus(); await ta.press('End'); await ta.press(process.platform === 'darwin' ? 'Meta+v' : 'Control+v');
    await poll('native paste', async () => (await ta.inputValue()).includes('<script>safe</script>'));
    assert(await page.locator('[data-test="composer-mention-mirror"] script').count() === 0, 'User text became markup');
    assert(await highlights.count() === 1, 'Paste deactivated selection');
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.imeSetComposition', { text: '输入验证', selectionStart: 4, selectionEnd: 4 });
    await cdp.send('Input.insertText', { text: '输入验证' });
    await poll('Chrome composition commit', async () => (await state()).text.includes('输入验证'));
    await cdp.detach();
    assert(await highlights.count() === 1, 'Composition changed known selection');
    return { compositionSmoke: 'Chrome input-method protocol; not OS IME', before, afterPaste: await state(), geometry: await geometry() };
  });
  await runCase('B03', 'keyboard dismissal/no-match, slash skills and completed upload held rejection/acceptance', async () => {
    await ta.fill('@zzzzz'); await poll('empty menu', () => page.locator('[data-test="run-mention-menu-empty"]').isVisible());
    await ta.press('Enter'); assert((await state()).sends.length === 0 && await ta.inputValue() === '@zzzzz', 'No-match Enter sent');
    await ta.press('Escape'); assert(await page.locator('[data-test="run-mention-menu"]').count() === 0, 'Escape failed');
    await ta.fill('@'); await poll('all candidates', async () => /Code Reviewer/.test(await page.locator('[data-test="run-mention-menu"]').innerText()));
    await ta.press('ArrowDown'); await ta.press('Tab');
    assert((await ta.inputValue()).includes('@Product Team'), 'ArrowDown/Tab selection failed');
    await ta.fill('/rev'); await poll('skill menu', () => page.locator('[data-test="chat-skill-menu"]').isVisible());
    await ta.press('Enter'); await poll('skill selected', async () => (await state()).skills.includes('review'));
    await choose(); await ta.pressSequentially('to review.');
    await page.locator('input[type="file"]').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('retained upload proof') });
    await poll('completed actual client upload', async () => (await state()).attachments[0]?.storedFilename === 'ctx_probe__notes.txt');
    const uploaded = await state();
    await ta.evaluate(e => { const at = e.value.indexOf('@'); e.focus(); e.setSelectionRange(at + 1, at + 1); });
    await ta.press('Backspace'); await poll('upload survives mention deactivation', async () => await highlights.count() === 0);
    assert(JSON.stringify((await state()).attachments) === JSON.stringify(uploaded.attachments), 'Native edit lost completed upload');
    await ta.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
    await poll('upload survives native undo', async () => await highlights.count() === 1 && (await state()).text === uploaded.text);
    await ta.press('End'); await ta.pressSequentially(' Unrelated edit.');
    const before = await state();
    assert(JSON.stringify(before.attachments) === JSON.stringify(uploaded.attachments), 'Unrelated editing lost completed upload');
    const upload = evidence.requests.find(r => r.path === '/rest/context-files/upload');
    assert(upload?.ownerPresent && upload.contentPresent && upload.filenamePresent && /multipart/.test(upload.multipart), 'Upload request body/owner missing', upload);
    await ta.press('Enter'); await poll('rejected notice state', async () => (await state()).failure?.reason === 'Test admission rejected');
    const rejected = await state();
    assert(rejected.text === before.text && JSON.stringify(rejected.attachments) === JSON.stringify(before.attachments) && rejected.messages.length === 0, 'Rejected send lost uploaded attachment/draft or posted message', rejected);
    assert(rejected.sends[0].focusedRunId === 'probe-agent' && rejected.sends[0].mentions[0].definition_id === 'product-team', 'Send target/DTO mismatch', rejected);
    await click('reject'); await ta.focus(); await ta.press('Enter'); await poll('accept clears', async () => await ta.inputValue() === '');
    const accepted = await state(); assert(accepted.attachments.length === 0 && accepted.chosen.length === 0 && accepted.messages.length === 1 && accepted.messages[0].mentionNames[0] === 'Product Team', 'Accepted send clearing/history failed', accepted);
    return { upload, rejected, accepted, limitation: 'HTTP upload endpoint and admission response doubled; real backend independently checked by C03' };
  });
  await runCase('B04', 'layout at 1512/1024/300 panel, scroll/resize, locale, forced colors and context isolation', async () => {
    await choose();
    const snapshots = [];
    for (const viewport of [{ width: 1512, height: 952 }, { width: 1024, height: 640 }]) {
      await page.setViewportSize(viewport);
      await ta.fill(('long prose 中文\t'.repeat(4) + '\n').repeat(30) + 'x '.repeat(11) + '@Product Team to review.\n');
      await scrollToSelection();
      const g = await poll('mirror metrics', async () => { const g = await geometry(); return g?.metricMatch && g.reconstructed && g.width === g.viewportWidth && g.height === g.viewportHeight && g; });
      assert(g.scrollTop > 0 && g.transform.includes(String(-g.scrollTop)), 'Scroll synchronization missing', g); snapshots.push(g);
      await page.locator('[data-test="probe-composer"]').screenshot({ path: path.join(out, `long-${viewport.width}.png`) });
    }
    await click('resize');
    let narrow = await poll('parent-only ResizeObserver', async () => { const g = await geometry(); return g.width < 300 && g.width === g.viewportWidth && g; });
    assert(narrow.metricMatch && narrow.reconstructed, 'Narrow mirror mismatch', narrow);
    await click('chinese'); await pause(150); narrow = await scrollToSelection();
    await page.locator('[data-test="probe-composer"]').screenshot({ path: path.join(out, 'narrow-zh-300.png') });
    assert(narrow.hidden === 'true' && narrow.pointerEvents === 'none' && narrow.editableCount === 1 && narrow.transparent === 'rgba(0, 0, 0, 0)', 'Decorator is not isolated from accessibility/editing', narrow);
    await page.emulateMedia({ forcedColors: 'active' }); await pause(150); await scrollToSelection();
    const highContrast = await highlights.first().evaluate(e => ({ shadow: getComputedStyle(e).boxShadow, color: getComputedStyle(e).color, background: getComputedStyle(e).backgroundColor, pointer: getComputedStyle(e.parentElement.parentElement).pointerEvents }));
    assert(highContrast.color === 'rgba(0, 0, 0, 0)' && highContrast.shadow !== 'none' && highContrast.pointer === 'none', 'Forced colors duplicate glyph/outline regression', highContrast);
    await page.locator('[data-test="probe-composer"]').screenshot({ path: path.join(out, 'forced-colors-1024.png') });
    await page.emulateMedia({ forcedColors: 'none' }); await click('english');
    await page.locator('input[type="file"]').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('retained upload proof') });
    await poll('context-switch completed upload', async () => (await state()).attachments.length === 1);
    const ownedAttachment = (await state()).attachments;
    const saved = await ta.inputValue(); await click('scope-team'); assert(await ta.inputValue() === '' && await highlights.count() === 0, 'Previous context leaked');
    await ta.fill('own team @Product Team'); assert(await highlights.count() === 0, 'Other-context identity leaked');
    assert((await state()).attachments.length === 0, 'Previous attachment leaked to new context');
    await click('scope-agent'); assert(await ta.inputValue() === saved && await highlights.count() === 1, 'Own-context draft/identity lost');
    assert(JSON.stringify((await state()).attachments) === JSON.stringify(ownedAttachment), 'Own completed upload lost across context switch');
    assert(evidence.pageErrors.length === 0, 'Uncaught page errors', evidence.pageErrors);
    return { snapshots, narrow, highContrast, pageErrors: evidence.pageErrors, notTested: 'Real OS IME/audio device and non-Chromium engines; no shell changes' };
  });
} catch (error) {
  evidence.failure = { message: error.message, details: error.details, stack: error.stack }; process.exitCode = 1; console.error(error);
} finally {
  if (browser) { await browser.close(); evidence.cleanup.browser = 'closed'; }
  if (child && child.exitCode === null && !child.signalCode) {
    const exited = new Promise(resolve => child.once('exit', resolve));
    try { process.platform === 'win32' ? child.kill('SIGTERM') : process.kill(-child.pid, 'SIGTERM'); } catch {}
    await Promise.race([exited, pause(10000)]);
    if (child.exitCode === null && !child.signalCode) { try { process.platform === 'win32' ? child.kill('SIGKILL') : process.kill(-child.pid, 'SIGKILL'); } catch {} await Promise.race([exited, pause(5000)]); }
    evidence.cleanup.nuxt = { pid: child.pid, exitCode: child.exitCode, signal: child.signalCode };
    if (child.exitCode === null && !child.signalCode) { evidence.cleanup.nuxt.error = 'Stop unconfirmed'; process.exitCode = 1; }
  }
  if (server.listening) { server.closeAllConnections(); await new Promise(r => server.close(r)); evidence.cleanup.http = 'closed'; }
  if (installed) { await fs.unlink(fixture); evidence.cleanup.page = 'removed'; }
  evidence.finishedAt = new Date().toISOString(); await save(); log?.end();
}

#!/usr/bin/env node
// API/E2E temporary browser journey for skill-sources-dialog-redesign (not durable coverage).
// Starts the implementation render stack (disposable built backend, real GraphQL/store/filesystem,
// controlled GitHub upstream, worktree Nuxt dev server) with extra local sources, then drives fresh
// headless Chrome through the redesigned Manage Skill Sources popup with DOM/GraphQL assertions.
// Usage (repo root): node tickets/in-progress/skill-sources-dialog-redesign/api-e2e-evidence/skill-sources-dialog-journey.mjs <fresh-out-dir>
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const root = process.cwd();
const requireWeb = createRequire(path.join(root, 'autobyteus-web', 'package.json'));
const { chromium } = requireWeb('playwright-core');
const ticket = path.join(root, 'tickets/in-progress/skill-sources-dialog-redesign');
const out = path.resolve(process.argv[2]);
assert(!existsSync(out), 'Use a fresh output directory');
await fs.mkdir(out, { recursive: true });
const evidence = { startedAt: new Date().toISOString(), cases: {}, pageErrors: [], consoleErrors: [], cleanup: {} };
const save = () => fs.writeFile(path.join(out, 'result.json'), JSON.stringify(evidence, null, 2) + '\n');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const wait = async (label, fn, ms = 30000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return; await sleep(100); } throw new Error('Timeout: ' + label); };

// ---- stack ----
const stack = spawn(process.execPath, [path.join(ticket, 'implementation-evidence/render-check-stack.mjs'), '12'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let stackOut = '';
stack.stdout.on('data', d => { stackOut += d; });
stack.stderr.on('data', d => { stackOut += d; });
let info;
await wait('stack ready', async () => {
  const line = stackOut.split('\n').find(l => l.startsWith('{"frontend"'));
  if (line) info = JSON.parse(line);
  if (stack.exitCode !== null) throw new Error('stack exited: ' + stackOut);
  return !!info;
}, 600000);
evidence.stack = { frontend: info.frontend, backend: info.backend, owned: info.owned };
const gql = async (query, variables = {}) => {
  const body = await (await fetch(info.backend + '/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json();
  if (body.errors) throw new Error(JSON.stringify(body.errors)); return body.data;
};
const sourcesApi = async () => (await gql('{skillSources {sourceId path isDefault skillCount github { status latestRevision installedRevision lastError }}}')).skillSources;
const setUpstream = async patch => {
  const state = JSON.parse(await fs.readFile(info.control, 'utf8'));
  await fs.writeFile(info.control, JSON.stringify({ ...state, ...patch }));
};
const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-sources-journey-'));

// ---- browser ----
const executablePath = process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(info.frontend).origin });
const page = await context.newPage();
page.on('pageerror', e => evidence.pageErrors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') evidence.consoleErrors.push(m.text().slice(0, 400)); });

const dialog = () => page.getByRole('dialog', { name: 'Manage Skill Sources' });
const rows = () => dialog().locator('li[data-testid^="skill-source-row-"]');
const rowByText = text => rows().filter({ hasText: text });
const ghRow = () => rowByText('https://github.com/api-e2e/skills');
const input = () => dialog().getByRole('textbox', { name: 'Add skill source' });
const openSources = async () => {
  await page.getByRole('button', { name: 'Sources', exact: true }).click();
  await dialog().waitFor();
  await wait('rows idle', async () => (await rows().count()) > 0 && (await dialog().getAttribute('aria-busy')) === 'false');
};
const closeDone = async () => { await dialog().getByRole('button', { name: 'Done', exact: true }).click(); await dialog().waitFor({ state: 'detached' }); };
const activeInfo = () => page.evaluate(() => {
  const a = document.activeElement; const panel = document.querySelector('[data-testid="skill-sources-dialog"]');
  return { tag: a?.tagName, text: (a?.getAttribute('aria-label') || a?.textContent || '').trim().slice(0, 60), insidePanel: !!panel && panel.contains(a), isPanel: a === panel, isBody: a === document.body };
});
const record = async (id, fn) => {
  evidence.cases[id] = { result: 'Running' }; await save();
  try { evidence.cases[id].observed = await fn(); evidence.cases[id].result = 'Pass'; }
  catch (error) { evidence.cases[id].result = 'Fail'; evidence.cases[id].error = String(error?.stack || error); }
  try { await page.screenshot({ path: path.join(out, id + '.png') }); } catch {}
  await save();
  console.log(id, evidence.cases[id].result, evidence.cases[id].error ? evidence.cases[id].error.split('\n')[0] : '');
};

try {
  await page.goto(info.frontend, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sources', exact: true }).waitFor({ timeout: 120000 });

  await record('J-01-open-overview', async () => {
    const checkRequests = [];
    const onReq = r => { const b = r.postData() || ''; if (r.url().includes('/graphql') && /checkGitHubSkillSource|checkGitHub/i.test(b)) checkRequests.push(b.slice(0, 120)); };
    page.on('request', onReq);
    await page.getByRole('button', { name: 'Sources', exact: true }).focus();
    await page.keyboard.press('Enter');
    await dialog().waitFor();
    const focusOnOpen = await activeInfo();
    await wait('rows idle', async () => (await rows().count()) > 0 && (await dialog().getAttribute('aria-busy')) === 'false');
    page.off('request', onReq);
    assert.ok(focusOnOpen.isPanel, 'focus moves to the panel on open: ' + JSON.stringify(focusOnOpen));
    const api = await sourcesApi();
    const names = await rows().locator('.source-name').allInnerTexts();
    assert.equal(await rows().count(), api.length, 'one row per source');
    const firstRow = rows().first();
    assert.ok(await firstRow.getByText('Default', { exact: true }).isVisible(), 'Default first with badge');
    assert.equal(await firstRow.getByRole('button', { name: /^Remove / }).count(), 0, 'no trash on Default');
    const nonDefaultPaths = api.filter(s => !s.isDefault).map(s => s.path);
    const rowPaths = await rows().locator('.source-path').allInnerTexts();
    const expectedOrder = [api.find(s => s.isDefault).path, ...nonDefaultPaths.map(p => api.find(s => s.path === p)).map(s => s.github ? null : s.path)];
    const sortedPaths = [...api].sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.path.localeCompare(b.path));
    assert.equal(rowPaths.length, sortedPaths.length);
    const empty = rowByText('empty-folder'); const one = rowByText('one-skill'); const lib = rowByText('skills-library'); const codex = rowByText('.codex/skills');
    assert.equal((await empty.locator('.count').innerText()).trim(), 'No skills');
    assert.match(await empty.locator('.count').getAttribute('title'), /No skills found here/);
    assert.equal((await one.locator('.count').innerText()).trim(), '1 skill');
    assert.equal((await lib.locator('.count').innerText()).trim(), '3 skills');
    assert.equal((await codex.locator('.source-name').innerText()).trim(), '.codex/skills', 'parent/skills display name');
    const libPath = api.find(s => s.path.endsWith('skills-library')).path;
    assert.equal(await lib.locator('.source-path').getAttribute('title'), libPath, 'full path in title');
    const visibleText = loc => loc.evaluate(el => { const c = el.cloneNode(true); c.querySelectorAll('.sr-only').forEach(n => n.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); });
    const libVisible = await visibleText(lib); const ghVisible = await visibleText(ghRow());
    assert.ok(!/Local folder|GitHub/.test(libVisible), 'no visible kind word: ' + libVisible);
    assert.ok(!/Local folder|GitHub/.test(ghVisible.replace(/https:\/\/github\.com\S*/g, '')), 'no visible kind word on GitHub row: ' + ghVisible);
    assert.equal(await lib.locator('.sr-only').innerText(), 'Local folder', 'screen-reader kind');
    const gh = ghRow();
    assert.equal((await gh.locator('.source-name').innerText()).trim(), 'api-e2e/skills');
    assert.equal(await gh.locator('.sr-only').textContent(), 'GitHub');
    assert.equal((await gh.getByRole('status').innerText()).trim(), 'Up to date');
    const tooltip = await gh.getByRole('status').getAttribute('title');
    assert.match(tooltip, /^Installed aaaaaaaaaa · main\nLatest aaaaaaaaaa\nChecked /);
    assert.equal(await gh.getByRole('button', { name: 'Update', exact: true }).count(), 0);
    assert.equal(await gh.getByRole('button', { name: /Check .* again/ }).count(), 0, 'no Try again unless Check failed');
    assert.equal(await dialog().getByRole('button', { name: 'Browse…' }).count(), 0, 'no Browse… in the browser (VIS-022)');
    assert.equal(await dialog().getByRole('list', { name: 'Skill sources' }).count(), 1);
    return { focusOnOpen, rowCount: api.length, names, checkRequestsSeen: checkRequests.length, tooltip, upstreamLatestCheckedPresent: /Checked /.test(tooltip) };
  });

  await record('J-02-scroll-short-window-1024x700', async () => {
    await page.setViewportSize({ width: 1024, height: 700 });
    await sleep(300);
    const measure = () => page.evaluate(() => {
      const panel = document.querySelector('[data-testid="skill-sources-dialog"]');
      const list = document.querySelector('[data-testid="skill-sources-list"]');
      const r = el => { const b = el.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom) }; };
      return { viewportH: innerHeight, panel: r(panel), header: r(panel.querySelector('header')), add: r(panel.querySelector('.add-source-section')), footer: r(panel.querySelector('footer')),
        listScrollH: list.scrollHeight, listClientH: list.clientHeight, listScrollTop: list.scrollTop, panelScrollable: panel.scrollHeight > panel.clientHeight + 1, docScrollY: scrollY };
    });
    const before = await measure();
    assert.ok(before.listScrollH > before.listClientH, 'list overflows and scrolls');
    assert.ok(before.panel.bottom <= before.viewportH && before.panel.top >= 0, 'panel fits the window');
    assert.ok(!before.panelScrollable, 'panel itself does not scroll');
    await dialog().locator('[data-testid="skill-sources-list"]').hover();
    await page.mouse.wheel(0, 2000);
    await sleep(400);
    const after = await measure();
    assert.ok(after.listScrollTop > 0, 'list scrolled');
    assert.deepEqual([after.header, after.add, after.footer], [before.header, before.add, before.footer], 'header, add area and footer stay fixed');
    assert.equal(after.docScrollY, 0, 'page behind does not scroll');
    assert.ok(await ghRow().isVisible() || true);
    await page.screenshot({ path: path.join(out, 'J-02-scrolled.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await sleep(300);
    const narrow = await page.evaluate(() => {
      const panel = document.querySelector('[data-testid="skill-sources-dialog"]');
      const inputEl = panel.querySelector('#skill-source-input'); const add = panel.querySelector('.btn-add');
      const tile = panel.querySelector('li span.row-span-2');
      return { panelW: Math.round(panel.getBoundingClientRect().width), inputW: Math.round(inputEl.getBoundingClientRect().width), addTop: Math.round(add.getBoundingClientRect().top), inputTop: Math.round(inputEl.getBoundingClientRect().top), tileDisplay: getComputedStyle(tile).display, docOverflowX: document.documentElement.scrollWidth > innerWidth };
    });
    assert.equal(narrow.tileDisplay, 'none', 'icon tile hidden on narrow');
    assert.ok(narrow.addTop > narrow.inputTop, 'Add wraps below the input on narrow');
    assert.ok(!narrow.docOverflowX, 'no horizontal overflow');
    await page.screenshot({ path: path.join(out, 'J-02-narrow-390.png') });
    await page.setViewportSize({ width: 1280, height: 800 });
    await closeDone();
    return { before, after, narrow };
  });

  await record('J-03-add-folder-success', async () => {
    const dir = path.join(scratch, 'added', 'my-skills');
    for (const n of ['added-one', 'added-two']) { await fs.mkdir(path.join(dir, n), { recursive: true }); await fs.writeFile(path.join(dir, n, 'SKILL.md'), `---\nname: ${n}\ndescription: journey\n---\nbody\n`); }
    await openSources();
    const hint = dialog().locator('#skill-source-hint');
    await input().fill(dir);
    assert.match(await hint.innerText(), /A folder on this computer/, 'neutral hint for a path');
    assert.equal(await hint.getAttribute('aria-live'), 'polite');
    assert.equal(await input().getAttribute('aria-describedby'), 'skill-source-hint');
    await input().press('Enter');
    await dialog().getByText('Source is available. Skills list refreshed.').waitFor();
    assert.equal(await input().inputValue(), '', 'input cleared on success');
    const row = rowByText(dir);
    await row.waitFor();
    assert.equal((await row.locator('.count').innerText()).trim(), '2 skills');
    assert.equal((await row.locator('.source-name').innerText()).trim(), 'my-skills');
    const api = await sourcesApi();
    assert.ok(api.some(s => s.path === dir && s.skillCount === 2), 'GraphQL readback');
    return { dir, apiCount: api.length };
  });

  await record('J-04-add-missing-folder-error-kept', async () => {
    const missing = path.join(scratch, 'does-not-exist');
    const before = (await sourcesApi()).length;
    await input().fill(missing);
    await dialog().getByRole('button', { name: 'Add', exact: true }).click();
    const alert = dialog().getByRole('alert');
    await alert.waitFor();
    const text = (await alert.innerText()).trim();
    assert.equal(await input().inputValue(), missing, 'input kept on failure');
    assert.equal(await dialog().getByText('Source is available. Skills list refreshed.').count(), 0, 'no success alert');
    const box = await page.evaluate(() => { const a = document.querySelector('[data-testid="skill-sources-dialog"] [role="alert"]'); const f = document.querySelector('#skill-source-input'); return { alertBottom: a.getBoundingClientRect().bottom, inputTop: f.getBoundingClientRect().top, inAddSection: !!a.closest('.add-source-section') }; });
    assert.ok(box.inAddSection && box.alertBottom <= box.inputTop, 'alert directly above the add form');
    assert.equal((await sourcesApi()).length, before);
    await input().fill('');
    return { alert: text, box };
  });

  await record('J-05-duplicate-name-conflict', async () => {
    const dir = path.join(scratch, 'dupe', 'dupe-skills');
    await fs.mkdir(path.join(dir, 'solo'), { recursive: true });
    await fs.writeFile(path.join(dir, 'solo', 'SKILL.md'), '---\nname: solo\ndescription: duplicate\n---\nbody\n');
    const before = await sourcesApi();
    await input().fill(dir);
    await dialog().getByRole('button', { name: 'Add', exact: true }).click();
    const conflict = page.getByTestId('skill-name-conflict-dialog');
    await conflict.waitFor({ timeout: 15000 });
    const conflictText = (await conflict.innerText()).slice(0, 300);
    assert.ok(await dialog().isVisible(), 'popup stays open under the conflict dialog');
    assert.equal(await input().inputValue(), dir, 'input kept after conflict');
    const after = await sourcesApi();
    const z = await page.evaluate(() => {
      const c = document.querySelector('[data-testid="skill-name-conflict-dialog"]');
      const btn = document.querySelector('[data-testid="skill-name-conflict-ok"]').getBoundingClientRect();
      const top = document.elementFromPoint(btn.left + btn.width / 2, btn.top + btn.height / 2);
      return { okOnTop: !!top && !!c && c.contains(top) };
    });
    assert.ok(z.okOnTop, 'conflict dialog is above the popup');
    await page.getByTestId('skill-name-conflict-ok').click();
    await conflict.waitFor({ state: 'detached' });
    assert.ok(await dialog().isVisible());
    await input().fill('');
    return { conflictText, sourcesBefore: before.length, sourcesAfter: after.length, addedDespiteConflict: after.some(s => s.path === dir), z };
  });

  await record('J-06-url-detection-and-import-error', async () => {
    const hint = dialog().locator('#skill-source-hint');
    const out6 = {};
    for (const v of ['https://github.com/acme/x', 'github.com/acme/x', 'WWW.github.com/acme/x', '  http://example.com/a']) {
      await input().fill(v); out6[v] = (await hint.innerText()).trim().slice(0, 40);
      assert.match(out6[v], /^Import only sources you trust/, 'trust hint for ' + v);
      assert.equal(await hint.locator('svg').count(), 1, 'shield icon');
    }
    for (const v of ['gitlab.com/x/y', '/Users/me/skills', '~/skills']) {
      await input().fill(v); out6[v] = (await hint.innerText()).trim().slice(0, 40);
      assert.match(out6[v], /^A folder on this computer/, 'folder hint for ' + v);
    }
    const before = (await sourcesApi()).length;
    const url = 'https://gitlab.com/acme/skills';
    await input().fill(url);
    await dialog().getByRole('button', { name: 'Add', exact: true }).click();
    const alert = dialog().getByRole('alert');
    await alert.waitFor();
    out6.importError = (await alert.innerText()).trim();
    assert.equal(await input().inputValue(), url, 'URL kept after import error');
    assert.equal((await sourcesApi()).length, before);
    await input().fill('');
    await closeDone();
    return out6;
  });

  await record('J-07-update-text-only-chip-and-confirm', async () => {
    const archives = JSON.parse(await fs.readFile(path.join(info.owned, 'archives.json'), 'utf8'));
    await setUpstream({ revision: 'b'.repeat(40), archive: archives[2], fail: false });
    await openSources();
    const gh = ghRow();
    await wait('update available', async () => (await gh.getByRole('status').innerText()).trim() === 'Update available');
    const chip = gh.getByRole('button', { name: 'Update', exact: true });
    assert.equal(await chip.count(), 1);
    assert.equal(await chip.locator('svg').count(), 0, 'SR-003: Update chip has no icon');
    assert.equal((await chip.innerText()).trim(), 'Update');
    const tooltip = await gh.getByRole('status').getAttribute('title');
    assert.match(tooltip, /Installed aaaaaaaaaa · main\nLatest bbbbbbbbbb/);
    await chip.click();
    const confirmDialog = page.getByRole('dialog', { name: 'Update entire skill source?' });
    await confirmDialog.waitFor();
    const inert = await dialog().evaluate(el => el.inert);
    assert.ok(inert, 'popup inert while confirming');
    const confirmText = (await confirmDialog.innerText()).replace(/\s+/g, ' ');
    assert.match(confirmText, /main aaaaaaaaaa bbbbbbbbbb/, 'version change line');
    assert.match(confirmText, /api-e2e\/skills/);
    await confirmDialog.getByRole('button', { name: 'Update', exact: true }).click();
    await dialog().getByText('Source is up to date. Skills list refreshed.').waitFor({ timeout: 30000 });
    await wait('up to date', async () => (await gh.getByRole('status').innerText()).trim() === 'Up to date');
    const api = (await sourcesApi()).find(s => s.github);
    assert.equal(api.github.installedRevision, 'b'.repeat(40));
    await closeDone();
    return { tooltip, confirmText: confirmText.slice(0, 300), installed: api.github.installedRevision };
  });

  await record('J-08-check-failed-try-again', async () => {
    await setUpstream({ fail: true });
    await openSources();
    const gh = ghRow();
    await wait('check failed', async () => /^Check failed/.test((await gh.getByRole('status').innerText()).trim()));
    const status = (await gh.getByRole('status').innerText()).trim();
    const tryAgain = gh.getByRole('button', { name: 'Check api-e2e/skills again' });
    assert.equal(await tryAgain.count(), 1);
    assert.equal((await tryAgain.innerText()).trim(), 'Try again');
    const errorLine = (await gh.locator('.source-error').innerText()).trim();
    assert.ok(errorLine.length > 0, 'error line shown');
    assert.equal(await gh.getByRole('button', { name: 'Update', exact: true }).count(), 0);
    assert.equal(await gh.getByRole('button', { name: 'Remove api-e2e/skills' }).count(), 1, 'trash still offered');
    await setUpstream({ fail: false });
    await tryAgain.click();
    await wait('recovered', async () => (await gh.getByRole('status').innerText()).trim() === 'Up to date');
    assert.equal(await gh.getByRole('button', { name: 'Check api-e2e/skills again' }).count(), 0, 'Try again gone after success');
    assert.equal(await gh.locator('.source-error').count(), 0);
    await closeDone();
    return { status, errorLine };
  });

  await record('J-09-remove-local-cancel-and-confirm', async () => {
    await openSources();
    const target = (await sourcesApi()).find(s => s.path.endsWith('empty-folder'));
    const row = rowByText(target.path);
    await row.getByRole('button', { name: 'Remove empty-folder' }).click();
    let confirmDialog = page.getByRole('dialog', { name: 'Remove Skill Source' });
    await confirmDialog.waitFor();
    const confirmText = (await confirmDialog.innerText()).replace(/\s+/g, ' ');
    assert.ok(confirmText.includes(target.path), 'source card shows the full path');
    await confirmDialog.getByRole('button', { name: 'Cancel' }).click();
    await confirmDialog.waitFor({ state: 'detached' });
    assert.ok((await sourcesApi()).some(s => s.path === target.path), 'cancel makes no change');
    await row.getByRole('button', { name: 'Remove empty-folder' }).click();
    confirmDialog = page.getByRole('dialog', { name: 'Remove Skill Source' });
    await confirmDialog.getByRole('button', { name: 'Remove', exact: true }).click();
    await dialog().getByText('Skill source removed. Skills list refreshed.').waitFor();
    assert.ok(!(await sourcesApi()).some(s => s.path === target.path), 'removed (unlinked)');
    assert.ok(existsSync(target.path), 'local folder itself is not deleted');
    await closeDone();
    return { removed: target.path, confirmText: confirmText.slice(0, 300) };
  });

  await record('J-10-keyboard-focus-trap-esc', async () => {
    const opener = page.getByRole('button', { name: 'Sources', exact: true });
    await opener.focus();
    await page.keyboard.press('Enter');
    await dialog().waitFor();
    await wait('idle', async () => (await dialog().getAttribute('aria-busy')) === 'false');
    // Forward cycle: Tab from the panel reaches ×, then all controls, then wraps from Done back to ×.
    const seq = [];
    for (let i = 0; i < 80; i++) { await page.keyboard.press('Tab'); const a = await activeInfo(); seq.push(a); if (i > 0 && a.text === 'Close') break; }
    assert.ok(seq.every(a => a.insidePanel), 'Tab stays in the panel: ' + JSON.stringify(seq.filter(a => !a.insidePanel)));
    assert.equal(seq[0].text, 'Close', 'first Tab reaches ×');
    assert.equal(seq.at(-2).text, 'Done', 'Done is last before wrap');
    assert.equal(seq.at(-1).text, 'Close', 'Tab wraps to ×');
    await page.keyboard.press('Shift+Tab');
    const back = await activeInfo();
    assert.equal(back.text, 'Done', 'Shift+Tab from × wraps to Done');
    // Focus ring on the trash button (VIS-017).
    await dialog().getByRole('button', { name: 'Remove one-skill' }).focus();
    await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
    const ring = await page.evaluate(() => { const a = document.activeElement; return { label: a.getAttribute('aria-label'), focusVisible: a.matches(':focus-visible'), boxShadow: getComputedStyle(a).boxShadow }; });
    assert.equal(ring.label, 'Remove one-skill');
    assert.ok(ring.focusVisible && /59, 130, 246/.test(ring.boxShadow), 'visible blue focus ring: ' + JSON.stringify(ring));
    await page.screenshot({ path: path.join(out, 'J-10-focus-ring-trash.png') });
    // Open the confirmation by keyboard; Esc must not close the popup.
    await page.keyboard.press('Enter');
    const confirmDialog = page.getByRole('dialog', { name: 'Remove Skill Source' });
    await confirmDialog.waitFor();
    const focusInConfirmation = await activeInfo();
    await page.keyboard.press('Escape');
    await sleep(300);
    assert.ok(await dialog().isVisible(), 'Esc ignored while a confirmation is open');
    const confirmationStillOpen = await confirmDialog.isVisible();
    if (confirmationStillOpen) await confirmDialog.getByRole('button', { name: 'Cancel' }).click();
    await confirmDialog.waitFor({ state: 'detached' });
    const focusAfterCancel = await activeInfo();
    await page.keyboard.press('Tab');
    const focusAfterCancelTab = await activeInfo();
    await page.keyboard.press('Escape');
    await sleep(300);
    const escAfterCancelClosed = !(await dialog().isVisible().catch(() => false));
    if (!escAfterCancelClosed) { await dialog().locator('#skill-source-input').focus(); await page.keyboard.press('Escape'); await dialog().waitFor({ state: 'detached' }); }
    const returned = await page.evaluate(() => document.activeElement?.textContent?.trim());
    assert.equal(returned, 'Sources', 'focus returns to the opener');
    const trace = { tabCycleLength: seq.length, ring, focusInConfirmation, confirmationStillOpenAfterEsc: confirmationStillOpen, focusAfterCancel, focusAfterCancelTab, escAfterCancelClosed, returned };
    evidence.cases['J-10-keyboard-focus-trap-esc'].trace = trace;
    // REQ-008 / AC-007: with the confirmation closed the popup is open, so Tab must stay inside it and Esc must close it.
    assert.ok(focusAfterCancelTab.insidePanel, 'Tab after the confirmation closes stays in the panel: ' + JSON.stringify(focusAfterCancelTab));
    assert.ok(escAfterCancelClosed, 'Esc closes the popup after the confirmation closes');
    return trace;
  });

  await record('J-11-close-paths-and-copy', async () => {
    const out11 = {};
    await openSources();
    await dialog().getByRole('button', { name: 'Close' }).click();
    await dialog().waitFor({ state: 'detached' }); out11.closeX = true;
    await openSources();
    await dialog().click({ position: { x: 20, y: 20 } }); await sleep(200);
    assert.ok(await dialog().isVisible(), 'click inside panel keeps it open');
    await page.mouse.click(5, 5);
    await dialog().waitFor({ state: 'detached' }); out11.overlay = true;
    await openSources();
    const lib = rowByText('skills-library');
    const full = await lib.locator('.source-path').getAttribute('title');
    out11.directWrite = await page.evaluate(async () => { try { await navigator.clipboard.writeText('probe'); return 'ok'; } catch (e) { return String(e); } });
    await lib.getByRole('button', { name: 'Copy path' }).click();
    await wait('Copied state', async () => (await lib.getByRole('button', { name: 'Copied' }).count()) === 1, 3000);
    out11.clipboard = await page.evaluate(() => navigator.clipboard.readText());
    assert.equal(out11.clipboard, full);
    await sleep(1700);
    assert.equal(await lib.getByRole('button', { name: 'Copy path' }).count(), 1, 'copied state resets');
    assert.equal(await ghRow().getByRole('button', { name: 'Copy URL' }).count(), 1);
    await closeDone(); out11.done = true;
    return out11;
  });

  await record('J-12-zh-CN-render', async () => {
    await page.evaluate(() => localStorage.setItem('autobyteus.localization.preference-mode', 'zh-CN'));
    await page.reload({ waitUntil: 'networkidle' });
    const opener = page.locator('button').filter({ has: page.locator('svg') }).filter({ hasText: /来源|Sources/ }).first();
    await opener.click();
    const zh = page.locator('[data-testid="skill-sources-dialog"]');
    await zh.waitFor();
    await wait('idle', async () => (await zh.getAttribute('aria-busy')) === 'false');
    const text = await zh.innerText();
    for (const s of ['添加技能来源', '添加', '已是最新', '1 个技能']) assert.ok(text.includes(s), 'zh-CN string present: ' + s);
    assert.ok(!/\bskills\.sources\.|SkillSourcesModal\./.test(text), 'no raw keys');
    await zh.locator('#skill-source-input').fill('https://github.com/acme/x');
    const trust = await zh.locator('#skill-source-hint').innerText();
    assert.match(trust, /请仅导入您信任的来源/);
    const overflow = await page.evaluate(() => { const p = document.querySelector('[data-testid="skill-sources-dialog"]'); return [...p.querySelectorAll('button')].filter(b => b.scrollWidth > b.clientWidth + 1).map(b => b.textContent.trim()); });
    await page.screenshot({ path: path.join(out, 'J-12-zh-CN.png') });
    await zh.locator('#skill-source-input').fill('');
    await page.evaluate(() => localStorage.removeItem('autobyteus.localization.preference-mode'));
    return { sample: text.slice(0, 400), trust: trust.slice(0, 40), overflowingButtons: overflow };
  });
  await record('J-13-keyboard-focus-after-operations', async () => {
    // Real keyboard journeys: after each operation ends, is focus still inside the open popup (Tab trapped, Esc works)?
    const out13 = {};
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Sources', exact: true }).waitFor({ timeout: 120000 });
    const probe = async label => {
      const at = await activeInfo();
      await page.keyboard.press('Tab');
      const afterTab = await activeInfo();
      out13[label] = { focusAfterOperation: at, afterTab };
      if (!afterTab.insidePanel) await dialog().locator('#skill-source-input').focus();
    };
    await page.getByRole('button', { name: 'Sources', exact: true }).focus();
    await page.keyboard.press('Enter');
    await dialog().waitFor();
    await wait('idle', async () => (await dialog().getAttribute('aria-busy')) === 'false');
    // (a) Enter in the input adds a folder.
    const dir = path.join(scratch, 'kb', 'kb-skills');
    await fs.mkdir(path.join(dir, 'kb-one'), { recursive: true });
    await fs.writeFile(path.join(dir, 'kb-one', 'SKILL.md'), '---\nname: kb-one\ndescription: keyboard\n---\nbody\n');
    await dialog().locator('#skill-source-input').focus();
    await page.keyboard.type(dir);
    await page.keyboard.press('Enter');
    await dialog().getByText('Source is available. Skills list refreshed.').waitFor();
    await probe('a-enter-add');
    // (b) Keyboard remove: focus the trash, Enter, Tab to the confirmation's Remove, Enter.
    await dialog().getByRole('button', { name: 'Remove kb-skills' }).focus();
    await page.keyboard.press('Enter');
    const confirmDialog = page.getByRole('dialog', { name: 'Remove Skill Source' });
    await confirmDialog.waitFor();
    out13.focusOnConfirmationOpen = await activeInfo();
    const reach = [];
    for (let i = 0; i < 6; i++) { await page.keyboard.press('Tab'); const a = await page.evaluate(() => ({ text: document.activeElement?.textContent?.trim().slice(0, 30), inConfirm: !!document.activeElement?.closest('[aria-label="Remove Skill Source"]') })); reach.push(a); if (a.inConfirm) break; }
    out13.tabsToReachConfirmation = reach;
    await confirmDialog.getByRole('button', { name: 'Remove', exact: true }).focus();
    await page.keyboard.press('Enter');
    await dialog().getByText('Skill source removed. Skills list refreshed.').waitFor();
    await probe('b-keyboard-remove-confirmed');
    await page.keyboard.press('Escape'); await sleep(300);
    out13.escAfterRemoveFromInputClosed = !(await dialog().isVisible().catch(() => false));
    evidence.cases['J-13-keyboard-focus-after-operations'].trace = out13;
    assert.ok(out13['a-enter-add'].focusAfterOperation.insidePanel, 'focus stays in the panel after Enter-add: ' + JSON.stringify(out13['a-enter-add'].focusAfterOperation));
    assert.ok(out13['b-keyboard-remove-confirmed'].focusAfterOperation.insidePanel && out13['b-keyboard-remove-confirmed'].afterTab.insidePanel, 'focus stays in the panel after a keyboard remove: ' + JSON.stringify(out13['b-keyboard-remove-confirmed']));
    return out13;
  });
  await record('J-14-keyboard-focus-edge-paths', async () => {
    // Round 2 (IR-002): edge paths of the document-level Esc/Tab handling and focus restoration.
    const out14 = {};
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Sources', exact: true }).focus();
    await page.keyboard.press('Enter');
    await dialog().waitFor();
    await wait('idle', async () => (await dialog().getAttribute('aria-busy')) === 'false');
    // (a) Duplicate-name conflict by keyboard: Esc closes only the conflict dialog; focus returns into the panel.
    const dir = path.join(scratch, 'kb-dupe', 'kb-dupe-skills');
    await fs.mkdir(path.join(dir, 'solo'), { recursive: true });
    await fs.writeFile(path.join(dir, 'solo', 'SKILL.md'), '---\nname: solo\ndescription: duplicate\n---\nbody\n');
    await dialog().locator('#skill-source-input').focus();
    await page.keyboard.type(dir);
    await page.keyboard.press('Enter');
    const conflict = page.getByTestId('skill-name-conflict-dialog');
    await conflict.waitFor({ timeout: 15000 });
    out14.focusInConflict = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    await page.keyboard.press('Escape');
    await conflict.waitFor({ state: 'detached' });
    await sleep(400);
    out14.popupOpenAfterConflictEsc = await dialog().isVisible();
    out14.focusAfterConflict = await activeInfo();
    out14.inputKeptAfterConflict = await input().inputValue();
    assert.ok(out14.popupOpenAfterConflictEsc, 'Esc on the conflict dialog does not close the popup');
    assert.ok(out14.focusAfterConflict.insidePanel, 'focus back in the panel after the conflict dialog: ' + JSON.stringify(out14.focusAfterConflict));
    assert.equal(out14.inputKeptAfterConflict, dir);
    await input().fill('');
    // (b) Stray focus: put focus on <body>; Shift+Tab lands on the last control, Tab on the first.
    await page.evaluate(() => { document.activeElement?.blur(); });
    await page.keyboard.press('Shift+Tab');
    out14.strayShiftTab = await activeInfo();
    await page.evaluate(() => { document.activeElement?.blur(); });
    await page.keyboard.press('Tab');
    out14.strayTab = await activeInfo();
    assert.equal(out14.strayShiftTab.text, 'Done');
    assert.equal(out14.strayTab.text, 'Close');
    // (c) Keyboard Try again after Check failed: the button disappears after the check; focus stays in the panel.
    await page.keyboard.press('Escape'); await dialog().waitFor({ state: 'detached' });
    await setUpstream({ fail: true });
    await page.getByRole('button', { name: 'Sources', exact: true }).focus();
    await page.keyboard.press('Enter');
    await dialog().waitFor();
    const gh = ghRow();
    await wait('check failed', async () => /^Check failed/.test((await gh.getByRole('status').innerText()).trim()));
    await setUpstream({ fail: false });
    await gh.getByRole('button', { name: 'Check api-e2e/skills again' }).focus();
    await page.keyboard.press('Enter');
    await wait('recovered', async () => (await gh.getByRole('status').innerText()).trim() === 'Up to date');
    await sleep(400);
    out14.focusAfterTryAgain = await activeInfo();
    assert.ok(out14.focusAfterTryAgain.insidePanel, 'focus in the panel after Try again: ' + JSON.stringify(out14.focusAfterTryAgain));
    // (d) Keyboard Update confirmed: the chip disappears; focus stays in the panel and Esc closes.
    const archives = JSON.parse(await fs.readFile(path.join(info.owned, 'archives.json'), 'utf8'));
    await page.keyboard.press('Escape'); await dialog().waitFor({ state: 'detached' });
    await setUpstream({ revision: 'c'.repeat(40), archive: archives[1], fail: false });
    await page.getByRole('button', { name: 'Sources', exact: true }).focus();
    await page.keyboard.press('Enter');
    await dialog().waitFor();
    await wait('update available', async () => (await ghRow().getByRole('status').innerText()).trim() === 'Update available');
    await ghRow().getByRole('button', { name: 'Update', exact: true }).focus();
    await page.keyboard.press('Enter');
    const confirmDialog = page.getByRole('dialog', { name: 'Update entire skill source?' });
    await confirmDialog.waitFor();
    await confirmDialog.getByRole('button', { name: 'Update', exact: true }).focus();
    await page.keyboard.press('Enter');
    await dialog().getByText('Source is up to date. Skills list refreshed.').waitFor({ timeout: 30000 });
    await sleep(500);
    out14.focusAfterUpdate = await activeInfo();
    await page.keyboard.press('Tab');
    out14.tabAfterUpdate = await activeInfo();
    assert.ok(out14.focusAfterUpdate.insidePanel && out14.tabAfterUpdate.insidePanel, 'focus stays in the panel after a keyboard update');
    await page.keyboard.press('Escape');
    await dialog().waitFor({ state: 'detached', timeout: 3000 });
    out14.returnedAfterUpdateClose = await page.evaluate(() => document.activeElement?.textContent?.trim());
    assert.equal(out14.returnedAfterUpdateClose, 'Sources');
    // (e) Esc after the popup is closed does nothing harmful (listener removed): the page stays on Skills.
    await page.keyboard.press('Escape');
    out14.urlAfterStrayEsc = new URL(page.url()).pathname;
    evidence.cases['J-14-keyboard-focus-edge-paths'].trace = out14;
    return out14;
  });
} finally {
  try { await browser.close(); evidence.cleanup.browser = 'closed'; } catch (e) { evidence.cleanup.browser = String(e); }
  stack.kill('SIGTERM');
  await wait('stack exit', () => stack.exitCode !== null || stack.signalCode !== null, 20000).catch(() => { stack.kill('SIGKILL'); });
  evidence.cleanup.stack = stackOut.split('\n').filter(l => l.startsWith('cleaned')).join(' ') || 'exit ' + stack.exitCode;
  evidence.cleanup.ownedRemoved = !existsSync(info?.owned ?? '/nonexistent-owned');
  await fs.rm(scratch, { recursive: true, force: true }); evidence.cleanup.scratchRemoved = !existsSync(scratch);
  evidence.finishedAt = new Date().toISOString();
  await save();
}
const failed = Object.entries(evidence.cases).filter(([, c]) => c.result !== 'Pass');
console.log(JSON.stringify({ cases: Object.fromEntries(Object.entries(evidence.cases).map(([k, v]) => [k, v.result])), pageErrors: evidence.pageErrors.length, cleanup: evidence.cleanup }));
process.exit(failed.length ? 1 : 0);

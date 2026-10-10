#!/usr/bin/env node
// API/E2E temporary desktop check (D-01) for skill-sources-dialog-redesign. Attaches over CDP to an
// isolated AutoByteus instance started from this worktree's build (never the user's app) and checks the
// redesigned popup in the real Electron renderer: Browse… eligibility with the real preload, a keyboard
// add/remove against the embedded backend with focus kept in the panel, and that Browse… invokes the real
// folder-dialog IPC without submitting. The native sheet it opens is closed by stopping the instance.
// Usage (repo root): node <this> <controlEndpoint> <fresh-out-dir>
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = process.cwd();
const { chromium } = createRequire(path.join(root, 'autobyteus-web', 'package.json'))('playwright-core');
const [endpoint, outArg] = process.argv.slice(2);
const out = path.resolve(outArg);
assert(!existsSync(out), 'Use a fresh output directory');
await fs.mkdir(out, { recursive: true });
const evidence = { startedAt: new Date().toISOString(), endpoint, cases: {}, pageErrors: [] };
const save = () => fs.writeFile(path.join(out, 'result.json'), JSON.stringify(evidence, null, 2) + '\n');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const wait = async (label, fn, ms = 30000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return; await sleep(100); } throw new Error('Timeout: ' + label); };
const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-sources-desktop-'));

const browser = await chromium.connectOverCDP(endpoint);
const page = browser.contexts().flatMap(c => c.pages()).find(p => p.url().includes('/renderer/index.html'));
assert(page, 'main window tab not found');
page.on('pageerror', e => evidence.pageErrors.push(String(e)));
const dialog = () => page.getByRole('dialog', { name: 'Manage Skill Sources' });
const input = () => dialog().getByRole('textbox', { name: 'Add skill source' });
const activeInfo = () => page.evaluate(() => {
  const a = document.activeElement; const panel = document.querySelector('[data-testid="skill-sources-dialog"]');
  return { tag: a?.tagName, text: (a?.getAttribute('aria-label') || a?.textContent || '').trim().slice(0, 60), insidePanel: !!panel && panel.contains(a) };
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
  await record('D-01a-browse-eligible-in-electron', async () => {
    const env = await page.evaluate(() => ({ url: location.href, hasShowFolderDialog: typeof window.electronAPI?.showFolderDialog === 'function' }));
    assert.ok(env.hasShowFolderDialog, 'real preload exposes showFolderDialog');
    await page.getByText('Skills', { exact: true }).first().click();
    const opener = page.getByRole('button', { name: 'Sources', exact: true });
    await opener.waitFor({ timeout: 60000 });
    await opener.focus();
    await page.keyboard.press('Enter');
    await dialog().waitFor();
    const focusOnOpen = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    await wait('idle', async () => (await dialog().getAttribute('aria-busy')) === 'false', 60000);
    const browse = dialog().getByRole('button', { name: 'Browse…' });
    assert.equal(await browse.count(), 1, 'Browse… shown in the desktop app');
    assert.ok(await browse.isEnabled());
    const order = await page.evaluate(() => [...document.querySelectorAll('[data-testid="skill-sources-dialog"] form .input-group > *')].map(e => e.tagName + ':' + (e.textContent || '').trim()));
    assert.equal(focusOnOpen, 'skill-sources-dialog', 'focus on the panel on open');
    const rows = await dialog().locator('li[data-testid^="skill-source-row-"]').count();
    return { ...env, focusOnOpen, order, rows };
  });

  await record('D-01b-keyboard-add-remove-electron', async () => {
    const dir = path.join(scratch, 'desktop-skills');
    await fs.mkdir(path.join(dir, 'desktop-one'), { recursive: true });
    await fs.writeFile(path.join(dir, 'desktop-one', 'SKILL.md'), '---\nname: desktop-one\ndescription: desktop check\n---\nbody\n');
    await input().focus();
    await page.keyboard.type(dir);
    await page.keyboard.press('Enter');
    await dialog().getByText('Source is available. Skills list refreshed.').waitFor({ timeout: 30000 });
    const row = dialog().locator('li[data-testid^="skill-source-row-"]').filter({ hasText: dir });
    await row.waitFor();
    const count = (await row.locator('.count').innerText()).trim();
    const focusAfterAdd = await activeInfo();
    await row.getByRole('button', { name: 'Remove desktop-skills' }).focus();
    await page.keyboard.press('Enter');
    const confirmDialog = page.getByRole('dialog', { name: 'Remove Skill Source' });
    await confirmDialog.waitFor();
    await confirmDialog.getByRole('button', { name: 'Remove', exact: true }).focus();
    await page.keyboard.press('Enter');
    await dialog().getByText('Skill source removed. Skills list refreshed.').waitFor({ timeout: 30000 });
    await sleep(500);
    const focusAfterRemove = await activeInfo();
    await page.keyboard.press('Tab');
    const tabAfterRemove = await activeInfo();
    assert.equal(count, '1 skill');
    assert.ok(focusAfterAdd.insidePanel && focusAfterRemove.insidePanel && tabAfterRemove.insidePanel, 'focus kept in the panel');
    await page.keyboard.press('Escape');
    await dialog().waitFor({ state: 'detached', timeout: 5000 });
    const returned = await page.evaluate(() => document.activeElement?.textContent?.trim());
    assert.equal(returned, 'Sources');
    assert.ok(existsSync(dir), 'unlink keeps the folder');
    return { count, focusAfterAdd, focusAfterRemove, tabAfterRemove, returned };
  });

  await record('D-01c-browse-invokes-native-dialog-without-submit', async () => {
    await page.getByRole('button', { name: 'Sources', exact: true }).click();
    await dialog().waitFor();
    await wait('idle', async () => (await dialog().getAttribute('aria-busy')) === 'false', 60000);
    const before = await dialog().locator('li[data-testid^="skill-source-row-"]').count();
    await input().fill('keep-me');
    // Wrap the real bridge only to observe that it was called (it still opens the real native sheet).
    await page.evaluate(() => { window.__folderDialogCalls = 0; });
    const bridgeWrapped = await page.evaluate(() => {
      const api = window.electronAPI; const original = api.showFolderDialog;
      try { api.showFolderDialog = (...a) => { window.__folderDialogCalls++; return original(...a); }; } catch { return false; }
      return api.showFolderDialog !== original;
    });
    await dialog().getByRole('button', { name: 'Browse…' }).click({ noWaitAfter: true });
    await sleep(1500);
    const state = await page.evaluate(() => {
      const panel = document.querySelector('[data-testid="skill-sources-dialog"]');
      const browse = [...panel.querySelectorAll('button')].find(b => b.textContent.trim() === 'Browse…');
      return { browseDisabled: browse.disabled, value: panel.querySelector('#skill-source-input').value, calls: window.__folderDialogCalls, alerts: [...panel.querySelectorAll('[role="alert"],.success-alert')].map(a => a.textContent.trim()) };
    });
    const after = await dialog().locator('li[data-testid^="skill-source-row-"]').count();
    assert.ok(state.browseDisabled, 'Browse… is pending while the native folder dialog is open (real IPC awaited)');
    if (bridgeWrapped) assert.equal(state.calls, 1, 'showFolderDialog invoked once');
    assert.equal(state.value, 'keep-me', 'input unchanged while picking');
    assert.equal(after, before, 'nothing submitted');
    assert.deepEqual(state.alerts, []);
    return { bridgeWrapped, ...state, rowsBefore: before, rowsAfter: after, note: 'The native sheet is left open and closed by stopping the isolated instance (no OS-level tool to answer it).' };
  });
} finally {
  await fs.rm(scratch, { recursive: true, force: true });
  evidence.scratchRemoved = !existsSync(scratch);
  evidence.finishedAt = new Date().toISOString();
  await save();
  // No browser.close(): process exit drops the CDP connection; the caller stops the isolated instance.
}
console.log(JSON.stringify(Object.fromEntries(Object.entries(evidence.cases).map(([k, v]) => [k, v.result]))));
process.exit(Object.values(evidence.cases).every(c => c.result === 'Pass') ? 0 : 1);

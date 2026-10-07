#!/usr/bin/env node
// Source-current packaged workspace-input regression. Graphical macOS/Linux, pnpm installed.
// Default builds and owns an isolated app; --skip-build ONLY reuses this worktree's current build.
// --native-assisted pauses at real OS dialogs for an operator/computer-use agent. No bridge mocks.
// Without it, manual caller coverage runs and native cases are explicitly Not Tested.
// No model sends, secrets, user app/data, private-store writes, or paid providers.
// pnpm test:e2e:workspace-folder-picker [--skip-build] [--native-assisted] --output-dir <fresh-dir>
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? fallback : process.argv[i + 1]; };
const out = path.resolve(web, arg('output-dir', 'test-results/workspace-folder-picker'));
await fs.mkdir(out, { recursive: true });
const evidencePath = path.join(out, 'evidence.json'), ledger = arg('ledger-file');
try { await fs.access(evidencePath); throw new Error(`Refusing existing evidence: ${evidencePath}`); } catch (e) { if (e.code !== 'ENOENT') throw e; }
const native = process.argv.includes('--native-assisted');
const evidence = { startedAt: new Date().toISOString(), nativeAssisted: native, platform: `${process.platform}-${process.arch}`, cases: {}, requests: [], pageErrors: [], cleanup: {} };
const save = () => fs.writeFile(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
const event = async (id, text) => { console.log(`${id}: ${text}`); if (ledger) await fs.appendFile(ledger, `\n- ${new Date().toISOString()} ${id}: ${text}; ${evidencePath}\n`); };
let instance, browser, page, fixture, cdp;
async function cli(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(web, 'scripts/isolated-app/cli.mjs'), ...args], { cwd: web, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', b => stdout += b); child.stderr.on('data', b => stderr += b);
    child.once('error', reject); child.once('close', async code => {
      try { await fs.writeFile(path.join(out, `${args[0]}.log`), stderr); const json = JSON.parse(stdout);
        await fs.writeFile(path.join(out, `${args[0]}.json`), JSON.stringify(json, null, 2));
        assert.equal(code, 0, stdout); assert(json.ok); resolve(json.result); } catch (e) { reject(e); }
    });
  });
}
async function run(id, title, action) {
  const item = evidence.cases[id] = { title, result: 'Started' }; await save(); await event(id, `Started ${title}`);
  try { item.details = await action(); item.result = 'Pass'; }
  catch (e) { item.result = 'Fail'; item.error = e.stack; try { item.state = await state(); await shot(`failed-${id}`); } catch {} throw e; }
  finally { await save(); await event(id, item.result); }
}
const test = name => page.locator(`[data-test="${name}"]`);
const field = () => page.locator('#chat-workspace-path');
const browse = () => test('chat-workspace-browse');
const form = () => test('chat-workspace-folder-form');
const state = () => page.evaluate(() => {
  // Read-only evidence; setup goes through public APIs/UI.
  const stores = document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$pinia._s;
  const chat = stores.get('chatDraft')?.draft, org = stores.get('agentOrgLaunchDraft')?.draft;
  const menu = document.querySelector('[data-test="chat-workspace-menu"]');
  const input = document.querySelector('#chat-workspace-path'), browse = document.querySelector('[data-test="chat-workspace-browse"]');
  const css = input ? getComputedStyle(input) : null;
  const controls = input && browse ? { input: input.getBoundingClientRect().toJSON(), browse: browse.getBoundingClientRect().toJSON(),
    fontSize: css.fontSize, lineHeight: css.lineHeight, padding: css.padding, borderRadius: css.borderRadius,
    color: css.color, borderColor: css.borderColor, hint: document.querySelector('#chat-workspace-path-hint')?.textContent } : null;
  return { controls, url: location.href, target: chat?.target, chatWorkspace: chat?.workspace,
    orgRoot: org?.root.workspace, teamWorkspaces: org?.teamWorkspaces,
    registered: Object.keys(stores.get('workspace')?.workspaces || {}).sort(),
    path: document.querySelector('#chat-workspace-path')?.value,
    focused: document.activeElement?.id || document.activeElement?.getAttribute('data-test') || document.activeElement?.textContent?.slice(0, 120),
    menu: menu ? menu.getBoundingClientRect().toJSON() : null,
    width: innerWidth, height: innerHeight, overflow: document.documentElement.scrollWidth > innerWidth };
});
const shot = async name => { await page.screenshot({ path: path.join(out, `${name}.png`) }); await fs.writeFile(path.join(out, `${name}.json`), JSON.stringify(await state(), null, 2)); await fs.writeFile(path.join(out, `${name}.txt`), await page.locator('body').innerText()); };
const gql = async (query, variables = {}) => {
  const response = await fetch(instance.graphqlUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const json = await response.json(); assert(!json.errors, JSON.stringify(json.errors)); return json.data;
};
const workspaces = async () => (await gql('{workspaces{workspaceId absolutePath}}')).workspaces.sort((a, b) => a.workspaceId.localeCompare(b.workspaceId));
async function openForm(scope = page) {
  await scope.locator('[data-test="chat-workspace-trigger"]').click();
  await test('chat-workspace-open-folder').click(); await field().waitFor();
  assert.equal(await field().evaluate(e => e === document.activeElement), true);
}
async function choose(root, scope = page, name = 'selected') {
  await openForm(scope); const before = await state(), count = evidence.requests.length;
  if (native) {
    // Real renderer click -> public preload -> main -> OS; operator answers on screen.
    await browse().click(); assert(await browse().isDisabled());
    assert(await form().locator('button[type="submit"]').isDisabled());
    await event('NATIVE', `Choose this owned directory in the OS dialog: ${root}`);
    await page.waitForFunction(root => document.querySelector('#chat-workspace-path')?.value === root, root, { timeout: 300000 });
    await page.waitForFunction(() => document.activeElement?.id === 'chat-workspace-path');
  } else await field().fill(root);
  const filled = await state();
  assert.equal(filled.controls.input.height, 34); assert.equal(filled.controls.fontSize, '14px');
  assert.equal(filled.controls.lineHeight, '20px'); assert.equal(filled.controls.borderRadius, '6px');
  assert.equal(filled.controls.browse.left - filled.controls.input.right, 8);
  assert(filled.menu.left >= 7 && filled.menu.right <= filled.width - 7);
  assert(!filled.overflow);
  assert.deepEqual(filled.chatWorkspace, before.chatWorkspace); assert.deepEqual(filled.orgRoot, before.orgRoot);
  assert.deepEqual(filled.teamWorkspaces, before.teamWorkspaces); assert.deepEqual(filled.registered, before.registered);
  assert.equal(evidence.requests.slice(count).filter(r => /^mutation\b/.test(r.query.trim())).length, 0);
  await shot(name); await form().locator('button[type="submit"]').click();
  await test('chat-workspace-menu').waitFor({ state: 'detached' });
  return { before, filled, applied: await state() };
}
async function target(id) {
  await test('run-target-switcher-trigger').click(); await test(`run-target-switcher-option-${id}`).click();
  await test('run-target-switcher-menu').waitFor({ state: 'detached' });
}
try {
  await run('FP-P01', 'isolated source-current launch and API-owned fixtures', async () => {
    fixture = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-folder-picker-')));
    evidence.fixture = fixture;
    for (const name of ['known', 'agent', 'team', 'org', 'member', 'saved-member']) await fs.mkdir(path.join(fixture, name));
    instance = await cli(['start', process.argv.includes('--skip-build') ? '--from-worktree' : '--build']); evidence.instance = instance;
    evidence.asarSha256 = createHash('sha256').update(await fs.readFile(path.resolve(instance.executablePath, '../../Resources/app.asar'))).digest('hex');
    const agent = (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}', { input: { name: 'Folder Proof Agent', description: 'Owned picker fixture', instructions: 'Test fixture; no inference.', toolNames: [] } })).createAgentDefinition.id;
    const team = (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}', { input: { name: 'Folder Proof Team', description: 'Owned picker fixture', instructions: 'Test fixture', coordinatorMemberName: 'lead', nodes: [{ memberName: 'lead', ref: agent, refScope: 'SHARED' }], handoffs: [] } })).createAgentTeamDefinition.id;
    const org = (await gql('mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}', { input: { name: 'Folder Proof Org', description: 'Owned picker fixture', instructions: 'Test fixture', members: [{ memberName: 'product', ref: team, refType: 'AGENT_TEAM', refScope: 'SHARED' }, { memberName: 'other', ref: team, refType: 'AGENT_TEAM', refScope: 'SHARED' }], handoffs: [] } })).createAgentOrgDefinition.id;
    const known = (await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: path.join(fixture, 'known') } })).createWorkspace.workspaceId;
    evidence.ids = { agent, team, org, known }; evidence.baseline = await workspaces();
    browser = await chromium.connectOverCDP(instance.controlEndpoint); evidence.engine = browser.version();
    page = browser.contexts()[0].pages().find(p => p.url().includes('/renderer/index.html')); assert(page);
    page.setDefaultTimeout(30000); page.on('pageerror', e => evidence.pageErrors.push(String(e)));
    page.on('request', r => { if (r.url() === instance.graphqlUrl && r.method() === 'POST') evidence.requests.push(r.postDataJSON()); });
    cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1512, height: 862, deviceScaleFactor: 1, mobile: false });
    await page.reload(); await test('run-target-switcher-trigger').waitFor(); await target(agent);
    return { instance, ids: evidence.ids };
  });
  await run('FP-P02', 'Agent input only, explicit apply and unchanged registration', async () => {
    const details = await choose(path.join(fixture, 'agent'), page, 'agent-selected');
    assert.deepEqual(details.applied.chatWorkspace, { kind: 'folder', rootPath: path.join(fixture, 'agent') });
    assert.deepEqual(await workspaces(), evidence.baseline); return details;
  });
  if (native) await run('FP-P03', 'native Cancel and Escape retain typed text/selection/focus', async () => {
    await openForm(); await field().fill(path.join(fixture, 'typed-unapplied')); const before = await state();
    for (const action of ['Cancel button', 'Escape key']) {
      await field().press('Tab'); assert.equal(await browse().evaluate(e => e === document.activeElement), true);
      await browse().press('Enter'); await event('NATIVE', `Dismiss native picker using ${action}; do not close underlying form`);
      await page.waitForFunction(() => document.querySelector('[data-test="chat-workspace-browse"]')?.disabled === false, null, { timeout: 300000 });
      assert.equal(await field().inputValue(), before.path); assert.deepEqual((await state()).chatWorkspace, before.chatWorkspace);
      assert.equal(await browse().evaluate(e => e === document.activeElement), true);
      assert.equal(await test('chat-workspace-picker-error').count(), 0); await shot(`native-${action.split(' ')[0]}`);
    }
    await field().press('Escape'); assert.equal(await test('chat-workspace-menu').count(), 0); return before;
  });
  else evidence.cases['FP-P03'] = { result: 'Not Tested', reason: 'Use --native-assisted for OS Cancel/Escape proof' };
  await run('FP-P04', 'Team new Chat and known path reuse', async () => {
    await target(evidence.ids.team); const details = await choose(path.join(fixture, 'known'), page, 'team-known');
    assert.deepEqual(details.applied.chatWorkspace, { kind: 'existing', workspaceId: evidence.ids.known });
    assert.deepEqual(await workspaces(), evidence.baseline); return details;
  });
  await run('FP-P05', 'Org root and specific placed-Team destination', async () => {
    await target(evidence.ids.org); await test('org-launch-page').waitFor();
    const root = await choose(path.join(fixture, 'org'), test('org-launch-card'), 'org-root');
    assert.deepEqual(root.applied.orgRoot, { kind: 'folder', rootPath: path.join(fixture, 'org') });
    await test('run-members-open').click(); const member = test('run-member-/product');
    await member.locator('[data-test="run-member-toggle"]').click();
    const result = await choose(path.join(fixture, 'member'), member, 'org-member');
    assert.deepEqual(result.applied.orgRoot, root.applied.orgRoot);
    assert.deepEqual(result.applied.teamWorkspaces, { '/product': { kind: 'folder', rootPath: path.join(fixture, 'member') } });
    assert.deepEqual(await workspaces(), evidence.baseline); return { root, member: result };
  });
  await run('FP-P06', 'full caller narrow form, invalid/manual/Cancel and long path geometry', async () => {
    await test('run-member-settings-close').click();
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
    await openForm(test('org-launch-card')); await field().fill('relative'); await form().locator('button[type="submit"]').click();
    assert.equal(await field().getAttribute('aria-invalid'), 'true');
    await field().fill('/owned/' + 'long-folder-name/'.repeat(16)); assert.equal(await field().getAttribute('aria-invalid'), null);
    const s = await state(); assert(!s.overflow); assert(s.menu.x >= 7 && s.menu.right <= 383);
    assert(await browse().isVisible(), 'Narrow does not mean mobile'); await shot('org-narrow-long');
    await form().getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.equal(await form().count(), 0); assert.equal((await state()).focused, 'chat-workspace-trigger');
    await page.keyboard.press('Escape'); assert.deepEqual(await workspaces(), evidence.baseline); return s;
  });
  await run('FP-P07', 'real Org Run, active locks, stopped member draft and explicit Save', async () => {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1512, height: 862, deviceScaleFactor: 1, mobile: false });
    assert(await test('org-launch-run').isEnabled());
    // Org Run has no first message. No provider inference is requested by this case.
    await test('org-launch-run').click();
    await test('agent-org-active-unfocused').waitFor({ timeout: 60000 });
    await page.locator('[data-test^="agent-org-team-row-"]').filter({ hasText: /^product$/ }).click();
    await test('workspace-header-edit-config').waitFor({ timeout: 60000 });
    const orgRunId = await page.evaluate(() => new URLSearchParams(location.hash.split('?')[1]).get('orgRunId'));
    assert(orgRunId); evidence.orgRunId = orgRunId;
    const read = async () => (await gql('query($id:String!){getAgentOrgRunConfig(orgRunId:$id){orgRunId executionTree isActive editability{editable reason}}}', { id: orgRunId })).getAgentOrgRunConfig;
    const active = await read(); assert.equal(active.isActive, true);
    await test('workspace-header-edit-config').click(); await test('existing-run-settings').waitFor();
    assert.equal(await test('existing-run-root-card').locator('[data-test="chat-workspace-trigger"]').count(), 0);
    const member = test('run-member-/product'); await member.locator('[data-test="run-member-toggle"]').click();
    assert.equal(await member.locator('[data-test="chat-workspace-trigger"]').count(), 0);
    await shot('saved-active-locked');
    await test('existing-run-stop').click();
    await page.waitForFunction(() => document.querySelector('[data-test="existing-run-settings"]')?.getAttribute('data-state') === 'stopped');
    if (await member.locator('[data-test="run-member-toggle"]').getAttribute('aria-expanded') === 'false') await member.locator('[data-test="run-member-toggle"]').click();
    await member.locator('[data-test="chat-workspace-trigger"]').waitFor({ timeout: 60000 });
    const before = await read(); assert.equal(before.isActive, false);
    assert.equal(await test('existing-run-root-card').locator('[data-test="chat-workspace-trigger"]').count(), 0);
    const changed = await choose(path.join(fixture, 'saved-member'), member, 'saved-member-draft');
    assert.deepEqual((await read()).executionTree, before.executionTree, 'Use folder must not Save');
    await test('save-existing-model-config').waitFor();
    await page.waitForFunction(() => !document.querySelector('[data-test="save-existing-model-config"]')?.disabled);
    const requestStart = evidence.requests.length;
    await test('save-existing-model-config').click();
    await page.waitForFunction(() => !document.querySelector('[data-test="save-existing-model-config"]'));
    const after = await read();
    const savedTeam = after.executionTree.rootOrg.members.find(m => m.address === '/product');
    const otherTeam = after.executionTree.rootOrg.members.find(m => m.address === '/other');
    assert.equal(savedTeam.defaultLaunchConfiguration.workspaceRootPath, path.join(fixture, 'saved-member'));
    assert.equal(otherTeam.defaultLaunchConfiguration.workspaceRootPath, path.join(fixture, 'org'));
    const saves = evidence.requests.slice(requestStart).filter(r => r.operationName === 'UpdateStoppedAgentOrgRunConfig');
    assert.equal(saves.length, 1); assert.deepEqual(saves[0].variables.input.teamWorkspacePatches, [{ teamAddress: '/product', workspaceRootPath: path.join(fixture, 'saved-member') }]);
    assert.deepEqual(saves[0].variables.input.modelPatches, []); await shot('saved-member-committed');
    return { before, changed, after, saves };
  });
  await run('FP-P08', 'actual Settings locale -> Chat Chinese input at desktop and narrow widths', async () => {
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByTestId('settings-nav-language').click(); await page.getByTestId('settings-language-select').selectOption('zh-CN');
    // Normal page route, preserves production bootstrap and localization owner.
    await page.goto(page.url().split('#')[0] + '#/chat'); await test('chat-workspace-trigger').waitFor();
    const results = [];
    for (const width of [1512, 390]) {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width, height: width === 390 ? 844 : 862, deviceScaleFactor: 1, mobile: false });
      await openForm(); assert.equal(await browse().innerText(), '浏览…');
      assert.equal(await page.locator('#chat-workspace-path-hint').innerText(), '选择此电脑上的文件夹，或输入完整路径。');
      const detail = await state(); assert(!detail.overflow); results.push(detail); await shot(`chat-zh-${width}`); await field().press('Escape');
    }
    return results;
  });
  evidence.result = 'Pass';
} catch (e) { evidence.result = 'Fail'; evidence.error = e.stack; process.exitCode = 1; }
finally {
  // CLI owns the process group/data; never browser.close an unrelated desktop.
  if (instance) { try { await fs.copyFile(instance.logPath, path.join(out, 'isolated-app.log')); } catch (e) { evidence.logCopyError = String(e); } try { evidence.cleanup.instance = await cli(['stop', instance.instanceId]); assert(evidence.cleanup.instance.controlPortReleased && evidence.cleanup.instance.serverPortReleased && evidence.cleanup.instance.dataRootRemoved, 'Owned cleanup incomplete'); } catch (e) { evidence.cleanup.error = String(e); evidence.result = 'Fail'; process.exitCode = 1; } }
  if (fixture) { await fs.rm(fixture, { recursive: true, force: true }); evidence.cleanup.fixtureRemoved = true; }
  evidence.finishedAt = new Date().toISOString(); await save(); console.log(JSON.stringify({ result: evidence.result, evidencePath, cleanup: evidence.cleanup }));
}

/** TEMPORARY API/E2E probe API-05 (autobyteus-285, AC-002 real app, CR-C2/FU-004), kept as evidence.
 * Isolated desktop instance of a run-owned COPY of the clean packaged build, on a run-owned data root (never the user's).
 * Build X = the copy as built; build X+1 = the same copy with Resources/server/dist/release-identity.json changed
 * (design: the stamp is the only difference). Quit = window.electronAPI.startShutdown() (the menu Quit's app.quit()).
 * Usage (cwd = clean checkout root): env -i PATH HOME USER LOGNAME TMPDIR node API-285-desktop-probe.mjs <app copy> <evidence dir>
 */
import fs from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir, homedir } from 'node:os';
import { spawn, execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const [appArg, evidenceArg] = process.argv.slice(2);
const root = process.cwd(), app = resolve(appArg), evidence = resolve(evidenceArg);
const require = createRequire(join(root, 'autobyteus-web/package.json'));
const { chromium } = require('playwright-core'), WebSocket = require('ws');
const hostOnly = process.env.HOST_ONLY === '1';
const teamOnly = process.env.TEAM_ONLY === '1' || hostOnly;
// Round 2: WITH_COPY=1 adds the Claude host with its busy Codex copy to the Team-only journey; CASE_ID names the evidence.
const withCopy = process.env.WITH_COPY === '1';
const caseId = process.env.CASE_ID ?? (hostOnly ? 'API-05H' : process.env.TEAM_ONLY === '1' ? 'API-05T' : 'API-05');
const stampPath = join(app, 'Contents/Resources/server/dist/release-identity.json');
const X = JSON.parse(await fs.readFile(stampPath, 'utf8')).version, X1 = `${X}-rr285next`;
const own = await fs.realpath(await fs.mkdtemp(join(tmpdir(), 'rr285-desk-')));
const dataRoot = join(own, 'data-root'), workspace = join(own, 'workspace'), codexHome = join(own, 'codex-home');
for (const d of [dataRoot, workspace, codexHome]) await fs.mkdir(d);
await fs.symlink(join(homedir(), '.codex', 'auth.json'), join(codexHome, 'auth.json'));
await fs.writeFile(join(codexHome, 'config.toml'), 'check_for_update_on_startup = false\n');
const tag = `RR285D${Date.now().toString(36)}`, T0 = Date.now();
const record = { case: caseId, app, X, X1, date: new Date().toISOString(), own, tag, steps: [] };
const log = (step, value) => { const at = ((Date.now() - T0) / 1000).toFixed(1); record.steps.push({ at, step, value }); console.log(`[+${at}s] ${step} ${JSON.stringify(value).slice(0, 600)}`); };
const delay = ms => new Promise(r => setTimeout(r, ms));
const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code !== 'ESRCH'; } };
const wait = async (fn, label, timeout = 30_000, step = 250) => { const end = Date.now() + timeout; while (Date.now() < end) { const v = await fn(); if (v) return v; await delay(step); } throw Error(`Timed out: ${label}`); };
const table = () => execFileSync('ps', ['-ww', '-A', '-o', 'pid=,ppid=,pgid=,command='], { encoding: 'utf8' }).split('\n').flatMap(l => { const m = l.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/); return m ? [{ pid: +m[1], ppid: +m[2], pgid: +m[3], command: m[4] }] : []; });
const descendants = r0 => { const rows = table(), out = []; let f = [r0]; while (f.length) { const k = rows.filter(r => f.includes(r.ppid) && !out.some(o => o.pid === r.pid)); out.push(...k); f = k.map(x => x.pid); } return out; };
const env = { PATH: process.env.PATH, HOME: process.env.HOME, USER: process.env.USER, LOGNAME: process.env.LOGNAME, TMPDIR: process.env.TMPDIR, CODEX_HOME: codexHome };
const cli = async args => {
  const c = spawn(process.execPath, ['autobyteus-web/scripts/isolated-app/cli.mjs', ...args], { cwd: root, env }); let out = '', err = '';
  c.stdout.on('data', b => { out += b; }); c.stderr.on('data', b => { err += b; });
  const exit = await new Promise(r => c.on('exit', r)); const parsed = (() => { try { return JSON.parse(out); } catch { return null; } })();
  log('isolated-app', { args: args.map(a => a.replace(own, '<own>')), exit, ok: parsed?.ok }); assert.equal(exit, 0, `${args.join(' ')}: ${out}${err}`); return parsed.result;
};
let inst = null, browser = null, page = null; const instances = [], sockets = [], stopped = new Set();
const start = async label => {
  inst = await cli(['start', '--app', app, '--data-root', dataRoot]); instances.push(inst);
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${inst.controlPort}`);
  page = browser.contexts()[0].pages().find(p => !p.url().startsWith('devtools:'));
  log('instance started', { label, instanceId: inst.instanceId, electronPid: inst.pid, serverPort: inst.serverPort });
};
const instanceLog = async () => fs.readFile(inst.logPath, 'utf8').catch(() => '');
const resumeLines = text => text.split('\n').filter(l => /Recorded \d+ busy run|Restart resume|Busy-run record|Release identity/.test(l)).map(l => l.slice(0, 300));
const gql = async (query, variables = {}, timeout = 60_000) => {
  const body = await fetch(`http://127.0.0.1:${inst.serverPort}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(timeout) }).then(r => r.json());
  if (body.errors?.length) throw Error(JSON.stringify(body.errors)); return body.data;
};
const connect = async (route, id) => {
  const ws = new WebSocket(`ws://127.0.0.1:${inst.serverPort}/ws/${route}/${id}`); sockets.push(ws);
  const frames = []; ws.on('message', raw => { try { frames.push(JSON.parse(String(raw))); } catch {} });
  await new Promise((r, j) => { ws.once('open', r); ws.once('error', j); }); return { ws, frames };
};
const send = (ws, payload) => { const id = randomUUID(); ws.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: id, dedupe_key: `agent_run_input:${id}`, ...(payload.root_subject_kind ? { command_id: randomUUID() } : {}), context_file_paths: [], image_urls: [], ...payload } })); };
const busyText = marker => `Run exactly this shell command in the foreground and wait for it to finish. Do not run it in the background, do not add a timeout, do not change it: python3 -c "import time; time.sleep(900)" ${marker}\nWhen it finishes, reply with the single word DONE.`;
let models;
const loadModels = async () => {
  const pick = async (rk, re) => (await gql('query($r:String){providerModelCatalogSnapshots(runtimeKind:$r){llmModels{modelIdentifier value}}}', { r: rk })).providerModelCatalogSnapshots.flatMap(x => x.llmModels).find(x => re.test(x.modelIdentifier) || re.test(x.value ?? ''))?.modelIdentifier;
  models = { codex: await pick('codex_app_server', /gpt-6\.1-terra/), claude: await pick('claude_agent_sdk', /haiku/i) }; log('models', models);
};
const launch = rt => rt === 'codex' ? { runtimeKind: 'codex_app_server', llmModelIdentifier: models.codex, llmConfig: { reasoning_effort: 'medium' }, autoExecuteTools: true, workspaceRootPath: workspace }
  : { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: models.claude, autoExecuteTools: true, workspaceRootPath: workspace };
const defs = {};
const agentDef = async (name, extra = {}) => defs[name] ??= (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}', { input: { name: `${name} ${tag}`, role: 'engineer', description: 'rr285 desktop probe', instructions: 'Follow the user instructions exactly. Use your shell tool to run commands.', category: 'api-e2e', skillNames: [], ...extra } })).createAgentDefinition.id;
const segment = n => `${n} ${tag}`.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const standalone = async (rt, defName, text, defExtra = {}) => {
  const r = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: { agentDefinitionId: await agentDef(defName, defExtra), ...launch(rt) } })).createAgentRun; assert(r.success, r.message);
  const c = await connect('agent', r.runId); await wait(() => c.frames.some(f => f.type === 'CONNECTED'), 'connected'); send(c.ws, { content: text }); return r.runId;
};
const quitAndObserve = async label => {
  const pid = inst.pid; const t = Date.now(); void page.evaluate(() => window.electronAPI.startShutdown()).catch(() => {});
  await wait(() => !alive(pid), `${label} exit`, 45_000, 100).catch(() => {});
  const out = { label, electronGoneMs: alive(pid) ? null : Date.now() - t };
  for (const ws of sockets.splice(0)) ws.terminate(); await browser?.close().catch(() => {}); browser = null; page = null;
  await cli(['stop', inst.instanceId]); stopped.add(inst.instanceId); log('quit', out); return out;
};
const recordFile = join(dataRoot, 'server-data', 'restart-resume', 'busy-runs.json');
const readRecord = async () => { try { return JSON.parse(await fs.readFile(recordFile, 'utf8')); } catch (e) { return e.code === 'ENOENT' ? null : { unreadable: String(e) }; } };
const noticeCount = p => (JSON.stringify(p?.conversation ?? []).match(/application restarted at/gi) ?? []).length;
const projection = async id => gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id }).then(d => d.getRunProjection, e => ({ error: String(e).slice(0, 200) }));
// DOM: every visible occurrence of the notice text, and whether it sits inside a system-notice segment.
const noticeDom = () => page.evaluate(() => {
  const hits = []; const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) { const n = walker.currentNode; if (/application restarted at/i.test(n.textContent ?? '')) { const el = n.parentElement; hits.push({ inSystemSegment: !!el?.closest('[data-testid="system-task-notification-segment"]'), text: (n.textContent ?? '').slice(0, 120) }); } }
  return { segments: document.querySelectorAll('[data-testid="system-task-notification-segment"]').length, hits, url: location.href };
});
const openTeamInWindow = async teamName => {
  // As a user would: the history panel lists the Team run by its definition name; open it.
  // The history panel groups runs under their workspace folder ("workspace"), collapsed at start.
  const folder = page.getByText('workspace', { exact: true }).first();
  await folder.waitFor({ timeout: 20_000 }); await folder.click(); await delay(1500);
  const loc = page.getByText(teamName, { exact: false }).first();
  await loc.waitFor({ timeout: 20_000 }); if (!(await page.getByText('Run exactly this shell', { exact: false }).first().isVisible().catch(() => false))) await loc.click(); await delay(2500);
  // The Team's run row (its summary is the first message) opens the run with its member conversation.
  const row = page.getByText('Run exactly this shell', { exact: false }).first();
  await row.waitFor({ timeout: 20_000 }); await row.click(); await delay(5000);
};
const expandWorkspace = async () => {
  const ws = page.locator('[data-test="workspace-row"]', { hasText: /^\s*workspace\s*$/ }).first(); await ws.waitFor({ timeout: 30_000 });
  if (await ws.getAttribute('aria-expanded') !== 'true') { await ws.locator('button').first().click(); await delay(1000); }
};
const openRunInWindow = async (defName, runId) => {
  await expandWorkspace();
  const agent = page.locator('[data-test="workspace-agent-row"]', { hasText: `${defName} ${tag}` }).first(); await agent.waitFor({ timeout: 30_000 });
  if (await agent.getAttribute('aria-expanded') !== 'true') { await agent.click(); await delay(1000); }
  const row = page.locator(`[data-test="workspace-agent-run-row"][data-run-id="${runId}"]`); await row.waitFor({ timeout: 30_000 }); await row.click(); await delay(5000);
  return noticeDom();
};
const openCopyInWindow = async (hostRunId, copyRunId) => {
  const row = page.locator(`[data-test="workspace-agent-run-task-tree"][data-run-id="${hostRunId}"] [data-test="workspace-team-transient-execution-row"][data-agent-run-id="${copyRunId}"]`).first();
  await row.waitFor({ timeout: 30_000 }); await row.click(); await delay(5000);
  return noticeDom();
};
try {
  await fs.mkdir(evidence, { recursive: true });
  await start('X'); await loadModels();
  const m = l => `${tag}_${l}`; const roots = [];
  if (!teamOnly || hostOnly) roots.push({ label: 'sa-codex', kind: 'agent', runId: await standalone('codex', 'Desk Agent', busyText(m('sa-codex'))), marker: m('sa-codex') });
  if (!teamOnly) roots.push({ label: 'sa-claude', kind: 'agent', runId: await standalone('claude', 'Desk Agent', busyText(m('sa-claude'))), marker: m('sa-claude') });
  if (!hostOnly) { // Team member (Codex)
    const coordinator = await agentDef('Desk Team Coordinator'); const teamName = `Desk Team ${tag}`;
    const teamDefinitionId = (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}', { input: { name: teamName, description: 'probe', instructions: 'Members follow the user instructions exactly.', coordinatorMemberName: 'coordinator', nodes: [{ memberName: 'coordinator', ref: coordinator, refScope: 'SHARED' }] } })).createAgentTeamDefinition.id;
    const created = (await gql('mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}', { input: { teamDefinitionId, teamConfigs: [{ teamAddress: '/', ...launch('codex') }], memberConfigs: [{ memberAddress: '/coordinator', agentDefinitionId: coordinator, ...launch('codex') }] } })).createAgentTeamRun; assert(created.success, created.message);
    const tree = JSON.stringify((await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: created.teamRunId })).getTeamRunResumeConfig.executionTree);
    const memberRunId = tree.match(/"agent_?[rR]un_?[iI]d":"([^"]+)"/)?.[1];
    const c = await connect('agent-team', created.teamRunId); await delay(800); send(c.ws, { agent_run_id: memberRunId, content: busyText(m('team-codex')) });
    roots.push({ label: 'team-codex', kind: 'team', runId: memberRunId, rootId: created.teamRunId, teamName, marker: m('team-codex') });
  }
  if (!teamOnly) { // Org agent (Claude)
    const manager = await agentDef('Desk Org Manager');
    const orgId = (await gql('mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}', { input: { name: `Desk Org ${tag}`, description: 'probe', instructions: 'Members follow the user instructions exactly.', handoffs: [], members: [{ memberName: 'manager', ref: manager, refType: 'AGENT', refScope: 'SHARED' }] } })).createAgentOrgDefinition.id;
    const created = (await gql('mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}', { input: { agentOrgDefinitionId: orgId, rootConfiguration: launch('claude'), agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun; assert(created.success, created.message);
    const tree = (await gql('query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}', { id: created.agentOrgRunId })).getAgentOrgRunConfig.executionTree;
    const member = (tree.rootOrg ?? tree.root_org).members.find(x => x.address === '/manager'); const memberRunId = member.agentRunId ?? member.agent_run_id;
    const c = await connect('agent-org', created.agentOrgRunId); await delay(800);
    send(c.ws, { root_subject_kind: 'agent_org', root_run_id: created.agentOrgRunId, target_agent_run_id: memberRunId, content: busyText(m('org-claude')) });
    roots.push({ label: 'org-claude', kind: 'org', runId: memberRunId, rootId: created.agentOrgRunId, marker: m('org-claude') });
  }
  if (!teamOnly || withCopy) { // Claude host delegating to a Codex worker copy, then running its own long command
    await agentDef('Desk Worker', { instructions: 'You are a worker. Do exactly what the task description says, with your shell tool.', defaultLaunchConfig: { runtimeKind: 'codex_app_server', llmModelIdentifier: models.codex, llmConfig: { reasoning_effort: 'medium' } } });
    const delegation = { recipient_address: `/${segment('Desk Worker')}`, description: busyText(m('copy')) };
    const hostId = await standalone('claude', 'Desk Host', `Call delegate_task exactly once now with these exact JSON arguments: ${JSON.stringify(delegation)}\nDo not call any other tool. After it returns, reply DELEGATED.`, { toolNames: ['delegate_task'] });
    await wait(() => descendants(inst.pid).find(x => x.command.includes(m('copy')) && /python/i.test(x.command)), 'copy busy', 240_000);
    const hc = await connect('agent', hostId); await wait(() => hc.frames.some(f => f.type === 'CONNECTED'), 'host connected'); await delay(3000); send(hc.ws, { content: busyText(m('host')) });
    roots.push({ label: 'host', kind: 'agent', runId: hostId, marker: m('host') });
  }
  for (const r of [...roots, ...(teamOnly && !withCopy ? [] : [{ label: 'copy', marker: m('copy') }])]) { const p = await wait(() => descendants(inst.pid).find(x => x.command.includes(r.marker) && /python/i.test(x.command)), `${r.label} busy`, 240_000); log('busy', { label: r.label, pid: p.pid }); }
  await delay(2000);
  record.roots = roots;
  await page.screenshot({ path: join(evidence, `${caseId}-X-busy.png`) }).catch(() => {});
  record.quitX = await quitAndObserve('quit X (busy)');
  record.recordAfterQuit = await readRecord();
  record.quitXLines = resumeLines(await fs.readFile(instances[0].logPath, 'utf8').catch(() => ''));
  log('record after quit', { entries: record.recordAfterQuit?.entries?.map(e => ({ kind: e.root.rootSubjectKind, place: e.place, version: e.version, run: e.agentRunId.slice(-10) })), lines: record.quitXLines });
  await fs.writeFile(stampPath, JSON.stringify({ version: X1 }, null, 2) + '\n'); log('stamp in app copy', X1);
  await start('X1');
  await wait(async () => resumeLines(await instanceLog()).some(l => /Restart resume after the update|Restart resume failed/.test(l)), 'resume report', 180_000).catch(() => {});
  await delay(20_000);
  record.startX1Lines = resumeLines(await instanceLog());
  record.recordAfterStart = await readRecord();
  const copyRunId = (record.recordAfterQuit?.entries ?? []).find(e => e.place === 'delegated')?.agentRunId ?? null;
  record.after = {};
  const hostRun = roots.find(r => r.label === 'host') ?? { runId: 'none' };
  const collab = teamOnly && !withCopy ? '' : await gql('query($id:String!){agentRunCollaboration(runId:$id)}', { id: hostRun.runId }).then(d => JSON.stringify(d.agentRunCollaboration), e => String(e));
  const copyAddress = copyRunId ? (collab.match(new RegExp(`"address":"([^"]+)"[^{}]*"agent_?[rR]un_?[iI]d":"${copyRunId}"`))?.[1] ?? collab.match(new RegExp(`"agent_?[rR]un_?[iI]d":"${copyRunId}"[^{}]*"address":"([^"]+)"`))?.[1] ?? `/${segment('Desk Worker')}`) : null;
  const memberProjection = async r => r.kind === 'team' ? gql('query($t:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$t,agentRunId:$a){conversation}}', { t: r.rootId, a: r.runId }).then(d => d.getTeamMemberRunProjection, e => ({ error: String(e).slice(0, 200) }))
    : r.kind === 'org' ? gql('query($o:String!,$m:String!,$a:String!){getAgentOrgMemberRunProjection(orgRunId:$o,memberAddress:$m,agentRunId:$a){conversation}}', { o: r.rootId, m: '/manager', a: r.runId }).then(d => d.getAgentOrgMemberRunProjection, e => ({ error: String(e).slice(0, 200) }))
    : r.label === 'copy' ? gql('query($h:String!,$m:String!,$a:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$m,agentRunId:$a){conversation}}', { h: hostRun.runId, m: copyAddress, a: r.runId }).then(d => d.agentRunCollaborationMemberProjection, e => ({ error: String(e).slice(0, 200) }))
    : projection(r.runId);
  for (const r of [...roots, ...(copyRunId ? [{ label: 'copy', runId: copyRunId, marker: m('copy') }] : [])]) {
    const p = await memberProjection(r);
    record.after[r.label] = { notices: noticeCount(p), listsDelegated: /These runs you delegated were resumed too/i.test(JSON.stringify(p?.conversation ?? [])), noticeText: (JSON.stringify(p?.conversation ?? []).match(/The application restarted[^"]{0,500}/i) ?? [null])[0], busyAgain: !!descendants(inst.pid).find(x => x.command.includes(r.marker)), error: p?.error ?? null, lastEntries: (p?.conversation ?? []).slice(-2).map(e => JSON.stringify(e).slice(0, 300)) };
  }
  log('after X1 start', { lines: record.startX1Lines, after: record.after, recordAfterStart: record.recordAfterStart });
  // CR-C2 / FU-004: the Team member's notice in the window, live and after a reload.
  const team = roots.find(r => r.kind === 'team') ?? { teamName: `Desk Agent ${tag}` };
  try {
    await openTeamInWindow(team.teamName);
    record.memberDomLive = await noticeDom(); await page.screenshot({ path: join(evidence, `${caseId}-X1-team-live.png`) });
    log('member notice in window (live)', record.memberDomLive);
    await page.reload(); await delay(6000); await openTeamInWindow(team.teamName);
    record.memberDomReload = await noticeDom(); await page.screenshot({ path: join(evidence, `${caseId}-X1-team-after-reload.png`) });
    log('member notice in window (after reload)', record.memberDomReload);
    if (withCopy) {
      // The delegated copy and its host, opened later from the host's task rows, then after a reload.
      for (const pass of ['live', 'after-reload']) {
        if (pass === 'after-reload') { await page.reload(); await delay(6000); }
        record[`hostDom-${pass}`] = await openRunInWindow('Desk Host', hostRun.runId); await page.screenshot({ path: join(evidence, `${caseId}-X1-host-${pass}.png`) });
        log(`host notice in window (${pass})`, record[`hostDom-${pass}`]);
        record[`copyDom-${pass}`] = await openCopyInWindow(hostRun.runId, copyRunId); await page.screenshot({ path: join(evidence, `${caseId}-X1-copy-${pass}.png`) });
        log(`copy notice in window (${pass})`, record[`copyDom-${pass}`]);
      }
    }
  } catch (e) { record.uiError = String(e).slice(0, 300); log('ui step failed', record.uiError); await page.screenshot({ path: join(evidence, `${caseId}-X1-ui-failure.png`) }).catch(() => {}); }
  record.quitX1 = await quitAndObserve('quit X1');
  record.result = 'Completed';
} catch (error) { record.result = 'Error'; record.error = String(error.stack ?? error); console.error(error); process.exitCode = 1; }
finally {
  for (const ws of sockets) ws.terminate(); await browser?.close().catch(() => {});
  for (const i of instances) { if (stopped.has(i.instanceId)) continue; try { await cli(['stop', i.instanceId]); } catch (e) { log('stop failed', String(e)); } }
  const left = table().filter(r => r.command.includes(tag) && /python/i.test(r.command) && !r.command.includes('ps -ww')); for (const r of left) { try { process.kill(r.pid, 'SIGKILL'); } catch {} } record.fallbackCleanup = left.length;
  for (const [i, x] of instances.entries()) await fs.copyFile(x.logPath, join(evidence, `${caseId}-instance-${i}.log`)).catch(() => {});
  await fs.rm(own, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); record.rootRemoved = true;
  await fs.writeFile(join(evidence, `${caseId}-result.json`), JSON.stringify(record, null, 2));
  console.log(JSON.stringify({ result: record.result, error: record.error ?? null, fallbackCleanup: left.length }));
}

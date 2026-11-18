/** TEMPORARY API/E2E probe (autobyteus-284), kept as evidence; not repository test code.
 * Drives an isolated desktop instance of the clean worktree build (`pnpm isolated-app start --from-worktree`, own data root,
 * own ports and process group; the user's running AutoByteus is never touched). Live runtimes: Codex `gpt-6.1-terra`
 * (effort medium, throwaway CODEX_HOME passed through) and Claude (host login). Busy = a foreground
 * `python3 -c "import time; time.sleep(900)" <marker>` started by the agent.
 * Modes (case IDs):
 *   idle        API-10  idle user quit (window.electronAPI.startShutdown = the menu Quit's app.quit()); relaunch: one server
 *   busy-quit   API-15 + API-11  busy Codex run → "Restart server"; then busy Codex + Claude standalone, Codex Team member,
 *               Claude Org agent → user quit; relaunch: one server; each root restored and continued (AC-006, AC-009)
 *   busy-sigterm API-12 busy Codex + Claude → SIGTERM to Electron main only; relaunch: one server
 *   wedged-quit API-13 busy Codex + Claude → SIGSTOP the embedded server → user quit → desktop force path; relaunch
 * Usage (cwd = the clean checkout root):
 *   env -i PATH="$PATH" HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" TMPDIR="$TMPDIR" node <this file> <mode> <evidence dir>
 */
import fs from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir, homedir } from 'node:os';
import { spawn, execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const [mode, evidenceArg] = process.argv.slice(2);
const root = process.cwd(), evidence = resolve(evidenceArg);
const require = createRequire(join(root, 'autobyteus-web/package.json'));
const { chromium } = require('playwright-core'), WebSocket = require('ws');
const caseId = { idle: 'API-10', 'busy-quit': 'API-11', 'busy-quit-plain': 'API-11B', 'restart-then-quit': 'API-11C', 'busy-sigterm': 'API-12', 'wedged-quit': 'API-13' }[mode];
assert(caseId, `unknown mode ${mode}`);
const own = await fs.realpath(await fs.mkdtemp(join(tmpdir(), `bq284-desk-${mode}-`)));
const dataRoot = join(own, 'data-root'), workspace = join(own, 'workspace'), codexHome = join(own, 'codex-home');
for (const d of [dataRoot, workspace, codexHome]) await fs.mkdir(d);
await fs.symlink(join(homedir(), '.codex', 'auth.json'), join(codexHome, 'auth.json'));
await fs.writeFile(join(codexHome, 'config.toml'), 'check_for_update_on_startup = false\n');
const runTag = `BQ284D${Date.now().toString(36)}`;
const T0 = Date.now();
const record = { case: caseId, mode, root, commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), date: new Date().toISOString(), own, runTag, steps: [] };
const log = (step, value) => { const at = ((Date.now() - T0) / 1000).toFixed(1); record.steps.push({ at, step, value }); console.log(`[+${at}s] ${step} ${JSON.stringify(value).slice(0, 500)}`); };
const delay = ms => new Promise(r => setTimeout(r, ms));
const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code !== 'ESRCH'; } };
const wait = async (fn, label, timeout = 30_000, step = 100) => { const end = Date.now() + timeout; while (Date.now() < end) { const v = await fn(); if (v) return v; await delay(step); } throw Error(`Timed out: ${label}`); };
const table = () => execFileSync('ps', ['-ww', '-A', '-o', 'pid=,ppid=,pgid=,command='], { encoding: 'utf8' }).split('\n').flatMap(line => {
  const m = line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/); return m ? [{ pid: +m[1], ppid: +m[2], pgid: +m[3], command: m[4] }] : [];
});
const brief = r => ({ ...r, command: r.command.length > 300 ? `${r.command.slice(0, 160)} … ${r.command.slice(-120)}` : r.command });
const descendants = rootPid => { const rows = table(), out = []; let frontier = [rootPid]; while (frontier.length) { const kids = rows.filter(r => frontier.includes(r.ppid) && !out.some(o => o.pid === r.pid)); out.push(...kids); frontier = kids.map(k => k.pid); } return out; };
const serversForData = () => table().filter(r => r.command.includes('dist/app.js') && r.command.includes(dataRoot)).map(brief);
const markedAll = () => table().filter(r => r.command.includes(runTag) && /python/i.test(r.command) && !r.command.includes('ps -ww')).map(brief);
const env = { PATH: process.env.PATH, HOME: process.env.HOME, USER: process.env.USER, LOGNAME: process.env.LOGNAME, TMPDIR: process.env.TMPDIR, CODEX_HOME: codexHome };
const cli = async args => {
  const c = spawn(process.execPath, ['autobyteus-web/scripts/isolated-app/cli.mjs', ...args], { cwd: root, env }); let out = '', err = '';
  c.stdout.on('data', b => { out += b; }); c.stderr.on('data', b => { err += b; });
  const exit = await new Promise(r => c.on('exit', r)); const parsed = (() => { try { return JSON.parse(out); } catch { return null; } })();
  log('isolated-app', { args, exit, ok: parsed?.ok, error: parsed?.error ?? null }); assert.equal(exit, 0, `${args.join(' ')}: ${out}${err}`); return parsed.result;
};
let inst = null, browser = null, page = null;
const sockets = [], instances = [];
const start = async label => {
  inst = await cli(['start', ...(process.env.DESKTOP_APP ? ['--app', process.env.DESKTOP_APP] : ['--from-worktree']), '--data-root', dataRoot]);
  instances.push(inst);
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${inst.controlPort}`);
  page = browser.contexts()[0].pages().find(p => !p.url().startsWith('devtools:'));
  const server = await wait(() => serversForData().find(r => r.ppid === inst.pid), 'embedded server pid', 30_000);
  log('instance started', { label, instanceId: inst.instanceId, electronPid: inst.pid, serverPid: server.pid, serverPort: inst.serverPort, servers: serversForData().length });
  return { inst, server };
};
const gql = async (query, variables = {}, timeout = 60_000) => {
  const body = await fetch(`http://127.0.0.1:${inst.serverPort}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(timeout) }).then(r => r.json());
  if (body.errors?.length) throw Error(JSON.stringify(body.errors)); return body.data;
};
const connect = async (route, id) => {
  const ws = new WebSocket(`ws://127.0.0.1:${inst.serverPort}/ws/${route}/${id}`); sockets.push(ws);
  const frames = []; ws.on('message', raw => { try { frames.push(JSON.parse(String(raw))); } catch {} });
  await new Promise((r, j) => { ws.once('open', r); ws.once('error', j); });
  return { ws, frames };
};
const send = (ws, payload) => { const id = randomUUID(); ws.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: id, dedupe_key: `agent_run_input:${id}`, ...(payload.root_subject_kind ? { command_id: randomUUID() } : {}), context_file_paths: [], image_urls: [], ...payload } })); };
const busyText = marker => `Run exactly this shell command in the foreground and wait for it to finish. Do not run it in the background, do not add a timeout, do not change it: python3 -c "import time; time.sleep(900)" ${marker}\nWhen it finishes, reply with the single word DONE.`;
let models;
const loadModels = async () => {
  const pick = async (runtimeKind, re) => {
    const all = (await gql('query($r:String){providerModelCatalogSnapshots(runtimeKind:$r){llmModels{modelIdentifier value}}}', { r: runtimeKind })).providerModelCatalogSnapshots.flatMap(x => x.llmModels);
    const m = all.find(x => re.test(x.modelIdentifier) || re.test(x.value ?? '')); assert(m, `${runtimeKind} ${re} missing: ${all.map(x => x.modelIdentifier)}`); return m.modelIdentifier;
  };
  models = { codex: await pick('codex_app_server', /gpt-6\.1-terra/), claude: await pick('claude_agent_sdk', /haiku/i) };
  log('models', models);
};
const launch = runtime => runtime === 'codex'
  ? { runtimeKind: 'codex_app_server', llmModelIdentifier: models.codex, llmConfig: { reasoning_effort: 'medium' }, autoExecuteTools: true, workspaceRootPath: workspace }
  : { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: models.claude, autoExecuteTools: true, workspaceRootPath: workspace };
const defs = {};
const agentDef = async name => defs[name] ??= (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}',
  { input: { name: `${name} ${runTag}`, role: 'engineer', description: 'busy quit desktop probe', instructions: 'Follow the user instructions exactly. Use your shell tool to run commands.', category: 'api-e2e' } })).createAgentDefinition.id;
const roots = [];
const standalone = async (runtime, label, text) => {
  const created = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: { agentDefinitionId: await agentDef('Desk Agent'), ...launch(runtime) } })).createAgentRun;
  assert(created.success, created.message);
  const c = await connect('agent', created.runId); await wait(() => c.frames.some(f => f.type === 'CONNECTED'), `${label} connected`);
  send(c.ws, { content: text });
  const r = { label, runtime, kind: 'agent', runId: created.runId, rootId: created.runId }; roots.push(r); log('standalone sent', r); return r;
};
const teamMember = async (runtime, label, text) => {
  const coordinator = await agentDef('Desk Team Coordinator');
  const teamDefinitionId = (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}', { input: { name: `Desk Team ${runTag}`, description: 'probe', instructions: 'Members follow the user instructions exactly.', coordinatorMemberName: 'coordinator', nodes: [{ memberName: 'coordinator', ref: coordinator, refScope: 'SHARED' }] } })).createAgentTeamDefinition.id;
  const created = (await gql('mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}', { input: { teamDefinitionId, teamConfigs: [{ teamAddress: '/', ...launch(runtime) }], memberConfigs: [{ memberAddress: '/coordinator', agentDefinitionId: coordinator, ...launch(runtime) }] } })).createAgentTeamRun;
  assert(created.success, created.message);
  const tree = JSON.stringify((await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: created.teamRunId })).getTeamRunResumeConfig.executionTree);
  const memberRunId = tree.match(/"agent_?[rR]un_?[iI]d":"([^"]+)"/)?.[1]; assert(memberRunId, 'team member run id');
  const c = await connect('agent-team', created.teamRunId); await delay(1000);
  send(c.ws, { agent_run_id: memberRunId, content: text });
  const r = { label, runtime, kind: 'team', runId: memberRunId, rootId: created.teamRunId }; roots.push(r); log('team sent', r); return r;
};
const orgAgent = async (runtime, label, text) => {
  const manager = await agentDef('Desk Org Manager');
  const orgId = (await gql('mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}', { input: { name: `Desk Org ${runTag}`, description: 'probe', instructions: 'Members follow the user instructions exactly.', handoffs: [], members: [{ memberName: 'manager', ref: manager, refType: 'AGENT', refScope: 'SHARED' }] } })).createAgentOrgDefinition.id;
  const created = (await gql('mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}', { input: { agentOrgDefinitionId: orgId, rootConfiguration: launch(runtime), agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
  assert(created.success, created.message);
  const tree = (await gql('query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}', { id: created.agentOrgRunId })).getAgentOrgRunConfig.executionTree;
  const member = (tree.rootOrg ?? tree.root_org).members.find(m => m.address === '/manager'); const memberRunId = member.agentRunId ?? member.agent_run_id;
  const c = await connect('agent-org', created.agentOrgRunId); await delay(1000);
  send(c.ws, { root_subject_kind: 'agent_org', root_run_id: created.agentOrgRunId, target_agent_run_id: memberRunId, content: text });
  const r = { label, runtime, kind: 'org', runId: memberRunId, rootId: created.agentOrgRunId }; roots.push(r); log('org sent', r); return r;
};
const busy = async (fn, runtime, label) => { const marker = `${runTag}_${label}`; const r = await fn(runtime, label, busyText(marker)); r.marker = marker; return r; };
const waitBusy = async (electronPid, runs) => {
  for (const r of runs) {
    const proc = await wait(() => descendants(electronPid).find(x => x.command.includes(r.marker) && /python/i.test(x.command)), `${r.label} busy`, 240_000, 250);
    r.proc = { pid: proc.pid, ppid: proc.ppid, pgid: proc.pgid }; log('busy', { label: r.label, ...r.proc });
  }
  await delay(1500);
};
const snapshot = electronPid => descendants(electronPid).map(brief);
const observeExit = async (label, electronPid, serverPid, runs, before, timeout = 40_000, started = Date.now()) => { let serverGoneAt = null, electronGoneAt = null;
  await wait(() => { const now = Date.now(); if (!serverGoneAt && !alive(serverPid)) serverGoneAt = now; if (!electronGoneAt && !alive(electronPid)) electronGoneAt = now; return serverGoneAt && electronGoneAt; }, `${label} exit`, timeout, 50).catch(() => {});
  await delay(1000);
  const out = { label, electronPid, serverPid, serverGoneMs: serverGoneAt ? serverGoneAt - started : null, electronGoneMs: electronGoneAt ? electronGoneAt - started : null,
    before, survivors: before.filter(r => alive(r.pid)), markedLeft: markedAll(), serversForDataAfter: serversForData(),
    tools: (runs ?? []).map(r => ({ label: r.label, kind: r.kind, runtime: r.runtime, ...r.proc, aliveAfter: r.proc ? alive(r.proc.pid) : null })) };
  log(`${label} observed`, { ...out, before: out.before.length });
  return out;
};
const quitByUser = async () => { const at = Date.now(); void page.evaluate(() => window.electronAPI.startShutdown()).catch(() => {}); return at; };
const closeBrowser = async () => { for (const ws of sockets.splice(0)) ws.terminate(); await browser?.close().catch(() => {}); browser = null; page = null; };
const stopped = new Set();
const relaunch = async label => {
  await cli(['stop', inst.instanceId]); stopped.add(inst.instanceId);
  const started = await start(label);
  const servers = serversForData();
  const relaunchCheck = { label, serversForData: servers, exactlyOne: servers.length === 1, previousSessionLeft: markedAll() };
  log('relaunch check', relaunchCheck);
  return { ...started, relaunchCheck };
};
const continueRoot = async r => {
  const reply = `CONTINUED_${r.label.replace(/[^a-z0-9]/gi, '')}`;
  let c;
  if (r.kind === 'agent') {
    const restored = (await gql('mutation($id:String!){restoreAgentRun(agentRunId:$id){success message runId}}', { id: r.runId })).restoreAgentRun; assert(restored.success, restored.message);
    c = await connect('agent', r.runId); await wait(() => c.frames.some(f => f.type === 'CONNECTED'), 'connected');
    send(c.ws, { content: `Reply with exactly ${reply} and nothing else. Do not use any tool.` });
  } else if (r.kind === 'team') {
    const restored = (await gql('mutation($id:String!){restoreAgentTeamRun(teamRunId:$id){success message}}', { id: r.rootId })).restoreAgentTeamRun; assert(restored.success, restored.message);
    c = await connect('agent-team', r.rootId); await delay(1000);
    send(c.ws, { agent_run_id: r.runId, content: `Reply with exactly ${reply} and nothing else. Do not use any tool.` });
  } else {
    const restored = (await gql('mutation($id:String!){restoreAgentOrgRun(agentOrgRunId:$id){success message}}', { id: r.rootId })).restoreAgentOrgRun; assert(restored.success, restored.message);
    c = await connect('agent-org', r.rootId); await delay(1000);
    send(c.ws, { root_subject_kind: 'agent_org', root_run_id: r.rootId, target_agent_run_id: r.runId, content: `Reply with exactly ${reply} and nothing else. Do not use any tool.` });
  }
  const started = Date.now();
  await wait(() => JSON.stringify(c.frames).includes(reply) && c.frames.some(f => /TURN_COMPLETED/.test(JSON.stringify(f).slice(0, 4000))), `${r.label} continued reply`, 180_000, 250);
  const out = { label: r.label, kind: r.kind, runtime: r.runtime, rootId: r.rootId, replied: reply, afterMs: Date.now() - started };
  log('continued', out); return out;
};
try {
  await fs.mkdir(evidence, { recursive: true });
  let { server } = await start('first');
  if (mode !== 'idle') await loadModels();
  if (mode === 'idle') {
    await delay(3000);
    const before = snapshot(inst.pid);
    const t = await quitByUser();
    record.quit = await observeExit('idle quit', inst.pid, server.pid, [], before, 40_000, t);
    await closeBrowser();
    record.relaunch = (await relaunch('second')).relaunchCheck;
    const s2 = serversForData()[0]?.pid ?? 0, b2 = snapshot(inst.pid); const t2 = await quitByUser(); record.secondQuit = await observeExit('second idle quit', inst.pid, s2, [], b2, 40_000, t2);
    await closeBrowser();
  } else if (mode === 'busy-quit' || mode === 'busy-quit-plain') {
    // API-15: "Restart server" while a Codex run is busy (skipped in busy-quit-plain, the API-11 bisection).
    if (mode === 'busy-quit') {
    const r0 = await busy(standalone, 'codex', 'restart-codex');
    await waitBusy(inst.pid, [r0]);
    const beforeRestart = snapshot(inst.pid);
    const oldServer = server.pid, t = Date.now();
    await page.evaluate(() => window.electronAPI.restartServer());
    await wait(async () => (await page.evaluate(() => window.electronAPI.getServerStatus())).status === 'running' && serversForData().some(r => r.pid !== oldServer), 'server restarted', 60_000, 200);
    server = serversForData().find(r => r.pid !== oldServer);
    record.restart = { oldServerPid: oldServer, newServerPid: server.pid, readyMs: Date.now() - t, oldServerAlive: alive(oldServer), toolAliveAfter: alive(r0.proc.pid), survivors: beforeRestart.filter(x => x.pid !== inst.pid && alive(x.pid) && !descendants(inst.pid).some(d => d.pid === x.pid)), serversForData: serversForData() };
    log('restart observed', record.restart);
    for (const ws of sockets.splice(0)) ws.terminate();
    }
    // API-11: busy roots, then user quit.
    const runs = [await busy(standalone, 'codex', 'sa-codex'), await busy(standalone, 'claude', 'sa-claude'), await busy(teamMember, 'codex', 'team-codex'), await busy(orgAgent, 'claude', 'org-claude')];
    await waitBusy(inst.pid, runs);
    const before = snapshot(inst.pid);
    const tq = await quitByUser();
    record.quit = await observeExit('busy user quit', inst.pid, server.pid, runs, before, 40_000, tq);
    await closeBrowser();
    record.relaunch = (await relaunch('second')).relaunchCheck;
    record.continued = [];
    for (const r of runs) record.continued.push(await continueRoot(r).catch(e => ({ label: r.label, kind: r.kind, error: String(e).slice(0, 400) })));
    { const sf = serversForData()[0]?.pid ?? 0, bf = snapshot(inst.pid); const tf = await quitByUser(); record.finalQuit = await observeExit('final quit', inst.pid, sf, [], bf, 40_000, tf); }
    await closeBrowser();
  } else if (mode === 'restart-then-quit') {
    // API-11 bisection: Restart server while a Codex run is busy, then quit with no new runs.
    const historyQuery = 'query{listWorkspaceRunHistory(limitPerAgent:50){agentDefinitions{runs{runId isActive status statusSource terminatedAt}}}}';
    const r0 = await busy(standalone, 'codex', 'restart-codex');
    await waitBusy(inst.pid, [r0]);
    const oldServer = server.pid, t = Date.now();
    await page.evaluate(() => window.electronAPI.restartServer());
    await wait(async () => (await page.evaluate(() => window.electronAPI.getServerStatus())).status === 'running' && serversForData().some(r => r.pid !== oldServer), 'server restarted', 60_000, 200);
    server = serversForData().find(r => r.pid !== oldServer);
    record.restart = { oldServerPid: oldServer, newServerPid: server.pid, readyMs: Date.now() - t, oldServerAlive: alive(oldServer), toolAliveAfter: alive(r0.proc.pid) };
    log('restart observed', record.restart);
    for (const ws of sockets.splice(0)) ws.terminate();
    const samples = [];
    for (const waitMs of [0, 5000, 10000]) { await delay(waitMs ? 5000 : 0); samples.push({ atMs: Date.now() - t, runs: (await gql(historyQuery)).listWorkspaceRunHistory.flatMap(g => g.agentDefinitions.flatMap(d => d.runs)), tree: snapshot(inst.pid).filter(x => x.pid !== server.pid) }); }
    record.afterRestartSamples = samples; log('after-restart samples', samples.map(x => ({ atMs: x.atMs, runs: x.runs, tree: x.tree.length })));
    const before = snapshot(inst.pid);
    const tq = await quitByUser();
    record.quit = await observeExit('quit after busy restart', inst.pid, server.pid, [], before, 40_000, tq);
    await closeBrowser();
  } else if (mode === 'busy-sigterm' || mode === 'wedged-quit') {
    const runs = [await busy(standalone, 'codex', 'sa-codex'), await busy(standalone, 'claude', 'sa-claude')];
    await waitBusy(inst.pid, runs);
    const before = snapshot(inst.pid);
    if (mode === 'busy-sigterm') {
      const ts = Date.now(); process.kill(inst.pid, 'SIGTERM');
      record.quit = await observeExit('busy SIGTERM to Electron main', inst.pid, server.pid, runs, before, 40_000, ts);
    } else {
      process.kill(server.pid, 'SIGSTOP');
      log('server stopped (SIGSTOP)', { serverPid: server.pid });
      const tw = await quitByUser();
      record.quit = await observeExit('wedged-server user quit', inst.pid, server.pid, runs, before, 45_000, tw);
    }
    await closeBrowser();
    record.relaunch = (await relaunch('second')).relaunchCheck;
    { const sf = serversForData()[0]?.pid ?? 0, bf = snapshot(inst.pid); const tf = await quitByUser(); record.finalQuit = await observeExit('final quit', inst.pid, sf, [], bf, 40_000, tf); }
    await closeBrowser();
  }
  record.result = 'Completed';
} catch (error) { record.result = 'Error'; record.error = String(error.stack ?? error); console.error(error); process.exitCode = 1; }
finally {
  await closeBrowser();
  for (const i of instances) { if (stopped.has(i.instanceId)) continue; try { await cli(['stop', i.instanceId]); } catch (e) { log('stop failed', String(e)); } }
  const left = markedAll(); for (const r of left) { try { process.kill(r.pid, 'SIGKILL'); } catch {} }
  record.fallbackCleanup = left; record.serversForDataAtEnd = serversForData();
  const logs = execFileSync('find', [dataRoot, '(', '-name', 'server.log', '-o', '-name', 'app.log', ')', '-type', 'f'], { encoding: 'utf8' }).split('\n').filter(Boolean);
  for (const [i, file] of logs.entries()) await fs.copyFile(file, join(evidence, `${caseId}-app-${i}-${file.split('/').pop()}`)).catch(() => {});
  record.copiedLogs = logs.map(f => f.replace(own, '<own>'));
  for (const [i, x] of instances.entries()) await fs.copyFile(x.logPath, join(evidence, `${caseId}-instance-${i}.log`)).catch(() => {});
  await fs.rm(own, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); record.rootRemoved = true;
  await fs.writeFile(join(evidence, `${caseId}-result.json`), JSON.stringify(record, null, 2));
  console.log(JSON.stringify({ result: record.result, error: record.error ?? null, fallbackCleanup: left.length }));
}

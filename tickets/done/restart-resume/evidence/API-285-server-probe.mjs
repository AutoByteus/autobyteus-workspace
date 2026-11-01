/** TEMPORARY API/E2E probe (autobyteus-285), kept as evidence; not repository test code.
 * Real server processes (`node <server>/dist/app.js --port --data-dir`) on TEMPORARY data roots only.
 * "Update restart" = the same build with a different `dist/release-identity.json` stamp (design: the stamp is the only
 * difference). The probe writes the stamp before each start and restores the original stamp at the end.
 * Live runtimes: Codex `gpt-6.1-terra` (effort medium, throwaway CODEX_HOME), Claude (host login). Scripted native
 * inference (LM Studio-compatible SSE) for deterministic structures (delegate_task, update_task, run_bash).
 * Modes:
 *   live-update    API-02: busy Codex sa, Claude sa, Codex Team member, Claude Org agent, Claude host + busy Codex copy
 *   scripted       API-03: AC-004 (same stamp), AR-001, AR-003 (Task-closed copy), idle, AR-005, corrupt record
 *   queue-race     API-04: 3 slow Claude entries first, then native targets messaged / stopped / archived at start
 *   crash-resume   API-04B: SIGKILL during the resume, then a start
 * Usage: env -i PATH HOME USER LOGNAME TMPDIR node API-285-server-probe.mjs <mode> <server dir> <evidence dir> <case id>
 */
import fs from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir, homedir } from 'node:os';
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const [mode, serverDirArg, evidenceArg, caseId] = process.argv.slice(2);
const serverDir = resolve(serverDirArg), evidence = resolve(evidenceArg);
const WebSocket = createRequire(join(serverDir, 'package.json'))('ws');
const stampPath = join(serverDir, 'dist', 'release-identity.json');
const originalStamp = await fs.readFile(stampPath, 'utf8');
const X = JSON.parse(originalStamp).version, X1 = `${X}-rr285next`;
const own = await fs.realpath(await fs.mkdtemp(join(tmpdir(), `rr285-${mode}-`)));
const T0 = Date.now(), tag = `RR285${Date.now().toString(36)}`;
const record = { case: caseId, mode, serverDir, X, X1, date: new Date().toISOString(), own, tag, steps: [] };
const log = (step, value) => { const at = ((Date.now() - T0) / 1000).toFixed(2); record.steps.push({ at, step, value }); console.log(`[+${at}s] ${step} ${JSON.stringify(value).slice(0, 700)}`); };
const delay = ms => new Promise(r => setTimeout(r, ms));
const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code !== 'ESRCH'; } };
const wait = async (fn, label, timeout = 30_000, step = 200) => { const end = Date.now() + timeout; while (Date.now() < end) { const v = await fn(); if (v) return v; await delay(step); } throw Error(`Timed out: ${label}`); };
const table = () => execFileSync('ps', ['-ww', '-A', '-o', 'pid=,ppid=,pgid=,command='], { encoding: 'utf8' }).split('\n').flatMap(l => { const m = l.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/); return m ? [{ pid: +m[1], ppid: +m[2], pgid: +m[3], command: m[4] }] : []; });
const descendants = root => { const rows = table(), out = []; let f = [root]; while (f.length) { const k = rows.filter(r => f.includes(r.ppid) && !out.some(o => o.pid === r.pid)); out.push(...k); f = k.map(x => x.pid); } return out; };
const setStamp = async v => { await fs.writeFile(stampPath, JSON.stringify({ version: v }, null, 2) + '\n'); log('stamp', v); };

// Scripted native inference. A user message carrying `TURN:<label>` gets the planned tool calls once; anything else
// (including the restart notice) gets a short text reply.
const plans = new Map(); let calls = 0; const notices = []; const modelLog = [];
const model = createServer(async (req, res) => {
  if (req.method === 'GET') { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ models: [{ key: 'rr285-fixture', max_context_length: 65536, loaded_instances: [{ config: { context_length: 65536 } }] }] })); return; }
  let raw = ''; for await (const c of req) raw += c; calls++;
  const input = JSON.parse(raw);
  const msgs = input.messages ?? []; const lastUser = [...msgs].reverse().find(m => m.role === 'user');
  const text = typeof lastUser?.content === 'string' ? lastUser.content : JSON.stringify(lastUser?.content ?? '');
  if (/application restarted/i.test(text)) notices.push({ at: Date.now(), head: text.slice(0, 400) });
  const label = text.match(/TURN:([\w-]+)/)?.[1];
  const lastIsTool = msgs.at(-1)?.role === 'tool';
  // Round 2: which run (its first TURN label in history) asked, and for what (the order the model saw inputs in).
  const runLabel = JSON.stringify(msgs.filter(m => m.role === 'user').map(m => m.content)).match(/TURN:([\w-]+)/)?.[1] ?? null;
  modelLog.push({ at: Date.now(), runLabel, kind: lastIsTool ? 'tool-result' : /application restarted/i.test(text) ? 'notice' : /User message after the restart/.test(text) ? 'user' : label ? 'turn' : 'other',
    noticesInHistory: (JSON.stringify(msgs).match(/application restarted at/gi) ?? []).length, userInHistory: /User message after the restart/.test(JSON.stringify(msgs)) });
  const plan = label && !lastIsTool ? plans.get(label) : undefined;
  const toolCalls = plan ? (typeof plan === 'function' ? plan() : plan).map((c, i) => ({ index: i, id: `call-${label}-${calls}-${i}`, type: 'function', function: { name: c.tool, arguments: JSON.stringify(c.args) } })) : null;
  const delta = toolCalls ? { role: 'assistant', tool_calls: toolCalls } : { role: 'assistant', content: /application restarted/i.test(text) ? 'Noted the restart; continuing.' : 'Done.' };
  const chunk = (d, f) => ({ id: `fx-${calls}`, object: 'chat.completion.chunk', created: 1, model: 'rr285-fixture', choices: [{ index: 0, delta: d, finish_reason: f }] });
  res.writeHead(200, { 'content-type': 'text/event-stream' });
  res.end(`data: ${JSON.stringify(chunk(delta, null))}\n\ndata: ${JSON.stringify(chunk({}, toolCalls ? 'tool_calls' : 'stop'))}\n\ndata: [DONE]\n\n`);
});
await new Promise(r => model.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${model.address().port}`;
const codexHome = join(own, 'codex-home'); await fs.mkdir(codexHome);
await fs.symlink(join(homedir(), '.codex', 'auth.json'), join(codexHome, 'auth.json')).catch(() => {});
await fs.writeFile(join(codexHome, 'config.toml'), 'check_for_update_on_startup = false\n');
const workspace = join(own, 'workspace'); await fs.mkdir(workspace);
const freePort = () => new Promise(r => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const servers = []; const sockets = [];
const newDataRoot = async name => { const d = join(own, name); await fs.mkdir(d, { recursive: true }); await fs.writeFile(join(d, '.env'), `APP_ENV=test\nLMSTUDIO_HOSTS=${origin}\n`); return d; };
const recordPath = data => join(data, 'restart-resume', 'busy-runs.json');
const readRecord = async data => { try { return JSON.parse(await fs.readFile(recordPath(data), 'utf8')); } catch (e) { return e.code === 'ENOENT' ? null : { unreadable: String(e) }; } };
const startServer = async (data, label, opts = {}) => {
  const port = await freePort();
  const env = { PATH: process.env.PATH, HOME: process.env.HOME, USER: process.env.USER, LOGNAME: process.env.LOGNAME, TMPDIR: process.env.TMPDIR,
    CODEX_HOME: codexHome, AUTOBYTEUS_SERVER_HOST: `http://127.0.0.1:${port}`, AUTOBYTEUS_AGENT_PACKAGE_ROOTS: '', LMSTUDIO_HOSTS: origin, APP_ENV: 'test' };
  const child = spawn(process.execPath, [join(serverDir, 'dist/app.js'), '--port', String(port), '--data-dir', data], { cwd: serverDir, env, stdio: ['ignore', 'pipe', 'pipe'] });
  const s = { label, data, port, child, pid: child.pid, log: '', exit: null };
  const stamp = b => String(b).split('\n').filter(Boolean).map(l => `[${((Date.now() - T0) / 1000).toFixed(2)}] ${l}`).join('\n') + '\n';
  child.stdout.on('data', b => { s.log += stamp(b); opts.onOutput?.(String(b), s); }); child.stderr.on('data', b => { s.log += stamp(b); opts.onOutput?.(String(b), s); });
  child.on('exit', (code, signal) => { s.exit = { code, signal, at: Date.now() }; });
  servers.push(s);
  if (opts.noWait) return s;
  await wait(async () => { if (s.exit) throw Error(`${label} exited ${JSON.stringify(s.exit)}\n${s.log.slice(-2500)}`); return fetch(`http://127.0.0.1:${port}/rest/health`).then(r => r.ok, () => false); }, `${label} health`, 120_000);
  s.gql = async (query, variables = {}, timeout = 60_000) => {
    const body = await fetch(`http://127.0.0.1:${port}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(timeout) }).then(r => r.json());
    if (body.errors?.length) throw Error(JSON.stringify(body.errors)); return body.data;
  };
  log('server started', { label, pid: s.pid, port });
  return s;
};
const stopServer = async (s, signal = 'SIGTERM', timeout = 30_000) => {
  for (const ws of sockets.splice(0)) ws.terminate();
  const t = Date.now(); s.child.kill(signal); await wait(() => s.exit, `${s.label} exit`, timeout).catch(() => {});
  log('server stopped', { label: s.label, signal, exit: s.exit, ms: s.exit ? s.exit.at - t : null }); return s.exit;
};
const saveLog = async s => fs.writeFile(join(evidence, `${caseId}-server-${s.label}.log`), `# ${caseId} server ${s.label} pid ${s.pid}; temp data root; ${record.date}\n${s.log}`);
const resumeLines = s => s.log.split('\n').filter(l => /Recorded \d+ busy run|Restart resume|Busy-run record|Busy runs could not|Release identity/.test(l));
const connect = async (s, route, id) => {
  const ws = new WebSocket(`ws://127.0.0.1:${s.port}/ws/${route}/${id}`); sockets.push(ws);
  const frames = []; ws.on('message', raw => { try { frames.push({ at: Date.now(), ...JSON.parse(String(raw)) }); } catch {} });
  await new Promise((r, j) => { ws.once('open', r); ws.once('error', j); });
  return { ws, frames };
};
const send = (ws, payload) => { const id = randomUUID(); ws.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: id, dedupe_key: `agent_run_input:${id}`, ...(payload.root_subject_kind ? { command_id: randomUUID() } : {}), context_file_paths: [], image_urls: [], ...payload } })); };
const busyText = marker => `Run exactly this shell command in the foreground and wait for it to finish. Do not run it in the background, do not add a timeout, do not change it: python3 -c "import time; time.sleep(900)" ${marker}\nWhen it finishes, reply with the single word DONE.`;
const waitBusy = async (s, marker, label, timeout = 240_000) => {
  const proc = await wait(() => descendants(s.pid).find(r => r.command.includes(marker) && /python|sleep/i.test(r.command)), `${label} busy (${marker})`, timeout, 250);
  log('busy', { label, pid: proc.pid }); return proc;
};
let models = null;
const loadModels = async (s, needLive) => {
  const native = (await s.gql('mutation{reloadProviderModelCatalog(providerId:"LMSTUDIO",runtimeKind:"autobyteus"){llmModels{modelIdentifier}}}')).reloadProviderModelCatalog.llmModels.map(m => m.modelIdentifier).find(id => id.startsWith('rr285-fixture'));
  let codex = null, claude = null;
  if (needLive) {
    const pick = async (rk, re) => (await s.gql('query($r:String){providerModelCatalogSnapshots(runtimeKind:$r){llmModels{modelIdentifier value}}}', { r: rk })).providerModelCatalogSnapshots.flatMap(x => x.llmModels).find(x => re.test(x.modelIdentifier) || re.test(x.value ?? ''))?.modelIdentifier;
    codex = await pick('codex_app_server', /gpt-6\.1-terra/); claude = await pick('claude_agent_sdk', /haiku/i);
  }
  models = { native, codex, claude }; log('models', models);
};
const launch = runtime => runtime === 'codex' ? { runtimeKind: 'codex_app_server', llmModelIdentifier: models.codex, llmConfig: { reasoning_effort: 'medium' }, autoExecuteTools: true, workspaceRootPath: workspace }
  : runtime === 'claude' ? { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: models.claude, autoExecuteTools: true, workspaceRootPath: workspace }
  : { runtimeKind: 'autobyteus', llmModelIdentifier: models.native, autoExecuteTools: true, workspaceRootPath: workspace };
const defs = {};
const agentDef = async (s, name, extra = {}) => defs[name] ??= (await s.gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}', { input: { name: `${name} ${tag}`, role: 'engineer', description: 'rr285 probe', instructions: 'Follow the user instructions exactly. Use your tools to run commands.', category: 'api-e2e', skillNames: [], ...extra } })).createAgentDefinition.id;
const segment = n => `${n} ${tag}`.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const createStandalone = async (s, runtime, defName, defExtra = {}) => { const r = (await s.gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: { agentDefinitionId: await agentDef(s, defName, defExtra), ...launch(runtime) } })).createAgentRun; assert(r.success, r.message); return r.runId; };
const sendStandalone = async (s, runId, text) => { const c = await connect(s, 'agent', runId); await wait(() => c.frames.some(f => f.type === 'CONNECTED'), 'connected'); send(c.ws, { content: text }); return c; };
const teamMember = async (s, runtime, label, text) => {
  const coordinator = await agentDef(s, `Team Coordinator ${label}`);
  const teamDefinitionId = (await s.gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}', { input: { name: `Probe Team ${label} ${tag}`, description: 'probe', instructions: 'Members follow the user instructions exactly.', coordinatorMemberName: 'coordinator', nodes: [{ memberName: 'coordinator', ref: coordinator, refScope: 'SHARED' }] } })).createAgentTeamDefinition.id;
  const created = (await s.gql('mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}', { input: { teamDefinitionId, teamConfigs: [{ teamAddress: '/', ...launch(runtime) }], memberConfigs: [{ memberAddress: '/coordinator', agentDefinitionId: coordinator, ...launch(runtime) }] } })).createAgentTeamRun;
  assert(created.success, created.message);
  const tree = JSON.stringify((await s.gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: created.teamRunId })).getTeamRunResumeConfig.executionTree);
  const memberRunId = tree.match(/"agent_?[rR]un_?[iI]d":"([^"]+)"/)?.[1];
  const c = await connect(s, 'agent-team', created.teamRunId); await delay(800); send(c.ws, { agent_run_id: memberRunId, content: text });
  return { kind: 'team', runId: memberRunId, rootId: created.teamRunId };
};
const orgAgent = async (s, runtime, label, text) => {
  const manager = await agentDef(s, `Org Manager ${label}`);
  const orgId = (await s.gql('mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}', { input: { name: `Probe Org ${label} ${tag}`, description: 'probe', instructions: 'Members follow the user instructions exactly.', handoffs: [], members: [{ memberName: 'manager', ref: manager, refType: 'AGENT', refScope: 'SHARED' }] } })).createAgentOrgDefinition.id;
  const created = (await s.gql('mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}', { input: { agentOrgDefinitionId: orgId, rootConfiguration: launch(runtime), agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
  assert(created.success, created.message);
  const tree = (await s.gql('query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}', { id: created.agentOrgRunId })).getAgentOrgRunConfig.executionTree;
  const member = (tree.rootOrg ?? tree.root_org).members.find(m => m.address === '/manager'); const memberRunId = member.agentRunId ?? member.agent_run_id;
  const c = await connect(s, 'agent-org', created.agentOrgRunId); await delay(800);
  send(c.ws, { root_subject_kind: 'agent_org', root_run_id: created.agentOrgRunId, target_agent_run_id: memberRunId, content: text });
  return { kind: 'org', runId: memberRunId, rootId: created.agentOrgRunId };
};
const projection = async (s, runId) => s.gql('query($id:String!){getRunProjection(runId:$id){conversation activities summary}}', { id: runId }).then(d => d.getRunProjection, e => ({ error: String(e).slice(0, 200) }));
const noticeCount = p => (JSON.stringify(p?.conversation ?? []).match(/application restarted at/gi) ?? []).length;
const liveStatus = async (s, runId) => s.gql('query($id:String!){getAgentRunResumeConfig(runId:$id){isActive}}', { id: runId }).then(d => d.getAgentRunResumeConfig.isActive, () => null);
// Tool-call plans for scripted natives.
const runBashPlan = marker => [{ tool: 'run_bash', args: { command: `python3 -c "import time; time.sleep(900)" ${marker}`, cwd: workspace, timeout_seconds: 900 } }];
const markersLeft = () => table().filter(r => r.command.includes(tag) && /python/i.test(r.command) && !r.command.includes('ps -ww'));

try {
  await fs.mkdir(evidence, { recursive: true });
  if (mode === 'live-update') {
    const data = await newDataRoot('data');
    await setStamp(X);
    const s1 = await startServer(data, 'X');
    await loadModels(s1, true);
    const roots = [];
    const m = l => `${tag}_${l}`;
    { const id = await createStandalone(s1, 'codex', 'Probe Agent'); await sendStandalone(s1, id, busyText(m('sa-codex'))); roots.push({ label: 'sa-codex', kind: 'agent', place: 'host', runtime: 'codex', runId: id, rootId: id, marker: m('sa-codex') }); }
    { const id = await createStandalone(s1, 'claude', 'Probe Agent'); await sendStandalone(s1, id, busyText(m('sa-claude'))); roots.push({ label: 'sa-claude', kind: 'agent', place: 'host', runtime: 'claude', runId: id, rootId: id, marker: m('sa-claude') }); }
    roots.push({ label: 'team-codex', place: 'member', runtime: 'codex', marker: m('team-codex'), ...(await teamMember(s1, 'codex', 'team-codex', busyText(m('team-codex')))) });
    roots.push({ label: 'org-claude', place: 'member', runtime: 'claude', marker: m('org-claude'), ...(await orgAgent(s1, 'claude', 'org-claude', busyText(m('org-claude')))) });
    // A standalone Claude host that delegates to a Codex worker copy, then runs its own long command.
    const workerName = 'Probe Worker';
    await agentDef(s1, workerName, { instructions: 'You are a worker. Do exactly what the task description says, with your shell tool.', defaultLaunchConfig: { runtimeKind: 'codex_app_server', llmModelIdentifier: models.codex, llmConfig: { reasoning_effort: 'medium' } } });
    const hostId = await createStandalone(s1, 'claude', 'Probe Host', { toolNames: ['delegate_task'] });
    const delegation = { recipient_address: `/${segment(workerName)}`, description: busyText(m('copy')) };
    const hostView = await sendStandalone(s1, hostId, `Call delegate_task exactly once now with these exact JSON arguments: ${JSON.stringify(delegation)}\nDo not call any other tool. After it returns, reply DELEGATED.`);
    await waitBusy(s1, m('copy'), 'copy');
    await wait(() => hostView.frames.some(f => f.type === 'TURN_COMPLETED'), 'host delegation turn', 120_000).catch(() => {});
    send(hostView.ws, { content: busyText(m('host')) });
    roots.push({ label: 'host', kind: 'agent', place: 'host', runtime: 'claude', runId: hostId, rootId: hostId, marker: m('host') });
    for (const r of roots) await waitBusy(s1, r.marker, r.label);
    await delay(2000);
    record.roots = roots;
    const exitX = await stopServer(s1); await saveLog(s1);
    record.recordAfterQuit = await readRecord(data); record.quitLines = resumeLines(s1); record.exitX = exitX;
    log('record after quit', { entries: record.recordAfterQuit?.entries?.map(e => ({ kind: e.root.rootSubjectKind, place: e.place, status: e.status, version: e.version, run: e.agentRunId.slice(-10) })), lines: record.quitLines });
    await setStamp(X1);
    const s2Started = Date.now(); const s2 = await startServer(data, 'X1');
    // Observe: WS views of every root (frames for notices/turns), then wait for resumes to happen.
    const views = {};
    for (const r of roots) { const route = r.kind === 'team' ? 'agent-team' : r.kind === 'org' ? 'agent-org' : 'agent'; views[r.label] = await connect(s2, route, r.rootId).catch(e => ({ error: String(e), frames: [] })); }
    await wait(() => resumeLines(s2).some(l => /Restart resume after the update/.test(l)) || resumeLines(s2).some(l => /Restart resume failed/.test(l)), 'resume report', 120_000).catch(() => {});
    await delay(25_000);
    record.recordAfterStart = await readRecord(data);
    record.startLines = resumeLines(s2);
    const copyRunId = (record.recordAfterQuit?.entries ?? []).find(e => e.place === 'delegated')?.agentRunId ?? null;
    record.copyRunId = copyRunId;
    record.after = {};
    const x1StartIso = new Date(s2Started).toISOString();
    const collab = await s2.gql('query($id:String!){agentRunCollaboration(runId:$id)}', { id: hostId }).then(d => JSON.stringify(d.agentRunCollaboration), e => String(e));
    const copyAddress = copyRunId ? (collab.match(new RegExp(`"address":"([^"]+)"[^{}]*"agent_?[rR]un_?[iI]d":"${copyRunId}"`))?.[1] ?? collab.match(new RegExp(`"agent_?[rR]un_?[iI]d":"${copyRunId}"[^{}]*"address":"([^"]+)"`))?.[1] ?? `/${segment(workerName)}`) : null;
    record.copyAddress = copyAddress;
    const memberProjection = async r => r.kind === 'team' ? s2.gql('query($t:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$t,agentRunId:$a){conversation}}', { t: r.rootId, a: r.runId }).then(d => d.getTeamMemberRunProjection, e => ({ error: String(e).slice(0, 200) }))
      : r.kind === 'org' ? s2.gql('query($o:String!,$m:String!,$a:String!){getAgentOrgMemberRunProjection(orgRunId:$o,memberAddress:$m,agentRunId:$a){conversation}}', { o: r.rootId, m: '/manager', a: r.runId }).then(d => d.getAgentOrgMemberRunProjection, e => ({ error: String(e).slice(0, 200) }))
      : r.place === 'delegated' ? s2.gql('query($h:String!,$m:String!,$a:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$m,agentRunId:$a){conversation}}', { h: r.rootId, m: copyAddress, a: r.runId }).then(d => d.agentRunCollaborationMemberProjection, e => ({ error: String(e).slice(0, 200) }))
      : projection(s2, r.runId);
    const entriesAfter = p => (p?.conversation ?? []).filter(e => [...JSON.stringify(e).matchAll(/"(20\d\d-\d\d-\d\dT[^"]+Z)"/g)].some(m => m[1] >= x1StartIso));
    for (const r of [...roots, ...(copyRunId ? [{ label: 'copy', kind: 'agent', place: 'delegated', runId: copyRunId, rootId: hostId, marker: m('copy') }] : [])]) {
      const p = await memberProjection(r);
      const frames = (views[r.label]?.frames ?? []).filter(f => !f.payload?.agent_run_id || f.payload.agent_run_id === r.runId || JSON.stringify(f.payload).includes(r.runId));
      record.after[r.label] = { runId: r.runId, notices: noticeCount(p), listsDelegated: /These runs you delegated were resumed too/i.test(JSON.stringify(p?.conversation ?? [])),
        noticeText: (JSON.stringify(p?.conversation ?? []).match(/The application restarted[^"]{0,600}/i) ?? [null])[0],
        systemNoticeFrames: (views[r.label]?.frames ?? []).filter(f => /SYSTEM_TASK_NOTIFICATION/.test(f.type) || /SYSTEM_TASK_NOTIFICATION/.test(JSON.stringify(f.payload ?? '').slice(0, 2000))).length,
        turnFrames: (views[r.label]?.frames ?? []).filter(f => /TURN_STARTED/.test(JSON.stringify(f).slice(0, 4000))).length,
        busyAgain: !!descendants(s2.pid).find(x => x.command.includes(r.marker)), projectionError: p?.error ?? null,
        entriesAfterX1Start: entriesAfter(p).length, lastEntries: (p?.conversation ?? []).slice(-3).map(e => JSON.stringify(e).slice(0, 500)) };
    }
    log('after X1 start', { lines: record.startLines, recordAfterStart: record.recordAfterStart, after: record.after });
    await stopServer(s2); await saveLog(s2);
  } else if (mode === 'scripted') {
    // P1 — AC-004: same stamp relaunch resumes nothing.
    {
      const data = await newDataRoot('p1');
      await setStamp(X); const s = await startServer(data, 'p1-X'); await loadModels(s, false);
      const id = await createStandalone(s, 'native', 'Native Agent', { toolNames: ['run_bash'] }); plans.set('p1', runBashPlan(`${tag}_p1`));
      await sendStandalone(s, id, 'TURN:p1 run the command'); await waitBusy(s, `${tag}_p1`, 'p1');
      await stopServer(s); await saveLog(s);
      const rec = await readRecord(data);
      const s2 = await startServer(data, 'p1-X-again'); await delay(4000);
      record.p1 = { recordAfterQuit: rec, recordAfterStart: await readRecord(data), lines: [...resumeLines(s), ...resumeLines(s2)], notices: noticeCount(await projection(s2, id)) };
      log('P1 AC-004', record.p1); await stopServer(s2); await saveLog(s2);
    }
    // P2 — AR-001, AR-003, idle, AR-005.
    {
      const data = await newDataRoot('p2');
      for (const k of Object.keys(defs)) delete defs[k];
      await setStamp(X); const s = await startServer(data, 'p2-X'); await loadModels(s, false);
      const n1 = await createStandalone(s, 'native', 'Native Agent', { toolNames: ['run_bash'] }); plans.set('n1', runBashPlan(`${tag}_n1`));
      await sendStandalone(s, n1, 'TURN:n1 run the command'); await waitBusy(s, `${tag}_n1`, 'n1');
      const workerName = 'Native Worker';
      await agentDef(s, workerName, { toolNames: ['run_bash'], defaultLaunchConfig: { runtimeKind: 'autobyteus', llmModelIdentifier: models.native } });
      plans.set('copyA', runBashPlan(`${tag}_copyA`)); plans.set('copyB', runBashPlan(`${tag}_copyB`));
      const host = await createStandalone(s, 'native', 'Native Host', { toolNames: ['delegate_task', 'update_task', 'run_bash'] });
      plans.set('delegate', [{ tool: 'delegate_task', args: { recipient_address: `/${segment(workerName)}`, description: 'TURN:copyA run your command.' } }, { tool: 'delegate_task', args: { recipient_address: `/${segment(workerName)}`, description: 'TURN:copyB run your command.' } }]);
      const hostView = await sendStandalone(s, host, 'TURN:delegate delegate both tasks');
      await waitBusy(s, `${tag}_copyA`, 'copyA'); await waitBusy(s, `${tag}_copyB`, 'copyB');
      // Find copyB's ad-hoc Task id in the host's conversation (delegate_task results), then close it.
      await delay(1500);
      const hp = await projection(s, host);
      const results = JSON.stringify(hp.conversation ?? []);
      const taskIds = [...results.matchAll(/ad_hoc_task_[0-9a-f-]{36}/g)].map(x => x[0]).filter((v, i, a) => a.indexOf(v) === i);
      record.p2TaskIds = taskIds; log('copy task ids', taskIds);
      if (taskIds.length >= 2) { plans.set('close', [{ tool: 'update_task', args: { task_id: taskIds[1], status: 'DONE' } }]); send(hostView.ws, { content: 'TURN:close close the second task' }); await delay(5000); }
      plans.set('hostbusy', runBashPlan(`${tag}_host`)); send(hostView.ws, { content: 'TURN:hostbusy run your own command' }); await waitBusy(s, `${tag}_host`, 'host');
      const idle = await createStandalone(s, 'native', 'Native Agent'); const iv = await sendStandalone(s, idle, 'say hi'); await wait(() => iv.frames.some(f => f.type === 'TURN_COMPLETED'), 'idle turn', 60_000);
      record.p2BusyBeforeQuit = { copyA: markersLeft().some(r => r.command.includes(`${tag}_copyA`)), copyB: markersLeft().some(r => r.command.includes(`${tag}_copyB`)), host: markersLeft().some(r => r.command.includes(`${tag}_host`)), n1: markersLeft().some(r => r.command.includes(`${tag}_n1`)) };
      await delay(1500); await stopServer(s); await saveLog(s);
      const rec = await readRecord(data);
      log('P2 record after quit', { busy: record.p2BusyBeforeQuit, entries: rec?.entries?.map(e => ({ place: e.place, version: e.version, run: e.agentRunId })) });
      // AR-005: X1 start, quit during startup (before the resumer runs).
      await setStamp(X1);
      let quitSent = false;
      const sq = await startServer(data, 'p2-X1-quit-early', { noWait: true, onOutput: (text, srv) => { if (!quitSent && /Registering agent customization processors|Loading workspace packages/.test(text)) { quitSent = true; srv.child.kill('SIGTERM'); } } });
      await wait(() => sq.exit, 'early quit exit', 60_000);
      record.p2EarlyQuit = { exit: sq.exit, quitSent, recordStillThere: await readRecord(data), lines: resumeLines(sq) };
      log('AR-005 early quit', { exit: sq.exit, quitSent, entries: record.p2EarlyQuit.recordStillThere?.entries?.length ?? null, lines: record.p2EarlyQuit.lines });
      await saveLog(sq);
      const s2 = await startServer(data, 'p2-X1');
      await wait(() => resumeLines(s2).some(l => /Restart resume after the update/.test(l)), 'resume report', 60_000).catch(() => {});
      await delay(8000);
      const copyIds = (rec?.entries ?? []).filter(e => e.place === 'delegated').map(e => e.agentRunId);
      const pHost = await projection(s2, host);
      record.p2 = { record: rec, lines: resumeLines(s2), recordAfterStart: await readRecord(data),
        n1: { notices: noticeCount(await projection(s2, n1)), listsDelegated: /These runs you delegated/i.test(JSON.stringify((await projection(s2, n1)).conversation ?? [])) },
        host: { notices: noticeCount(pHost), notice: (JSON.stringify(pHost.conversation ?? []).match(/The application restarted[^"]{0,700}/i) ?? [null])[0] },
        // Round 2: a copy is read through its host's collaboration member projection (getRunProjection cannot read it).
        copies: await Promise.all(copyIds.map(async id => {
          const collab = await s2.gql('query($id:String!){agentRunCollaboration(runId:$id)}', { id: host }).then(d => JSON.stringify(d.agentRunCollaboration), e => String(e));
          const address = collab.match(new RegExp(`"address":"([^"]+)"[^{}]*"agent_?[rR]un_?[iI]d":"${id}"`))?.[1] ?? collab.match(new RegExp(`"agent_?[rR]un_?[iI]d":"${id}"[^{}]*"address":"([^"]+)"`))?.[1] ?? null;
          const p = await s2.gql('query($h:String!,$m:String!,$a:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$m,agentRunId:$a){conversation}}', { h: host, m: address ?? '', a: id }).then(d => d.agentRunCollaborationMemberProjection, e => ({ error: String(e).slice(0, 200) }));
          return { id, address, notices: noticeCount(p), projectionError: p?.error ?? null, tail: (p?.conversation ?? []).slice(-3).map(e => JSON.stringify(e).slice(0, 300)) };
        })),
        idle: { notices: noticeCount(await projection(s2, idle)) }, scriptedNoticesSeen: notices.length };
      log('P2 after X1 start', record.p2); await stopServer(s2); await saveLog(s2);
    }
    // P3 — AC-005 corrupt record.
    {
      const data = await newDataRoot('p3');
      await fs.mkdir(join(data, 'restart-resume'), { recursive: true }); await fs.writeFile(recordPath(data), '{ not json at all');
      await setStamp(X1); const s = await startServer(data, 'p3-X1-corrupt'); await delay(3000);
      record.p3 = { healthy: await fetch(`http://127.0.0.1:${s.port}/rest/health`).then(r => r.ok, () => false), recordAfterStart: await readRecord(data), lines: resumeLines(s) };
      log('P3 corrupt record', record.p3); await stopServer(s); await saveLog(s);
    }
  } else if (mode === 'queue-race' || mode === 'crash-resume') {
    const data = await newDataRoot('data');
    await setStamp(X); const s = await startServer(data, 'X'); await loadModels(s, true);
    const slow = [], targets = [];
    for (const l of Array.from({ length: Number(process.env.SLOW ?? 3) }, (_, i) => `slow-${i + 1}`)) { const id = await createStandalone(s, 'claude', 'Probe Agent'); await sendStandalone(s, id, busyText(`${tag}_${l}`)); slow.push({ label: l, runId: id }); }
    // Round 2: RACE_SPEC = JSON [{label, action: message|archive|stop, delayMs}] (delay after the X+1 server is healthy).
    const actDelay = Number(process.env.ACT_DELAY_MS ?? 0);
    const spec = mode === 'queue-race' ? (process.env.RACE_SPEC ? JSON.parse(process.env.RACE_SPEC)
      : [{ label: 't-message', action: 'message', delayMs: actDelay }, { label: 't-stop', action: 'stop', delayMs: actDelay }, { label: 't-archive', action: 'archive', delayMs: actDelay }]) : [];
    record.spec = spec;
    for (const l of (mode === 'queue-race' ? spec.map(x => x.label) : ['t-1', 't-2'])) { const id = await createStandalone(s, 'native', 'Native Agent', { toolNames: ['run_bash'] }); plans.set(l, runBashPlan(`${tag}_${l}`)); await sendStandalone(s, id, `TURN:${l} run it`); targets.push({ label: l, runId: id }); }
    for (const r of [...slow, ...targets]) await waitBusy(s, `${tag}_${r.label}`, r.label);
    await delay(1500); await stopServer(s); await saveLog(s);
    const rec = await readRecord(data); record.recordAfterQuit = rec;
    log('record', rec?.entries?.map(e => ({ place: e.place, run: e.agentRunId.slice(-10) })));
    await setStamp(X1);
    if (mode === 'queue-race') {
      const s2StartAt = Date.now(); record.x1StartAtLogSec = ((s2StartAt - T0) / 1000).toFixed(2);
      const s2 = await startServer(data, 'X1');
      const acted = {};
      const t0 = Date.now(); const rel = () => ((Date.now() - T0) / 1000).toFixed(2); record.x1HealthyAtLogSec = rel();
      // A user opens the run's view first (as the window does), then types; the send is what is timed.
      const views = {};
      await Promise.all(spec.filter(x => x.action === 'message').map(async x => { const t = targets.find(y => y.label === x.label); const c = await connect(s2, 'agent', t.runId); views[x.label] = c;
        // The server's CONNECTED frame (its session exists); a send before it is not handled (API-04C-r2a artifact).
        await wait(() => c.frames.some(f => f.type === 'CONNECTED'), `${x.label} connected`, 10_000); }));
      await Promise.all(spec.map(async x => {
        const t = targets.find(y => y.label === x.label); await delay(Math.max(0, x.delayMs - (Date.now() - t0)));
        const a = acted[x.label] = { action: x.action, plannedMs: x.delayMs, startMs: Date.now() - t0, startAtLogSec: rel() };
        if (x.action === 'message') { send(views[x.label].ws, { content: `User message after the restart (${x.label}).` }); a.sentAtLogSec = rel(); }
        if (x.action === 'stop') a.result = await s2.gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}', { id: t.runId }).then(d => d.terminateAgentRun, e => String(e).slice(0, 300));
        if (x.action === 'archive') a.result = await s2.gql('mutation($id:String!){archiveStoredRun(runId:$id){success message}}', { id: t.runId }).then(d => d.archiveStoredRun, e => String(e).slice(0, 300));
        a.doneAtLogSec = rel();
      }));
      await wait(() => resumeLines(s2).some(l => /Restart resume after the update/.test(l)), 'resume report', 120_000).catch(() => {});
      await delay(10_000);
      record.acted = acted; record.lines = resumeLines(s2);
      record.after = {};
      const outcomeOf = id => { const l = record.lines.find(x => x.includes(id) && /Restart resume (resumed|skipped|could not)/.test(x)); return l ? { at: l.match(/^\[([\d.]+)\]/)?.[1], kind: /resumed /.test(l) ? 'resumed' : /skipped/.test(l) ? 'skipped' : 'failed', reason: l.split(': ').slice(1).join(': ').slice(0, 160) || null } : { kind: 'none' }; };
      for (const r of [...slow, ...targets]) {
        const p = await projection(s2, r.runId); const conv = JSON.stringify(p?.conversation ?? []);
        const seq = modelLog.filter(e => e.runLabel === r.label && e.at >= s2StartAt).map(e => ({ at: ((e.at - T0) / 1000).toFixed(2), kind: e.kind, noticesInHistory: e.noticesInHistory, userInHistory: e.userInHistory }));
        const a = acted[r.label]; const outcome = outcomeOf(r.runId);
        const noticeIdx = conv.search(/application restarted at/i), userIdx = conv.search(/User message after the restart/);
        const out = { runId: r.runId, outcome, notices: noticeCount(p), userMessageAfterRestart: userIdx >= 0, noticeBeforeUser: noticeIdx >= 0 && userIdx >= 0 ? noticeIdx < userIdx : null, modelSeq: r.label.startsWith('slow') ? undefined : seq,
          conversationTail: r.label.startsWith('slow') ? undefined : (p?.conversation ?? []).slice(-6).map(e => JSON.stringify(e).slice(0, 260)), projectionError: p?.error ?? null };
        // Verdicts (SR-005): an archived run gets no notice and no turn; a user's input admitted first refuses the notice;
        // a notice admitted first is followed by the user's message; never more than one notice.
        const v = [];
        if (out.notices > 1) v.push('more than one notice');
        if (a?.action === 'archive' && a.result?.success === true) { if (outcome.kind === 'resumed') v.push('archived run resumed'); if (out.notices) v.push('archived run has a notice'); if (seq.length) v.push('archived run had a model turn'); }
        if (a?.action === 'message') {
          if (!out.userMessageAfterRestart) v.push('user message lost');
          if (outcome.kind === 'resumed') { if (out.notices !== 1) v.push('resumed without exactly one notice'); if (out.noticeBeforeUser === false) v.push('notice after the user message'); if (seq[0] && seq[0].kind !== 'notice') v.push(`first model call after restart was ${seq[0].kind}, not the notice`); }
          else if (out.notices) v.push(`not resumed (${outcome.kind}) but has a notice`);
          if (seq.some(e => e.kind === 'notice' && e.userInHistory)) v.push('notice turn ran after the user message');
        }
        out.verdict = v.length ? { ok: false, violations: v } : { ok: true };
        record.after[r.label] = out;
      }
      const tgt = targets.map(t => ({ label: t.label, action: acted[t.label]?.action, plannedMs: acted[t.label]?.plannedMs, startAtLogSec: acted[t.label]?.startAtLogSec, archive: acted[t.label]?.result?.message ?? acted[t.label]?.result?.success ?? acted[t.label]?.result, outcome: `${record.after[t.label].outcome.kind}@${record.after[t.label].outcome.at ?? '-'} ${record.after[t.label].outcome.reason ?? ''}`.trim(), notices: record.after[t.label].notices, ok: record.after[t.label].verdict.ok }));
      record.summary = { targets: tgt, violations: targets.filter(t => !record.after[t.label].verdict.ok).map(t => ({ label: t.label, ...record.after[t.label].verdict })) };
      log('queue race', { lines: record.lines, summary: record.summary });
      await stopServer(s2); await saveLog(s2);
    } else {
      let killed = false;
      const s2 = await startServer(data, 'X1-crash', { noWait: true, onOutput: (text, srv) => { if (!killed && /Restart resume resumed/.test(text)) { killed = true; record.killTree = descendants(srv.pid); srv.child.kill('SIGKILL'); } } });
      await wait(() => s2.exit, 'crash exit', 120_000);
      for (const d of record.killTree ?? []) if (alive(d.pid)) { try { process.kill(d.pid, 'SIGTERM'); } catch {} }
      await delay(2000); for (const d of record.killTree ?? []) if (alive(d.pid)) { try { process.kill(d.pid, 'SIGKILL'); } catch {} }
      record.crash = { killed, exit: s2.exit, recordAfterCrash: await readRecord(data), lines: resumeLines(s2) };
      log('crash during resume', record.crash); await saveLog(s2);
      const s3 = await startServer(data, 'X1-after-crash'); await delay(8000);
      record.after = { lines: resumeLines(s3), notices: {} };
      for (const r of [...slow, ...targets]) record.after.notices[r.label] = noticeCount(await projection(s3, r.runId));
      log('after crash, next start', record.after); await stopServer(s3); await saveLog(s3);
    }
  }
  record.result = 'Completed';
} catch (error) { record.result = 'Error'; record.error = String(error.stack ?? error); console.error(error); process.exitCode = 1; }
finally {
  for (const ws of sockets) ws.terminate();
  for (const s of servers) if (!s.exit) { s.child.kill('SIGTERM'); await wait(() => s.exit, 'final exit', 20_000).catch(() => { s.child.kill('SIGKILL'); }); }
  for (const s of servers) await saveLog(s).catch(() => {});
  await delay(500);
  const left = markersLeft(); for (const r of left) { try { process.kill(r.pid, 'SIGKILL'); } catch {} } record.fallbackCleanup = left.length;
  await fs.writeFile(stampPath, originalStamp); record.stampRestored = true;
  model.closeAllConnections(); await new Promise(r => model.close(r)); record.modelCalls = calls; record.scriptedNotices = notices;
  await fs.rm(own, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); record.rootRemoved = true;
  await fs.writeFile(join(evidence, `${caseId}-result.json`), JSON.stringify(record, null, 2));
  console.log(JSON.stringify({ result: record.result, error: record.error ?? null }));
}

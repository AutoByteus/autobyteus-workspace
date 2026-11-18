#!/usr/bin/env node
// Ticket-owned proof for autobyteus-97, implementation stage. Not durable test code.
// Real Nuxt dev frontend + built server + headless Chrome on a private data root and free ports; removed in finally.
// The manager and most copies run on the AGY runtime with the repository's SCRIPTED CLI (a message with `CALL_TOOL:{...}`
// makes the agent call the real tool). One copy runs on the NATIVE runtime against a FAKE OpenAI-compatible endpoint that
// asks for one real run_bash `pwd`. No provider inference, no credentials, no user data.
// Run from the worktree root, after a server build:
//   env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" node <this file> --output-dir <fresh dir>
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const webDir = path.join(rootDir, 'autobyteus-web');
const serverDir = path.join(rootDir, 'autobyteus-server-ts');
const require = createRequire(path.join(webDir, 'package.json'));
const { chromium } = require('playwright-core');
const WebSocket = require('ws');
const argOf = (name) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const outputDir = path.resolve(argOf('output-dir') ?? path.join(os.tmpdir(), `new-copy-folder-${Date.now()}`));
const executablePath = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((c) => fs.existsSync(c));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (label, predicate, ms = 30000) => {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { try { const v = await predicate(); if (v) return v; } catch (e) { last = e; } await sleep(150); }
  throw new Error(`Timed out: ${label}${last ? ` (${last.message})` : ''}`);
};
const assert = (cond, message, details) => { if (!cond) { const e = new Error(message); e.details = details; throw e; } };
const freePort = () => new Promise((resolve, reject) => { const s = net.createServer(); s.once('error', reject); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
const segment = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const callTool = (name, args) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const evidence = { startedAt: new Date().toISOString(), cases: {}, cleanup: {}, failures: [] };
const save = () => fsp.writeFile(path.join(outputDir, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);

const stack = {};
const exited = (c) => !c || c.exitCode !== null || c.signalCode !== null;
const stopGroup = async (child) => {
  if (exited(child)) return 'not-running';
  process.kill(-child.pid, 'SIGTERM');
  await until('exit', () => exited(child), 15000).catch(async () => { process.kill(-child.pid, 'SIGKILL'); await until('killed', () => exited(child), 5000); });
  return 'terminated';
};
const spawnLogged = (cmd, args, cwd, env, name) => {
  const log = fs.createWriteStream(path.join(outputDir, `${name}.log`));
  const child = spawn(cmd, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.output = '';
  for (const s of [child.stdout, child.stderr]) s.on('data', (d) => { child.output += d; log.write(d); });
  child.once('close', () => log.end());
  return child;
};
const callerEnv = () => Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('AUTOBYTEUS_') && !/(_API_KEY|_TOKEN|_SECRET|_ACCESS_KEY)$/i.test(k) && !/^(ANTHROPIC|OPENAI|GEMINI|AWS|AZURE)_/i.test(k)));

/** The native copy's model: lists one model; the first turn asks for run_bash `pwd > native-cwd.txt`, then answers. */
const startFakeLlm = async () => {
  const port = await freePort();
  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url?.startsWith('/v1/models')) { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ object: 'list', data: [{ id: 'fake-native', object: 'model' }] })); return; }
    if (req.method !== 'POST' || !req.url?.startsWith('/v1/chat/completions')) { res.writeHead(404); res.end(); return; }
    let raw = ''; req.on('data', (d) => { raw += d; }); req.on('end', () => {
      const body = JSON.parse(raw);
      const toolAnswered = body.messages.some((m) => m.role === 'tool');
      const base = { id: 'c', object: 'chat.completion.chunk', created: 1, model: 'fake-native' };
      const delta = toolAnswered ? { role: 'assistant', content: 'Done.' }
        : { role: 'assistant', tool_calls: [{ index: 0, id: 'call_1', type: 'function', function: { name: 'run_bash', arguments: JSON.stringify({ command: 'pwd > native-cwd.txt' }) } }] };
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      res.write(`data: ${JSON.stringify({ ...base, choices: [{ index: 0, delta, finish_reason: null }] })}\n\n`);
      res.write(`data: ${JSON.stringify({ ...base, choices: [{ index: 0, delta: {}, finish_reason: toolAnswered ? 'stop' : 'tool_calls' }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } })}\n\n`);
      res.end('data: [DONE]\n\n');
    });
  });
  await new Promise((r) => server.listen(port, '127.0.0.1', r));
  return { server, baseUrl: `http://127.0.0.1:${port}/v1` };
};

const folder = (name) => path.join(stack.dataRoot, name);
const startStack = async () => {
  stack.dataRoot = fs.realpathSync(await fsp.mkdtemp(path.join(os.tmpdir(), 'new-copy-folder-')));
  for (const d of ['db', 'logs', 'memory', 'temp_workspace', 'home', 'manager-folder', 'project-first', 'project-second', 'project-of-manager']) await fsp.mkdir(path.join(stack.dataRoot, d));
  await fsp.writeFile(folder('manager-folder/sentinel-manager.txt'), 'manager');
  await fsp.writeFile(folder('project-first/sentinel-project.txt'), 'project');
  await fsp.writeFile(folder('a-file'), 'not a folder');
  const backendPort = await freePort(), frontendPort = await freePort();
  stack.backendUrl = `http://127.0.0.1:${backendPort}`; stack.frontendUrl = `http://127.0.0.1:${frontendPort}`;
  stack.argvLog = path.join(stack.dataRoot, 'agy-argv.jsonl');
  const backendEnv = { APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: `file:${path.join(stack.dataRoot, 'db', 'development.db')}`,
    AUTOBYTEUS_SERVER_HOST: stack.backendUrl, AUTOBYTEUS_LOG_DIR: path.join(stack.dataRoot, 'logs'), AUTOBYTEUS_MEMORY_DIR: path.join(stack.dataRoot, 'memory'), AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(stack.dataRoot, 'temp_workspace') };
  await fsp.writeFile(path.join(stack.dataRoot, '.env'), `${Object.entries(backendEnv).map(([k, v]) => `${k}=${v}`).join('\n')}\n`, { mode: 0o600 });
  stack.fakeLlm = await startFakeLlm();
  stack.backend = spawnLogged(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', stack.dataRoot], serverDir,
    { ...callerEnv(), ...backendEnv, HOME: path.join(stack.dataRoot, 'home'), ANTIGRAVITY_CLI_COMMAND: path.join(serverDir, 'tests/fixtures/agy-failure-cli.mjs'), AGY_FAKE_CASE: 'linked_skills', AGY_FAKE_ARGV_LOG: stack.argvLog }, 'backend');
  await until('backend GraphQL', async () => (await fetch(`${stack.backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"query":"{__typename}"}' })).ok, 180000);
  const ws = stack.backendUrl.replace(/^http/, 'ws');
  stack.frontend = spawnLogged('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir, { ...callerEnv(), NODE_ENV: 'development', NUXT_TELEMETRY_DISABLED: '1', BACKEND_NODE_BASE_URL: stack.backendUrl,
    BACKEND_AGENT_WS_ENDPOINT: `${ws}/ws/agent`, BACKEND_TEAM_WS_ENDPOINT: `${ws}/ws/agent-team`, BACKEND_GRAPHQL_WS_ENDPOINT: `${ws}/graphql`, BACKEND_TRANSCRIPTION_WS_ENDPOINT: `${ws}/ws/transcribe`, BACKEND_TERMINAL_WS_ENDPOINT: `${ws}/ws/terminal`, BACKEND_FILE_EXPLORER_WS_ENDPOINT: `${ws}/ws/file-explorer` }, 'frontend');
  await until('frontend', async () => (await fetch(stack.frontendUrl)).ok, 240000);
};

const gql = async (query, variables = {}) => {
  const response = await fetch(`${stack.backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const body = await response.json();
  if (!response.ok || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
  return body.data;
};
const AGY = { runtimeKind: 'antigravity_cli', llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null };
const s = { ids: {}, names: {}, projects: {}, tasks: {} };
const seed = async () => {
  const suffix = randomUUID().slice(0, 4);
  await gql('mutation($input:CustomProviderInputObject!){createCustomProvider(input:$input){provider{id}}}', { input: { name: 'Fake Native', baseUrl: stack.fakeLlm.baseUrl, apiKey: 'synthetic-not-a-key' } });
  const catalogs = await gql('query{providerModelCatalogSnapshots(runtimeKind:"autobyteus"){ownerProvider{name} llmModels{modelIdentifier}}}');
  const nativeModel = catalogs.providerModelCatalogSnapshots.find((c) => c.ownerProvider.name === 'Fake Native').llmModels[0].modelIdentifier;
  const agent = async (key, name, toolNames, launch = AGY) => {
    s.names[key] = name;
    s.ids[key] = (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}', { input: { name, role: 'assistant', description: name, instructions: 'Follow the request.', toolNames, defaultLaunchConfig: launch } })).createAgentDefinition.id;
  };
  await agent('manager', `Project Task Manager ${suffix}`, ['create_task', 'update_task']);
  await agent('writer', `Package Writer ${suffix}`, []);
  await agent('checker', `Fact Checker ${suffix}`, []);
  await agent('native', `Native Worker ${suffix}`, ['run_bash'], { runtimeKind: 'autobyteus', llmModelIdentifier: nativeModel, llmConfig: null });
  s.names.squad = `Scouting Team ${suffix}`;
  s.ids.squad = (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}', { input: { name: s.names.squad, description: s.names.squad, instructions: 'Scout.', coordinatorMemberName: 'lead', defaultLaunchConfig: AGY,
    nodes: [{ memberName: 'lead', ref: s.ids.writer, refScope: 'SHARED' }, { memberName: 'scout', ref: s.ids.checker, refScope: 'SHARED' }] } })).createAgentTeamDefinition.id;
  const project = async (key, name, folders) => { s.projects[key] = (await gql('mutation($input:CreateProjectInput!){createProject(input:$input){projectId name}}', { input: { name, workspaces: folders.map((workspaceRootPath) => ({ workspaceRootPath, description: path.basename(workspaceRootPath) })) } })).createProject; };
  await project('linked', `AutoByteus Agents ${suffix}`, [folder('project-first'), folder('project-second')]);
  await project('noLink', `No Folder ${suffix}`, []);
  await project('missing', `Moved Away ${suffix}`, [folder('moved-away')]);
  await project('file', `Is A File ${suffix}`, [folder('a-file')]);
  await project('own', `Manager's Project ${suffix}`, [folder('project-of-manager')]);
  for (const [key, projectKey] of [['agent', 'linked'], ['team', 'linked'], ['nativeTask', 'linked'], ['fromProject', 'linked'], ['noLink', 'noLink'], ['missing', 'missing'], ['file', 'file']]) {
    s.tasks[key] = (await gql('mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}', { input: { projectId: s.projects[projectKey].projectId, title: `${key} work`, description: `${key} work` } })).createProjectTask.taskId;
  }
  await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: folder('manager-folder') } });
};
const createManager = async (workspaceRootPath, extra = {}) => {
  const r = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: { agentDefinitionId: s.ids.manager, workspaceRootPath, llmModelIdentifier: AGY.llmModelIdentifier, llmConfig: null, autoExecuteTools: true, runtimeKind: AGY.runtimeKind, ...extra } })).createAgentRun;
  assert(r.success, r.message); return r.runId;
};
const conversationText = async (runId) => JSON.stringify((await gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: runId })).getRunProjection?.conversation ?? []);
const sockets = [];
const agentCalls = async (runId, toolName, args) => {
  const before = ((await conversationText(runId)).match(/CALLED:/g) ?? []).length;
  const socket = new WebSocket(`${stack.backendUrl.replace(/^http/, 'ws')}/ws/agent/${runId}`); sockets.push(socket);
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  try {
    socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { agent_run_id: runId, message_id: `p-${randomUUID()}`, dedupe_key: `agent_run_input:p:${randomUUID()}`, content: callTool(toolName, args), context_file_paths: [], image_urls: [] } }));
    let text = '';
    await until(`${toolName} result`, async () => ((text = await conversationText(runId)).match(/CALLED:/g) ?? []).length > before, 60000);
    return text.slice(text.lastIndexOf('CALLED:'), text.lastIndexOf('CALLED:') + 900).replace(/\\+"/g, '"');
  } finally { socket.close(); }
};
const delegatedRun = (text) => /target_agent_run_id":"([^"]+)/.exec(text)?.[1];
const delegatedTeam = (text) => /target_team_run_id":"([^"]+)/.exec(text)?.[1];
const tree = async (rootId) => (await gql('query($id:String!){agentRunCollaboration(runId:$id)}', { id: rootId })).agentRunCollaboration?.root_agent?.execution_tree;
const nodeOf = (value, id) => {
  if (Array.isArray(value)) { for (const v of value) { const n = nodeOf(v, id); if (n) return n; } return null; }
  if (!value || typeof value !== 'object') return null;
  if ((value.agentRunId === id || value.teamRunId === id) && value.source) return value;
  return nodeOf(Object.values(value), id);
};
const foldersIn = (value, out = []) => {
  if (Array.isArray(value)) value.forEach((v) => foldersIn(v, out));
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) { if (k === 'workspaceRootPath') out.push(v); else foldersIn(v, out); }
  return out;
};
const recordedFolders = async (rootId, id) => { const node = await until(`node ${id}`, async () => nodeOf(await tree(rootId), id), 30000); return foldersIn(node.source); };
const managerFolder = async (runId) => (await gql('query($id:String!){getAgentRunResumeConfig(runId:$id){metadataConfig{workspaceRootPath}}}', { id: runId })).getAgentRunResumeConfig.metadataConfig.workspaceRootPath;
/** What an AGY copy's process really got: its launch's cwd (the capsule, by design), `--add-dir` and the capsule's recorded workspace. */
const agyLaunchOf = async (runId) => until(`AGY launch of ${runId}`, async () => {
  for (const line of (await fsp.readFile(stack.argvLog, 'utf8').catch(() => '')).split('\n').filter(Boolean)) {
    const { argv, cwd } = JSON.parse(line);
    const manifest = JSON.parse(await fsp.readFile(path.join(cwd, 'manifest.json'), 'utf8').catch(() => '{}'));
    if (manifest.runId === runId) return { processCwd: cwd, addDirs: argv.flatMap((a, i) => a === '--add-dir' ? [argv[i + 1]] : []), capsuleWorkspacePath: manifest.workspacePath };
  }
  return null;
}, 60000);

// ---- browser
let browser;
const T = (id) => `[data-test="${id}"]`;
const newPage = async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  return { context, page, errors };
};
const shot = async (page, name) => { await sleep(600); await page.screenshot({ path: path.join(outputDir, `${name}.png`) }); };
const goto = async (page) => { await page.goto(`${stack.frontendUrl}/workspace`, { waitUntil: 'networkidle', timeout: 120000 }); await page.locator(T('run-section-switch')).waitFor({ timeout: 120000 }); };
const showMode = async (page, mode) => { const tab = page.locator(T(`run-section-tab-${mode}`)); if ((await tab.getAttribute('aria-selected')) !== 'true') await tab.click(); await until(`${mode}`, async () => (await tab.getAttribute('aria-selected')) === 'true'); };
const openGroup = async (scope, definitionId) => { const g = scope.locator(`${T('workspace-agent-row')}[data-agent-definition-id="${definitionId}"]`).first(); await g.waitFor({ timeout: 30000 }); if ((await g.getAttribute('aria-expanded')) !== 'true') await g.click(); };
const runRow = (scope, id) => scope.locator(`${T('workspace-agent-run-row')}[data-run-id="${id}"]`);
const copyRow = (scope, id) => scope.locator(`${T('workspace-team-transient-execution-row')}[data-agent-run-id="${id}"]`);
const rightTab = (page, name) => page.locator(`${T('right-side-tab-list')} [role="tab"]`).filter({ hasText: name }).first();
const filesShow = async (page, sentinel) => { await rightTab(page, 'Files').click(); await until(`Files shows ${sentinel}`, async () => (await page.locator(T('right-side-files-panel')).filter({ visible: true }).getByText(sentinel).count()) > 0, 30000); };
const terminalPwd = async (page, expected) => {
  await rightTab(page, 'Terminal').click();
  const panel = page.locator(T('right-side-terminal-panel')).filter({ visible: true });
  await panel.locator('.xterm').first().waitFor({ timeout: 30000 });
  await sleep(1500);
  await panel.locator('.xterm').first().click();
  await page.keyboard.type('pwd\n');
  return until(`Terminal pwd ${expected}`, async () => { const text = (await panel.locator('.xterm-rows').first().innerText()).replace(/\s+/g, ''); return text.includes(expected.replace(/\s+/g, '')) ? text.slice(-200) : null; }, 20000);
};

const cases = {
  'AC-001/003/004/005/006 + AC-002: real delegation from a manager in another folder (scripted AGY)': async () => {
    const W = s.W = await createManager(folder('manager-folder'));
    const out = { managerRun: W };
    const writerAddr = `/${segment(s.names.writer)}`, checkerAddr = `/${segment(s.names.checker)}`;
    // AC-001, AC-005: a saved Task of a Project with two links, to a catalog Agent.
    const first = await agentCalls(W, 'delegate_task', { recipient_address: writerAddr, task_id: s.tasks.agent });
    const copy = s.copy = delegatedRun(first); assert(copy, 'agent delegation failed', first);
    out.agentCopy = { run: copy, recorded: await recordedFolders(W, copy), agy: await agyLaunchOf(copy) };
    assert(out.agentCopy.recorded.every((f) => f === folder('project-first')) && out.agentCopy.recorded.length > 0, 'copy not recorded in the first link', out.agentCopy);
    assert(out.agentCopy.agy.capsuleWorkspacePath === folder('project-first') && out.agentCopy.agy.addDirs.includes(folder('project-first')), 'AGY did not get the Project folder', out.agentCopy);
    out.managerFolder = await managerFolder(W);
    assert(out.managerFolder === folder('manager-folder'), 'manager moved', out.managerFolder);
    // AC-002: a Team copy, one folder.
    const teamResult = await agentCalls(W, 'delegate_task', { recipient_address: `/${segment(s.names.squad)}`, task_id: s.tasks.team });
    const team = delegatedTeam(teamResult); assert(team, 'team delegation failed', teamResult);
    out.teamCopy = { team, recorded: await recordedFolders(W, team) };
    assert(out.teamCopy.recorded.length >= 3 && out.teamCopy.recorded.every((f) => f === folder('project-first')), 'team has another folder', out.teamCopy);
    // AC-003: the worker's sub-work follows its Task's Project, not the manager's folder.
    await agentCalls(W, 'send_message_to', { target_agent_run_id: copy, content: callTool('delegate_task', { recipient_address: checkerAddr, description: 'Check the facts.' }) });
    const sub = await until('sub-work copy', async () => {
      const found = []; const visit = (v) => { if (Array.isArray(v)) v.forEach(visit); else if (v && typeof v === 'object') { if (v.agentRunId && v.source?.agentDefinitionId === s.ids.checker && v.delegatorAgentRunId === copy) found.push(v); Object.values(v).forEach(visit); } };
      visit(await tree(W)); return found[0] ?? null;
    }, 60000);
    out.subWork = { run: sub.agentRunId, recorded: foldersIn(sub.source) };
    assert(out.subWork.recorded.every((f) => f === folder('project-first')), 'sub-work in another folder', out.subWork);
    // AC-004: no link; a Temp task.
    const noLink = delegatedRun(await agentCalls(W, 'delegate_task', { recipient_address: checkerAddr, task_id: s.tasks.noLink }));
    const temp = delegatedRun(await agentCalls(W, 'delegate_task', { recipient_address: checkerAddr, description: 'Temp work.' }));
    out.inherit = { noLink: await recordedFolders(W, noLink), temp: await recordedFolders(W, temp) };
    assert([...out.inherit.noLink, ...out.inherit.temp].every((f) => f === folder('manager-folder')), 'did not inherit', out.inherit);
    // AC-006: missing, and a file; the tool's coded answer; no copy.
    const nodesBefore = JSON.stringify(await tree(W)).length;
    for (const key of ['missing', 'file']) {
      const refused = await agentCalls(W, 'delegate_task', { recipient_address: writerAddr, task_id: s.tasks[key] });
      assert(refused.includes('TASK_PROJECT_FOLDER_UNAVAILABLE') && refused.includes(s.projects[key].name), `${key} not refused`, refused);
      out[`refused_${key}`] = refused.slice(0, 420);
    }
    assert(JSON.stringify(await tree(W)).length === nodesBefore, 'a refusal changed the tree');
    return out;
  },
  'Native runtime: the copy\'s real working directory (run_bash pwd; fake OpenAI-compatible endpoint)': async () => {
    const result = await agentCalls(s.W, 'delegate_task', { recipient_address: `/${segment(s.names.native)}`, task_id: s.tasks.nativeTask });
    const copy = delegatedRun(result); assert(copy, 'native delegation failed', result);
    const file = folder('project-first/native-cwd.txt');
    const pwd = await until('native pwd file', async () => (await fsp.readFile(file, 'utf8').catch(() => '')).trim(), 60000);
    assert(pwd === folder('project-first'), 'native copy ran elsewhere', pwd);
    assert(!fs.existsSync(folder('manager-folder/native-cwd.txt')), 'native copy wrote in the manager folder');
    return { copy, pwdWrittenByTheCopy: pwd, recorded: await recordedFolders(s.W, copy) };
  },
  'AC-009 Agent root, Workspaces mode: focus shows the copy\'s folder; row stays under the manager': async () => {
    const { page, errors, context } = await newPage();
    try {
      await goto(page); await showMode(page, 'workspaces');
      const wsRow = page.locator(`${T('workspace-row')}[data-workspace-root="${folder('manager-folder')}"]`).first();
      await wsRow.waitFor({ timeout: 30000 });
      if ((await wsRow.getAttribute('aria-expanded')) !== 'true') await wsRow.locator('button[aria-expanded]').first().click();
      await openGroup(page, s.ids.manager);
      await runRow(page, s.W).click();
      await filesShow(page, 'sentinel-manager.txt');
      await shot(page, 'AC-009-manager-focused-files');
      const managerTree = page.locator(`${T('workspace-agent-run-task-tree')}[data-run-id="${s.W}"]`);
      await copyRow(managerTree, s.copy).waitFor({ timeout: 30000 });
      await copyRow(managerTree, s.copy).click();
      await filesShow(page, 'sentinel-project.txt');
      const files = page.locator(T('right-side-files-panel')).filter({ visible: true });
      assert((await files.getByText('sentinel-manager.txt').count()) === 0, 'Files still shows the manager folder');
      await shot(page, 'AC-009-copy-focused-files');
      const terminal = await terminalPwd(page, folder('project-first'));
      await shot(page, 'AC-009-copy-focused-terminal');
      assert((await copyRow(managerTree, s.copy).count()) === 1, 'row left the manager');
      const workspaceRows = await page.locator(T('workspace-row')).evaluateAll((els) => els.map((e) => e.getAttribute('data-workspace-root')));
      assert(errors.length === 0, 'browser errors', errors);
      return { terminal, workspaceRows, newWorkspacesRowForProjectFolder: workspaceRows.includes(folder('project-first')) };
    } finally { await context.close(); }
  },
  'AC-009 Projects mode: a manager started under another Project keeps the copy nested; focus shows the copy\'s folder': async () => {
    const A = await createManager(folder('project-of-manager'), { projectId: s.projects.own.projectId });
    const copy = delegatedRun(await agentCalls(A, 'delegate_task', { recipient_address: `/${segment(s.names.writer)}`, task_id: s.tasks.fromProject }));
    assert(copy, 'delegation failed');
    const recorded = await recordedFolders(A, copy);
    assert(recorded.every((f) => f === folder('project-first')), 'copy not in its Task\'s Project folder', recorded);
    const { page, errors, context } = await newPage();
    try {
      await goto(page); await showMode(page, 'projects');
      const section = page.locator(`section:has(> ${T('project-row')}[data-project-id="${s.projects.own.projectId}"])`);
      await section.waitFor({ timeout: 60000 });
      const disclosure = section.locator(T('project-row-disclosure'));
      if ((await disclosure.getAttribute('aria-expanded')) !== 'true') await disclosure.click();
      await openGroup(section, s.ids.manager);
      await runRow(section, A).click();
      await copyRow(section, copy).waitFor({ timeout: 30000 });
      await copyRow(section, copy).click();
      await filesShow(page, 'sentinel-project.txt');
      await shot(page, 'AC-009-projects-mode-copy-focused');
      const linkedSection = page.locator(`section:has(> ${T('project-row')}[data-project-id="${s.projects.linked.projectId}"])`);
      const linkedDisclosure = linkedSection.locator(T('project-row-disclosure'));
      if ((await linkedDisclosure.getAttribute('aria-expanded')) !== 'true') await linkedDisclosure.click();
      assert((await copyRow(linkedSection, copy).count()) === 0 && (await linkedSection.locator(T('project-no-runs')).count()) === 1, 'the Task\'s Project lists the copy');
      assert(errors.length === 0, 'browser errors', errors);
      return { manager: A, copy, recorded, managerFolder: await managerFolder(A) };
    } finally { await context.close(); }
  },
};

let result = 'Pass';
try {
  await fsp.mkdir(outputDir, { recursive: true });
  assert(executablePath, 'No Chrome found');
  assert(fs.existsSync(path.join(serverDir, 'dist/app.js')), 'Build the server first');
  await startStack(); await seed();
  evidence.seed = { names: s.names, projects: s.projects, dataRoot: stack.dataRoot };
  browser = await chromium.launch({ headless: true, executablePath });
  evidence.browserVersion = browser.version();
  { const { page, context } = await newPage(); await goto(page).catch(() => undefined); await sleep(3000); await context.close(); }
  for (const [id, fn] of Object.entries(cases)) {
    try { evidence.cases[id] = { result: 'Pass', details: await fn() }; }
    catch (error) { result = 'Fail'; evidence.cases[id] = { result: 'Fail', message: error.message, details: error.details };
      try { for (const p of browser.contexts().flatMap((c) => c.pages())) await p.screenshot({ path: path.join(outputDir, 'failure.png') }); } catch { /* best effort */ } }
    process.stdout.write(`${evidence.cases[id].result}: ${id}${evidence.cases[id].message ? ` — ${evidence.cases[id].message}` : ''}\n`);
    await save();
  }
} catch (error) { result = 'Fail'; evidence.failures.push({ message: error.message, details: error.details }); }
finally {
  for (const socket of sockets) socket.terminate();
  try { await browser?.close(); evidence.cleanup.browser = browser ? 'closed' : 'not-started'; } catch (e) { result = 'Fail'; evidence.cleanup.browser = e.message; }
  try { evidence.cleanup.frontend = await stopGroup(stack.frontend); } catch (e) { result = 'Fail'; evidence.cleanup.frontend = e.message; }
  try { evidence.cleanup.backend = await stopGroup(stack.backend); } catch (e) { result = 'Fail'; evidence.cleanup.backend = e.message; }
  try { stack.fakeLlm?.server.closeAllConnections?.(); stack.fakeLlm?.server.close(); evidence.cleanup.fakeLlm = 'stopped'; } catch (e) { evidence.cleanup.fakeLlm = e.message; }
  try { if (stack.dataRoot) await fsp.rm(stack.dataRoot, { recursive: true, force: true }); evidence.cleanup.dataRootRemoved = !stack.dataRoot || !fs.existsSync(stack.dataRoot); } catch (e) { result = 'Fail'; evidence.cleanup.dataRootRemoved = e.message; }
  evidence.result = result; evidence.finishedAt = new Date().toISOString();
  if (fs.existsSync(outputDir)) await save();
}
process.stdout.write(`new-copy folder proof: ${result}. Evidence: ${path.join(outputDir, 'evidence.json')}\n`);
process.exit(result === 'Pass' ? 0 : 1);

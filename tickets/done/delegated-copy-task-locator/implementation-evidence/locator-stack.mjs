#!/usr/bin/env node
// Implementation self-check stack for delegated-copy-task-locator (not a product test).
// Starts the built backend (scripted AGY CLI, private data root) and the Nuxt dev frontend on free ports,
// creates delegated Task workers through the real tools, writes <output>/state.json, then holds the stack
// until SIGTERM/SIGINT and removes everything it owns. Patterned on autobyteus-web/tests/e2e/project-manager-ux-probe.mjs.
// Usage (repository root): node tickets/in-progress/delegated-copy-task-locator/implementation-evidence/locator-stack.mjs <output-dir>
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const repo = process.cwd();
const webDir = path.join(repo, 'autobyteus-web');
const serverDir = path.join(repo, 'autobyteus-server-ts');
const require = createRequire(path.join(webDir, 'package.json'));
const WebSocket = require('ws');
const outputDir = path.resolve(process.argv[2]);
await fsp.mkdir(outputDir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (label, predicate, ms = 60000, every = 200) => {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { try { const v = await predicate(); if (v) return v; } catch (e) { last = e; } await sleep(every); }
  throw new Error(`Timed out: ${label}${last ? ` (${last.message})` : ''}`);
};
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.once('error', reject);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});
const segment = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const callTool = (name, args) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const exited = (c) => !c || c.exitCode !== null || c.signalCode !== null;
const stopGroup = async (child) => {
  if (exited(child)) return 'not-running';
  process.kill(-child.pid, 'SIGTERM');
  await until('owned process exit', () => exited(child), 15000).catch(async () => { process.kill(-child.pid, 'SIGKILL'); await sleep(1000); });
  return 'terminated';
};
const spawnLogged = (cmd, args, cwd, env, name) => {
  const log = fs.createWriteStream(path.join(outputDir, `${name}.log`), { flags: 'a' });
  const child = spawn(cmd, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.output = '';
  child.stdout.on('data', (d) => { child.output += d; log.write(d); });
  child.stderr.on('data', (d) => { child.output += d; log.write(d); });
  return child;
};

const stack = { dataRoot: await fsp.mkdtemp(path.join(os.tmpdir(), 'copy-task-locator-')) };
for (const dir of ['db', 'logs', 'memory', 'temp_workspace', 'workspace']) await fsp.mkdir(path.join(stack.dataRoot, dir));
const backendPort = await freePort(); const frontendPort = await freePort();
stack.backendUrl = `http://127.0.0.1:${backendPort}`; stack.frontendUrl = `http://127.0.0.1:${frontendPort}`;
const backendEnv = { APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: `file:${path.join(stack.dataRoot, 'db', 'development.db')}`,
  AUTOBYTEUS_SERVER_HOST: stack.backendUrl, AUTOBYTEUS_LOG_DIR: path.join(stack.dataRoot, 'logs'),
  AUTOBYTEUS_MEMORY_DIR: path.join(stack.dataRoot, 'memory'), AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(stack.dataRoot, 'temp_workspace') };
await fsp.writeFile(path.join(stack.dataRoot, '.env'), `${Object.entries(backendEnv).map(([k, v]) => `${k}=${v}`).join('\n')}\n`, { mode: 0o600 });
const clean = (prefixes) => Object.fromEntries(Object.entries(process.env).filter(([k]) => !prefixes.some((p) => k.startsWith(p))));
let shuttingDown = false;
const shutdown = async (code) => {
  if (shuttingDown) return; shuttingDown = true;
  for (const s of sockets) s.terminate();
  const cleanup = { frontend: await stopGroup(stack.frontend), backend: await stopGroup(stack.backend) };
  await fsp.rm(stack.dataRoot, { recursive: true, force: true });
  cleanup.dataRootRemoved = !fs.existsSync(stack.dataRoot);
  await fsp.writeFile(path.join(outputDir, 'cleanup.json'), `${JSON.stringify(cleanup, null, 2)}\n`);
  process.exit(code);
};
process.on('SIGTERM', () => void shutdown(0));
process.on('SIGINT', () => void shutdown(0));

const sockets = [];
try {
  stack.backend = spawnLogged(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', stack.dataRoot],
    serverDir, { ...clean(['AUTOBYTEUS_', 'ENABLE_']), ...backendEnv, ANTIGRAVITY_CLI_COMMAND: path.join(serverDir, 'tests/fixtures/agy-failure-cli.mjs'), AGY_FAKE_CASE: 'linked_skills' }, 'backend');
  await until('backend listening', () => { if (exited(stack.backend)) throw new Error('backend exited'); return stack.backend.output.includes('listening'); }, 180000);
  const ws = stack.backendUrl.replace(/^http/, 'ws');
  stack.frontend = spawnLogged('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir,
    { ...clean(['ENABLE_']), NODE_ENV: 'development', NUXT_TELEMETRY_DISABLED: '1', BACKEND_NODE_BASE_URL: stack.backendUrl,
      BACKEND_AGENT_WS_ENDPOINT: `${ws}/ws/agent`, BACKEND_TEAM_WS_ENDPOINT: `${ws}/ws/agent-team`, BACKEND_GRAPHQL_WS_ENDPOINT: `${ws}/graphql`,
      BACKEND_TRANSCRIPTION_WS_ENDPOINT: `${ws}/ws/transcribe`, BACKEND_TERMINAL_WS_ENDPOINT: `${ws}/ws/terminal`,
      BACKEND_FILE_EXPLORER_WS_ENDPOINT: `${ws}/ws/file-explorer` }, 'frontend');

  const gql = async (query, variables = {}) => {
    const response = await fetch(`${stack.backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
    const body = await response.json();
    if (!response.ok || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  await until('backend GraphQL', async () => (await fetch(`${stack.backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"query":"{__typename}"}' })).ok);
  const workspace = path.join(stack.dataRoot, 'workspace');
  await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspace } });
  const config = { workspaceRootPath: workspace, llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null, autoExecuteTools: true, runtimeKind: 'antigravity_cli' };
  const agent = async (name, toolNames) => (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}',
    { input: { name, role: 'assistant', description: name, instructions: 'Follow the request.', toolNames } })).createAgentDefinition.id;
  const names = { manager: 'Project Task Manager', worker: 'Agent Package Creator', helper: 'Fact Checker', squad: 'Software Engineering Team', team: 'Delivery Team' };
  const ids = { manager: await agent(names.manager, ['list_projects', 'list_project_tasks', 'create_or_update_project', 'create_or_update_task']),
    worker: await agent(names.worker, []), helper: await agent(names.helper, []) };
  const team = async (name, coordinatorMemberName, nodes) => (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}',
    { input: { name, description: name, instructions: 'Deliver.', coordinatorMemberName, nodes } })).createAgentTeamDefinition.id;
  ids.squad = await team(names.squad, 'reviewer', [{ memberName: 'reviewer', ref: ids.worker, refScope: 'SHARED' }, { memberName: 'editor', ref: ids.helper, refScope: 'SHARED' }]);
  ids.team = await team(names.team, 'manager', [{ memberName: 'manager', ref: ids.manager, refScope: 'SHARED' },
    { memberName: 'worker', ref: ids.worker, refScope: 'SHARED' }, { memberName: 'helper', ref: ids.helper, refScope: 'SHARED' }]);
  const createProject = async (name) => (await gql('mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}', { input: { name } })).createProject.projectId;
  const createTask = async (projectId, description) => (await gql('mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}', { input: { projectId, description } })).createProjectTask.taskId;
  const workerTasks = async (agentRunIds, teamRunIds) => (await gql('query($a:[String!]!,$t:[String!]!){taskWorkerTasks(agentRunIds:$a,teamRunIds:$t){workerKind workerRunId task{taskId projectId description status}}}', { a: agentRunIds, t: teamRunIds })).taskWorkerTasks;
  const projectTasks = async (projectId) => (await gql('query($id:String!){projectTasks(projectId:$id){taskId status root{kind ingressAgentRunId teamRunId start}}}', { id: projectId })).projectTasks;
  const tempTasks = async () => (await gql('query{tasksWithoutProject{taskId description status root{kind ingressAgentRunId teamRunId start}}}')).tasksWithoutProject;
  const managerInput = async (route, managerRunId) => {
    const socket = new WebSocket(`${ws}/ws/${route}`); sockets.push(socket);
    await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
    return (content) => socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { agent_run_id: managerRunId, message_id: `e2e-${randomUUID()}`,
      dedupe_key: `agent_run_input:e2e:${randomUUID()}`, content, context_file_paths: [], image_urls: [] } }));
  };

  // Two Projects; the second is newer, so it is the Projects tab's default choice.
  const desktop = await createProject('Desktop App');
  const launch = await createProject('Prototype Launch');
  const tasks = {
    agentCopy: await createTask(desktop, 'Ship the copy Task summary in the Workspaces tree\nUse server data; keep it live.'),
    teamCopy: await createTask(desktop, 'Review the locate journey with the software engineering team and report back on every edge case we found during the session'),
    teamHosted: await createTask(launch, 'Draft the release notes for the beta'),
    filler: await createTask(launch, 'Plan the next sprint'),
  };
  for (let i = 0; i < 14; i++) await createTask(desktop, `Backlog item ${i + 1}`);

  // An Agent run (standalone host) delegates a Project Task to an agent copy, another to a team copy, and a Temp task.
  const run = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: { agentDefinitionId: ids.manager, ...config } })).createAgentRun;
  if (!run.success) throw new Error(run.message);
  const sendAgent = await managerInput(`agent/${run.runId}`, run.runId);
  sendAgent(callTool('delegate_task', { recipient_address: `/${segment(names.worker)}`, task_id: tasks.agentCopy }));
  sendAgent(callTool('delegate_task', { recipient_address: `/${segment(names.squad)}`, task_id: tasks.teamCopy }));
  sendAgent(callTool('delegate_task', { recipient_address: `/${segment(names.helper)}`, description: 'Check the FAQ links.\nReport broken ones.' }));
  const started = (projectId, taskId) => until(`task ${taskId} started`, async () => (await projectTasks(projectId)).find((t) => t.taskId === taskId && t.root?.start === 'started')?.root, 90000);
  const agentRoot = await started(desktop, tasks.agentCopy);
  const teamRoot = await started(desktop, tasks.teamCopy);
  const temp = await until('temp task started', async () => (await tempTasks()).find((t) => t.description.startsWith('Check the FAQ links') && t.root?.start === 'started'), 90000);

  // A Team run (team host) whose manager delegates to its member: a task Agent copy under the Team run.
  const teamRun = (await gql('mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}',
    { input: { teamDefinitionId: ids.team, teamConfigs: [{ teamAddress: '/', ...config }], memberConfigs: ['manager', 'worker', 'helper']
      .map((m) => ({ memberAddress: `/${m}`, agentDefinitionId: ids[m], ...config })) } })).createAgentTeamRun;
  if (!teamRun.success) throw new Error(teamRun.message);
  const tree = (await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: teamRun.teamRunId })).getTeamRunResumeConfig.executionTree;
  const teamManagerRunId = tree.root_team.members.find((m) => m.address === '/manager').agent_run_id;
  const sendTeam = await managerInput(`agent-team/${teamRun.teamRunId}`, teamManagerRunId);
  sendTeam(callTool('delegate_task', { recipient_address: '/worker', task_id: tasks.teamHosted }));
  const teamHostedRoot = await started(launch, tasks.teamHosted);

  const state = { ...stack, frontend: undefined, backend: undefined, backendPid: stack.backend.pid, frontendPid: stack.frontend.pid,
    names, projects: { desktop, launch }, tasks, tempTaskId: temp.taskId, agentRunId: run.runId, teamRunId: teamRun.teamRunId,
    roots: { agentCopy: agentRoot, teamCopy: teamRoot, temp: temp.root, teamHosted: teamHostedRoot },
    serverAnswers: await workerTasks([agentRoot.ingressAgentRunId, temp.root.ingressAgentRunId, teamHostedRoot.ingressAgentRunId], [teamRoot.teamRunId]) };
  await until('frontend', async () => (await fetch(stack.frontendUrl)).ok, 240000);
  await fsp.writeFile(path.join(outputDir, 'state.json'), `${JSON.stringify(state, null, 2)}\n`);
  process.stdout.write(`READY ${stack.frontendUrl}\n`);
  // Commands from the driver: <output>/command.json { "mutate": <graphql>, "variables": {...} } → result.json.
  setInterval(async () => {
    const file = path.join(outputDir, 'command.json');
    if (!fs.existsSync(file)) return;
    const command = JSON.parse(await fsp.readFile(file, 'utf8')); await fsp.rm(file);
    let result;
    try { result = { ok: true, data: command.agentMessage ? (sendAgent(command.agentMessage), null) : await gql(command.query, command.variables ?? {}) }; }
    catch (e) { result = { ok: false, error: e.message }; }
    await fsp.writeFile(path.join(outputDir, 'result.json'), `${JSON.stringify(result, null, 2)}\n`);
  }, 300);
} catch (error) {
  await fsp.writeFile(path.join(outputDir, 'stack-error.txt'), `${error.stack ?? error}\n`);
  process.stdout.write(`FAILED ${error.message}\n`);
  await shutdown(1);
}

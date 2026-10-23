#!/usr/bin/env node
// API-07 (task-agent-several-tasks AC-010) test data package for the isolated desktop instance. Ticket-owned; not a package script.
// Run from the worktree root while the instance is STOPPED, with the instance's own data root:
//   node tickets/in-progress/task-agent-several-tasks/evidence/API-07-desktop/seed-desktop.mjs <instance data root> <seed.json>
// It starts this worktree's server build (autobyteus-server-ts/dist/app.js) on <root>/server-data exactly as the desktop app starts
// its embedded server (--data-dir, DATABASE_URL on server-data/db/production.db), with the repository's scripted AGY CLI
// (no provider), and has a Manager agent (its own tools, over its scoped MCP session) give Task A and then, while A is open,
// Task B to one Team copy (delegate_task task_id + target_team_run_id). A third Task C stays unassigned. The server is then
// stopped; the instance is started on the same root afterwards. Only the instance's own test-owned data root is written.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const [dataRoot, seedFile] = process.argv.slice(2);
if (!dataRoot || !seedFile) throw new Error('usage: <instance data root> <seed.json>');
const worktree = process.cwd();
const serverDir = path.join(worktree, 'autobyteus-server-ts');
const require = createRequire(path.join(worktree, 'autobyteus-web/package.json'));
const WebSocket = require('ws');
const serverData = path.join(dataRoot, 'server-data');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (label, fn, ms = 60000) => { const end = Date.now() + ms; let last; while (Date.now() < end) { try { const v = await fn(); if (v) return v; } catch (e) { last = e; } await sleep(200); } throw new Error(`Timed out: ${label}${last ? ` (${last.message})` : ''}`); };
const freePort = () => new Promise((resolve, reject) => { const s = net.createServer(); s.once('error', reject); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
const segment = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const callTool = (name, args) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;

const port = await freePort();
const backendUrl = `http://127.0.0.1:${port}`;
const log = fs.createWriteStream(path.join(path.dirname(seedFile), 'seed-backend.log'));
const env = { ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('AUTOBYTEUS_'))),
  DB_TYPE: 'sqlite', DATABASE_URL: `file:${path.join(serverData, 'db', 'production.db')}`, AUTOBYTEUS_DATA_DIR: serverData, AUTOBYTEUS_SERVER_HOST: backendUrl,
  ANTIGRAVITY_CLI_COMMAND: path.join(serverDir, 'tests/fixtures/agy-failure-cli.mjs'), AGY_FAKE_CASE: 'linked_skills' };
const backend = spawn(process.execPath, [path.join(serverDir, 'dist/app.js'), '--port', String(port), '--data-dir', serverData], { cwd: serverDir, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
for (const stream of [backend.stdout, backend.stderr]) stream.on('data', (d) => { output += d; log.write(d); });
const gql = async (query, variables = {}) => {
  const response = await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const body = await response.json();
  if (!response.ok || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
  return body.data;
};
const result = { backendUrl };
try {
  await until('backend GraphQL', async () => { if (backend.exitCode !== null) throw new Error(`backend exited: ${output.slice(-2000)}`); return (await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"query":"{__typename}"}' })).ok; }, 180000);
  const workspace = path.join(dataRoot, 'workspace');
  await fsp.mkdir(workspace, { recursive: true });
  await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspace } });
  const s = randomUUID().slice(0, 4);
  const def = async (name, toolNames) => (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}', { input: { name, role: 'assistant', description: name, instructions: 'Follow the request.', toolNames } })).createAgentDefinition.id;
  const managerName = `Project Task Manager ${s}`, squadName = `Release Team ${s}`;
  const manager = await def(managerName, ['list_projects', 'list_project_tasks', 'create_project', 'update_project', 'create_task', 'update_task']);
  const writer = await def(`Release Writer ${s}`, []);
  await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}', { input: { name: squadName, description: 'Release team', instructions: 'Deliver.', coordinatorMemberName: 'lead',
    nodes: [{ memberName: 'lead', ref: writer, refScope: 'SHARED' }, { memberName: 'reviewer', ref: writer, refScope: 'SHARED' }] } });
  const run = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: { agentDefinitionId: manager,
    workspaceRootPath: workspace, llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null, autoExecuteTools: true, runtimeKind: 'antigravity_cli' } })).createAgentRun;
  if (!run.success) throw new Error(run.message);
  const rootId = run.runId;
  const socket = new WebSocket(`${backendUrl.replace(/^http/, 'ws')}/ws/agent/${rootId}`);
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  const conversation = async () => (await gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: rootId })).getRunProjection?.conversation ?? [];
  const strings = (v) => typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : [];
  const called = (conv) => conv.flatMap((entry) => { const x = strings(entry).find((t) => t.includes('CALLED:')); return x ? [x.slice(x.indexOf('CALLED:') + 7)] : []; });
  const managerCalls = async (content) => {
    const before = called(await conversation()).length;
    socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { agent_run_id: rootId, message_id: `e2e-${randomUUID()}`, dedupe_key: `agent_run_input:e2e:${randomUUID()}`, content, context_file_paths: [], image_urls: [] } }));
    const results = await until(`Manager result for ${content.slice(0, 80)}`, async () => { const r = called(await conversation()); return r.length > before ? r : null; }, 90000);
    const raw = JSON.parse(results[before]);
    return raw.structuredContent ?? JSON.parse(raw.content?.find((p) => p.type === 'text')?.text ?? '{}');
  };
  const projectId = (await gql('mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}', { input: { name: 'AutoByteus' } })).createProject.projectId;
  const create = async (description) => (await gql('mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId taskKey}}', { input: { projectId, description } })).createProjectTask;
  const A = await create('Cross-node collaboration: the relay service');
  const B = await create('Write the release notes for the relay');
  const C = await create('Plan the onboarding redesign');
  const first = await managerCalls(callTool('delegate_task', { recipient_address: `/${segment(squadName)}`, task_id: A.taskKey }));
  if (!first.delegated) throw new Error(JSON.stringify(first));
  const team = first.target_team_run_id, coordinator = first.target_team_coordinator_agent_run_id;
  const second = await managerCalls(callTool('delegate_task', { target_team_run_id: team, task_id: B.taskKey }));
  if (!second.delegated) throw new Error(JSON.stringify(second));
  const roots = async () => Object.fromEntries((await gql('query($id:String!){projectTasks(projectId:$id){taskKey root { kind teamRunId recipientAddress closed status }}}', { id: projectId })).projectTasks.map((t) => [t.taskKey, t.root]));
  const live = await until('both Tasks show the live copy', async () => { const r = await roots(); return r[A.taskKey]?.teamRunId === team && r[B.taskKey]?.teamRunId === team && !r[A.taskKey].closed && !r[B.taskKey].closed ? r : null; }, 60000);
  const listed = await managerCalls(callTool('list_project_tasks', { project_id: projectId }));
  Object.assign(result, { projectId, tasks: { A, B, C }, team, coordinator, managerRunId: rootId, managerName, squadName, first, second, rootsWhileRunning: live,
    assignments: Object.fromEntries(listed.tasks.map((t) => [t.taskId, t.assignments])) });
  socket.close();
} finally {
  if (backend.exitCode === null) { process.kill(-backend.pid, 'SIGTERM'); await until('seed backend exit', () => backend.exitCode !== null || backend.signalCode !== null, 30000).catch(() => process.kill(-backend.pid, 'SIGKILL')); }
  result.backendStopped = backend.exitCode !== null || backend.signalCode !== null;
  await fsp.writeFile(seedFile, `${JSON.stringify(result, null, 2)}\n`);
  log.end();
  console.log(JSON.stringify({ team: result.team, tasks: result.tasks && Object.fromEntries(Object.entries(result.tasks).map(([k, v]) => [k, v.taskKey])), backendStopped: result.backendStopped }));
}

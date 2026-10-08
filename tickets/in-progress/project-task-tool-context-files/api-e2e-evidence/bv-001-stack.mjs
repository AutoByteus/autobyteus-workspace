// BV-001 temporary web-equivalent stack (API/E2E round 1). Not durable coverage.
// Owns: a private data root, the current worktree's built backend (dist/app.js) with the scripted AGY CLI,
// one Manager Agent run whose own create_or_update_task call (scoped MCP) attaches a pasted screenshot and a
// markdown file to a Project Task, and a Nuxt dev server pointed at that backend. Prints the URLs to
// <evidence>/bv-001-stack.json and serves until SIGTERM/SIGINT, then stops its exact process groups and removes its data.
import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const worktree = '/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-tool-context-files';
const serverDir = path.join(worktree, 'autobyteus-server-ts'), webDir = path.join(worktree, 'autobyteus-web');
const evidence = path.join(worktree, 'tickets/in-progress/project-task-tool-context-files/api-e2e-evidence');
const WebSocket = createRequire(path.join(serverDir, 'package.json'))('ws');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const scrubbed = () => Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('ENABLE_') && !k.startsWith('AUTOBYTEUS_')));
const choosePort = () => new Promise((resolve) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
const children = [];
const start = (command, args, cwd, env, log) => {
  const child = spawn(command, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const out = createWriteStream(log); child.stdout.pipe(out); child.stderr.pipe(out); children.push(child); return child;
};
const run = (command, args, cwd, env, log) => new Promise((resolve, reject) => {
  const child = start(command, args, cwd, env, log);
  child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)));
});
const waitFor = async (label, check, ms = 120000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { try { if (await check()) return; } catch { /* retry */ } await new Promise((r) => setTimeout(r, 500)); }
  throw new Error(`Timed out: ${label}`);
};

const owned = await fs.mkdtemp(path.join(os.tmpdir(), 'ctxfiles-bv001-'));
const pasted = await fs.mkdtemp(path.join('/private/tmp', 'ctxfiles-bv001-src-'));
const receipt = { owned, pasted, startedAt: new Date().toISOString() };
const cleanup = async () => {
  for (const child of children) { try { process.kill(-child.pid, 'SIGTERM'); } catch { /* already gone */ } }
  await new Promise((r) => setTimeout(r, 1500));
  for (const child of children) { try { process.kill(-child.pid, 'SIGKILL'); } catch { /* already gone */ } }
  await fs.rm(owned, { recursive: true, force: true }); await fs.rm(pasted, { recursive: true, force: true });
  receipt.cleanup = { ownedRemoved: await fs.access(owned).then(() => false, () => true), sourcesRemoved: await fs.access(pasted).then(() => false, () => true),
    groupsSignalled: children.map((c) => c.pid), at: new Date().toISOString() };
  await fs.writeFile(path.join(evidence, 'bv-001-stack.json'), JSON.stringify(receipt, null, 2) + '\n');
  process.exit(0);
};
process.on('SIGTERM', cleanup); process.on('SIGINT', cleanup);

try {
  const dataRoot = path.join(owned, 'node'), workspace = path.join(owned, 'workspace');
  for (const dir of ['db', 'logs', 'memory', 'temp_workspace', 'home']) await fs.mkdir(path.join(dataRoot, dir), { recursive: true });
  await fs.mkdir(workspace);
  const port = await choosePort(), url = `http://127.0.0.1:${port}`;
  const databaseUrl = pathToFileURL(path.join(dataRoot, 'db', 'node.db')).href;
  const env = { ...scrubbed(), HOME: path.join(dataRoot, 'home'), AUTOBYTEUS_AGENT_PACKAGE_ROOTS: '', AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS: '', AUTOBYTEUS_SKILLS_PATHS: '',
    APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: databaseUrl, AUTOBYTEUS_SERVER_HOST: url, AUTOBYTEUS_LOG_DIR: path.join(dataRoot, 'logs'),
    AUTOBYTEUS_MEMORY_DIR: path.join(dataRoot, 'memory'), AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(dataRoot, 'temp_workspace'),
    ANTIGRAVITY_CLI_COMMAND: path.join(serverDir, 'tests/fixtures/agy-failure-cli.mjs'), AGY_FAKE_CASE: 'linked_skills' };
  await fs.writeFile(path.join(dataRoot, '.env'), `APP_ENV=development\nDB_TYPE=sqlite\nDATABASE_URL=${databaseUrl}\nAUTOBYTEUS_SERVER_HOST=${url}\n`);
  await run('corepack', ['pnpm', '-C', serverDir, 'exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], worktree, env, path.join(owned, 'migrate.log'));
  start(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(port), '--data-dir', dataRoot], serverDir, env, path.join(evidence, 'bv-001-backend.log'));
  await waitFor('backend health', async () => (await fetch(`${url}/rest/health`)).ok);
  const gql = async (query, variables = {}) => {
    const body = await (await fetch(`${url}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json();
    if (body.errors?.length) throw new Error(JSON.stringify(body.errors)); return body.data;
  };
  const projectId = (await gql('mutation($i:CreateProjectInput!){createProject(input:$i){projectId}}', { i: { name: 'Status dot bug' } })).createProject.projectId;
  const managerId = (await gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}', { i: { name: 'BV Manager', role: 'assistant',
    description: 'BV-001 manager', instructions: 'Follow the request.', toolNames: ['list_projects', 'list_project_tasks', 'create_or_update_project', 'create_or_update_task'] } })).createAgentDefinition.id;
  const created = (await gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: managerId,
    workspaceRootPath: workspace, llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null, autoExecuteTools: true, runtimeKind: 'antigravity_cli' } })).createAgentRun;
  if (!created.success) throw new Error(created.message);
  const shot = path.join(pasted, 'Screenshot 2026-10-08 at 10.15.32 AM.png'), notes = path.join(workspace, 'repro-notes.md');
  await fs.writeFile(shot, PNG); await fs.writeFile(notes, '# Repro\nThe status dot stays green after the run fails.\n');
  const socket = new WebSocket(`ws://127.0.0.1:${port}/ws/agent/${created.runId}`);
  const frames = []; socket.on('message', (raw) => frames.push(JSON.parse(String(raw))));
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  await waitFor('agent stream', () => frames.some((f) => f.type === 'CONNECTED'), 30000);
  const content = `CALL_TOOL:${JSON.stringify({ name: 'create_or_update_task', arguments: { project_id: projectId,
    description: 'Fix the status dot: it stays green after a failed run.\nSee the attached screenshot and notes.', context_files: [shot, notes] } })}`;
  const messageId = `bv-${randomUUID()}`;
  socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: messageId, dedupe_key: `agent_run_input:bv:${messageId}`, agent_run_id: created.runId,
    content, context_file_paths: [], image_urls: [] } }));
  let task;
  await waitFor('agent-created Task', async () => {
    task = (await gql('query($id:String!){projectTasks(projectId:$id){taskId description status contextFiles{storedFilename displayName mimeType sizeBytes locator}}}', { id: projectId })).projectTasks[0];
    return task?.contextFiles?.length === 2;
  }, 60000);
  const called = JSON.stringify(frames).match(/CALLED:[^"]*/)?.[0] ?? null;
  await fs.rm(shot); await fs.rm(notes); // AC-006: the pasted temp file is cleaned up before the user looks.
  const webPort = await choosePort(), frontendUrl = `http://127.0.0.1:${webPort}`;
  start('corepack', ['pnpm', 'dev', '--host', '127.0.0.1', '--port', String(webPort)], webDir, { ...scrubbed(), NODE_ENV: 'development', BACKEND_NODE_BASE_URL: url },
    path.join(evidence, 'bv-001-frontend.log'));
  await waitFor('frontend', async () => (await fetch(frontendUrl)).status < 500, 240000);
  Object.assign(receipt, { backendUrl: url, frontendUrl, projectId, managerRunId: created.runId, task, sourcesDeleted: true, toolReplyFrameSeen: Boolean(called),
    taskPage: `${frontendUrl}/projects/${projectId}/tasks/${task.taskId}` });
  await fs.writeFile(path.join(evidence, 'bv-001-stack.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(`READY ${receipt.taskPage}`);
} catch (error) {
  receipt.error = String(error?.stack ?? error);
  await fs.writeFile(path.join(evidence, 'bv-001-stack.json'), JSON.stringify(receipt, null, 2) + '\n');
  await cleanup();
}
setInterval(() => undefined, 1 << 30);

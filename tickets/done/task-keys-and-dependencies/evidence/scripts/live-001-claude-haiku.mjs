// LIVE-001 (ticket-owned, temporary): a REAL model (Claude Agent SDK runtime, Claude Haiku 5.5, the user's signed-in
// `claude`) uses the agent-facing Task keys. The probe owns a built server (autobyteus-server-ts/dist/app.js), a private
// data root and free port; it never touches the installed app or user data. No Codex/OpenAI runtime is configured.
// The Manager is told in plain language what to do; it must find the keys itself through list_project_tasks.
// Usage: node live-001-claude-haiku.mjs <worktree> <outDir>
// Needs the real HOME, USER and LOGNAME (TESTING.md: a signed-in `claude` CLI); everything else is test-owned.
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const [worktree, outDir] = process.argv.slice(2);
const serverDir = path.join(worktree, 'autobyteus-server-ts');
const WebSocket = createRequire(path.join(worktree, 'autobyteus-web/package.json'))('ws');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const out = { startedAt: new Date().toISOString(), checks: [], result: 'Fail', cleanup: {} };
const save = () => fs.writeFile(path.join(outDir, 'live-001-claude-haiku.json'), JSON.stringify(out, null, 2));
const check = (name, ok, detail) => { out.checks.push({ name, ok: Boolean(ok), detail }); console.log(`[${ok ? 'Pass' : 'Fail'}] ${name}`); };
const until = async (label, fn, ms) => { const end = Date.now() + ms; while (Date.now() < end) { const v = await fn().catch(() => null); if (v) return v; await sleep(1000); } return null; };
const freePort = () => new Promise((res, rej) => { const s = net.createServer(); s.once('error', rej); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const run = (cmd, args, opts) => new Promise((res, rej) => { const c = spawn(cmd, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] }); let log = ''; c.stdout.on('data', b => log += b); c.stderr.on('data', b => log += b); c.on('close', code => code === 0 ? res(log) : rej(new Error(`${cmd} ${args.join(' ')} → ${code}\n${log.slice(-2000)}`))); });

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tkd-live-haiku-'));
const dataRoot = path.join(root, 'data'), workspace = path.join(root, 'workspace');
for (const d of [dataRoot, workspace, path.join(dataRoot, 'db'), path.join(dataRoot, 'logs'), path.join(dataRoot, 'memory'), path.join(dataRoot, 'temp_workspace')]) await fs.mkdir(d, { recursive: true });
const port = await freePort(), url = `http://127.0.0.1:${port}`;
const databaseUrl = pathToFileURL(path.join(dataRoot, 'db', 'live.db')).href;
await fs.writeFile(path.join(dataRoot, '.env'), `APP_ENV=development\nDB_TYPE=sqlite\nDATABASE_URL=${databaseUrl}\nAUTOBYTEUS_SERVER_HOST=${url}\n`);
// Only the system essentials and the signed-in CLI's identity; no AUTOBYTEUS_*, provider keys or Codex settings from the shell.
const env = { PATH: process.env.PATH, HOME: process.env.HOME, USER: process.env.USER, LOGNAME: process.env.LOGNAME, TMPDIR: process.env.TMPDIR,
  APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: databaseUrl, AUTOBYTEUS_SERVER_HOST: url,
  AUTOBYTEUS_LOG_DIR: path.join(dataRoot, 'logs'), AUTOBYTEUS_MEMORY_DIR: path.join(dataRoot, 'memory'), AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(dataRoot, 'temp_workspace'),
  AUTOBYTEUS_AGENT_PACKAGE_ROOTS: '', AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS: '', AUTOBYTEUS_SKILLS_PATHS: '' };
let server, socket;
const gql = async (query, variables = {}) => { const r = await fetch(`${url}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) }); const b = await r.json(); if (b.errors) throw new Error(JSON.stringify(b.errors)); return b.data; };
try {
  await run('corepack', ['pnpm', '-C', serverDir, 'exec', 'prisma', 'migrate', 'deploy', '--schema', './prisma/schema.prisma'], { cwd: serverDir, env });
  const serverLog = await fs.open(path.join(outDir, 'live-001-server.log'), 'w');
  server = spawn(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(port), '--data-dir', dataRoot], { cwd: serverDir, env, detached: true, stdio: ['ignore', serverLog.fd, serverLog.fd] });
  if (!await until('health', async () => (await fetch(`${url}/rest/health`)).ok, 120000)) throw new Error('server not healthy');

  // Pin the run to Claude Haiku 5.5: take the catalog entry that names it (an exact ID or the alias resolving to it).
  const snapshots = (await gql('query{providerModelCatalogSnapshots(runtimeKind:"claude_agent_sdk"){runtimeKind llmModels{modelIdentifier name description}}}')).providerModelCatalogSnapshots;
  const models = snapshots.flatMap(s => s.llmModels);
  out.catalog = models;
  const haiku = models.find(m => m.modelIdentifier === 'claude-haiku-5-5')
    ?? models.find(m => /haiku/i.test(`${m.modelIdentifier} ${m.name}`) && /5\.5|5-5/.test(`${m.modelIdentifier} ${m.name} ${m.description ?? ''}`));
  check('Claude Agent SDK catalog offers Claude Haiku 5.5', haiku, { picked: haiku, offered: models.map(m => `${m.modelIdentifier} | ${m.name} | ${m.description ?? ''}`) });
  if (!haiku) throw new Error('Claude Haiku 5.5 not offered; not running another model');
  out.model = haiku.modelIdentifier;

  // A Project with three Tasks created through the UI's API, as a user would.
  const projectId = (await gql('mutation($i:CreateProjectInput!){createProject(input:$i){projectId}}', { i: { name: 'Live Keys' } })).createProject.projectId;
  const mk = async d => (await gql('mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){taskId taskKey}}', { i: { projectId, description: d } })).createProjectTask;
  const schema = await mk('Design the database schema'), api = await mk('Build the REST API'), notes = await mk('Write the release notes');
  out.tasks = { schema, api, notes };
  const suffix = randomUUID().slice(0, 4);
  const def = async (name, toolNames, instructions) => (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}', { input: { name, role: 'assistant', description: name, instructions, toolNames } })).createAgentDefinition.id;
  const manager = await def(`Live Key Manager ${suffix}`, ['list_projects', 'list_project_tasks', 'create_project', 'update_project', 'create_task', 'update_task'], 'You manage Project Tasks with your tools. Do exactly what the user asks, then reply briefly.');
  const workerName = `Live Key Worker ${suffix}`;
  await def(workerName, [], 'Reply with one short sentence: "Received." Do nothing else.');
  const workerAddress = `/${workerName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`;
  const created = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: { agentDefinitionId: manager, workspaceRootPath: workspace, llmModelIdentifier: haiku.modelIdentifier, llmConfig: null, autoExecuteTools: true, runtimeKind: 'claude_agent_sdk' } })).createAgentRun;
  check('Manager run created on claude_agent_sdk', created.success, created);
  const runId = created.runId; out.runId = runId;
  socket = new WebSocket(`${url.replace(/^http/, 'ws')}/ws/agent/${runId}`);
  await new Promise((res, rej) => { socket.once('open', res); socket.once('error', rej); });
  await sleep(500);
  const instruction = [
    `In the Project with project_id "${projectId}":`,
    '1. List its Tasks.',
    '2. Set the Task about the database schema to IN_PROGRESS.',
    '3. Record that the REST API Task depends on the database schema Task.',
    '4. Create a new Task "Publish the API documentation" that depends on the REST API Task.',
    `5. Delegate the REST API Task to ${workerAddress}.`,
    '6. Rename the Project to "Live Keys Renamed".',
    '7. Then create a new Task "Announce the release" in the same Project.',
    'Finally, reply with the Task IDs you used for each step.',
  ].join('\n');
  socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { agent_run_id: runId, message_id: `live-${randomUUID()}`, dedupe_key: `agent_run_input:live:${randomUUID()}`, content: instruction, context_file_paths: [], image_urls: [] } }));
  out.instruction = instruction;

  const tasksNow = async () => (await gql('query($id:String!){projectTasks(projectId:$id){taskId taskKey description status dependsOnTaskIds root{kind ingressAgentRunId start}}}', { id: projectId })).projectTasks;
  const done = await until('all five effects', async () => {
    const t = await tasksNow(); const by = id => t.find(x => x.taskId === id);
    const docs = t.find(x => /publish the api documentation/i.test(x.description));
    return by(schema.taskId)?.status === 'IN_PROGRESS' && JSON.stringify(by(api.taskId)?.dependsOnTaskIds) === JSON.stringify([schema.taskId])
      && docs && JSON.stringify(docs.dependsOnTaskIds) === JSON.stringify([api.taskId]) && by(api.taskId)?.root
      && t.some(x => /announce the release/i.test(x.description)) ? t : null;
  }, 300000);
  const final = await tasksNow(); out.finalTasks = final;
  const by = id => final.find(x => x.taskId === id); const docs = final.find(x => /publish the api documentation/i.test(x.description));
  check('schema Task set to IN_PROGRESS by the model', by(schema.taskId)?.status === 'IN_PROGRESS', by(schema.taskId));
  check('REST API Task depends on the schema Task (stored as the long ID)', JSON.stringify(by(api.taskId)?.dependsOnTaskIds) === JSON.stringify([schema.taskId]), by(api.taskId));
  check('new Task got the next key and depends on the REST API Task', docs?.taskKey === 'live-keys-4' && JSON.stringify(docs.dependsOnTaskIds) === JSON.stringify([api.taskId]), docs);
  check('REST API Task (blocked by an open Task) was delegated', Boolean(by(api.taskId)?.root), by(api.taskId)?.root);
  // Combined Project + Task tool set (merged project-tool-split): a rename through the Project tool keeps the key prefix (AC-003).
  const projectAfter = (await gql('query($id:String!){project(projectId:$id){name}}', { id: projectId })).project;
  const announce = final.find(x => /announce the release/i.test(x.description));
  check('Project renamed by the model through the Project tools', projectAfter?.name === 'Live Keys Renamed', projectAfter);
  check('Task created after the rename keeps the prefix (live-keys-5)', announce?.taskKey === 'live-keys-5', announce);
  // What the model actually sent and saw: the tool calls in its conversation.
  await sleep(5000);
  const conversation = (await gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: runId })).getRunProjection?.conversation;
  await fs.writeFile(path.join(outDir, 'live-001-conversation.json'), JSON.stringify(conversation, null, 2));
  const text = JSON.stringify(conversation ?? '');
  const longIds = [schema, api, notes].map(t => t.taskId).filter(id => text.includes(id));
  check('the model never saw or used a long Task ID (tool results and its arguments carry keys)', longIds.length === 0, { longIdsFound: longIds });
  check('the model referred to Tasks by key', /live-keys-1/.test(text) && /live-keys-2/.test(text), null);
  out.effectsCompleted = Boolean(done);
} catch (error) { out.error = error.stack || String(error); console.error(out.error); }
finally {
  try { socket?.close(); if (out.runId) out.cleanup.terminate = (await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}', { id: out.runId }).catch(e => ({ error: String(e) }))); } catch {}
  if (server && server.exitCode === null) { try { process.kill(-server.pid, 'SIGTERM'); } catch {} await sleep(3000); try { process.kill(-server.pid, 'SIGKILL'); } catch {} }
  out.cleanup.serverStopped = server ? server.exitCode !== null || server.signalCode !== null : 'not-started';
  await fs.rm(root, { recursive: true, force: true }); out.cleanup.rootRemoved = !(await fs.stat(root).then(() => true, () => false));
  out.result = out.checks.length >= 10 && out.checks.every(c => c.ok) ? 'Pass' : 'Fail';
  out.finishedAt = new Date().toISOString(); await save();
  console.log('RESULT', out.result, 'model', out.model, JSON.stringify(out.cleanup));
}

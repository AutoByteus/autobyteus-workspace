#!/usr/bin/env node
// Composer context-file removal: real Nuxt dev frontend + built backend + fresh headless Chrome.
// Run from the repository root: pnpm -C autobyteus-web test:e2e:composer-context-file-removal --output-dir <fresh dir>
//   Optional: --browser-executable <path> --ledger <initialized absolute path> --cases CF-001,CF-002,...
// Prerequisites: installed workspace dependencies, a current `pnpm -C autobyteus-server-ts prebuild && build`
// (the probe runs autobyteus-server-ts/dist/app.js), and Chrome.
// Owners are real: a standalone Manager on the AGY runtime with the repository's scripted CLI
// (autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs) calls the actual `delegate_task` tool, which creates a
// delegated Agent copy and a delegated Team copy (the draft owner kind `agent_collaboration_member_draft`).
// A standalone Team run and an Org run (with a nested team and a delegated task agent) cover the other kinds.
// Cases:
//   CF-001 universal `GET`/`DELETE /rest/drafts/*` over real HTTP for every owner kind, the status mapping,
//          traversal-shaped raw paths (no client normalization) and a paired mobile bearer credential.
//   CF-002 / CF-003 delegated Agent copy / delegated Team-copy member: real clipboard paste of an image, the `+`
//          file chooser and a pasted workspace path, then × and Clear All; the draft files leave the disk.
//   CF-006 the same journey on a standalone Manager, New chat, two standalone Team members, an Org direct member,
//          a nested Org team member and an Org task agent (regressions).
//   CF-007 pasting another composer's draft URL clones it; removing the clone never deletes the source.
//   CF-008 an injected DELETE / upload 5xx shows an error naming the file, keeps the item; the retry clears it.
//   CF-009 an Org task agent while its message is pending (finalize held) and the Manager delegates another task:
//          `+` disabled with a reason, a pasted image shows the message and uploads nothing, a pasted path attaches.
//   CF-004 the backend is stopped: × shows the error and keeps the item; after it returns the retry removes it.
//   CF-005 the delegated children after the root is stopped, a real backend restart and a reload (AC-003).
// Only CF-008 (one response each) and CF-009 (finalize held, then released) alter HTTP; nothing else is mocked.
// The probe owns a private data root, free ports, the backend and Nuxt process groups and Chrome, and removes
// them in finally. It never uses the installed app or user data.
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

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const WebSocket = require('ws');
const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const serverDir = path.join(path.dirname(webDir), 'autobyteus-server-ts');
const getArg = (name, fallback) => {
  const inline = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback;
};
const outputDir = path.resolve(webDir, getArg('output-dir', 'test-results/composer-context-file-removal'));
const ledger = getArg('ledger');
const executablePath = getArg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']
    .find((candidate) => fs.existsSync(candidate));
const ALL_CASES = ['CF-001', 'CF-002', 'CF-003', 'CF-006', 'CF-007', 'CF-008', 'CF-009', 'CF-004', 'CF-005'];
const selectedCases = (getArg('cases') ?? ALL_CASES.join(',')).split(',').map((c) => c.trim()).filter(Boolean);
// A 2x2 opaque PNG (what a screenshot paste delivers, minus the size).
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==', 'base64');
const ERROR_LINE = '[data-testid="context-file-error"]';
const UPLOADS_UNAVAILABLE = "This agent can't receive uploaded files right now.";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (label, predicate, ms = 30000) => {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { try { const v = await predicate(); if (v) return v; } catch (e) { last = e; } await sleep(100); }
  throw new Error(`Timed out: ${label}${last ? ` (${last.message})` : ''}`);
};
const assert = (cond, message, details) => { if (!cond) { const e = new Error(message); e.details = details; throw e; } };
const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer(); s.once('error', reject);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
});
const segment = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const slug = (name) => segment(name).replace(/_/g, '-');
const callTool = (name, args) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;

const evidence = { startedAt: new Date().toISOString(), executablePath, cases: {}, cleanup: {}, failures: [] };
const evidencePath = path.join(outputDir, 'evidence.json');
const save = () => fsp.writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

// ---------------------------------------------------------------- owned stack
const stack = { dataRoot: '', backendUrl: '', frontendUrl: '', backend: null, frontend: null, backendStarts: 0 };
const exited = (c) => !c || c.exitCode !== null || c.signalCode !== null;
const stopGroup = async (child) => {
  if (exited(child)) return { pid: child?.pid ?? null, status: 'not-running' };
  process.kill(-child.pid, 'SIGTERM');
  await until('owned process exit', () => exited(child), 15000).catch(async () => {
    process.kill(-child.pid, 'SIGKILL'); await until('owned process killed', () => exited(child), 5000);
  });
  return { pid: child.pid, status: 'terminated', exit: child.exitCode ?? child.signalCode };
};
const spawnLogged = (cmd, args, cwd, env, name) => {
  const log = fs.createWriteStream(path.join(outputDir, `${name}.log`), { flags: 'a' });
  const child = spawn(cmd, args, { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.output = '';
  child.stdout.on('data', (d) => { child.output += d; log.write(d); });
  child.stderr.on('data', (d) => { child.output += d; log.write(d); });
  child.once('close', () => log.end());
  return child;
};
const backendEnv = () => ({ APP_ENV: 'development', DB_TYPE: 'sqlite', DATABASE_URL: `file:${path.join(stack.dataRoot, 'db', 'development.db')}`,
  AUTOBYTEUS_SERVER_HOST: stack.backendUrl, AUTOBYTEUS_LOG_DIR: path.join(stack.dataRoot, 'logs'),
  AUTOBYTEUS_MEMORY_DIR: path.join(stack.dataRoot, 'memory'), AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(stack.dataRoot, 'temp_workspace') });
const startBackend = async () => {
  stack.backendStarts += 1;
  const env = { ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('AUTOBYTEUS_'))), ...backendEnv(),
    ANTIGRAVITY_CLI_COMMAND: path.join(serverDir, 'tests/fixtures/agy-failure-cli.mjs'), AGY_FAKE_CASE: 'linked_skills' };
  stack.backend = spawnLogged(process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(stack.backendPort), '--data-dir', stack.dataRoot],
    serverDir, env, `backend-${stack.backendStarts}`);
  await until('backend listening', () => { if (exited(stack.backend)) throw new Error('backend exited'); return stack.backend.output.includes('listening'); }, 180000);
  await until('backend GraphQL', async () => (await fetch(`${stack.backendUrl}/graphql`, { method: 'POST',
    headers: { 'content-type': 'application/json' }, body: '{"query":"{__typename}"}' })).ok, 60000);
};
const startStack = async () => {
  assert(fs.existsSync(path.join(serverDir, 'dist/app.js')), 'Build the server first: pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts build');
  stack.dataRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'composer-context-file-removal-'));
  for (const dir of ['db', 'logs', 'memory', 'temp_workspace', 'workspace']) await fsp.mkdir(path.join(stack.dataRoot, dir));
  stack.backendPort = await freePort(); const frontendPort = await freePort();
  stack.backendUrl = `http://127.0.0.1:${stack.backendPort}`; stack.frontendUrl = `http://127.0.0.1:${frontendPort}`;
  await fsp.writeFile(path.join(stack.dataRoot, '.env'), `${Object.entries(backendEnv()).map(([k, v]) => `${k}=${v}`).join('\n')}\n`, { mode: 0o600 });
  await startBackend();
  const ws = stack.backendUrl.replace(/^http/, 'ws');
  stack.frontend = spawnLogged('pnpm', ['exec', 'nuxi', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], webDir,
    { ...process.env, NODE_ENV: 'development', NUXT_TELEMETRY_DISABLED: '1', BACKEND_NODE_BASE_URL: stack.backendUrl,
      BACKEND_AGENT_WS_ENDPOINT: `${ws}/ws/agent`, BACKEND_TEAM_WS_ENDPOINT: `${ws}/ws/agent-team`, BACKEND_GRAPHQL_WS_ENDPOINT: `${ws}/graphql`,
      BACKEND_TRANSCRIPTION_WS_ENDPOINT: `${ws}/ws/transcribe`, BACKEND_TERMINAL_WS_ENDPOINT: `${ws}/ws/terminal`,
      BACKEND_FILE_EXPLORER_WS_ENDPOINT: `${ws}/ws/file-explorer` }, 'frontend');
  await until('frontend', async () => { if (exited(stack.frontend)) throw new Error('Nuxt exited'); return (await fetch(stack.frontendUrl)).ok; }, 240000);
  evidence.stack = { backendUrl: stack.backendUrl, frontendUrl: stack.frontendUrl, dataRoot: stack.dataRoot };
};
const draftRoot = () => path.join(stack.dataRoot, 'draft_context_files');
/** Every file under the draft root, relative to it. */
const draftFiles = async () => {
  const out = [];
  const walk = async (dir) => {
    for (const entry of await fsp.readdir(dir, { withFileTypes: true }).catch(() => [])) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full); else out.push(path.relative(draftRoot(), full));
    }
  };
  await walk(draftRoot());
  return out.sort();
};
const exists = (file) => fsp.access(file).then(() => true, () => false);
/** Files in a draft owner folder; the server prunes the folder once its last draft is deleted. */
const listDir = (dir) => fsp.readdir(dir).catch((e) => { if (e.code === 'ENOENT') return []; throw e; });

// ---------------------------------------------------------------- public API setup (what the app's own launch does)
const gql = async (query, variables = {}) => {
  const response = await fetch(`${stack.backendUrl}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }) });
  const body = await response.json();
  if (!response.ok || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
  return body.data;
};
const workspace = () => path.join(stack.dataRoot, 'workspace');
const config = () => ({ workspaceRootPath: workspace(), llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null, autoExecuteTools: true, runtimeKind: 'antigravity_cli' });
const ensureWorkspace = async () => {
  const listed = (await gql('query{workspaces{absolutePath}}').catch(() => ({ workspaces: [] }))).workspaces ?? [];
  if (!listed.some((w) => w.absolutePath === workspace())) {
    await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspace() } });
  }
};
/** Execution nodes delegated by a host (camelCase Agent/Org trees). */
const taskNodes = (tree) => {
  const found = [];
  const visit = (v) => {
    if (Array.isArray(v)) return v.forEach(visit);
    if (!v || typeof v !== 'object') return;
    const startedAt = v.startedAt ?? v.started_at; const agentRunId = v.agentRunId ?? v.agent_run_id; const teamRunId = v.teamRunId ?? v.team_run_id;
    if (typeof startedAt === 'string' && (agentRunId || teamRunId)) found.push({ agentRunId: teamRunId ? undefined : agentRunId, teamRunId, address: v.address,
      members: (v.members ?? []).map((m) => ({ address: m.address, agentRunId: m.agentRunId ?? m.agent_run_id })).filter((m) => m.agentRunId) });
    Object.values(v).forEach(visit);
  };
  visit(tree); return found;
};
const sockets = [];
const rootInput = async (route, payload) => {
  const socket = new WebSocket(`${stack.backendUrl.replace(/^http/, 'ws')}/ws/${route}`); sockets.push(socket);
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  return { send: (content) => socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: payload(content) })), close: () => socket.close() };
};

const world = {};
const setupWorld = async () => {
  const s = randomUUID().slice(0, 4);
  const names = { manager: `Manager ${s}`, worker: `Release Notes Writer ${s}`, helper: `Fact Checker ${s}`,
    squad: `Docs Review Team ${s}`, team: `Delivery Team ${s}`, org: `Delivery Org ${s}` };
  const ids = {};
  const agent = async (name) => (await gql('mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}',
    { input: { name, role: 'assistant', description: name, instructions: 'Follow the request.', toolNames: [] } })).createAgentDefinition.id;
  ids.manager = await agent(names.manager); ids.worker = await agent(names.worker); ids.helper = await agent(names.helper);
  const team = async (name, coordinatorMemberName, nodes) => (await gql('mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}',
    { input: { name, description: name, instructions: 'Deliver.', coordinatorMemberName, nodes } })).createAgentTeamDefinition.id;
  ids.squad = await team(names.squad, 'reviewer', [{ memberName: 'reviewer', ref: ids.worker, refScope: 'SHARED' }, { memberName: 'editor', ref: ids.helper, refScope: 'SHARED' }]);
  ids.team = await team(names.team, 'manager', [{ memberName: 'manager', ref: ids.manager, refScope: 'SHARED' }, { memberName: 'worker', ref: ids.worker, refScope: 'SHARED' }]);
  ids.org = (await gql('mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}',
    { input: { name: names.org, description: 'Org root', instructions: 'Deliver.', handoffs: [], members: [
      { memberName: 'manager', ref: ids.manager, refType: 'AGENT', refScope: 'SHARED' },
      { memberName: 'worker', ref: ids.worker, refType: 'AGENT', refScope: 'SHARED' },
      { memberName: 'squad', ref: ids.squad, refType: 'AGENT_TEAM', refScope: 'SHARED' }] } })).createAgentOrgDefinition.id;
  world.names = names; world.ids = ids;

  // Standalone Manager run that delegates an Agent copy and a Team copy (the 19.png owner kind).
  const agentRun = (await gql('mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}', { input: { agentDefinitionId: ids.manager, ...config() } })).createAgentRun;
  assert(agentRun.success, agentRun.message);
  world.agentRoot = agentRun.runId;
  const managerIn = await rootInput(`agent/${agentRun.runId}`, (content) => ({ agent_run_id: agentRun.runId, message_id: `e2e-${randomUUID()}`,
    dedupe_key: `agent_run_input:e2e:${randomUUID()}`, content, context_file_paths: [], image_urls: [] }));
  const agentTree = async () => (await gql('query($id:String!){agentRunCollaboration(runId:$id)}', { id: agentRun.runId })).agentRunCollaboration?.root_agent?.execution_tree;
  managerIn.send(callTool('delegate_task', { recipient_address: `/${segment(names.worker)}`, description: 'Draft the release notes.' }));
  await until('Agent copy delegated', async () => taskNodes(await agentTree()).some((n) => n.agentRunId), 90000);
  managerIn.send(callTool('delegate_task', { recipient_address: `/${segment(names.squad)}`, description: 'Review the docs site.' }));
  await until('Team copy delegated', async () => taskNodes(await agentTree()).some((n) => n.teamRunId && n.members.length >= 2), 90000);
  const nodes = taskNodes(await agentTree());
  world.agentCopy = nodes.find((n) => n.agentRunId && !n.teamRunId).agentRunId;
  const teamCopy = nodes.find((n) => n.teamRunId);
  world.teamCopy = { teamRunId: teamCopy.teamRunId, members: teamCopy.members };
  world.teamCopyCoordinator = teamCopy.members.find((m) => /reviewer$/.test(m.address)) ?? teamCopy.members[0];
  managerIn.close();

  // Standalone Team run (Teams are flat; nested members exist inside Orgs).
  const teamRun = (await gql('mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}',
    { input: { teamDefinitionId: ids.team, teamConfigs: [{ teamAddress: '/', ...config() }],
      memberConfigs: [['/manager', ids.manager], ['/worker', ids.worker]]
        .map(([memberAddress, agentDefinitionId]) => ({ memberAddress, agentDefinitionId, ...config() })) } })).createAgentTeamRun;
  assert(teamRun.success, teamRun.message);
  world.teamRoot = teamRun.teamRunId;

  // Org run whose Manager delegates a task agent.
  const orgRun = (await gql('mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}',
    { input: { agentOrgDefinitionId: ids.org, rootConfiguration: config(), agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
  assert(orgRun.success, orgRun.message);
  const orgTree = async () => (await gql('query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}', { id: orgRun.agentOrgRunId })).getAgentOrgRunConfig.executionTree;
  const orgNodes = [];
  const collect = (v) => { if (Array.isArray(v)) return v.forEach(collect); if (!v || typeof v !== 'object') return;
    if (typeof v.address === 'string' && (v.agentRunId || v.teamRunId)) orgNodes.push({ address: v.address, agentRunId: v.agentRunId, teamRunId: v.teamRunId });
    Object.values(v).forEach(collect); };
  collect((await orgTree()).rootOrg);
  world.orgRoot = orgRun.agentOrgRunId;
  world.orgManager = orgNodes.find((m) => m.address === '/manager').agentRunId;
  world.orgSquad = orgNodes.find((m) => m.address === '/squad' && m.teamRunId)?.teamRunId;
  world.orgSquadMember = orgNodes.find((m) => m.address === '/squad/reviewer' && m.agentRunId)?.agentRunId;
  assert(world.orgSquad && world.orgSquadMember, 'Org team member not found in the execution tree', { orgNodes });
  const orgIn = await rootInput(`agent-org/${orgRun.agentOrgRunId}`, (content) => ({ root_subject_kind: 'agent_org', root_run_id: orgRun.agentOrgRunId,
    target_agent_run_id: world.orgManager, command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(), content,
    context_file_paths: [], image_urls: [] }));
  const orgHistory = async () => (await gql('query($id:String!){getAgentOrgRootHistory(orgRunId:$id){org}}', { id: orgRun.agentOrgRunId })).getAgentOrgRootHistory.org;
  orgIn.send(callTool('delegate_task', { recipient_address: '/worker', description: 'Collect the changelog links.' }));
  world.orgTask = (await until('Org task agent delegated', async () => taskNodes(await orgHistory()).find((n) => n.agentRunId), 90000)).agentRunId;
  orgIn.close();

  // A workspace file for pasted-path attachments.
  world.workspaceFile = path.join(workspace(), 'release-checklist.md');
  await fsp.writeFile(world.workspaceFile, '# Release checklist\n');
  for (const name of ['spec-a.txt', 'spec-b.txt', 'spec-c.txt']) await fsp.writeFile(path.join(outputDir, name), `${name} bytes\n`);
  evidence.world = { ...world, ids: undefined };
};

// ---------------------------------------------------------------- raw HTTP (no client-side URL normalization)
const rawRequest = (method, rawPath, headers = {}) => new Promise((resolve, reject) => {
  const request = http.request({ host: '127.0.0.1', port: stack.backendPort, method, path: rawPath, headers }, (response) => {
    let body = ''; response.on('data', (d) => { body += d; });
    response.on('end', () => resolve({ status: response.statusCode, body }));
  });
  request.on('error', reject); request.end();
});
const uploadDraft = async (owner, name, bytes, headers = {}) => {
  const form = new FormData();
  form.append('owner', JSON.stringify(owner));
  form.append('file', new Blob([bytes], { type: 'text/plain' }), name);
  const response = await fetch(`${stack.backendUrl}/rest/context-files/upload`, { method: 'POST', body: form, headers });
  const body = await response.json();
  assert(response.status === 200, `upload ${owner.kind} -> ${response.status}`, body);
  return body;
};
const ownerDir = (owner) => {
  if (owner.kind === 'agent_draft') return path.join(draftRoot(), 'agent-runs', owner.draftRunId, 'context_files');
  if (owner.kind === 'team_member_draft') return path.join(draftRoot(), 'team-runs', owner.teamDraftId, 'members', encodeURIComponent(owner.memberAddress), 'context_files');
  if (owner.kind === 'org_member_draft') return path.join(draftRoot(), 'agent-org-runs', owner.orgRunId, 'agent-runs', owner.agentRunId, 'context_files');
  return path.join(draftRoot(), 'agent-collaborations', owner.hostRunId, 'agent-runs', owner.agentRunId, 'context_files');
};
const collabDir = (agentRunId) => ownerDir({ kind: 'agent_collaboration_member_draft', hostRunId: world.agentRoot, agentRunId });

/** CF-001: AC-005/QR-001 over real HTTP with real owners; RU-2 traversal; RU-3 bearer. */
const universalRoutes = async () => {
  const owners = [
    { kind: 'agent_draft', draftRunId: world.agentRoot },
    { kind: 'team_member_draft', teamDraftId: world.teamRoot, memberAddress: '/squad/reviewer' },
    { kind: 'org_member_draft', orgRunId: world.orgRoot, agentRunId: world.orgManager },
    { kind: 'agent_collaboration_member_draft', hostRunId: world.agentRoot, agentRunId: world.agentCopy },
  ];
  const perKind = [];
  for (const owner of owners) {
    const bytes = `${owner.kind} bytes ${randomUUID()}`;
    const uploaded = await uploadDraft(owner, 'notes.txt', bytes);
    const file = path.join(ownerDir(owner), uploaded.storedFilename);
    assert(await exists(file), `${owner.kind}: upload not on disk`, { file });
    const get1 = await rawRequest('GET', uploaded.locator);
    const del1 = await rawRequest('DELETE', uploaded.locator);
    const goneAfterDelete = !(await exists(file));
    const get2 = await rawRequest('GET', uploaded.locator);
    const del2 = await rawRequest('DELETE', uploaded.locator);
    const row = { kind: owner.kind, locator: uploaded.locator, get: get1.status, getBytesMatch: get1.body === bytes, delete: del1.status,
      goneAfterDelete, getAfterDelete: get2.status, deleteMissing: del2.status };
    perKind.push(row);
    assert(get1.status === 200 && row.getBytesMatch && del1.status === 204 && goneAfterDelete && get2.status === 404 && del2.status === 204,
      `${owner.kind}: upload → GET 200 → DELETE 204 → GET 404 → DELETE 204 not met`, row);
  }
  // Sentinels outside the addressed draft that traversal-shaped paths would reach if they escaped.
  const sentinels = {
    draftRootLevel: path.join(draftRoot(), 'context_files', 'ctx_s1__sentinel.txt'),
    appDataLevel: path.join(stack.dataRoot, 'context_files', 'ctx_s2__sentinel.txt'),
    otherOwner: path.join(ownerDir({ kind: 'agent_draft', draftRunId: 'victim' }), 'ctx_s3__sentinel.txt'),
  };
  for (const file of Object.values(sentinels)) { await fsp.mkdir(path.dirname(file), { recursive: true }); await fsp.writeFile(file, 'sentinel'); }
  // A live draft in an existing owner folder: a dot-only filename would otherwise address that folder itself.
  const keeperOwner = owners[0];
  const keeper = await uploadDraft(keeperOwner, 'keeper.txt', 'keeper bytes');
  const keeperFile = path.join(ownerDir(keeperOwner), keeper.storedFilename);
  const collab = `agent-collaborations/${world.agentRoot}/agent-runs`;
  const expectations = [
    // Invalid owner or file → 400 {detail}.
    { path: `/rest/drafts/team-runs/${world.teamRoot}/members/no-root/context-files/ctx_a__b.txt`, expect: [400] },
    { path: `/rest/drafts/agent-org-runs/${world.orgRoot}/agent-runs/%20padded/context-files/ctx_a__b.txt`, expect: [400] },
    { path: `/rest/drafts/${collab}/a%2Fb/context-files/ctx_a__b.txt`, expect: [400] },
    { path: `/rest/drafts/agent-runs/${world.agentRoot}/context-files/%2E%2E%2Fctx_s1__sentinel.txt`, expect: [400] },
    { path: `/rest/drafts/agent-runs/${world.agentRoot}/context-files/..%2F..%2Fcontext_files%2Fctx_s1__sentinel.txt`, expect: [400] },
    { path: `/rest/drafts/agent-org-runs/${world.orgRoot}/agent-runs/%2E%2E/context-files/ctx_s3__sentinel.txt`, expect: [400] },
    { path: `/rest/drafts/${collab}/%2E%2E/context-files/ctx_a__b.txt`, expect: [400] },
    // Absent owner → 404.
    { path: `/rest/drafts/agent-org-runs/${world.orgRoot}/agent-runs/unknown-member/context-files/ctx_a__b.txt`, expect: [404] },
    { path: `/rest/drafts/agent-org-runs/missing-org/agent-runs/${world.orgManager}/context-files/ctx_a__b.txt`, expect: [404] },
    { path: `/rest/drafts/${collab}/unknown-child/context-files/ctx_a__b.txt`, expect: [404] },
    { path: `/rest/drafts/agent-collaborations/missing-host/agent-runs/${world.agentCopy}/context-files/ctx_a__b.txt`, expect: [404] },
    // Not a draft locator (literal dot segments are not normalized over raw HTTP) → 404.
    { path: '/rest/drafts/unknown-runs/x/context-files/ctx_a__b.txt', expect: [404] },
    { path: `/rest/drafts/agent-runs/${world.agentRoot}/context-files/../../agent-runs/victim/context-files/ctx_s3__sentinel.txt`, expect: [404] },
    { path: '/rest/drafts/agent-runs/../../../context_files/ctx_s2__sentinel.txt', expect: [404] },
    // Traversal-shaped owner IDs and dot-only filenames (draft-run-id-validation) → 400 {detail}, nothing touched.
    { path: '/rest/drafts/agent-runs/%2E%2E/context-files/ctx_s1__sentinel.txt', expect: [400] },
    { path: '/rest/drafts/agent-runs/..%2F..%2Fx/context-files/ctx_s2__sentinel.txt', expect: [400] },
    { path: '/rest/drafts/agent-runs/..%2Fagent-runs%2Fvictim/context-files/ctx_s3__sentinel.txt', expect: [400] },
    { path: '/rest/drafts/team-runs/..%2Fagent-runs%2Fvictim/members/%2Fsquad%2Freviewer/context-files/ctx_s3__sentinel.txt', expect: [400] },
    { path: '/rest/drafts/team-runs/%2E%2E/members/%2Fsquad%2Freviewer/context-files/ctx_s1__sentinel.txt', expect: [400] },
    // Final files are read-only (no DELETE route), so this row is GET only.
    { path: '/rest/runs/%2E%2E/context-files/ctx_s1__sentinel.txt', expect: [400], methods: ['GET'] },
    { path: `/rest/drafts/agent-runs/${world.agentRoot}/context-files/%2E`, expect: [400] },
  ];
  const mapping = [];
  for (const method of ['GET', 'DELETE']) {
    for (const e of expectations.filter((row) => !row.methods || row.methods.includes(method))) {
      const r = await rawRequest(method, e.path);
      let detail = null; try { detail = JSON.parse(r.body).detail ?? null; } catch { /* non-JSON */ }
      mapping.push({ method, path: e.path, status: r.status, detail, expected: e.expect });
    }
  }
  const wrong = mapping.filter((m) => !m.expected.includes(m.status) || (m.status === 400 && typeof m.detail !== 'string'));
  const sentinelState = {};
  for (const [k, file] of Object.entries(sentinels)) sentinelState[k] = await exists(file);
  sentinelState.keeperDraft = await exists(keeperFile) && (await fsp.readFile(keeperFile, 'utf8')) === 'keeper bytes';
  await rawRequest('DELETE', keeper.locator);
  // RU-3: a paired mobile credential authorizes a draft DELETE through the real route policy; a forged one does not.
  await fetch(`${stack.backendUrl}/rest/remote-access/settings`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phoneAccessEnabled: true }) });
  const serverBaseUrl = `http://192.168.77.10:${stack.backendPort}`;
  const session = await (await fetch(`${stack.backendUrl}/rest/remote-access/pairing-sessions`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ serverBaseUrl, trustedPrivateHttpAcknowledged: true }) })).json();
  const exchange = await (await fetch(`${stack.backendUrl}/rest/remote-access/pairing-exchanges`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ pairingCode: session.payload?.pairingCode, deviceName: 'probe phone', serverBaseUrl }) })).json();
  const credential = exchange.credential ?? exchange.accessToken ?? exchange.token;
  assert(typeof credential === 'string' && credential.length > 8, 'pairing exchange returned no credential', { exchangeKeys: Object.keys(exchange), session });
  const collabOwner = owners[3];
  const forged = `${credential.slice(0, -4)}xxxx`;
  const viaBearer = await uploadDraft(collabOwner, 'phone.txt', 'phone bytes', { Authorization: `Bearer ${credential}` });
  const forgedDelete = await rawRequest('DELETE', viaBearer.locator, { Authorization: `Bearer ${forged}` });
  const keptAfterForged = await exists(path.join(ownerDir(collabOwner), viaBearer.storedFilename));
  const bearerDelete = await rawRequest('DELETE', viaBearer.locator, { Authorization: `Bearer ${credential}` });
  const goneAfterBearer = !(await exists(path.join(ownerDir(collabOwner), viaBearer.storedFilename)));
  const bearer = { forgedDelete: forgedDelete.status, keptAfterForged, bearerDelete: bearerDelete.status, goneAfterBearer };
  for (const file of Object.values(sentinels)) await fsp.rm(file, { force: true });
  const result = { perKind, mapping, sentinelState, bearer };
  assert(wrong.length === 0, 'status mapping mismatch over real HTTP', { wrong, result });
  assert(Object.values(sentinelState).every(Boolean), 'a traversal or dot-only path touched a file outside its own draft', result);
  assert(forgedDelete.status === 401 || forgedDelete.status === 403, 'forged bearer was not rejected', result);
  assert(keptAfterForged && bearerDelete.status === 204 && goneAfterBearer, 'bearer DELETE did not delete the draft', result);
  return result;
};

// ---------------------------------------------------------------- browser helpers
let browser;
const newPage = async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: stack.frontendUrl });
  const page = await context.newPage();
  const errors = [];
  const net = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/Outdated Optimize Dep|dynamically imported module|error caught during app initialization|Context file (upload|removal) failed|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  // One entry per request. Chromium also reports `requestfailed` (ERR_ABORTED) after a 204 whose empty body the
  // client never reads; that is recorded on the same entry, not as another request.
  const entries = new WeakMap();
  page.on('request', (r) => { const u = new URL(r.url()); if (/^\/rest\/(drafts|context-files)\//.test(u.pathname) && r.method() !== 'OPTIONS') {
    const entry = { method: r.method(), path: u.pathname }; entries.set(r, entry); net.push(entry); } });
  page.on('response', (r) => { const entry = entries.get(r.request()); if (entry) entry.status = r.status(); });
  page.on('requestfailed', (r) => { const entry = entries.get(r); if (entry) entry.failed = r.failure()?.errorText ?? 'failed'; });
  return { context, page, errors, net };
};
const shot = (page, name) => page.screenshot({ path: path.join(outputDir, `${name}.png`) });
const openWorkspace = async (page) => {
  await page.goto(`${stack.frontendUrl}/workspace`, { waitUntil: 'networkidle', timeout: 120000 });
  await until('workspace rows', async () => (await page.locator('[data-test="workspace-row"]').count()) >= 1, 60000);
  await page.locator('[data-test="workspace-row"]', { hasText: /^\s*workspace\s*$/ }).first().click();
};
const centerTray = (page) => page.locator('[data-test="workspace-center-pane"] [data-file-drop-target="true"]').first();
const trayCount = async (tray) => Number((await tray.innerText()).match(/Context Files \((\d+)\)/)?.[1] ?? NaN);
const waitCount = (tray, n, label) => until(`${label}: Context Files (${n})`, async () => (await trayCount(tray)) === n, 30000);
/** The composer error line, read without waiting (it may be removed at any moment). */
const errorText = async (tray) => (await tray.locator(ERROR_LINE).allInnerTexts())[0]?.trim() || null;
const openAgentRoot = async (page) => {
  await openWorkspace(page);
  await page.locator('[data-test="workspace-agent-row"]', { hasText: world.names.manager }).click();
  const runRow = page.locator('[data-test="workspace-agent-run-row"]').first();
  await runRow.waitFor({ state: 'visible', timeout: 30000 });
  await runRow.click();
  await until('agent task tree', async () => (await page.locator('[data-test="workspace-agent-run-task-tree"]').count()) === 1, 30000);
  return runRow;
};
const childRow = (page, agentRunId) => page.locator(`[data-test="workspace-team-transient-execution-row"][data-agent-run-id="${agentRunId}"]`).first();
const openAgentCopy = async (page) => { await openAgentRoot(page); await childRow(page, world.agentCopy).click(); await centerTray(page).waitFor({ timeout: 30000 }); };
const openTeamCopyMember = async (page, agentRunId = world.teamCopyCoordinator.agentRunId) => {
  await openAgentRoot(page);
  const teamRow = page.locator('[data-test="workspace-team-transient-execution-row"][data-transient-kind="task_team"]').first();
  await teamRow.waitFor({ state: 'visible', timeout: 30000 });
  if ((await teamRow.getAttribute('aria-expanded')) === 'false') await teamRow.locator('[data-test="workspace-team-transient-disclosure"]').click();
  await childRow(page, agentRunId).waitFor({ state: 'visible', timeout: 30000 });
  await childRow(page, agentRunId).click();
  await centerTray(page).waitFor({ timeout: 30000 });
};

/**
 * The real paste path: the image is written to the system clipboard, the user clicks the Context Files area and
 * presses Cmd/Ctrl+V. Chrome dispatches the paste to the clicked area, whose handler uploads the clipboard file.
 */
const pasteImage = async (page, tray) => {
  await page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': new Blob([bytes], { type: 'image/png' }) })]);
  }, PNG.toString('base64'));
  await tray.getByText(/Context Files \(\d+\)/).click();
  await page.keyboard.press('ControlOrMeta+V');
};
const pasteText = async (page, tray, text) => {
  await page.evaluate((t) => navigator.clipboard.writeText(t), text);
  await tray.getByText(/Context Files \(\d+\)/).click();
  await page.keyboard.press('ControlOrMeta+V');
};
const plusButton = (tray) => tray.locator('button[aria-label="Upload files"]');
const pickFiles = async (page, tray, names) => {
  const [chooser] = await Promise.all([page.waitForEvent('filechooser', { timeout: 10000 }), plusButton(tray).click()]);
  await chooser.setFiles(names.map((n) => path.join(outputDir, n)));
};
const removeButtonFor = (tray, label) => tray.locator(`[title="${label}"]`).locator('xpath=ancestor::*[.//button[@aria-label="Remove file"]][1]').locator('button[aria-label="Remove file"]').first();
const removeImage = (tray) => tray.locator('.thumbnail-card button[aria-label="Remove file"]').first();
const clearAll = (tray) => tray.getByRole('button', { name: /Clear All/ });
const deletes = (net) => net.filter((n) => n.method === 'DELETE');
const uploads = (net) => net.filter((n) => n.method === 'POST' && n.path === '/rest/context-files/upload');

/**
 * AC-001/AC-002 journey on one composer: paste an image, pick two files with `+`, paste a workspace path; × the
 * image and one picked file; paste another image; Clear All (2 uploaded + 1 path). Each removal is checked in the
 * tray, on the wire (DELETE at the attachment's locator → 204) and on disk (`dir` = this composer's draft folder,
 * or null when the owner folder is unknown in advance, e.g. New chat).
 */
const trayJourney = async ({ page, tray, net, dir, label }) => {
  const before = await draftFiles();
  const start = await trayCount(tray);
  assert(start === 0, `${label}: tray not empty at start`, { start });
  await pasteImage(page, tray);
  await waitCount(tray, 1, `${label} pasted image`);
  await pickFiles(page, tray, ['spec-a.txt', 'spec-b.txt']);
  await waitCount(tray, 3, `${label} picked files`);
  await pasteText(page, tray, world.workspaceFile);
  await waitCount(tray, 4, `${label} pasted path`);
  await until(`${label} uploads on disk`, async () => (await draftFiles()).length - before.length === 3, 15000);
  const added = (await draftFiles()).filter((f) => !before.includes(f));
  const ownerFolder = dir ? path.relative(draftRoot(), dir) : path.dirname(added[0]);
  assert(added.every((f) => path.dirname(f) === ownerFolder), `${label}: uploads not under the composer's draft owner`, { added, ownerFolder });
  await shot(page, `${label}-attached`);
  const imageFile = added.find((f) => f.endsWith('.png'));
  const deleteCount0 = deletes(net).length;
  await removeImage(tray).click();
  await waitCount(tray, 3, `${label} × image`);
  await until(`${label} image draft deleted`, async () => !(await exists(path.join(draftRoot(), imageFile))), 10000);
  await removeButtonFor(tray, 'spec-a.txt').click();
  await waitCount(tray, 2, `${label} × picked file`);
  const specA = added.find((f) => f.endsWith('spec-a.txt'));
  await until(`${label} picked draft deleted`, async () => !(await exists(path.join(draftRoot(), specA))), 10000);
  await pasteImage(page, tray);
  await waitCount(tray, 3, `${label} second image`);
  await shot(page, `${label}-before-clear-all`);
  await clearAll(tray).click();
  await waitCount(tray, 0, `${label} Clear All`);
  // Every draft this journey uploaded is gone (drafts left by an earlier failed case are not this journey's).
  await until(`${label} uploaded drafts deleted`, async () => (await draftFiles()).every((f) => before.includes(f)), 10000);
  // The draft folder mirrors the locator's owner path: `<owner path>/context_files` ↔ `/rest/drafts/<owner path>/context-files/`.
  const locatorPrefix = `/rest/drafts/${ownerFolder.replace(/\/context_files$/, '')}/context-files/`;
  const removals = deletes(net).slice(deleteCount0);
  assert(removals.length === 4 && removals.every((d) => d.status === 204 && d.path.startsWith(locatorPrefix)),
    `${label}: removals were not DELETE 204 at the attachment locators`, { removals, locatorPrefix });
  assert((await errorText(tray)) === null, `${label}: error line shown after successful removals`, { error: await errorText(tray) });
  assert(await exists(world.workspaceFile), `${label}: removing a path attachment touched the workspace file`);
  await shot(page, `${label}-cleared`);
  return { ownerFolder, added, removals };
};

// ---------------------------------------------------------------- journeys
const journeyCase = (label, open, dir) => async () => {
  const { page, errors, context, net } = await newPage();
  try {
    await open(page);
    const result = await trayJourney({ page, tray: centerTray(page), net, dir: dir(), label });
    assert(errors.length === 0, `${label}: browser errors`, errors);
    return result;
  } finally { await context.close(); }
};

/** CF-006: AC-004 regressions in every other run kind. */
const regressions = async () => {
  const out = {};
  const run = async (label, open, dir, tray = centerTray) => {
    const { page, errors, context, net } = await newPage();
    try {
      await open(page);
      out[label] = await trayJourney({ page, tray: tray(page), net, dir, label });
      assert(errors.length === 0, `${label}: browser errors`, errors);
    } finally { await context.close(); }
  };
  await run('manager', async (page) => { await openAgentRoot(page); await centerTray(page).waitFor(); },
    ownerDir({ kind: 'agent_draft', draftRunId: world.agentRoot }));
  await run('new-chat', async (page) => {
    await page.goto(`${stack.frontendUrl}/chat`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-test="chat-composer"] [data-file-drop-target="true"]').first().waitFor({ timeout: 120000 });
  }, null, (page) => page.locator('[data-test="chat-composer"] [data-file-drop-target="true"]').first());
  const teamMember = async (page, address) => {
    await openWorkspace(page);
    await page.locator(`[data-test="workspace-team-definition-row-${slug(world.names.team)}"]`).click();
    await page.locator(`[data-test="workspace-team-row-${world.teamRoot}"]`).click();
    await page.locator(`[data-test="workspace-team-member-${world.teamRoot}-${address}"]`).click();
    await centerTray(page).waitFor({ timeout: 30000 });
  };
  await run('team-member', (page) => teamMember(page, '/manager'),
    ownerDir({ kind: 'team_member_draft', teamDraftId: world.teamRoot, memberAddress: '/manager' }));
  await run('team-worker', (page) => teamMember(page, '/worker'),
    ownerDir({ kind: 'team_member_draft', teamDraftId: world.teamRoot, memberAddress: '/worker' }));
  const orgMember = async (page, selector, teamRow = null) => {
    await openWorkspace(page);
    await page.locator(`[data-test="agent-org-definition-${slug(world.names.org)}"]`).click();
    await page.locator(`[data-test="agent-org-run-open-${world.orgRoot}"]`).click();
    if (teamRow) {
      await page.locator(teamRow).waitFor({ state: 'visible', timeout: 30000 });
      if (!(await page.locator(selector).count())) await page.locator(teamRow).click();
    }
    await page.locator(selector).waitFor({ state: 'visible', timeout: 30000 });
    await page.locator(selector).click();
    await centerTray(page).waitFor({ timeout: 30000 });
  };
  await run('org-member', (page) => orgMember(page, `[data-test="agent-org-agent-row-${world.orgManager}"]`),
    ownerDir({ kind: 'org_member_draft', orgRunId: world.orgRoot, agentRunId: world.orgManager }));
  await run('org-team-member', (page) => orgMember(page, `[data-test="agent-org-agent-row-${world.orgSquadMember}"]`, `[data-test="agent-org-team-row-${world.orgSquad}"]`),
    ownerDir({ kind: 'org_member_draft', orgRunId: world.orgRoot, agentRunId: world.orgSquadMember }));
  await run('org-task-agent', (page) => orgMember(page, `[data-test="agent-org-task-agent-row-${world.orgTask}"]`),
    ownerDir({ kind: 'org_member_draft', orgRunId: world.orgRoot, agentRunId: world.orgTask }));
  return out;
};

/** CF-007: AC-006 — a pasted draft URL from another composer is cloned; removing the clone keeps the source. */
const foreignDraftClone = async () => {
  const sourceOwner = { kind: 'agent_draft', draftRunId: world.agentRoot };
  const source = await uploadDraft(sourceOwner, 'manager-notes.txt', 'manager source bytes');
  const sourceFile = path.join(ownerDir(sourceOwner), source.storedFilename);
  const { page, errors, context, net } = await newPage();
  try {
    await openTeamCopyMember(page);
    const tray = centerTray(page);
    const before = await draftFiles();
    await pasteText(page, tray, `${stack.backendUrl}${source.locator}`);
    await waitCount(tray, 1, 'clone pasted');
    const clone = await until('clone on disk', async () => (await draftFiles()).find((f) => !before.includes(f)), 10000);
    const childFolder = path.relative(draftRoot(), collabDir(world.teamCopyCoordinator.agentRunId));
    assert(path.dirname(clone) === childFolder, 'clone not stored under this composer\'s owner', { clone, childFolder });
    const cloneGet = net.find((n) => n.method === 'GET' && n.path === source.locator);
    assert(cloneGet?.status === 200, 'clone did not read the source draft', { net });
    await removeButtonFor(tray, 'manager-notes.txt').click();
    await waitCount(tray, 0, 'clone removed');
    await until('clone deleted', async () => !(await exists(path.join(draftRoot(), clone))), 10000);
    assert(await exists(sourceFile), 'removing the clone deleted the source composer\'s draft');
    assert((await rawRequest('GET', source.locator)).status === 200, 'source draft no longer readable');
    assert(!deletes(net).some((d) => d.path === source.locator), 'a DELETE was sent to the source locator', { net });
    // Clear All on a second clone: same guarantee.
    await pasteText(page, tray, `${stack.backendUrl}${source.locator}`);
    await waitCount(tray, 1, 'second clone');
    await clearAll(tray).click();
    await waitCount(tray, 0, 'Clear All clone');
    assert(await exists(sourceFile), 'Clear All deleted the source composer\'s draft');
    assert(errors.length === 0, 'browser errors', errors);
    await rawRequest('DELETE', source.locator);
    return { source: source.locator, clone, deletes: deletes(net) };
  } finally { await context.close(); }
};

/** CF-008: AC-008 — injected DELETE/upload failures are visible, name the file, keep the item; retry clears. */
const injectedFailures = async () => {
  const { page, errors, context, net } = await newPage();
  try {
    await openAgentCopy(page);
    const tray = centerTray(page);
    await pickFiles(page, tray, ['spec-a.txt', 'spec-b.txt']);
    await waitCount(tray, 2, 'failure setup');
    const dir = collabDir(world.agentCopy);
    const files = await until('setup on disk', async () => { const f = await listDir(dir); return f.length === 2 && f; }, 10000);
    const failOnce = (method, pattern, detail) => {
      let used = false;
      return page.route(pattern, async (route) => {
        if (!used && route.request().method() === method) {
          used = true;
          return route.fulfill({ status: 500, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ detail }) });
        }
        return route.fallback();
      });
    };
    await failOnce('DELETE', '**/rest/drafts/**', 'Simulated server failure.');
    await removeButtonFor(tray, 'spec-a.txt').click();
    const removeError = await until('remove error line', () => errorText(tray), 10000);
    assert(/Couldn't remove spec-a\.txt\./.test(removeError) && /Simulated server failure\./.test(removeError), 'remove error does not name the file / detail', { removeError });
    assert((await trayCount(tray)) === 2 && (await listDir(dir)).length === 2, 'failed delete removed the item or the file');
    assert((await tray.locator(ERROR_LINE).getAttribute('role')) === 'alert', 'error line is not role=alert');
    await shot(page, 'failure-remove-error');
    await page.unrouteAll();
    await removeButtonFor(tray, 'spec-a.txt').click();
    await waitCount(tray, 1, 'retry removal');
    await until('retry clears the error', async () => (await errorText(tray)) === null, 10000);
    await failOnce('DELETE', '**/rest/drafts/**', 'Disk busy.');
    await clearAll(tray).click();
    const clearError = await until('Clear All error line', () => errorText(tray), 10000);
    assert(/Couldn't remove spec-b\.txt\./.test(clearError), 'Clear All error does not name the file', { clearError });
    assert((await trayCount(tray)) === 1, 'Clear All dropped the failed item');
    await page.unrouteAll();
    await clearAll(tray).click();
    await waitCount(tray, 0, 'Clear All retry');
    await until('Clear All retry clears the error', async () => (await errorText(tray)) === null, 10000);
    assert((await listDir(dir)).length === 0, 'files left after Clear All retry', { files: await listDir(dir) });
    await failOnce('POST', '**/rest/context-files/upload', 'Upload rejected by the server.');
    await pickFiles(page, tray, ['spec-c.txt']);
    const uploadError = await until('upload error line', () => errorText(tray), 10000);
    assert(/Couldn't attach spec-c\.txt\./.test(uploadError), 'upload error does not name the file', { uploadError });
    assert((await trayCount(tray)) === 0, 'failed upload left a placeholder/item');
    await shot(page, 'failure-upload-error');
    await page.unrouteAll();
    await pickFiles(page, tray, ['spec-c.txt']);
    await waitCount(tray, 1, 'upload retry');
    await until('upload retry clears the error', async () => (await errorText(tray)) === null, 10000);
    await clearAll(tray).click();
    await waitCount(tray, 0, 'cleanup');
    assert(errors.length === 0, 'browser errors', errors);
    return { removeError, clearError, uploadError, initialFiles: files, net };
  } finally { await context.close(); }
};

/** CF-009: AC-007 — an Org task agent while its message is pending has no upload owner. */
const pendingWithoutUploadOwner = async () => {
  const { page, errors, context, net } = await newPage();
  const held = [];
  let orgIn = null;
  try {
    await openWorkspace(page);
    await page.locator(`[data-test="agent-org-definition-${slug(world.names.org)}"]`).click();
    await page.locator(`[data-test="agent-org-run-open-${world.orgRoot}"]`).click();
    const row = page.locator(`[data-test="agent-org-task-agent-row-${world.orgTask}"]`);
    await row.waitFor({ state: 'visible', timeout: 30000 });
    await row.click();
    const tray = centerTray(page);
    await tray.waitFor({ timeout: 30000 });
    // A message with an uploaded draft: its finalize is the slow step that keeps the submission pending.
    await pickFiles(page, tray, ['spec-a.txt']);
    await waitCount(tray, 1, 'pending setup');
    await page.route('**/rest/context-files/finalize', (route) => { held.push(route); });
    const textarea = page.locator('[data-test="workspace-center-pane"] textarea').first();
    await textarea.fill('Please use the attached spec.');
    await textarea.press('Enter');
    await until('finalize in flight', () => held.length === 1, 15000);
    // While the send is pending the Manager delegates another task: the Org tree changes, the view recomputes the
    // target, and the pending task agent is now read-only with no upload owner (the state SCN-003 names).
    orgIn = await rootInput(`agent-org/${world.orgRoot}`, (content) => ({ root_subject_kind: 'agent_org', root_run_id: world.orgRoot,
      target_agent_run_id: world.orgManager, command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(), content,
      context_file_paths: [], image_urls: [] }));
    orgIn.send(callTool('delegate_task', { recipient_address: '/worker', description: 'Summarize the open issues.' }));
    await until('upload button disabled while pending', async () => plusButton(tray).isDisabled(), 15000);
    const title = await plusButton(tray).getAttribute('title');
    assert(title === UPLOADS_UNAVAILABLE, 'disabled + has no reason', { title });
    const uploadsBefore = uploads(net).length;
    const countBefore = await trayCount(tray);
    await pasteImage(page, tray);
    const message = await until('uploads unavailable message', () => errorText(tray), 10000);
    assert(message === UPLOADS_UNAVAILABLE, 'pasted file did not show the message', { message });
    await sleep(500);
    assert(uploads(net).length === uploadsBefore, 'a file was uploaded without an upload owner', { net });
    assert((await trayCount(tray)) === countBefore, 'a pasted file was attached without an upload owner');
    await shot(page, 'pending-no-upload-owner');
    await pasteText(page, tray, world.workspaceFile);
    await waitCount(tray, countBefore + 1, 'path attached while pending');
    const pathAccepted = await tray.innerText();
    for (const route of held.splice(0)) await route.continue();
    await page.unrouteAll();
    await until('finalize completed', () => net.some((n) => n.path === '/rest/context-files/finalize' && n.status === 200), 30000);
    await until('message delivered', async () => /Please use the attached spec\./.test(await page.locator('[data-test="workspace-center-pane"]').innerText()), 30000);
    // Observed, not graded: the Org view keeps the pending-time target until something recomputes it
    // (composer visibility is outside this ticket; see the execution report).
    await sleep(3000);
    const afterSend = { composerVisible: await tray.isVisible(), plusDisabled: (await plusButton(tray).count()) ? await plusButton(tray).isDisabled() : null };
    await shot(page, 'pending-after-send');
    // A target change (another member, then back) recomputes the target: uploads are offered again, the error is gone.
    await page.locator(`[data-test="agent-org-agent-row-${world.orgManager}"]`).click();
    await row.click();
    await until('upload offered again after reselecting', async () => (await plusButton(tray).count()) === 1 && !(await plusButton(tray).isDisabled()), 30000);
    assert((await errorText(tray)) === null, 'uploads-unavailable message survived a target change', { error: await errorText(tray) });
    const afterReselect = { title: await plusButton(tray).getAttribute('title'), count: await trayCount(tray) };
    if (afterReselect.count > 0) { await clearAll(tray).click(); await waitCount(tray, 0, 'pending cleanup'); }
    assert(errors.length === 0, 'browser errors', errors);
    return { title, message, pathAccepted: pathAccepted.includes('release-checklist.md'), afterSend, afterReselect, net };
  } finally {
    for (const route of held.splice(0)) await route.continue().catch(() => {});
    orgIn?.close();
    await context.close();
  }
};

/** CF-004: AC-008/RU-1 — the server is unreachable while removing; the retry works once it is back. */
const outageRetry = async () => {
  const { page, errors, context, net } = await newPage();
  try {
    await openTeamCopyMember(page);
    const tray = centerTray(page);
    await pickFiles(page, tray, ['spec-b.txt']);
    await waitCount(tray, 1, 'outage setup');
    const dir = collabDir(world.teamCopyCoordinator.agentRunId);
    await until('outage file on disk', async () => (await listDir(dir)).length === 1, 10000);
    const stopped = await stopGroup(stack.backend);
    await removeButtonFor(tray, 'spec-b.txt').click();
    const outageError = await until('outage error line', () => errorText(tray), 15000);
    assert(/Couldn't remove spec-b\.txt\./.test(outageError), 'outage error does not name the file', { outageError });
    assert((await trayCount(tray)) === 1, 'item removed while the server was unreachable');
    await shot(page, 'outage-remove-error');
    await startBackend();
    await removeButtonFor(tray, 'spec-b.txt').click();
    await waitCount(tray, 0, 'retry after the server returned');
    await until('outage retry clears the error', async () => (await errorText(tray)) === null, 10000);
    await until('outage file deleted', async () => (await listDir(dir)).length === 0, 10000);
    // Errors logged while the backend was down (sockets, GraphQL) are expected here; app exceptions are not.
    const pageErrors = errors.filter((e) => e.startsWith('pageerror'));
    assert(pageErrors.length === 0, 'page exceptions', pageErrors);
    return { stopped, outageError, deletes: deletes(net) };
  } finally { await context.close(); }
};

/** CF-005: AC-003 — the delegated children after the root is stopped, a real backend restart and a reload. */
const offlineAfterRestart = async () => {
  const t = (await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}', { id: world.agentRoot })).terminateAgentRun;
  await stopGroup(stack.backend);
  await startBackend();
  const out = { terminate: t, backendStarts: stack.backendStarts };
  const { page, errors, context, net } = await newPage();
  try {
    await openAgentCopy(page);
    out.agentCopy = await trayJourney({ page, tray: centerTray(page), net, dir: collabDir(world.agentCopy), label: 'offline-agent-copy' });
    await openTeamCopyMember(page);
    out.teamCopyMember = await trayJourney({ page, tray: centerTray(page), net, dir: collabDir(world.teamCopyCoordinator.agentRunId), label: 'offline-team-copy-member' });
    assert(errors.length === 0, 'browser errors', errors);
    return out;
  } finally { await context.close(); }
};

const CASES = {
  'CF-001': ['Universal draft routes over real HTTP: every owner kind, status mapping, traversal, bearer', universalRoutes],
  'CF-002': ['Delegated Agent copy: paste, +, path, ×, Clear All; drafts leave the disk',
    journeyCase('agent-copy', openAgentCopy, () => collabDir(world.agentCopy))],
  'CF-003': ['Delegated Team-copy member (19.png): paste, +, path, ×, Clear All; drafts leave the disk',
    journeyCase('team-copy-member', (page) => openTeamCopyMember(page), () => collabDir(world.teamCopyCoordinator.agentRunId))],
  'CF-006': ['Regressions: Manager, New chat, Team members, Org direct member, Org team member, Org task agent', regressions],
  'CF-007': ['Pasted foreign draft URL is cloned; removing it keeps the source', foreignDraftClone],
  'CF-008': ['Injected DELETE/upload failure: visible error naming the file, item kept, retry clears', injectedFailures],
  'CF-009': ['Org task agent while its message is pending: + disabled, paste shows message, path still attaches', pendingWithoutUploadOwner],
  'CF-004': ['Server unreachable during ×: visible error, item kept; retry after it returns', outageRetry],
  'CF-005': ['Delegated children after root stop + backend restart + reload', offlineAfterRestart],
};

let result = 'Pass';
try {
  if (fs.existsSync(evidencePath)) throw new Error(`Refusing to overwrite ${evidencePath}; use a fresh --output-dir`);
  await fsp.mkdir(outputDir, { recursive: true });
  assert(executablePath, 'No Chrome found; pass --browser-executable');
  await startStack();
  await ensureWorkspace();
  await setupWorld();
  browser = await chromium.launch({ headless: true, executablePath });
  evidence.browserVersion = browser.version();
  for (const id of selectedCases) {
    const [description, fn] = CASES[id] ?? [];
    if (!fn) throw new Error(`Unknown case ${id}`);
    try {
      const details = await fn();
      evidence.cases[id] = { result: 'Pass', description, details };
    } catch (error) {
      result = 'Fail';
      evidence.cases[id] = { result: 'Fail', description, message: error.message, details: error.details };
      evidence.failures.push({ id, message: error.message });
    }
    if (ledger) await fsp.appendFile(ledger, `\n- ${id}: ${evidence.cases[id].result} — ${description}${evidence.cases[id].message ? ` (${evidence.cases[id].message})` : ''}. Evidence: ${evidencePath}\n`);
    await save();
  }
} catch (error) {
  result = 'Fail';
  evidence.failures.push({ id: 'HARNESS', message: error.message, details: error.details });
} finally {
  for (const socket of sockets) socket.terminate();
  try { await browser?.close(); evidence.cleanup.browser = browser ? 'closed' : 'not-started'; } catch (e) { result = 'Fail'; evidence.cleanup.browser = `failed: ${e.message}`; }
  try { evidence.cleanup.frontend = await stopGroup(stack.frontend); } catch (e) { result = 'Fail'; evidence.cleanup.frontend = `failed: ${e.message}`; }
  try { evidence.cleanup.backend = await stopGroup(stack.backend); } catch (e) { result = 'Fail'; evidence.cleanup.backend = `failed: ${e.message}`; }
  try { if (stack.dataRoot) await fsp.rm(stack.dataRoot, { recursive: true, force: true }); evidence.cleanup.dataRootRemoved = !stack.dataRoot || !fs.existsSync(stack.dataRoot); }
  catch (e) { result = 'Fail'; evidence.cleanup.dataRootRemoved = `failed: ${e.message}`; }
  evidence.result = result; evidence.finishedAt = new Date().toISOString();
  if (fs.existsSync(outputDir)) await save();
}
process.stdout.write(`Composer context-file removal probe: ${result}. Evidence: ${evidencePath}\n`);
process.exit(result === 'Pass' ? 0 : 1);

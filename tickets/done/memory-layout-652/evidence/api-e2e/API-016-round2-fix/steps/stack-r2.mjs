// API/E2E autobyteus-652 (copied from the implementation's IMP-003 stack and extended: an org, a long document, an imported source): a temporary render stack for the Memory layout (autobyteus-652), not committed.
// The worktree's built server on a probe-owned data root with invented data (never a user's), the worktree's Nuxt dev
// server, runs made through the real runtime with the scripted AGY CLI, the memory index built. Holds until
// <out>/stop exists, then stops everything and removes its root.
//   node stack.mjs <worktree> <out>
import { createWriteStream, existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const [worktree, out] = process.argv.slice(2);
const webDir = path.join(worktree, 'autobyteus-web');
const serverDir = path.join(worktree, 'autobyteus-server-ts');
const access = await import(pathToFileURL(path.join(webDir, 'tests/e2e/fixtures/probe-node-access.mjs')).href);
const { ownerHeaders, ownerSocketUrl, probeNodeEnvironment } = access;
access.attachToProbeProcess?.();
await fs.mkdir(out, { recursive: true });
const log = (...args) => console.log(new Date().toISOString(), ...args);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitFor = async (what, fn, timeout = 180_000) => {
  const end = Date.now() + timeout; let last;
  while (Date.now() < end) { try { const v = await fn(); if (v) return v; } catch (e) { last = e; } await sleep(500); }
  throw new Error(`timed out: ${what}${last ? ` (${last.message})` : ''}`);
};
const freePort = () => new Promise((resolve) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); }); });
const children = [];
const start = (name, cmd, args, opts) => {
  const logFile = createWriteStream(path.join(out, `${name}.log`), { flags: 'a' });
  const child = spawn(cmd, args, { ...opts, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(logFile); child.stderr.pipe(logFile);
  children.push(child);
  return child;
};
const stopAll = async () => {
  for (const child of children.reverse()) {
    if (child.exitCode !== null) continue;
    try { process.kill(-child.pid, 'SIGTERM'); } catch { /* gone */ }
    await Promise.race([new Promise((r) => child.once('close', r)), sleep(8000)]);
    if (child.exitCode === null) try { process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ }
  }
};

const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'api652-memory-stack-')));
const dataDir = path.join(root, 'data');
const home = path.join(root, 'home');
const memoryDir = path.join(dataDir, 'memory');
let result = { ok: false };
try {
  await fs.mkdir(home, { recursive: true });
  const [backendPort, frontendPort] = [await freePort(), await freePort()];
  const backendUrl = `http://127.0.0.1:${backendPort}`;
  const frontendUrl = `http://127.0.0.1:${frontendPort}`;

  /* ---------------- invented data: definitions, semantic memory, global memory ---------------- */
  const writeAgent = async (dir, name, description) => {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'agent.md'), `---\nname: ${name}\ndescription: ${description}\nrole: assistant\n---\n\nHelp the user.\n`);
    await fs.writeFile(path.join(dir, 'agent-config.json'), `${JSON.stringify({ toolNames: [], skillNames: [] }, null, 2)}\n`);
  };
  await writeAgent(path.join(dataDir, 'agents', 'project-task-manager'), 'Project Task Manager', 'Plans and tracks the project tasks');
  await writeAgent(path.join(dataDir, 'agents', 'research-assistant'), 'Research Assistant', 'Researches and writes notes');
  // Round 2: a long owner name (the owner and member card grids on a phone, CRR-001 CR-001).
  await writeAgent(path.join(dataDir, 'agents', 'capacity-planner'), 'Quarterly Infrastructure Capacity Planning And Forecasting Assistant', 'Plans capacity');
  await fs.mkdir(path.join(dataDir, 'memory', 'semantic', 'capacity-planner'), { recursive: true });
  await fs.writeFile(path.join(dataDir, 'memory', 'semantic', 'capacity-planner', 'capacity.md'), '# Capacity\n\nPlan the quarter.\n');
  const teamDir = path.join(dataDir, 'agent-teams', 'software-engineering-team');
  await fs.mkdir(teamDir, { recursive: true });
  await fs.writeFile(path.join(teamDir, 'team.md'), '---\nname: Software Engineering Team\ndescription: Builds the product\n---\n\nBuild.\n');
  await fs.writeFile(path.join(teamDir, 'team-config.json'), JSON.stringify({ coordinatorMemberName: 'solution_designer', members: [
    { memberName: 'solution_designer', ref: 'solution_designer', refScope: 'team_local' },
    { memberName: 'project_task_manager', ref: 'project-task-manager', refScope: 'shared' },
  ], handoffs: [], avatarUrl: null }, null, 2));
  await writeAgent(path.join(teamDir, 'agents', 'solution_designer'), 'Solution Designer', 'Designs the solution');

  const { AgentMemoryLayout } = await import(pathToFileURL(path.join(serverDir, 'dist/agent-memory/store/agent-memory-layout.js')).href);
  const { buildTeamLocalAgentDefinitionId } = await import(pathToFileURL(path.join(serverDir, 'dist/agent-team-definition/utils/team-local-definition-id.js')).href);
  const designerId = buildTeamLocalAgentDefinitionId('software-engineering-team', 'solution_designer');
  const designerFolder = new AgentMemoryLayout(memoryDir).getAgentSemanticMemoryDirPath(designerId);
  await fs.mkdir(path.join(designerFolder, 'records'), { recursive: true });
  await fs.mkdir(path.join(designerFolder, 'reflections'), { recursive: true });
  await fs.writeFile(path.join(designerFolder, 'records', 'decisions-2026.md'), '# Decisions 2026\n\n- Keep the header to one row.\n');
  await fs.writeFile(path.join(designerFolder, 'reflections', 'round-1.md'), '# Round 1\n\nThe reader fills the window.\n');
  await fs.writeFile(path.join(designerFolder, 'lessons.md'), '# Lessons\n\nRead the current code before designing.\n\n## Review\n\n- Ask what each label gives the user.\n- Remove what gives no value, then lay out.\n');
  await fs.writeFile(path.join(designerFolder, 'network-settings-and-routing-facts.md'),
    '# Network settings, device limits, and shared routing: verified facts (2026-10-26)\n\n'
    + '- The only router policy manager lives in the local gateway service: `netpanel/gateway/policies/` (`PolicyStore`, `DeviceLimitService`).\n'
    + '- Firmware runtime: gateway pins `netpanel/router-runtime` v0.4.2 (assets arm64, x86_64).\n'
    + '- Surfaces that show device limits: Dashboard overview, Device detail drawer, Schedule editor, and Settings diagnostics.\n\n'
    + '## Open design notes\n\n- Keep plain labels ("Device", "Limit", "Settings page") consistent across every panel; see Global memory `glossary.md`.\n'
    + '- When a device has no active schedule, show "No limit set" rather than an empty table.\n\n### Detail\n\nA third-level heading for the type scale.\n');
  await fs.writeFile(path.join(designerFolder, 'release-handbook.md'), '# Release handbook\n\n' + Array.from({ length: 40 }, (_, i) => `## Step ${i + 1}\n\nCheck item ${i + 1} of the release before tagging; write down what you found and who confirmed it.\n\n- Owner: release engineer\n- Evidence: the run log\n`).join('\n'));
  await fs.writeFile(path.join(designerFolder, 'proposals.md'), '# Proposals\n\n1. One picker style.\n2. No number spinners.\n');
  const ptmFolder = path.join(memoryDir, 'semantic', 'project-task-manager');
  await fs.mkdir(ptmFolder, { recursive: true });
  await fs.writeFile(path.join(ptmFolder, 'task-board.md'), '# Task board\n\nThe tasks the manager tracks.\n');
  const globalFolder = path.join(memoryDir, 'semantic-global');
  await fs.mkdir(globalFolder, { recursive: true });
  await fs.writeFile(path.join(globalFolder, 'product.md'), '# Product\n\nAutoByteus runs agents on your own nodes.\n\n## Principles\n\n- Nothing leaves the machine unless you say so.\n');
  await fs.writeFile(path.join(globalFolder, 'glossary.md'), '# Glossary\n\n- **Node**: a computer that runs agents.\n');

  /* ---------------- the server ---------------- */
  await fs.writeFile(path.join(dataDir, '.env'), `AUTOBYTEUS_SERVER_HOST=${backendUrl}\nAPP_ENV=test\nLOG_LEVEL=WARN\n`);
  start('server', process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(backendPort), '--data-dir', dataDir], {
    cwd: serverDir,
    env: { PATH: process.env.PATH, HOME: home, TMPDIR: process.env.TMPDIR, APP_ENV: 'test', LOG_LEVEL: 'WARN', AUTOBYTEUS_SERVER_HOST: backendUrl,
      AUTOBYTEUS_ALLOWED_ORIGINS: frontendUrl, ANTIGRAVITY_CLI_COMMAND: path.join(serverDir, 'tests/fixtures/agy-failure-cli.mjs'), AGY_FAKE_CASE: 'linked_skills',
      ...probeNodeEnvironment() },
  });
  await waitFor('server health', async () => (await fetch(`${backendUrl}/rest/health`)).ok, 300_000);
  log('server up');
  const gql = async (query, variables) => {
    const body = await (await fetch(`${backendUrl}/graphql`, { method: 'POST', headers: ownerHeaders({ 'content-type': 'application/json' }), body: JSON.stringify({ query, variables }) })).json();
    if (body.errors?.length) throw new Error(JSON.stringify(body.errors));
    return body.data;
  };
  const sendOver = async (url, payload) => {
    const socket = new WebSocket(ownerSocketUrl(url));
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    await sleep(400);
    socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload }));
    await sleep(800);
    socket.close();
  };
  const workspace = path.join(root, 'workspace', 'launch-app');
  await fs.mkdir(workspace, { recursive: true });
  // Every file kind the file list names (autobyteus-652 AC-005), in the run workspace and a skill's folder.
  const kinds = { 'README.md': '# Launch app\n', 'notes.txt': 'notes\n', 'package.json': '{ "name": "launch-app" }\n', 'index.html': '<!doctype html><title>x</title>\n',
    'src/main.js': 'console.log(1);\n', 'src/app.ts': 'export const x: number = 1;\n', 'src/App.vue': '<template><div /></template>\n', 'styles/site.css': 'body { margin: 0; }\n' };
  for (const base of [workspace, path.join(dataDir, 'skills', 'launch-skill')]) {
    for (const [file, text] of Object.entries(kinds)) { await fs.mkdir(path.dirname(path.join(base, file)), { recursive: true }); await fs.writeFile(path.join(base, file), text); }
  }
  await fs.writeFile(path.join(dataDir, 'skills', 'launch-skill', 'SKILL.md'), '---\nname: launch-skill\ndescription: Launches the app\n---\n\nLaunch it.\n');
  const agy = { runtimeKind: 'antigravity_cli', llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null };
  const runConfig = { workspaceRootPath: workspace, autoExecuteTools: true, ...agy };
  const wsUrl = (route) => `${backendUrl.replace('http', 'ws')}/ws/${route}`;
  const projection = async (runId) => JSON.stringify((await gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: runId })).getRunProjection?.conversation ?? []);

  const agentRun = async (definitionId, message) => {
    const created = (await gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: definitionId, ...runConfig } })).createAgentRun;
    if (!created.success) throw new Error(created.message);
    await sendOver(wsUrl(`agent/${created.runId}`), { message_id: randomUUID(), dedupe_key: `agent_run_input:stack:${randomUUID()}`, context_file_paths: [], image_urls: [], agent_run_id: created.runId, content: message });
    await waitFor(`${message} answered`, async () => (await projection(created.runId)).includes(message), 120_000);
    await sleep(4000);
    await gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}', { id: created.runId }).catch((e) => log('terminate', e.message));
    return created.runId;
  };
  const runOne = await agentRun('project-task-manager', 'Rename the helper and update callers');
  const runTwo = await agentRun('project-task-manager', 'Plan the release notes for the launch');
  log('agent runs', runOne, runTwo);

  // The team's run: the coordinator (the team-local Solution Designer) and the shared Project Task Manager.
  const teamRun = (await gql('mutation($i:CreateAgentTeamRunInput!){createAgentTeamRun(input:$i){success message teamRunId}}', { i: { teamDefinitionId: 'software-engineering-team',
    teamConfigs: [{ teamAddress: '/', ...runConfig }],
    memberConfigs: [{ memberAddress: '/solution_designer', agentDefinitionId: designerId, ...runConfig }, { memberAddress: '/project_task_manager', agentDefinitionId: 'project-task-manager', ...runConfig }] } })).createAgentTeamRun;
  if (!teamRun.success) throw new Error(teamRun.message);
  const tree = (await gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: teamRun.teamRunId })).getTeamRunResumeConfig.executionTree;
  const lead = tree.root_team.members.find((m) => m.address === '/solution_designer').agent_run_id;
  const teamSocket = new WebSocket(ownerSocketUrl(wsUrl(`agent-team/${teamRun.teamRunId}`)));
  await new Promise((resolve, reject) => { teamSocket.onopen = resolve; teamSocket.onerror = reject; });
  await sleep(800);
  teamSocket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: randomUUID(), dedupe_key: `team_member_input:stack:${randomUUID()}`, context_file_paths: [], image_urls: [], agent_run_id: lead, content: 'Review the launch checklist with the team' } }));
  await sleep(8000);
  teamSocket.close();
  await gql('mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success}}', { id: teamRun.teamRunId }).catch((e) => log('terminate team', e.message));
  log('team run', teamRun.teamRunId, lead);
  await sleep(3000);

  // The org: the Research Assistant (planner) and the Software Engineering Team (squad); its run, the planner asked.
  const orgId = (await gql('mutation($i:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$i){id}}', { i: { name: 'Launch Org', description: 'Runs the launch',
    instructions: 'Launch.', handoffs: [], members: [{ memberName: 'planner', ref: 'research-assistant', refType: 'AGENT', refScope: 'SHARED' },
      { memberName: 'squad', ref: 'software-engineering-team', refType: 'AGENT_TEAM', refScope: 'SHARED' }] } })).createAgentOrgDefinition.id;
  const orgRun = (await gql('mutation($i:CreateAgentOrgRunInput!){createAgentOrgRun(input:$i){success message agentOrgRunId}}',
    { i: { agentOrgDefinitionId: orgId, rootConfiguration: runConfig, agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
  if (!orgRun.success) throw new Error(orgRun.message);
  const orgTree = (await gql('query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}', { id: orgRun.agentOrgRunId })).getAgentOrgRunConfig.executionTree;
  const orgPlanner = orgTree.rootOrg.members.find((m) => m.address === '/planner')?.agentRunId;
  await sendOver(wsUrl(`agent-org/${orgRun.agentOrgRunId}`), { root_subject_kind: 'agent_org', root_run_id: orgRun.agentOrgRunId, target_agent_run_id: orgPlanner,
    command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(), content: 'Coordinate the launch across the teams', context_file_paths: [], image_urls: [] });
  await waitFor('the org planner answered', async () => (await projection(orgPlanner)).includes('Coordinate the launch'), 120_000).catch((e) => log('org planner', e.message));
  await sleep(4000);
  log('org run', orgId, orgRun.agentOrgRunId, orgPlanner);

  // Run two gets two archived raw-trace segments (three raw-trace files, three journal files).
  const runTwoDir = path.join(memoryDir, 'agents', runTwo);
  const ts = Math.floor(Date.now() / 1000) - 86400 * 3;
  const segment = (index, day) => Array.from({ length: 6 }, (_, i) => ({ id: `rt_s${index}_${i}`, seq: i + 1, ts: ts + day * 86400 + i * 60, turn_id: `turn_s${index}`,
    trace_type: i % 2 ? 'assistant' : 'user', content: i % 2 ? `Answer ${index}.${i}: the step is done.` : `Step ${index}.${i}: check the release notes draft.` }));
  await fs.mkdir(path.join(runTwoDir, 'raw_traces_archive'), { recursive: true });
  const segments = [];
  for (const [index, day] of [[1, 0], [2, 1]]) {
    const records = segment(index, day);
    const fileName = `raw_traces_${String(index).padStart(6, '0')}.jsonl`;
    await fs.writeFile(path.join(runTwoDir, 'raw_traces_archive', fileName), records.map((r) => `${JSON.stringify(r)}\n`).join(''));
    segments.push({ index, file_name: fileName, boundary_type: 'native_compaction', boundary_key: `stack-${index}`, archived_at: records.at(-1).ts,
      first_trace_id: records[0].id, last_trace_id: records.at(-1).id, first_ts: records[0].ts, last_ts: records.at(-1).ts, record_count: records.length, status: 'complete' });
  }
  await fs.writeFile(path.join(runTwoDir, 'raw_traces_manifest.json'), JSON.stringify({ schema_version: 1, next_segment_index: 3, segments }, null, 2));

  // The memory index: its Work Journals step renders each run's journal files.
  await gql('mutation{startMemoryIndexing}');
  const journals = async (dir) => (await fs.readdir(path.join(dir, 'work_journal')).catch(() => [])).filter((f) => f.endsWith('.md'));
  await waitFor('journals', async () => (await journals(path.join(memoryDir, 'agents', runOne))).length >= 1 && (await journals(runTwoDir)).length >= 2, 300_000);
  log('journals', await journals(path.join(memoryDir, 'agents', runOne)), await journals(runTwoDir));

  /* ---------------- an imported source: a second node (beta) syncs its memory into this node's hub ---------------- */
  const betaPort = await freePort();
  const betaUrl = `http://127.0.0.1:${betaPort}`;
  const betaData = path.join(root, 'beta-data');
  await fs.mkdir(path.join(root, 'beta-home'), { recursive: true });
  const betaRun = path.join(betaData, 'memory', 'agents', 'beta-run-1');
  await fs.mkdir(betaRun, { recursive: true });
  await fs.writeFile(path.join(betaRun, 'run_metadata.json'), JSON.stringify({ runId: 'beta-run-1', agentDefinitionId: 'beta-writer', workspaceRootPath: '/beta/work', memoryDir: betaRun,
    llmModelIdentifier: 'model-a', llmConfig: null, autoExecuteTools: false, runtimeKind: 'autobyteus', platformAgentRunId: null, startedAt: '2026-11-20T09:00:00.000Z' }));
  await fs.writeFile(path.join(betaRun, 'raw_traces_active.jsonl'), `${JSON.stringify({ id: 'b1', trace_type: 'user', content: 'Draft the beta notes', seq: 1, ts: 1795000000 })}\n`);
  const betaSemantic = path.join(betaData, 'memory', 'semantic', 'beta-writer');
  await fs.mkdir(betaSemantic, { recursive: true });
  await fs.writeFile(path.join(betaSemantic, 'beta-notes.md'), '# Beta notes\n\nWritten on beta.\n');
  await fs.writeFile(path.join(betaData, '.env'), `AUTOBYTEUS_SERVER_HOST=${betaUrl}\nAPP_ENV=test\nLOG_LEVEL=WARN\n`);
  start('beta', process.execPath, [path.join(serverDir, 'dist/app.js'), '--host', '127.0.0.1', '--port', String(betaPort), '--data-dir', betaData], {
    cwd: serverDir, env: { PATH: process.env.PATH, HOME: path.join(root, 'beta-home'), TMPDIR: process.env.TMPDIR, APP_ENV: 'test', LOG_LEVEL: 'WARN', AUTOBYTEUS_SERVER_HOST: betaUrl, ...probeNodeEnvironment() },
  });
  await waitFor('beta health', async () => (await fetch(`${betaUrl}/rest/health`)).ok, 300_000);
  const betaGql = async (query, variables) => {
    const body = await (await fetch(`${betaUrl}/graphql`, { method: 'POST', headers: ownerHeaders({ 'content-type': 'application/json' }), body: JSON.stringify({ query, variables }) })).json();
    if (body.errors?.length) throw new Error(JSON.stringify(body.errors));
    return body.data;
  };
  const hub = await gql('mutation($i:UpdateMemoryHubConfigInput!){updateMemoryHubConfig(input:$i){oneTimePlaintextToken}}', { i: { enabled: true, advertisedHubBaseUrl: backendUrl } });
  await betaGql('mutation($i:UpdateMemorySyncSourceConfigInput!){updateMemorySyncSourceConfig(input:$i){source{memorySyncSourceId}}}',
    { i: { enabled: true, memorySyncSourceId: 'beta-source', displayName: 'Beta Node', hubBaseUrl: backendUrl, hubToken: hub.updateMemoryHubConfig.oneTimePlaintextToken, backgroundEnabled: false, batchSize: 25 } });
  const synced = (await betaGql('mutation{startMemorySync{committedBatches}}')).startMemorySync;
  log('beta synced', JSON.stringify(synced));

  /* ---------------- the frontend ---------------- */
  start('frontend', 'pnpm', ['dev', '--host', '127.0.0.1', '--port', String(frontendPort)], {
    cwd: webDir, env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, NODE_ENV: 'development', NUXT_TEST: 'true', BACKEND_NODE_BASE_URL: backendUrl },
  });
  await waitFor('frontend', async () => (await fetch(`${frontendUrl}/memory`)).ok, 600_000);
  await fs.writeFile(path.join(out, 'credential'), probeNodeEnvironment().AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL, { mode: 0o600 });
  result = { ok: true, frontendUrl, backendUrl, root, runOne, runTwo, teamRunId: teamRun.teamRunId, lead, designerId, designerFolder, globalFolder, workspace, orgId, orgRunId: orgRun.agentOrgRunId, orgPlanner, betaUrl };
  await fs.writeFile(path.join(out, 'stack.json'), JSON.stringify(result, null, 2));
  log('READY', frontendUrl);
  await waitFor('stop file', async () => existsSync(path.join(out, 'stop')), 7_000_000);
} catch (error) {
  log('FAILED', error.stack ?? error);
  await fs.writeFile(path.join(out, 'stack.json'), JSON.stringify({ ok: false, error: String(error) }, null, 2));
} finally {
  await stopAll();
  await fs.rm(root, { recursive: true, force: true });
  log('cleaned', root);
}

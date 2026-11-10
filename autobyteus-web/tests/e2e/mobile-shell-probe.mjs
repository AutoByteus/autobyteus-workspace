#!/usr/bin/env node
// Browser + server probe for the phone shell (autobyteus-277, mobile-experience-redesign): the paired phone's `/mobile`
// against test-owned servers built from this worktree, with real delegated, Team, Org, remote and approval runs.
//
// Stack (all probe-owned, removed in `finally`):
// - alpha (the paired node) and beta (its peer), `autobyteus-server-ts/dist/app.js` on 127.0.0.1, each with its own temp
//   data root and HOME. Agents run on the scripted AGY CLI (`tests/fixtures/agy-failure-cli.mjs`: `CALL_TOOL:{…}` makes
//   the agent call the real tool; `GENERATE_IMAGE:<path>` writes a file) and, for one approval, on Grok Build through the
//   recorded ACP replay (`tests/fixtures/grok-acp/permission.jsonl`: a real `run_bash` approval request). No model, no keys.
// - The phone loads the production phone bundle that alpha serves at `/mobile` (`pnpm -C autobyteus-web build:mobile-web`),
//   so page, API and streams share the node's origin as on a real phone. It pairs through Phone Access with a private
//   network URL (`http://192.168.77.10:<alpha port>`; the node refuses loopback pairing URLs); the probe's browser routes
//   that host, HTTP and WebSocket, to alpha, keeping the phone's Host (and its Origin on WebSockets) as a real LAN path
//   does: alpha refuses an Origin that matches neither Host nor an allowed origin (autobyteus-403). Every request
//   needs a credential (node access model NA-1, autobyteus-437): the phone sends its Phone Access credential on each.
//   Both nodes start with the probe's launch owner credential (fixtures/probe-node-access.mjs) and are paired by invite.
// - The desktop window for the comparison is `nuxt dev` against alpha; its browser context carries alpha's owner
//   credential (desktopContext), the phone's contexts only the phone's own.
//
// Data (public GraphQL/REST/WebSocket only): on beta, Publisher and the Team "Studio Team". On alpha, the agent "Project
// Task Manager" (PTM) with a Project and two Tasks: Task A to the agent "Release Notes Writer" (a task agent), Task B to the
// Team "Docs Review Team" whose coordinator delegates further (a member's delegated work); the PTM also delegates to beta's
// /publisher and /studio_team (remote runs). A Team run "Delivery Team" (its lead writes a file and messages its mate with a
// file reference, and delegates a task agent of its own), an Org run "Delivery Org" (first member an agent), an Org run
// "Review Org" (first member a Team), the Grok run "Approver", and plain "Fact Checker" runs (more than five top-level runs).
// The phone's origin is a private HTTP address, not a secure context (no `crypto.randomUUID`), as on a trusted
// LAN/tailnet pairing.
//
// Cases (phone at 390×844 unless named):
//   MSP-01 AC-001  The same runs and order as the desktop Runs view of the same node; newest 5, "Show older (N)", "Show
//                  fewer"; ages on top-level rows.
//   MSP-02 AC-002, AC-002a  The PTM run's tree: the task agent and the task team under it, the team folded with its
//                  members, the remote rows with their node chip; a Team member's task agent beside the member, as on the
//                  desktop (DEC-009); second lines: a delegated task agent or task team shows its Task's summary, the same
//                  line as the desktop Runs view; members show their name only (DEC-010); a delegated run stopped on the
//                  node: its dot follows live while its root is open, and under a root not open it follows within one
//                  history poll (autobyteus-426 D-09; before it, 277 DEC-013 updated it only once the root was opened).
//   MSP-03 AC-003, AC-003a  A tap on the task agent, a task-team member, the Team run (its coordinator), the Org run whose
//                  first member is an agent (that agent), the Org run whose first member is a Team (its coordinator) and an
//                  Org member: each opens that agent's conversation with its composer; a message sent from the phone (a
//                  non-secure origin) reaches that run on the node; ← returns to the list at the same scroll with the open
//                  row marked.
//   MSP-04 AC-003  A tool approval: a message from the phone to the Grok run raises an approval request; Approve on the
//                  phone; the node answers the runtime with allow-once and the tool runs.
//   MSP-05 AC-003  "Opening…" only while attaching: from the tap until the conversation, the run screen never shows another
//                  run and offers no button but ←; browser Back/Forward re-attach (an Org entry too); a reload of a run
//                  entry lands on the list; a tap on a second row during an open ends on the second run.
//   MSP-06 AC-004  The remote rows (chip, title, state); a remote run opens with its live conversation; a text message from
//                  the phone reaches it on beta and its answer shows; no attachments, `@` opens nothing; beta down: red dot
//                  and "Not reachable" on the rows, the notice with Retry when opened, other runs open; beta back: Retry.
//   MSP-07 AC-006  "+" with nothing opened: the Project Task Manager preselected; after the Org run was opened and ←: its
//                  open member's row still marked and its agent preselected; every row's sheet; agents only; disabled with
//                  the reason; a blank folder path cannot be opened; a missing path, a file and a relative path are refused
//                  with their reason under the field and nothing is registered, an existing folder registers (autobyteus-426
//                  D-08); Create run opens the new run's Chat; its first message keeps the screen while its id changes; the
//                  new run tops the list.
//   MSP-08 AC-007  On the Team's coordinator: ⋮ items in order; Artifacts (one file shown directly), Files (tree, path,
//                  search over the workspace, no filters, an opened file without Attach), Messages (a reference opens the
//                  file), Activity (its tool calls); a standalone agent: no Messages, empty states; a remote run: "on that
//                  node" wording.
//   MSP-16 autobyteus-427  A file link in a conversation (the Delivery Team lead's own message, Markdown links to absolute
//                  paths): a tap on a file in the workspace's sub-folder opens the file viewer with its text, the URL is
//                  `screen=files`, the folder's workspace id and the relative path; the system Back returns to the
//                  conversation. autobyteus-436 (AC-001, AC-004): a file outside the workspace opens too, read-only, by its
//                  absolute path (`screen=files&nodeFile=`): a text file, a Markdown file and an image; Back closes each;
//                  a missing path says "This file was not found on the computer.", a folder "This path is a folder, not a
//                  file."; no edit control; no opener failure in the console.
//   MSP-09 AC-008  The connection sheet: the node's name from the pairing code (the name the desktop gives it, the dialog's
//                  name; the node's status carries none), URL, state, the refresh icon while connected and no peer list
//                  (one-step-phone-pairing REQ-019, AC-016); alpha down: the bar and the banner, "Retry" in the sheet;
//                  alpha back: Retry clears them (and the poll's behavior meanwhile, review residual C-06); a browser
//                  pairing link: the node's name, one "Connect to <name>" tap and "Get the Android app" (AC-015);
//                  "Unpair from <node>" → the confirmation → the pairing screen (DEC-018).
//   MSP-10 AC-009  None of the "Not on the phone" items; `?unsupported=desktopWorkspace` shows the notice above the list.
//   MSP-11 AC-005  Every screen at 390×844 and 360×800: no horizontal scroll, every phone-owned control ≥ 44×44 (the shared
//                  composer and conversation are listed apart); Back walks file → Files → run → list and reference →
//                  Messages → run → list. Screenshots of each screen for the visual comparison.
//   MSP-12 DS-001  The network log: reads with the complete window (`null`); a poll every 5 s only on the list; none on the
//                  run screen or a view; none while the page is hidden; one read at once when shown again; bytes per read;
//                  the time from opening to the listed runs (QR-003 on this stack).
//   MSP-13 E-27    A credential the node does not know (401): the phone's next start reads once and lands on pairing.
//                  A device revoked on the node (403, autobyteus-426 D-02): the open phone's Check and a later start both
//                  land on pairing, the stored session removed.
//   MSP-17 autobyteus-426 D-19  A read-only conversation (the task agent of an Org run stopped on the node): a tap on a
//                  file outside the workspace opens it read-only (autobyteus-436); no composer.
//   MSP-18 autobyteus-426 D-02  Phone Access off on the node: the open phone's Check and a later start show the bar "Phone
//                  access off" and "<node> is reachable, but Phone access is off." with Check; the session is kept; on
//                  again, Check loads the runs (no re-pairing); off, then the node stopped: "Can’t reach <node>.".
//   MSP-20 autobyteus-426 D-09  A listed, active Agent run that is not open (desktop Runs view and phone list): its
//                  delegated rows follow a child idle → running → idle within ≤ 2 polls (desktop) / one poll (phone); an
//                  unchanged poll sends only the status read (bytes recorded) and no collaboration view read; a third child
//                  appears within one poll with one view re-read; after the run stops, its rows show offline within one
//                  poll; a window that has the run open leaves it out of the status read.
//   MSP-19 autobyteus-426 D-01  The definitions feed: no WebSocket at all while not paired (30 s); after pairing one feed
//                  socket to the paired node with `access_token`; after unpair it closes and is not opened again; the
//                  desktop window still opens it.
//   MSP-14 AC-002  Task A DONE: the task agent's row leaves the list live.
//   MSP-15 DS-001  The desktop window of the same node, which shares the history load with the phone: the Projects view
//                  reads every run (window `null`, as the Runs view and the phone); switching Runs ↔ Projects reads
//                  nothing beyond the 5 s poll; switching to Workspaces reads once with its window (6).
//   MSP-21…23 autobyteus-434  Live run streams after the path to the node drops (45 s), after the phone was in the
//                  background, and a user message loaded during its own turn: `mobile-live-reconnect-cases.mjs` (its
//                  own node gamma, a TCP proxy as the phone's network path, and its own phones); they run after the cases above.
//   MSP-24…27 autobyteus-446  A closed Task's delegated runs leave every run list, not only the window whose open run is
//                  their host; a reopened Task's come back: `mobile-closed-task-rows-cases.mjs` (MSP-24…26 on its own node
//                  delta and phones; MSP-27 a desktop window on alpha, last).
//   MSP-28…31 autobyteus-450  Files attached to a conversation open in the phone's viewer with its key (drafts, sent, a
//                  workspace path, another node's path), and a file opened again shows its current content (phone and a
//                  desktop window): `mobile-file-open-cases.mjs` (MSP-28…30 on its own nodes epsilon and zeta; MSP-31 on
//                  alpha's desktop window, last).
//
//   MSP-32 autobyteus-9  The new-run model sheet on the production phone bundle (REQ-010, REQ-011, QR-001, QR-002; AC-010, AC-011): opening
//                  the sheet re-reads the runtime's model list once, the list is shown, and "Refresh models" (a touch-sized control)
//                  re-reads it again without emptying the list and without an error. A change of the list itself (a CLI update)
//                  is the desktop probe `model-list-journeys-probe.mjs`; this scripted Antigravity list does not change.
//
// Prerequisites: `pnpm -C autobyteus-server-ts build` and `pnpm -C autobyteus-web build:mobile-web` (alpha serves
// `autobyteus-web/dist/public` at /mobile); Chrome. Run: `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<fresh>`
// (`--cases=MSP-01,…`, `--browser-executable=<path>`). About 19 minutes (MSP-21…23 about 5, MSP-24…27 about 4, MSP-28…31 about 4).
// `--hold` sets the stack up, pairs nothing, prints the phone URLs and a pairing link for the Android emulator
// (`http://10.0.2.2:<alpha port>`) and, with `--bind=0.0.0.0`, for this machine's LAN address, and keeps the stack until
// Ctrl+C (device checks); it runs no case.
import { createWriteStream, existsSync, mkdtempSync, readFileSync, realpathSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { attachToBrowserContext, ownerHeaders, ownerSocketUrl, pairNodes, probeNodeEnvironment, redactCredentials } from './fixtures/probe-node-access.mjs';
import { runLiveReconnectCases } from './mobile-live-reconnect-cases.mjs';
import { runClosedTaskRowsCases } from './mobile-closed-task-rows-cases.mjs';
import { runFileOpenCases } from './mobile-file-open-cases.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
/** `ws` lets the phone's upstream socket carry the phone's own Host (the built-in WebSocket cannot set Host). */
const PhoneUpstreamWebSocket = require('ws');
const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const serverDir = path.join(path.dirname(webDir), 'autobyteus-server-ts');
const appEntry = path.join(serverDir, 'dist', 'app.js');
const mobileBundle = path.join(webDir, 'dist', 'public', 'index.html');
const agyCli = path.join(serverDir, 'tests', 'fixtures', 'agy-failure-cli.mjs');
const grokCli = path.join(serverDir, 'tests', 'fixtures', 'grok-acp', 'fake-grok-cli.mjs');
const grokPermission = path.join(serverDir, 'tests', 'fixtures', 'grok-acp', 'permission.jsonl');
const arg = (name, fallback) => {
  const value = process.argv.find(item => item.startsWith(`--${name}=`));
  if (value) return value.slice(name.length + 3);
  return process.argv.includes(`--${name}`) ? true : fallback;
};
const outputDir = path.resolve(webDir, arg('output-dir', 'test-results/mobile-shell'));
const executablePath = arg('browser-executable', process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH)
  || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync);
const selected = typeof arg('cases') === 'string' ? new Set(arg('cases').split(',')) : null;
/**
 * Case IDs are unique across this probe and the `*-cases.mjs` modules it imports: the probe keys each result by its
 * ID, so a second case with the same ID would overwrite the first and hide its result (autobyteus-434 DR-001). Checked
 * before any stack starts.
 */
{
  const probeFile = fileURLToPath(import.meta.url);
  const sources = [probeFile, ...[...readFileSync(probeFile, 'utf8').matchAll(/from '\.\/([\w-]+-cases\.mjs)'/g)].map(m => path.join(path.dirname(probeFile), m[1]))];
  const seen = new Map();
  for (const file of sources) {
    for (const [, id] of readFileSync(file, 'utf8').matchAll(/runCase\('([A-Z]+-\d+)'/g)) seen.set(id, [...(seen.get(id) ?? []), path.basename(file)]);
  }
  const duplicates = [...seen].filter(([, files]) => files.length > 1);
  if (duplicates.length) {
    console.error(`mobile-shell probe: duplicate case IDs ${duplicates.map(([id, files]) => `${id} (${files.join(', ')})`).join('; ')}`);
    process.exit(1);
  }
}
const hold = arg('hold', false) === true;
const bindHost = typeof arg('bind') === 'string' ? arg('bind') : '127.0.0.1';
const MODEL = 'gemini-3.8-flash-low';
const PEER = 'beta-node';
/** The name the desktop gives alpha in its pairing codes (one-step-phone-pairing DEC-016); the node's status has none. */
const ALPHA_NAME = 'Alpha Test Node';
const PHONE_HOST = '192.168.77.10';
const redact = text => redactCredentials(text).replace(/mra_[A-Za-z0-9_-]+/g, 'mra_…').replace(/pairing=[^&\s"']+/g, 'pairing=…');
const evidence = { startedAt: new Date().toISOString(), result: 'Fail', node: process.version, servers: {}, runs: {}, cases: {}, browserErrors: [], failedRequests: [], network: {}, cleanup: {}, error: null };
const assert = (condition, message, details) => { if (!condition) throw Object.assign(new Error(message), { details }); };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const waitFor = async (description, fn, timeoutMs = 60_000) => {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try { if (await fn()) return; } catch (error) { lastError = error; }
    await sleep(150);
  }
  throw new Error(`Timed out waiting for ${description}${lastError ? `: ${lastError.message}` : ''}`);
};
const freePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close(() => resolve(port)); });
});
const exited = child => child.exitCode !== null || child.signalCode !== null;
const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'mobile-shell-probe-')));
const children = new Set();
const saveEvidence = () => fs.writeFile(path.join(outputDir, 'mobile-shell-probe.json'), `${redact(JSON.stringify(evidence, null, 2))}\n`);

// The probe's frontend origin, chosen before any node starts: every node accepts it (autobyteus-416).
const frontendPort = await freePort();
const frontendUrl = `http://127.0.0.1:${frontendPort}`;

const serverAt = async (name, port, extraEnv = {}) => {
  const dataDir = path.join(root, name, 'data');
  const home = path.join(root, name, 'home');
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(home, { recursive: true });
  const baseUrl = `http://127.0.0.1:${port}`;
  if (!existsSync(path.join(dataDir, '.env'))) await fs.writeFile(path.join(dataDir, '.env'), `AUTOBYTEUS_SERVER_HOST=${baseUrl}\nAPP_ENV=test\nLOG_LEVEL=WARN\n`);
  const node = { name, port, baseUrl, dataDir, child: null, nodeId: '' };
  node.start = async () => {
    const log = createWriteStream(path.join(outputDir, `server-${name}.log`), { flags: 'a' });
    const child = spawn(process.execPath, [appEntry, '--host', bindHost, '--port', String(port), '--data-dir', dataDir], {
      cwd: serverDir, stdio: ['ignore', 'pipe', 'pipe'],
      env: { PATH: process.env.PATH, HOME: home, TMPDIR: process.env.TMPDIR ?? os.tmpdir(), APP_ENV: 'test', LOG_LEVEL: 'WARN',
        AUTOBYTEUS_HTTP_ACCESS_LOG_MODE: name === 'alpha' ? 'all' : 'off', AUTOBYTEUS_SERVER_HOST: baseUrl, AUTOBYTEUS_ALLOWED_ORIGINS: frontendUrl,
        ANTIGRAVITY_CLI_COMMAND: agyCli, AGY_FAKE_CASE: 'linked_skills', ...probeNodeEnvironment(), ...extraEnv } });
    child.stdout.pipe(log); child.stderr.pipe(log);
    child.once('close', () => log.end());
    children.add(child);
    node.child = child;
    await waitFor(`${name} health`, async () => {
      if (exited(child)) throw new Error(`${name} exited ${child.exitCode}`);
      return fetch(`${baseUrl}/rest/health`).then(response => response.ok).catch(() => false);
    }, 120_000);
    const status = await (await fetch(`${baseUrl}/rest/remote-access/status`)).json();
    node.nodeId = status.nodeId;
    evidence.servers[name] = { port, nodeId: node.nodeId, statusFields: Object.keys(status).sort() };
  };
  node.stop = async () => {
    const child = node.child;
    if (!child || exited(child)) return;
    child.kill('SIGTERM');
    await Promise.race([new Promise(resolve => child.once('close', resolve)), sleep(15_000)]);
    if (!exited(child)) child.kill('SIGKILL');
    children.delete(child);
  };
  node.gql = async (query, variables) => {
    const body = await (await fetch(`${baseUrl}/graphql`, { method: 'POST', headers: ownerHeaders({ 'content-type': 'application/json' }), body: JSON.stringify({ query, variables }) })).json();
    if (body.errors?.length) throw new Error(`${name}: ${JSON.stringify(body.errors)}`);
    return body.data;
  };
  node.rest = async (method, route, body) => {
    const response = await fetch(`${baseUrl}/rest${route}`, { method, headers: ownerHeaders(body ? { 'content-type': 'application/json' } : {}), body: body ? JSON.stringify(body) : undefined });
    const text = await response.text();
    let parsed = null; try { parsed = JSON.parse(text); } catch { parsed = text; }
    return { status: response.status, body: parsed };
  };
  await node.start();
  return node;
};

/** Every node of a stored execution tree with an address or a run id (camelCase or snake_case trees). */
const treeNodes = (tree) => {
  const found = [];
  const visit = (value) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== 'object') return;
    const agentRunId = value.agentRunId ?? value.agent_run_id;
    const teamRunId = value.teamRunId ?? value.team_run_id;
    if (agentRunId || teamRunId) found.push({ address: value.address ?? null, agentRunId: agentRunId ?? null, teamRunId: teamRunId ?? null });
    Object.values(value).forEach(visit);
  };
  visit(tree);
  return found;
};
const callTool = (name, args) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const calledResults = text => text.split('CALLED:').slice(1);
const pickId = (text, key) => new RegExp(`${key}\\\\*"\\s*:\\s*\\\\*"([^"\\\\]+)`).exec(text ?? '')?.[1];
/** One WebSocket message to a run's input, as a second client (another window) sends it. */
const sendOver = async (url, payload) => {
  const socket = new WebSocket(ownerSocketUrl(url));
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  await sleep(400);
  socket.send(JSON.stringify({ type: 'SEND_MESSAGE', payload }));
  await sleep(800);
  socket.close();
};

let frontend, browser, alpha, beta;
const stack = {};
await fs.mkdir(outputDir, { recursive: true });

/** Builds the stack's data through the public APIs; returns the ids the cases use. */
const setUp = async () => {
  const agy = { runtimeKind: 'antigravity_cli', llmModelIdentifier: MODEL, llmConfig: null };
  const def = async (node, name, options = {}) => (await node.gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}',
    { i: { name, role: 'assistant', description: `${name} (phone probe)`, instructions: 'Follow the request.', toolNames: options.tools ?? [],
      ...(options.launch ? { defaultLaunchConfig: options.launch } : {}) } })).createAgentDefinition.id;
  const team = async (node, name, coordinatorMemberName, nodes, launch) => (await node.gql('mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id}}',
    { i: { name, description: `${name} (phone probe)`, instructions: 'Work together.', coordinatorMemberName, nodes, ...(launch ? { defaultLaunchConfig: launch } : {}) } })).createAgentTeamDefinition.id;

  for (const node of [alpha, beta]) await node.gql('mutation{setRemoteCollaborationEnabled(enabled:true){enabled}}');
  await pairNodes({ inviter: beta.gql, accepter: alpha.gql, inviterName: PEER, accepterName: 'alpha-node' }); // by invite (autobyteus-437)

  // Beta: what the PTM delegates to on another node.
  const publisher = await def(beta, 'Publisher', { launch: agy });
  const checker = await def(beta, 'Checker');
  await team(beta, 'Studio Team', 'lead', [{ memberName: 'lead', ref: publisher, refScope: 'SHARED' }, { memberName: 'checker', ref: checker, refScope: 'SHARED' }], agy);

  // Alpha.
  const ids = {};
  ids.ptm = await def(alpha, 'Project Task Manager', { tools: ['list_projects', 'list_project_tasks', 'create_task', 'update_task'], launch: agy });
  ids.writer = await def(alpha, 'Release Notes Writer', { launch: agy });
  ids.checker = await def(alpha, 'Fact Checker');
  ids.helper = await def(alpha, 'Changelog Helper', { launch: agy });
  ids.approver = await def(alpha, 'Approver', { launch: { runtimeKind: 'grok_build', llmModelIdentifier: 'grok-4.7', llmConfig: { reasoning_effort: 'low' } } });
  ids.squad = await team(alpha, 'Docs Review Team', 'reviewer', [{ memberName: 'reviewer', ref: ids.writer, refScope: 'SHARED' }, { memberName: 'editor', ref: ids.checker, refScope: 'SHARED' }]);
  ids.delivery = await team(alpha, 'Delivery Team', 'lead', [{ memberName: 'lead', ref: ids.checker, refScope: 'SHARED' }, { memberName: 'mate', ref: ids.writer, refScope: 'SHARED' }]);
  ids.org = (await alpha.gql('mutation($i:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$i){id}}', { i: { name: 'Delivery Org', description: 'Org (phone probe)',
    instructions: 'Deliver.', handoffs: [], members: [{ memberName: 'planner', ref: ids.writer, refType: 'AGENT', refScope: 'SHARED' },
      { memberName: 'squad', ref: ids.squad, refType: 'AGENT_TEAM', refScope: 'SHARED' }] } })).createAgentOrgDefinition.id;

  ids.reviewOrg = (await alpha.gql('mutation($i:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$i){id}}', { i: { name: 'Review Org', description: 'Org whose first member is a Team (phone probe)',
    instructions: 'Review.', handoffs: [], members: [{ memberName: 'squad', ref: ids.squad, refType: 'AGENT_TEAM', refScope: 'SHARED' },
      { memberName: 'planner', ref: ids.writer, refType: 'AGENT', refScope: 'SHARED' }] } })).createAgentOrgDefinition.id;

  // The workspace the runs work in, with files for the Files screen.
  const workspace = path.join(root, 'alpha', 'workspace');
  await fs.mkdir(path.join(workspace, 'docs'), { recursive: true });
  await fs.mkdir(path.join(workspace, 'src'), { recursive: true });
  await fs.writeFile(path.join(workspace, 'README.md'), '# Launch\n\nThe launch workspace of the phone probe.\n');
  await fs.writeFile(path.join(workspace, 'docs', 'guide.md'), '# Guide\n\nGUIDE-TEXT-7731: how the launch goes.\n');
  await fs.writeFile(path.join(workspace, 'src', 'app.ts'), 'export const launch = () => "go";\n');
  await alpha.gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: workspace } }).catch(() => undefined);
  const runConfig = { workspaceRootPath: workspace, autoExecuteTools: true, ...agy };
  const wsUrl = route => `${alpha.baseUrl.replace('http', 'ws')}/ws/${route}`;

  const createAgentRun = async (agentDefinitionId, extra = {}) => {
    const r = (await alpha.gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId, ...runConfig, ...extra } })).createAgentRun;
    assert(r.success, r.message);
    return r.runId;
  };
  const projection = async runId => JSON.stringify((await alpha.gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: runId })).getRunProjection?.conversation ?? []);
  const agentSay = async (runId, content) => sendOver(wsUrl(`agent/${runId}`), { message_id: randomUUID(), dedupe_key: `agent_run_input:probe:${randomUUID()}`,
    context_file_paths: [], image_urls: [], agent_run_id: runId, content });
  const agentCall = async (runId, name, args) => {
    const before = calledResults(await projection(runId)).length;
    await agentSay(runId, callTool(name, args));
    let results = [];
    await waitFor(`${name} by ${runId}`, async () => (results = calledResults(await projection(runId))).length > before);
    return results[results.length - 1];
  };

  // Plain runs first (oldest activity): three Fact Checker runs.
  const plain = [];
  for (let index = 0; index < 3; index += 1) {
    const runId = await createAgentRun(ids.checker, agy);
    await agentSay(runId, `Plain run ${index + 1}. Marker PLAIN-${index + 1}.`);
    plain.push(runId);
    await sleep(600);
  }

  // The Org run and the Team run.
  const org = (await alpha.gql('mutation($i:CreateAgentOrgRunInput!){createAgentOrgRun(input:$i){success message agentOrgRunId}}',
    { i: { agentOrgDefinitionId: ids.org, rootConfiguration: runConfig, agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
  assert(org.success, org.message);
  const orgTree = (await alpha.gql('query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}', { id: org.agentOrgRunId })).getAgentOrgRunConfig.executionTree;
  const orgPlanner = orgTree.rootOrg.members.find(member => member.address === '/planner')?.agentRunId;
  const reviewOrg = (await alpha.gql('mutation($i:CreateAgentOrgRunInput!){createAgentOrgRun(input:$i){success message agentOrgRunId}}',
    { i: { agentOrgDefinitionId: ids.reviewOrg, rootConfiguration: runConfig, agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
  assert(reviewOrg.success, reviewOrg.message);
  const reviewOrgNodes = treeNodes((await alpha.gql('query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}', { id: reviewOrg.agentOrgRunId })).getAgentOrgRunConfig.executionTree);
  const reviewOrgCoordinator = reviewOrgNodes.find(node => node.address?.endsWith('/reviewer') && node.agentRunId) ?? null;
  assert(reviewOrgCoordinator, 'the Review Org squad\'s coordinator', reviewOrgNodes);
  await sendOver(wsUrl(`agent-org/${org.agentOrgRunId}`), { root_subject_kind: 'agent_org', root_run_id: org.agentOrgRunId, target_agent_run_id: orgPlanner,
    command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(), content: 'Plan the delivery. Marker ORG-PLANNER.', context_file_paths: [], image_urls: [] });
  await sleep(600);

  const delivery = (await alpha.gql('mutation($i:CreateAgentTeamRunInput!){createAgentTeamRun(input:$i){success message teamRunId}}', { i: { teamDefinitionId: ids.delivery,
    teamConfigs: [{ teamAddress: '/', ...runConfig }], memberConfigs: [{ memberAddress: '/lead', agentDefinitionId: ids.checker, ...runConfig },
      { memberAddress: '/mate', agentDefinitionId: ids.writer, ...runConfig }] } })).createAgentTeamRun;
  assert(delivery.success, delivery.message);
  const deliveryTree = JSON.stringify((await alpha.gql('query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}', { id: delivery.teamRunId })).getTeamRunResumeConfig.executionTree);
  const deliveryLead = /"address":"\/lead"[^}]*"agent_run_id":"([^"]+)"/.exec(deliveryTree)?.[1];
  const deliveryMate = /"address":"\/mate"[^}]*"agent_run_id":"([^"]+)"/.exec(deliveryTree)?.[1];
  const leadProjection = async () => JSON.stringify((await alpha.gql('query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}',
    { id: delivery.teamRunId, a: deliveryLead })).getTeamMemberRunProjection?.conversation ?? []);
  const leadSay = content => sendOver(wsUrl(`agent-team/${delivery.teamRunId}`), { message_id: randomUUID(), dedupe_key: `team_member_input:probe:${randomUUID()}`,
    context_file_paths: [], image_urls: [], agent_run_id: deliveryLead, content });
  const notesPath = path.join(workspace, 'notes.md');
  await leadSay(`GENERATE_IMAGE:${notesPath} \nProduce the file.`);
  await waitFor('the lead wrote notes.md', async () => existsSync(notesPath), 60_000);
  await fs.writeFile(notesPath, '# Notes\n\nNOTES-TEXT-4242 from the Delivery Team lead.\n');
  const leadCall = async (name, args) => {
    const before = calledResults(await leadProjection()).length;
    await leadSay(callTool(name, args));
    let results = [];
    await waitFor(`the lead's ${name}`, async () => (results = calledResults(await leadProjection())).length > before);
    return results[results.length - 1];
  };
  await leadCall('send_message_to', { recipient_address: '/mate', content: 'Read the guide first. Marker TEAM-NOTE.', reference_files: [path.join(workspace, 'docs', 'guide.md')] });
  // A member's own delegated work (under the member in the Team's tree).
  const leadResult = await leadCall('delegate_task', { recipient_address: '/changelog_helper', description: 'Draft the changelog. Marker LEAD-DELEGATED.' });
  const leadDelegated = pickId(leadResult, 'target_agent_run_id');
  assert(leadDelegated, 'the lead delegated', leadResult);
  await sleep(600);

  // The Grok run (approvals are asked: autoExecuteTools false); its message comes from the phone (MSP-04).
  const approver = await createAgentRun(ids.approver, { runtimeKind: 'grok_build', llmModelIdentifier: 'grok-4.7', llmConfig: { reasoning_effort: 'low' }, autoExecuteTools: false });
  await sleep(600);

  // The PTM run with its Tasks and remote work (newest activity).
  const project = (await alpha.gql('mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}', { input: { name: `Launch ${randomUUID().slice(0, 6)}` } })).createProject.projectId;
  const task = async (title, description) => (await alpha.gql('mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId taskKey}}',
    { input: { projectId: project, title, description } })).createProjectTask;
  const taskA = await task('Write the release notes.', 'Write the release notes. Marker TASK-A.');
  const taskB = await task('Review the docs site.', callTool('delegate_task', { recipient_address: '/fact_checker', description: 'Check the facts of the docs. Marker MEMBER-DELEGATED.' }));
  const ptm = await createAgentRun(ids.ptm);
  const writerResult = await agentCall(ptm, 'delegate_task', { recipient_address: '/release_notes_writer', task_id: taskA.taskId });
  const writerRun = pickId(writerResult, 'target_agent_run_id');
  const squadResult = await agentCall(ptm, 'delegate_task', { recipient_address: '/docs_review_team', task_id: taskB.taskId });
  const squadRun = pickId(squadResult, 'target_team_run_id');
  const remoteAgentTitle = 'Publish the draft. Marker REMOTE-AGENT.';
  const remoteAgentRun = pickId(await agentCall(ptm, 'delegate_task', { node: PEER, recipient_address: '/publisher', description: remoteAgentTitle }), 'target_agent_run_id');
  const remoteTeamTitle = 'Cut the launch trailer. Marker REMOTE-TEAM.';
  const remoteTeamRun = pickId(await agentCall(ptm, 'delegate_task', { node: PEER, recipient_address: '/studio_team', description: remoteTeamTitle }), 'target_team_run_id');
  assert(writerRun && squadRun && remoteAgentRun && remoteTeamRun, 'the PTM delegations', { writerResult, squadResult });
  const spareRun = pickId(await agentCall(ptm, 'delegate_task', { recipient_address: '/changelog_helper', description: 'Spare work. Marker SPARE.' }), 'target_agent_run_id');
  // The task team's members and the coordinator's own delegated work (from Task B's text), in the PTM's stored tree.
  let reviewer = null;
  let memberDelegated = null;
  await waitFor('the reviewer\'s delegation', async () => {
    const nodes = treeNodes((await alpha.gql('query($id:String!){agentRunCollaboration(runId:$id)}', { id: ptm })).agentRunCollaboration);
    reviewer = nodes.find(node => node.address?.endsWith('/reviewer') && node.agentRunId)?.agentRunId ?? null;
    memberDelegated = nodes.find(node => node.address === '/fact_checker' && node.agentRunId)?.agentRunId ?? null;
    stack.ptmTreeNodes = nodes;
    return Boolean(reviewer && memberDelegated);
  }, 60_000).catch(() => undefined);

  Object.assign(stack, { ids, workspace, runConfig, project, taskA, taskB, ptm, writerRun, squadRun, reviewer, memberDelegated, remoteAgentRun, remoteTeamRun,
    spareRun, remoteAgentTitle, remoteTeamTitle, plain, org: org.agentOrgRunId, orgPlanner, reviewOrg: reviewOrg.agentOrgRunId, reviewOrgCoordinator, delivery: delivery.teamRunId, deliveryLead, deliveryMate, leadDelegated, approver,
    notesPath, projection, agentSay, agentCall, leadProjection, wsUrl });
  evidence.runs = { ptm, writerRun, squadRun, reviewer, memberDelegated, remoteAgentRun, remoteTeamRun, plain, org: org.agentOrgRunId, orgPlanner,
    reviewOrg: reviewOrg.agentOrgRunId, reviewOrgCoordinator,
    delivery: delivery.teamRunId, deliveryLead, deliveryMate, leadDelegated, approver, taskA: taskA.taskKey, taskB: taskB.taskKey };
};

/** A pairing link for a phone that reaches alpha at `serverBaseUrl`. */
const pairingFor = async (serverBaseUrl) => {
  const settings = await alpha.rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true });
  assert(settings.status === 200, 'Phone Access on', settings);
  const session = await alpha.rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'local_network', serverBaseUrl, serverName: ALPHA_NAME, trustedPrivateHttpAcknowledged: true });
  assert(session.status === 201 && session.body.mobileUrl, 'pairing session', session.status);
  return session.body.mobileUrl;
};

// ---- The phone ----------------------------------------------------------------------------------------------------
const phoneOrigin = () => `http://${PHONE_HOST}:${alpha.port}`;
/** Every GraphQL operation a phone sent: when, which context, the history window, the status and the bytes. */
const phoneNet = [];
/** Every WebSocket a phone opened to its node: which context, the URL, when it opened and closed. */
const phoneSockets = [];
/**
 * Browser lines a case produces on purpose; any other browser error fails the probe. There is no app-wide exemption:
 * the phone opens the definitions feed only while paired, to its node (autobyteus-426 D-01), so nothing retries
 * `localhost:8000` any more.
 */
const EXPECTED_BY_CASE = {
  // The three refused folder paths (autobyteus-426 D-08): the workspace store logs each refused registration.
  'MSP-07': /Error creating workspace metadata: ApolloError: (No folder exists at the workspace path|The workspace path is a file, not a folder|Workspace path must be an absolute path)\./,
  // autobyteus-436 AC-004: the missing node file (404 NODE_FILE_NOT_FOUND) and the folder (400 NODE_FILE_IS_FOLDER).
  'MSP-16': /Failed to load resource: the server responded with a status of 40[04] \((Not Found|Bad Request)\)/,
  // The paired node stopped on purpose: the phone's requests are refused while it is down.
  'MSP-09': /Failed to load resource: net::ERR_CONNECTION_REFUSED/,
  // The phone's credential refused on purpose (401 unknown, 403 revoked).
  'MSP-13': /status of 40[13]|Response not successful: Received status code 40[13]/,
  // Phone Access off (403 PHONE_ACCESS_DISABLED), then the node stopped.
  'MSP-18': /status of 403|Response not successful: Received status code 403|Failed to load resource: net::ERR_CONNECTION_REFUSED|Error: Bound backend is not ready/,
};
const recordBrowserError = (label, text) => {
  const line = redact(`${label}: ${text}`);
  evidence.browserErrors.push({ case: currentCase, line, known: Boolean(EXPECTED_BY_CASE[currentCase]?.test(line)) });
};
let currentCase = 'setup';
/**
 * A phone browser: 390×844 by default; alpha is reached through the private-network origin, HTTP and WebSocket.
 * The emulated network keeps what a real LAN path keeps: the phone's Host (`192.168.77.10:<port>`) on every request, and
 * on the WebSocket leg also the phone's Origin. Alpha's request gate compares Origin with Host (autobyteus-403), so a
 * rewrite that dropped the Host would be refused like a Host-rewriting proxy.
 */
const openPhone = async ({ width = 390, height = 844, storageState, label = 'phone' } = {}) => {
  const context = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'en-US', timezoneId: 'UTC',
    ...(storageState ? { storageState } : {}) });
  const phoneHost = new URL(phoneOrigin()).host;
  await context.route(`${phoneOrigin()}/**`, async (route) => {
    const request = route.request();
    let op = null; let windowVar; let runIds = null;
    if (request.url().includes('/graphql') && request.method() === 'POST') {
      try { const body = JSON.parse(request.postData() ?? '{}'); op = body.operationName ?? /^\s*(?:query|mutation)\s+(\w+)/.exec(body.query ?? '')?.[1] ?? 'anonymous'; windowVar = body.variables?.limitPerAgent; runIds = body.variables?.runIds ?? null; } catch { op = 'unparsed'; }
    }
    let response;
    try { response = await route.fetch({ url: request.url().replace(phoneOrigin(), alpha.baseUrl), headers: { ...request.headers(), host: phoneHost }, timeout: 20_000 }); } catch (error) {
      // A request still in flight when the probe closes this phone's context (MSP-12's timing phone closes at its first
      // row) ends with the context: answering it as refused would log a browser error that no node caused.
      if (/has been closed/.test(String(error?.message))) return;
      await route.abort('connectionrefused').catch(() => undefined); return;
    }
    if (op) phoneNet.push({ at: Date.now(), label, case: currentCase, op, window: windowVar === undefined ? 'omitted' : windowVar, runIds, status: response.status(), bytes: (await response.body().catch(() => Buffer.alloc(0))).length });
    await route.fulfill({ response }).catch(() => undefined);
  });
  const wsOrigin = phoneOrigin().replace(/^http/, 'ws');
  await context.routeWebSocket(url => url.href.startsWith(wsOrigin), (ws) => {
    const socket = { label, case: currentCase, url: ws.url(), at: Date.now(), closedAt: null };
    phoneSockets.push(socket);
    const closed = () => { socket.closedAt ??= Date.now(); };
    const upstream = new PhoneUpstreamWebSocket(ws.url().replace(wsOrigin, alpha.baseUrl.replace(/^http/, 'ws')), { headers: { origin: phoneOrigin(), host: phoneHost } });
    const queued = [];
    upstream.on('open', () => { for (const message of queued.splice(0)) upstream.send(message); });
    upstream.on('message', (data, isBinary) => { try { ws.send(isBinary ? data : String(data)); } catch { /* closed */ } });
    upstream.on('close', () => { closed(); try { ws.close(); } catch { /* closed */ } });
    upstream.on('error', () => { closed(); try { ws.close(); } catch { /* closed */ } });
    ws.onMessage(message => { if (upstream.readyState === 1) upstream.send(message); else queued.push(message); });
    ws.onClose(() => { closed(); upstream.close(); });
  });
  const page = await context.newPage();
  // The URL behind a "Failed to load resource" console line (the console line names none).
  page.on('requestfailed', request => evidence.failedRequests.push({ case: currentCase, label, url: redact(request.url()), error: request.failure()?.errorText ?? null }));
  page.on('pageerror', error => recordBrowserError(`${label} pageerror`, error.message));
  page.on('console', message => { if (message.type() === 'error') recordBrowserError(`${label} console`, message.text()); });
  return { context, page };
};
const sel = id => `[data-testid="${id}"]`;
const rowSel = key => `[data-testid="mobile-run-row-${key}"]`;
const rowsOf = page => page.evaluate(() => [...document.querySelectorAll('[data-test="mobile-run-row"]')].map(li => ({
  key: li.getAttribute('data-testid').replace('mobile-run-row-', ''), depth: Number(li.getAttribute('data-depth')), expanded: li.getAttribute('aria-expanded'),
  current: li.getAttribute('aria-current'), status: li.querySelector('[data-testid="mobile-run-status-dot"]')?.getAttribute('data-status') ?? null,
  name: li.querySelector('[data-testid="mobile-run-name"]')?.textContent?.trim() ?? '', title: li.querySelector('[data-testid="mobile-run-title"]')?.textContent?.trim() ?? null,
  chip: li.querySelector('[data-testid="mobile-run-remote-line"]')?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
  unreachable: Boolean(li.querySelector('[data-testid="mobile-run-unreachable"]')), age: li.querySelector('[data-testid="mobile-run-age"]')?.textContent?.trim() ?? null,
  buttons: [...li.querySelectorAll('button')].map(b => b.getAttribute('data-testid') || b.getAttribute('aria-label') || b.textContent.trim()),
  label: li.querySelector('[data-testid="mobile-run-open"]')?.getAttribute('aria-label') ?? null })));
const topIds = rows => rows.filter(row => row.depth === 0).map(row => row.key.split(':').slice(1).join(':'));
/** The row right after `parentKey` (in list order) with this depth and name, within the parent's subtree. */
const childRow = (rows, parentKey, name, depth) => {
  const start = rows.findIndex(row => row.key === parentKey);
  if (start < 0) return null;
  for (let index = start + 1; index < rows.length && rows[index].depth > rows[start].depth; index += 1) {
    if (rows[index].depth === depth && rows[index].name.toLowerCase() === name.toLowerCase()) return rows[index];
  }
  return null;
};
const pairPhone = async (page) => {
  const link = await pairingFor(phoneOrigin());
  await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.locator(sel('mobile-pair-button')).click({ timeout: 60_000 });
  await page.locator(sel('mobile-run-tree')).waitFor({ timeout: 60_000 });
};
const toList = async (page) => {
  for (let step = 0; step < 6 && !(await page.locator(`${sel('mobile-run-list')}:visible`).count()); step += 1) {
    const back = page.locator(`${sel('mobile-screen-back')}:visible, ${sel('mobile-run-back')}:visible, ${sel('mobile-new-run-close')}:visible`).first();
    if (await back.count()) await back.click(); else await page.goBack();
    await sleep(400);
  }
  await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor({ timeout: 20_000 });
};
const runScreen = page => page.evaluate(() => {
  const screen = document.querySelector('[data-testid="mobile-run-screen"]');
  return screen ? { state: screen.getAttribute('data-state'), name: screen.querySelector('[data-testid="mobile-run-name"]')?.textContent?.trim() ?? null,
    subtitle: screen.querySelector('[data-testid="mobile-run-subtitle"]')?.textContent?.trim() ?? null,
    chip: screen.querySelector('[data-test="remote-node-chip"]')?.textContent?.trim() ?? null,
    conversation: screen.querySelector('[data-testid="mobile-run-conversation"]')?.innerText ?? null, query: location.search } : { state: null, query: location.search };
});
const openRow = async (page, key) => {
  await page.locator(`${rowSel(key)} ${sel('mobile-run-open')}`).click();
  await waitFor(`the run screen of ${key}`, async () => (await runScreen(page)).state === 'open', 30_000);
  await sleep(500);
  return runScreen(page);
};
const ensureUnfolded = async (page, key) => {
  const row = page.locator(rowSel(key));
  if ((await row.getAttribute('aria-expanded')) === 'false') await row.locator(sel('mobile-run-toggle')).click();
  await waitFor(`${key} unfolded`, async () => (await row.getAttribute('aria-expanded')) === 'true', 10_000);
};
const showOlder = async (page) => {
  const fold = page.locator(sel('mobile-run-list-show-older'));
  if ((await fold.count()) && (await fold.innerText()).startsWith('Show older')) await fold.click();
};
const composerSend = async (page, text) => {
  const box = page.locator(`${sel('mobile-run-conversation')} textarea`).last();
  const send = page.locator(`${sel('mobile-run-conversation')} button[aria-label="Send message"]`).last();
  await waitFor('Send enabled', async () => {
    if (!(await box.inputValue().catch(() => ''))) await box.fill(text).catch(() => undefined);
    return (await send.count()) > 0 && await send.isEnabled();
  }, 20_000);
  await send.click();
};
const menuOpen = async (page, view) => {
  await page.locator(sel('mobile-run-menu-button')).click();
  await page.locator(sel('mobile-run-menu')).waitFor({ timeout: 10_000 });
  if (view) await page.locator(sel(`mobile-run-menu-${view}`)).click();
};
/** Where a run's conversation is stored on its node: the first projection that has the marker. */
const storedHas = async (node, ids, marker) => {
  const reads = [];
  if (ids.runId) reads.push(['query($id:String!){getRunProjection(runId:$id){conversation}}', { id: ids.runId }, data => data.getRunProjection?.conversation]);
  if (ids.teamRunId && ids.agentRunId) reads.push(['query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}', { id: ids.teamRunId, a: ids.agentRunId }, data => data.getTeamMemberRunProjection?.conversation]);
  if (ids.hostRunId) reads.push(['query($h:String!,$m:String!,$a:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$m,agentRunId:$a){conversation}}', { h: ids.hostRunId, m: ids.memberAddress, a: ids.agentRunId }, data => data.agentRunCollaborationMemberProjection?.conversation]);
  if (ids.orgRunId) reads.push(['query($id:String!,$a:String!,$m:String!){getAgentOrgMemberRunProjection(orgRunId:$id,memberAddress:$m,agentRunId:$a){conversation}}', { id: ids.orgRunId, a: ids.agentRunId, m: ids.memberAddress }, data => data.getAgentOrgMemberRunProjection?.conversation]);
  for (const [query, variables, pick] of reads) {
    const text = JSON.stringify(pick(await node.gql(query, variables).catch(() => ({}))) ?? '');
    if (text.includes(marker)) return true;
  }
  return false;
};
/** Visible controls under 44×44 CSS px and the document's horizontal overflow. */
const measureLayout = page => page.evaluate(() => {
  const visible = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && el.offsetParent !== null; };
  const controls = [...document.querySelectorAll('button, a[href], input:not([type="hidden"]), textarea, select, [role="button"], [role="menuitem"], [role="switch"], [role="option"], summary')].filter(visible);
  const small = controls.map(el => ({ el, r: el.getBoundingClientRect() })).filter(({ r }) => r.width < 43.5 || r.height < 43.5).map(({ el, r }) => ({
    label: (el.getAttribute('aria-label') || el.getAttribute('data-testid') || el.textContent || el.tagName).replace(/\s+/g, ' ').trim().slice(0, 40),
    size: `${Math.round(r.width)}×${Math.round(r.height)}`, shared: Boolean(el.closest('[data-testid="mobile-run-conversation"], [data-testid="mobile-file-preview-content"], [data-testid="mobile-artifacts-viewer"], [data-testid="mobile-team-reference-viewer"] .prose')) }));
  const de = document.documentElement;
  return { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, bodyScrollWidth: document.body.scrollWidth, horizontalScroll: de.scrollWidth > de.clientWidth, controls: controls.length, small };
});

const runCase = async (id, fn) => {
  if (selected && !selected.has(id)) return;
  if (evidence.cases[id]) {
    // A second case with an ID already used (the start check reads only literal IDs).
    evidence.cases[`${id} (duplicate)`] = { result: 'Fail', error: `case ID ${id} is used twice` };
    return;
  }
  currentCase = id;
  const started = Date.now();
  console.log(`[mobile-shell] ${id} …`);
  try {
    const details = await fn();
    evidence.cases[id] = { result: 'Pass', seconds: Math.round((Date.now() - started) / 100) / 10, ...details };
  } catch (error) {
    evidence.cases[id] = { result: 'Fail', seconds: Math.round((Date.now() - started) / 100) / 10, error: error.message, details: error.details ?? null };
  }
  console.log(`[mobile-shell] ${id} ${evidence.cases[id].result}${evidence.cases[id].error ? `: ${evidence.cases[id].error}` : ''}`);
  await saveEvidence();
};

const desktopRunsView = async (desktop) => {
  await desktop.locator('[data-test="run-section-view-menu"]').waitFor({ timeout: 120_000 });
  if ((await desktop.locator('[data-test="run-section-title"]').innerText()).trim() !== 'Runs') {
    await desktop.locator('[data-test="run-section-view-menu"]').click();
    await desktop.locator('[data-test="run-section-view-runs"]').click();
  }
  await desktop.locator('[data-test="run-list-row"]').first().waitFor({ timeout: 60_000 });
};
const shot = (page, name) => page.screenshot({ path: path.join(outputDir, `${name}.png`) }).catch(() => undefined);
const historyReads = (filter = () => true) => phoneNet.filter(entry => entry.op === 'ListWorkspaceRunHistory' && filter(entry));

const runCases = async () => {
  // The desktop window (MSP-01's comparison) against the same node.
  const frontendLog = createWriteStream(path.join(outputDir, 'frontend.log'));
  frontend = spawn('corepack', ['pnpm', 'dev', '--host', '127.0.0.1', '--port', String(frontendPort)], { cwd: webDir, detached: true,
    stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NODE_ENV: 'development', BACKEND_NODE_BASE_URL: alpha.baseUrl } });
  frontend.stdout.pipe(frontendLog); frontend.stderr.pipe(frontendLog);
  await waitFor('frontend', async () => {
    if (exited(frontend)) throw new Error(`frontend exited ${frontend.exitCode}`);
    return fetch(frontendUrl).then(response => response.ok).catch(() => false);
  }, 240_000);
  stack.frontendUrl = frontendUrl;
  browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

  // The phone, paired through Phone Access.
  const phone = await openPhone({ label: 'phone' });
  const page = phone.page;
  await pairPhone(page);
  const paired = await phone.context.storageState();
  await sleep(2_000);

  await runCase('MSP-01', async () => {
    const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US', timezoneId: 'UTC' });
    await attachToBrowserContext(desktopContext);
    await desktopContext.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
    const desktop = await desktopContext.newPage();
    // A cold `nuxt dev` re-optimizes and reloads (TESTING.md § Browser probes): warm it up first.
    await desktop.goto(frontendUrl, { waitUntil: 'networkidle', timeout: 240_000 }).catch(() => undefined);
    await sleep(3_000);
    await desktop.goto(frontendUrl, { waitUntil: 'domcontentloaded', timeout: 240_000 });
    await desktopRunsView(desktop);
    const desktopFold = await desktop.locator('[data-test="run-list-show-older"]').innerText().catch(() => null);
    if (desktopFold?.startsWith('Show older')) await desktop.locator('[data-test="run-list-show-older"]').click();
    await sleep(1_000);
    const desktopIds = await desktop.locator('[data-test="run-list-row"]').evaluateAll(rows => rows.map(row => row.getAttribute('data-run-id')));
    await desktop.screenshot({ path: path.join(outputDir, 'MSP-01-desktop-runs-view.png') });
    await desktopContext.close();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator(sel('mobile-run-tree')).waitFor({ timeout: 60_000 });
    await sleep(1_500);
    const before = await rowsOf(page);
    const foldBefore = (await page.locator(sel('mobile-run-list-show-older')).innerText()).trim();
    await shot(page, 'MSP-01-phone-list-newest-5');
    await showOlder(page);
    await sleep(500);
    const all = await rowsOf(page);
    const foldOpen = (await page.locator(sel('mobile-run-list-show-older')).innerText()).trim();
    await page.locator(sel('mobile-run-list-scroll')).evaluate(el => { el.scrollTop = el.scrollHeight; });
    await shot(page, 'MSP-01-phone-list-older-open');
    await page.locator(sel('mobile-run-list-show-older')).click();
    await sleep(500);
    const after = await rowsOf(page);
    const phoneIds = topIds(all);
    assert(topIds(before).length === 5, 'the newest 5 top-level runs', topIds(before));
    assert(foldBefore === `Show older (${phoneIds.length - 5})`, 'Show older (N)', { foldBefore, total: phoneIds.length });
    assert(foldOpen === 'Show fewer' && topIds(after).length === 5, 'Show fewer folds back to 5', { foldOpen, after: topIds(after).length });
    assert(JSON.stringify(phoneIds) === JSON.stringify(desktopIds), 'the same runs and order as the desktop Runs view', { phoneIds, desktopIds });
    assert(phoneIds.length >= 7 && phoneIds.includes(stack.org) && phoneIds.includes(stack.delivery), 'Agent, Team and Org runs listed', phoneIds);
    const ages = all.filter(row => row.depth === 0).map(row => row.age);
    assert(ages.every(age => /^(now|\d+[mhdw])$/.test(age ?? '')), 'every top-level row has its age', ages);
    return { desktopIds, phoneIds, foldBefore, foldOpen, ages, desktopFold };
  });

  await runCase('MSP-15', async () => {
    const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US', timezoneId: 'UTC' });
    await attachToBrowserContext(desktopContext);
    await desktopContext.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
    const desktop = await desktopContext.newPage();
    const reads = [];
    desktop.on('request', (request) => {
      if (!request.url().includes('/graphql') || request.method() !== 'POST') return;
      try { const body = JSON.parse(request.postData() ?? '{}'); if (body.operationName === 'ListWorkspaceRunHistory') reads.push({ at: Date.now(), window: body.variables && 'limitPerAgent' in body.variables ? body.variables.limitPerAgent : 'omitted' }); } catch { /* not JSON */ }
    });
    await desktop.goto(frontendUrl, { waitUntil: 'domcontentloaded', timeout: 240_000 });
    await desktop.locator('[data-test="run-section-view-menu"]').waitFor({ timeout: 120_000 });
    const choose = async (mode) => {
      await desktop.locator('[data-test="run-section-view-menu"]').click();
      await desktop.locator(`[data-test="run-section-view-${mode}"]`).click();
      await waitFor(`the ${mode} view`, async () => (await desktop.locator('[data-test="run-section-title"]').innerText()).trim().toLowerCase() === mode, 20_000);
    };
    await choose('projects');
    await desktop.locator('[data-test="projects-runs-tree"]').waitFor({ timeout: 60_000 });
    await sleep(1_500);
    const projectsFrom = Date.now();
    await sleep(11_000);
    const inProjects = reads.filter(read => read.at >= projectsFrom).map(read => read.window);
    // Runs ↔ Projects three times within about 12 s: only the poll reads.
    const switchFrom = Date.now();
    for (const mode of ['runs', 'projects', 'runs', 'projects']) { await choose(mode); await sleep(3_000); }
    const switchSeconds = (Date.now() - switchFrom) / 1000;
    const whileSwitching = reads.filter(read => read.at >= switchFrom).map(read => read.window);
    // Control: Workspaces changes the window, so it reads at once with 6.
    const workspacesFrom = Date.now();
    await choose('workspaces');
    await sleep(2_000);
    const workspacesReads = reads.filter(read => read.at >= workspacesFrom).map(read => ({ dt: read.at - workspacesFrom, window: read.window }));
    await desktop.screenshot({ path: path.join(outputDir, 'MSP-15-desktop-workspaces.png') });
    await choose('projects');
    await desktop.screenshot({ path: path.join(outputDir, 'MSP-15-desktop-projects.png') });
    await desktopContext.close();
    const maxPolls = Math.ceil(switchSeconds / 5) + 1;
    assert(inProjects.length >= 2 && inProjects.every(window => window === null), 'the Projects view reads every run (null)', inProjects);
    assert(whileSwitching.every(window => window === null) && whileSwitching.length <= maxPolls, 'Runs ↔ Projects reads nothing beyond the poll', { whileSwitching, switchSeconds, maxPolls });
    assert(workspacesReads.some(read => read.window === 6 && read.dt <= 1_500), 'Workspaces reads once with its window', workspacesReads);
    return { inProjects, whileSwitching, switchSeconds, maxPolls, workspacesReads };
  });

  await runCase('MSP-02', async () => {
    await toList(page);
    const ptmKey = `agent:${stack.ptm}`;
    const rows = await rowsOf(page);
    const ptm = rows.find(row => row.key === ptmKey);
    const writer = rows.find(row => row.key === `${ptmKey}/agent:${stack.writerRun}`);
    const squad = rows.find(row => row.key === `${ptmKey}/team:${stack.squadRun}`);
    const remoteAgent = rows.find(row => row.key.startsWith(`${ptmKey}/`) && row.key.endsWith(stack.remoteAgentRun));
    const remoteTeam = rows.find(row => row.key.startsWith(`${ptmKey}/`) && row.key.endsWith(stack.remoteTeamRun));
    assert(ptm?.expanded === 'true', 'the PTM run with delegated work starts unfolded', ptm);
    assert(writer?.depth === 1 && writer.status, 'the task agent under the PTM run', writer);
    assert(squad?.depth === 1 && squad.expanded === 'false', 'the task team under it, folded', squad);
    assert(remoteAgent?.depth === 1 && remoteAgent.chip?.includes(PEER) && remoteTeam?.depth === 1 && remoteTeam.chip?.includes(PEER), 'the remote rows with their node chip', { remoteAgent, remoteTeam });
    await ensureUnfolded(page, squad.key);
    const unfolded = await rowsOf(page);
    const members = ['reviewer', 'editor'].map(name => childRow(unfolded, squad.key, name, 2));
    assert(members.every(Boolean), 'the task team\'s members under it', unfolded.filter(row => row.key.startsWith(squad.key)));
    // A Team run: members folded; its lead's own delegated work under the lead.
    const teamKey = `team:${stack.delivery}`;
    const teamRow = unfolded.find(row => row.key === teamKey);
    assert(teamRow?.expanded === 'false', 'a Team run\'s members start folded', teamRow);
    await ensureUnfolded(page, teamKey);
    let teamRows = await rowsOf(page);
    const lead = childRow(teamRows, teamKey, 'lead', 1);
    const mate = childRow(teamRows, teamKey, 'mate', 1);
    assert(lead && mate, 'the Team\'s members', teamRows.filter(row => row.key.startsWith(teamKey)));
    if (lead.expanded === 'false') { await ensureUnfolded(page, lead.key); teamRows = await rowsOf(page); }
    const leadDelegatedNested = childRow(teamRows, lead.key, 'changelog helper', 2);
    // An Org run starts unfolded with its members.
    const orgRow = teamRows.find(row => row.key === `org:${stack.org}`);
    const orgMembers = teamRows.filter(row => row.key.startsWith(`org:${stack.org}/`));
    assert(orgRow?.expanded === 'true' && orgMembers.length > 0, 'the Org run unfolded with its members', { orgRow, orgMembers });
    await shot(page, 'MSP-02-tree');
    // The desktop Runs view of the same node: where the same rows sit (DEC-001: one list builder).
    const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 1400 }, locale: 'en-US', timezoneId: 'UTC' });
    await attachToBrowserContext(desktopContext);
    await desktopContext.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
    const desktop = await desktopContext.newPage();
    await desktop.goto(stack.frontendUrl, { waitUntil: 'domcontentloaded', timeout: 240_000 });
    await desktopRunsView(desktop);
    if (await desktop.locator('[data-test="run-list-show-older"]').count() && (await desktop.locator('[data-test="run-list-show-older"]').innerText()).startsWith('Show older')) await desktop.locator('[data-test="run-list-show-older"]').click();
    for (let round = 0; round < 6; round += 1) {
      for (const handle of await desktop.locator('[data-test="run-list-scroll"] [aria-expanded="false"]').all()) await handle.click({ timeout: 1_500 }).catch(() => undefined);
      await sleep(700);
    }
    const desktopPlace = await desktop.evaluate((ids) => Object.fromEntries(Object.entries(ids).map(([label, id]) => {
      const row = document.querySelector(`[data-agent-run-id="${id}"]`);
      const name = row?.querySelector('span, p') ?? row;
      return [label, row ? Math.round(name.getBoundingClientRect().left) : null];
    })), { lead: stack.deliveryLead, leadDelegated: stack.leadDelegated, reviewer: stack.reviewer, reviewerDelegated: stack.memberDelegated });
    const desktopTitles = await desktop.evaluate((ids) => Object.fromEntries(Object.entries(ids).map(([label, id]) => {
      const row = document.querySelector(`[data-test="run-list-scroll"] [data-agent-run-id="${id}"]`);
      return [label, row ? row.innerText.split('\n').map(line => line.trim()).filter(Boolean).slice(0, 3) : null];
    })), { writer: stack.writerRun, spare: stack.spareRun, leadDelegated: stack.leadDelegated });
    await desktop.screenshot({ path: path.join(outputDir, 'MSP-02-desktop-tree.png') });
    await desktopContext.close();
    const phonePlace = { lead: lead.depth, leadDelegated: childRow(teamRows, teamKey, 'changelog helper', 1)?.depth ?? leadDelegatedNested?.depth ?? null };
    // Live state: a delegated run stops on the node (a lasting state change); its dot follows with no reload.
    const watchDot = key => page.evaluate((rowKey) => {
      window.__statusSeen = [];
      const watch = () => { const dot = document.querySelector(`[data-testid="mobile-run-row-${rowKey}"] [data-testid="mobile-run-status-dot"]`); const status = dot?.getAttribute('data-status');
        if (status && window.__statusSeen[window.__statusSeen.length - 1] !== status) window.__statusSeen.push(status); };
      watch();
      window.__statusObserver?.disconnect();
      window.__statusObserver = new MutationObserver(watch);
      window.__statusObserver.observe(document.body, { subtree: true, attributes: true, childList: true, attributeFilter: ['data-status'] });
    }, key);
    const seenNow = () => page.evaluate(() => window.__statusSeen);
    const terminate = async id => (await alpha.gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}', { id })).terminateAgentRun;
    const navigationsBefore = await page.evaluate(() => performance.getEntriesByType('navigation').length);
    // (a) Its root not opened on the phone: the history poll's status read brings the change (autobyteus-426 D-09; before
    // it, such a row kept its last read until the root was opened, 277 DEC-013). Here the row is a task-team member's own
    // delegated run under the listed PTM run (the root's status snapshot includes task teams' members and their children).
    const unselectedKey = `${ptmKey}/agent:${stack.memberDelegated}`;
    await watchDot(unselectedKey);
    const unselectedTerminated = await terminate(stack.memberDelegated);
    const unselectedFrom = Date.now();
    let unselectedSeen = [];
    await waitFor('the row not under an open root to follow', async () => (unselectedSeen = await seenNow()).length >= 2, 16_000).catch(() => undefined);
    const unselectedChangeMs = unselectedSeen.length >= 2 ? Date.now() - unselectedFrom : null;
    // (b) Its root opened, then ← (the open run): the dot follows.
    await openRow(page, ptmKey);
    await page.locator(sel('mobile-run-back')).first().click();
    await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor();
    await sleep(1_500);
    const unselectedAfterOpen = (await rowsOf(page)).find(row => row.key === unselectedKey)?.status ?? null;
    const spareKey = `${ptmKey}/agent:${stack.spareRun}`;
    await watchDot(spareKey);
    const terminated = await terminate(stack.spareRun);
    let seen = [];
    await waitFor('the stopped run\'s dot to change', async () => (seen = await seenNow()).length >= 2, 30_000).catch(() => undefined);
    await page.evaluate(() => window.__statusObserver.disconnect());
    const liveOk = seen.length >= 2 && seen.some(status => status !== seen[0]);
    const allRows = await rowsOf(page);
    const phoneTitles = { writer: writer.title, squad: squad.title, spare: allRows.find(row => row.key === `${ptmKey}/agent:${stack.spareRun}`)?.title ?? null,
      leadDelegated: childRow(teamRows, teamKey, 'changelog helper', 1)?.title ?? leadDelegatedNested?.title ?? null };
    const memberTitles = { lead: lead.title, mate: mate.title, reviewer: members[0]?.title ?? null, editor: members[1]?.title ?? null };
    const desktopLine = label => desktopTitles[label]?.[2] ?? null;
    const facts = { phonePlace, desktopPlace, phoneTitles, memberTitles, desktopTitles, liveStatuses: seen, terminated,
      unselected: { seen: unselectedSeen, changeMs: unselectedChangeMs, terminated: unselectedTerminated, afterRootOpened: unselectedAfterOpen },
      reloaded: (await page.evaluate(() => performance.getEntriesByType('navigation').length)) !== navigationsBefore,
      ptm, writer, squad, members, remoteAgent, remoteTeam, team: { teamRow, lead, mate, leadDelegatedNested }, orgRow, orgMembers: orgMembers.map(row => row.name),
      teamRows: teamRows.filter(row => row.key.startsWith(teamKey)).map(row => [row.name, row.depth]) };
    const failures = [
      [liveOk && !facts.reloaded, 'a delegated run\'s state changes live on the list (its root open)'],
      [unselectedSeen.length >= 2 && unselectedSeen.some(status => status !== unselectedSeen[0]) && unselectedChangeMs !== null && unselectedChangeMs <= 7_000 && unselectedAfterOpen === unselectedSeen[unselectedSeen.length - 1],
        'under a root not open: the dot follows within one poll, without opening the root (autobyteus-426 D-09)'],
      [Boolean(childRow(teamRows, teamKey, 'changelog helper', 1)) && !leadDelegatedNested, 'a member\'s task agent beside the member, as on the desktop (DEC-009)'],
      [phoneTitles.writer === 'Write the release notes.' && phoneTitles.squad === 'Review the docs site.', 'a task agent and a task team show their Task\'s summary (DEC-010)'],
      [['writer', 'spare', 'leadDelegated'].every(label => phoneTitles[label] && phoneTitles[label] === desktopLine(label)), 'the same second line as the desktop Runs view'],
      [Object.values(memberTitles).every(title => !title), 'members show one line, their name (DEC-010)'],
    ].filter(([ok]) => !ok).map(([, label]) => label);
    assert(failures.length === 0, failures.join('; '), facts);
    return facts;
  });

  await runCase('MSP-03', async () => {
    await toList(page);
    await showOlder(page);
    const ptmKey = `agent:${stack.ptm}`;
    const squadKey = `${ptmKey}/team:${stack.squadRun}`;
    await ensureUnfolded(page, squadKey);
    const kinds = [
      { kind: 'task agent', key: () => `${ptmKey}/agent:${stack.writerRun}`, name: 'release notes writer', parent: 'Project Task Manager', ids: { hostRunId: stack.ptm, memberAddress: '/release_notes_writer', agentRunId: stack.writerRun } },
      { kind: 'task-team member', key: async () => childRow(await rowsOf(page), squadKey, 'reviewer', 2)?.key, name: 'reviewer', parent: 'docs review team',
        ids: { hostRunId: stack.ptm, memberAddress: '/docs_review_team/reviewer', agentRunId: stack.reviewer, teamRunId: stack.squadRun } },
      { kind: 'Team run (its coordinator)', key: () => `team:${stack.delivery}`, name: 'lead', parent: 'Delivery Team', ids: { teamRunId: stack.delivery, agentRunId: stack.deliveryLead, runId: stack.deliveryLead } },
      { kind: 'Org run (its first member)', key: () => `org:${stack.org}`, name: 'planner', parent: 'Delivery Org', ids: { orgRunId: stack.org, agentRunId: stack.orgPlanner, memberAddress: '/planner', runId: stack.orgPlanner } },
      { kind: 'Org run (first member a Team: its coordinator)', key: () => `org:${stack.reviewOrg}`, name: 'reviewer', parent: '(squad|Review Org)',
        ids: { orgRunId: stack.reviewOrg, agentRunId: stack.reviewOrgCoordinator.agentRunId, memberAddress: stack.reviewOrgCoordinator.address, runId: stack.reviewOrgCoordinator.agentRunId } },
      { kind: 'Org member', key: () => `org:${stack.org}/agent:${stack.orgPlanner}`, name: 'planner', parent: 'Delivery Org', ids: { orgRunId: stack.org, agentRunId: stack.orgPlanner, memberAddress: '/planner', runId: stack.orgPlanner } },
    ];
    const results = [];
    const scroller = page.locator(sel('mobile-run-list-scroll'));
    for (const [index, entry] of kinds.entries()) {
      const result = { kind: entry.kind };
      results.push(result);
      try {
        await toList(page);
        const key = await entry.key();
        result.key = key;
        if (!key || !(await page.locator(rowSel(key)).count())) { result.problem = 'row not listed'; continue; }
        await page.locator(rowSel(key)).scrollIntoViewIfNeeded();
        await scroller.evaluate(el => { el.scrollTop = Math.max(0, el.scrollTop + 40); });
        result.scrollBefore = await scroller.evaluate(el => el.scrollTop);
        await page.evaluate(() => { window.__st = []; const take = () => { const s = document.querySelector('[data-testid="mobile-run-screen"]'); const v = s ? `${s.getAttribute('data-state')}:${s.querySelector('[data-testid="mobile-run-name"]')?.textContent ?? ''}` : 'list'; if (window.__st[window.__st.length - 1] !== v) window.__st.push(v); };
          window.__stObserver = new MutationObserver(take); window.__stObserver.observe(document.body, { subtree: true, childList: true, attributes: true }); });
        await page.locator(`${rowSel(key)} ${sel('mobile-run-open')}`).click();
        await waitFor(`${entry.kind}: the run screen`, async () => (await runScreen(page)).state === 'open', 20_000).catch(() => undefined);
        await sleep(600);
        result.states = await page.evaluate(() => { window.__stObserver?.disconnect(); return window.__st; });
        const screen = await runScreen(page);
        result.screen = { state: screen.state, name: screen.name, subtitle: screen.subtitle, query: screen.query };
        if (screen.state !== 'open') { result.problem = 'the run screen did not open'; await toList(page); continue; }
        result.nameOk = screen.name?.toLowerCase() === entry.name.toLowerCase() && new RegExp(`^(Running|Idle|Starting|Error|Stopped) · in ${entry.parent}$`, 'i').test(screen.subtitle ?? '');
        result.composer = await page.locator(`${sel('mobile-run-conversation')} textarea`).count();
        const marker = `PHONE-MSG-${index + 1}-${randomUUID().slice(0, 6)}`;
        result.marker = marker;
        const errorsBefore = evidence.browserErrors.length;
        await composerSend(page, `From the phone. Marker ${marker}`);
        await waitFor(`${entry.kind}: the message on the node`, async () => (result.reached = await storedHas(alpha, entry.ids, marker)), 30_000).catch(() => undefined);
        result.shownOnPhone = ((await runScreen(page)).conversation ?? '').includes(marker);
        result.sendErrors = evidence.browserErrors.slice(errorsBefore).filter(entry => !entry.known).map(entry => entry.line.split('\n')[0]);
        await shot(page, `MSP-03-${index + 1}-${entry.kind.split(' ')[0].toLowerCase()}`);
        await page.locator(sel('mobile-run-back')).first().click();
        await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor({ timeout: 20_000 });
        await sleep(400);
        result.scrollAfter = await scroller.evaluate(el => el.scrollTop);
        const markedRows = (await rowsOf(page)).filter(row => row.current === 'true');
        result.markedRows = markedRows.map(row => `${row.key} (${row.name})`);
        result.marked = markedRows.length === 1 && (markedRows[0].key === key || (markedRows[0].key.startsWith(`${key}/`) && markedRows[0].name.toLowerCase() === entry.name.toLowerCase())) ? 'true' : null;
      } catch (error) { result.problem = error.message; }
    }
    // Control for a failed send: the same send in a page given `crypto.randomUUID` (a secure context has it).
    const control = {};
    if (results.some(result => result.composer && !result.reached)) {
      const secure = await openPhone({ storageState: paired, label: 'phone-randomuuid-control' });
      await secure.context.addInitScript(() => {
        if (typeof crypto.randomUUID !== 'function') {
          crypto.randomUUID = () => '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16));
        }
      });
      control.insecureContext = await page.evaluate(() => ({ isSecureContext: window.isSecureContext, randomUUID: typeof crypto.randomUUID }));
      await secure.page.goto(`${phoneOrigin()}/mobile`, { waitUntil: 'domcontentloaded' });
      await secure.page.locator(sel('mobile-run-tree')).waitFor({ timeout: 60_000 });
      await sleep(1_500);
      await openRow(secure.page, `${ptmKey}/agent:${stack.writerRun}`);
      const marker = `PHONE-CONTROL-${randomUUID().slice(0, 6)}`;
      await composerSend(secure.page, `From the phone. Marker ${marker}`);
      await waitFor('the control message on the node', async () => (control.reached = await storedHas(alpha, { hostRunId: stack.ptm, memberAddress: '/release_notes_writer', agentRunId: stack.writerRun }, marker)), 30_000).catch(() => undefined);
      control.shownOnPhone = ((await runScreen(secure.page)).conversation ?? '').includes(marker);
      await secure.context.close();
    }
    const failures = results.filter(result => result.problem || !result.nameOk || !result.composer || !result.reached || !result.shownOnPhone
      || Math.abs((result.scrollAfter ?? -99) - (result.scrollBefore ?? 0)) > 2 || result.marked !== 'true');
    assert(failures.length === 0, 'each kind opens its agent\'s conversation, a message from the phone reaches it, ← keeps the scroll and marks the row', { failures, control });
    return { results, control };
  });

  await runCase('MSP-04', async () => {
    await toList(page);
    await showOlder(page);
    const screen = await openRow(page, `agent:${stack.approver}`);
    await composerSend(page, 'Run the probe shell command.');
    const approve = page.locator(sel('mobile-run-conversation')).getByRole('button', { name: 'Approve', exact: true });
    await approve.first().waitFor({ timeout: 60_000 });
    await shot(page, 'MSP-04-approval-pending');
    await approve.first().click();
    let answer = null;
    await waitFor('the runtime\'s answer', async () => {
      const lines = existsSync(stack.acpRecord) ? (await fs.readFile(stack.acpRecord, 'utf8')).split('\n').filter(Boolean).map(line => JSON.parse(line)) : [];
      answer = lines.find(message => !('method' in message) && message.result?.outcome)?.result?.outcome ?? null;
      return Boolean(answer);
    }, 45_000);
    let conversation = '';
    await waitFor('the command ran', async () => (conversation = (await runScreen(page)).conversation ?? '').includes('grok-permission-probe'), 30_000).catch(() => undefined);
    await sleep(1_500);
    const stillAwaiting = await approve.count();
    await shot(page, 'MSP-04-approved');
    assert(screen.name === 'Approver', 'the Grok run opened', screen);
    assert(answer?.outcome === 'selected' && answer.optionId === 'allow-once', 'the node answered the runtime: allow once', answer);
    assert(stillAwaiting === 0, 'no approval left pending', stillAwaiting);
    return { screen: { ...screen, conversation: undefined }, answer, commandShown: conversation.includes('grok-permission-probe') };
  });

  await runCase('MSP-05', async () => {
    await toList(page);
    await showOlder(page);
    // Snapshots of the run screen from the tap until the conversation: never another run, no button but ←.
    const watchScreen = () => page.evaluate(() => {
      window.__screens = [];
      const take = () => {
        const screen = document.querySelector('[data-testid="mobile-run-screen"]');
        if (!screen) return;
        const snap = JSON.stringify({ state: screen.getAttribute('data-state'), name: screen.querySelector('[data-testid="mobile-run-name"]')?.textContent?.trim() ?? null,
          opening: Boolean(screen.querySelector('[data-testid="mobile-run-opening"]')), buttons: [...screen.querySelectorAll('button')].filter(b => b.offsetParent !== null).map(b => b.getAttribute('aria-label') || b.textContent.trim()).slice(0, 6) });
        if (window.__screens[window.__screens.length - 1] !== snap) window.__screens.push(snap);
      };
      window.__screenObserver = new MutationObserver(take);
      window.__screenObserver.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
    });
    const screensSeen = () => page.evaluate(() => { window.__screenObserver?.disconnect(); return (window.__screens ?? []).map(s => JSON.parse(s)); });
    // A is open (Approver); B (the Team's coordinator) is tapped.
    await openRow(page, `agent:${stack.approver}`);
    await page.locator(sel('mobile-run-back')).first().click();
    await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor();
    await watchScreen();
    await page.locator(`${rowSel(`team:${stack.delivery}`)} ${sel('mobile-run-open')}`).click();
    await waitFor('B open', async () => (await runScreen(page)).state === 'open' && (await runScreen(page)).name === 'lead', 30_000);
    await sleep(800);
    const snapshots = await screensSeen();
    const shownOther = snapshots.filter(s => s.state === 'open' && s.name !== 'lead');
    const openingButtons = snapshots.filter(s => s.state === 'opening').flatMap(s => s.buttons);
    assert(shownOther.length === 0, 'the previous run is never shown while opening', snapshots);
    assert(openingButtons.every(label => label === 'Back to runs'), '"Opening…" offers no button but ←', snapshots);
    // Browser Back/Forward: the conversation attaches again.
    await page.goBack();
    await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor({ timeout: 20_000 });
    await page.goForward();
    await waitFor('Forward re-attaches', async () => { const s = await runScreen(page); return s.state === 'open' && s.name === 'lead' && (s.conversation ?? '').includes('LEAD-DELEGATED'); }, 30_000);
    const forward = await runScreen(page);
    // From a view: Back returns to the attached conversation.
    await menuOpen(page, 'activity');
    await page.locator(sel('mobile-activity')).waitFor({ timeout: 20_000 });
    await page.goBack();
    await waitFor('Back from a view re-attaches', async () => (await runScreen(page)).state === 'open', 20_000);
    // An Org entry: Back, then Forward restores the Org target from its keys.
    await page.goBack();
    await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor({ timeout: 20_000 });
    await openRow(page, `org:${stack.org}/agent:${stack.orgPlanner}`);
    const orgQuery = (await runScreen(page)).query;
    await page.goBack();
    await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor({ timeout: 20_000 });
    const listQuery = await page.evaluate(() => location.search);
    const orgMarked = await page.locator(rowSel(`org:${stack.org}/agent:${stack.orgPlanner}`)).getAttribute('aria-current');
    await page.goForward();
    await waitFor('Forward to the Org entry', async () => { const s = await runScreen(page); return s.state === 'open' && (s.conversation ?? '').includes('ORG-PLANNER'); }, 30_000);
    // A reload of a run entry: the list.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor({ timeout: 60_000 });
    const afterReload = await page.evaluate(() => location.search);
    // A tap during an open: ← and another row; the second one is open in the end.
    await showOlder(page);
    await page.locator(`${rowSel(`agent:${stack.approver}`)} ${sel('mobile-run-open')}`).click();
    await page.locator(sel('mobile-run-back')).first().click();
    await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor({ timeout: 20_000 });
    await page.locator(`${rowSel(`team:${stack.delivery}`)} ${sel('mobile-run-open')}`).click();
    await waitFor('the second row open', async () => (await runScreen(page)).state === 'open', 30_000);
    await sleep(2_000);
    const second = await runScreen(page);
    assert(orgQuery.includes('orgRunId') && listQuery.includes('orgRunId') && orgMarked === 'true', 'the Org keys stay on the list entry and the row stays marked', { orgQuery, listQuery, orgMarked });
    assert(!afterReload.includes('screen=run'), 'a reload of a run entry lands on the list', afterReload);
    assert(second.name === 'lead', 'the second tap wins', second);
    return { snapshots, forward: { ...forward, conversation: undefined }, orgQuery, listQuery, orgMarked, afterReload, second: { ...second, conversation: undefined } };
  });

  await runCase('MSP-06', async () => {
    await toList(page);
    const ptmKey = `agent:${stack.ptm}`;
    // The remote rows know their title and state once their delegating run is opened (278: the node is asked for an opened root).
    await openRow(page, ptmKey);
    await page.locator(sel('mobile-run-back')).first().click();
    const remoteKey = `${ptmKey}/agent:${stack.remoteAgentRun}`;
    let row = null;
    await waitFor('the remote row\'s title', async () => (row = (await rowsOf(page)).find(entry => entry.key.endsWith(stack.remoteAgentRun)))?.title === stack.remoteAgentTitle, 30_000).catch(() => undefined);
    assert(row?.chip?.includes(PEER) && row.title === stack.remoteAgentTitle && row.status && row.status !== 'error', 'the remote row: chip, title, state', row);
    const opened = await openRow(page, row.key);
    await waitFor('the remote conversation', async () => ((await runScreen(page)).conversation ?? '').includes('REMOTE-AGENT'), 30_000);
    const placeholder = await page.locator(`${sel('mobile-run-conversation')} textarea`).last().getAttribute('placeholder');
    const uploads = await page.locator(`${sel('mobile-run-conversation')} button[aria-label="Upload files"]:visible`).count();
    const box = page.locator(`${sel('mobile-run-conversation')} textarea`).last();
    await box.click(); await box.fill(''); await page.keyboard.type('@'); await sleep(800);
    const mention = { role: await box.getAttribute('role'), expanded: await box.getAttribute('aria-expanded') };
    await page.keyboard.press('Escape').catch(() => undefined); await box.fill('');
    const errorsBefore = evidence.browserErrors.length;
    await composerSend(page, 'status? Marker OWNER-FROM-PHONE');
    let onBeta = false;
    await waitFor('the message on beta', async () => (onBeta = await storedHas(beta, { runId: stack.remoteAgentRun }, 'OWNER-FROM-PHONE')), 30_000).catch(() => undefined);
    const sendErrors = evidence.browserErrors.slice(errorsBefore).filter(entry => !entry.known).map(entry => entry.line.split('\n')[0]);
    let live = false;
    await waitFor('the answer on the phone', async () => { const text = (await runScreen(page)).conversation ?? ''; return (live = text.includes('OWNER-FROM-PHONE') && text.lastIndexOf('OK') > text.indexOf('OWNER-FROM-PHONE')); }, 30_000).catch(() => undefined);
    await shot(page, 'MSP-06-remote-run');
    assert(opened.chip?.includes(PEER), 'the bar shows the node chip', opened);
    assert(placeholder?.includes(PEER) && uploads === 0 && mention.expanded !== 'true', 'a text-only composer', { placeholder, uploads, mention });
    // Beta down: the rows say so, the opened run shows the notice, other runs open.
    await page.locator(sel('mobile-run-back')).first().click();
    await beta.stop();
    await openRow(page, ptmKey);
    await page.locator(sel('mobile-run-back')).first().click();
    let down = null;
    await waitFor('the remote rows not reachable', async () => { down = (await rowsOf(page)).filter(entry => entry.key.startsWith(`${ptmKey}/`) && entry.chip); return down.length >= 2 && down.every(entry => entry.unreachable && entry.status === 'error'); }, 60_000).catch(() => undefined);
    await shot(page, 'MSP-06-peer-down-list');
    const downKey = down?.find(entry => entry.key.endsWith(stack.remoteAgentRun))?.key ?? remoteKey;
    await page.locator(`${rowSel(downKey)} ${sel('mobile-run-open')}`).click();
    const runNotice = page.locator(`${sel('mobile-run-screen')} ${sel('mobile-run-unreachable')}`);
    await runNotice.waitFor({ timeout: 30_000 });
    const notice = (await runNotice.innerText()).replace(/\s+/g, ' ').trim();
    const composerWhileDown = await page.locator(`${sel('mobile-run-screen')} textarea`).count();
    await shot(page, 'MSP-06-peer-down-notice');
    await page.locator(sel('mobile-run-back')).first().click();
    const other = await openRow(page, `team:${stack.delivery}`);
    await page.locator(sel('mobile-run-back')).first().click();
    await beta.start();
    await page.locator(`${rowSel(downKey)} ${sel('mobile-run-open')}`).click();
    await runNotice.waitFor({ timeout: 30_000 }).catch(() => undefined);
    const retry = runNotice.locator('button').filter({ hasText: 'Retry' });
    const retryShown = await retry.count();
    if (retryShown) await retry.first().click();
    let recovered = false;
    await waitFor('Retry recovers the conversation', async () => (recovered = !(await runNotice.count()) && ((await runScreen(page)).conversation ?? '').includes('REMOTE-AGENT')), 60_000).catch(() => undefined);
    await shot(page, 'MSP-06-after-retry');
    assert(down?.length >= 2 && down.every(entry => entry.unreachable && entry.status === 'error'), 'red dot and "Not reachable" on the remote rows', down);
    assert(notice.includes(`${PEER} isn't reachable`) && notice.includes('Retry') && composerWhileDown === 0, 'the notice with Retry, no composer', { notice, composerWhileDown });
    assert(other.state === 'open' && other.name === 'lead', 'other runs open while the peer is down', other);
    assert(retryShown > 0 && recovered, 'Retry recovers when the peer is back', { retryShown, recovered });
    assert(onBeta && live, 'a text message from the phone reaches the run on beta and its answer shows live', { onBeta, live, sendErrors });
    return { onBeta, sendErrors, row, opened: { ...opened, conversation: undefined }, placeholder, uploads, mention, live, down, notice, recovered };
  });

  await runCase('MSP-07', async () => {
    // (a) Nothing opened yet: a fresh start of the paired phone.
    const fresh = await openPhone({ storageState: paired, label: 'phone-fresh' });
    await fresh.page.goto(`${phoneOrigin()}/mobile`, { waitUntil: 'domcontentloaded' });
    await fresh.page.locator(sel('mobile-run-tree')).waitFor({ timeout: 60_000 });
    await fresh.page.locator(sel('mobile-new-run-button')).click();
    await fresh.page.locator(sel('mobile-new-run')).waitFor();
    await waitFor('a preselected agent', async () => (await fresh.page.locator(sel('mobile-run-target-select-value')).innerText()).trim() !== 'Choose', 20_000).catch(() => undefined);
    const freshAgent = (await fresh.page.locator(sel('mobile-run-target-select-value')).innerText()).trim();
    await shot(fresh.page, 'MSP-07-new-run-nothing-opened');
    await fresh.context.close();
    // (b) An Org member opened, then ←: the row stays marked and its agent is preselected.
    await toList(page);
    await showOlder(page);
    await openRow(page, `org:${stack.org}`);
    await page.locator(sel('mobile-run-back')).first().click();
    await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor();
    const orgMarked = await page.locator(rowSel(`org:${stack.org}/agent:${stack.orgPlanner}`)).getAttribute('aria-current');
    const orgListQuery = await page.evaluate(() => location.search);
    await page.locator(sel('mobile-new-run-button')).click();
    await page.locator(sel('mobile-new-run')).waitFor();
    await sleep(800);
    const orgAgent = (await page.locator(sel('mobile-run-target-select-value')).innerText()).trim();
    // Every row's sheet; agents only.
    await page.locator(sel('mobile-run-target-select-toggle')).click();
    await page.locator(sel('mobile-run-target-select-sheet')).waitFor();
    const agentOptions = (await page.locator(sel('mobile-run-target-select-option')).allInnerTexts()).map(text => text.replace(/\s+/g, ' ').trim());
    await shot(page, 'MSP-07-agent-sheet');
    await page.locator(sel('mobile-run-target-select-option')).filter({ hasText: 'Fact Checker' }).first().click();
    await sleep(800);
    const factCheckerReadiness = await page.locator(sel('mobile-run-setup-readiness')).innerText().catch(() => null);
    const launchDisabledWhenMissing = await page.locator(sel('mobile-run-launch')).isDisabled();
    const sheets = {};
    for (const id of ['mobile-run-workspace-select', 'mobile-run-runtime-select', 'mobile-run-model-select']) {
      const toggle = page.locator(sel(`${id}-toggle`));
      if (!(await toggle.count())) { sheets[id] = 'absent'; continue; }
      await toggle.click();
      await page.locator(sel(`${id}-sheet`)).waitFor({ timeout: 10_000 });
      sheets[id] = (await page.locator(sel(`${id}-option`)).allInnerTexts()).map(text => text.replace(/\s+/g, ' ').trim()).slice(0, 8);
      if (id === 'mobile-run-workspace-select') {
        await shot(page, 'MSP-07-folder-sheet');
        await page.locator(sel('mobile-run-workspace-path-input')).fill('   ');
        sheets.blankPathOpenDisabled = await page.locator(sel('mobile-run-workspace-load')).isDisabled();
        // autobyteus-426 D-08: a path the node has not registered must be an existing absolute folder; the reason shows
        // under the field and nothing is registered. Then an existing folder registers and is chosen.
        const registered = async () => (await alpha.gql('{workspaces{workspaceRootPath}}')).workspaces.map(entry => entry.workspaceRootPath);
        const before = await registered();
        sheets.refusals = [];
        for (const [typed, expected] of [['/definitely/not/a/folder-426', 'No folder at this path.'], ['/etc/hosts', 'This path is a file, not a folder.'],
          ['relative/dir', 'Enter a full path, starting with /.']]) {
          await page.locator(sel('mobile-run-workspace-path-input')).fill(typed);
          await page.locator(sel('mobile-run-workspace-load')).click();
          await waitFor(`the refusal of ${typed}`, async () => (await page.locator(sel('mobile-run-workspace-error')).innerText().catch(() => '')).trim() === expected, 15_000).catch(() => undefined);
          sheets.refusals.push({ typed, expected, error: (await page.locator(sel('mobile-run-workspace-error')).innerText().catch(() => '')).trim(),
            sheetOpen: await page.locator(sel(`${id}-sheet`)).count(), value: (await page.locator(sel('mobile-run-workspace-select-value')).innerText()).trim() });
          if (typed === '/etc/hosts') await shot(page, 'MSP-07-path-refused-file');
        }
        const after = await registered();
        sheets.registeredAdded = after.filter(rootPath => !before.includes(rootPath));
        const extraFolder = path.join(root, 'alpha', 'extra-folder-426');
        await fs.mkdir(extraFolder, { recursive: true });
        await page.locator(sel('mobile-run-workspace-path-input')).fill(extraFolder);
        await page.locator(sel('mobile-run-workspace-load')).click();
        await waitFor('the existing folder chosen', async () => (await page.locator(sel('mobile-run-workspace-select-value')).innerText()).includes('extra-folder-426'), 15_000).catch(() => undefined);
        sheets.existingFolder = { value: (await page.locator(sel('mobile-run-workspace-select-value')).innerText()).trim(), sheetOpen: await page.locator(sel(`${id}-sheet`)).count(),
          error: await page.locator(sel('mobile-run-workspace-error')).count(), registered: (await registered()).includes(extraFolder) };
      }
      if (await page.locator(sel(`${id}-sheet`)).count()) await page.locator(`${sel(`${id}-sheet`)} ${sel('mobile-sheet-close')}`).click();
      await sleep(300);
    }
    // The probe's own folder again (the extra folder was chosen last), then a PTM run and its first message.
    await page.locator(sel('mobile-run-workspace-select-toggle')).click();
    await page.locator(sel('mobile-run-workspace-select-option')).filter({ hasText: stack.workspace }).first().click();
    await sleep(500);
    // Create a PTM run and send its first message.
    await page.locator(sel('mobile-run-target-select-toggle')).click();
    await page.locator(sel('mobile-run-target-select-option')).filter({ hasText: 'Project Task Manager' }).first().click();
    await waitFor('Create run enabled', async () => !(await page.locator(sel('mobile-run-launch')).isDisabled()), 20_000);
    await shot(page, 'MSP-07-new-run-ready');
    await page.locator(sel('mobile-run-launch')).click();
    await waitFor('the new run\'s screen', async () => { const s = await runScreen(page); return s.state === 'open' && s.name === 'Project Task Manager'; }, 30_000);
    await page.evaluate(() => {
      window.__states = [];
      const take = () => { const s = document.querySelector('[data-testid="mobile-run-screen"]')?.getAttribute('data-state') ?? (document.querySelector('[data-testid="mobile-run-tree"]')?.offsetParent ? 'list' : 'none');
        if (window.__states[window.__states.length - 1] !== s) window.__states.push(s); };
      take(); window.__statesObserver = new MutationObserver(take); window.__statesObserver.observe(document.body, { subtree: true, childList: true, attributes: true });
    });
    const marker = `NEWRUN-FIRST-${randomUUID().slice(0, 6)}`;
    await composerSend(page, `First message. Marker ${marker}`);
    await waitFor('the first message shown', async () => ((await runScreen(page)).conversation ?? '').includes(marker), 30_000);
    await sleep(4_000);
    const statesDuringFirst = await page.evaluate(() => { window.__statesObserver.disconnect(); return window.__states; });
    const afterFirst = await runScreen(page);
    await page.locator(sel('mobile-run-back')).first().click();
    await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor();
    await sleep(1_500);
    const top = (await rowsOf(page)).find(row => row.depth === 0);
    const newRunId = top?.key.replace(/^agent:/, '');
    const stored = newRunId ? await storedHas(alpha, { runId: newRunId }, marker) : false;
    assert(freshAgent === 'Project Task Manager', 'nothing opened: the Project Task Manager', freshAgent);
    assert(orgMarked === 'true' && orgAgent === 'Release Notes Writer', 'after the Org member and ←: still marked, its agent preselected', { orgMarked, orgAgent });
    assert(agentOptions.length > 0 && !agentOptions.some(text => /Delivery Team|Docs Review Team|Delivery Org/.test(text)), 'agents only', agentOptions);
    assert(launchDisabledWhenMissing && Boolean(factCheckerReadiness), 'disabled with the reason when something is missing', { factCheckerReadiness, launchDisabledWhenMissing });
    assert(sheets.blankPathOpenDisabled, 'a blank path cannot be opened', sheets);
    assert(sheets.refusals.every(entry => entry.error === entry.expected && entry.sheetOpen === 1) && sheets.registeredAdded.length === 0,
      'a missing path, a file and a relative path are refused with their reason under the field; nothing is registered (D-08)', sheets);
    assert(sheets.existingFolder.registered && sheets.existingFolder.error === 0 && sheets.existingFolder.value.includes('extra-folder-426'),
      'an existing folder registers and is chosen', sheets.existingFolder);
    assert(afterFirst.state === 'open' && afterFirst.conversation.includes(marker) && statesDuringFirst.every(state => state === 'open'), 'the first message keeps the screen', { statesDuringFirst });
    assert(newRunId && !newRunId.startsWith('temp') && stored, 'the new run tops the list with its permanent id', { top, stored });
    return { freshAgent, orgMarked, orgListQuery, orgAgent, agentOptions, factCheckerReadiness, launchDisabledWhenMissing, sheets, statesDuringFirst, newRunId, top };
  });

  await runCase('MSP-32', async () => {
    const r = {};
    const fresh = await openPhone({ storageState: paired, label: 'phone-model-sheet' });
    const p = fresh.page;
    const reads = [];
    p.on('request', (request) => {
      const body = request.postData() ?? '';
      if (request.method() === 'POST' && request.url().endsWith('/graphql') && body.includes('providerModelCatalogSnapshots')) reads.push({ runtime: /"runtimeKind":"([^"]+)"/.exec(body)?.[1] ?? null });
    });
    await p.goto(`${phoneOrigin()}/mobile`, { waitUntil: 'domcontentloaded' });
    await p.locator(sel('mobile-run-tree')).waitFor({ timeout: 60_000 });
    await p.locator(sel('mobile-new-run-button')).click();
    await p.locator(sel('mobile-new-run')).waitFor();
    await p.locator(sel('mobile-run-target-select-toggle')).click();
    await p.locator(sel('mobile-run-target-select-option')).filter({ hasText: 'Project Task Manager' }).first().click();
    await sleep(1500);
    const toggle = p.locator(sel('mobile-run-model-select-toggle'));
    await toggle.waitFor({ timeout: 20_000 });
    r.modelRowBefore = (await toggle.innerText()).replace(/\s+/g, ' ').trim();
    await sleep(1500);
    const before = reads.length;
    await toggle.click();
    const sheet = p.locator(sel('mobile-run-model-select-sheet'));
    await sheet.waitFor({ timeout: 10_000 });
    const rowsOf = async () => (await sheet.locator(sel('mobile-run-model-select-option')).allInnerTexts()).map(text => text.replace(/\s+/g, ' ').trim());
    await waitFor('the sheet re-reads the runtime list when it opens', async () => reads.length > before, 15_000);
    await sleep(1500);
    r.opened = { reads: reads.length - before, runtime: reads.at(-1)?.runtime ?? null, rows: await rowsOf() };
    assert(r.opened.rows.length > 0, 'the model sheet lists no model', r.opened);
    assert(r.opened.reads === 1, 'QR-002: more than one read for one opening', r.opened);
    const button = p.locator('[data-test="model-list-refresh-button"]:visible').first();
    await button.waitFor({ timeout: 10_000 });
    r.control = { text: (await button.innerText()).trim(), box: await button.boundingBox() };
    assert(r.control.text === 'Refresh models', 'the control does not read Refresh models', r.control);
    assert(r.control.box && r.control.box.height >= 44 && r.control.box.width >= 44, 'the control is not touch-sized', r.control);
    await shot(p, 'MSP-32-model-sheet-open');
    const beforeRefresh = reads.length;
    await button.click();
    await waitFor('Refresh models re-reads the list', async () => reads.length > beforeRefresh, 15_000);
    await sleep(1500);
    r.afterRefresh = { reads: reads.length - beforeRefresh, runtime: reads.at(-1)?.runtime ?? null, rows: await rowsOf(), error: await p.locator('[data-test="model-list-refresh-error"]:visible').count(), button: (await button.innerText()).trim() };
    assert(r.afterRefresh.reads === 1, 'Refresh models did not read exactly once', r.afterRefresh);
    assert(JSON.stringify(r.afterRefresh.rows) === JSON.stringify(r.opened.rows), 'the list changed or emptied on a refresh that read the same models', r);
    assert(r.afterRefresh.error === 0, 'a refresh error shows although the read succeeded', r.afterRefresh);
    assert(r.afterRefresh.button === 'Refresh models', 'the control did not return to Refresh models', r.afterRefresh);
    await shot(p, 'MSP-32-model-sheet-refreshed');
    await fresh.context.close();
    return r;
  });

  await runCase('MSP-08', async () => {
    await toList(page);
    await openRow(page, `team:${stack.delivery}`);
    await page.locator(sel('mobile-run-menu-button')).click();
    const items = await page.locator(`${sel('mobile-run-menu')} [role="menuitem"]`).evaluateAll(list => list.map(item => [item.getAttribute('data-testid'), item.textContent.trim()]));
    await shot(page, 'MSP-08-menu-member');
    await page.locator(sel('mobile-run-menu-artifacts')).click();
    await page.locator(sel('mobile-artifacts')).waitFor();
    await waitFor('the artifact shown', async () => (await page.locator(sel('mobile-artifacts')).innerText()).includes('NOTES-TEXT-4242'), 30_000).catch(() => undefined);
    const artifacts = { direct: await page.locator(sel('mobile-artifacts-viewer')).count(), list: await page.locator(sel('mobile-artifacts-list')).count(),
      title: (await page.locator(sel('mobile-screen-title')).innerText()).trim(), text: (await page.locator(sel('mobile-artifacts')).innerText()).includes('NOTES-TEXT-4242') };
    await shot(page, 'MSP-08-artifacts');
    await page.locator(sel('mobile-screen-back')).click();
    await menuOpen(page, 'files');
    await page.locator(sel('mobile-files-list')).waitFor({ timeout: 30_000 });
    const filesTop = await page.locator(sel('mobile-files-row')).allInnerTexts();
    const filters = await page.locator(sel('mobile-files')).getByText(/^(Recent|Attached|Markdown|Markdown\/code)$/).count();
    await page.locator(sel('mobile-files-row')).filter({ hasText: 'docs' }).first().click();
    await waitFor('the docs folder', async () => (await page.locator(sel('mobile-files-path')).innerText().catch(() => '')).includes('docs'), 15_000).catch(() => undefined);
    const pathLine = (await page.locator(sel('mobile-files-path')).innerText().catch(() => '')).replace(/\s+/g, ' ');
    await page.locator(sel('mobile-files-row')).filter({ hasText: 'guide.md' }).first().click();
    await page.locator(sel('mobile-file-viewer')).waitFor({ timeout: 20_000 });
    await waitFor('the file text', async () => (await page.locator(sel('mobile-file-viewer')).innerText()).includes('GUIDE-TEXT-7731'), 20_000);
    const attach = await page.locator(sel('mobile-file-attach')).count() + await page.locator(sel('mobile-file-viewer')).getByText(/attach/i).count();
    await shot(page, 'MSP-08-file-open');
    await page.locator(`${sel('mobile-file-viewer')} ${sel('mobile-screen-back')}`).click();
    await page.locator(sel('mobile-files-list')).waitFor();
    await page.locator(sel('mobile-files-search-open')).click();
    await page.locator(sel('mobile-files-search')).fill('app');
    await waitFor('a search result', async () => (await page.locator(sel('mobile-files-row')).allInnerTexts()).some(text => text.includes('app.ts')), 20_000).catch(() => undefined);
    const searchRows = (await page.locator(sel('mobile-files-row')).allInnerTexts()).map(text => text.replace(/\s+/g, ' '));
    await shot(page, 'MSP-08-files-search');
    await page.locator(sel('mobile-files-search-close')).click();
    await page.locator(sel('mobile-screen-back')).click();
    await menuOpen(page, 'messages');
    await page.locator(sel('mobile-messages')).waitFor();
    await page.locator(sel('mobile-team-message-row')).first().waitFor({ timeout: 30_000 });
    const messages = (await page.locator(sel('mobile-team-message-row')).allInnerTexts()).map(text => text.replace(/\s+/g, ' ').slice(0, 160));
    await page.locator(sel('mobile-team-reference-row')).first().click();
    await page.locator(sel('mobile-team-reference-viewer')).waitFor({ timeout: 20_000 });
    await waitFor('the reference text', async () => (await page.locator(sel('mobile-team-reference-viewer')).innerText()).includes('GUIDE-TEXT-7731'), 20_000).catch(() => undefined);
    const referenceText = (await page.locator(sel('mobile-team-reference-viewer')).innerText()).includes('GUIDE-TEXT-7731');
    await shot(page, 'MSP-08-reference-open');
    await page.locator(`${sel('mobile-team-reference-viewer')} ${sel('mobile-screen-back')}`).click();
    await waitFor('the reference closed', async () => (await page.locator(sel('mobile-team-reference-viewer')).count()) === 0, 10_000).catch(() => undefined);
    const stillMessages = await page.locator(sel('mobile-messages')).count();
    await page.locator(sel('mobile-screen-back')).click();
    await menuOpen(page, 'activity');
    await page.locator(sel('mobile-activity')).waitFor();
    await page.locator(sel('mobile-run-activity-row')).first().waitFor({ timeout: 20_000 }).catch(() => undefined);
    const activity = (await page.locator(sel('mobile-run-activity-row')).allInnerTexts()).map(text => text.replace(/\s+/g, ' ').slice(0, 80));
    await shot(page, 'MSP-08-activity');
    await toList(page);
    // A standalone agent: no Messages; empty Artifacts and Activity.
    await showOlder(page);
    await openRow(page, `agent:${stack.plain[0]}`);
    await page.locator(sel('mobile-run-menu-button')).click();
    const plainItems = await page.locator(`${sel('mobile-run-menu')} [role="menuitem"]`).evaluateAll(list => list.map(item => item.textContent.trim()));
    await page.locator(sel('mobile-run-menu-artifacts')).click();
    const artifactsEmpty = (await page.locator(sel('mobile-artifacts-empty')).innerText().catch(() => '')).replace(/\s+/g, ' ');
    await page.locator(sel('mobile-screen-back')).click();
    await menuOpen(page, 'activity');
    const activityEmpty = (await page.locator(sel('mobile-activity-empty')).innerText().catch(() => '')).trim();
    await shot(page, 'MSP-08-activity-empty');
    await toList(page);
    // A remote run: "on that node".
    const remoteKey = (await rowsOf(page)).find(row => row.key.endsWith(stack.remoteAgentRun))?.key;
    await openRow(page, remoteKey);
    await menuOpen(page, 'artifacts');
    const remoteArtifacts = (await page.locator(sel('mobile-artifacts-remote')).innerText().catch(() => '')).trim();
    await page.locator(sel('mobile-screen-back')).click();
    await menuOpen(page, 'files');
    const remoteFiles = (await page.locator(sel('mobile-files-remote')).innerText().catch(() => '')).trim();
    await toList(page);
    assert(JSON.stringify(items.map(([id]) => id)) === JSON.stringify(['mobile-run-menu-artifacts', 'mobile-run-menu-files', 'mobile-run-menu-messages', 'mobile-run-menu-activity']), 'the member\'s ⋮ items in order', items);
    assert(artifacts.direct === 1 && artifacts.list === 0 && artifacts.text, 'one artifact shown directly', artifacts);
    assert(['docs', 'src', 'README.md'].every(name => filesTop.some(text => text.includes(name))) && filters === 0 && pathLine.includes('docs'), 'the Files tree, its path line, no filters', { filesTop, filters, pathLine });
    assert(attach === 0, 'an opened file has no Attach', attach);
    assert(searchRows.some(text => text.includes('app.ts')), 'one search over the workspace', searchRows);
    assert(messages.some(text => text.includes('TEAM-NOTE')) && referenceText && stillMessages === 1, 'the Team messages; a reference opens the file and ← closes it', { messages, referenceText, stillMessages });
    assert(activity.length > 0, 'the agent\'s tool calls', activity);
    assert(!plainItems.includes('Messages') && plainItems.length === 3, 'no Messages for a standalone agent', plainItems);
    assert(artifactsEmpty.startsWith('No Artifacts yet') && activityEmpty === 'No activity yet', 'empty states', { artifactsEmpty, activityEmpty });
    assert(remoteArtifacts.includes(PEER) && remoteFiles.includes(PEER), 'a remote run: the files are on that node', { remoteArtifacts, remoteFiles });
    return { items, artifacts, filesTop, filters, pathLine, attach, searchRows, messages, referenceText, activity, plainItems, artifactsEmpty, activityEmpty, remoteArtifacts, remoteFiles };
  });

  await runCase('MSP-16', async () => {
    // The lead's own message (an AI message through the real runtime, stream and stored projection) names a file inside
    // the workspace and one outside it, each as a Markdown link to its absolute path. Its text comes back as `ECHO:"…"`.
    const draftPath = path.join(stack.workspace, 'drafts', 'draft-v3.txt');
    const outsideDir = path.join(path.dirname(stack.workspace), 'outside-427');
    const outsidePath = path.join(outsideDir, 'private.txt');
    // autobyteus-436: files outside the run's folder (a worktree elsewhere on the computer), a missing path and a folder.
    const notesPath = path.join(outsideDir, 'notes-436.md');
    const imagePath = path.join(outsideDir, 'diagram-436.png');
    const missingPath = path.join(outsideDir, 'gone-436.md');
    const folderPath = path.join(outsideDir, 'reports-436.md');
    await fs.mkdir(path.dirname(draftPath), { recursive: true });
    await fs.mkdir(folderPath, { recursive: true });
    await fs.writeFile(draftPath, 'DRAFT-V3-TEXT-5150: the third draft.\n');
    await fs.writeFile(outsidePath, 'OUTSIDE-TEXT-9090 opens read-only on the phone.\n');
    await fs.writeFile(notesPath, '# NOTES-436\n\nREAD-ONLY-NOTES-436 from a worktree.\n');
    await fs.writeFile(imagePath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64'));
    const marker = 'FILE-LINK-427';
    await sendOver(stack.wsUrl(`agent-team/${stack.delivery}`), { message_id: randomUUID(), dedupe_key: `team_member_input:probe:${randomUUID()}`,
      context_file_paths: [], image_urls: [], agent_run_id: stack.deliveryLead,
      content: `ECHO_INPUT ${marker} The draft is in [draft-v3.txt](${draftPath}); the old one is [private.txt](${outsidePath}); `
        + `notes [notes-436.md](${notesPath}), the diagram [diagram-436.png](${imagePath}), [gone-436.md](${missingPath}), [reports-436.md](${folderPath}).` });
    await waitFor('the lead\'s answer naming the files', async () => /ECHO:[^]*FILE-LINK-427/.test(await stack.leadProjection()), 60_000);
    const workspaceId = (await alpha.gql('query($r:String!){workspaceMetadata(rootPath:$r){workspaceId}}', { r: stack.workspace })).workspaceMetadata?.workspaceId;
    const consoleLines = [];
    const onConsole = message => { if (['warning', 'error'].includes(message.type())) consoleLines.push(`${message.type()}: ${message.text()}`.slice(0, 300)); };
    page.on('console', onConsole);
    try {
      await toList(page);
      await openRow(page, `team:${stack.delivery}`);
      const conversation = page.locator(sel('mobile-run-conversation'));
      const control = filePath => conversation.locator(`[data-event-monitor-file-action-control="true"][title="${filePath}"]`);
      await control(draftPath).first().waitFor({ timeout: 30_000 });
      const links = { draft: await control(draftPath).count(), outside: await control(outsidePath).count(),
        draftLabel: (await control(draftPath).last().innerText()).trim(), draftAria: await control(draftPath).last().getAttribute('aria-label') };
      const before = await runScreen(page);
      await shot(page, 'MSP-16-conversation');
      // Tap the file inside the workspace: the Files screen shows it as a new entry.
      await control(draftPath).last().scrollIntoViewIfNeeded();
      await control(draftPath).last().tap();
      const viewer = page.locator(sel('mobile-file-viewer'));
      await viewer.waitFor({ timeout: 20_000 }).catch(() => undefined);
      await waitFor('the draft\'s text in the viewer', async () => (await viewer.innerText().catch(() => '')).includes('DRAFT-V3-TEXT-5150'), 20_000).catch(() => undefined);
      const opened = { viewer: await viewer.count(), text: (await viewer.innerText().catch(() => '')).includes('DRAFT-V3-TEXT-5150'),
        query: Object.fromEntries(new URL(page.url()).searchParams), status: await page.locator(sel('event-monitor-file-preview-status')).count() };
      await shot(page, 'MSP-16-file-open');
      // The system Back key (history Back) returns to the conversation.
      if (opened.viewer) {
        await page.goBack();
        await waitFor('the conversation again', async () => (await runScreen(page)).state === 'open' && (await viewer.count()) === 0, 15_000).catch(() => undefined);
      }
      const after = await runScreen(page);
      const back = { state: after.state, query: after.query, name: after.name, link: await control(draftPath).count(),
        composer: await page.locator(`${sel('mobile-run-conversation')} textarea`).count() };
      await shot(page, 'MSP-16-back');
      // autobyteus-436: a file outside the workspace opens read-only by its absolute path; Back closes it.
      const openOutside = async (filePath, name) => {
        await control(filePath).last().scrollIntoViewIfNeeded();
        await control(filePath).last().tap();
        await viewer.waitFor({ timeout: 20_000 }).catch(() => undefined);
        await waitFor(`${name} settled in the viewer`, async () => {
          const text = await viewer.innerText().catch(() => '');
          return !/Opening…/.test(text) && text.length > 0;
        }, 20_000).catch(() => undefined);
        await sleep(500);
        const facts = {
          viewer: await viewer.count(), query: Object.fromEntries(new URL(page.url()).searchParams), text: (await viewer.innerText().catch(() => '')).slice(0, 400),
          error: (await viewer.locator(sel('mobile-file-preview-error')).innerText().catch(() => '')).trim(),
          image: await viewer.locator('img[src^="blob:"]').count(),
          editControls: await viewer.getByRole('button', { name: /save|rename|delete|edit/i }).count(),
          status: await page.locator(sel('event-monitor-file-preview-status')).count(),
        };
        // Read-only: typing into the shown file changes nothing.
        const content = viewer.locator(sel('mobile-file-preview-content'));
        if (await content.count()) {
          await content.click({ position: { x: 60, y: 40 } }).catch(() => undefined);
          await page.keyboard.type('TYPED-436', { delay: 10 }).catch(() => undefined);
          await sleep(300);
        }
        facts.typedChanges = (await viewer.innerText().catch(() => '')).includes('TYPED-436');
        await shot(page, `MSP-16-outside-${name}`);
        if (facts.viewer) {
          await page.goBack();
          await waitFor(`the conversation after ${name}`, async () => (await runScreen(page)).state === 'open' && (await viewer.count()) === 0, 15_000).catch(() => undefined);
        }
        return { ...facts, backToConversation: (await runScreen(page)).state === 'open' && (await viewer.count()) === 0 };
      };
      const outside = await openOutside(outsidePath, 'text');
      const notes = await openOutside(notesPath, 'markdown');
      const image = await openOutside(imagePath, 'image');
      const missing = await openOutside(missingPath, 'missing');
      const folder = await openOutside(folderPath, 'folder');
      const warnings = consoleLines.filter(line => /inject\(\)|File preview failed|reading 'query'/.test(line));
      assert(links.draft >= 1 && links.outside >= 1, 'the message renders both paths as file links', links);
      assert(opened.viewer === 1 && opened.text, 'a tap on the workspace file shows its text in the phone\'s file viewer', { opened, consoleLines });
      assert(opened.query.screen === 'files' && opened.query.workspace === workspaceId && opened.query.file === 'drafts/draft-v3.txt', 'the URL is the Files screen with the workspace and the relative path', { query: opened.query, workspaceId });
      assert(back.state === 'open' && back.query === before.query && back.link >= 1 && back.composer >= 1, 'Back returns to the conversation', { before: before.query, back });
      const openedReadOnly = (facts, filePath) => facts.viewer === 1 && facts.query.screen === 'files' && facts.query.nodeFile === filePath && !facts.query.workspace
        && facts.status === 0 && !facts.typedChanges && facts.editControls === 0 && facts.backToConversation;
      assert(openedReadOnly(outside, outsidePath) && outside.text.includes('OUTSIDE-TEXT-9090'), 'AC-001 a text file outside the workspace opens read-only by its absolute path; Back closes it', outside);
      assert(openedReadOnly(notes, notesPath) && notes.text.includes('READ-ONLY-NOTES-436'), 'AC-001 a Markdown file outside the workspace opens read-only', notes);
      assert(openedReadOnly(image, imagePath) && image.image === 1, 'AC-001 an image outside the workspace shows', image);
      assert(missing.viewer === 1 && missing.error === 'This file was not found on the computer.' && missing.backToConversation, 'AC-004 a missing path says so', missing);
      assert(folder.viewer === 1 && folder.error === 'This path is a folder, not a file.' && folder.backToConversation, 'AC-004 a folder says so', folder);
      assert(warnings.length === 0, 'no opener failure in the console', warnings);
      return { draftPath: path.relative(root, draftPath), outsidePath: path.relative(root, outsidePath), workspaceId, links, before: before.query, opened, back,
        outside, notes, image, missing, folder, consoleLines };
    } finally {
      page.off('console', onConsole);
    }
  });

  await runCase('MSP-14', async () => {
    await toList(page);
    const writerKey = `agent:${stack.ptm}/agent:${stack.writerRun}`;
    assert(await page.locator(rowSel(writerKey)).count(), 'the task agent is listed before');
    const navigationsBefore = await page.evaluate(() => performance.getEntriesByType('navigation').length);
    await stack.agentCall(stack.ptm, 'update_task', { task_id: stack.taskA.taskId, status: 'DONE' });
    let gone = false;
    await waitFor('the task agent\'s row leaves', async () => (gone = (await page.locator(rowSel(writerKey)).count()) === 0), 45_000).catch(() => undefined);
    await shot(page, 'MSP-14-after-done');
    const reloaded = (await page.evaluate(() => performance.getEntriesByType('navigation').length)) !== navigationsBefore;
    assert(gone && !reloaded, 'the Task\'s row leaves live', { gone, reloaded });
    return { gone, reloaded };
  });

  await runCase('MSP-10', async () => {
    await toList(page);
    const listText = await page.locator(sel('mobile-run-list')).innerText();
    const forbidden = ['Home', 'Switch work', 'Choose work', 'Workspaces', 'Projects', 'Results', 'Troubleshoot'].filter(word => new RegExp(`\\b${word}\\b`).test(listText));
    const tabs = await page.locator('[role="tablist"], [role="tab"]').count();
    const rowButtons = (await rowsOf(page)).flatMap(row => row.buttons);
    const rowActions = rowButtons.filter(label => !['mobile-run-open', 'mobile-run-toggle'].includes(label));
    const notice = await openPhone({ storageState: paired, label: 'phone-notice' });
    await notice.page.goto(`${phoneOrigin()}/mobile?unsupported=desktopWorkspace`, { waitUntil: 'domcontentloaded' });
    await notice.page.locator(sel('mobile-run-tree')).waitFor({ timeout: 60_000 });
    const noticeText = (await notice.page.locator(sel('mobile-unsupported-feature')).innerText()).trim();
    const noticeAbove = await notice.page.evaluate(() => {
      const n = document.querySelector('[data-testid="mobile-unsupported-feature"]'); const t = document.querySelector('[data-testid="mobile-run-tree"]');
      return Boolean(n && t && (n.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING) && n.getBoundingClientRect().bottom <= t.getBoundingClientRect().top + 1);
    });
    await shot(notice.page, 'MSP-10-unsupported-notice');
    // A desktop route opened on the phone.
    await notice.page.goto(`${phoneOrigin()}/mobile/workspace`, { waitUntil: 'domcontentloaded' });
    await sleep(4_000);
    const desktopRoute = { url: notice.page.url().replace(phoneOrigin(), ''), notice: await notice.page.locator(sel('mobile-unsupported-feature')).innerText().catch(() => null) };
    await notice.context.close();
    assert(forbidden.length === 0 && tabs === 0, 'none of the "Not on the phone" items on the list', { forbidden, tabs });
    assert(rowActions.length === 0, 'no row actions', rowActions);
    assert(noticeText.endsWith('The desktop workspace isn’t on the phone. Your runs are here.') && noticeAbove, 'the notice above the run list', { noticeText, noticeAbove });
    return { forbidden, tabs, rowButtons: [...new Set(rowButtons)], noticeText, noticeAbove, desktopRoute };
  });

  await runCase('MSP-11', async () => {
    const tour = async (target, size) => {
      const name = `${size.width}x${size.height}`;
      const screens = {};
      const at = async (screen) => { await sleep(600); screens[screen] = await measureLayout(target); await shot(target, `MSP-11-${screen}-${name}`); };
      await toList(target);
      await showOlder(target);
      await ensureUnfolded(target, `team:${stack.delivery}`).catch(() => undefined);
      await at('list');
      await openRow(target, `team:${stack.delivery}`);
      await at('run');
      await target.locator(sel('mobile-run-menu-button')).click();
      await at('menu');
      await target.locator(sel('mobile-run-menu-artifacts')).click();
      await target.locator(sel('mobile-artifacts')).waitFor();
      await at('artifacts');
      await target.goBack();
      await menuOpen(target, 'files');
      await target.locator(sel('mobile-files-list')).waitFor({ timeout: 30_000 });
      await at('files');
      await target.locator(sel('mobile-files-search-open')).click();
      await at('files-search');
      await target.locator(sel('mobile-files-search-close')).click();
      await target.locator(sel('mobile-files-row')).filter({ hasText: 'docs' }).first().click();
      await sleep(600);
      await target.locator(sel('mobile-files-row')).filter({ hasText: 'guide.md' }).first().click();
      await target.locator(sel('mobile-file-viewer')).waitFor();
      await at('file-open');
      // Back walk (the system Back key is the history's Back): file → Files → run → list.
      const walk = [];
      const screenNow = async () => target.evaluate(() => (document.querySelector('[data-testid="mobile-file-viewer"]') ? 'file'
        : document.querySelector('[data-testid="mobile-team-reference-viewer"]') ? 'reference'
          : document.querySelector('[data-testid="mobile-files"]') ? 'files' : document.querySelector('[data-testid="mobile-messages"]') ? 'messages'
            : document.querySelector('[data-testid="mobile-run-screen"]') ? 'run' : document.querySelector('[data-testid="mobile-run-tree"]')?.offsetParent ? 'list' : 'other'));
      for (let step = 0; step < 3; step += 1) { await target.goBack(); await sleep(900); walk.push(await screenNow()); }
      await openRow(target, `team:${stack.delivery}`);
      await menuOpen(target, 'messages');
      await target.locator(sel('mobile-team-message-row')).first().waitFor({ timeout: 30_000 });
      await at('messages');
      await target.locator(sel('mobile-team-reference-row')).first().click();
      await target.locator(sel('mobile-team-reference-viewer')).waitFor();
      await at('reference-open');
      const walkMessages = [];
      for (let step = 0; step < 3; step += 1) { await target.goBack(); await sleep(900); walkMessages.push(await screenNow()); }
      await openRow(target, `team:${stack.delivery}`);
      await menuOpen(target, 'activity');
      await target.locator(sel('mobile-activity')).waitFor();
      await at('activity');
      await toList(target);
      await target.locator(sel('mobile-new-run-button')).click();
      await target.locator(sel('mobile-new-run')).waitFor();
      await at('new-run');
      await target.locator(sel('mobile-run-target-select-toggle')).click();
      await target.locator(sel('mobile-run-target-select-sheet')).waitFor();
      await at('agent-sheet');
      await target.locator(`${sel('mobile-run-target-select-sheet')} ${sel('mobile-sheet-close')}`).click();
      await target.locator(sel('mobile-new-run-close')).click();
      await target.locator(sel('mobile-node-button')).click();
      await target.locator(sel('mobile-connection-sheet')).waitFor();
      await at('connection-sheet');
      await target.locator(sel('mobile-sheet-close')).click();
      return { screens, walk, walkMessages };
    };
    const results = {};
    results['390x844'] = await tour(page, { width: 390, height: 844 });
    const small = await openPhone({ width: 360, height: 800, storageState: paired, label: 'phone-360' });
    await small.page.goto(`${phoneOrigin()}/mobile`, { waitUntil: 'domcontentloaded' });
    await small.page.locator(sel('mobile-run-tree')).waitFor({ timeout: 60_000 });
    results['360x800'] = await tour(small.page, { width: 360, height: 800 });
    await small.context.close();
    const problems = [];
    for (const [size, result] of Object.entries(results)) {
      for (const [screen, layout] of Object.entries(result.screens)) {
        if (layout.horizontalScroll) problems.push(`${size} ${screen}: horizontal scroll ${layout.scrollWidth}>${layout.clientWidth}`);
        // The Files search field is the spec's 40px field in its 48px bar (Visual Language, Files).
        for (const control of layout.small.filter(entry => !entry.shared && !(screen === 'files-search' && entry.label === 'Search files'))) problems.push(`${size} ${screen}: ${control.label} ${control.size}`);
      }
      if (JSON.stringify(result.walk) !== JSON.stringify(['files', 'run', 'list'])) problems.push(`${size}: Back walk from a file ${JSON.stringify(result.walk)}`);
      if (JSON.stringify(result.walkMessages) !== JSON.stringify(['messages', 'run', 'list'])) problems.push(`${size}: Back walk from a reference ${JSON.stringify(result.walkMessages)}`);
    }
    const sharedSmall = [...new Set(Object.values(results).flatMap(result => Object.values(result.screens).flatMap(layout => layout.small.filter(entry => entry.shared).map(entry => `${entry.label} ${entry.size}`))))];
    assert(problems.length === 0, 'every phone-owned control ≥ 44×44, no horizontal scroll, Back walks the screens', problems);
    return { results, sharedSmall };
  });

  await runCase('MSP-12', async () => {
    await toList(page);
    await sleep(2_000);
    // autobyteus-426 D-09: the poll also reads the delegated rows' states; per window, how many such reads the phone sent.
    const statusReadsIn = {};
    const window = async (label, ms) => { const from = Date.now(); await sleep(ms);
      statusReadsIn[label] = phoneNet.filter(entry => entry.label === 'phone' && entry.op === 'GetAgentRunCollaborationStatuses' && entry.at >= from && entry.at <= from + ms).length;
      return historyReads(entry => entry.label === 'phone' && entry.at >= from).map(entry => ({ dt: entry.at - from, window: entry.window, status: entry.status, bytes: entry.bytes })); };
    const listFrom = Date.now();
    const onList = await window('list', 16_000);
    // autobyteus-426 SR-008: the 5 s poll reads the history only; it never sends the phone's credential check.
    const checksDuringPoll = phoneNet.filter(entry => entry.label === 'phone' && entry.op === 'PhoneCredentialCheck' && entry.at >= listFrom).length;
    await showOlder(page);
    await openRow(page, `agent:${stack.plain[0]}`);
    const onRun = await window('run', 12_000);
    await menuOpen(page, 'activity');
    await page.locator(sel('mobile-activity')).waitFor();
    const onView = await window('view', 11_000);
    const backAt = Date.now();
    await toList(page);
    await sleep(6_500);
    const afterBack = historyReads(entry => entry.label === 'phone' && entry.at >= backAt).map(entry => ({ dt: entry.at - backAt, window: entry.window, status: entry.status, bytes: entry.bytes }));
    // The page hidden (the phone in the background): emulated in this browser; the Android emulator shows the real one.
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
    await sleep(500);
    const hidden = await window('hidden', 12_000);
    const shownAt = Date.now();
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
    const afterShown = await window('shown again', 6_500);
    // QR-003 on this stack: from opening the app to the listed runs.
    const timing = await openPhone({ storageState: paired, label: 'phone-timing' });
    const t0 = Date.now();
    await timing.page.goto(`${phoneOrigin()}/mobile`, { waitUntil: 'commit' });
    await timing.page.locator('[data-test="mobile-run-row"]').first().waitFor({ timeout: 60_000 });
    const firstRowsMs = Date.now() - t0;
    await timing.context.close();
    const all = historyReads();
    const bytes = all.map(entry => entry.bytes).sort((a, b) => a - b);
    evidence.network.historyReads = all.length;
    assert(all.every(entry => entry.window === null), 'every read uses the complete window', [...new Set(all.map(entry => entry.window))]);
    assert(onList.length >= 3 && onList.length <= 4, 'a poll every 5 s on the list', onList);
    assert(checksDuringPoll === 0, 'the poll sends no credential check (autobyteus-426 SR-008)', { checksDuringPoll });
    // (The list count depends on whether a listed run qualifies for the read at this point; MSP-20 measures it on a known hub.)
    assert(statusReadsIn.run === 0 && statusReadsIn.view === 0 && statusReadsIn.hidden === 0,
      'the delegated rows\' status read rides the list poll only: none on the run screen, a view or while hidden (autobyteus-426 D-09, AC-009c)', statusReadsIn);
    assert(onRun.length === 0 && onView.length === 0 && hidden.length === 0, 'no poll on the run screen, a view or while hidden', { onRun, onView, hidden });
    assert(afterBack[0] && afterBack[0].dt <= 2_500 && afterShown[0] && afterShown[0].dt <= 1_500, 'one read at once when the list or the page comes back', { afterBack, afterShown });
    return { checksDuringPoll, statusReadsIn, onList, onRun, onView, afterBack, hidden, afterShown, backAt, shownAt, bytesPerRead: { min: bytes[0], median: bytes[Math.floor(bytes.length / 2)], max: bytes[bytes.length - 1] }, firstRowsMs, reads: all.length };
  });

  await runCase('MSP-20', async () => {
    // autobyteus-426 D-09 (AC-009a…d): the delegated rows of a listed, active Agent run that is not open follow their
    // children's states on each history poll, on the desktop Runs view and the phone list. The poll reads only the states
    // (GetAgentRunCollaborationStatuses); the collaboration view (GetAgentRunCollaboration) is read again only when the
    // children or the run's active state change. A fresh hub run with two delegated children; its children's turns are
    // driven over the hub's collaboration socket, as a second client does (HOLD_TURN keeps a turn running until stopped).
    const STATUS_OP = 'GetAgentRunCollaborationStatuses';
    const VIEW_OP = 'GetAgentRunCollaboration';
    const hubDef = (await alpha.gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}', { i: { name: 'Status Hub',
      role: 'assistant', description: 'Status Hub (phone probe)', instructions: 'Follow the request.', toolNames: [],
      defaultLaunchConfig: { runtimeKind: 'antigravity_cli', llmModelIdentifier: MODEL, llmConfig: null } } })).createAgentDefinition.id;
    const created = (await alpha.gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: hubDef, ...stack.runConfig } })).createAgentRun;
    assert(created.success, created.message);
    const hub = created.runId;
    const serverStatuses = async () => (await alpha.gql('query($ids:[String!]!){agentRunCollaborationStatuses(runIds:$ids){runId isActive statuses{agentRunId status}}}', { ids: [hub] })).agentRunCollaborationStatuses[0];
    const serverStatusOf = async id => (await serverStatuses())?.statuses.find(entry => entry.agentRunId === id)?.status ?? null;
    const delegate = async (recipient, marker) => pickId(await stack.agentCall(hub, 'delegate_task', { recipient_address: recipient, description: `Status child. Marker ${marker}.` }), 'target_agent_run_id');
    const childA = await delegate('/changelog_helper', 'D09-A');
    const childB = await delegate('/release_notes_writer', 'D09-B');
    assert(childA && childB, 'the hub delegated two children', { childA, childB });
    await waitFor('both children idle on the node', async () => ['idle'].includes(String(await serverStatusOf(childA)).toLowerCase())
      && ['idle'].includes(String(await serverStatusOf(childB)).toLowerCase()), 60_000).catch(() => undefined);
    const collab = new PhoneUpstreamWebSocket(ownerSocketUrl(stack.wsUrl(`agent-collaboration/${hub}`)));
    await new Promise((resolve, reject) => { collab.once('open', resolve); collab.once('error', reject); });
    await sleep(800);
    const toChild = (type, target, content) => { const id = randomUUID();
      collab.send(JSON.stringify({ type, payload: { root_subject_kind: 'agent', root_run_id: hub, target_agent_run_id: target, command_id: randomUUID(),
        ...(type === 'SEND_MESSAGE' ? { message_id: id, dedupe_key: `agent_run_input:probe:${id}`, content, context_file_paths: [], image_urls: [] } : {}) } })); };

    // The desktop window (the Runs view) with its GraphQL log: operation, response bytes, the status read's run IDs and body.
    const openDesktop = async () => {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1400 }, locale: 'en-US', timezoneId: 'UTC' });
      await attachToBrowserContext(context);
      await context.addInitScript(() => localStorage.setItem('autobyteus.localization.preference-mode', 'en'));
      const desktopPage = await context.newPage();
      const net = [];
      desktopPage.on('requestfinished', async (request) => {
        if (request.method() !== 'POST' || !request.url().includes('/graphql')) return;
        let op = null; let runIds = null;
        try { const body = JSON.parse(request.postData() ?? '{}'); op = body.operationName ?? /^\s*(?:query|mutation)\s+(\w+)/.exec(body.query ?? '')?.[1] ?? null; runIds = body.variables?.runIds ?? null; } catch { /* not JSON */ }
        const response = await request.response().catch(() => null);
        const body = response ? await response.body().catch(() => null) : null;
        const entry = { at: Date.now(), op, runIds, bytes: body?.length ?? null };
        if (op === STATUS_OP && body) { try { const answers = JSON.parse(String(body)).data?.agentRunCollaborationStatuses ?? []; entry.statuses = answers.reduce((n, a) => n + a.statuses.length, 0);
          const hubAnswer = answers.find(a => a.runId === hub); entry.hubBytes = hubAnswer ? JSON.stringify(hubAnswer).length : null; entry.hubStatuses = hubAnswer?.statuses.length ?? null; } catch { /* not JSON */ } }
        net.push(entry);
      });
      await desktopPage.goto(stack.frontendUrl, { waitUntil: 'domcontentloaded', timeout: 240_000 });
      await desktopRunsView(desktopPage);
      return { context, page: desktopPage, net };
    };
    const desktop = await openDesktop();
    const desktopStatus = id => desktop.page.evaluate((agentRunId) => {
      const row = document.querySelector(`[data-test="run-list-scroll"] [data-agent-run-id="${agentRunId}"]`);
      if (!row) return null;
      const label = row.getAttribute('aria-label') ?? '';
      return /\b(running|idle|offline|error|initializing|uninitialized|stopped)\b/i.exec(label)?.[1]?.toLowerCase() ?? `?${label}`;
    }, id);
    const unfoldDesktopHub = async () => {
      for (let round = 0; round < 4; round += 1) {
        for (const handle of await desktop.page.locator(`[data-test="run-list-row"][data-run-id="${hub}"] [aria-expanded="false"]`).all()) await handle.click({ timeout: 1_500 }).catch(() => undefined);
        await sleep(400);
      }
    };
    // The phone: its list with the hub unfolded.
    await toList(page);
    const hubKey = `agent:${hub}`;
    await waitFor('the hub on the phone list', async () => (await page.locator(rowSel(hubKey)).count()) > 0, 30_000);
    await ensureUnfolded(page, hubKey);
    const phoneStatus = async id => (await rowsOf(page)).find(row => row.key === `${hubKey}/agent:${id}`)?.status ?? null;
    await waitFor('the desktop hub row', async () => (await desktop.page.locator(`[data-test="run-list-row"][data-run-id="${hub}"]`).count()) > 0, 30_000);
    await unfoldDesktopHub();
    await waitFor('both children on both surfaces', async () => [await desktopStatus(childA), await desktopStatus(childB), await phoneStatus(childA), await phoneStatus(childB)].every(Boolean), 30_000).catch(() => undefined);
    await shot(desktop.page, 'MSP-20-desktop-two-children');
    await shot(page, 'MSP-20-phone-two-children');

    const desktopOps = (from, to = Date.now()) => desktop.net.filter(entry => entry.at >= from && entry.at <= to);
    const phoneOps = (from, to = Date.now()) => phoneNet.filter(entry => entry.label === 'phone' && entry.at >= from && entry.at <= to);
    const count = (ops, op) => ops.filter(entry => entry.op === op).length;
    /** Waits until the node, the desktop row and the phone row show `want`; returns when each did (ms after the node). */
    const follow = async (label, id, want, trigger, budget = 20_000) => {
      const start = Date.now();
      await trigger();
      let nodeAt = null; let desktopAt = null; let phoneAt = null;
      const deadline = Date.now() + budget;
      while (Date.now() < deadline && (nodeAt === null || desktopAt === null || phoneAt === null)) {
        if (nodeAt === null && String(await serverStatusOf(id)).toLowerCase() === want) nodeAt = Date.now();
        if (desktopAt === null && await desktopStatus(id) === want) desktopAt = Date.now();
        if (phoneAt === null && String(await phoneStatus(id)).toLowerCase() === want) phoneAt = Date.now();
        await sleep(200);
      }
      const end = Date.now();
      return { label, want, nodeMs: nodeAt && nodeAt - start, desktopAfterNodeMs: nodeAt && desktopAt ? desktopAt - nodeAt : null, phoneAfterNodeMs: nodeAt && phoneAt ? phoneAt - nodeAt : null,
        desktopViewReads: count(desktopOps(start, end), VIEW_OP), phoneViewReads: count(phoneOps(start, end), VIEW_OP),
        desktopStatusReads: count(desktopOps(start, end), STATUS_OP), phoneStatusReads: count(phoneOps(start, end), STATUS_OP) };
    };

    // (1) No change: three polls; status reads only, no view read; the bytes of each status read.
    const quietFrom = Date.now();
    await sleep(15_500);
    const quietDesktop = desktopOps(quietFrom);
    const quietPhone = phoneOps(quietFrom);
    const quiet = { desktopStatusReads: count(quietDesktop, STATUS_OP), desktopViewReads: count(quietDesktop, VIEW_OP),
      phoneStatusReads: count(quietPhone, STATUS_OP), phoneViewReads: count(quietPhone, VIEW_OP),
      desktopStatusBytes: quietDesktop.filter(entry => entry.op === STATUS_OP).map(entry => ({ bytes: entry.bytes, statuses: entry.statuses, hubBytes: entry.hubBytes, hubStatuses: entry.hubStatuses, runIds: entry.runIds?.length ?? null })),
      phoneStatusBytes: quietPhone.filter(entry => entry.op === STATUS_OP).map(entry => entry.bytes),
      hubInDesktopRead: quietDesktop.filter(entry => entry.op === STATUS_OP).every(entry => entry.runIds?.includes(hub)),
      hubInPhoneRead: quietPhone.filter(entry => entry.op === STATUS_OP).every(entry => entry.runIds?.includes(hub)) };
    // (2) The phone list hidden (a run screen) and the page in the background: no status read (AC-009c).
    await showOlder(page);
    const otherKey = (await rowsOf(page)).find(row => row.depth === 0 && !row.key.includes(hub))?.key;
    const hiddenFrom = Date.now();
    await openRow(page, otherKey);
    await sleep(11_000);
    const onRunScreen = count(phoneOps(hiddenFrom), STATUS_OP);
    await page.locator(sel('mobile-run-back')).first().click();
    await page.locator(`${sel('mobile-run-tree')}:visible`).waitFor();
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
    await sleep(500);
    const backgroundFrom = Date.now();
    await sleep(11_000);
    const inBackground = count(phoneOps(backgroundFrom), STATUS_OP);
    const shownAt = Date.now();
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
    await waitFor('a status read once the list shows again', async () => count(phoneOps(shownAt), STATUS_OP) > 0, 8_000).catch(() => undefined);
    const firstAfterShown = phoneOps(shownAt).find(entry => entry.op === STATUS_OP);
    const phoneHidden = { otherKey, onRunScreen, inBackground, firstReadAfterShownMs: firstAfterShown ? firstAfterShown.at - shownAt : null };
    await ensureUnfolded(page, hubKey);
    // (3) A child idle → running → idle: one long tool call (the scripted CLI waits `delayMs`, then calls the tool and
    // ends its turn normally), so the turn runs for about 14 s and then the child is idle.
    const longStep = `CALL_TOOLS:${JSON.stringify([{ name: 'send_message_to', arguments: { target_agent_run_id: hub, content: 'Done after the long step.' }, delayMs: 14_000 }])}`;
    const running = await follow('child A running', childA, 'running', async () => toChild('SEND_MESSAGE', childA, longStep));
    await shot(desktop.page, 'MSP-20-desktop-child-running');
    await shot(page, 'MSP-20-phone-child-running');
    const idleAgain = await follow('child A idle again', childA, 'idle', async () => undefined, 40_000);
    // (4) The open run is not in the status read (AC-009d): a second desktop window opens the hub.
    const opener = await openDesktop();
    await opener.page.locator(`[data-test="run-list-row"][data-run-id="${hub}"] [data-test="workspace-agent-run-row"]`).first().click();
    await waitFor('the hub open in that window', async () => new URL(opener.page.url()).searchParams.get('id') === hub, 30_000).catch(() => undefined);
    const openedFrom = Date.now() + 2_000;
    await sleep(13_000);
    const openedReads = opener.net.filter(entry => entry.at >= openedFrom && entry.op === STATUS_OP);
    const openRun = { url: opener.page.url().replace(stack.frontendUrl, ''), statusReads: openedReads.length, hubInRead: openedReads.filter(entry => entry.runIds?.includes(hub)).length };
    await shot(opener.page, 'MSP-20-desktop-hub-open');
    await opener.context.close();
    // (5) A third child appears.
    let childC = null;
    const thirdFrom = Date.now();
    const third = await (async () => {
      childC = await delegate('/changelog_helper', 'D09-C');
      const nodeAt = Date.now();
      let desktopAt = null; let phoneAt = null;
      while (Date.now() < nodeAt + 20_000 && (desktopAt === null || phoneAt === null)) {
        if (desktopAt === null) { await unfoldDesktopHub().catch(() => undefined); if (await desktopStatus(childC)) desktopAt = Date.now(); }
        if (phoneAt === null && await phoneStatus(childC)) phoneAt = Date.now();
        await sleep(200);
      }
      await sleep(6_000);
      const ops = { desktop: desktopOps(thirdFrom), phone: phoneOps(thirdFrom) };
      return { childC, desktopAfterNodeMs: desktopAt && desktopAt - nodeAt, phoneAfterNodeMs: phoneAt && phoneAt - nodeAt,
        desktopViewReads: count(ops.desktop, VIEW_OP), phoneViewReads: count(ops.phone, VIEW_OP) };
    })();
    await shot(desktop.page, 'MSP-20-desktop-third-child');
    await shot(page, 'MSP-20-phone-third-child');
    // (6) The run stops: its rows show offline.
    const stopFrom = Date.now();
    const stopped = (await alpha.gql('mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}', { id: hub })).terminateAgentRun;
    const stopAt = Date.now();
    let offline = { desktop: null, phone: null };
    while (Date.now() < stopAt + 20_000 && (offline.desktop === null || offline.phone === null)) {
      if (offline.desktop === null && [childA, childB, childC].every(Boolean) && (await Promise.all([childA, childB, childC].map(desktopStatus))).every(status => status === 'offline')) offline.desktop = Date.now() - stopAt;
      if (offline.phone === null && (await Promise.all([childA, childB, childC].map(phoneStatus))).every(status => String(status).toLowerCase() === 'offline')) offline.phone = Date.now() - stopAt;
      await sleep(200);
    }
    await sleep(6_000);
    const stopOps = { desktop: desktopOps(stopFrom), phone: phoneOps(stopFrom) };
    const stop = { success: stopped.success, desktopOfflineMs: offline.desktop, phoneOfflineMs: offline.phone,
      desktopViewReads: count(stopOps.desktop, VIEW_OP), phoneViewReads: count(stopOps.phone, VIEW_OP),
      finalDesktop: await Promise.all([childA, childB, childC].map(desktopStatus)), finalPhone: await Promise.all([childA, childB, childC].map(phoneStatus)) };
    await shot(desktop.page, 'MSP-20-desktop-stopped');
    await shot(page, 'MSP-20-phone-stopped');
    collab.close();
    await desktop.context.close();
    const ONE_POLL = 7_000; const TWO_POLLS = 12_000;
    const facts = { hub, childA, childB, childC, quiet, phoneHidden, running, idleAgain, openRun, third, stop };
    const failures = [
      [quiet.desktopStatusReads >= 2 && quiet.phoneStatusReads >= 2 && quiet.desktopViewReads === 0 && quiet.phoneViewReads === 0, 'no change: a status read on each poll and no view read (AC-009a)'],
      [quiet.hubInDesktopRead && quiet.hubInPhoneRead, 'the listed hub is in each status read'],
      [phoneHidden.onRunScreen === 0 && phoneHidden.inBackground === 0 && phoneHidden.firstReadAfterShownMs !== null && phoneHidden.firstReadAfterShownMs <= 6_000, 'the phone sends no status read while its list is hidden or the page is in the background, and reads again once shown (AC-009c)'],
      [quiet.desktopStatusBytes.every(entry => entry.hubBytes !== null && entry.hubBytes <= 2_048 && (entry.statuses > 10 || entry.bytes <= 2_048)), 'a status read carries only states: the hub\'s answer and any read of ≤ 10 children ≤ 2 KB (AC-009a)'],
      [running.desktopAfterNodeMs !== null && running.desktopAfterNodeMs <= TWO_POLLS && running.phoneAfterNodeMs !== null && running.phoneAfterNodeMs <= ONE_POLL, 'running shows within ≤ 2 polls on the desktop and one on the phone (AC-009a, AC-009c)'],
      [idleAgain.desktopAfterNodeMs !== null && idleAgain.desktopAfterNodeMs <= TWO_POLLS && idleAgain.phoneAfterNodeMs !== null && idleAgain.phoneAfterNodeMs <= ONE_POLL, 'idle again shows within ≤ 2 polls on the desktop and one on the phone'],
      [running.desktopViewReads === 0 && running.phoneViewReads === 0 && idleAgain.desktopViewReads === 0 && idleAgain.phoneViewReads === 0, 'a state change alone causes no view read'],
      [openRun.statusReads === 0 || openRun.hubInRead === 0, 'the open run is not in the status read (AC-009d)'],
      [third.desktopAfterNodeMs !== null && third.desktopAfterNodeMs <= ONE_POLL && third.phoneAfterNodeMs !== null && third.phoneAfterNodeMs <= ONE_POLL && third.desktopViewReads === 1 && third.phoneViewReads === 1, 'a third child appears within one poll with one view re-read on each surface (AC-009b)'],
      [stop.success && stop.desktopOfflineMs !== null && stop.desktopOfflineMs <= ONE_POLL && stop.phoneOfflineMs !== null && stop.phoneOfflineMs <= ONE_POLL, 'after the run stops, its rows show offline within one poll (AC-009b)'],
    ].filter(([ok]) => !ok).map(([, label]) => label);
    assert(failures.length === 0, failures.join('; '), facts);
    return facts;
  });

  await runCase('MSP-09', async () => {
    await toList(page);
    await page.locator(sel('mobile-node-button')).click();
    const sheet = page.locator(sel('mobile-connection-sheet'));
    await sheet.waitFor();
    await sleep(2_500);
    const check = page.locator(sel('mobile-check-connection'));
    const checkControl = async () => ({ label: await check.getAttribute('aria-label'), text: (await check.innerText()).trim() });
    const dialogName = await page.evaluate(() => { const d = document.querySelector('[data-testid="mobile-connection-sheet"] [role="dialog"], [data-testid="mobile-connection-sheet"][role="dialog"]'); const id = d?.getAttribute('aria-labelledby'); return id ? document.getElementById(id)?.textContent?.trim() : null; });
    const sheetText = (await sheet.innerText()).replace(/\s+/g, ' ');
    // autobyteus-433: the sheet names the node and shows no part of the phone's address (host, port, URL).
    const addressIn = text => [PHONE_HOST, `:${alpha.port}`, '://'].filter(part => text.includes(part));
    const info = { name: (await page.locator(sel('mobile-connection-name')).innerText()).trim(), urlLines: await page.locator(sel('mobile-connection-url')).count(), addressShown: addressIn(sheetText),
      status: (await page.locator(sel('mobile-connection-status')).innerText()).trim(), peerRows: await page.locator(sel('mobile-peer')).count(), mentionsPeer: sheetText.includes(PEER),
      check: await checkControl(), switchNode: await page.locator(sel('mobile-switch-node')).count(), unpair: (await page.locator(sel('mobile-unpair')).innerText()).trim() };
    await check.click();
    await sleep(1_500);
    const afterCheck = (await page.locator(sel('mobile-connection-status')).innerText()).trim();
    await shot(page, 'MSP-09-connection-sheet');
    // The paired node down: the refresh icon checks, the sheet says not reachable and offers "Retry".
    await alpha.stop();
    await check.click();
    await waitFor('not reachable in the sheet', async () => /not reachable/i.test(await page.locator(sel('mobile-connection-status')).innerText()), 30_000).catch(() => undefined);
    await waitFor('Retry in the sheet', async () => (await checkControl()).text === 'Retry', 30_000).catch(() => undefined);
    const sheetDown = (await page.locator(sel('mobile-connection-status')).innerText()).trim();
    const addressShownDown = addressIn((await sheet.innerText()).replace(/\s+/g, ' '));
    const checkDown = await checkControl();
    await shot(page, 'MSP-09-sheet-not-reachable');
    await page.locator(sel('mobile-sheet-close')).click();
    const barDown = (await page.locator(sel('mobile-node-state')).innerText()).trim();
    const bannerDown = (await page.locator(sel('mobile-node-offline-banner')).innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    const rowsWhileDown = (await rowsOf(page)).length;
    await shot(page, 'MSP-09-node-down');
    // The node back: the poll lists the runs meanwhile (C-06), Retry clears the bar and the banner.
    await alpha.start();
    await sleep(12_000);
    const c06 = { bar: (await page.locator(sel('mobile-node-state')).innerText()).trim(), banner: await page.locator(sel('mobile-node-offline-banner')).count(), rows: (await rowsOf(page)).length,
      pollsAfterBack: historyReads(entry => entry.label === 'phone' && entry.case === 'MSP-09' && entry.status === 200).length };
    await (c06.banner ? page.locator(sel('mobile-node-offline-check')) : page.locator(sel('mobile-node-button'))).click();
    await sheet.waitFor();
    await check.click();
    await waitFor('connected again', async () => /connected/i.test(await page.locator(sel('mobile-connection-status')).innerText()), 30_000).catch(() => undefined);
    const sheetBack = (await page.locator(sel('mobile-connection-status')).innerText()).trim();
    const checkBack = await checkControl();
    await page.locator(sel('mobile-sheet-close')).click();
    const barBack = (await page.locator(sel('mobile-node-state')).innerText()).trim();
    const bannerBack = await page.locator(sel('mobile-node-offline-banner')).count();
    // A browser on another phone opens a pairing link (AC-015): the node's name, one tap, the app offered; then unpair.
    const other = await openPhone({ label: 'phone-unpair' });
    await other.page.goto(await pairingFor(phoneOrigin()), { waitUntil: 'domcontentloaded', timeout: 120_000 });
    const pairButton = other.page.locator(sel('mobile-pair-button'));
    await pairButton.waitFor({ timeout: 60_000 });
    const pairingPage = { name: (await other.page.locator(sel('mobile-pairing-node-name')).innerText()).trim(), button: (await pairButton.innerText()).trim(),
      getApp: await other.page.locator(sel('mobile-get-app')).getAttribute('href'), visibleInputs: await other.page.locator('input:visible, textarea:visible').count() };
    await shot(other.page, 'MSP-09-browser-pairing-page');
    await pairButton.click();
    await other.page.locator(sel('mobile-run-tree')).waitFor({ timeout: 60_000 });
    const pairedSession = await other.page.evaluate(() => { try { const s = JSON.parse(localStorage.getItem('autobyteus.remote_access.mobile_session') ?? 'null'); return s ? { nodeName: s.nodeName ?? null, hasCredential: Boolean(s.credential ?? s.token ?? s.accessToken) } : null; } catch { return 'unreadable'; } });
    await other.page.locator(sel('mobile-node-button')).click();
    const otherUnpair = (await other.page.locator(sel('mobile-unpair')).innerText()).trim();
    await other.page.locator(sel('mobile-unpair')).click();
    await other.page.locator(sel('mobile-unpair-confirm')).waitFor();
    const confirmText = (await other.page.locator(sel('mobile-unpair-confirm')).innerText()).replace(/\s+/g, ' ').trim();
    await shot(other.page, 'MSP-09-unpair-confirm');
    const unpairButton = other.page.locator(sel('mobile-unpair-confirm')).getByRole('button', { name: 'Unpair', exact: true });
    // What a tap at the button's center hits: the confirmation's button, or something on top of it.
    const confirmOnTop = await unpairButton.evaluate(button => { const r = button.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { onTop: button.contains(hit), hit: hit ? (hit.getAttribute('data-testid') || hit.textContent.trim().slice(0, 40)) : null }; });
    if (confirmOnTop.onTop) await unpairButton.click(); else await unpairButton.dispatchEvent('click');
    await other.page.locator(sel('mobile-pairing-bootstrap')).waitFor({ timeout: 20_000 });
    const sessionLeft = await other.page.evaluate(() => localStorage.getItem('autobyteus.remote_access.mobile_session'));
    await shot(other.page, 'MSP-09-after-unpair');
    await other.context.close();
    const statusFields = evidence.servers.alpha?.statusFields ?? [];
    const facts = { dialogName, info, afterCheck, sheetDown, addressShownDown, checkDown, barDown, bannerDown, rowsWhileDown, c06, sheetBack, checkBack, barBack, bannerBack, pairingPage, pairedSession, otherUnpair, confirmText, confirmOnTop, sessionLeft, statusFields };
    const failures = [
      [dialogName === info.name && info.name === ALPHA_NAME && !statusFields.includes('serverName'), 'the sheet is named by the name in the pairing code; the status carries no name'],
      [info.urlLines === 0 && info.addressShown.length === 0 && addressShownDown.length === 0, 'no address in the sheet, connected or not reachable (autobyteus-433 AC-002)'],
      [/connected/i.test(info.status) && /connected/i.test(afterCheck), 'state and the refresh check'],
      [info.check.label === 'Check connection' && info.check.text === '' && checkBack.label === 'Check connection', 'a refresh icon while connected (AC-016)'],
      [info.peerRows === 0 && !info.mentionsPeer, 'no peer list in the sheet (REQ-019)'],
      [info.switchNode === 0 && info.unpair === `Unpair from ${ALPHA_NAME}`, 'no Switch node in a browser; "Unpair from <node>" (DEC-018)'],
      [/not reachable/i.test(sheetDown) && checkDown.text === 'Retry' && checkDown.label === null, '"Retry" when not reachable (AC-016)'],
      [barDown === 'Not reachable' && bannerDown.startsWith(`Can’t reach ${info.name}.`) && bannerDown.includes('Check'), 'the node down: the bar and the banner'],
      [rowsWhileDown > 0, 'the runs as last loaded stay'],
      [/connected/i.test(sheetBack) && barBack === 'Connected' && bannerBack === 0, 'Retry clears the bar and the banner'],
      [pairingPage.name === ALPHA_NAME && pairingPage.button === `Connect to ${ALPHA_NAME}` && /github\.com\/AutoByteus\/autobyteus-workspace\/releases/.test(pairingPage.getApp ?? '') && pairingPage.visibleInputs === 0, 'the browser pairing page: name, one "Connect to <name>" tap, the app offered, no name field (AC-015)'],
      [pairedSession?.nodeName === ALPHA_NAME, 'the page session keeps the node name'],
      [otherUnpair === `Unpair from ${ALPHA_NAME}` && confirmText.includes('Unpair this phone?') && confirmOnTop.onTop && sessionLeft === null, 'unpair: the confirmation on top, then the pairing screen'],
    ].filter(([ok]) => !ok).map(([, label]) => label);
    assert(failures.length === 0, failures.join('; '), facts);
    return facts;
  });

  await runCase('MSP-19', async () => {
    // autobyteus-426 D-01: the definitions feed is open only while the phone is paired, to its node with the credential.
    const feed = await openPhone({ label: 'phone-feed' });
    const otherSockets = [];
    feed.page.on('websocket', ws => { if (!ws.url().startsWith(phoneOrigin().replace(/^http/, 'ws'))) otherSockets.push({ url: redact(ws.url()), at: Date.now() }); });
    const mine = () => phoneSockets.filter(socket => socket.label === 'phone-feed');
    const feedSockets = () => mine().filter(socket => new URL(socket.url).pathname === '/ws/agent-package-definitions');
    const describe = socket => ({ path: new URL(socket.url).pathname, host: new URL(socket.url).host, accessToken: new URL(socket.url).searchParams.has('access_token'),
      openSeconds: socket.closedAt ? Math.round((socket.closedAt - socket.at) / 100) / 10 : null });
    // (1) Not paired: the pairing screen for 30 s.
    await feed.page.goto(`${phoneOrigin()}/mobile`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await feed.page.locator(sel('mobile-pairing-bootstrap')).waitFor({ timeout: 60_000 });
    await sleep(30_000);
    const unpaired = { node: mine().map(describe), other: otherSockets.slice() };
    await shot(feed.page, 'MSP-19-unpaired');
    // (2) Paired: one feed socket to the paired node with the credential.
    await feed.page.goto(await pairingFor(phoneOrigin()), { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await feed.page.locator(sel('mobile-pair-button')).click({ timeout: 60_000 });
    await feed.page.locator(sel('mobile-run-tree')).waitFor({ timeout: 60_000 });
    await waitFor('the feed socket', async () => feedSockets().length > 0, 20_000).catch(() => undefined);
    await sleep(5_000);
    const paired = { feed: feedSockets().map(describe), feedHosts: [...new Set(feedSockets().map(socket => new URL(socket.url).host))], other: otherSockets.slice() };
    // (3) Unpaired by the user: the feed closes and is not opened again.
    await feed.page.locator(sel('mobile-node-button')).click();
    await feed.page.locator(sel('mobile-unpair')).click();
    await feed.page.locator(sel('mobile-unpair-confirm')).waitFor();
    const unpairButton = feed.page.locator(sel('mobile-unpair-confirm')).getByRole('button', { name: 'Unpair', exact: true });
    const onTop = await unpairButton.evaluate(button => { const r = button.getBoundingClientRect(); return button.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)); });
    if (onTop) await unpairButton.click(); else await unpairButton.dispatchEvent('click');
    await feed.page.locator(sel('mobile-pairing-bootstrap')).waitFor({ timeout: 20_000 });
    const unpairAt = Date.now();
    await sleep(20_000);
    const afterUnpair = { feedStillOpen: feedSockets().filter(socket => socket.closedAt === null).length, feedOpenedAfter: feedSockets().filter(socket => socket.at > unpairAt).length,
      nodeSocketsOpenedAfter: mine().filter(socket => socket.at > unpairAt).map(describe), other: otherSockets.slice() };
    await shot(feed.page, 'MSP-19-after-unpair');
    await feed.context.close();
    // The desktop window of the same node still opens the feed.
    const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US', timezoneId: 'UTC' });
    await attachToBrowserContext(desktopContext);
    const desktop = await desktopContext.newPage();
    const desktopFeed = [];
    desktop.on('websocket', ws => { if (ws.url().includes('/ws/agent-package-definitions')) desktopFeed.push(redact(ws.url())); });
    await desktop.goto(stack.frontendUrl, { waitUntil: 'domcontentloaded', timeout: 240_000 });
    await waitFor('the desktop window\'s feed socket', async () => desktopFeed.length > 0, 60_000).catch(() => undefined);
    await desktopContext.close();
    const facts = { unpaired, paired, afterUnpair, desktopFeed: desktopFeed.length };
    const failures = [
      [unpaired.node.length === 0 && unpaired.other.length === 0, 'no WebSocket attempt to any address while not paired (30 s)'],
      [paired.feed.length === 1 && paired.feed[0].accessToken && paired.feedHosts[0] === new URL(phoneOrigin()).host && paired.other.length === 0, 'after pairing: one feed socket to the paired node with access_token'],
      [afterUnpair.feedStillOpen === 0 && afterUnpair.feedOpenedAfter === 0 && afterUnpair.other.length === 0, 'after unpair: the feed closed and not retried'],
      [desktopFeed.length > 0, 'the desktop window still opens the feed'],
    ].filter(([ok]) => !ok).map(([, label]) => label);
    assert(failures.length === 0, failures.join('; '), facts);
    return facts;
  });

  await runCase('MSP-17', async () => {
    // autobyteus-426 D-19: a read-only conversation on the phone shows why a file link did not open. The phone's read-only
    // conversations are an Org's delegated work: here a task agent of an Org run that was then stopped on the node.
    const outsidePath = path.join(path.dirname(stack.workspace), 'outside-426', 'old-notes.txt');
    await fs.mkdir(path.dirname(outsidePath), { recursive: true });
    await fs.writeFile(outsidePath, 'OUTSIDE-TEXT-4260 opens read-only on the phone.\n');
    const marker = 'FILE-LINK-426-RO';
    const created = (await alpha.gql('mutation($i:CreateAgentOrgRunInput!){createAgentOrgRun(input:$i){success message agentOrgRunId}}',
      { i: { agentOrgDefinitionId: stack.ids.org, rootConfiguration: stack.runConfig, agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
    assert(created.success, created.message);
    const orgRunId = created.agentOrgRunId;
    const orgTree = async () => (await alpha.gql('query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}', { id: orgRunId })).getAgentOrgRunConfig.executionTree;
    const planner = (await orgTree()).rootOrg.members.find(member => member.address === '/planner')?.agentRunId;
    assert(planner, 'the Org\'s planner');
    await sendOver(stack.wsUrl(`agent-org/${orgRunId}`), { root_subject_kind: 'agent_org', root_run_id: orgRunId, target_agent_run_id: planner,
      command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(), context_file_paths: [], image_urls: [],
      content: callTool('delegate_task', { recipient_address: '/changelog_helper', description: `ECHO_INPUT ${marker} The old notes are in [old-notes.txt](${outsidePath}).` }) });
    let task = null;
    await waitFor('the Org\'s task agent', async () => (task = treeNodes(await orgTree()).find(node => node.agentRunId && /changelog_helper/.test(node.address ?? '')) ?? null) !== null, 60_000);
    let echoed = false;
    await waitFor('the task agent\'s answer naming the file', async () => (echoed = await storedHas(alpha, { orgRunId, memberAddress: task.address, agentRunId: task.agentRunId }, `ECHO:`)), 60_000).catch(() => undefined);
    const terminated = (await alpha.gql('mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success message}}', { id: orgRunId })).terminateAgentOrgRun;
    assert(terminated.success, terminated.message);
    // The phone: the stopped Org's task agent.
    await toList(page);
    const taskKeyIn = rows => rows.find(row => row.key.endsWith(`agent:${task.agentRunId}`))?.key ?? null;
    let taskKey = null;
    await waitFor('the task agent\'s row', async () => {
      await showOlder(page);
      const rows = await rowsOf(page);
      for (const row of rows.filter(entry => entry.key.includes(orgRunId) && entry.expanded === 'false')) {
        await page.locator(`${rowSel(row.key)} ${sel('mobile-run-toggle')}`).click().catch(() => undefined);
      }
      return (taskKey = taskKeyIn(await rowsOf(page))) !== null;
    }, 45_000);
    await openRow(page, taskKey);
    const conversation = page.locator(sel('mobile-run-conversation'));
    const control = conversation.locator(`[data-event-monitor-file-action-control="true"][title="${outsidePath}"]`);
    await control.first().waitFor({ timeout: 30_000 }).catch(() => undefined);
    const before = { links: await control.count(), composer: await page.locator(`${sel('mobile-run-conversation')} textarea`).count(),
      status: await page.locator(sel('event-monitor-file-preview-status')).count() };
    await shot(page, 'MSP-17-read-only-conversation');
    const urlBefore = page.url();
    if (before.links) { await control.last().scrollIntoViewIfNeeded(); await control.last().tap(); }
    // autobyteus-436: the file opens read-only by its absolute path, from a read-only conversation too.
    const roViewer = page.locator(sel('mobile-file-viewer'));
    await roViewer.waitFor({ timeout: 15_000 }).catch(() => undefined);
    await waitFor('the file in the viewer', async () => (await roViewer.innerText().catch(() => '')).includes('OUTSIDE-TEXT-4260'), 15_000).catch(() => undefined);
    const after = { status: await page.locator(sel('event-monitor-file-preview-status')).count(),
      composer: await page.locator(`${sel('mobile-run-conversation')} textarea`).count(), urlChanged: page.url() !== urlBefore,
      nodeFile: new URL(page.url()).searchParams.get('nodeFile'), viewer: await roViewer.count(),
      text: (await roViewer.innerText().catch(() => '')).includes('OUTSIDE-TEXT-4260') };
    await shot(page, 'MSP-17-read-only-status');
    // The system Back closes the full-screen file first (its own entry).
    if (after.viewer) {
      await page.goBack();
      await waitFor('the read-only conversation again', async () => (await roViewer.count()) === 0, 15_000).catch(() => undefined);
    }
    // ← back to the list (recorded; the next cases start from the list).
    const backs = [];
    for (let step = 0; step < 4 && !(await page.locator(`${sel('mobile-run-list')}:visible`).count()); step += 1) {
      const back = page.locator(`${sel('mobile-run-back')}:visible, ${sel('mobile-screen-back')}:visible`).first();
      backs.push({ step, count: await back.count(), enabled: await back.isEnabled().catch(() => null), screen: (await runScreen(page)).state, query: (await runScreen(page)).query });
      if (!(await back.count())) break;
      await back.click({ timeout: 10_000 }).catch(error => backs.push({ step, clickError: error.message.split('\n')[0] }));
      await sleep(1_000);
    }
    const backToList = { backs, list: await page.locator(`${sel('mobile-run-list')}:visible`).count() };
    await shot(page, 'MSP-17-after-back');
    const facts = { orgRunId, task, echoed, terminated: terminated.success, taskKey, before, after, backToList };
    assert(before.links >= 1 && before.composer === 0 && before.status === 0, 'the read-only conversation: the file link, no composer, no status yet', facts);
    assert(after.status === 0 && after.composer === 0 && after.urlChanged && after.nodeFile === outsidePath && after.viewer === 1 && after.text,
      'a tap on a file outside the workspace opens it read-only (autobyteus-436); still no composer', facts);
    return facts;
  });

  await runCase('MSP-18', async () => {
    // autobyteus-426 D-02: Phone Access turned off on the node keeps the phone paired; the bar and the banner say so; once
    // it is on again, Check loads the runs without pairing again. Off, then the node stopped: "Can’t reach" (off → unreachable).
    await shot(page, 'MSP-18-start');
    let reopened = false;
    await toList(page).catch(async () => { reopened = true; await page.goto(`${phoneOrigin()}/mobile`, { waitUntil: 'domcontentloaded' }); await page.locator(sel('mobile-run-tree')).waitFor({ timeout: 60_000 }); });
    const session = (p = page) => p.evaluate(() => { try { return JSON.parse(localStorage.getItem('autobyteus.remote_access.mobile_session') ?? 'null')?.credential ?? null; } catch { return 'unreadable'; } });
    const credentialBefore = await session();
    /** The connection sheet's check (the banner's Check opens the same sheet), until the bar reads `until` (30 s at most). */
    const check = async (p, until) => {
      if (!(await p.locator(sel('mobile-connection-sheet')).count())) {
        if (await p.locator(sel('mobile-node-offline-check')).count()) await p.locator(sel('mobile-node-offline-check')).click();
        else await p.locator(sel('mobile-node-button')).click();
      }
      await p.locator(sel('mobile-connection-sheet')).waitFor();
      await p.locator(sel('mobile-check-connection')).click();
      await waitFor(`the bar to read ${until}`, async () => (await p.locator(sel('mobile-node-state')).innerText()).trim() === until, 30_000).catch(() => undefined);
      const sheetStatus = (await p.locator(sel('mobile-connection-status')).innerText().catch(() => '')).trim();
      if (await p.locator(sel('mobile-connection-sheet')).count()) await p.locator(sel('mobile-sheet-close')).click();
      await sleep(500);
      return sheetStatus;
    };
    const state = async (p = page) => ({ bar: (await p.locator(sel('mobile-node-state')).innerText().catch(() => '')).trim(),
      banner: (await p.locator(sel('mobile-node-offline-banner')).innerText().catch(() => '')).replace(/\s+/g, ' ').trim(),
      bannerConnection: await p.locator(sel('mobile-node-offline-banner')).getAttribute('data-connection').catch(() => null),
      bannerCheck: await p.locator(sel('mobile-node-offline-check')).count(), rows: (await rowsOf(p)).length,
      listError: await p.locator(sel('mobile-run-list-error')).count(), pairing: await p.locator(sel('mobile-pairing-bootstrap')).count() });
    const setPhoneAccess = async enabled => { const response = await alpha.rest('PUT', '/remote-access/settings', { phoneAccessEnabled: enabled }); assert(response.status === 200, `Phone Access ${enabled}`, response); };
    /** A start of the phone (the same paired storage) while the node is as it is now: the check on opening. */
    const startPhone = async label => {
      const started = await openPhone({ storageState: await phone.context.storageState(), label });
      await started.page.goto(`${phoneOrigin()}/mobile`, { waitUntil: 'domcontentloaded' });
      await waitFor('the first check', async () => (await started.page.locator(sel('mobile-node-offline-banner')).count()) > 0
        || (await started.page.locator(sel('mobile-pairing-bootstrap')).count()) > 0 || (await rowsOf(started.page)).length > 0, 60_000).catch(() => undefined);
      await sleep(2_000);
      return started;
    };
    // (1) The open phone, its runs listed: Phone Access off, then its Check.
    await setPhoneAccess(false);
    const openSheet = await check(page, 'Phone access off');
    const openCheck = { ...(await state()), sheet: openSheet, credentialKept: (await session()) === credentialBefore };
    await shot(page, 'MSP-18-open-phone-check-while-off');
    // (2) A start of the phone while off: the check on opening.
    const later = await startPhone('phone-off-start');
    const offStart = { ...(await state(later.page)), credentialKept: (await session(later.page)) === credentialBefore };
    await shot(later.page, 'MSP-18-phone-access-off-on-opening');
    // (3) On again: that phone's banner Check → the sheet's check → Connected, its runs listed, the same credential.
    await setPhoneAccess(true);
    const onSheet = await check(later.page, 'Connected');
    const on = { ...(await state(later.page)), sheet: onSheet, credentialKept: (await session(later.page)) === credentialBefore };
    await shot(later.page, 'MSP-18-phone-access-on-again');
    await later.context.close();
    // (4) Off (a start shows it), then the node stopped: that phone's Check shows "Can’t reach", not the off banner.
    await setPhoneAccess(false);
    const down = await startPhone('phone-off-then-down');
    const offBeforeDown = await state(down.page);
    await alpha.stop();
    const downSheet = await check(down.page, 'Not reachable');
    const offThenDown = { ...(await state(down.page)), sheet: downSheet };
    await shot(down.page, 'MSP-18-off-then-unreachable');
    await alpha.start();
    await setPhoneAccess(true);
    const backSheet = await check(down.page, 'Connected');
    const back = { ...(await state(down.page)), sheet: backSheet, credentialKept: (await session(down.page)) === credentialBefore };
    await down.context.close();
    // The open phone again, Phone Access on: Connected.
    await check(page, 'Connected');
    const offBanner = `${ALPHA_NAME} is reachable, but Phone access is off. Check`;
    // The phone's own credential check decides each outcome (autobyteus-426 SR-008): which answer each check got.
    const credentialChecks = phoneNet.filter(entry => entry.case === 'MSP-18' && entry.op === 'PhoneCredentialCheck').map(entry => `${entry.label} ${entry.status}`);
    const facts = { reopened, openCheck, offStart, on, offBeforeDown, offThenDown, back, credentialChecks };
    const failures = [
      [openCheck.bar === 'Phone access off' && openCheck.banner === offBanner && openCheck.bannerConnection === 'phone_access_off' && openCheck.credentialKept && openCheck.pairing === 0, 'off: the open phone\'s Check (runs listed) shows the bar and the banner, the session kept'],
      [offStart.bar === 'Phone access off' && offStart.banner === offBanner && offStart.bannerCheck === 1 && offStart.credentialKept && offStart.pairing === 0, 'off: the check on opening shows the bar and the banner with Check, the session kept'],
      [on.bar === 'Connected' && on.banner === '' && on.rows > 0 && on.credentialKept, 'on again: Check loads the runs with no re-pairing'],
      [offBeforeDown.bar === 'Phone access off' && offThenDown.bar === 'Not reachable' && offThenDown.banner === `Can’t reach ${ALPHA_NAME}. Check` && offThenDown.bannerConnection === 'unreachable', 'off, then the node down: "Can’t reach"'],
      [back.bar === 'Connected' && back.banner === '' && back.credentialKept, 'the node back with Phone Access on: Connected'],
    ].filter(([ok]) => !ok).map(([, label]) => label);
    assert(failures.length === 0, failures.join('; '), facts);
    return facts;
  });

  await runCase('MSP-13', async () => {
    // A credential the node does not know (401, REMOTE_ACCESS_AUTH_INVALID: the node's pairing data was reset): the next
    // start reads once and lands on pairing (E-27, AR-008).
    const unknown = JSON.parse(JSON.stringify(paired));
    for (const origin of unknown.origins) for (const item of origin.localStorage) {
      if (item.name === 'autobyteus.remote_access.mobile_session') {
        const session = JSON.parse(item.value);
        session.credential = `mra_${randomUUID().replace(/-/g, '')}${randomUUID().replace(/-/g, '')}`;
        item.value = JSON.stringify(session);
      }
    }
    const invalid = await openPhone({ storageState: unknown, label: 'phone-unknown-credential' });
    await invalid.page.goto(`${phoneOrigin()}/mobile`, { waitUntil: 'domcontentloaded' });
    await invalid.page.locator(sel('mobile-pairing-bootstrap')).waitFor({ timeout: 60_000 }).catch(() => undefined);
    await sleep(8_000);
    const onPairing = await invalid.page.locator(sel('mobile-pairing-bootstrap')).count();
    const reads = historyReads(entry => entry.label === 'phone-unknown-credential');
    const sessionLeft = await invalid.page.evaluate(() => localStorage.getItem('autobyteus.remote_access.mobile_session'));
    await shot(invalid.page, 'MSP-13-unknown-credential-to-pairing');
    await invalid.context.close();
    // A device revoked on the node (403, REMOTE_ACCESS_DEVICE_REVOKED; autobyteus-426 D-02): the session is rejected as a 401
    // is. (1) The open phone's Check: the pairing screen, the stored session gone. (2) A later start of a phone that kept the
    // revoked credential: the check on opening lands on pairing too.
    await toList(page);
    const revokedAll = await alpha.rest('DELETE', '/remote-access/devices');
    await page.locator(sel('mobile-node-button')).click();
    await page.locator(sel('mobile-connection-sheet')).waitFor();
    await page.locator(sel('mobile-check-connection')).click();
    await page.locator(sel('mobile-pairing-bootstrap')).waitFor({ timeout: 30_000 }).catch(() => undefined);
    const openPhoneAfterCheck = { pairing: await page.locator(sel('mobile-pairing-bootstrap')).count(),
      sessionLeft: await page.evaluate(() => localStorage.getItem('autobyteus.remote_access.mobile_session')) };
    await shot(page, 'MSP-13-revoked-check-to-pairing');
    const revoked = await openPhone({ storageState: paired, label: 'phone-revoked' });
    await revoked.page.goto(`${phoneOrigin()}/mobile`, { waitUntil: 'domcontentloaded' });
    await revoked.page.locator(sel('mobile-pairing-bootstrap')).waitFor({ timeout: 60_000 }).catch(() => undefined);
    await sleep(3_000);
    const revokedShows = await revoked.page.evaluate(() => ({ pairing: Boolean(document.querySelector('[data-testid="mobile-pairing-bootstrap"]')),
      list: document.querySelector('[data-testid="mobile-run-list-error"]') ? 'error' : document.querySelector('[data-testid="mobile-run-tree"]') ? 'rows' : 'other',
      bar: document.querySelector('[data-testid="mobile-node-state"]')?.textContent?.trim() ?? null,
      sessionLeft: localStorage.getItem('autobyteus.remote_access.mobile_session') }));
    const revokedReads = phoneNet.filter(entry => entry.label === 'phone-revoked').map(entry => `${entry.op} ${entry.status}`);
    await shot(revoked.page, 'MSP-13-revoked-device');
    await revoked.context.close();
    // The phone's own credential check decides each outcome (autobyteus-426 SR-008): which answer each check got.
    const credentialChecks = phoneNet.filter(entry => entry.case === 'MSP-13' && entry.op === 'PhoneCredentialCheck').map(entry => `${entry.label} ${entry.status}`);
    const facts = { reads, onPairing, sessionLeft, revokedAll: revokedAll.status, openPhoneAfterCheck, revokedShows, revokedReads: [...new Set(revokedReads)], credentialChecks };
    const failures = [
      [onPairing === 1 && sessionLeft === null, 'an unknown credential lands on pairing'],
      [reads.length === 1 && reads[0].status === 401, 'one history read, refused with 401'],
      [revokedAll.status === 200, 'the node revoked the phone'],
      [openPhoneAfterCheck.pairing === 1 && openPhoneAfterCheck.sessionLeft === null, 'a revoked phone\'s Check (runs listed): the pairing screen, the session removed (AC-002)'],
      [revokedShows.pairing && revokedShows.sessionLeft === null && facts.revokedReads.some(entry => entry.endsWith(' 403')), 'a revoked phone\'s next start: refused with 403, the pairing screen, the session removed (AC-002)'],
    ].filter(([ok]) => !ok).map(([, label]) => label);
    assert(failures.length === 0, failures.join('; '), facts);
    return facts;
  });

  await runLiveReconnectCases({ runCase, serverAt, freePort, chromium, executablePath, outputDir, evidence, selected, sleep, waitFor, assert, redact });
  await runClosedTaskRowsCases({ runCase, serverAt, freePort, chromium, executablePath, outputDir, evidence, selected, sleep, waitFor, assert, redact, browser, alpha, stack, desktopRunsView });
  await runFileOpenCases({ runCase, serverAt, freePort, chromium, executablePath, outputDir, evidence, selected, sleep, waitFor, assert, redact, browser, alpha, stack, desktopRunsView });
};

try {
  assert(existsSync(appEntry), 'Build the worktree server first: pnpm -C autobyteus-server-ts build');
  assert(existsSync(mobileBundle), 'Build the phone bundle first: pnpm -C autobyteus-web build:mobile-web');
  const fakeGrokDir = path.join(root, 'fake-grok');
  await fs.mkdir(fakeGrokDir, { recursive: true });
  const fakeGrok = path.join(fakeGrokDir, 'grok');
  await fs.writeFile(fakeGrok, `#!/bin/sh\nexec "${process.execPath}" "${grokCli}" "$@"\n`, { mode: 0o755 });
  stack.acpRecord = path.join(root, 'grok-acp-client.jsonl');
  [alpha, beta] = await Promise.all([
    serverAt('alpha', await freePort(), { GROK_BUILD_COMMAND: fakeGrok, FAKE_ACP_FIXTURE: grokPermission, FAKE_ACP_RECORD: stack.acpRecord, FAKE_ACP_REPORT_MCP_READY: '1' }),
    serverAt('beta', await freePort()),
  ]);
  const mobilePage = await fetch(`${alpha.baseUrl}/mobile`);
  assert(mobilePage.ok && (await mobilePage.text()).includes('/mobile/_nuxt/'), 'alpha serves the phone bundle at /mobile', mobilePage.status);
  await setUp();
  await saveEvidence();

  if (hold) {
    const lan = Object.values(os.networkInterfaces()).flat().find(entry => entry?.family === 'IPv4' && !entry.internal && /^(192\.168|10\.|172\.)/.test(entry.address))?.address;
    const links = { emulator: await pairingFor(`http://10.0.2.2:${alpha.port}`) };
    if (bindHost === '0.0.0.0' && lan) links.lan = await pairingFor(`http://${lan}:${alpha.port}`);
    const info = { alpha: alpha.baseUrl, beta: beta.baseUrl, alphaPort: alpha.port, links, runs: evidence.runs, ids: stack.ids, workspace: stack.workspace, root };
    await fs.writeFile(path.join(outputDir, 'hold.json'), `${JSON.stringify(info, null, 2)}\n`);
    console.log(`[mobile-shell] holding the stack; ${path.join(outputDir, 'hold.json')} has the links. Ctrl+C ends it.`);
    await new Promise(resolve => { process.once('SIGINT', resolve); process.once('SIGTERM', resolve); });
    evidence.result = 'Pass';
  } else {
    await runCases();
    const failed = Object.entries(evidence.cases).filter(([, entry]) => entry.result !== 'Pass').map(([id]) => id);
    // Pre-existing, outside this probe's changes (autobyteus-426 FU-003): each phone page start runs the browser health
    // check of `serverStore` (plugins/10.serverStore.client.ts) against the window node's default endpoint,
    // `http://localhost:8000/health`, which a phone refuses. Its console line names no URL, so each such line counts as
    // known only against a recorded failed request to exactly that URL from the same phone in the same case.
    const healthFailures = evidence.failedRequests.filter(entry => entry.url === 'http://localhost:8000/health' && entry.error === 'net::ERR_CONNECTION_REFUSED');
    for (const entry of evidence.browserErrors.filter(item => !item.known && /: Failed to load resource: net::ERR_CONNECTION_REFUSED$/.test(item.line))) {
      const index = healthFailures.findIndex(failure => failure.case === entry.case && entry.line.startsWith(`${failure.label} console:`));
      if (index >= 0) { healthFailures.splice(index, 1); entry.known = true; entry.cause = 'FU-003: serverStore health check of http://localhost:8000/health'; }
    }
    const unknownErrors = evidence.browserErrors.filter(entry => !entry.known);
    evidence.result = failed.length === 0 && unknownErrors.length === 0 && Object.keys(evidence.cases).length > 0 ? 'Pass' : 'Fail';
    evidence.summary = { cases: Object.fromEntries(Object.entries(evidence.cases).map(([id, entry]) => [id, entry.result])), unknownBrowserErrors: unknownErrors.length };
    if (evidence.result !== 'Pass') process.exitCode = 1;
  }
} catch (error) {
  evidence.error = error instanceof Error ? `${error.stack ?? error.message}${error.details ? `\n${JSON.stringify(error.details)}` : ''}` : String(error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => undefined);
  if (frontend && !exited(frontend)) {
    try { process.kill(-frontend.pid, 'SIGTERM'); } catch { /* gone */ }
    await Promise.race([new Promise(resolve => frontend.once('close', resolve)), sleep(8_000)]);
    if (!exited(frontend)) { try { process.kill(-frontend.pid, 'SIGKILL'); } catch { /* gone */ } }
  }
  for (const child of [...children]) {
    if (!exited(child)) { child.kill('SIGTERM'); await Promise.race([new Promise(resolve => child.once('close', resolve)), sleep(10_000)]); if (!exited(child)) child.kill('SIGKILL'); }
    children.delete(child);
  }
  await fs.rm(root, { recursive: true, force: true }).catch(() => undefined);
  evidence.cleanup = { frontendExited: !frontend || exited(frontend), serversLeft: children.size, rootRemoved: !existsSync(root) };
  evidence.finishedAt = new Date().toISOString();
  await saveEvidence();
  console.log(`mobile-shell probe: ${evidence.result}${evidence.error ? `\n${redact(evidence.error)}` : ''}`);
  process.exit(process.exitCode ?? 0);
}

// autobyteus-525 API/E2E round 2 (temporary, ticket-owned; from autobyteus-458's node-458.mjs): a host node of this worktree
// with a node desktop, for API-11 (the live VNC Viewer on the phone). Runs until /tmp/abtest525v/stop exists.
// - `autobyteus-server-ts/dist/app.js` on 127.0.0.1:<free port> (a phone reaches it as http://10.0.2.2:<port>), a temp data
//   root and HOME, a launch owner credential of its own (never printed).
// - Node desktop: the server offers it when AUTOBYTEUS_STARTER_SOCKET is set (a Docker node) and bridges viewers to
//   127.0.0.1:5900, where the test-owned container `abtest525-desktop` (autobyteus/autobyteus-server:beta, its Xvnc) is
//   published on this machine's loopback only. The starter socket path does not exist: the starter client is used only
//   for a node update, which nothing here asks for.
// - Data: one agent "Desktop Helper" on the scripted Antigravity CLI and one run of it. A Phone Access pairing link for
//   http://10.0.2.2:<port> is written to /tmp/abtest525v/pairing-link.txt only (a new one on each /tmp/abtest525v/link).
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import net from 'node:net';
import { spawn, execFileSync } from 'node:child_process'; import { randomBytes } from 'node:crypto';
const W = '/Users/normy/autobyteus_org/autobyteus-worktrees/phone-text-size-home-525'; const S = `${W}/autobyteus-server-ts`;
const [out] = process.argv.slice(2); const T = '/tmp/abtest525v';
const lines = []; const log = (...a) => { const l = `${new Date().toISOString()} ${a.join(' ')}`; lines.push(l); console.log(l); fs.writeFileSync(path.join(out, 'API-11-node.log'), lines.join('\n') + '\n'); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const freePort = () => new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const owner = `own_${randomBytes(32).toString('base64url')}`;
const redact = s => String(s).split(owner).join('own_…').replace(/pairing=[^&\s"']+/g, 'pairing=…').replace(/mra_[A-Za-z0-9_-]+/g, 'mra_…');
let child = null; let ok = true; let root = null;
try {
  fs.mkdirSync(T, { recursive: true }); fs.mkdirSync(out, { recursive: true });
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'abtest525v-node-')));
  const data = path.join(root, 'data'); const home = path.join(root, 'home'); const ws = path.join(root, 'workspace', 'ws-525');
  for (const d of [data, home, ws]) fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(ws, 'README.md'), '# ws-525\n');
  const port = await freePort(); const base = `http://127.0.0.1:${port}`;
  log(`# autobyteus-525 API-11 node; commit ${execFileSync('git', ['-C', W, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()}; Node ${process.version}`);
  fs.writeFileSync(path.join(data, '.env'), `APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=${base}\nLOG_LEVEL=WARN\n`);
  const nodeLog = fs.createWriteStream(path.join(out, 'API-11-node-server.log'), { flags: 'a' });
  child = spawn(process.execPath, ['dist/app.js', '--host', '127.0.0.1', '--port', String(port), '--data-dir', data], { cwd: S,
    env: { PATH: process.env.PATH, HOME: home, TMPDIR: os.tmpdir(), APP_ENV: 'test', LOG_LEVEL: 'WARN', AUTOBYTEUS_SERVER_HOST: base,
      AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL: owner, AUTOBYTEUS_STARTER_SOCKET: `${T}/no-starter.sock`,
      ANTIGRAVITY_CLI_COMMAND: `${S}/tests/fixtures/agy-failure-cli.mjs`, AGY_FAKE_CASE: 'linked_skills' },
    stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', d => nodeLog.write(redact(d))); child.stderr.on('data', d => nodeLog.write(redact(d)));
  let up = false; for (let i = 0; i < 180 && !(up = await fetch(`${base}/rest/health`).then(r => r.ok).catch(() => false)); i++) await sleep(1000);
  if (!up) throw new Error('node did not start');
  log(`node up on ${base} (phone: http://10.0.2.2:${port})`);
  const gql = async (q, v) => { const r = await (await fetch(`${base}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${owner}` }, body: JSON.stringify({ query: q, variables: v }) })).json(); if (r.errors) throw new Error(JSON.stringify(r.errors).slice(0, 400)); return r.data; };
  const rest = (m, r, b) => fetch(`${base}/rest${r}`, { method: m, headers: { 'content-type': 'application/json', authorization: `Bearer ${owner}` }, body: JSON.stringify(b) }).then(async x => ({ status: x.status, body: await x.json().catch(() => null) }));
  const agy = { runtimeKind: 'antigravity_cli', llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null };
  const def = (await gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}', { i: { name: 'Desktop Helper', role: 'assistant', description: 'Desktop Helper (525 journeys)', instructions: 'Follow the request.', toolNames: [], defaultLaunchConfig: agy } })).createAgentDefinition.id;
  await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: ws } }).catch(() => undefined);
  const run = (await gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: def, workspaceRootPath: ws, autoExecuteTools: true, ...agy } })).createAgentRun;
  if (!run.success) throw new Error(`run: ${run.message}`);
  // A message to the run (round 3), so its conversation has text for the device check (API-08): the run's agent stream,
  // as a desktop window sends it, with this node's owner credential in the socket URL.
  if (process.env.SAY) {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/agent/${run.runId}?access_token=${encodeURIComponent(owner)}`);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = () => j(new Error('agent socket')); }); await sleep(400);
    ws.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: crypto.randomUUID(), dedupe_key: `agent_run_input:api525:${crypto.randomUUID()}`, context_file_paths: [], image_urls: [], agent_run_id: run.runId, content: process.env.SAY } }));
    let seen = false; for (let i = 0; i < 60 && !seen; i++) { await sleep(1000); seen = JSON.stringify(await gql('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: run.runId }).catch(() => ({}))).includes(process.env.SAY.slice(0, 20)); }
    ws.close(); log(`message to the run: ${seen ? 'in its conversation' : 'NOT seen'}`);
  }
  const status = await (await fetch(`${base}/rest/remote-access/status`)).json();
  log(`run ${run.runId}; status fields ${Object.keys(status).sort().join(',')}`);
  if ((await rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true })).status !== 200) throw new Error('Phone Access');
  const link = async () => { const ps = await rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'local_network', serverBaseUrl: `http://10.0.2.2:${port}`, serverName: 'Desktop Test Node 525', trustedPrivateHttpAcknowledged: true });
    if (ps.status !== 201 || !ps.body?.mobileUrl) throw new Error(`pairing session ${ps.status}`); fs.writeFileSync(`${T}/pairing-link.txt`, ps.body.mobileUrl); log('pairing session 201 (link in /tmp/abtest525v/pairing-link.txt, not evidence)'); };
  await link();
  fs.writeFileSync(`${T}/state.json`, JSON.stringify({ port, runId: run.runId }));
  while (!fs.existsSync(`${T}/stop`)) { if (fs.existsSync(`${T}/link`)) { fs.rmSync(`${T}/link`); await link(); } await sleep(500); }
} catch (e) { ok = false; log('ERROR', redact(e.stack)); }
finally {
  if (child) { child.kill('SIGTERM'); for (let i = 0; i < 20 && child.exitCode === null && child.signalCode === null; i++) await sleep(500); }
  if (root) fs.rmSync(root, { recursive: true, force: true });
  log(`node ${ok ? 'done' : 'FAILED'}; stopped ${child ? (child.exitCode ?? child.signalCode) : 'n/a'}; temp root removed: ${root && !fs.existsSync(root)}`); process.exitCode = ok ? 0 : 1;
}

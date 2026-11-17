// autobyteus-458 API/E2E (temporary): a host node of this worktree for the Android and desktop journeys (API-02…05).
// Runs until /tmp/abtest458/stop exists, then stops the node and removes its temp root. Args: <evidence dir> <desktop frontend port>.
// - `autobyteus-server-ts/dist/app.js` on 127.0.0.1:<free port> (the emulator reaches it as 10.0.2.2:<port>), a temp data root and
//   a temp HOME, a launch credential of its own (never printed), `AUTOBYTEUS_ALLOWED_ORIGINS` = the desktop window's dev frontend.
// - Scripted runtimes only: the repository's AGY CLI (`AGY_FAKE_CASE=linked_skills`; `AGY_FAKE_EXTRA_MODELS=gemini-retiring-458`
//   adds a second model while set) and the scripted Grok Build CLI (`grok-4.7`). No provider, no key.
// - /tmp/abtest458/restart: the node is stopped and started again on the same port and data WITHOUT the extra model (API-04).
// - Data: agents "Fact Checker", "Release Notes Writer"; Team "Delivery Team" (lead, mate); Org "Delivery Org" (planner = an agent,
//   squad = a Team "Docs Review Team" of reviewer, editor). Runs are made by api.mjs. A Phone Access pairing link for
//   http://10.0.2.2:<port> is written to /tmp/abtest458/pairing-link.txt only.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import net from 'node:net';
import { spawn, execFileSync } from 'node:child_process'; import { randomBytes } from 'node:crypto';
const W = '/Users/normy/autobyteus_org/autobyteus-worktrees/phone-run-model-runtime-458'; const S = `${W}/autobyteus-server-ts`;
const [out, frontendPort] = process.argv.slice(2); const T = '/tmp/abtest458';
const lines = []; const log = (...a) => { const l = `${new Date().toISOString()} ${a.join(' ')}`; lines.push(l); console.log(l); fs.writeFileSync(path.join(out, 'node-458.log'), lines.join('\n') + '\n'); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const freePort = () => new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const owner = `own_${randomBytes(32).toString('base64url')}`;
const redact = s => String(s).split(owner).join('own_…').replace(/pairing=[^&\s"']+/g, 'pairing=…').replace(/mra_[A-Za-z0-9_-]+/g, 'mra_…');
let child = null; let ok = true; let root = null;
const EXTRA = 'gemini-retiring-458';
try {
  fs.mkdirSync(T, { recursive: true });
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'abtest458-node-')); root = fs.realpathSync(root);
  const data = path.join(root, 'data'); const home = path.join(root, 'home'); const ws = path.join(root, 'workspace', 'ws-458');
  for (const d of [data, home, ws]) fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(ws, 'README.md'), '# ws-458\n\nThe workspace of the autobyteus-458 journeys.\n');
  const grok = path.join(root, 'fake-grok', 'grok'); fs.mkdirSync(path.dirname(grok), { recursive: true });
  fs.writeFileSync(grok, `#!/bin/sh\nexec "${process.execPath}" "${S}/tests/fixtures/grok-acp/fake-grok-cli.mjs" "$@"\n`, { mode: 0o755 });
  const port = await freePort(); const base = `http://127.0.0.1:${port}`;
  log(`# autobyteus-458 node; commit ${execFileSync('git', ['-C', W, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()}`);
  fs.writeFileSync(path.join(data, '.env'), `APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=${base}\nLOG_LEVEL=WARN\n`);
  const nodeLog = fs.createWriteStream(path.join(out, 'node-458-server.log'), { flags: 'a' });
  const start = async (extraModels) => {
    child = spawn(process.execPath, ['dist/app.js', '--host', '127.0.0.1', '--port', String(port), '--data-dir', data], { cwd: S,
      env: { PATH: process.env.PATH, HOME: home, TMPDIR: os.tmpdir(), APP_ENV: 'test', LOG_LEVEL: 'WARN', AUTOBYTEUS_SERVER_HOST: base,
        AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL: owner, AUTOBYTEUS_ALLOWED_ORIGINS: `http://127.0.0.1:${frontendPort},http://localhost:${frontendPort}`,
        ANTIGRAVITY_CLI_COMMAND: `${S}/tests/fixtures/agy-failure-cli.mjs`, AGY_FAKE_CASE: 'linked_skills', ...(extraModels ? { AGY_FAKE_EXTRA_MODELS: EXTRA } : {}),
        GROK_BUILD_COMMAND: grok, FAKE_ACP_FIXTURE: `${S}/tests/fixtures/grok-acp/permission.jsonl`, FAKE_ACP_RECORD: path.join(root, 'grok-acp-client.jsonl'), FAKE_ACP_REPORT_MCP_READY: '1' },
      stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', d => nodeLog.write(redact(d))); child.stderr.on('data', d => nodeLog.write(redact(d)));
    let up = false; for (let i = 0; i < 120 && !(up = await fetch(`${base}/rest/health`).then(r => r.ok).catch(() => false)); i++) await sleep(1000);
    if (!up) throw new Error('node did not start');
    log(`node up on ${base} (emulator: http://10.0.2.2:${port}); AGY_FAKE_EXTRA_MODELS ${extraModels ? `= ${EXTRA}` : 'unset'}`);
  };
  const stop = async () => { if (!child) return; const c = child; child = null; c.kill('SIGTERM'); for (let i = 0; i < 20 && c.exitCode === null && c.signalCode === null; i++) await sleep(500); log(`node stopped (${c.exitCode ?? c.signalCode})`); };
  await start(true);
  const gql = async (q, v) => { const r = await (await fetch(`${base}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${owner}` }, body: JSON.stringify({ query: q, variables: v }) })).json(); if (r.errors) throw new Error(JSON.stringify(r.errors).slice(0, 400)); return r.data; };
  const rest = (m, r, b) => fetch(`${base}/rest${r}`, { method: m, headers: { 'content-type': 'application/json', authorization: `Bearer ${owner}` }, body: JSON.stringify(b) }).then(async x => ({ status: x.status, body: await x.json().catch(() => null) }));
  const agy = { runtimeKind: 'antigravity_cli', llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null };
  const def = async (name) => (await gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}', { i: { name, role: 'assistant', description: `${name} (458 journeys)`, instructions: 'Follow the request.', toolNames: [], defaultLaunchConfig: agy } })).createAgentDefinition.id;
  const team = async (name, coordinatorMemberName, nodes) => (await gql('mutation($i:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$i){id}}', { i: { name, description: `${name} (458 journeys)`, instructions: 'Work together.', coordinatorMemberName, nodes } })).createAgentTeamDefinition.id;
  const ids = {};
  ids.checker = await def('Fact Checker'); ids.writer = await def('Release Notes Writer');
  ids.delivery = await team('Delivery Team', 'lead', [{ memberName: 'lead', ref: ids.checker, refScope: 'SHARED' }, { memberName: 'mate', ref: ids.writer, refScope: 'SHARED' }]);
  ids.squad = await team('Docs Review Team', 'reviewer', [{ memberName: 'reviewer', ref: ids.writer, refScope: 'SHARED' }, { memberName: 'editor', ref: ids.checker, refScope: 'SHARED' }]);
  ids.org = (await gql('mutation($i:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$i){id}}', { i: { name: 'Delivery Org', description: 'Org (458 journeys)', instructions: 'Deliver.', handoffs: [],
    members: [{ memberName: 'planner', ref: ids.writer, refType: 'AGENT', refScope: 'SHARED' }, { memberName: 'squad', ref: ids.squad, refType: 'AGENT_TEAM', refScope: 'SHARED' }] } })).createAgentOrgDefinition.id;
  await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: ws } }).catch(() => undefined);
  if ((await rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true })).status !== 200) throw new Error('Phone Access');
  const ps = await rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'local_network', serverBaseUrl: `http://10.0.2.2:${port}`, serverName: 'Test Node 458', trustedPrivateHttpAcknowledged: true });
  if (ps.status !== 201 || !ps.body?.mobileUrl) throw new Error(`pairing session ${ps.status}`);
  fs.writeFileSync(`${T}/pairing-link.txt`, ps.body.mobileUrl);
  fs.writeFileSync(`${T}/state.json`, JSON.stringify({ port, base, owner, root, ws, ids, agy }, null, 1));
  log(`definitions ${JSON.stringify(ids)}; pairing session 201 (link in ${T}/pairing-link.txt, not evidence). Control: ${T}/restart, ${T}/stop`);
  while (!fs.existsSync(`${T}/stop`)) {
    if (fs.existsSync(`${T}/restart`)) { fs.rmSync(`${T}/restart`); log('restart requested: without the extra model'); await stop(); await start(false); fs.writeFileSync(`${T}/restarted`, new Date().toISOString()); }
    await sleep(500);
  }
} catch (e) { ok = false; log('ERROR', redact(e.stack)); }
finally {
  if (child) { child.kill('SIGTERM'); await sleep(3000); }
  if (root) fs.rmSync(root, { recursive: true, force: true });
  log(`node ${ok ? 'done' : 'FAILED'}; temp root removed: ${root && !fs.existsSync(root)}`); process.exitCode = ok ? 0 : 1;
}

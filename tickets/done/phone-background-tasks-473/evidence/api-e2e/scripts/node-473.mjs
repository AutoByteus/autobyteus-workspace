// autobyteus-473 API/E2E (temporary): a host node of this worktree for the Android and desktop journeys. Runs until
// /tmp/abtest473/stop exists, then stops the node and removes its temp root. Args: <evidence dir> <desktop frontend port>.
// - `autobyteus-server-ts/dist/app.js` on 127.0.0.1:<free port> (the emulator reaches it as 10.0.2.2:<port>), a temp data
//   root, the probe's launch credential (never printed), `AUTOBYTEUS_ALLOWED_ORIGINS` = the desktop window's dev frontend.
// - The real HOME, USER and LOGNAME, only so the Claude CLI finds the local login (TESTING.md: signed-in CLIs need them; the
//   repository's live Claude suites do the same). The node's own data stays in the temp root.
// - A Claude agent (`claude_agent_sdk`, model `haiku`, as tests/e2e/helpers/claude-live-agent-harness.ts) and a run in a temp
//   workspace; a Phone Access pairing link for http://10.0.2.2:<port> (written to /tmp/abtest473/pairing-link.txt only).
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import net from 'node:net';
import { spawn, execFileSync } from 'node:child_process'; import { randomBytes } from 'node:crypto';
const W = '/Users/normy/autobyteus_org/autobyteus-worktrees/phone-background-tasks-473';
const [out, frontendPort] = process.argv.slice(2); const T = '/tmp/abtest473';
const lines = []; const log = (...a) => { const l = a.join(' '); lines.push(l); console.log(l); fs.writeFileSync(path.join(out, 'node-473.log'), lines.join('\n') + '\n'); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const freePort = () => new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const owner = `own_${randomBytes(32).toString('base64url')}`; const redact = s => String(s).split(owner).join('own_…').replace(/pairing=[^&\s"']+/g, 'pairing=…').replace(/mra_[A-Za-z0-9_-]+/g, 'mra_…');
let child = null; let ok = true;
try {
  fs.mkdirSync(T, { recursive: true });
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'abtest473-node-')); const data = path.join(root, 'data'); const ws = path.join(root, 'workspace', 'ws-473');
  for (const d of [data, ws]) fs.mkdirSync(d, { recursive: true });
  const port = await freePort(); const base = `http://127.0.0.1:${port}`;
  log(`# autobyteus-473 node; commit ${execFileSync('git', ['-C', W, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()}; ${new Date().toISOString()}`);
  fs.writeFileSync(path.join(data, '.env'), `APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=${base}\nLOG_LEVEL=WARN\n`);
  child = spawn(process.execPath, ['dist/app.js', '--host', '127.0.0.1', '--port', String(port), '--data-dir', data], { cwd: `${W}/autobyteus-server-ts`,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, USER: process.env.USER, LOGNAME: process.env.LOGNAME, TMPDIR: os.tmpdir(), APP_ENV: 'test', LOG_LEVEL: 'WARN',
      AUTOBYTEUS_SERVER_HOST: base, AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL: owner, AUTOBYTEUS_ALLOWED_ORIGINS: `http://127.0.0.1:${frontendPort}` }, stdio: ['ignore', 'pipe', 'pipe'] });
  const nodeLog = fs.createWriteStream(path.join(out, 'node-473-server.log')); child.stdout.on('data', d => nodeLog.write(redact(d))); child.stderr.on('data', d => nodeLog.write(redact(d)));
  let up = false; for (let i = 0; i < 120 && !(up = await fetch(`${base}/rest/health`).then(r => r.ok).catch(() => false)); i++) await sleep(1000); if (!up) throw new Error('node did not start');
  log(`node on ${base} (emulator: http://10.0.2.2:${port}); desktop frontend allowed: http://127.0.0.1:${frontendPort}`);
  const gql = async (q, v) => { const r = await (await fetch(`${base}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${owner}` }, body: JSON.stringify({ query: q, variables: v }) })).json(); if (r.errors) throw new Error(JSON.stringify(r.errors).slice(0, 400)); return r.data; };
  const rest = (m, r, b) => fetch(`${base}/rest${r}`, { method: m, headers: { 'content-type': 'application/json', authorization: `Bearer ${owner}` }, body: JSON.stringify(b) }).then(async x => ({ status: x.status, body: await x.json().catch(() => null) }));
  const claude = { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'haiku', llmConfig: null };
  const def = (await gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}', { i: { name: 'Builder', role: 'assistant', description: '473 probe', instructions: 'Do exactly what the user asks, briefly.', toolNames: [], defaultLaunchConfig: claude } })).createAgentDefinition.id;
  const run = (await gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: def, workspaceRootPath: ws, autoExecuteTools: true, ...claude } })).createAgentRun;
  if (!run.success) throw new Error(run.message);
  log(`Claude run ${run.runId} (haiku) in ${ws}`);
  if ((await rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true })).status !== 200) throw new Error('Phone Access');
  const ps = await rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'local_network', serverBaseUrl: `http://10.0.2.2:${port}`, serverName: 'Test Node 473', trustedPrivateHttpAcknowledged: true });
  if (ps.status !== 201 || !ps.body?.mobileUrl) throw new Error(`pairing session ${ps.status}`);
  fs.writeFileSync(`${T}/pairing-link.txt`, ps.body.mobileUrl);
  fs.writeFileSync(`${T}/state.json`, JSON.stringify({ port, base, run: run.runId, def, owner, root, ws }, null, 1));
  log(`pairing session 201 (link in ${T}/pairing-link.txt, not evidence). Waiting for ${T}/stop`);
  while (!fs.existsSync(`${T}/stop`)) await sleep(1000);
  fs.rmSync(root, { recursive: true, force: true });
} catch (e) { ok = false; log('ERROR', redact(e.stack)); }
finally { if (child) { child.kill('SIGTERM'); await sleep(3000); } log(`node ${ok ? 'done' : 'FAILED'}`); process.exitCode = ok ? 0 : 1; }

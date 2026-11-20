// ios-demo-mode-279 API/E2E (temporary; from 522's node-522.mjs): a real node for the iOS simulator checks (API-04, API-05).
// - `autobyteus-server-ts/dist/app.js` of <repo> (the fresh clone, built from the commit under test), serving that clone's
//   phone bundle (`autobyteus-web/dist/public`) at /mobile; bound to <host> only (this Mac's private LAN address: the node
//   refuses loopback pairing URLs, and the simulator shares the Mac's network); temp data root and HOME; its own launch
//   credential (never printed). Scripted AGY runtime only.
// - Data: the agent "Fact Checker" and one run in a temp workspace, with a 40 MB PDF (`big-279.pdf`) and a small note.
// - Control files in /tmp/abtest279/node: `pair-<name>` → a fresh pairing link for http://<host>:<port> in `link-<name>.txt`
//   (never printed or kept in evidence); `stop` → stop and remove the temp root.
// Args: <repo> <host> <evidence dir>
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import net from 'node:net'; import crypto from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process'; import { randomBytes } from 'node:crypto';
const [REPO, HOST, OUT] = process.argv.slice(2); const S = `${REPO}/autobyteus-server-ts`; const T = '/tmp/abtest279/node';
const lines = []; const log = (...a) => { const l = `${new Date().toISOString()} ${a.join(' ')}`; lines.push(l); console.log(l); fs.writeFileSync(path.join(OUT, 'node-279.log'), lines.join('\n') + '\n'); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((r) => { const s = net.createServer(); s.listen(0, HOST, () => { const p = s.address().port; s.close(() => r(p)); }); });
const owner = `own_${randomBytes(32).toString('base64url')}`;
const redact = (s) => String(s).split(owner).join('own_…').replace(/pairing=[^&\s"']+/g, 'pairing=…').replace(/mra_[A-Za-z0-9_-]+/g, 'mra_…');
let child = null; let ok = true; let root = null;
try {
  fs.mkdirSync(T, { recursive: true });
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'abtest279-node-')));
  const data = path.join(root, 'data'); const home = path.join(root, 'home'); const ws = path.join(root, 'workspace', 'ws-279');
  for (const d of [data, home, ws]) fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(ws, 'note-279.md'), '# Note 279\n\nA small note.\n');
  // A 40 MB PDF: one page, padded with a large comment stream (a valid PDF the viewer opens).
  const pad = crypto.randomBytes(30 * 1024 * 1024).toString('base64').slice(0, 40 * 1024 * 1024);
  const pdf = `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]/Contents 4 0 R/Resources<<>>>>endobj\n4 0 obj<</Length 44>>stream\nBT /F1 12 Tf 20 100 Td (big-279) Tj ET\nendstream endobj\n5 0 obj<</Length ${pad.length}>>stream\n${pad}\nendstream endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n`;
  fs.writeFileSync(path.join(ws, 'big-279.pdf'), pdf);
  const grok = path.join(root, 'none'); void grok;
  const port = await freePort(); const base = `http://${HOST}:${port}`;
  log(`# ios-demo-mode-279 node; repo ${REPO} at ${execFileSync('git', ['-C', REPO, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()}; big-279.pdf ${fs.statSync(path.join(ws, 'big-279.pdf')).size} bytes`);
  fs.writeFileSync(path.join(data, '.env'), `APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=${base}\nLOG_LEVEL=WARN\n`);
  const nodeLog = fs.createWriteStream(path.join(OUT, 'node-279-server.log'), { flags: 'a' });
  child = spawn(process.execPath, ['dist/app.js', '--host', HOST, '--port', String(port), '--data-dir', data], { cwd: S,
    env: { PATH: process.env.PATH, HOME: home, TMPDIR: os.tmpdir(), APP_ENV: 'test', LOG_LEVEL: 'WARN', AUTOBYTEUS_SERVER_HOST: base,
      AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL: owner,
      // Only this Mac's own address (the simulator's requests come from it); no other machine on the LAN.
      AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS: `${HOST}/32`, ANTIGRAVITY_CLI_COMMAND: `${S}/tests/fixtures/agy-failure-cli.mjs`, AGY_FAKE_CASE: 'linked_skills' },
    stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', (d) => nodeLog.write(redact(d))); child.stderr.on('data', (d) => nodeLog.write(redact(d)));
  let up = false; for (let i = 0; i < 120 && !(up = await fetch(`${base}/rest/health`).then((r) => r.ok).catch(() => false)); i++) await sleep(1000);
  if (!up) throw new Error('node did not start');
  const mobile = await fetch(`${base}/mobile`); log(`node up on ${base}; /mobile ${mobile.status}`);
  const gql = async (q, v) => { const r = await (await fetch(`${base}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${owner}` }, body: JSON.stringify({ query: q, variables: v }) })).json(); if (r.errors) throw new Error(JSON.stringify(r.errors).slice(0, 400)); return r.data; };
  const rest = (m, r, b) => fetch(`${base}/rest${r}`, { method: m, headers: { 'content-type': 'application/json', authorization: `Bearer ${owner}` }, body: JSON.stringify(b) }).then(async (x) => ({ status: x.status, body: await x.json().catch(() => null) }));
  const agy = { runtimeKind: 'antigravity_cli', llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null };
  const def = (await gql('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}', { i: { name: 'Fact Checker', role: 'assistant', description: '279', instructions: 'Follow the request.', toolNames: [], defaultLaunchConfig: agy } })).createAgentDefinition.id;
  await gql('mutation($input:CreateWorkspaceInput!){createWorkspace(input:$input){workspaceId}}', { input: { rootPath: ws } }).catch(() => undefined);
  const run = (await gql('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: def, workspaceRootPath: ws, autoExecuteTools: true, ...agy } })).createAgentRun;
  if (!run.success) throw new Error(run.message);
  // A first turn whose answer links the PDF, so the phone can open it from the conversation.
  const u = new URL(`${base.replace('http', 'ws')}/ws/agent/${run.runId}`); u.searchParams.set('access_token', owner);
  const s = new WebSocket(u); await new Promise((r, j) => { s.onopen = r; s.onerror = j; }); await sleep(400);
  s.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: crypto.randomUUID(), dedupe_key: `agent_run_input:api279:${crypto.randomUUID()}`, context_file_paths: [], image_urls: [], agent_run_id: run.runId,
    content: `RUN-279 Please read [big-279.pdf](${path.join(ws, 'big-279.pdf')}) and [note-279.md](${path.join(ws, 'note-279.md')}).` } }));
  await sleep(1500); s.close();
  if ((await rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true })).status !== 200) throw new Error('Phone Access');
  fs.writeFileSync(`${T}/state.json`, JSON.stringify({ base, port, host: HOST, owner, root, ws, run: run.runId, def }, null, 1));
  log(`run ${run.runId}; Phone Access on. Control: ${T}/pair-<name>, ${T}/stop`);
  while (!fs.existsSync(`${T}/stop`)) {
    for (const f of fs.readdirSync(T).filter((n) => n.startsWith('pair-'))) {
      const name = f.slice(5); fs.rmSync(path.join(T, f));
      const ps = await rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'local_network', serverBaseUrl: base, serverName: 'Test Node 279', trustedPrivateHttpAcknowledged: true });
      if (ps.status === 201 && ps.body?.mobileUrl) { fs.writeFileSync(path.join(T, `link-${name}.txt`), ps.body.mobileUrl); log(`pairing session for ${name}: 201 (link in ${T}, not evidence)`); }
      else log(`pairing session for ${name}: ${ps.status} ${redact(JSON.stringify(ps.body)).slice(0, 200)}`);
    }
    await sleep(500);
  }
} catch (e) { ok = false; log('ERROR', redact(e.stack)); }
finally {
  if (child) { child.kill('SIGTERM'); await sleep(3000); }
  if (root) fs.rmSync(root, { recursive: true, force: true });
  log(`node ${ok ? 'done' : 'FAILED'}; temp root removed: ${root && !fs.existsSync(root)}`); process.exitCode = ok ? 0 : 1;
}

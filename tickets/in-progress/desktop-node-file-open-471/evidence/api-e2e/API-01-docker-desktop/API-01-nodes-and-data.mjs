// API-01/API-02 (autobyteus-471, temporary): the nodes and data the desktop journey uses. Runs until /tmp/abtest471/stop
// exists, then removes everything it made. Arg: <evidence dir>.
// - The scripted CLI in the container: a copy of tests/fixtures/agy-failure-cli.mjs next to its own `npm install
//   @modelcontextprotocol/client@2.3.1` (the worktree's version; the image has no such module), mounted read-only, so its
//   CALL_TOOL reaches the node's agent tools.
// - Docker node A: a test-owned container of abtest471/autobyteus-server:test (this worktree's server package) on
//   127.0.0.1:<free port>, fresh anonymous volumes, a host temp folder mounted at /home/autobyteus/shared (as the launcher
//   mounts the shared folder), the scripted AGY CLI (linked_skills: `ECHO_INPUT <text>` answers `ECHO:"<text>"`).
// - Host node B: this worktree's dist/app.js on 127.0.0.1:<free port>, temp data root, the same scripted CLI; paired with A
//   by invite (A calls B "host-b-471").
// - On A: a run in /home/autobyteus/workspace/ws-471 whose own message links files in and outside its folder, and a
//   delegation to B's "Publisher" (a remote run in A's window) whose own message links a file on B.
// The probe's credential (launch credential of both nodes) creates the data only; the desktop gets its own owner credential
// from a setup code (separate step). No credential, setup code or file content is written to the evidence.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import net from 'node:net'; import zlib from 'node:zlib';
import { spawn, execFileSync } from 'node:child_process'; import { randomBytes, randomUUID } from 'node:crypto';
const W = '/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-node-file-open-471';
const out = process.argv[2]; const T = '/tmp/abtest471'; const A_NAME = 'abtest471-node-a'; const PEER = 'host-b-471';
const lines = []; const log = (...a) => { const l = a.join(' '); lines.push(l); console.log(l); fs.writeFileSync(path.join(out, 'API-01-nodes-and-data.log'), lines.join('\n') + '\n'); };
const sleep = ms => new Promise(r => setTimeout(r, ms)); const docker = (...a) => execFileSync(`${T}/bin/docker`, a, { encoding: 'utf8' });
const freePort = () => new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const owner = `own_${randomBytes(32).toString('base64url')}`; const redact = s => String(s).split(owner).join('own_…');
const png = (width, height) => { const chunk = (type, data) => { const body = Buffer.concat([Buffer.from(type, 'ascii'), data]); const length = Buffer.alloc(4); length.writeUInt32BE(data.length); const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(body) >>> 0); return Buffer.concat([length, body, crc]); };
  const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2; const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, 0x3c)]);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(Buffer.concat(Array.from({ length: height }, () => row)))), chunk('IEND', Buffer.alloc(0))]); };
const pdf = (text) => { const stream = `BT /F1 18 Tf 20 100 Td (${text}) Tj ET`; const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>', `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  let o = '%PDF-1.4\n'; const offsets = objects.map((x, i) => { const at = o.length; o += `${i + 1} 0 obj\n${x}\nendobj\n`; return at; }); const xref = o.length;
  o += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map(at => `${String(at).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`; return Buffer.from(o, 'latin1'); };
const wav = (seconds = 1, rate = 8000) => { const n = seconds * rate; const data = Buffer.alloc(n * 2); for (let i = 0; i < n; i++) data.writeInt16LE(Math.round(8000 * Math.sin(2 * Math.PI * 440 * i / rate)), i * 2);
  const h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40); return Buffer.concat([h, data]); };

const S = '/home/autobyteus/shared', X = '/srv/abtest471', RUN_DIR = '/home/autobyteus/workspace/ws-471';
const files = { notes: `${S}/notes-471.md`, picture: `${S}/picture-471.png`, plan: `${X}/plan-471.pdf`, tone: `${X}/tone-471.wav`, device: `${X}/device-471.txt`, folder: `${X}/reports-471.md`, missing: `${X}/missing-471.md`, inside: `${RUN_DIR}/inside-471.md` };
let child = null; let ok = true;
try {
  const [pA, pB] = [await freePort(), await freePort()];
  log(`# API-01 nodes and data; commit ${execFileSync('git', ['-C', W, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()}; ${new Date().toISOString()}`);
  // ---- files on the shared folder (host side of the mount) ----
  fs.mkdirSync(`${T}/shared`, { recursive: true });
  fs.writeFileSync(`${T}/shared/notes-471.md`, '# Notes 471\n\nNOTES-MARKER-471: the release notes an agent wrote.\n\n- one\n- two\n');
  fs.writeFileSync(`${T}/shared/picture-471.png`, png(120, 80));
  fs.writeFileSync(`${T}/plan-471.pdf`, pdf('PDF-MARKER-471')); fs.writeFileSync(`${T}/tone-471.wav`, wav());
  docker('run', '-d', '--name', A_NAME, '-p', `127.0.0.1:${pA}:8000`, '-v', `${T}/shared:${S}`, '-v', `${T}/agy:/opt/abtest471-agy:ro`,
    '-e', 'AUTOBYTEUS_DATA_DIR=/home/autobyteus/data', '-e', 'AUTOBYTEUS_BIND_HOST=0.0.0.0', '-e', 'AUTOBYTEUS_SERVER_PORT=8000', '-e', `AUTOBYTEUS_SERVER_HOST=http://localhost:${pA}`,
    '-e', 'APP_ENV=production', '-e', 'DB_TYPE=sqlite', '-e', 'AUTOBYTEUS_TEMP_WORKSPACE_DIR=/home/autobyteus/workspace',
    '-e', 'ANTIGRAVITY_CLI_COMMAND=/opt/abtest471-agy/agy-failure-cli.mjs', '-e', 'AGY_FAKE_CASE=linked_skills', '-e', `AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL=${owner}`,
    'abtest471/autobyteus-server:test');
  log(`node A: container ${A_NAME}, published ${docker('port', A_NAME, '8000').trim().split('\n').join(' ')}, shared ${T}/shared -> ${S}`);
  // ---- host node B ----
  const rootB = fs.mkdtempSync(path.join(os.tmpdir(), 'abtest471-node-b-')); const dataB = path.join(rootB, 'data'); fs.mkdirSync(dataB);
  fs.writeFileSync(path.join(dataB, '.env'), `APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:${pB}\n`);
  child = spawn(process.execPath, ['dist/app.js', '--host', '127.0.0.1', '--port', String(pB), '--data-dir', dataB], { cwd: `${W}/autobyteus-server-ts`,
    env: { PATH: process.env.PATH, HOME: rootB, TMPDIR: os.tmpdir(), APP_ENV: 'test', AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL: owner, ANTIGRAVITY_CLI_COMMAND: `${W}/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`, AGY_FAKE_CASE: 'linked_skills' }, stdio: ['ignore', 'pipe', 'pipe'] });
  const logB = fs.createWriteStream(`${T}/node-b.log`); child.stdout.on('data', d => logB.write(redact(d))); child.stderr.on('data', d => logB.write(redact(d)));
  log(`node B: dist/app.js on 127.0.0.1:${pB}, data root ${rootB}`);
  const nodes = { A: `http://127.0.0.1:${pA}`, B: `http://127.0.0.1:${pB}` };
  for (const [k, base] of Object.entries(nodes)) { let up = false; for (let i = 0; i < 150 && !(up = await fetch(`${base}/rest/health`).then(r => r.ok).catch(() => false)); i++) await sleep(2000); if (!up) throw new Error(`node ${k} did not start`); }
  const gql = (base) => async (q, v) => { const r = await (await fetch(`${base}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${owner}` }, body: JSON.stringify({ query: q, variables: v }) })).json(); if (r.errors) throw new Error(JSON.stringify(r.errors).slice(0, 400)); return r.data; };
  const A = gql(nodes.A), B = gql(nodes.B);
  // ---- files inside A's container (as root; the server runs as root in this image) ----
  const user = docker('exec', A_NAME, 'stat', '-c', '%U', '/home/autobyteus/data').trim();
  docker('exec', '-u', '0', A_NAME, 'mkdir', '-p', X, `${X}/reports-471.md`, RUN_DIR);
  docker('cp', `${T}/plan-471.pdf`, `${A_NAME}:${files.plan}`); docker('cp', `${T}/tone-471.wav`, `${A_NAME}:${files.tone}`);
  docker('exec', '-u', '0', A_NAME, 'sh', '-c', `ln -s /dev/null ${files.device} && printf '# Inside 471\\n\\nINSIDE-MARKER-471: a file in the run folder.\\n' > ${files.inside} && chown -R ${user} ${X} ${RUN_DIR}`);
  log(`server user in A: ${user}; files in A:\n${docker('exec', A_NAME, 'sh', '-c', `ls -la ${S} ${X} ${RUN_DIR}`).trim()}`);
  // The image's server runs as root, so a mode-000 file is readable to it; a path the node refuses for another reason is
  // a file-like link to a character device (not a regular file: 400 NODE_FILE_UNREADABLE, the same code EACCES gives).
  // ---- pairing, agents, runs ----
  for (const g of [A, B]) await g('mutation{setRemoteCollaborationEnabled(enabled:true){enabled}}');
  const invite = await B('mutation { createPeerInvite { inviteText } }');
  const paired = (await A('mutation($inviteText: String!, $name: String!, $nameOnInviter: String) { acceptPeerInvite(inviteText: $inviteText, name: $name, nameOnInviter: $nameOnInviter) { nodeId name baseUrl paired } }', { inviteText: invite.createPeerInvite.inviteText, name: PEER, nameOnInviter: 'docker-a-471' })).acceptPeerInvite;
  log(`A paired with B: ${JSON.stringify(paired)}`);
  const agy = { runtimeKind: 'antigravity_cli', llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null };
  const def = async (g, name) => (await g('mutation($i:CreateAgentDefinitionInput!){createAgentDefinition(input:$i){id}}', { i: { name, role: 'assistant', description: `${name} (471 probe)`, instructions: 'Follow the request.', toolNames: [], defaultLaunchConfig: agy } })).createAgentDefinition.id;
  await def(B, 'Publisher'); const reporter = await def(A, 'Reporter');
  const created = (await A('mutation($i:CreateAgentRunInput!){createAgentRun(input:$i){success message runId}}', { i: { agentDefinitionId: reporter, workspaceRootPath: RUN_DIR, autoExecuteTools: true, ...agy } })).createAgentRun;
  if (!created.success) throw new Error(created.message); const run = created.runId; log(`run on A: ${run} in ${RUN_DIR}`);
  const send = async (base, runId, content, contextFilePaths = []) => { const ws = new WebSocket(`${base.replace(/^http/, 'ws')}/ws/agent/${runId}?access_token=${encodeURIComponent(owner)}`);
    await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; }); await sleep(400);
    ws.send(JSON.stringify({ type: 'SEND_MESSAGE', payload: { message_id: randomUUID(), dedupe_key: `agent_run_input:probe:${randomUUID()}`, context_file_paths: contextFilePaths, image_urls: [], agent_run_id: runId, content } })); await sleep(700); ws.close(); };
  const conv = async (g, runId) => JSON.stringify((await g('query($id:String!){getRunProjection(runId:$id){conversation}}', { id: runId })).getRunProjection?.conversation ?? []);
  const waitConv = async (g, runId, test, what) => { for (let i = 0; i < 120; i++) { const c = await conv(g, runId); if (test(c)) return c; await sleep(500); } const last = await conv(g, runId); throw new Error(`timed out: ${what}; conversation tail: ${redact(last).slice(-700)}`); };
  const links = [['notes-471.md', files.notes], ['picture-471.png', files.picture], ['plan-471.pdf', files.plan], ['tone-471.wav', files.tone], ['inside-471.md', files.inside], ['missing-471.md', files.missing], ['reports-471.md', files.folder], ['device-471.txt', files.device]];
  await send(nodes.A, run, `ECHO_INPUT LINKS-471 ${links.map(([n, p]) => `[${n}](${p})`).join(' ')}`);
  await waitConv(A, run, c => /ECHO:[^]*LINKS-471/.test(c), 'the echo on A'); log('A\'s run: its own message links the eight paths');
  const before = (await conv(A, run)).split('CALLED:').length;
  await send(nodes.A, run, `CALL_TOOL:${JSON.stringify({ name: 'delegate_task', arguments: { node: PEER, recipient_address: '/publisher', description: 'Publish the notes. Marker REMOTE-471.' } })}`);
  const delegated = (await waitConv(A, run, c => c.split('CALLED:').length > before, 'the delegation')).split('CALLED:').at(-1);
  const remoteRun = new RegExp('target_agent_run_id\\\\*"\\s*:\\s*\\\\*"([^"\\\\]+)').exec(delegated)?.[1]; if (!remoteRun) throw new Error(`no remote run: ${redact(delegated).slice(0, 300)}`);
  const rootBWorkspace = path.join(rootB, 'workspace'); fs.mkdirSync(rootBWorkspace, { recursive: true }); const bNotes = path.join(rootBWorkspace, 'b-notes-471.txt'); fs.writeFileSync(bNotes, 'B-NOTES-471\n');
  await send(nodes.B, remoteRun, `ECHO_INPUT REMOTE-PATH-471 [b-notes-471.txt](${bNotes})`, [bNotes]);
  await waitConv(B, remoteRun, c => /ECHO:[^]*REMOTE-PATH-471/.test(c), 'the echo on B'); log(`remote run on B: ${remoteRun}; its own message links ${bNotes}, and a message attaches it`);
  fs.writeFileSync(`${T}/state.json`, JSON.stringify({ pA, pB, run, remoteRun, files, bNotes, peer: PEER, container: A_NAME, owner }, null, 1));
  log(`state written (${T}/state.json, not evidence). Waiting for ${T}/stop`);
  while (!fs.existsSync(`${T}/stop`)) await sleep(1000);
} catch (e) { ok = false; log('ERROR', redact(e.stack)); if (process.env.KEEP_ON_ERROR) { log('KEEP_ON_ERROR: waiting for /tmp/abtest471/stop'); while (!fs.existsSync(`${T}/stop`)) await sleep(1000); } }
finally {
  if (child) { child.kill('SIGTERM'); await sleep(2000); }
  try { fs.writeFileSync(path.join(out, 'API-01-node-a-container.log'), redact(docker('logs', A_NAME))); } catch {}
  try { fs.copyFileSync(`${T}/node-b.log`, path.join(out, 'API-01-node-b.log')); } catch {}
  try { docker('rm', '-f', '-v', A_NAME); log(`container ${A_NAME} removed`); } catch (e) { log(`container removal: ${e.message}`); }
  log(`nodes-and-data ${ok ? 'done' : 'FAILED'}`); process.exitCode = ok ? 0 : 1;
}

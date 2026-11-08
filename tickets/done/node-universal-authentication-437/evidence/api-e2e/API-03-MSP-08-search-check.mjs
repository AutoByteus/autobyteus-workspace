// MSP-08 cause check: searchFiles on a node of this worktree as owner and as a paired phone (curl-equivalent fetches).
import { spawn } from 'node:child_process'; import { randomBytes } from 'node:crypto'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import net from 'node:net';
const serverDir = process.env.SERVER_DIR;
const owner = `own_${randomBytes(32).toString('base64url')}`;
const port = await new Promise(r => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
const root = fs.realpathSync(fs.mkdtempSync(path.join('/tmp', 'sc-'))); const data = path.join(root, 'data'); const ws = path.join(root, 'ws');
fs.mkdirSync(path.join(ws, 'src'), { recursive: true }); fs.mkdirSync(data); fs.writeFileSync(path.join(ws, 'src', 'app.ts'), 'x'); fs.writeFileSync(path.join(ws, 'README.md'), 'x');
fs.writeFileSync(path.join(data, '.env'), `APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:${port}\n`);
const child = spawn(process.execPath, ['dist/app.js', '--host', '127.0.0.1', '--port', String(port), '--data-dir', data], { cwd: serverDir, env: { PATH: process.env.PATH, HOME: root, TMPDIR: os.tmpdir(), APP_ENV: 'test', AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL: owner, ABTEST437_NO_PREVALIDATION: process.env.ABTEST437_NO_PREVALIDATION ?? '' }, stdio: ['ignore', 'pipe', 'pipe'] });
let log = ''; child.stdout.on('data', d => log += d); child.stderr.on('data', d => log += d);
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 120 && !(await fetch(`http://127.0.0.1:${port}/rest/health`).then(r => r.ok).catch(() => false)); i++) await sleep(500);
const gql = async (cred, query, variables) => { const r = await fetch(`http://127.0.0.1:${port}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${cred}` }, body: JSON.stringify({ query, variables }) }); return { status: r.status, body: await r.json() }; };
try {
  const w = await gql(owner, 'mutation($i:CreateWorkspaceInput!){createWorkspace(input:$i){workspaceId}}', { i: { rootPath: ws } });
  const id = w.body.data.createWorkspace.workspaceId;
  const q = 'query($w:String!,$q:String!){searchFiles(workspaceId:$w,query:$q)}';
  for (const wait of [0, 2000, 5000]) { await sleep(wait); console.log(`owner search app after +${wait}ms:`, JSON.stringify(await gql(owner, q, { w: id, q: 'app' }))); }
  console.log('owner search README:', JSON.stringify(await gql(owner, q, { w: id, q: 'README' })));
  const rest = (m, p, b, c) => fetch(`http://127.0.0.1:${port}/rest${p}`, { method: m, headers: { 'content-type': 'application/json', ...(c ? { authorization: `Bearer ${c}` } : {}) }, body: b ? JSON.stringify(b) : undefined }).then(r => r.json());
  await rest('PUT', '/remote-access/settings', { phoneAccessEnabled: true }, owner);
  const s = await rest('POST', '/remote-access/pairing-sessions', { connectionWay: 'local_network', serverBaseUrl: `http://192.168.77.10:${port}`, trustedPrivateHttpAcknowledged: true }, owner);
  const phone = (await rest('POST', '/remote-access/pairing-exchanges', { pairingCode: s.payload.pairingCode, deviceName: 'p' })).credential;
  console.log('phone search app:', JSON.stringify(await gql(phone, q, { w: id, q: 'app' })));
} finally { child.kill('SIGTERM'); await sleep(1000); const files = fs.existsSync(path.join(data,'logs')) ? fs.readdirSync(path.join(data,'logs')) : []; const flog = files.filter(f=>f.endsWith('.log')).map(f=>fs.readFileSync(path.join(data,'logs',f),'utf8')).join('\n'); console.log('log lines with search/abort:', (log+flog).split('\n').filter(l => /search|abort/i.test(l)).slice(0, 12)); fs.rmSync(root, { recursive: true, force: true }); }

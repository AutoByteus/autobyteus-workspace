// API-04 real-network admission probe (autobyteus-437, temporary): a node of this worktree bound to 0.0.0.0, reached from
// this Mac's loopback, LAN (192.168.2.158) and Tailscale (100.127.30.107) addresses, and from a Docker container.
import { spawn, execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
const require = createRequire('/Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437/autobyteus-web/package.json');
const WebSocket = require('ws');
const serverDir = '/Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437/autobyteus-server-ts';
const out = process.argv[2];
const LAN = '192.168.2.158', TS = '100.127.30.107';
const owner = `own_${randomBytes(32).toString('base64url')}`;
const lines = [];
const log = (...a) => { const l = a.join(' '); lines.push(l); console.log(l); };
const redact = s => String(s).split(owner).join('own_…').replace(/mra_[A-Za-z0-9_-]+/g, 'mra_…');
const freePort = () => new Promise(r => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const port = await freePort();
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'api04-'));
const dataDir = path.join(root, 'data'); fs.mkdirSync(dataDir, { recursive: true }); fs.mkdirSync(path.join(root, 'home'));
fs.writeFileSync(path.join(dataDir, '.env'), `APP_ENV=test\nLOG_LEVEL=INFO\nAUTOBYTEUS_SERVER_HOST=http://${LAN}:${port}\n`);
let child;
const start = async (extra = {}) => {
  child = spawn(process.execPath, ['dist/app.js', '--host', '0.0.0.0', '--port', String(port), '--data-dir', dataDir], { cwd: serverDir,
    env: { PATH: process.env.PATH, HOME: path.join(root, 'home'), TMPDIR: os.tmpdir(), APP_ENV: 'test', AUTOBYTEUS_LAUNCH_OWNER_CREDENTIAL: owner, ...extra }, stdio: ['ignore', 'pipe', 'pipe'] });
  const logStream = fs.createWriteStream(path.join(out, 'API-04-node.log'), { flags: 'a' });
  child.stdout.pipe(logStream); child.stderr.pipe(logStream);
  for (let i = 0; i < 120; i++) { if (await fetch(`http://127.0.0.1:${port}/rest/health`).then(r => r.ok).catch(() => false)) return; await sleep(500); }
  throw new Error('node did not start');
};
const stop = async () => { child.kill('SIGTERM'); await new Promise(r => child.once('close', r)); };
const call = async (host, method, route, { cred, body } = {}) => {
  const headers = { ...(body ? { 'content-type': 'application/json' } : {}), ...(cred ? { authorization: `Bearer ${cred}` } : {}) };
  const res = await fetch(`http://${host}:${port}${route}`, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(8000) }).catch(e => ({ status: 'ERR ' + e.cause?.code }));
  let text = ''; try { text = await res.text(); } catch {}
  let code = null; try { code = JSON.parse(text).code ?? null; } catch {}
  return { status: res.status, code, text };
};
const gql = { query: '{__typename}' };
const row = async (id, label, host, method, route, opts, expect) => {
  const r = await call(host, method, route, opts);
  const ok = expect(r);
  log(`${ok ? 'PASS' : 'FAIL'} ${id} ${label}: ${method} ${host} ${route} -> ${r.status} ${r.code ?? ''}`);
  if (!ok) process.exitCode = 1;
  return r;
};
const wsTry = (host, route, token) => new Promise(resolve => {
  const ws = new WebSocket(`ws://${host}:${port}${route}?access_token=${encodeURIComponent(token)}`);
  const t = setTimeout(() => { ws.terminate(); resolve('timeout'); }, 8000);
  ws.on('unexpected-response', (_q, res) => { clearTimeout(t); resolve(`http ${res.statusCode}`); });
  ws.on('close', (code, reason) => { clearTimeout(t); resolve(`close ${code} ${String(reason)}`); });
  ws.on('error', e => { clearTimeout(t); resolve('error ' + e.message); });
  ws.on('open', () => { setTimeout(() => ws.close(), 1500); });
});
try {
  log(`# API-04 real-network admission; node port ${port}; commit ${execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: serverDir }).toString().trim()}; ${new Date().toISOString()}`);
  await start();
  // This computer and Tailscale (admitted; credential still required)
  for (const [h, n] of [['127.0.0.1', 'loopback'], [TS, 'tailscale']]) {
    await row('NAS-14', `${n} exempt`, h, 'GET', '/rest/health', {}, r => r.status === 200);
    await row('NAS-14', `${n} no key`, h, 'POST', '/graphql', { body: gql }, r => r.status === 401 && r.code === 'NODE_CREDENTIAL_REQUIRED');
    await row('NAS-12', `${n} made-up key`, h, 'POST', '/graphql', { body: gql, cred: `own_${randomBytes(32).toString('base64url')}` }, r => r.status === 401 && r.code === 'NODE_CREDENTIAL_INVALID');
    await row('NAS-05', `${n} owner key`, h, 'POST', '/graphql', { body: gql, cred: owner }, r => r.status === 200);
  }
  // LAN address of this computer: a local network the owner has not allowed
  await row('NAS-11', 'LAN not allowed, exempt', LAN, 'GET', '/rest/health', {}, r => r.status === 403 && r.code === 'NODE_NETWORK_REFUSED');
  await row('NAS-11', 'LAN not allowed, pairing exchange', LAN, 'POST', '/rest/node-access/setup-exchanges', { body: { setupCode: 'x', desktopName: 'x' } }, r => r.status === 403 && r.code === 'NODE_NETWORK_REFUSED');
  await row('NAS-07', 'LAN not allowed, valid owner key', LAN, 'POST', '/graphql', { body: gql, cred: owner }, r => r.status === 403 && r.code === 'NODE_NETWORK_REFUSED');
  log(`NAS-07 LAN not allowed, terminal WebSocket with valid key: ${await wsTry(LAN, '/ws/terminal/x', owner)}`);
  // A phone paired on this node (pairing through the API, exchange from loopback)
  await call('127.0.0.1', 'PUT', '/rest/remote-access/settings', { cred: owner, body: { phoneAccessEnabled: true } });
  const session = await call('127.0.0.1', 'POST', '/rest/remote-access/pairing-sessions', { cred: owner, body: { connectionWay: 'local_network', serverBaseUrl: `http://${LAN}:${port}`, serverName: 'API-04 node', trustedPrivateHttpAcknowledged: true } });
  const pairingCode = JSON.parse(session.text).payload.pairingCode;
  const exchange = JSON.parse((await call('127.0.0.1', 'POST', '/rest/remote-access/pairing-exchanges', { body: { pairingCode, deviceName: 'API-04 phone' } })).text);
  const phone = exchange.credential;
  log(`phone paired: session ${session.status}, credential ${/^mra_/.test(phone) ? 'mra_…' : 'MISSING'}`);
  await row('NAS-07', 'phone on LAN not allowed', LAN, 'POST', '/graphql', { body: gql, cred: phone }, r => r.status === 403 && r.code === 'NODE_NETWORK_REFUSED');
  // Owner allows this local network (Phone Setup's Allow)
  const network = JSON.parse((await call('127.0.0.1', 'GET', '/rest/remote-access/network', { cred: owner })).text).network;
  fs.writeFileSync(path.join(out, 'API-04-network.json'), JSON.stringify(network, null, 2));
  const local = network.localNetwork;
  log(`local network of ${LAN}: ${JSON.stringify(local)}`);
  const id = local?.networkId;
  await row('DEC-011', 'owner allows the network', '127.0.0.1', 'PUT', `/rest/remote-access/network/local-networks/${encodeURIComponent(id)}`, { cred: owner, body: { allowed: true } }, r => r.status === 200);
  await sleep(500);
  await row('NAS-06', 'LAN allowed, exempt', LAN, 'GET', '/rest/health', {}, r => r.status === 200);
  await row('NAS-12', 'LAN allowed, no key', LAN, 'POST', '/graphql', { body: gql }, r => r.status === 401 && r.code === 'NODE_CREDENTIAL_REQUIRED');
  await row('NAS-12', 'LAN allowed, made-up key', LAN, 'POST', '/graphql', { body: gql, cred: 'mra_' + randomBytes(32).toString('base64url') }, r => r.status === 401);
  log(`NAS-12 LAN allowed, terminal WebSocket with no key: ${await wsTry(LAN, '/ws/terminal/x', '')}`);
  await row('NAS-06', 'phone on allowed LAN', LAN, 'POST', '/graphql', { body: gql, cred: phone }, r => r.status === 200);
  await row('NAS-08', 'phone owner action on allowed LAN', LAN, 'PUT', '/rest/remote-access/settings', { cred: phone, body: { phoneAccessEnabled: false } }, r => r.status === 403 && r.code === 'NODE_ROUTE_NOT_PERMITTED');
  log(`NAS-09 phone terminal WebSocket on allowed LAN: ${await wsTry(LAN, '/ws/terminal/x', phone)}`);
  await row('NAS-05', 'owner key on allowed LAN', LAN, 'POST', '/graphql', { body: gql, cred: owner }, r => r.status === 200);
  // Owner disallows it again
  await row('DEC-011', 'owner disallows the network', '127.0.0.1', 'PUT', `/rest/remote-access/network/local-networks/${encodeURIComponent(id)}`, { cred: owner, body: { allowed: false } }, r => r.status === 200);
  await sleep(500);
  await row('NAS-07', 'phone on LAN disallowed again', LAN, 'POST', '/graphql', { body: gql, cred: phone }, r => r.status === 403 && r.code === 'NODE_NETWORK_REFUSED');
  // Docker bridge clients (Docker Desktop on macOS)
  const inContainer = (url, extra = '') => { try { return execFileSync('docker', ['run', '--rm', '--entrypoint', 'sh', 'autobyteus/autobyteus-server:beta', '-c', `curl -s -m 8 -o /dev/null -w '%{http_code}' ${extra} ${url}`], { timeout: 60000 }).toString(); } catch (e) { return 'ERR ' + e.status; } };
  log(`RSK-006 container -> host.docker.internal health: ${inContainer(`http://host.docker.internal:${port}/rest/health`)}`);
  log(`RSK-006 container -> host.docker.internal graphql no key: ${inContainer(`http://host.docker.internal:${port}/graphql`, `-X POST -H 'content-type: application/json' -d '{"query":"{__typename}"}'`)}`);
  log(`RSK-006 container -> ${LAN} health: ${inContainer(`http://${LAN}:${port}/rest/health`)}`);
  // A company VPN/proxy network listed in AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS (NAS-28): restart with this LAN listed
  await stop();
  await start({ AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS: '192.168.2.0/24' });
  await row('NAS-28', 'LAN listed in AUTOBYTEUS_ALLOWED_CLIENT_NETWORKS, phone', LAN, 'POST', '/graphql', { body: gql, cred: phone }, r => r.status === 200);
  await row('NAS-28', 'listed network, no key', LAN, 'POST', '/graphql', { body: gql }, r => r.status === 401);
  // Revoked phone (NAS-10) with an open socket
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/projects?access_token=${encodeURIComponent(phone)}`);
  const closed = new Promise(r => ws.on('close', (c, reason) => r(`close ${c} ${String(reason)}`)));
  await new Promise(r => ws.on('open', r)).catch(() => {});
  await row('NAS-10', 'owner revokes all phones', '127.0.0.1', 'DELETE', '/rest/remote-access/devices', { cred: owner }, r => r.status === 200 || r.status === 204);
  log(`NAS-10 the phone's open WebSocket: ${await Promise.race([closed, sleep(5000).then(() => 'still open')])}`);
  await row('NAS-10', 'revoked phone', LAN, 'POST', '/graphql', { body: gql, cred: phone }, r => r.status === 403 && r.code === 'REMOTE_ACCESS_DEVICE_REVOKED');
} catch (e) { log('ERROR', e.stack); process.exitCode = 1; }
finally {
  if (child && child.exitCode === null) await stop();
  const nodeLog = fs.readFileSync(path.join(out, 'API-04-node.log'), 'utf8');
  fs.writeFileSync(path.join(out, 'API-04-node.log'), redact(nodeLog));
  log(`credential strings in the node log: ${(nodeLog.match(/own_[A-Za-z0-9_-]{20,}|mra_[A-Za-z0-9_-]{20,}/g) ?? []).length}`);
  log(`refusal lines: ${(nodeLog.match(/Node request refused/g) ?? []).length}`);
  fs.writeFileSync(path.join(out, 'API-04-real-network.log'), redact(lines.join('\n')) + '\n');
  fs.rmSync(root, { recursive: true, force: true });
}

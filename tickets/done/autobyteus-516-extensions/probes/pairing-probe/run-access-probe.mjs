// Probe-only: validates the spine steps added on 2026-11-24/25 (pairing-contract.md §3 Reject/Cancel, §6 access code)
// and gap G1 (an AutoByteus app reaches a private address only through its own node's local relay).
// Headscale on loopback; machines: ryan-mac (the desktop's own node), build-server (new, no owner), bob-laptop (teammate).
// The "AutoByteus app" below is this script: it holds owner credentials and talks to nodes through ryan-mac's relay.
// Usage: node run-access-probe.mjs <tools-dir> <scratch-dir>
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MiniNode } from './mini-node.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const [tools, scratch] = process.argv.slice(2);
const HS = path.join(tools, 'dl-headscale', 'headscale');
const results = [];
const check = (name, pass, detail = '') => { results.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hs = (...a) => execFileSync(HS, ['-c', path.join(scratch, 'config.yaml'), ...a], { encoding: 'utf8' });
const admin = async (node, route, body = {}) => { const r = await fetch(`http://127.0.0.1:${node.adminPort}${route}`, { method: 'POST', body: JSON.stringify(body) }); return { status: r.status, body: await r.json() }; };
const short = (o) => JSON.stringify(o).slice(0, 150);

/**
 * The AutoByteus app's request to a node's private address, through its own node's local relay.
 * tsnet's relay is SOCKS5 with a username/password only (no HTTP proxy): a minimal SOCKS5 client follows.
 */
function viaRelay(node, url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const [host, port] = node.network.relay.split(':'); const u = new URL(url);
    const socket = net.connect(Number(port), host);
    const user = Buffer.from('tsnet'); const pass = Buffer.from(node.network.relayCredential);
    const ip = u.hostname.split('.').map(Number); const dport = Number(u.port);
    let stage = 0;
    socket.setTimeout(10_000, () => socket.destroy(new Error('relay timeout')));
    socket.on('error', reject);
    socket.on('connect', () => socket.write(Buffer.from([5, 1, 2])));
    const onData = (chunk) => {
      if (stage === 0) { if (chunk[1] !== 2) return reject(new Error('relay wants no password')); stage = 1; socket.write(Buffer.concat([Buffer.from([1, user.length]), user, Buffer.from([pass.length]), pass])); return; }
      if (stage === 1) { if (chunk[1] !== 0) return reject(new Error('relay refused the password')); stage = 2; socket.write(Buffer.from([5, 1, 0, 1, ...ip, dport >> 8, dport & 255])); return; }
      if (stage === 2) {
        if (chunk[1] !== 0) return reject(new Error(`relay could not connect (${chunk[1]})`));
        stage = 3; socket.removeListener('data', onData);
        const req = http.request({ createConnection: () => socket, host: u.hostname, port: dport, path: u.pathname, method: 'POST', headers: { 'content-type': 'application/json', ...headers } }, (resp) => {
          let data = ''; resp.on('data', (c) => { data += c; }); resp.on('end', () => { socket.destroy(); resolve({ status: resp.statusCode, body: data ? JSON.parse(data) : {} }); });
        });
        req.on('error', reject); req.end(JSON.stringify(body));
      }
    };
    socket.on('data', onData);
  });
}
/** The app pasting an access code: decode, refuse an old one before connecting, exchange the setup code. */
async function pasteAccessCode(relayNode, code) {
  let c; try { c = JSON.parse(Buffer.from(code.replace(/^abps_/, ''), 'base64url').toString()); } catch { return { refused: 'not an access code' }; }
  if (Date.now() > Date.parse(c.expiresAt)) return { refused: 'expired (checked before connecting)' };
  const r = await viaRelay(relayNode, `http://${c.address}/node-access/setup-exchanges`, { setupCode: c.setupCode });
  if (r.status !== 200) return { refused: r.body.error };
  if (r.body.nodeId !== c.nodeId) return { refused: 'reached another node' };
  return { credential: r.body.credential, address: c.address, name: r.body.name };
}

const template = await fs.readFile(path.join(here, '..', 'network-probe', 'headscale-config.template.yaml'), 'utf8');
await fs.writeFile(path.join(scratch, 'config.yaml'), template.replaceAll('__SCRATCH__', scratch));
const server = spawn(HS, ['serve', '-c', path.join(scratch, 'config.yaml')], { stdio: 'ignore' });
await sleep(3000);
hs('users', 'create', 'ryan'); hs('users', 'create', 'bob');
const users = JSON.parse(hs('users', 'list', '-o', 'json'));
const key = (n) => JSON.parse(hs('preauthkeys', 'create', '--user', String(users.find((u) => u.name === n).id), '--expiration', '1h', '--reusable', '-o', 'json')).key;
let port = 47300;
const make = (name) => new MiniNode({ name, anetPath: path.join(tools, 'anet'), control: 'http://127.0.0.1:18080', scratch, netPort: port++, adminPort: port++ });
const [mac, build, bob] = ['ryan-mac', 'build-server', 'bob-laptop'].map(make);
for (const n of [mac, build, bob]) await n.start();
const ryanKey = key('ryan');
await Promise.all([mac.joinNetwork(ryanKey), build.joinNetwork(ryanKey), bob.joinNetwork(key('bob'))]); // build-server: "signed in" on its first-run page
await sleep(2000);

// G1: the app cannot reach a private address directly, but can through its own node's relay
const direct = await fetch(`http://${build.network.ip}:8000/autobyteus/info`, { method: 'POST', signal: AbortSignal.timeout(3000) }).then((r) => `status ${r.status}`, (e) => `failed: ${e.cause?.code ?? e.name}`);
check('G1: the app cannot reach a private address by itself', /failed/.test(direct), direct);
const relayed = await viaRelay(mac, `http://${build.network.ip}:8000/autobyteus/info`, {});
check('G1: through its own node\'s local relay it reaches the node (caller attached by the network)', relayed.status === 200 || relayed.status === 403, `status ${relayed.status} ${short(relayed.body)}`);

// §6 access code: made on the new node's first-run page, pasted in the app
let r = await admin(build, '/first-run/access-code');
const code = r.body.code;
const fields = Object.keys(JSON.parse(Buffer.from(code.replace(/^abps_/, ''), 'base64url').toString())).join(',');
check('first-run page (no owner) makes an access code with exactly nodeId, address, setupCode, expiresAt', fields === 'nodeId,address,setupCode,expiresAt', `${code.length} characters; fields ${fields}`);
let t = Date.now();
const owner1 = await pasteAccessCode(mac, code);
check('pasting it: the app reaches the node through its relay and gets an owner credential', typeof owner1.credential === 'string' && /^own_/.test(owner1.credential), `${Date.now() - t} ms; ${owner1.refused ?? `owner of ${owner1.name}`}`);
r = await viaRelay(mac, `http://${owner1.address}/owner/whoami`, {}, { Authorization: `Bearer ${owner1.credential}` });
check('the app can now act as owner of the node', r.status === 200 && r.body.owner === true, short(r.body));
r = await viaRelay(mac, `http://${owner1.address}/owner/whoami`, {}, { Authorization: 'Bearer own_madeup' });
check('a made-up credential is refused', r.status === 401, short(r.body));
const again = await pasteAccessCode(mac, code);
check('the same access code a second time is refused', /used/.test(again.refused ?? ''), again.refused);
r = await admin(build, '/first-run/access-code');
check('the first-run page refuses once the node has an owner', r.status === 409, short(r.body));
r = await admin(build, '/admin/access-code');
const owner2 = await pasteAccessCode(mac, r.body.code);
check('an owner makes a second access code: another app becomes owner too', /^own_/.test(owner2.credential ?? ''), owner2.refused ?? 'second owner credential issued');
r = await admin(build, '/admin/access-code', { ttlMs: 1 });
await sleep(10);
const old = await pasteAccessCode(mac, r.body.code);
check('an expired access code is refused before connecting', /before connecting/.test(old.refused ?? ''), old.refused);
const junk = await pasteAccessCode(mac, 'abps_notacode');
check('something that is not an access code is refused', /not an access code/.test(junk.refused ?? ''), junk.refused);

// §3 Reject and Cancel
r = await admin(bob, '/admin/connect', { address: mac.network.ip, machine: 'ryan-mac' });
let req1 = (await admin(mac, '/admin/pending')).body.find((p) => p.machine === 'bob-laptop');
r = await admin(mac, '/admin/reject', { id: req1.id, address: bob.network.ip });
const declined = (await admin(bob, '/admin/declined')).body;
check('Reject: bob is told "declined", nobody is paired', r.status === 200 && declined.includes('ryan-mac') && !mac.peers.has(bob.nodeId) && !bob.peers.has(mac.nodeId), short(declined));
await admin(bob, '/admin/connect', { address: mac.network.ip, machine: 'ryan-mac' });
await admin(bob, '/admin/cancel', { machine: 'ryan-mac' });
req1 = (await admin(mac, '/admin/pending')).body.find((p) => p.machine === 'bob-laptop');
r = await admin(mac, '/admin/allow', { id: req1.id, address: bob.network.ip });
check('Cancel: a later Accept is refused as withdrawn, nothing stored on either side', r.status === 403 && r.body.withdrawn && !mac.peers.has(bob.nodeId) && !bob.peers.has(mac.nodeId), short(r.body));
r = await bob.netRequest(mac.network.ip, '/pair-rejected', {});
check('a "rejected" message nobody asked for is refused', r.status === 403, short(r.body));

for (const n of [mac, build, bob]) await n.stop();
server.kill();
const failed = results.filter((x) => !x.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);

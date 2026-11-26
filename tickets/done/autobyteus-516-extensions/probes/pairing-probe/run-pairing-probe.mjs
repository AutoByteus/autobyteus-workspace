// Probe-only: walks every pairing flow of pairing-contract.md on this Mac.
// Coordination server: Headscale on loopback. Machines (userspace network program, no admin rights):
//   ryan-mac     owner's desktop node            (account ryan)
//   ryan-docker  owner's second node             (account ryan)
//   fake-node    a machine an attacker managed to add to ryan's network (account ryan) — must not be trusted
//   bob-laptop   a teammate                      (account bob)
//   fresh-node   a brand-new node, not on the network, no owner (joins with a connection code)
// Usage: node run-pairing-probe.mjs <tools-dir> <scratch-dir>
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs/promises';
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
const admin = async (node, route, body = {}) => {
  const r = await fetch(`http://127.0.0.1:${node.adminPort}${route}`, { method: 'POST', body: JSON.stringify(body) });
  return { status: r.status, body: await r.json() };
};
const short = (o) => JSON.stringify(o).slice(0, 160);

// --- coordination server and accounts ---
const template = await fs.readFile(path.join(here, '..', 'network-probe', 'headscale-config.template.yaml'), 'utf8');
await fs.writeFile(path.join(scratch, 'config.yaml'), template.replaceAll('__SCRATCH__', scratch));
const server = spawn(HS, ['serve', '-c', path.join(scratch, 'config.yaml')], { stdio: 'ignore' });
await sleep(3000);
hs('users', 'create', 'ryan'); hs('users', 'create', 'bob');
const users = JSON.parse(hs('users', 'list', '-o', 'json'));
const uid = (n) => String(users.find((u) => u.name === n).id);
const key = (n, reusable = false) => JSON.parse(hs('preauthkeys', 'create', '--user', uid(n), '--expiration', '1h', ...(reusable ? ['--reusable'] : []), '-o', 'json')).key;

let port = 47100;
const make = (name) => new MiniNode({ name, anetPath: path.join(tools, 'anet'), control: 'http://127.0.0.1:18080', scratch, netPort: port++, adminPort: port++ });
const [mac, docker, fake, bob, fresh] = ['ryan-mac', 'ryan-docker', 'fake-node', 'bob-laptop', 'fresh-node'].map(make);
for (const n of [mac, docker, fake, bob, fresh]) await n.start();
const ryanKey = key('ryan', true);
await Promise.all([mac.joinNetwork(ryanKey), docker.joinNetwork(ryanKey), fake.joinNetwork(ryanKey), bob.joinNetwork(key('bob'))]);
const ip = (n) => n.network.ip;
await sleep(2000);

// 0. Auto-discovery, only through the private network: the network's machine list, then "are you AutoByteus?"
const printer = spawn(path.join(tools, 'anet'), ['-name', 'printer-box', '-dir', path.join(scratch, 'printer-net'), '-control', 'http://127.0.0.1:18080'], { env: { ...process.env, ANET_JOIN_KEY: ryanKey }, stdio: ['pipe', 'pipe', 'ignore'] });
await new Promise((resolve) => printer.stdout.once('data', resolve));
await sleep(2000);
let t0 = Date.now();
const machines = (await mac.anetAsk({ cmd: 'status' })).peers.filter((p) => p.online);
const discovered = [];
for (const m of machines) {
  const answer = await mac.netRequest(m.ip, '/autobyteus/info', {});
  if (answer.status === 200 && answer.body.nodeId) discovered.push(`${answer.body.name}(${m.user})`);
}
check('auto-discovery finds the AutoByteus nodes on the private network, not other machines',
  discovered.sort().join(' ') === 'bob-laptop(bob) fake-node(ryan) ryan-docker(ryan)' && machines.some((m) => m.name === 'printer-box'),
  `${Date.now() - t0} ms; machines: ${machines.map((m) => m.name).sort().join(' ')}; AutoByteus: ${discovered.sort().join(' ')}`);
const viaLocal = await fetch(`http://127.0.0.1:${mac.netPort}/autobyteus/info`).then((x) => x.status);
check('the discovery answer needs the private network (no caller from the network → refused)', viaLocal === 403, `status ${viaLocal}`);

// 1. Found is not trusted
const found = (await mac.anetAsk({ cmd: 'status' })).peers.map((p) => `${p.name}(${p.user})`).sort().join(' ');
check('ryan-mac finds the machines on the network', /ryan-docker\(ryan\)/.test(found) && /bob-laptop\(bob\)/.test(found), found);
let r = await admin(docker, '/admin/call', { address: ip(mac) });
check('a found but unpaired node is refused', r.status === 401 && /not paired/.test(r.body.error), short(r));

// 2. One-click Pair (owner clicks "Pair?" for ryan-docker): the desktop mints a grant on ryan-mac, ryan-docker presents it
const { body: { grant } } = await admin(mac, '/admin/mint-grant', { forMachine: 'ryan-docker' });
r = await admin(docker, '/admin/pair-with', { address: ip(mac), grant, machine: 'ryan-mac', account: 'ryan' });
check('one click: ryan-docker and ryan-mac are paired (keys exchanged)', r.status === 200 && mac.peers.has(docker.nodeId) && docker.peers.has(mac.nodeId), short(r));
r = await admin(docker, '/admin/call', { address: ip(mac) }); const r2 = await admin(mac, '/admin/call', { address: ip(docker) });
check('signed requests work both ways after pairing', r.status === 200 && r2.status === 200, `${short(r.body)} / ${short(r2.body)}`);

// 3. Grants: one use, bound to the clicked machine
r = await admin(docker, '/admin/pair-with', { address: ip(mac), grant });
check('a used grant is refused', r.status === 403 && /used/.test(r.body.error), short(r));
const { body: { grant: g2 } } = await admin(mac, '/admin/mint-grant', { forMachine: 'ryan-docker' });
r = await admin(fake, '/admin/pair-with', { address: ip(mac), grant: g2 });
check('a grant clicked for ryan-docker is refused from another machine', r.status === 403 && /for ryan-docker, not fake-node/.test(r.body.error), short(r));
const { body: { grant: g3 } } = await admin(mac, '/admin/mint-grant', { forMachine: 'ryan-docker', ttlMs: 1 });
await sleep(20);
r = await admin(docker, '/admin/pair-with', { address: ip(mac), grant: g3 });
check('an expired grant is refused', r.status === 403 && /expired/.test(r.body.error), short(r));

// 4. A fake machine on your own account, without your click: pending only
r = await admin(fake, '/admin/connect', { address: ip(mac), machine: 'ryan-mac' });
const pend = (await admin(mac, '/admin/pending')).body;
check('fake machine on your account without your click is only a pending request', r.status === 202 && !mac.peers.has(fake.nodeId) && pend.some((p) => p.machine === 'fake-node' && p.account === 'ryan'), short(pend));
r = await admin(fake, '/admin/call', { address: ip(mac) });
check('the fake machine cannot call ryan-mac', r.status === 401, short(r));

// 5. The opt-in switch: with it on, same-account machines pair without a click (the documented risk)
await admin(mac, '/admin/set-trust', { on: true });
r = await admin(fake, '/admin/connect', { address: ip(mac), machine: 'ryan-mac' });
check('opt-in switch on: a same-account machine pairs without a click (why it is off by default)', r.status === 200 && mac.peers.has(fake.nodeId), short(r));
await admin(mac, '/admin/set-trust', { on: false });
await admin(mac, '/admin/unpair', { nodeId: fake.nodeId });

// 6. Teammate: Connect / Allow
r = await admin(bob, '/admin/connect', { address: ip(mac), machine: 'ryan-mac' });
const req = (await admin(mac, '/admin/pending')).body.find((p) => p.machine === 'bob-laptop');
check('teammate Connect shows "bob-laptop, added by bob" waiting for Allow', r.status === 202 && req?.account === 'bob', short(req));
r = await admin(mac, '/admin/allow', { id: req.id, address: ip(bob) });
check('Allow pairs both sides as teammates', r.status === 200 && mac.peers.get(bob.nodeId)?.role === 'teammate' && bob.peers.get(mac.nodeId)?.role === 'teammate', short(r));
r = await admin(bob, '/admin/call', { address: ip(mac) });
check('teammate can collaborate (signed request accepted)', r.status === 200, short(r.body));
r = await admin(bob, '/admin/call', { address: ip(mac), path: '/owner/rename', payload: { name: 'pwned' } });
check('a teammate is never an owner', r.status === 403 && /peers are not owners/.test(r.body.error), short(r));
r = await fake.netRequest(ip(bob), '/pair-accepted', fake.identity());
check('a forged "accepted" from a machine Bob did not Connect to is refused', r.status === 403, short(r));

// 7. Signed requests: forgery, replay, stolen key
r = await admin(docker, '/admin/call', { address: ip(mac), tamper: true });
check('a forged signature is refused', r.status === 401 && /bad signature/.test(r.body.error), short(r));
let payload = { ping: true };
r = await docker.netRequest(ip(mac), '/collab/hello', payload, docker.signedHeaders('POST', '/collab/hello', payload, { timestamp: Date.now() - 120_000 }));
check('a replayed old request is refused', r.status === 401 && /stale/.test(r.body.error), short(r));
r = await fake.netRequest(ip(mac), '/collab/hello', payload, fake.signedHeaders('POST', '/collab/hello', payload, { nodeId: docker.nodeId, privateKey: docker.keys.privateKey }));
check('ryan-docker\'s stolen key used from another machine is refused', r.status === 401 && /peer is ryan-docker/.test(r.body.error), short(r));

// 8. Unpair
await admin(mac, '/admin/unpair', { nodeId: docker.nodeId });
r = await admin(docker, '/admin/call', { address: ip(mac) });
check('after unpairing, requests are refused', r.status === 401 && /not paired/.test(r.body.error), short(r));

// 9. A brand-new node with one paste (connection code)
r = await mac.netRequest(ip(docker), '/first-run/connection-code', { code: 'x' });
check('the first-run page cannot be reached over the network', r.status === 404, short(r));
const codeResp = await admin(mac, '/admin/add-machine', { joinKey: key('ryan') });
const code = codeResp.body.code;
check('"Add a machine" produces one connection code', /^abpn_/.test(code), `${code.length} characters`);
let t = Date.now();
r = await admin(fresh, '/first-run/connection-code', { code });
check('one paste: the new node joins the network and is paired and owned', r.status === 200 && fresh.owner?.nodeId === mac.nodeId && mac.peers.get(fresh.nodeId)?.role === 'own', `${Date.now() - t} ms; ${short(r.body)}`);
r = await admin(mac, '/admin/call', { address: ip(fresh), path: '/owner/rename', payload: { name: 'linux-box' } });
check('the owner node can perform owner actions on the new node', r.status === 200 && fresh.name === 'linux-box', short(r.body));
r = await admin(fresh, '/first-run/connection-code', { code });
check('pasting again on an owned node is refused', r.status === 409, short(r));
const fresh2 = make('fresh-node-2'); await fresh2.start();
r = await admin(fresh2, '/first-run/connection-code', { code });
check('the same code is refused on another new node (one use)', r.status === 403, short(r));
const expired = (await admin(mac, '/admin/add-machine', { joinKey: key('ryan'), ttlMs: 1 })).body.code;
await sleep(20);
const fresh3 = make('fresh-node-3'); await fresh3.start();
r = await admin(fresh3, '/first-run/connection-code', { code: expired });
check('an expired code is refused', r.status === 403 && /expired/.test(r.body.error), short(r));

for (const n of [mac, docker, fake, bob, fresh, fresh2, fresh3]) await n.stop();
printer.kill();
server.kill();
await fs.writeFile(path.join(scratch, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);
const failed = results.filter((x) => !x.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);

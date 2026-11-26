// Probe-only: Private Network idea on this Mac only. A Headscale coordination server on loopback,
// three "machines" as userspace tsnet nodes (no VPN device, no administrator rights):
//   ryan-mac and ryan-linux added by user ryan (the owner), bob-laptop added by user bob (a teammate).
// Usage: node run-network-probe.mjs <tools-dir> <scratch-dir>
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const [tools, scratch] = process.argv.slice(2);
const HS = path.join(tools, 'dl-headscale', 'headscale');
const ANET = path.join(tools, 'anet');
const CONTROL = 'http://127.0.0.1:18080';
const results = [];
const check = (name, pass, detail = '') => { results.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hs = (...args) => execFileSync(HS, ['-c', path.join(scratch, 'config.yaml'), ...args], { encoding: 'utf8' });
const interfaces = () => execFileSync('ifconfig', ['-l'], { encoding: 'utf8' }).trim().split(/\s+/).sort().join(' ');
const systemTailscale = () => {
  try { const d = JSON.parse(execFileSync('tailscale', ['status', '--json'], { encoding: 'utf8' })); return `${d.BackendState}/${Object.keys(d.Peer ?? {}).length} peers`; } catch (e) { return `unavailable: ${e.message.slice(0, 60)}`; }
};

// --- coordination server ---
const config = (await fs.readFile(path.join(here, 'headscale-config.template.yaml'), 'utf8')).replaceAll('__SCRATCH__', scratch);
await fs.writeFile(path.join(scratch, 'config.yaml'), config);
const before = { interfaces: interfaces(), tailscale: systemTailscale() };
const server = spawn(HS, ['serve', '-c', path.join(scratch, 'config.yaml')], { stdio: ['ignore', 'ignore', 'pipe'] });
await sleep(3000);
hs('users', 'create', 'ryan'); hs('users', 'create', 'bob');
const users = JSON.parse(hs('users', 'list', '-o', 'json'));
const userId = (name) => String(users.find((u) => u.name === name).id);
const joinKey = (name, reusable) => JSON.parse(hs('preauthkeys', 'create', '--user', userId(name), '--expiration', '1h', ...(reusable ? ['--reusable'] : []), '-o', 'json')).key;
const ryanKey = joinKey('ryan', true); // one invite for all of the owner's own machines
const bobKey = joinKey('bob', false);  // a one-time invite for a teammate

// --- machines: the extension's server part would run this program and talk JSON lines ---
const machines = new Map();
function startMachine(name, key) {
  const child = spawn(ANET, ['-name', name, '-dir', path.join(scratch, name), '-control', CONTROL], { env: { ...process.env, ANET_JOIN_KEY: key ?? '' }, stdio: ['pipe', 'pipe', 'pipe'] });
  const m = { name, child, pending: new Map(), next: 0, buffer: '' };
  m.ready = new Promise((resolve, reject) => { m.onReady = resolve; m.onFail = reject; });
  child.stdout.on('data', (chunk) => {
    m.buffer += chunk; const lines = m.buffer.split('\n'); m.buffer = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      const msg = JSON.parse(line);
      if (msg.type === 'ready') m.onReady(msg); else if (msg.type === 'error') m.onFail(new Error(msg.error));
      else m.pending.get(msg.id)?.(msg);
    }
  });
  child.on('close', (code) => m.onFail(new Error(`exited ${code}`)));
  m.ask = (cmd) => new Promise((resolve) => { const id = String(++m.next); m.pending.set(id, resolve); child.stdin.write(`${JSON.stringify({ ...cmd, id })}\n`); });
  m.stop = () => new Promise((resolve) => { child.once('close', resolve); child.stdin.write('{"cmd":"quit"}\n'); });
  machines.set(name, m);
  return m;
}

let t = Date.now();
const [mac, linux, bob] = [startMachine('ryan-mac', ryanKey), startMachine('ryan-linux', ryanKey), startMachine('bob-laptop', bobKey)];
const ready = await Promise.all([mac.ready, linux.ready, bob.ready]);
check('three machines joined with invite keys, no administrator rights', true, `${Date.now() - t} ms; ${ready.map((r) => `${r.name}=${r.ip}`).join(', ')}`);
const ip = Object.fromEntries(ready.map((r) => [r.name, r.ip]));
await sleep(2000);
check('no VPN device created on this Mac', interfaces() === before.interfaces);
check('your real Tailscale untouched', systemTailscale() === before.tailscale, `${before.tailscale} → ${systemTailscale()}`);

// --- finding machines ---
const status = await mac.ask({ cmd: 'status' });
const peerSummary = status.peers.map((p) => `${p.name}(${p.user},${p.online ? 'online' : 'offline'})`).sort().join(' ');
check('ryan-mac lists the other machines with who added them', /bob-laptop\(bob/.test(peerSummary) && /ryan-linux\(ryan/.test(peerSummary), peerSummary);

// --- who is this connection: the basis for automatic pairing (same owner) vs Connect/Allow (teammate) ---
const fromMac = await mac.ask({ cmd: 'get', url: `http://${ip['ryan-linux']}:8000/whoami` });
const macId = JSON.parse(fromMac.body ?? '{}');
check('ryan-linux identifies a call from ryan-mac: same owner → pair automatically', macId.callerUser === 'ryan' && /ryan-mac/.test(macId.callerMachine), fromMac.body ?? fromMac.error);
const fromBob = await bob.ask({ cmd: 'get', url: `http://${ip['ryan-mac']}:8000/whoami` });
const bobId = JSON.parse(fromBob.body ?? '{}');
check('ryan-mac identifies a call from bob-laptop: another person → ask Allow', bobId.callerUser === 'bob' && /bob-laptop/.test(bobId.callerMachine), fromBob.body ?? fromBob.error);

// --- restart without a key (state kept) ---
await linux.stop();
t = Date.now();
const linux2 = startMachine('ryan-linux', null);
await linux2.ready;
const readyMs = Date.now() - t;
let again = null;
for (let i = 0; i < 30 && again?.status !== 200; i += 1) {
  again = await mac.ask({ cmd: 'get', url: `http://${ip['ryan-linux']}:8000/whoami` });
  if (again.status !== 200) await sleep(1000);
}
check('restarted machine rejoins without any key', again.status === 200, `ready after ${readyMs} ms, reachable after ${Date.now() - t} ms${again.status === 200 ? '' : `; last: ${again.error}`}`);

// --- revocation: remove bob's machine from the network ---
const nodes = JSON.parse(hs('nodes', 'list', '-o', 'json'));
const bobNode = nodes.find((n) => n.given_name === 'bob-laptop' || n.name === 'bob-laptop');
hs('nodes', 'delete', '--identifier', String(bobNode.id), '--force');
t = Date.now();
let revoked = false;
for (let i = 0; i < 20 && !revoked; i += 1) {
  const r = await bob.ask({ cmd: 'get', url: `http://${ip['ryan-mac']}:8000/whoami` });
  revoked = r.status !== 200; if (!revoked) await sleep(1000);
}
check('removed machine can no longer reach your servers', revoked, `${Date.now() - t} ms after removal`);
const statusAfter = await mac.ask({ cmd: 'status' });
check('removed machine disappears from your machine list', !statusAfter.peers.some((p) => p.name === 'bob-laptop'), statusAfter.peers.map((p) => p.name).join(' '));

for (const m of [mac, linux2, bob]) { try { await Promise.race([m.stop(), sleep(3000)]); } catch {} m.child.kill(); }
server.kill();
check('your real Tailscale still untouched at the end', systemTailscale() === before.tailscale);
await fs.writeFile(path.join(scratch, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);
const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);

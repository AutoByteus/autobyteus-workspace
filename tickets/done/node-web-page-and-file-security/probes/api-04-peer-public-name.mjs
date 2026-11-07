#!/usr/bin/env node
// API-04 (autobyteus-416 AC-012 alternate, REQ-003, REQ-006): a peer node registered by a public DNS name the node cannot
// recognise is refused, and the refused node's log names the host and the setting; once the owner lists the name in
// AUTOBYTEUS_ALLOWED_HOSTS and restarts, the same registration works.
// The name is `lvh.me`: public DNS resolves it to 127.0.0.1, so it reaches a node on this machine exactly as a
// company-domain name reaches a node on the owner's network, and it is in no automatic class (REQ-002).
// Nodes: alpha and beta, this worktree's autobyteus-server-ts/dist/app.js on 127.0.0.1, own data roots and HOMEs, clean
// environment. Real surface: the Nodes tab's GraphQL (setRemoteCollaborationEnabled, addPeerNode, peer list).
// Steps:
//   P1 alpha adds beta at http://lvh.me:<beta port>: refused; beta's log has one line
//      `Remote Access request refused REMOTE_ACCESS_HOST_REFUSED … host lvh.me (add it to AUTOBYTEUS_ALLOWED_HOSTS …)`
//      and no credential; nothing is registered on alpha.
//   P2 beta restarts with AUTOBYTEUS_ALLOWED_HOSTS=lvh.me: the same add succeeds and the peer is Working / reachable;
//      beta's log gets no new refusal line.
//   P3 control: alpha adds beta at http://127.0.0.1:<beta port> is unaffected (already allowed), checked before P1.
// Usage: node api-04-peer-public-name.mjs <worktree> <output dir>
import { spawn } from 'node:child_process';
import { createWriteStream, mkdtempSync, realpathSync, readFileSync } from 'node:fs';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import dns from 'node:dns/promises';

const [worktree, outArg] = process.argv.slice(2);
const out = path.resolve(outArg);
await fs.mkdir(out, { recursive: true });
const serverDir = path.join(worktree, 'autobyteus-server-ts');
const appEntry = path.join(serverDir, 'dist', 'app.js');
const PUBLIC_NAME = 'lvh.me';
const ev = { startedAt: new Date().toISOString(), result: 'Fail', publicName: PUBLIC_NAME, steps: {}, cleanup: {}, error: null };
const save = () => fs.writeFile(path.join(out, 'API-04-peer-public-name.json'), `${JSON.stringify(ev, null, 2)}\n`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const assert = (c, m, d) => { if (!c) throw Object.assign(new Error(m), { details: d }); };
const freePort = () => new Promise((res, rej) => { const s = net.createServer(); s.once('error', rej); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); }); });
const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'api416-04-')));
const children = new Set();

const node = async (name, extraEnv = {}) => {
  const port = await freePort();
  const n = { name, port, url: `http://127.0.0.1:${port}`, dataDir: path.join(root, name, 'data'), home: path.join(root, name, 'home'), logFile: path.join(out, `server-${name}.log`) };
  await fs.mkdir(n.dataDir, { recursive: true }); await fs.mkdir(n.home, { recursive: true });
  await fs.writeFile(path.join(n.dataDir, '.env'), `AUTOBYTEUS_SERVER_HOST=${n.url}\nAPP_ENV=test\nLOG_LEVEL=INFO\n`);
  n.start = async (env = extraEnv) => {
    const log = createWriteStream(n.logFile, { flags: 'a' });
    log.write(`\n=== start ${new Date().toISOString()} env ${JSON.stringify(env)}\n`);
    const child = spawn(process.execPath, [appEntry, '--host', '127.0.0.1', '--port', String(n.port), '--data-dir', n.dataDir], { cwd: serverDir, stdio: ['ignore', 'pipe', 'pipe'],
      env: { PATH: process.env.PATH, HOME: n.home, TMPDIR: process.env.TMPDIR ?? os.tmpdir(), APP_ENV: 'test', LOG_LEVEL: 'INFO', AUTOBYTEUS_SERVER_HOST: n.url, ...env } });
    child.stdout.pipe(log); child.stderr.pipe(log); children.add(child); n.child = child;
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) { if (child.exitCode !== null) throw new Error(`${name} exited`); if (await fetch(`${n.url}/rest/health`).then(r => r.ok).catch(() => false)) break; await sleep(200); }
    n.nodeId = (await (await fetch(`${n.url}/rest/remote-access/status`)).json()).nodeId;
  };
  n.stop = async () => { if (!n.child || n.child.exitCode !== null) return; n.child.kill('SIGTERM'); await Promise.race([new Promise(r => n.child.once('close', r)), sleep(15_000)]); if (n.child.exitCode === null && n.child.signalCode === null) n.child.kill('SIGKILL'); children.delete(n.child); };
  n.gql = async (query, variables) => (await (await fetch(`${n.url}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json());
  await n.start();
  return n;
};
const refusals = n => readFileSync(n.logFile, 'utf8').split('\n').filter(l => /Remote Access request refused|Remote Access WebSocket rejected/.test(l));
const ADD = 'mutation($i:AddPeerNodeInput!){addPeerNode(input:$i){nodeId name baseUrl}}';
const REMOVE = 'mutation($id:String!){removePeerNode(nodeId:$id)}';
const PEERS = '{ peerNodes { nodeId name baseUrl } }';

let alpha, beta;
try {
  ev.dns = await dns.lookup(PUBLIC_NAME, { all: true });
  assert(ev.dns.some(a => a.address === '127.0.0.1'), `${PUBLIC_NAME} must resolve to 127.0.0.1`, ev.dns);
  alpha = await node('alpha'); beta = await node('beta');
  for (const n of [alpha, beta]) ev.steps[`switchOn-${n.name}`] = (await n.gql('mutation{setRemoteCollaborationEnabled(enabled:true){enabled}}')).data;

  // P3 control first: by IP it works, then it is removed again so P1 starts clean.
  const control = await alpha.gql(ADD, { i: { nodeId: beta.nodeId, baseUrl: beta.url, name: 'beta-by-ip' } });
  ev.steps.P3 = { add: control };
  assert(control.data?.addPeerNode?.baseUrl === beta.url, 'the IP registration works', control);
  ev.steps.P3.remove = await alpha.gql(REMOVE, { id: beta.nodeId });
  ev.steps.P3.peersAfterRemove = (await alpha.gql(PEERS)).data;
  ev.steps.P3.result = 'Pass';

  const before = refusals(beta).length;
  const publicUrl = `http://${PUBLIC_NAME}:${beta.port}`;
  const p1 = await alpha.gql(ADD, { i: { nodeId: beta.nodeId, baseUrl: publicUrl, name: 'beta-by-public-name' } });
  await sleep(500);
  const lines = refusals(beta).slice(before);
  ev.steps.P1 = { add: p1, betaRefusalLines: lines, peersOnAlpha: (await alpha.gql(PEERS)).data };
  assert(!p1.data?.addPeerNode, 'the registration by the public name is refused', p1);
  assert(lines.length >= 1 && lines.every(l => l.includes('REMOTE_ACCESS_HOST_REFUSED') && l.includes(`host ${PUBLIC_NAME}`) && l.includes('add it to AUTOBYTEUS_ALLOWED_HOSTS')), 'beta logs the host refusal with the hint', lines);
  assert(!lines.some(l => /authorization|access_token|mra_|Bearer/i.test(l)), 'no credential in the log line', lines);
  ev.steps.P1.result = 'Pass';

  await beta.stop();
  await beta.start({ AUTOBYTEUS_ALLOWED_HOSTS: PUBLIC_NAME });
  const before2 = refusals(beta).length;
  const p2 = await alpha.gql(ADD, { i: { nodeId: beta.nodeId, baseUrl: publicUrl, name: 'beta-by-public-name' } });
  await sleep(500);
  ev.steps.P2 = { add: p2, peersOnAlpha: (await alpha.gql(PEERS)).data, newBetaRefusalLines: refusals(beta).slice(before2) };
  assert(p2.data?.addPeerNode?.baseUrl === publicUrl, 'the registration by the configured name works', p2);
  assert(ev.steps.P2.newBetaRefusalLines.length === 0, 'no refusal once configured', ev.steps.P2.newBetaRefusalLines);
  ev.steps.P2.result = 'Pass';
  ev.result = 'Pass';
} catch (error) {
  ev.error = `${error.stack ?? error.message}${error.details ? `\n${JSON.stringify(error.details)}` : ''}`;
} finally {
  for (const n of [alpha, beta]) await n?.stop();
  await fs.rm(root, { recursive: true, force: true });
  ev.cleanup = { serversLeft: [...children].filter(c => c.exitCode === null && c.signalCode === null).length, rootRemoved: true };
  ev.finishedAt = new Date().toISOString();
  await save();
  console.log(`API-04 peer public name: ${ev.result}${ev.error ? `\n${ev.error}` : ''}`);
  process.exit(ev.result === 'Pass' ? 0 : 1);
}

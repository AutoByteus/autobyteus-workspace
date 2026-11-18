// autobyteus-405: what a viewer sees when Xvnc or the node server restarts (test-owned container).
// Usage: node check-restarts.mjs <ws package.json> <backend base http URL> <container>
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const require = createRequire(process.argv[2]);
const { WebSocket } = require('ws');
const [base, container] = process.argv.slice(3);
const wsBase = base.replace(/^http/, 'ws');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const supervisor = (...args) => execFileSync('docker', ['exec', container, 'supervisorctl', '-c', '/etc/supervisor/supervisord.conf', ...args], { encoding: 'utf8' }).trim();
const upstreamSockets = () => execFileSync('docker', ['exec', container, 'cat', '/proc/net/tcp', '/proc/net/tcp6'], { encoding: 'utf8' })
  .split('\n').slice(1).map((line) => line.trim().split(/\s+/))
  .filter((cols) => cols.length > 3 && cols[3] === '01' && cols[2]?.endsWith(':170C')).length;

/** Opens a View only stream and waits for the node desktop's RFB version string. */
const openViewer = () => new Promise((resolve, reject) => {
  const ws = new WebSocket(`${wsBase}/ws/node-desktop?mode=view`);
  const closed = new Promise((done) => ws.on('close', (code, reason) => done({ code, reason: reason.toString() })));
  ws.on('error', () => undefined);
  ws.once('message', (data) => resolve({ ws, closed, version: data.toString('latin1', 0, 11) }));
  setTimeout(() => reject(new Error('no RFB version within 10 s')), 10_000);
});

const waitForHealth = async () => {
  for (let i = 0; i < 120; i += 1) {
    try { if ((await fetch(`${base}/rest/health`)).ok) return i; } catch { /* restarting */ }
    await sleep(500);
  }
  throw new Error('server did not come back');
};

const results = {};
const beforeXvnc = await openViewer();
results.xvncRestart = { versionBefore: beforeXvnc.version, restart: supervisor('restart', 'tigervnc') };
results.xvncRestart.viewerClose = await beforeXvnc.closed;
await sleep(2000);
results.xvncRestart.upstreamAfter = upstreamSockets();
const afterXvnc = await openViewer();
results.xvncRestart.reconnectVersion = afterXvnc.version;
afterXvnc.ws.close(1000);
await afterXvnc.closed;

const beforeServer = await openViewer();
results.serverRestart = { versionBefore: beforeServer.version, upstreamWhileOpen: upstreamSockets() };
results.serverRestart.restart = supervisor('restart', 'autobyteus_server');
results.serverRestart.viewerClose = await beforeServer.closed;
results.serverRestart.healthPolls = await waitForHealth();
results.serverRestart.upstreamAfter = upstreamSockets();
const afterServer = await openViewer();
results.serverRestart.reconnectVersion = afterServer.version;
afterServer.ws.close(1000);
await afterServer.closed;
await sleep(300);
results.upstreamAtEnd = upstreamSockets();
console.log(JSON.stringify(results, null, 2));

// autobyteus-405 implementation-scoped real-node check (test-owned container only).
// Usage: node check-node-desktop.mjs <ws package.json> <backend base http URL> <container>
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const require = createRequire(process.argv[2]);
const { WebSocket } = require('ws');
const [base, container] = process.argv.slice(3);
const wsBase = base.replace(/^http/, 'ws');

const inNode = (...args) => execFileSync('docker', ['exec', '--user', 'vncuser', '--env', 'DISPLAY=:99', container, ...args], { encoding: 'utf8' }).trim();
const dimensions = () => /dimensions:\s+(\d+x\d+)/.exec(inNode('xdpyinfo'))?.[1];
const mouse = () => inNode('xdotool', 'getmouselocation');
/** Established TCP sockets whose remote port is 5900 (the server's side of each stream to Xvnc). */
const upstreamSockets = () => execFileSync('docker', ['exec', container, 'cat', '/proc/net/tcp', '/proc/net/tcp6'], { encoding: 'utf8' })
  .split('\n').slice(1).map((line) => line.trim().split(/\s+/))
  .filter((cols) => cols.length > 3 && cols[3] === '01' && cols[2]?.endsWith(':170C')).length;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const u16 = (n) => [(n >> 8) & 255, n & 255];
const pointer = (x, y, mask = 0) => Buffer.from([5, mask, ...u16(x), ...u16(y)]);
const setDesktopSize = (w, h) => Buffer.from([251, 0, ...u16(w), ...u16(h), 1, 0, ...Array(16).fill(0)]);

function openViewer(query) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${wsBase}/ws/node-desktop${query}`);
    ws.binaryType = 'nodebuffer';
    let buf = Buffer.alloc(0);
    let stage = 'version';
    const out = { query, closed: null };
    const closed = new Promise((done) => ws.on('close', (code, reason) => { out.closed = { code, reason: reason.toString() }; done(out.closed); }));
    const timer = setTimeout(() => reject(new Error(`timeout at ${stage} for ${query}`)), 10_000);
    ws.on('error', () => undefined);
    ws.on('close', () => { if (stage !== 'ready') { clearTimeout(timer); resolve({ ws, out, closed }); } });
    ws.on('message', (data) => {
      buf = Buffer.concat([buf, data]);
      for (;;) {
        if (stage === 'version' && buf.length >= 12) {
          out.serverVersion = buf.subarray(0, 11).toString(); buf = buf.subarray(12);
          ws.send(Buffer.from('RFB 003.008\n')); stage = 'sectypes';
        } else if (stage === 'sectypes' && buf.length >= 1 && buf.length >= 1 + buf[0]) {
          out.securityTypes = [...buf.subarray(1, 1 + buf[0])]; buf = buf.subarray(1 + buf[0]);
          ws.send(Buffer.from([1])); stage = 'secresult';
        } else if (stage === 'secresult' && buf.length >= 4) {
          out.securityResult = buf.readUInt32BE(0); buf = buf.subarray(4);
          ws.send(Buffer.from([0])); stage = 'serverinit';
        } else if (stage === 'serverinit' && buf.length >= 24 && buf.length >= 24 + buf.readUInt32BE(20)) {
          out.width = buf.readUInt16BE(0); out.height = buf.readUInt16BE(2);
          out.desktopName = buf.subarray(24, 24 + buf.readUInt32BE(20)).toString();
          buf = Buffer.alloc(0); stage = 'ready'; clearTimeout(timer);
          resolve({ ws, out, closed });
        } else { return; }
      }
    });
  });
}

const results = { base, container };
const availability = await fetch(`${base}/rest/node-desktop`);
results.availability = { status: availability.status, body: await availability.json() };
results.dimensionsBefore = dimensions();
results.upstreamBefore = upstreamSockets();

// View only: handshake, pointer and resize dropped.
inNode('xdotool', 'mousemove', '300', '300');
const view = await openViewer('?mode=view');
results.view = view.out;
view.ws.send(Buffer.concat([pointer(37, 41), pointer(38, 42, 1), pointer(38, 42, 0), setDesktopSize(800, 600)]));
await sleep(1000);
results.mouseAfterViewPointer = mouse();
results.dimensionsAfterViewResize = dimensions();
results.viewStillOpen = view.ws.readyState === WebSocket.OPEN;

// Control: pointer delivered, resize still dropped; a second viewer at the same time (AC-009).
const control = await openViewer('?mode=control');
results.control = control.out;
results.upstreamWithTwoViewers = upstreamSockets();
control.ws.send(Buffer.concat([pointer(53, 59), setDesktopSize(1024, 768)]));
await sleep(1000);
results.mouseAfterControlPointer = mouse();
results.dimensionsAfterControlResize = dimensions();
results.controlStillOpen = control.ws.readyState === WebSocket.OPEN;

// Closing both viewers ends their upstream connections.
view.ws.close(1000); control.ws.close(1000);
await Promise.all([view.closed, control.closed]);
const closedAt = Date.now();
while (upstreamSockets() > results.upstreamBefore && Date.now() - closedAt < 2000) await sleep(50);
results.upstreamAfterClose = upstreamSockets();
results.upstreamClosedWithinMs = Date.now() - closedAt;

// A query naming a target is refused before any upstream connection.
const refused = await openViewer('?mode=view&host=127.0.0.1&port=5900');
results.refusedTargetQuery = await refused.closed;
results.upstreamAfterRefusal = upstreamSockets();
results.dimensionsAfter = dimensions();
console.log(JSON.stringify(results, null, 2));

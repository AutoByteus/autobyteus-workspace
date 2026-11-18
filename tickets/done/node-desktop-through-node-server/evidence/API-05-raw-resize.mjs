// autobyteus-405 API-05 (AC-009): a raw viewer in each mode sends SetDesktopSize (800x600) while the desktop
// app's viewer is connected to the same node desktop. Prints what the raw viewer saw; the caller checks
// xdpyinfo inside the node and the app tile afterwards.
// Usage: node API-05-raw-resize.mjs <ws package.json> <backend base http URL>
import { createRequire } from 'node:module';
const require = createRequire(process.argv[2]);
const { WebSocket } = require('ws');
const wsBase = process.argv[3].replace(/^http/, 'ws');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const u16 = (n) => [(n >> 8) & 255, n & 255];
const setDesktopSize = (w, h) => Buffer.from([251, 0, ...u16(w), ...u16(h), 1, 0, ...Array(16).fill(0)]);

const viewer = (mode) => new Promise((resolve, reject) => {
  const ws = new WebSocket(`${wsBase}/ws/node-desktop?mode=${mode}`);
  let buf = Buffer.alloc(0); let stage = 'version'; const out = { mode };
  ws.on('close', (code, reason) => { out.closed = { code, reason: reason.toString() }; });
  ws.on('error', reject);
  ws.on('message', async (data) => {
    buf = Buffer.concat([buf, data]);
    if (stage === 'version' && buf.length >= 12) { buf = buf.subarray(12); ws.send(Buffer.from('RFB 003.008\n')); stage = 'sec'; }
    if (stage === 'sec' && buf.length >= 1 + buf[0]) { buf = buf.subarray(1 + buf[0]); ws.send(Buffer.from([1])); stage = 'res'; }
    if (stage === 'res' && buf.length >= 4) { buf = buf.subarray(4); ws.send(Buffer.from([0])); stage = 'init'; }
    if (stage === 'init' && buf.length >= 24 && buf.length >= 24 + buf.readUInt32BE(20)) {
      out.initSize = `${buf.readUInt16BE(0)}x${buf.readUInt16BE(2)}`; stage = 'ready'; buf = Buffer.alloc(0);
      ws.send(setDesktopSize(800, 600)); await sleep(2000);
      out.openAfterSetDesktopSize = ws.readyState === WebSocket.OPEN;
      ws.close(1000); await sleep(300); resolve(out);
    }
  });
});

console.log(JSON.stringify([await viewer('view'), await viewer('control')]));

// autobyteus-407 API/E2E: hold N raw trusted-network viewers of the node desktop open (RFB handshake done),
// to bring the node to its stream limit. Prints one JSON line per viewer, then keeps them open until killed
// (SIGTERM closes them with 1000). Usage: node filler.mjs <ws package.json> <ws base, e.g. ws://127.0.0.1:56465> <count>
import { createRequire } from 'node:module';
const [wsPkg, wsBase, count] = process.argv.slice(2);
const { WebSocket } = createRequire(wsPkg)('ws');
const open = (i) => new Promise((resolve) => {
  const ws = new WebSocket(`${wsBase}/ws/node-desktop?mode=view`);
  let buf = Buffer.alloc(0); let stage = 'version';
  ws.on('close', (code, reason) => { if (stage !== 'ready') resolve({ i, closed: code, reason: reason.toString() }); });
  ws.on('error', () => {});
  ws.on('message', (d) => {
    buf = Buffer.concat([buf, d]);
    if (stage === 'version' && buf.length >= 12) { buf = buf.subarray(12); ws.send(Buffer.from('RFB 003.008\n')); stage = 'sec'; }
    if (stage === 'sec' && buf.length >= 1 + buf[0]) { buf = buf.subarray(1 + buf[0]); ws.send(Buffer.from([1])); stage = 'res'; }
    if (stage === 'res' && buf.length >= 4) { buf = buf.subarray(4); ws.send(Buffer.from([1])); stage = 'init'; }
    if (stage === 'init' && buf.length >= 24 && buf.length >= 24 + buf.readUInt32BE(20)) { stage = 'ready'; buf = Buffer.alloc(0); resolve({ i, open: true, ws }); }
  });
});
const viewers = [];
for (let i = 1; i <= Number(count); i++) { const r = await open(i); viewers.push(r); console.log(JSON.stringify({ viewer: i, open: !!r.open, closed: r.closed ?? null, reason: r.reason ?? null })); }
process.on('SIGTERM', () => { viewers.forEach((v) => v.ws?.close(1000)); setTimeout(() => process.exit(0), 300); });
setInterval(() => {}, 1 << 30);

// autobyteus-402 AC-006 check (isolated test node only).
// 1) RFB handshake through the node's VNC Viewer port on 127.0.0.1 (websockify -> Xvnc).
// 2) TCP reachability of each host port on 127.0.0.1 and on the Mac's LAN address.
// Usage: node check-published-ports.mjs <ws package.json path> <lanIp> <backend> <vncViewer> <oldVnc> <oldDebug>
import { createRequire } from 'node:module';
import net from 'node:net';
const require = createRequire(process.argv[2]);
const { WebSocket } = require('ws');
const [lanIp, backend, vncViewer, oldVnc, oldDebug] = process.argv.slice(3);

function rfbHandshake(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, ['binary']);
    ws.binaryType = 'nodebuffer';
    let buf = Buffer.alloc(0);
    let stage = 'version';
    const out = { url };
    const timer = setTimeout(() => { ws.terminate(); reject(new Error('timeout at ' + stage)); }, 8000);
    ws.on('open', () => { out.negotiatedProtocol = ws.protocol || '(none)'; });
    ws.on('error', (e) => { clearTimeout(timer); reject(e); });
    ws.on('message', (data) => {
      buf = Buffer.concat([buf, data]);
      for (;;) {
        if (stage === 'version' && buf.length >= 12) {
          out.serverVersion = buf.subarray(0, 11).toString();
          buf = buf.subarray(12); ws.send(Buffer.from('RFB 003.008\n')); stage = 'sectypes';
        } else if (stage === 'sectypes' && buf.length >= 1 && buf.length >= 1 + buf[0]) {
          out.securityTypes = [...buf.subarray(1, 1 + buf[0])];
          buf = buf.subarray(1 + buf[0]); ws.send(Buffer.from([1])); stage = 'secresult';
        } else if (stage === 'secresult' && buf.length >= 4) {
          out.securityResult = buf.readUInt32BE(0); buf = buf.subarray(4);
          ws.send(Buffer.from([1])); stage = 'serverinit';
        } else if (stage === 'serverinit' && buf.length >= 24 && buf.length >= 24 + buf.readUInt32BE(20)) {
          out.width = buf.readUInt16BE(0); out.height = buf.readUInt16BE(2);
          out.desktopName = buf.subarray(24, 24 + buf.readUInt32BE(20)).toString();
          clearTimeout(timer); ws.close(); resolve(out); return;
        } else { return; }
      }
    });
  });
}

function tcpReach(host, port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port: Number(port) });
    const done = (result) => { socket.destroy(); resolve({ host, port: Number(port), result }); };
    socket.setTimeout(3000, () => done('timeout'));
    socket.on('connect', () => done('connected'));
    socket.on('error', (e) => done(e.code));
  });
}

const results = {};
results.rfbViaLoopbackVncViewer = await rfbHandshake(`ws://127.0.0.1:${vncViewer}`).catch((e) => ({ error: String(e) }));
results.reachability = [];
for (const host of ['127.0.0.1', lanIp]) {
  for (const [label, port] of [['backend', backend], ['vncViewer', vncViewer], ['oldVnc5900', oldVnc], ['oldDebug9223', oldDebug]]) {
    results.reachability.push({ label, ...(await tcpReach(host, port)) });
  }
}
console.log(JSON.stringify(results, null, 2));

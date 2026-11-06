// autobyteus-405: what Xvnc sends a viewer when the agent's clipboard changes, per mode, when the
// viewer advertises extended clipboard like noVNC does (test-owned container only).
// Usage: node check-clipboard-desync.mjs <ws package.json> <backend base http URL> <container>
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const require = createRequire(process.argv[2]);
const { WebSocket } = require('ws');
const [base, container] = process.argv.slice(3);
const wsBase = base.replace(/^http/, 'ws');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const writeAgentClipboard = (text) => execFileSync('docker', ['exec', '-i', '--user', 'vncuser', '--env', 'DISPLAY=:99', container,
  'xclip', '-selection', 'clipboard', '-in'], { input: text });

const EXTENDED_CLIPBOARD = -1063131698; // pseudo-encoding noVNC advertises
const CAPS = 1 << 24, REQUEST = 1 << 25, PEEK = 1 << 26, NOTIFY = 1 << 27, PROVIDE = 1 << 28;
const s32 = (n) => { const b = Buffer.alloc(4); b.writeInt32BE(n); return [...b]; };
const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32BE(n >>> 0); return [...b]; };
// noVNC's own caps reply: caps + its actions, text format, max size 0 (rfb.js extendedClipboardCaps).
const clientCaps = Buffer.from([6, 0, 0, 0, ...s32(-8), ...u32(CAPS | REQUEST | PEEK | NOTIFY | PROVIDE | 1), ...u32(0)]);
const actionNames = (flags) => Object.entries({ caps: CAPS, request: REQUEST, peek: PEEK, notify: NOTIFY, provide: PROVIDE })
  .filter(([, bit]) => flags & bit).map(([name]) => name);

const run = (mode) => new Promise((resolve, reject) => {
  const ws = new WebSocket(`${wsBase}/ws/node-desktop?mode=${mode}`);
  let buf = Buffer.alloc(0);
  let stage = 'version';
  const cutTexts = [];
  const timer = setTimeout(() => reject(new Error(`timeout in ${mode} at ${stage}`)), 15_000);
  ws.on('message', async (data) => {
    buf = Buffer.concat([buf, data]);
    for (;;) {
      if (stage === 'version' && buf.length >= 12) { buf = buf.subarray(12); ws.send(Buffer.from('RFB 003.008\n')); stage = 'sec'; }
      else if (stage === 'sec' && buf.length >= 1 + buf[0]) { buf = buf.subarray(1 + buf[0]); ws.send(Buffer.from([1])); stage = 'secresult'; }
      else if (stage === 'secresult' && buf.length >= 4) { buf = buf.subarray(4); ws.send(Buffer.from([1])); stage = 'init'; }
      else if (stage === 'init' && buf.length >= 24 && buf.length >= 24 + buf.readUInt32BE(20)) {
        buf = buf.subarray(24 + buf.readUInt32BE(20)); stage = 'messages';
        // Encodings: Raw + ExtendedClipboard, no framebuffer requests (only clipboard traffic comes back).
        ws.send(Buffer.from([2, 0, 0, 2, ...s32(0), ...s32(EXTENDED_CLIPBOARD)]));
      } else if (stage === 'messages' && buf.length >= 8 && buf[0] === 3) {
        const length = buf.readInt32BE(4);
        if (buf.length < 8 + Math.abs(length)) return;
        const body = buf.subarray(8, 8 + Math.abs(length));
        buf = buf.subarray(8 + Math.abs(length));
        const entry = length >= 0
          ? { kind: 'standard', textLength: length }
          : { kind: 'extended', actions: actionNames(body.readUInt32BE(0)), payloadBytes: body.length - 4, firstPayloadByte: body[4] ?? null };
        cutTexts.push(entry);
        if (entry.kind === 'extended' && entry.actions.includes('caps')) {
          ws.send(clientCaps);
          await sleep(300);
          writeAgentClipboard(`abx405-agent-clipboard-${mode}-${Date.now()}`);
          setTimeout(() => { clearTimeout(timer); ws.close(1000); resolve({ mode, cutTexts }); }, 1500);
        }
      } else if (stage === 'messages' && buf.length > 0 && buf[0] !== 3) { buf = Buffer.alloc(0); }
      else return;
    }
  });
  ws.on('error', reject);
});

console.log(JSON.stringify([await run('view'), await run('control')], null, 2));

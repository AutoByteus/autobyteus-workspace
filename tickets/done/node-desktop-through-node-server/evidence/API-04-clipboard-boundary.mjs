// autobyteus-405 API-04: which clipboard messages from a raw viewer reach the real Xvnc, per mode
// (test-owned node only). For each mode: handshake through /ws/node-desktop, SetEncodings with
// ExtendedClipboard, Caps exchange with noVNC's own Caps reply, then:
//   1. the agent copies a marker in the node; the viewer sends an extended Request  -> does a Provide come back?
//   2. the viewer announces its clipboard (Notify), answers the server's Request with a Provide (the protocol's
//      own flow; Xvnc ignores data from a client that did not announce) -> Request back? node clipboard changed?
//   3. the viewer sends a Caps that also carries Request + Provide action bits        -> any Provide back? clipboard?
//   4. the viewer sends a legacy ClientCutText (positive length) with a marker        -> does the node clipboard change?
// Each check reads the node clipboard with xclip inside the node and records whether the stream is still open.
// Only marker strings made by this probe are ever on either clipboard.
// Usage: node API-04-clipboard-boundary.mjs <ws package.json> <backend base http URL> <container>
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import zlib from 'node:zlib';
const require = createRequire(process.argv[2]);
const { WebSocket } = require('ws');
const [base, container] = process.argv.slice(3);
const wsBase = base.replace(/^http/, 'ws');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const inNode = (args, input) => execFileSync('docker', ['exec', '-i', '--user', 'vncuser', '--env', 'DISPLAY=:99', container, ...args],
  { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
const setNodeClipboard = (text) => inNode(['xclip', '-selection', 'clipboard', '-in'], text);
const readNodeClipboard = () => { try { return inNode(['xclip', '-selection', 'clipboard', '-out']); } catch { return '<empty>'; } };

const EXTENDED_CLIPBOARD = -1063131698;
const CAPS = 1 << 24, REQUEST = 1 << 25, PEEK = 1 << 26, NOTIFY = 1 << 27, PROVIDE = 1 << 28, TEXT = 1;
const s32 = (n) => { const b = Buffer.alloc(4); b.writeInt32BE(n); return [...b]; };
const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32BE(n >>> 0); return [...b]; };
const extended = (flags, payload = Buffer.alloc(0)) => Buffer.from([6, 0, 0, 0, ...s32(-(4 + payload.length)), ...u32(flags), ...payload]);
const noVncCaps = extended(CAPS | REQUEST | PEEK | NOTIFY | PROVIDE | TEXT, Buffer.from(u32(0)));
const capsWithRequestAndProvide = extended(CAPS | REQUEST | PROVIDE | TEXT, Buffer.from(u32(0)));
const request = extended(REQUEST | TEXT);
const notify = extended(NOTIFY | TEXT);
const provide = (text) => {
  const body = Buffer.from(`${text}\0`, 'utf8');
  return extended(PROVIDE | TEXT, zlib.deflateSync(Buffer.concat([Buffer.from(u32(body.length)), body])));
};
const legacyCutText = (text) => { const t = Buffer.from(text, 'latin1'); return Buffer.concat([Buffer.from([6, 0, 0, 0, ...u32(t.length)]), t]); };
const actionNames = (flags) => Object.entries({ caps: CAPS, request: REQUEST, peek: PEEK, notify: NOTIFY, provide: PROVIDE })
  .filter(([, bit]) => flags & bit).map(([n]) => n);

const run = (mode) => new Promise((resolve, reject) => {
  const ws = new WebSocket(`${wsBase}/ws/node-desktop?mode=${mode}`);
  let buf = Buffer.alloc(0); let stage = 'version';
  const received = []; const steps = {}; let closed = null;
  const timer = setTimeout(() => reject(new Error(`timeout in ${mode} at ${stage}`)), 60_000);
  ws.on('close', (code, reason) => { closed = { code, reason: reason.toString() }; });
  ws.on('error', reject);
  const since = (n) => received.slice(n);
  const script = async () => {
    const marker = (what) => `abx405-api-${what}-${mode}-${Date.now()}`;
    // 1. agent copies, viewer requests
    const agentText = marker('agent'); let n = received.length;
    setNodeClipboard(agentText); await sleep(800);
    const afterCopy = since(n).map((m) => m.actions ?? m.kind);
    n = received.length; ws.send(request); await sleep(1500);
    const replies1 = since(n);
    steps.requestAfterAgentCopy = { serverSentAfterCopy: afterCopy, repliesToRequest: replies1.map((m) => m.actions ?? m.kind),
      agentMarker: agentText, provideTexts: replies1.filter((m) => 'text' in m).map((m) => m.text),
      provideCarriedAgentText: replies1.some((m) => m.text === agentText), open: closed === null };
    // 2. viewer announces (Notify), the server may Request, the viewer Provides
    const viewerText = marker('viewer-provide'); n = received.length;
    ws.send(notify); await sleep(1200);
    const afterNotify = since(n).map((m) => m.actions ?? m.kind);
    ws.send(provide(viewerText)); await sleep(1500);
    const clip2 = readNodeClipboard();
    steps.viewerNotifyThenProvide = { serverRepliesToNotify: afterNotify, nodeClipboardIsViewerText: clip2 === viewerText,
      nodeClipboardIsAgentText: clip2 === agentText, open: closed === null };
    // 3. caps with request + provide action bits
    n = received.length; ws.send(capsWithRequestAndProvide); await sleep(1500);
    const clip3 = readNodeClipboard();
    steps.capsWithRequestAndProvideBits = { replies: since(n).map((m) => m.actions ?? m.kind),
      provideCarriedAnyText: since(n).some((m) => typeof m.text === 'string'),
      nodeClipboardUnchangedFromStep2: clip3 === clip2, open: closed === null };
    // 4. legacy ClientCutText
    const legacyText = marker('viewer-legacy');
    ws.send(legacyCutText(legacyText)); await sleep(1500);
    const clip4 = readNodeClipboard();
    steps.legacyCutText = { nodeClipboardIsLegacyText: clip4 === legacyText, open: closed === null };
    clearTimeout(timer); ws.close(1000); await sleep(300);
    resolve({ mode, steps, closedAtEnd: closed });
  };
  ws.on('message', (data) => {
    buf = Buffer.concat([buf, data]);
    for (;;) {
      if (stage === 'version' && buf.length >= 12) { buf = buf.subarray(12); ws.send(Buffer.from('RFB 003.008\n')); stage = 'sec'; }
      else if (stage === 'sec' && buf.length >= 1 + buf[0]) { buf = buf.subarray(1 + buf[0]); ws.send(Buffer.from([1])); stage = 'secresult'; }
      else if (stage === 'secresult' && buf.length >= 4) { buf = buf.subarray(4); ws.send(Buffer.from([1])); stage = 'init'; }
      else if (stage === 'init' && buf.length >= 24 && buf.length >= 24 + buf.readUInt32BE(20)) {
        buf = buf.subarray(24 + buf.readUInt32BE(20)); stage = 'messages';
        ws.send(Buffer.from([2, 0, 0, 2, ...s32(0), ...s32(EXTENDED_CLIPBOARD)]));
      } else if (stage === 'messages' && buf.length >= 8 && buf[0] === 3) {
        const length = buf.readInt32BE(4);
        if (buf.length < 8 + Math.abs(length)) return;
        const body = buf.subarray(8, 8 + Math.abs(length)); buf = buf.subarray(8 + Math.abs(length));
        if (length >= 0) { received.push({ kind: 'legacy', text: body.toString('latin1') }); continue; }
        const flags = body.readUInt32BE(0); const entry = { kind: 'extended', actions: actionNames(flags) };
        if ((flags & PROVIDE) && !(flags & CAPS)) {
          try { const raw = zlib.inflateSync(body.subarray(4), { finishFlush: zlib.constants.Z_SYNC_FLUSH }); entry.text = raw.subarray(4, 4 + raw.readUInt32BE(0)).toString('utf8').replace(/\0$/, ''); } catch { entry.text = '<undecodable>'; }
        }
        received.push(entry);
        if (entry.actions.includes('caps') && !steps.started) { steps.started = true; ws.send(noVncCaps); setTimeout(() => script().catch(reject), 500); }
      } else if (stage === 'messages' && buf.length > 0 && buf[0] !== 3) { buf = Buffer.alloc(0); }
      else return;
    }
  });
});

const results = [];
for (const mode of ['view', 'control']) { setNodeClipboard(`abx405-api-reset-${mode}`); results.push(await run(mode)); }
console.log(JSON.stringify(results, (k, v) => (k === 'started' ? undefined : v), 2));

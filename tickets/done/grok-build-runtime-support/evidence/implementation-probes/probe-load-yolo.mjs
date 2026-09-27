// Zero-cost probe (no session/prompt): does session/load honor _meta.yoloMode, and does
// yolo persist across load? Reads Grok's own `_x.ai/sessions/changed` yolo field.
import { spawn } from 'node:child_process';
import { Readable, Writable } from 'node:stream';
import * as acp from '@agentclientprotocol/sdk';
const cwd = process.argv[2];
const open = async (label, fn) => {
  const child = spawn('grok', ['agent', '--model', 'grok-4.7', 'stdio'], { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
  child.stderr.on('data', () => {});
  const seen = [];
  const conn = new acp.ClientSideConnection(() => ({
    async sessionUpdate() {}, async requestPermission() { return { outcome: { outcome: 'cancelled' } }; },
    async extNotification(m, p) { if (m === '_x.ai/sessions/changed') for (const s of p.upserted ?? []) seen.push({ id: s.sessionId, yolo: s.yolo }); },
  }), acp.ndJsonStream(Writable.toWeb(child.stdin), Readable.toWeb(child.stdout)));
  await conn.initialize({ protocolVersion: 1, clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false } });
  const id = await fn(conn);
  await new Promise((r) => setTimeout(r, 2500));
  child.kill('SIGTERM');
  console.log(label, JSON.stringify({ id, sessionsChanged: seen }));
  return id;
};
const id = await open('new(yolo=true)', async (c) => (await c.newSession({ cwd, mcpServers: [], _meta: { yoloMode: true } })).sessionId);
await open('load(no meta)', async (c) => { await c.loadSession({ sessionId: id, cwd, mcpServers: [] }); return id; });
await open('load(_meta.yoloMode=false)', async (c) => { await c.loadSession({ sessionId: id, cwd, mcpServers: [], _meta: { yoloMode: false } }); return id; });
process.exit(0);

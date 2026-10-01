// Zero-cost probe: does Grok report MCP server_status after session/new WITHOUT any prompt?
// Also exercises session/load (no prompt) with an MCP server. No session/prompt is ever sent.
import { spawn } from 'node:child_process';
import { Readable, Writable } from 'node:stream';
import * as acp from '@agentclientprotocol/sdk';
const cwd = process.argv[2]; const url = process.argv[3]; const loadId = process.argv[4] ?? null;
const t0 = Date.now(); const log = (...a) => console.log(`+${Date.now() - t0}ms`, ...a);
const child = spawn('grok', ['agent', '--model', 'grok-4.7', '--reasoning-effort', 'low', 'stdio'], { cwd, stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, GROK_SUBAGENTS: '0', GROK_WORKFLOWS: '0', GROK_ASK_USER_QUESTION: '0' } });
child.stderr.on('data', () => {});
const conn = new acp.ClientSideConnection(() => ({
  async sessionUpdate(p) { log('update', p.update.sessionUpdate); },
  async requestPermission() { return { outcome: { outcome: 'cancelled' } }; },
  async extNotification(m, p) { if (/mcp/.test(m)) log('ext', m, JSON.stringify(p).slice(0, 200)); },
}), acp.ndJsonStream(Writable.toWeb(child.stdin), Readable.toWeb(child.stdout)));
await conn.initialize({ protocolVersion: 1, clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false } });
const mcpServers = [{ type: 'http', name: 'autobyteus_agent_tools', url, headers: [] }];
if (loadId) { await conn.loadSession({ sessionId: loadId, cwd, mcpServers }); log('load result', loadId); }
else { const r = await conn.newSession({ cwd, mcpServers, _meta: { yoloMode: false, rules: 'probe' } }); log('new result', r.sessionId); }
await new Promise((r) => setTimeout(r, 6000));
child.kill('SIGTERM'); process.exit(0);

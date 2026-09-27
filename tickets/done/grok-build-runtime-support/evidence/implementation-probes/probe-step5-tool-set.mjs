// Step 5 (paid, one model call): confirm GROK_SUBAGENTS/GROK_WORKFLOWS/GROK_ASK_USER_QUESTION=0
// remove task/workflow/ask_user_question from the session tool set (tool_definitions.json).
import { spawn } from 'node:child_process';
import { Readable, Writable } from 'node:stream';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as acp from '@agentclientprotocol/sdk';
const cwd = process.argv[2];
const child = spawn('grok', ['agent', '--model', 'grok-4.7', '--reasoning-effort', 'low', 'stdio'], { cwd, stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, GROK_SUBAGENTS: '0', GROK_WORKFLOWS: '0', GROK_ASK_USER_QUESTION: '0' } });
child.stderr.on('data', () => {});
const usage = [];
const conn = new acp.ClientSideConnection(() => ({
  async sessionUpdate() {},
  async requestPermission() { return { outcome: { outcome: 'cancelled' } }; },
  async extNotification(m, p) { if (p?.update?.sessionUpdate === 'response_completed') usage.push(p.update.usage); if (p?.update?.sessionUpdate === 'turn_completed') usage.push({ turn: p.update.usage?.costUsdTicks }); },
}), acp.ndJsonStream(Writable.toWeb(child.stdin), Readable.toWeb(child.stdout)));
await conn.initialize({ protocolVersion: 1, clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false } });
const { sessionId } = await conn.newSession({ cwd, mcpServers: [], _meta: { yoloMode: false } });
const result = await conn.prompt({ sessionId, prompt: [{ type: 'text', text: 'Reply with the single word OK. Do not use any tools.' }] });
await new Promise((r) => setTimeout(r, 1000));
child.kill('SIGTERM');
const dir = path.join(os.homedir(), '.grok', 'sessions', encodeURIComponent(cwd), sessionId);
const defsFile = fs.readdirSync(dir).find((f) => f === 'tool_definitions.json');
const defs = JSON.parse(fs.readFileSync(path.join(dir, defsFile), 'utf8'));
const tools = (Array.isArray(defs) ? defs : defs.tools ?? Object.values(defs)).map((t) => t.name ?? t.function?.name ?? t.function_name ?? JSON.stringify(t).slice(0, 40));
console.log(JSON.stringify({ sessionId, stopReason: result.stopReason, usage, toolCount: tools.length, tools,
  forbiddenPresent: tools.filter((t) => ['task', 'workflow', 'ask_user_question'].includes(t)) }, null, 1));
const pick = (n) => (Array.isArray(defs) ? defs : defs.tools ?? Object.values(defs)).find((t) => (t.name ?? t.function?.name) === n);
console.log('write schema:', JSON.stringify(pick('write'))?.slice(0, 1500));
console.log('search_replace schema:', JSON.stringify(pick('search_replace'))?.slice(0, 1500));
process.exit(0);

import { spawn } from 'node:child_process';
import readline from 'node:readline';
import fs from 'node:fs';
const cwd = '/tmp/grok-acp-exp/ws'; const logPath = '/tmp/grok-acp-exp/cancel.log.jsonl'; fs.writeFileSync(logPath, '');
const log = (d, o) => fs.appendFileSync(logPath, `${new Date().toISOString()} ${d} ${typeof o === 'string' ? o : JSON.stringify(o)}\n`);
const proc = spawn('grok', ['agent', '--model', 'grok-4.7', '--reasoning-effort', 'low', 'stdio'], { cwd, stdio: ['pipe','pipe','pipe'], env: { ...process.env, GROK_SUBAGENTS: '0' } });
proc.stderr.on('data', (d) => log('[stderr]', d.toString().trimEnd()));
const rl = readline.createInterface({ input: proc.stdout });
let nextId = 1; const pending = new Map();
const send = (o) => { log('>>', o); proc.stdin.write(JSON.stringify(o) + '\n'); };
const request = (method, params) => new Promise((res, rej) => { const id = nextId++; pending.set(id, { res, rej }); send({ jsonrpc: '2.0', id, method, params }); });
let sessionId = null; let chunks = 0; let cancelled = false;
rl.on('line', (line) => { let m; try { m = JSON.parse(line); } catch { return; } log('<<', m);
  if (m.id !== undefined && m.method === undefined && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(m.error) : p.res(m.result); return; }
  if (m.method && m.id !== undefined) { send({ jsonrpc: '2.0', id: m.id, error: { code: -32601, message: 'n/a' } }); return; }
  if (m.method === 'session/update' && m.params?.update?.sessionUpdate === 'agent_message_chunk') { chunks++; if (chunks >= 5 && !cancelled) { cancelled = true; log('##', 'sending session/cancel after 5 message chunks'); send({ jsonrpc: '2.0', method: 'session/cancel', params: { sessionId } }); } }
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  await request('initialize', { protocolVersion: 1, clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false } });
  const created = await request('session/new', { cwd, mcpServers: [], _meta: { yoloMode: true } }); sessionId = created.sessionId;
  const t0 = Date.now();
  const result = await request('session/prompt', { sessionId, prompt: [{ type: 'text', text: 'Without using any tools, write the numbers from 1 to 300 as words, one per line, no other text.' }] });
  log('## prompt result', { ms: Date.now() - t0, result });
  await sleep(300); proc.kill('SIGTERM'); await sleep(200);
  console.log(JSON.stringify({ sessionId, chunks, cancelled, stopReason: result?.stopReason }));
})().catch((e) => { log('## FATAL', String(e?.message || e)); proc.kill('SIGTERM'); process.exit(1); });

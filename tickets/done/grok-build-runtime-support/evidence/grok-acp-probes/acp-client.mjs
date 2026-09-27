import { spawn } from 'node:child_process';
import readline from 'node:readline';
import fs from 'node:fs';

const mode = process.argv[2];
const cwd = process.env.EXP_CWD || '/tmp/grok-acp-exp/ws';
const logPath = process.env.EXP_LOG || `/tmp/grok-acp-exp/${mode}.log.jsonl`;
const model = process.env.EXP_MODEL || 'grok-4.7';
const effort = process.env.EXP_EFFORT || 'low';
const yolo = process.env.EXP_YOLO !== '0';
const sessionIdToLoad = process.env.EXP_SESSION_ID || null;
const mcpUrl = process.env.EXP_MCP_URL || null;
const promptText = process.env.EXP_PROMPT || null;

fs.writeFileSync(logPath, '');
const log = (dir, obj) => fs.appendFileSync(logPath, `${new Date().toISOString()} ${dir} ${typeof obj === 'string' ? obj : JSON.stringify(obj)}\n`);

const agentArgs = ['agent', '--model', model, '--reasoning-effort', effort, 'stdio'];
log('##', `spawn grok ${agentArgs.join(' ')} cwd=${cwd}`);
const proc = spawn('grok', agentArgs, { cwd, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, GROK_SUBAGENTS: '0' } });
proc.stderr.on('data', (d) => log('[stderr]', d.toString().trimEnd()));
proc.on('exit', (code, sig) => log('##', `agent exit code=${code} sig=${sig}`));
const rl = readline.createInterface({ input: proc.stdout });

let nextId = 1;
const pending = new Map();
const send = (obj) => { log('>>', obj); proc.stdin.write(JSON.stringify(obj) + '\n'); };
const request = (method, params) => new Promise((resolve, reject) => {
  const id = nextId++;
  pending.set(id, { resolve, reject, method });
  send({ jsonrpc: '2.0', id, method, params });
});

rl.on('line', (line) => {
  let msg;
  try { msg = JSON.parse(line); } catch { log('[raw]', line); return; }
  log('<<', msg);
  if (msg.id !== undefined && msg.method === undefined && pending.has(msg.id)) {
    const p = pending.get(msg.id); pending.delete(msg.id);
    msg.error ? p.reject(msg.error) : p.resolve(msg.result);
    return;
  }
  if (msg.method && msg.id !== undefined) handleAgentRequest(msg);
});

function handleAgentRequest(msg) {
  if (msg.method === 'session/request_permission') {
    const opts = msg.params?.options || [];
    const choice = opts.find((o) => o.kind === 'allow_once') || opts[0];
    log('##', `permission requested; answering optionId=${choice?.optionId}`);
    send({ jsonrpc: '2.0', id: msg.id, result: { outcome: { outcome: 'selected', optionId: choice?.optionId } } });
    return;
  }
  send({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: `client does not implement ${msg.method}` } });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const init = await request('initialize', {
    protocolVersion: 1,
    clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false },
    clientInfo: { name: 'autobyteus-acp-probe', version: '0.0.1' },
  });
  log('## initialize.result', init);

  let sessionId;
  if (mode === 'load') {
    const loaded = await request('session/load', { sessionId: sessionIdToLoad, cwd, mcpServers: [] });
    log('## session/load.result', loaded);
    sessionId = sessionIdToLoad;
  } else {
    const mcpServers = mcpUrl ? [{ type: 'http', name: 'autobyteus_probe_tools', url: mcpUrl, headers: [] }] : [];
    const meta = {};
    if (yolo) meta.yoloMode = true;
    meta.rules = 'RULE-PROBE: Begin every reply with the exact token PINEAPPLE.';
    const created = await request('session/new', { cwd, mcpServers, _meta: meta });
    log('## session/new.result', created);
    sessionId = created.sessionId;
  }

  if (mode === 'handshake') {
    // zero-cost: no prompt
  } else if (promptText) {
    const result = await request('session/prompt', { sessionId, prompt: [{ type: 'text', text: promptText }] });
    log('## session/prompt.result', result);
  }
  await sleep(500);
  proc.kill('SIGTERM');
  await sleep(300);
  console.log(JSON.stringify({ mode, sessionId, logPath }));
}
main().catch((e) => { log('## FATAL', String(e?.message || e)); console.error(e); proc.kill('SIGTERM'); process.exit(1); });

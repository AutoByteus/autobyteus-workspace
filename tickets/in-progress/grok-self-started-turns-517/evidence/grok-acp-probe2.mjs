// Probe 2 (autobyteus-517 round 3, AR-001 + cancel): Grok 1.0.88 over ACP, as AutoByteus launches it.
// A: a background job ends while the client turn is still running (foreground 20 s after a 5 s background job).
// B: a self-started prompt (after a background job) is cancelled with session/cancel while it runs.
import { spawn } from 'node:child_process';
import { appendFileSync, writeFileSync } from 'node:fs';
const LOG = process.argv[2], CWD = process.argv[3];
writeFileSync(LOG, '');
const t0 = Date.now();
const log = (dir, obj) => appendFileSync(LOG, JSON.stringify({ t: ((Date.now() - t0) / 1000).toFixed(1), dir, msg: obj }) + '\n');
const child = spawn('grok', ['agent', '--no-leader', 'stdio'], { cwd: CWD, stdio: ['pipe', 'pipe', 'pipe'] });
child.stderr.on('data', (d) => log('stderr', String(d).slice(0, 2000)));
let buf = '', nextId = 1; const pending = new Map(); const listeners = [];
const send = (obj) => { log('out', obj); child.stdin.write(JSON.stringify(obj) + '\n'); };
const request = (method, params) => new Promise((res) => { const id = nextId++; pending.set(id, res); send({ jsonrpc: '2.0', id, method, params }); });
child.stdout.on('data', (d) => {
  buf += d; let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i); buf = buf.slice(i + 1); if (!line.trim()) continue;
    let m; try { m = JSON.parse(line); } catch { log('in-raw', line.slice(0, 2000)); continue; }
    log('in', m);
    for (const l of listeners) l(m);
    if (m.id !== undefined && (m.result !== undefined || m.error !== undefined) && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    else if (m.id !== undefined && m.method) {
      if (m.method === 'session/request_permission') {
        const opt = (m.params?.options ?? []).find((o) => /allow/i.test(o.kind ?? o.optionId ?? '')) ?? m.params?.options?.[0];
        send({ jsonrpc: '2.0', id: m.id, result: { outcome: { outcome: 'selected', optionId: opt?.optionId } } });
      } else send({ jsonrpc: '2.0', id: m.id, error: { code: -32601, message: 'not supported by probe' } });
    }
  }
});
const waitFor = (pred, ms) => new Promise((res) => { const t = setTimeout(() => res(null), ms); listeners.push((m) => { if (pred(m)) { clearTimeout(t); res(m); } }); });
await request('initialize', { protocolVersion: 1, clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false } });
const sess = await request('session/new', { cwd: CWD, mcpServers: [], _meta: { yoloMode: true } });
const sessionId = sess.result?.sessionId; log('note', { sessionId });
// Scenario A
log('note', 'SCENARIO A start');
const a = await request('session/prompt', { sessionId, prompt: [{ type: 'text', text: 'Do exactly this, in this order, in this one turn: (1) run `bash short.sh` in the background (block_until_ms 0); (2) then run `bash long.sh` in the foreground with block_until_ms 60000 and wait for it; (3) then reply with the single word DONE-A and end your turn. When the background job finishes, if you get a separate notice, reply with the single word NOTICED.' }] });
log('note', { scenarioA_promptReturned: a.result ?? a.error });
await new Promise((r) => setTimeout(r, 40000));
// Scenario B
log('note', 'SCENARIO B start');
const b = await request('session/prompt', { sessionId, prompt: [{ type: 'text', text: 'Run `bash job2.sh` in the background (block_until_ms 0) and end your turn immediately with the single word STARTED. When that job finishes, run `bash long2.sh` in the foreground (block_until_ms 60000), wait for it, then reply FINISHED.' }] });
log('note', { scenarioB_promptReturned: b.result ?? b.error });
const wake = await waitFor((m) => m.method === '_x.ai/queue/changed' && typeof m.params?.runningPromptId === 'string' && m.params.runningPromptId.startsWith('task-completed-'), 60000);
log('note', { scenarioB_wakeSeen: !!wake });
if (wake) {
  await waitFor((m) => m.method === 'session/update' && m.params?.update?.sessionUpdate === 'tool_call', 20000);
  await new Promise((r) => setTimeout(r, 3000));
  log('note', 'SCENARIO B sending session/cancel');
  send({ jsonrpc: '2.0', method: 'session/cancel', params: { sessionId } });
  const end = await waitFor((m) => m.method === '_x.ai/session_notification' && m.params?.update?.sessionUpdate === 'turn_completed', 45000);
  log('note', { scenarioB_turnCompletedAfterCancel: end?.params?.update ?? null });
}
await new Promise((r) => setTimeout(r, 10000));
log('note', 'probe end'); child.kill('SIGTERM'); setTimeout(() => process.exit(0), 2000);

// Raw ACP probe: how does Grok 1.0.88 deliver a background command's completion to an ACP client?
import { spawn } from 'node:child_process';
import { appendFileSync, writeFileSync } from 'node:fs';
const LOG = process.argv[2], CWD = process.argv[3];
writeFileSync(LOG, '');
const t0 = Date.now();
const log = (dir, obj) => appendFileSync(LOG, JSON.stringify({ t: ((Date.now() - t0) / 1000).toFixed(1), dir, msg: obj }) + '\n');
const child = spawn('grok', ['agent', '--no-leader', 'stdio'], { cwd: CWD, stdio: ['pipe', 'pipe', 'pipe'] });
child.stderr.on('data', (d) => log('stderr', String(d).slice(0, 2000)));
let buf = '', nextId = 1; const pending = new Map();
const send = (obj) => { log('out', obj); child.stdin.write(JSON.stringify(obj) + '\n'); };
const request = (method, params) => new Promise((res) => { const id = nextId++; pending.set(id, res); send({ jsonrpc: '2.0', id, method, params }); });
child.stdout.on('data', (d) => {
  buf += d; let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i); buf = buf.slice(i + 1); if (!line.trim()) continue;
    let m; try { m = JSON.parse(line); } catch { log('in-raw', line.slice(0, 2000)); continue; }
    log('in', m);
    if (m.id !== undefined && (m.result !== undefined || m.error !== undefined) && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    else if (m.id !== undefined && m.method) {
      if (m.method === 'session/request_permission') {
        const opt = (m.params?.options ?? []).find((o) => /allow/i.test(o.kind ?? o.optionId ?? '')) ?? m.params?.options?.[0];
        send({ jsonrpc: '2.0', id: m.id, result: { outcome: { outcome: 'selected', optionId: opt?.optionId } } });
      } else send({ jsonrpc: '2.0', id: m.id, error: { code: -32601, message: 'not supported by probe' } });
    }
  }
});
const init = await request('initialize', { protocolVersion: 1, clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false } });
const sess = await request('session/new', { cwd: CWD, mcpServers: [], _meta: { yoloMode: true } });
const sessionId = sess.result?.sessionId;
log('note', { sessionId, initOk: !!init.result });
const promptRes = await request('session/prompt', { sessionId, prompt: [{ type: 'text', text: 'Run the shell command `bash job.sh` in the background (block_until_ms 0) and then end your turn immediately with the single word STARTED. When the job finishes later, reply with the single word FINISHED.' }] });
log('note', { promptReturned: promptRes.result ?? promptRes.error });
setTimeout(() => { log('note', 'probe end'); child.kill('SIGTERM'); setTimeout(() => process.exit(0), 2000); }, 150000);

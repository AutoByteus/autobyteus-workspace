// initialize + session/new (no prompt); print the shape of every _x.ai/models/update notification and its timing.
import { spawn } from 'node:child_process';
const cwd = process.argv[2];
const t0 = Date.now();
const child = spawn('grok', ['agent', '--no-leader', 'stdio'], { stdio: ['pipe', 'pipe', 'ignore'], cwd });
let buf = '';
const shape = (o, d = 0) => Array.isArray(o) ? [o.length ? shape(o[0], d + 1) : null] : (o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, d < 4 ? shape(v, d + 1) : typeof v])) : (typeof o === 'string' ? (o.length < 30 ? o : 'str') : o));
const send = (m) => child.stdin.write(JSON.stringify(m) + '\n');
child.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i); buf = buf.slice(i + 1); let m; try { m = JSON.parse(line); } catch { continue; } const t = Date.now() - t0;
  if (m.id === 1) { const ms = m.result?._meta?.modelState; console.log(t, 'INIT models', (ms?.availableModels ?? []).map((x) => x.modelId)); send({ jsonrpc: '2.0', id: 2, method: 'session/new', params: { cwd, mcpServers: [] } }); }
  else if (m.id === 2) console.log(t, 'SESSION/NEW done');
  else if (m.method && m.method.includes('models')) console.log(t, 'NOTIF', m.method, JSON.stringify(shape(m.params)));
} });
send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: 1, clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false } } });
setTimeout(() => { child.kill('SIGTERM'); process.exit(0); }, 8000);

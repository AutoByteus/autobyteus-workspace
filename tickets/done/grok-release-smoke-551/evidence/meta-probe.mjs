// Print the shape of initialize._meta (keys, modelState fields) and any notifications in the next N ms.
import { spawn } from 'node:child_process';
const env = { ...process.env, GROK_HOME: process.argv[2] };
const waitMs = Number(process.argv[3] ?? 0);
const t0 = Date.now();
const child = spawn('grok', ['agent', '--no-leader', 'stdio'], { stdio: ['pipe', 'pipe', 'ignore'], env });
let buf = '';
const redactShape = (o, d = 0) => Array.isArray(o) ? [o.length ? redactShape(o[0], d + 1) : null] : (o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, d < 3 ? redactShape(v, d + 1) : typeof v])) : (typeof o === 'string' ? (o.length < 40 ? o : 'str') : o));
child.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i); buf = buf.slice(i + 1); try { const m = JSON.parse(line); const t = Date.now() - t0; if (m.id === 1) { const meta = m.result?._meta ?? {}; console.log(t, 'INIT _meta keys', Object.keys(meta)); console.log(t, 'modelState', JSON.stringify(redactShape(meta.modelState)).slice(0, 600)); if (!waitMs) { child.kill('SIGTERM'); process.exit(0); } } else if (m.method) { const p = m.params ?? {}; console.log(t, 'NOTIF', m.method, m.method.includes('models') ? JSON.stringify({ current: p.currentModelId, available: (p.availableModels ?? []).map((x) => x.modelId) }) : ''); } } catch {} } });
child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: 1, clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false } } }) + '\n');
setTimeout(() => { child.kill('SIGTERM'); process.exit(0); }, Math.max(waitMs, 1) + 60000 * (waitMs ? 0 : 1));

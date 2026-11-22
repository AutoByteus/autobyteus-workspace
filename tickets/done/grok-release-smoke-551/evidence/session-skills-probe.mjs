// ACP initialize + session/new in a folder (no prompt); the caller reads Grok's slash.advertise for this pid.
import { spawn } from 'node:child_process';
const [cwd, trustOff] = process.argv.slice(2);
const env = { ...process.env, ...(trustOff === '1' ? { GROK_FOLDER_TRUST: '0' } : {}) };
const child = spawn('grok', ['agent', '--no-leader', 'stdio'], { cwd, stdio: ['pipe', 'pipe', 'ignore'], env });
let buf = '', id = 0;
const send = (method, params) => child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }) + '\n');
child.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i); buf = buf.slice(i + 1); try { const m = JSON.parse(line); if (m.id === 1) send('session/new', { cwd, mcpServers: [] }); else if (m.id === 2) { console.log(JSON.stringify({ pid: child.pid, session: !!m.result?.sessionId })); setTimeout(() => { child.kill('SIGTERM'); process.exit(0); }, 1500); } } catch {} } });
send('initialize', { protocolVersion: 1, clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false } });
setTimeout(() => { child.kill('SIGTERM'); process.exit(1); }, 60000);

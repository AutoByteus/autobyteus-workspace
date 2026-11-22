// Print initialize._meta.modelState from a Grok started with an empty GROK_HOME (no login: built-in catalog only).
import { spawn } from 'node:child_process';
const env = { ...process.env, GROK_HOME: process.argv[2] };
const child = spawn('grok', ['agent', '--no-leader', 'stdio'], { stdio: ['pipe', 'pipe', 'ignore'], env });
let buf = '';
child.stdout.on('data', (d) => { buf += d; for (const line of buf.split('\n')) { try { const m = JSON.parse(line); if (m.id === 1) { const ms = m.result?._meta?.modelState; console.log(JSON.stringify({ current: ms?.currentModelId, available: (ms?.availableModels ?? []).map((x) => x.modelId) })); child.kill('SIGTERM'); process.exit(0); } } catch {} } });
child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: 1, clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false } } }) + '\n');
setTimeout(() => { console.log('timeout'); child.kill('SIGTERM'); process.exit(1); }, 60000);

// Time Grok's ACP initialize (as AutoByteus launches it); optionally sample its stack during startup.
import { spawn, execFile } from 'node:child_process';
const t0 = Date.now();
const child = spawn('grok', ['agent', '--no-leader', 'stdio'], { stdio: ['pipe', 'pipe', 'ignore'] });
let buf = '';
const doSample = process.argv[2] === 'sample';
if (doSample) setTimeout(() => execFile('sample', [String(child.pid), '3', '-file', `/tmp/sd551/sample-${child.pid}.txt`], () => {}), 300);
child.stdout.on('data', (d) => {
  buf += d;
  if (buf.includes('"id":1')) { console.log(JSON.stringify({ pid: child.pid, initialize_ms: Date.now() - t0 })); child.kill('SIGTERM'); process.exit(0); }
});
child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: 1, clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false } } }) + '\n');
setTimeout(() => { console.log(JSON.stringify({ pid: child.pid, timeout: true })); child.kill('SIGTERM'); process.exit(1); }, 90000);

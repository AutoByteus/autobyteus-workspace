#!/usr/bin/env node
// Temporary API/E2E probe (output-tps-precision RSK-002 / RSK-005). Runs the real CLI named by
// TPS_WIRE_REAL_COMMAND with the same arguments and stdin, passes its stdout through unchanged and
// appends every stdout line, stamped with Date.now() at receipt, to TPS_WIRE_LOG as JSONL
// ({"t":<ms>,"pid":<child pid>,"argv":[...] } once, then {"t":<ms>,"line":"..."}). No other effect.
import { spawn } from 'node:child_process';
import { appendFileSync } from 'node:fs';
const real = process.env.TPS_WIRE_REAL_COMMAND;
const log = process.env.TPS_WIRE_LOG;
if (!real || !log) { console.error('TPS_WIRE_REAL_COMMAND and TPS_WIRE_LOG are required'); process.exit(2); }
const args = process.argv.slice(2);
const child = spawn(real, args, { stdio: ['pipe', 'pipe', 'inherit'] });
appendFileSync(log, JSON.stringify({ t: Date.now(), pid: child.pid, argv: args }) + '\n');
process.stdin.pipe(child.stdin);
child.stdin.on('error', () => {});
let buffer = '';
child.stdout.on('data', (chunk) => {
  const t = Date.now();
  process.stdout.write(chunk);
  buffer += chunk.toString('utf8');
  let index;
  let rows = '';
  while ((index = buffer.indexOf('\n')) >= 0) {
    rows += JSON.stringify({ t, pid: child.pid, line: buffer.slice(0, index) }) + '\n';
    buffer = buffer.slice(index + 1);
  }
  if (rows) appendFileSync(log, rows);
});
for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.on(signal, () => child.kill(signal));
child.on('exit', (code, signal) => {
  if (buffer) appendFileSync(log, JSON.stringify({ t: Date.now(), pid: child.pid, line: buffer }) + '\n');
  if (signal) process.kill(process.pid, signal); else process.exit(code ?? 0);
});

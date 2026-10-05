// Obstruction evidence only: real pinned SDK Query, test-owned fake child, no model/provider/user data.
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { query } from '../../../../autobyteus-server-ts/node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs';
const home = await fs.mkdtemp(path.join(os.tmpdir(), 'task-claude-close-proof-'));
const processReceipt = new EventEmitter();
Object.assign(processReceipt, { stdin: new PassThrough(), stdout: new PassThrough(), stderr: new PassThrough(), killed: false, exitCode: null, signalCode: null });
const signals = [];
processReceipt.kill = signal => { signals.push(signal); return false; }; // Deliberate failed-signal/no-exit witness.
let buffer = '';
processReceipt.stdin.on('data', bytes => {
  buffer += bytes.toString();
  while (buffer.includes('\n')) {
    const index = buffer.indexOf('\n'); const line = buffer.slice(0, index); buffer = buffer.slice(index + 1);
    try {
      const message = JSON.parse(line);
      if (message.type === 'control_request') processReceipt.stdout.write(JSON.stringify({ type: 'control_response', response: {
        subtype: 'success', request_id: message.request_id, response: { commands: [], models: [], account: {}, output_style: 'default', available_output_styles: [] },
      } }) + '\n');
    } catch { /* No model or user work is submitted by this probe. */ }
  }
});
try {
const q = query({ prompt: (async function* () {})(), options: { cwd: home, env: { HOME: home, CLAUDE_CONFIG_DIR: path.join(home, 'claude'), ANTHROPIC_API_KEY: '' },
  settingSources: [], spawnClaudeCodeProcess: () => processReceipt,
} });
const errors = [];
process.on('unhandledRejection', error => errors.push(String(error)));
await new Promise(resolve => setTimeout(resolve, 100));
const result = q.close();
console.log(JSON.stringify({ phase: 'first_close', returned: result === undefined ? 'undefined' : typeof result, fakeChildExited: processReceipt.exitCode !== null }));
const disposalStarted = Date.now();
await q[Symbol.asyncDispose]();
console.log(JSON.stringify({ phase: 'async_dispose', elapsedMs: Date.now() - disposalStarted, fakeChildExited: processReceipt.exitCode !== null, signals }));
await new Promise(resolve => setTimeout(resolve, 8_000));
const beforeRetry = signals.length;
q.close(); await q[Symbol.asyncDispose]();
await new Promise(resolve => setTimeout(resolve, 100));
console.log(JSON.stringify({ phase: 'retry', beforeRetry, afterRetry: signals.length, fakeChildExited: processReceipt.exitCode !== null, signals, errors }));
assert.equal(result, undefined);
assert.equal(processReceipt.exitCode, null, 'SDK disposal must not have proved child exit in this witness');
assert.deepEqual(signals, ['SIGTERM', 'SIGKILL']);
assert.equal(signals.length, beforeRetry, 'Repeated Query close/dispose did not retry child signals');
assert.deepEqual(errors, []);
console.log('PASS: pinned SDK close/dispose is not actual-child exit/retry proof (obstruction evidence only).');
} finally {
processReceipt.exitCode = 0; processReceipt.emit('exit', 0, null); processReceipt.stdout.end(); processReceipt.stderr.end();
await fs.rm(home, { recursive: true, force: true });
}

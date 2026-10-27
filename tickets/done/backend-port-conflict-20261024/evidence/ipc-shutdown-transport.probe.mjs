// Investigation-only Node IPC transport feasibility, NOT production shutdown validation.
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const prefix = 'autobyteus.embedded-server.shutdown.v1';
for (const fail of [false, true]) {
  const child = spawn(process.execPath, ['-e', `
    const p = ${JSON.stringify(prefix)};
    process.on('message', async (message) => {
      if (message !== p + ':request') return;
      process.removeAllListeners('message');
      await new Promise(resolve => setTimeout(resolve, 30));
      process.send(p + ${JSON.stringify(fail ? ':failed' : ':complete')}, error => process.exit(error ? 1 : ${fail ? 1 : 0}));
    });
    setTimeout(() => process.send(p + ':ready'), 30);
  `], { stdio: ['ignore', 'pipe', 'pipe', 'ipc'], env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR } });
  // Stop intent exists before capability-ready, just as startup cancellation may.
  let ready = false;
  let result;
  let sent = false;
  const timer = setTimeout(() => child.kill('SIGKILL'), 2000);
  try {
    const exit = await new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('message', message => {
        if (message === prefix + ':ready') {
          ready = true;
          sent = true;
          child.send(prefix + ':request', error => { if (error) reject(error); });
        } else result = message;
      });
      child.once('exit', (code, signal) => resolve({ code, signal }));
    });
    assert.equal(ready && sent, true);
    assert.equal(result, prefix + (fail ? ':failed' : ':complete'));
    assert.deepEqual(exit, { code: fail ? 1 : 0, signal: null });
    console.log(JSON.stringify({ fixture: fail ? 'cleanup-failure' : 'cleanup-success', pid: child.pid, ready, result, ...exit }));
  } finally {
    clearTimeout(timer);
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    child.stdout.destroy(); child.stderr.destroy();
  }
}

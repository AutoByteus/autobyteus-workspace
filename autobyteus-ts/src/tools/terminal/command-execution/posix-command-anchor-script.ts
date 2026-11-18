/** Self-contained Node program; user source is sent as IPC data, never interpolated. */
export const POSIX_COMMAND_ANCHOR_SCRIPT = String.raw`
const { spawn } = require('node:child_process');
let launched = false;
function send(message) {
  if (!process.connected) return process.exit(1);
  process.send(message, error => { if (error) process.exit(1); });
}
process.on('SIGTERM', () => {});
process.on('disconnect', () => process.exit(1));
process.on('message', message => {
  if (message.kind === 'START' && !launched) {
    launched = true;
    try {
      const child = spawn(message.executable, message.args, {
        cwd: message.cwd, env: message.env, detached: false,
        stdio: ['ignore', 'inherit', 'inherit']
      });
      child.once('spawn', () => send({ kind: 'STARTED', pid: child.pid }));
      child.once('error', error => send({ kind: 'SPAWN_FAILED', message: error.message.slice(0, 512) }));
      child.once('exit', (code, signal) => send({ kind: 'RESULT', code, signal }));
    } catch (error) { send({ kind: 'SPAWN_FAILED', message: String(error).slice(0, 512) }); }
  } else if (message.kind === 'RELEASE') process.exit(0);
});
send({ kind: 'READY', pid: process.pid });
`;

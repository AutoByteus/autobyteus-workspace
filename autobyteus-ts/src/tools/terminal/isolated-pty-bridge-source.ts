export const ISOLATED_PTY_BRIDGE_SOURCE = String.raw`
import { createRequire } from 'node:module';

const requireFrom = process.env.AUTOBYTEUS_PTY_BRIDGE_REQUIRE_FROM || import.meta.url;
const require = createRequire(requireFrom);
const { spawn } = require('node-pty');

let ptyProcess = null;
let closing = false;
let closeTimer = null;
const disposables = [];

const send = (payload) => {
  if (typeof process.send === 'function' && process.connected !== false) {
    try { process.send(payload); } catch {}
  }
};

const remember = (disposable) => {
  if (disposable && typeof disposable.dispose === 'function') {
    disposables.push(disposable);
  }
};

const disposeListeners = () => {
  while (disposables.length > 0) {
    try { disposables.pop()?.dispose?.(); } catch {}
  }
};

const closePty = (exitCode = 0) => {
  if (closing) return;
  closing = true;
  disposeListeners();

  const pty = ptyProcess;
  ptyProcess = null;
  if (pty) {
    try { pty.kill('SIGHUP'); } catch {}
    try { pty.destroy?.(); } catch {}
  }

  if (closeTimer) clearTimeout(closeTimer);
  closeTimer = setTimeout(() => process.exit(exitCode), 25);
  closeTimer.unref?.();
};

try {
  const cwd = process.cwd();
  const env = {
    ...process.env,
    TERM: process.env.TERM || 'xterm-256color',
    PS1: process.env.PS1 || '\\w $ '
  };

  ptyProcess = spawn('bash', ['--norc', '--noprofile', '-i'], {
    name: 'xterm-256color',
    cwd,
    env,
    cols: Number(process.env.AUTOBYTEUS_PTY_BRIDGE_COLS || 80),
    rows: Number(process.env.AUTOBYTEUS_PTY_BRIDGE_ROWS || 24)
  });

  remember(ptyProcess.onData((data) => {
    if (closing) return;
    process.stdout.write(data);
  }));

  remember(ptyProcess.onExit((event = {}) => {
    send({ type: 'exit', exitCode: event.exitCode, signal: event.signal });
    closePty(0);
  }));

  process.stdin.on('data', (chunk) => {
    if (closing || !ptyProcess) return;
    try { ptyProcess.write(Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk)); } catch {}
  });
  process.stdin.on('end', () => closePty(0));
  process.stdin.on('error', () => closePty(0));

  process.on('message', (message) => {
    if (!message || typeof message !== 'object') return;
    if (message.type === 'resize' && ptyProcess) {
      const rows = Number(message.rows || 24);
      const cols = Number(message.cols || 80);
      try { ptyProcess.resize(cols, rows); } catch {}
      return;
    }
    if (message.type === 'close') {
      closePty(0);
    }
  });

  process.once('SIGTERM', () => closePty(0));
  process.once('SIGINT', () => closePty(0));
  process.once('SIGHUP', () => closePty(0));

  process.stdin.resume();
  send({ type: 'ready' });
} catch (error) {
  send({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  console.error(error);
  process.exit(1);
}
`;

import { ensureNodePtySpawnHelperExecutable } from '../../../../src/tools/terminal/node-pty-bootstrap.js';

export async function detectNodePtyRuntimeAvailable(): Promise<boolean> {
  try {
    await ensureNodePtySpawnHelperExecutable();
    const nodePty = await import('node-pty');
    const shell = process.platform === 'win32' ? 'cmd.exe' : 'sh';
    const pty = nodePty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: process.cwd(),
      env: process.env
    });
    pty.kill();
    return true;
  } catch {
    return false;
  }
}

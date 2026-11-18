import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DirectShellSession } from '../../../../src/tools/terminal/direct-shell-session.js';
import { TerminalSessionManager } from '../../../../src/tools/terminal/terminal-session-manager.js';

const runDirectShellIntegration = process.platform === 'win32' ? describe.skip : describe;

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'autobyteus-direct-shell-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

runDirectShellIntegration('DirectShellSession integration', () => {
  it('executes commands through TerminalSessionManager', async () => {
    await withTempDir(async (tempDir) => {
      const manager = new TerminalSessionManager(DirectShellSession);
      await manager.ensureStarted(tempDir);

      const result = await manager.executeCommand('echo direct_shell_ok', 10);
      expect(result.stdout).toContain('direct_shell_ok');
      expect(result.timedOut).toBe(false);

      await manager.close();
    });
  });

  it('preserves shell state across commands', async () => {
    await withTempDir(async (tempDir) => {
      const manager = new TerminalSessionManager(DirectShellSession);
      await manager.ensureStarted(tempDir);

      const subdir = path.join(tempDir, 'stateful-dir');
      await mkdir(subdir);

      await manager.executeCommand('cd stateful-dir', 10);
      const pwdResult = await manager.executeCommand('pwd', 10);
      expect(pwdResult.stdout).toContain('stateful-dir');

      await manager.close();
    });
  });

});

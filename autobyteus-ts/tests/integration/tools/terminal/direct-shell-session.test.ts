import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DirectShellSession } from '../../../../src/tools/terminal/direct-shell-session.js';
import { TerminalSessionManager } from '../../../../src/tools/terminal/terminal-session-manager.js';
import { BackgroundProcessManager } from '../../../../src/tools/terminal/background-process-manager.js';

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

  it('supports non-PTY background process lifecycle separately from direct shell sessions', async () => {
    await withTempDir(async (tempDir) => {
      const background = new BackgroundProcessManager();
      const info = await background.startCommand(
        'for i in 1 2 3; do echo ds_$i; sleep 0.1; done; sleep 10',
        tempDir
      );

      await new Promise((resolve) => setTimeout(resolve, 600));
      const output = await background.getOutput(info.pid, 20);
      expect(output.output).toContain('ds_');
      expect(output.isRunning).toBe(true);

      const stopped = await background.stopProcess(info.pid);
      expect(stopped).toBe(true);
    });
  });
});

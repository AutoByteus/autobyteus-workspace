import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

let TerminalSessionManagerClass: typeof import('../../../../src/tools/terminal/terminal-session-manager.js').TerminalSessionManager | null = null;
let nodePtyAvailable = true;

try {
  await import('node-pty');
  ({ TerminalSessionManager: TerminalSessionManagerClass } = await import(
    '../../../../src/tools/terminal/terminal-session-manager.js'
  ));
} catch {
  nodePtyAvailable = false;
}

const runIntegration = nodePtyAvailable ? describe : describe.skip;

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'autobyteus-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

runIntegration('TerminalSessionManager Integration', () => {
  if (!TerminalSessionManagerClass) {
    return;
  }

  it('executes echo command', async () => {
    await withTempDir(async (tempDir) => {
        const manager = new TerminalSessionManagerClass();
      try {
        await manager.ensureStarted(tempDir);
        const result = await manager.executeCommand("echo 'test output'");

        expect(result.stdout).toContain('test output');
        expect(result.timedOut).toBe(false);
      } finally {
        await manager.close();
      }
    });
  });

  it('persists working directory across commands', async () => {
    await withTempDir(async (tempDir) => {
      const subdir = path.join(tempDir, 'subdir');
      await mkdir(subdir);

      const manager = new TerminalSessionManagerClass();
      try {
        await manager.ensureStarted(tempDir);
        await manager.executeCommand('cd subdir');
        const result = await manager.executeCommand('pwd');

        expect(result.stdout).toContain('subdir');
      } finally {
        await manager.close();
      }
    });
  });

  it('handles timeouts', async () => {
    await withTempDir(async (tempDir) => {
      const manager = new TerminalSessionManagerClass();
      try {
        await manager.ensureStarted(tempDir);
        const result = await manager.executeCommand('sleep 10', 1);

        expect(result.timedOut).toBe(true);
      } finally {
        await manager.close();
      }
    });
  });
});

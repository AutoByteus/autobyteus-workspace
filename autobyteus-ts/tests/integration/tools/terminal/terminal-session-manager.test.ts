import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { detectNodePtyRuntimeAvailable } from './pty-runtime.js';

let TerminalSessionManagerClass: typeof import('../../../../src/tools/terminal/terminal-session-manager.js').TerminalSessionManager | null = null;
let nodePtyAvailable = await detectNodePtyRuntimeAvailable();

try {
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

async function waitForCondition(condition: () => boolean, timeoutMs = 3000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('Timed out waiting for condition');
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
        expect(result.effectiveCwd).toBe(tempDir);
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

  it('closes an active foreground command when its signal is aborted', async () => {
    await withTempDir(async (tempDir) => {
      const manager = new TerminalSessionManagerClass();
      try {
        await manager.ensureStarted(tempDir);
        const controller = new AbortController();
        const startedAt = Date.now();
        const resultPromise = manager.executeCommand('sleep 10', 30, { signal: controller.signal });

        await new Promise((resolve) => setTimeout(resolve, 150));
        controller.abort();
        const result = await resultPromise;

        expect(result.timedOut).toBe(true);
        expect(Date.now() - startedAt).toBeLessThan(5000);
        await waitForCondition(() => !manager.isStarted);
        expect(manager.isStarted).toBe(false);
      } finally {
        await manager.close();
      }
    });
  });
});

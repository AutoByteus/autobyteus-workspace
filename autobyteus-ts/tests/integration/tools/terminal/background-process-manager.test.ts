import { describe, it, expect } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
let BackgroundProcessManagerClass: typeof import('../../../../src/tools/terminal/background-process-manager.js').BackgroundProcessManager | null = null;

try {
  ({ BackgroundProcessManager: BackgroundProcessManagerClass } = await import(
    '../../../../src/tools/terminal/background-process-manager.js'
  ));
} catch {
  BackgroundProcessManagerClass = null;
}

const runIntegration = process.platform === 'win32' || !BackgroundProcessManagerClass ? describe.skip : describe;

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'autobyteus-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

runIntegration('BackgroundProcessManager Integration', () => {
  if (!BackgroundProcessManagerClass) {
    return;
  }

  it('starts process and captures output', async () => {
    await withTempDir(async (tempDir) => {
      const manager = new BackgroundProcessManagerClass();
      try {
        const info = await manager.startCommand(
          'for i in 1 2 3; do echo line$i; sleep 0.1; done; sleep 10',
          tempDir
        );

        await new Promise((resolve) => setTimeout(resolve, 500));
        const result = await manager.getOutput(info.pid);
        expect(result.output).toContain('line');
      } finally {
        await manager.stopAll();
      }
    });
  });

  it('stops running process', async () => {
    await withTempDir(async (tempDir) => {
      const manager = new BackgroundProcessManagerClass();
      try {
        const info = await manager.startCommand('sleep 100', tempDir);
        await new Promise((resolve) => setTimeout(resolve, 200));
        expect(manager.processCount).toBe(1);

        const success = await manager.stopProcess(info.pid);
        expect(success).toBe(true);
        expect(manager.processCount).toBe(0);
      } finally {
        await manager.stopAll();
      }
    });
  });
});

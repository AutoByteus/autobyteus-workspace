import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { BackgroundProcessManager } from '../../../../src/tools/terminal/background-process-manager.js';
import { BackgroundProcessInfo, BackgroundProcessOutput } from '../../../../src/tools/terminal/types.js';
import { ProcessGroupObserver, type ExecFileRunner } from '../../../../src/tools/terminal/command-execution/process-group-observer.js';
import type { NonInteractiveShellResolver } from '../../../../src/tools/terminal/command-execution/non-interactive-shell-resolver.js';

const tempRoots: string[] = [];
const runPosix = process.platform === 'win32' ? describe.skip : describe;

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'bg-manager-test-'));
  tempRoots.push(dir);
  return dir;
}

afterEach(async () => {
  while (tempRoots.length > 0) {
    const next = tempRoots.pop();
    if (next) {
      await rm(next, { recursive: true, force: true });
    }
  }
});

describe('BackgroundProcessManager adoption', () => {
  it('getOutput throws for unknown PID', async () => {
    const manager = new BackgroundProcessManager();

    await expect(manager.getOutput(999999)).rejects.toThrow('Process 999999 not found');
  });
});

runPosix('BackgroundProcessManager process lifecycle', () => {
  it('startCommand returns PID metadata and captures output', async () => {
    const tempDir = await createTempDir();
    const manager = new BackgroundProcessManager();
    const info = await manager.startCommand('for i in 1 2 3; do echo line$i; sleep 0.1; done; sleep 10', tempDir);

    try {
      expect(info.pid).toBeGreaterThan(0);
      expect(info.status).toBe('running');
      expect(info.effectiveCwd).toBe(tempDir);

      await new Promise((resolve) => setTimeout(resolve, 500));
      const result = await manager.getOutput(info.pid);
      expect(result.output).toContain('line');
      expect(result.isRunning).toBe(true);
    } finally {
      await manager.stopAll();
    }
  });

  it('stopProcess removes a managed process', async () => {
    const tempDir = await createTempDir();
    const manager = new BackgroundProcessManager();
    const info = await manager.startCommand('sleep 100', tempDir);

    expect(manager.processCount).toBe(1);
    const success = await manager.stopProcess(info.pid);
    expect(success).toBe(true);
    expect(manager.processCount).toBe(0);
  });
});

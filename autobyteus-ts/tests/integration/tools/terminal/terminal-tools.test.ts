import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { registerRunBashTool } from '../../../../src/tools/terminal/tools/run-bash.js';
import { getBackgroundManager } from '../../../../src/tools/terminal/background-process-context.js';
import { TerminalResult, type BackgroundCommandStarted } from '../../../../src/tools/terminal/types.js';

const runIntegration = process.platform === 'win32' ? describe.skip : describe;
const runBashTool = registerRunBashTool();
const contexts: object[] = [];
let nextAgent = 0;

afterEach(async () => {
  for (const context of contexts.splice(0)) {
    const manager = getBackgroundManager(context);
    await manager.stopAllForRunEnd();
    await manager.scope.close();
  }
});

class MockContext {
  workspaceRootPath: string;
  agentId: string;

  constructor(basePath: string) {
    this.workspaceRootPath = basePath;
    this.agentId = `terminal-tools-${process.pid}-${nextAgent++}`;
    contexts.push(this);
  }
}

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'autobyteus-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

runIntegration('terminal tools integration', () => {
  it('run_bash executes simple echo', async () => {
    await withTempDir(async (tempDir) => {
      const context = new MockContext(tempDir);
      const result = await runBashTool.execute(context, { command: 'echo hello' }) as TerminalResult;

      expect(result).toBeInstanceOf(TerminalResult);
      expect(result.stdout).toContain('hello');
      expect(result.timedOut).toBe(false);
      expect(result.effectiveCwd).toBe(tempDir);
    });
  });

  it('run_bash executes inside the explicit cwd', async () => {
    await withTempDir(async (tempDir) => {
      const context = new MockContext(tempDir);
      const subdir = path.join(tempDir, 'mysubdir');
      await mkdir(subdir);

      const result = await runBashTool.execute(context, { command: 'pwd', cwd: subdir }) as TerminalResult;

      expect(result.stdout).toContain('mysubdir');
      expect(result.effectiveCwd).toBe(fs.realpathSync(subdir));
    });
  });

  it('run_bash executes inside an explicit external cwd', async () => {
    await withTempDir(async (workspace) => {
      await withTempDir(async (outside) => {
        const context = new MockContext(workspace);

        const result = await runBashTool.execute(context, {
          command: 'pwd',
          cwd: outside
        }) as TerminalResult;

        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe(fs.realpathSync(outside));
        expect(result.effectiveCwd).toBe(fs.realpathSync(outside));
      });
    });
  });

  it('run_bash run_in_background starts in an explicit external cwd and its output is readable with tail', async () => {
    await withTempDir(async (workspace) => {
      await withTempDir(async (outside) => {
        const context = new MockContext(workspace);
        const started = await runBashTool.execute(context, {
          command: 'for i in 1 2 3; do echo external_$i; sleep 0.1; done; sleep 10',
          cwd: outside,
          run_in_background: true
        }) as BackgroundCommandStarted;
        expect(started.status).toBe('running');
        expect(started.effectiveCwd).toBe(fs.realpathSync(outside));
        await new Promise((resolve) => setTimeout(resolve, 500));
        const tail = await runBashTool.execute(context, { command: `tail -n 3 ${started.outputFile}` }) as TerminalResult;
        expect(tail.stdout).toBe('external_1\nexternal_2\nexternal_3\n');
      });
    });
  });

  it('run_bash run_in_background accepts an absolute cwd without a configured workspace', async () => {
    await withTempDir(async (outside) => {
      const context = { workspaceRootPath: null, agentId: `terminal-tools-${process.pid}-${nextAgent++}` };
      contexts.push(context);
      const started = await runBashTool.execute(context, {
        command: 'echo no_workspace_external; sleep 10', cwd: outside, run_in_background: true
      }) as BackgroundCommandStarted;
      expect(started.status).toBe('running');
      expect(started.effectiveCwd).toBe(fs.realpathSync(outside));
    });
  });

  it('run_bash does not preserve cwd across calls', async () => {
    await withTempDir(async (tempDir) => {
      const context = new MockContext(tempDir);
      await mkdir(path.join(tempDir, 'contextA-subdir'));

      await runBashTool.execute(context, { command: 'cd contextA-subdir' });
      const cwd = await runBashTool.execute(context, { command: 'pwd' }) as TerminalResult;

      expect(cwd.stdout).toContain(tempDir);
      expect(cwd.stdout).not.toContain('contextA-subdir');
      expect(cwd.effectiveCwd).toBe(tempDir);
    });
  });

  it('run_bash respects timeout', async () => {
    await withTempDir(async (tempDir) => {
      const context = new MockContext(tempDir);
      const result = await runBashTool.execute(context, { command: 'sleep 5', timeout_seconds: 1 }) as TerminalResult;

      expect(result.timedOut).toBe(true);
      expect(result.effectiveCwd).toBe(tempDir);
    });
  });

  it('run_bash interrupts a foreground command through the execution signal', async () => {
    await withTempDir(async (tempDir) => {
      const context = new MockContext(tempDir);
      const controller = new AbortController();
      const startedAt = Date.now();
      const resultPromise = runBashTool.execute(
        context,
        { command: 'sleep 10', timeout_seconds: 30 },
        { signal: controller.signal }
      );

      await new Promise((resolve) => setTimeout(resolve, 150));
      controller.abort();
      const result = await resultPromise;

      expect(result).toBeInstanceOf(TerminalResult);
      expect(result.timedOut).toBe(true);
      expect(Date.now() - startedAt).toBeLessThan(5000);
      expect(result.effectiveCwd).toBe(tempDir);
    });
  });

  it('run_bash returns at the foreground end and lists an ordinary & job as a background task', async () => {
    await withTempDir(async (tempDir) => {
      const context = new MockContext(tempDir);
      const result = await runBashTool.execute(context, {
        command: '(for i in 1 2 3; do echo bg$i; sleep 0.1; done; sleep 10) &'
      }) as TerminalResult;

      expect(result.exitCode).toBe(0);
      expect(result.backgroundTasksStarted).toHaveLength(1);
      const task = result.backgroundTasksStarted[0];
      expect(task.pid).toBeGreaterThan(0);
      expect(task.command).toBe('(for i in 1 2 3; do echo bg$i; sleep 0.1; done; sleep 10) &');
      expect(task.effectiveCwd).toBe(tempDir);
      await new Promise((resolve) => setTimeout(resolve, 500));
      // Bytes before the foreground end belong to the call's result; later ones to the output file.
      expect(result.stdout + await readFile(task.outputFile, 'utf8')).toBe('bg1\nbg2\nbg3\n');
    });
  });

  it('kill <pid> stops a background command and the kill\'s result reports how it ended', async () => {
    await withTempDir(async (tempDir) => {
      const context = new MockContext(tempDir);
      const started = await runBashTool.execute(context, { command: 'sleep 30', run_in_background: true }) as BackgroundCommandStarted;
      const kill = await runBashTool.execute(context, { command: `kill ${started.pid}` }) as TerminalResult;
      expect(kill.exitCode).toBe(0);
      expect(kill.backgroundTasksEnded.map((end) => [end.pid, end.outcome])).toEqual([[started.pid, { signal: 'SIGTERM' }]]);
      expect(getBackgroundManager(context).hasRunning()).toBe(false);
    });
  });

  it('keeps several background commands apart, each with its own output file', async () => {
    await withTempDir(async (tempDir) => {
      const context = new MockContext(tempDir);
      const first = await runBashTool.execute(context, { command: 'echo first; sleep 10', run_in_background: true }) as BackgroundCommandStarted;
      const second = await runBashTool.execute(context, { command: 'echo second; sleep 10', run_in_background: true }) as BackgroundCommandStarted;
      expect(first.outputFile).not.toBe(second.outputFile);
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(await readFile(first.outputFile, 'utf8')).toBe('first\n');
      expect(await readFile(second.outputFile, 'utf8')).toBe('second\n');
      expect(getBackgroundManager(context).list().map((state) => state.task.pid)).toEqual([first.pid, second.pid]);
    });
  });
});

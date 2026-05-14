import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { registerRunBashTool } from '../../../../src/tools/terminal/tools/run-bash.js';
import { registerStartBackgroundProcessTool } from '../../../../src/tools/terminal/tools/start-background-process.js';
import { registerGetBackgroundProcessesTool } from '../../../../src/tools/terminal/tools/get-background-processes.js';
import { registerGetProcessOutputTool } from '../../../../src/tools/terminal/tools/get-process-output.js';
import { registerStopBackgroundProcessTool } from '../../../../src/tools/terminal/tools/stop-background-process.js';
import { BackgroundProcessInfo, TerminalResult } from '../../../../src/tools/terminal/types.js';
const runIntegration = process.platform === 'win32' ? describe.skip : describe;
const runBashTool = registerRunBashTool();
const startBackgroundProcessTool = registerStartBackgroundProcessTool();
const getBackgroundProcessesTool = registerGetBackgroundProcessesTool();
const getProcessOutputTool = registerGetProcessOutputTool();
const stopBackgroundProcessTool = registerStopBackgroundProcessTool();

class MockContext {
  workspaceRootPath: string;
  agentId: string;

  constructor(basePath: string) {
    this.workspaceRootPath = basePath;
    this.agentId = 'test-agent-001';
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
      expect(result.effectiveCwd).toBe(subdir);
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

  it('run_bash adopts an ordinary bash background process', async () => {
    await withTempDir(async (tempDir) => {
      const context = new MockContext(tempDir);
      const result = await runBashTool.execute(context, {
        command: '(for i in 1 2 3; do echo bg$i; sleep 0.1; done; sleep 10) &'
      }) as TerminalResult;

      expect(result.exitCode).toBe(0);
      expect(result.backgroundProcesses.length).toBeGreaterThanOrEqual(1);
      const background = result.backgroundProcesses[0];
      expect(background.pid).toBeGreaterThan(0);
      expect(background.status).toBe('running');
      expect(background.command).toContain('echo bg');
      expect(background.effectiveCwd).toBe(tempDir);

      await new Promise((resolve) => setTimeout(resolve, 500));
      const listResult = await getBackgroundProcessesTool.execute(context, {}) as { processes: BackgroundProcessInfo[] };
      expect(listResult.processes.map((process) => process.pid)).toContain(background.pid);

      const outputResult = await getProcessOutputTool.execute(context, { pid: background.pid }) as { output: string; isRunning: boolean };
      expect(outputResult.output).toContain('bg');
      expect(outputResult.isRunning).toBe(true);

      for (const process of result.backgroundProcesses) {
        const stopResult = await stopBackgroundProcessTool.execute(context, { pid: process.pid }) as { status: string };
        expect(['stopped', 'not_found']).toContain(stopResult.status);
      }
    });
  });

  it('background process lifecycle', async () => {
    await withTempDir(async (tempDir) => {
      const context = new MockContext(tempDir);

      const startResult = await startBackgroundProcessTool.execute(context, {
        command: 'for i in 1 2 3; do echo line$i; sleep 0.1; done; sleep 10'
      }) as BackgroundProcessInfo;

      expect(startResult.status).toBe('running');
      expect(startResult.effectiveCwd).toBe(tempDir);
      const pid = startResult.pid;

      await new Promise((resolve) => setTimeout(resolve, 500));

      const outputResult = await getProcessOutputTool.execute(context, { pid }) as { output: string; isRunning: boolean };
      expect(outputResult.output).toContain('line');
      expect(outputResult.isRunning).toBe(true);

      const stopResult = await stopBackgroundProcessTool.execute(context, { pid }) as { status: string };
      expect(stopResult.status).toBe('stopped');
    });
  });

  it('can manage multiple background processes independently', async () => {
    await withTempDir(async (tempDir) => {
      const context = new MockContext(tempDir);

      const first = await runBashTool.execute(context, {
        command: '(for i in 1 2 3; do echo first_$i; sleep 0.1; done; sleep 10) &'
      }) as TerminalResult;
      const second = await runBashTool.execute(context, {
        command: '(for i in 1 2 3; do echo second_$i; sleep 0.1; done; sleep 10) &'
      }) as TerminalResult;
      const firstPid = first.backgroundProcesses[0].pid;
      const secondPid = second.backgroundProcesses[0].pid;

      await new Promise((resolve) => setTimeout(resolve, 600));

      const firstOutput = await getProcessOutputTool.execute(context, { pid: firstPid }) as { output: string };
      const secondOutput = await getProcessOutputTool.execute(context, { pid: secondPid }) as { output: string };

      expect(firstOutput.output).toContain('first_');
      expect(secondOutput.output).toContain('second_');

      const firstStop = await stopBackgroundProcessTool.execute(context, { pid: firstPid }) as { status: string };
      const secondStop = await stopBackgroundProcessTool.execute(context, { pid: secondPid }) as { status: string };
      expect(firstStop.status).toBe('stopped');
      expect(secondStop.status).toBe('stopped');
      for (const process of first.backgroundProcesses.slice(1)) {
        await stopBackgroundProcessTool.execute(context, { pid: process.pid });
      }
      for (const process of second.backgroundProcesses.slice(1)) {
        await stopBackgroundProcessTool.execute(context, { pid: process.pid });
      }
    });
  });

  it('stop_background_process reports missing process', async () => {
    await withTempDir(async (tempDir) => {
      const context = new MockContext(tempDir);
      const result = await stopBackgroundProcessTool.execute(context, { pid: 99999999 }) as { status: string };

      expect(result.status).toBe('not_found');
    });
  });

  it('get_process_output reports missing process', async () => {
    await withTempDir(async (tempDir) => {
      const context = new MockContext(tempDir);
      const result = await getProcessOutputTool.execute(context, { pid: 99999999 }) as { error?: string; isRunning: boolean };

      expect(result.error).toBeTruthy();
      expect(result.isRunning).toBe(false);
    });
  });
});

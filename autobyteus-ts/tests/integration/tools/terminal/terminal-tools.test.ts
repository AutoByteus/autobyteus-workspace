import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { registerRunBashTool } from '../../../../src/tools/terminal/tools/run-bash.js';
import { registerStartBackgroundProcessTool } from '../../../../src/tools/terminal/tools/start-background-process.js';
import { registerGetProcessOutputTool } from '../../../../src/tools/terminal/tools/get-process-output.js';
import { registerStopBackgroundProcessTool } from '../../../../src/tools/terminal/tools/stop-background-process.js';
import { TerminalResult } from '../../../../src/tools/terminal/types.js';
const runIntegration = process.platform === 'win32' ? describe.skip : describe;
const runBashTool = registerRunBashTool();
const startBackgroundProcessTool = registerStartBackgroundProcessTool();
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
      const result = await runBashTool.execute(context, { command: 'echo hello' });

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

      const result = await runBashTool.execute(context, { command: 'pwd', cwd: subdir });

      expect(result.stdout).toContain('mysubdir');
      expect(result.effectiveCwd).toBe(subdir);
    });
  });

  it('run_bash does not preserve cwd across calls', async () => {
    await withTempDir(async (tempDir) => {
      const context = new MockContext(tempDir);
      await mkdir(path.join(tempDir, 'contextA-subdir'));

      await runBashTool.execute(context, { command: 'cd contextA-subdir' });
      const cwd = await runBashTool.execute(context, { command: 'pwd' });

      expect(cwd.stdout).toContain(tempDir);
      expect(cwd.stdout).not.toContain('contextA-subdir');
      expect(cwd.effectiveCwd).toBe(tempDir);
    });
  });

  it('run_bash respects timeout', async () => {
    await withTempDir(async (tempDir) => {
      const context = new MockContext(tempDir);
      const result = await runBashTool.execute(context, { command: 'sleep 5', timeout_seconds: 1 });

      expect(result.timedOut).toBe(true);
      expect(result.effectiveCwd).toBe(tempDir);
    });
  });

  it('run_bash can start a background process', async () => {
    await withTempDir(async (tempDir) => {
      const context = new MockContext(tempDir);
      const backgroundResult = await runBashTool.execute(context, {
        command: 'for i in 1 2 3; do echo bg$i; sleep 0.1; done; sleep 10',
        background: true
      });

      expect(backgroundResult.mode).toBe('background');
      expect(backgroundResult.status).toBe('started');
      expect(backgroundResult.command).toContain('echo bg');
      expect(typeof backgroundResult.processId).toBe('string');
      expect(backgroundResult.effectiveCwd).toBe(tempDir);

      await new Promise((resolve) => setTimeout(resolve, 500));
      const outputResult = await getProcessOutputTool.execute(context, { process_id: backgroundResult.processId });
      expect(outputResult.output).toContain('bg');
      expect(outputResult.isRunning).toBe(true);

      const stopResult = await stopBackgroundProcessTool.execute(context, { process_id: backgroundResult.processId });
      expect(stopResult.status).toBe('stopped');
    });
  });

  it('background process lifecycle', async () => {
    await withTempDir(async (tempDir) => {
      const context = new MockContext(tempDir);

      const startResult = await startBackgroundProcessTool.execute(context, {
        command: 'for i in 1 2 3; do echo line$i; sleep 0.1; done; sleep 10'
      });

      expect(startResult.status).toBe('started');
      expect(startResult.effectiveCwd).toBe(tempDir);
      const processId = startResult.processId as string;

      await new Promise((resolve) => setTimeout(resolve, 500));

      const outputResult = await getProcessOutputTool.execute(context, { process_id: processId });
      expect(outputResult.output).toContain('line');
      expect(outputResult.isRunning).toBe(true);

      const stopResult = await stopBackgroundProcessTool.execute(context, { process_id: processId });
      expect(stopResult.status).toBe('stopped');
    });
  });

  it('can manage multiple background processes independently', async () => {
    await withTempDir(async (tempDir) => {
      const context = new MockContext(tempDir);

      const first = await runBashTool.execute(context, {
        command: 'for i in 1 2 3; do echo first_$i; sleep 0.1; done; sleep 3',
        background: true
      });
      const second = await runBashTool.execute(context, {
        command: 'for i in 1 2 3; do echo second_$i; sleep 0.1; done; sleep 3',
        background: true
      });

      await new Promise((resolve) => setTimeout(resolve, 600));

      const firstOutput = await getProcessOutputTool.execute(context, { process_id: first.processId });
      const secondOutput = await getProcessOutputTool.execute(context, { process_id: second.processId });

      expect(firstOutput.output).toContain('first_');
      expect(secondOutput.output).toContain('second_');

      const firstStop = await stopBackgroundProcessTool.execute(context, { process_id: first.processId });
      const secondStop = await stopBackgroundProcessTool.execute(context, { process_id: second.processId });
      expect(firstStop.status).toBe('stopped');
      expect(secondStop.status).toBe('stopped');
    });
  });

  it('stop_background_process reports missing process', async () => {
    await withTempDir(async (tempDir) => {
      const context = new MockContext(tempDir);
      const result = await stopBackgroundProcessTool.execute(context, { process_id: 'nonexistent_123' });

      expect(result.status).toBe('not_found');
    });
  });

  it('get_process_output reports missing process', async () => {
    await withTempDir(async (tempDir) => {
      const context = new MockContext(tempDir);
      const result = await getProcessOutputTool.execute(context, { process_id: 'nonexistent_123' });

      expect(result.error).toBeTruthy();
      expect(result.isRunning).toBe(false);
    });
  });
});

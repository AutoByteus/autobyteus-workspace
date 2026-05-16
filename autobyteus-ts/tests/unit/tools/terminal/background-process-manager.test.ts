import { describe, it, expect, afterEach } from 'vitest';
import { PassThrough } from 'node:stream';
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
  it('adopts observed PID records with PID-only public info and captured output', async () => {
    const manager = new BackgroundProcessManager();
    const stdout = new PassThrough();
    const adoptedPid = process.pid;
    const infos = manager.adoptObservedProcesses({
      command: 'npm run dev > server.log 2>&1 &',
      effectiveCwd: '/tmp/project',
      processGroupId: 4321,
      processes: [{ pid: adoptedPid, parentPid: 1, processGroupId: 4321, status: 'S', command: 'node server.js' }],
      stdout,
      initialOutput: 'booting\n'
    });

    stdout.write('ready\n');
    const output = await manager.getOutput(adoptedPid);
    const listed = await manager.listProcesses();

    expect(infos).toHaveLength(1);
    expect(infos[0]).toBeInstanceOf(BackgroundProcessInfo);
    expect(infos[0]).toMatchObject({
      pid: adoptedPid,
      command: 'npm run dev > server.log 2>&1 &',
      status: 'running',
      effectiveCwd: '/tmp/project'
    });
    expect(output).toBeInstanceOf(BackgroundProcessOutput);
    expect(output.pid).toBe(adoptedPid);
    expect(output.output).toContain('booting');
    expect(output.output).toContain('ready');
    expect(listed.map((entry) => entry.pid)).toContain(adoptedPid);
  });

  it('getOutput throws for unknown PID', async () => {
    const manager = new BackgroundProcessManager();

    await expect(manager.getOutput(999999)).rejects.toThrow('Process 999999 not found');
  });
});

describe('BackgroundProcessManager WSL lifecycle', () => {
  it('starts, tracks, reads, and stops background commands by WSL Linux PID', async () => {
    const marker = '__AUTOBYTEUS_TEST_WSL_ID__';
    const linuxPid = 4321;
    const resolver = {
      resolve: () => ({
        executable: process.execPath,
        args: [
          '-e',
          [
            `process.stderr.write(${JSON.stringify(`${marker}:${linuxPid}:${linuxPid}\n`)});`,
            "process.stdout.write('ready\\n');",
            'setInterval(() => {}, 1000);'
          ].join('')
        ],
        env: { ...process.env },
        kind: 'windows-wsl',
        processTarget: { kind: 'wsl', wslExecutable: 'wsl.exe', distro: 'Ubuntu' },
        shellIdentityMarker: marker
      })
    } as unknown as NonInteractiveShellResolver;

    let running = true;
    const calls: Array<{ file: string; args: string[] }> = [];
    const runner: ExecFileRunner = async (file, args) => {
      calls.push({ file, args });
      if (args.includes('ps')) {
        return {
          stdout: running
            ? ` ${linuxPid} 1 ${linuxPid} S bash -lc npm run dev\n`
            : ''
        };
      }
      if (args.includes('bash')) {
        running = false;
      }
      return { stdout: '' };
    };
    const manager = new BackgroundProcessManager(
      1_000_000,
      resolver,
      new ProcessGroupObserver(runner)
    );

    const info = await manager.startCommand('npm run dev', 'C:\\project');
    await new Promise((resolve) => setTimeout(resolve, 25));
    const output = await manager.getOutput(linuxPid);
    const listed = await manager.listProcesses();
    const stopped = await manager.stopProcess(linuxPid);

    expect(info).toMatchObject({
      pid: linuxPid,
      command: 'npm run dev',
      status: 'running',
      effectiveCwd: 'C:\\project'
    });
    expect(output.pid).toBe(linuxPid);
    expect(output.output).toContain('ready');
    expect(output.output).not.toContain(marker);
    expect(listed.map((entry) => entry.pid)).toContain(linuxPid);
    expect(stopped).toBe(true);
    expect(calls.some((call) => call.file === 'wsl.exe' && call.args.includes('ps'))).toBe(true);
    expect(calls.some((call) => call.file === 'wsl.exe' && call.args.includes('bash'))).toBe(true);
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

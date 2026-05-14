import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import {
  ProcessGroupObserver,
  type ExecFileRunner
} from '../../../../../src/tools/terminal/command-execution/process-group-observer.js';

const runPosix = process.platform === 'win32' ? describe.skip : describe;

function waitForExit(child: ReturnType<typeof spawn>): Promise<void> {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', () => resolve());
  });
}

runPosix('ProcessGroupObserver', () => {
  it('finds and stops live descendants in a detached shell process group', async () => {
    const observer = new ProcessGroupObserver();
    const child = spawn('/bin/bash', ['--noprofile', '--norc', '-lc', 'sleep 10 &'], {
      detached: true,
      stdio: ['ignore', 'ignore', 'ignore']
    });

    expect(child.pid).toBeDefined();
    const processGroupId = child.pid!;
    await waitForExit(child);
    await new Promise((resolve) => setTimeout(resolve, 75));

    const survivors = await observer.findLiveProcessesInGroup(processGroupId, [processGroupId]);
    try {
      expect(survivors.length).toBeGreaterThanOrEqual(1);
      expect(survivors.some((process) => process.command.includes('sleep 10'))).toBe(true);
    } finally {
      for (const survivor of survivors) {
        await observer.stopProcess(survivor.pid, processGroupId);
      }
    }
  });
});

describe('ProcessGroupObserver WSL target', () => {
  it('lists WSL Linux processes through the selected distro and filters by process group', async () => {
    const calls: Array<{ file: string; args: string[] }> = [];
    const runner: ExecFileRunner = async (file, args) => {
      calls.push({ file, args });
      return {
        stdout: [
          ' 100 1 100 S bash -lc npm run dev',
          ' 101 100 100 S node server.js',
          ' 202 1 202 S other'
        ].join('\n')
      };
    };
    const observer = new ProcessGroupObserver(runner);

    const processes = await observer.findLiveProcessesInGroup(
      100,
      [100],
      { kind: 'wsl', wslExecutable: 'wsl.exe', distro: 'Ubuntu' }
    );

    expect(calls[0]).toEqual({
      file: 'wsl.exe',
      args: ['-d', 'Ubuntu', '--exec', 'ps', '-axo', 'pid=,ppid=,pgid=,stat=,command=']
    });
    expect(processes).toEqual([
      { pid: 101, parentPid: 100, processGroupId: 100, status: 'S', command: 'node server.js' }
    ]);
  });

  it('stops WSL Linux process groups through WSL kill commands', async () => {
    const calls: Array<{ file: string; args: string[] }> = [];
    let psCalls = 0;
    const runner: ExecFileRunner = async (file, args) => {
      calls.push({ file, args });
      if (args.includes('ps')) {
        psCalls += 1;
        return {
          stdout: psCalls === 1
            ? ' 101 100 100 S node server.js\n'
            : ''
        };
      }
      return { stdout: '' };
    };
    const observer = new ProcessGroupObserver(runner);

    const stopped = await observer.stopProcess(
      101,
      100,
      { kind: 'wsl', wslExecutable: 'wsl.exe', distro: 'Ubuntu' }
    );

    expect(stopped).toBe(true);
    const killCall = calls.find((call) => call.args.includes('bash'));
    expect(killCall?.file).toBe('wsl.exe');
    expect(killCall?.args).toEqual([
      '-d',
      'Ubuntu',
      '--exec',
      'bash',
      '-lc',
      'kill -TERM -- -100 2>/dev/null || true; kill -TERM 101 2>/dev/null || true'
    ]);
  });

  it('still signals a WSL process group when the tracked shell PID has exited', async () => {
    const calls: Array<{ file: string; args: string[] }> = [];
    const runner: ExecFileRunner = async (file, args) => {
      calls.push({ file, args });
      if (args.includes('ps')) {
        return {
          stdout: ' 202 1 100 S node server.js\n'
        };
      }
      return { stdout: '' };
    };
    const observer = new ProcessGroupObserver(runner);

    const stopped = await observer.stopProcess(
      101,
      100,
      { kind: 'wsl', wslExecutable: 'wsl.exe', distro: 'Ubuntu' }
    );

    expect(stopped).toBe(true);
    const killCall = calls.find((call) => call.args.includes('bash'));
    expect(killCall?.args.at(-1)).toContain('kill -TERM -- -100');
  });
});

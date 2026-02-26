import os from 'node:os';
import { describe, it, expect, vi } from 'vitest';
import { runBash } from '../../../../src/tools/terminal/tools/run-bash.js';
import { TerminalResult } from '../../../../src/tools/terminal/types.js';

describe('runBash', () => {
  it('runs in foreground by default using terminal session manager', async () => {
    const terminalManager = {
      ensureStarted: vi.fn(async () => undefined),
      executeCommand: vi.fn(async () => new TerminalResult('ok', '', 0, false))
    };
    const context: any = {
      workspace: {
        getBasePath: () => '/tmp/workspace'
      },
      _terminalSessionManager: terminalManager
    };

    const result = await runBash(context, 'echo ok');

    expect(terminalManager.ensureStarted).toHaveBeenCalledWith('/tmp/workspace');
    expect(terminalManager.executeCommand).toHaveBeenCalledWith('echo ok', 30);
    expect(result).toBeInstanceOf(TerminalResult);
    expect((result as TerminalResult).stdout).toBe('ok');
  });

  it('runs in background when background=true and returns process handle metadata', async () => {
    const terminalManager = {
      ensureStarted: vi.fn(async () => undefined),
      executeCommand: vi.fn(async () => new TerminalResult('should-not-run', '', 0, false))
    };
    const backgroundManager = {
      startProcess: vi.fn(async () => 'bg_123')
    };
    const context: any = {
      workspace: {
        getBasePath: () => '/tmp/workspace'
      },
      _terminalSessionManager: terminalManager,
      _backgroundProcessManager: backgroundManager
    };

    const result = await runBash(context, 'npm run dev', 45, true);

    expect(backgroundManager.startProcess).toHaveBeenCalledWith('npm run dev', '/tmp/workspace');
    expect(terminalManager.ensureStarted).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      mode: 'background',
      processId: 'bg_123',
      command: 'npm run dev',
      status: 'started'
    });
    expect(Number.isNaN(Date.parse((result as any).startedAt))).toBe(false);
  });

  it('falls back to os.tmpdir() when workspace base path is unavailable', async () => {
    const backgroundManager = {
      startProcess: vi.fn(async () => 'bg_999')
    };
    const context: any = {
      workspace: {
        getBasePath: () => {
          throw new Error('workspace unavailable');
        }
      },
      _backgroundProcessManager: backgroundManager
    };

    await runBash(context, 'sleep 10', 30, true);

    expect(backgroundManager.startProcess).toHaveBeenCalledWith('sleep 10', os.tmpdir());
  });
});

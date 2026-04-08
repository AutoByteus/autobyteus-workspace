import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runBash } from '../../../../src/tools/terminal/tools/run-bash.js';
import { TerminalResult } from '../../../../src/tools/terminal/types.js';
import { TerminalSessionManager } from '../../../../src/tools/terminal/terminal-session-manager.js';

const tempRoots: string[] = [];

function createTempWorkspace(subdir?: string): string {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'run-bash-test-'));
  tempRoots.push(workspaceRoot);
  if (subdir) {
    fs.mkdirSync(path.join(workspaceRoot, subdir), { recursive: true });
  }
  return workspaceRoot;
}

afterEach(() => {
  vi.restoreAllMocks();
  while (tempRoots.length > 0) {
    const next = tempRoots.pop();
    if (next) {
      fs.rmSync(next, { recursive: true, force: true });
    }
  }
});

describe('runBash', () => {
  it('runs in foreground by default using terminal session manager', async () => {
    const workspaceRoot = createTempWorkspace(path.join('packages', 'api'));
    const terminalManager = {
      ensureStarted: vi.fn(async () => undefined),
      executeCommand: vi.fn(async () => new TerminalResult('ok', '', 0, false)),
      close: vi.fn(async () => undefined)
    };
    const context: any = {
      workspaceRootPath: workspaceRoot
    };
    vi.spyOn(TerminalSessionManager.prototype, 'ensureStarted').mockImplementation(terminalManager.ensureStarted);
    vi.spyOn(TerminalSessionManager.prototype, 'executeCommand').mockImplementation(terminalManager.executeCommand);
    vi.spyOn(TerminalSessionManager.prototype, 'close').mockImplementation(terminalManager.close);

    const result = await runBash(context, 'echo ok', path.join(workspaceRoot, 'packages', 'api'));

    expect(terminalManager.ensureStarted).toHaveBeenCalledWith(path.join(workspaceRoot, 'packages', 'api'));
    expect(terminalManager.executeCommand).toHaveBeenCalledWith('echo ok', 30);
    expect(terminalManager.close).toHaveBeenCalled();
    expect(result).toBeInstanceOf(TerminalResult);
    expect((result as TerminalResult).stdout).toBe('ok');
  });

  it('runs in background when background=true and returns process handle metadata', async () => {
    const workspaceRoot = createTempWorkspace(path.join('apps', 'web'));
    const terminalManager = {
      ensureStarted: vi.fn(async () => undefined),
      executeCommand: vi.fn(async () => new TerminalResult('should-not-run', '', 0, false))
    };
    const backgroundManager = {
      startProcess: vi.fn(async () => 'bg_123')
    };
    const context: any = {
      workspaceRootPath: workspaceRoot,
      _terminalSessionManager: terminalManager,
      _backgroundProcessManager: backgroundManager
    };

    const result = await runBash(context, 'npm run dev', path.join(workspaceRoot, 'apps', 'web'), 45, true);

    expect(backgroundManager.startProcess).toHaveBeenCalledWith('npm run dev', path.join(workspaceRoot, 'apps', 'web'));
    expect(result).toMatchObject({
      mode: 'background',
      processId: 'bg_123',
      command: 'npm run dev',
      status: 'started'
    });
    expect(Number.isNaN(Date.parse((result as any).startedAt))).toBe(false);
  });

  it('uses provided absolute cwd when workspace base path is unavailable', async () => {
    const explicitDir = createTempWorkspace();
    const backgroundManager = {
      startProcess: vi.fn(async () => 'bg_999')
    };
    const context: any = {
      workspaceRootPath: null,
      _backgroundProcessManager: backgroundManager
    };

    await runBash(context, 'sleep 10', explicitDir, 30, true);

    expect(backgroundManager.startProcess).toHaveBeenCalledWith('sleep 10', explicitDir);
  });

  it('uses the workspace root when cwd is omitted', async () => {
    const workspaceRoot = createTempWorkspace(path.join('packages', 'api'));
    const terminalManager = {
      ensureStarted: vi.fn(async () => undefined),
      executeCommand: vi.fn(async () => new TerminalResult('ok', '', 0, false)),
      close: vi.fn(async () => undefined)
    };
    const context: any = {
      workspaceRootPath: workspaceRoot
    };
    vi.spyOn(TerminalSessionManager.prototype, 'ensureStarted').mockImplementation(terminalManager.ensureStarted);
    vi.spyOn(TerminalSessionManager.prototype, 'executeCommand').mockImplementation(terminalManager.executeCommand);
    vi.spyOn(TerminalSessionManager.prototype, 'close').mockImplementation(terminalManager.close);

    await runBash(context, 'pwd');

    expect(terminalManager.ensureStarted).toHaveBeenCalledWith(workspaceRoot);
  });

  it('rejects relative cwd paths when provided', async () => {
    const workspaceRoot = createTempWorkspace();
    const context: any = {
      workspaceRootPath: workspaceRoot
    };

    await expect(runBash(context, 'echo nope', '../outside')).rejects.toThrow(/absolute path when provided/);
  });
});

import { describe, it, expect, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runBash } from '../../../../src/tools/terminal/tools/run-bash.js';
import { startBackgroundProcess } from '../../../../src/tools/terminal/tools/start-background-process.js';
import { BackgroundProcessManager } from '../../../../src/tools/terminal/background-process-manager.js';
import { ShellCommandExecutor } from '../../../../src/tools/terminal/command-execution/shell-command-executor.js';
import { TerminalResult } from '../../../../src/tools/terminal/types.js';

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
  it('executes foreground commands through the non-PTY shell executor', async () => {
    const workspaceRoot = createTempWorkspace(path.join('packages', 'api'));
    const context: any = { workspaceRootPath: workspaceRoot };
    const cwd = path.join(workspaceRoot, 'packages', 'api');

    const result = await runBash(context, 'printf "ok"', cwd);

    expect(result).toBeInstanceOf(TerminalResult);
    expect(result.stdout).toBe('ok');
    expect(result.stderr).toBe('');
    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(false);
    expect(result.effectiveCwd).toBe(fs.realpathSync(cwd));
    expect(result.backgroundProcesses).toEqual([]);
  });

  it('writes large heredoc content without PTY corruption', async () => {
    const workspaceRoot = createTempWorkspace();
    const context: any = { workspaceRootPath: workspaceRoot };
    const html = [
      '<!doctype html>',
      '<html>',
      '<head><meta charset="utf-8"><title>Jet Game</title></head>',
      '<body>',
      '<canvas id="game" width="800" height="450"></canvas>',
      '<script>',
      'const planes = Array.from({ length: 200 }, (_, i) => ({ x: i * 7, y: Math.sin(i) * 20 }));',
      'console.log(JSON.stringify(planes.slice(0, 3)));',
      '</script>',
      '</body>',
      '</html>',
      ''
    ].join('\n');
    const command = `cat > jet.html <<'HTML'\n${html}HTML`;

    const result = await runBash(context, command, workspaceRoot);
    const written = fs.readFileSync(path.join(workspaceRoot, 'jet.html'), 'utf8');

    expect(result.exitCode).toBe(0);
    expect(written).toBe(html);
  });

  it('uses the workspace root when cwd is omitted', async () => {
    const workspaceRoot = createTempWorkspace(path.join('packages', 'api'));
    const context: any = { workspaceRootPath: workspaceRoot };

    const result = await runBash(context, 'pwd');

    expect(fs.realpathSync(result.stdout.trim())).toBe(fs.realpathSync(workspaceRoot));
    expect(result.effectiveCwd).toBe(workspaceRoot);
  });

  it('uses the system temporary directory when cwd and workspace are omitted', async () => {
    const result = await runBash(null, 'pwd');

    expect(result.exitCode).toBe(0);
    expect(fs.realpathSync(result.stdout.trim())).toBe(fs.realpathSync(os.tmpdir()));
    expect(result.effectiveCwd).toBe(os.tmpdir());
  });

  it('executes in an explicit absolute cwd outside the workspace', async () => {
    const workspaceRoot = createTempWorkspace();
    const outsideRoot = createTempWorkspace();
    const context: any = { workspaceRootPath: workspaceRoot };

    const result = await runBash(context, 'pwd', outsideRoot);

    expect(result.exitCode).toBe(0);
    expect(fs.realpathSync(result.stdout.trim())).toBe(fs.realpathSync(outsideRoot));
    expect(result.effectiveCwd).toBe(fs.realpathSync(outsideRoot));
  });

  it('accepts an explicit absolute cwd without a configured workspace', async () => {
    const outsideRoot = createTempWorkspace();

    const result = await runBash({ workspaceRootPath: null }, 'pwd', outsideRoot);

    expect(result.exitCode).toBe(0);
    expect(result.effectiveCwd).toBe(fs.realpathSync(outsideRoot));
  });

  it('reports the physical target for an external symlink cwd', async () => {
    const workspaceRoot = createTempWorkspace();
    const outsideRoot = createTempWorkspace();
    const symlinkPath = path.join(workspaceRoot, 'external-link');
    fs.symlinkSync(outsideRoot, symlinkPath, 'dir');

    const result = await runBash({ workspaceRootPath: workspaceRoot }, 'pwd', symlinkPath);

    expect(result.exitCode).toBe(0);
    expect(result.effectiveCwd).toBe(fs.realpathSync(outsideRoot));
  });

  it('rejects a provided relative cwd before foreground execution starts', async () => {
    const workspaceRoot = createTempWorkspace();
    const executeSpy = vi.spyOn(ShellCommandExecutor.prototype, 'execute');

    await expect(runBash({ workspaceRootPath: workspaceRoot }, 'echo should-not-start', 'packages/api'))
      .rejects.toThrow('Working directory must be an absolute path.');
    expect(executeSpy).not.toHaveBeenCalled();
  });

  it('maps missing and non-directory cwd values to working-directory validation errors', async () => {
    const workspaceRoot = createTempWorkspace();
    const filePath = path.join(workspaceRoot, 'file.txt');
    fs.writeFileSync(filePath, 'content');
    const physicalWorkspaceRoot = fs.realpathSync(workspaceRoot);

    await expect(runBash({ workspaceRootPath: workspaceRoot }, 'pwd', path.join(workspaceRoot, 'missing')))
      .rejects.toThrow(`Working directory '${path.join(physicalWorkspaceRoot, 'missing')}' does not exist.`);
    await expect(runBash({ workspaceRootPath: workspaceRoot }, 'pwd', filePath))
      .rejects.toThrow(`Working directory '${path.join(physicalWorkspaceRoot, 'file.txt')}' is not a directory.`);
  });

  it('rejects relative cwd paths when no workspace is configured', async () => {
    const context: any = { workspaceRootPath: null };

    const executeSpy = vi.spyOn(ShellCommandExecutor.prototype, 'execute');

    await expect(runBash(context, 'echo nope', 'relative/path'))
      .rejects.toThrow('Working directory must be an absolute path.');
    expect(executeSpy).not.toHaveBeenCalled();
  });

  it('rejects a provided relative cwd before background spawning starts', async () => {
    const workspaceRoot = createTempWorkspace();
    const startSpy = vi.spyOn(BackgroundProcessManager.prototype, 'startCommand');
    const context: any = { workspaceRootPath: workspaceRoot };

    await expect(startBackgroundProcess(context, 'echo should-not-start', 'packages/api'))
      .rejects.toThrow('Working directory must be an absolute path.');
    expect(startSpy).not.toHaveBeenCalled();
    expect((context._backgroundProcessManager as BackgroundProcessManager).processCount).toBe(0);
  });

  it('rejects a provided relative cwd without a workspace before background spawning starts', async () => {
    const startSpy = vi.spyOn(BackgroundProcessManager.prototype, 'startCommand');
    const context: any = { workspaceRootPath: null };

    await expect(startBackgroundProcess(context, 'echo should-not-start', 'relative/path'))
      .rejects.toThrow('Working directory must be an absolute path.');
    expect(startSpy).not.toHaveBeenCalled();
    expect((context._backgroundProcessManager as BackgroundProcessManager).processCount).toBe(0);
  });

  it('rejects an existing inaccessible absolute cwd before foreground execution starts', async () => {
    if (process.platform === 'win32') return;
    const workspaceRoot = createTempWorkspace();
    const inaccessibleRoot = createTempWorkspace();
    const executeSpy = vi.spyOn(ShellCommandExecutor.prototype, 'execute');
    fs.chmodSync(inaccessibleRoot, 0o600);
    try {
      await expect(runBash({ workspaceRootPath: workspaceRoot }, 'echo should-not-start', inaccessibleRoot))
        .rejects.toThrow(`Working directory '${fs.realpathSync(inaccessibleRoot)}' is not accessible.`);
      expect(executeSpy).not.toHaveBeenCalled();
    } finally {
      fs.chmodSync(inaccessibleRoot, 0o700);
    }
  });

  it('rejects an existing inaccessible absolute cwd before background spawning starts', async () => {
    if (process.platform === 'win32') return;
    const workspaceRoot = createTempWorkspace();
    const inaccessibleRoot = createTempWorkspace();
    const startSpy = vi.spyOn(BackgroundProcessManager.prototype, 'startCommand');
    const context: any = { workspaceRootPath: workspaceRoot };
    fs.chmodSync(inaccessibleRoot, 0o600);
    try {
      await expect(startBackgroundProcess(context, 'echo should-not-start', inaccessibleRoot))
        .rejects.toThrow(`Working directory '${fs.realpathSync(inaccessibleRoot)}' is not accessible.`);
      expect(startSpy).not.toHaveBeenCalled();
      expect((context._backgroundProcessManager as BackgroundProcessManager).processCount).toBe(0);
    } finally {
      fs.chmodSync(inaccessibleRoot, 0o700);
    }
  });

});

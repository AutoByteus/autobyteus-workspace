import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runBash } from '../../../../src/tools/terminal/tools/run-bash.js';
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
    expect(result.effectiveCwd).toBe(cwd);
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

  it('resolves relative cwd paths from the workspace root when provided', async () => {
    const workspaceRoot = createTempWorkspace(path.join('packages', 'api'));
    const context: any = { workspaceRootPath: workspaceRoot };

    const result = await runBash(context, 'pwd', path.join('packages', 'api'));

    expect(fs.realpathSync(result.stdout.trim())).toBe(fs.realpathSync(path.join(workspaceRoot, 'packages', 'api')));
    expect(result.effectiveCwd).toBe(path.join(workspaceRoot, 'packages', 'api'));
  });

  it('rejects relative cwd paths when no workspace is configured', async () => {
    const context: any = { workspaceRootPath: null };

    await expect(runBash(context, 'echo nope', 'relative/path')).rejects.toThrow(/must be absolute when no workspace root is configured/);
  });
});

import { describe, it, expect } from 'vitest';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { selectShellForEnvironment } from '../../../../src/tools/terminal/direct-shell-session.js';

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'autobyteus-shell-select-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe('direct_shell_session shell selection', () => {
  it('prefers bash on android when bash is present', async () => {
    await withTempDir(async (dir) => {
      await writeFile(path.join(dir, 'bash'), '#!/bin/sh\n', 'utf8');
      await writeFile(path.join(dir, 'sh'), '#!/bin/sh\n', 'utf8');
      await chmod(path.join(dir, 'bash'), 0o755);
      await chmod(path.join(dir, 'sh'), 0o755);

      const selected = selectShellForEnvironment('android', {
        PATH: dir
      });

      expect(selected.shellName).toBe('bash');
      expect(selected.args).toEqual(['--noprofile', '--norc', '-i']);
      expect(selected.shell).toContain('bash');
    });
  });

  it('falls back to sh on android when bash is not present', async () => {
    await withTempDir(async (dir) => {
      await writeFile(path.join(dir, 'sh'), '#!/bin/sh\n', 'utf8');
      await chmod(path.join(dir, 'sh'), 0o755);

      const selected = selectShellForEnvironment('android', {
        PATH: dir
      });

      expect(selected.shellName).toBe('sh');
      expect(selected.args).toEqual(['-i']);
      expect(selected.shell).toContain('sh');
    });
  });

  it('falls back to /system/bin/sh when PATH lookup has no shell on android', () => {
    const selected = selectShellForEnvironment('android', {
      PATH: ''
    });

    expect(selected.shellName).toBe('sh');
    expect(selected.shell).toBe('/system/bin/sh');
  });

  it('uses ComSpec on win32', () => {
    const selected = selectShellForEnvironment('win32', {
      ComSpec: 'C:\\Windows\\System32\\cmd.exe'
    });

    expect(selected.shellName).toBe('cmd');
    expect(selected.shell).toBe('C:\\Windows\\System32\\cmd.exe');
    expect(selected.args).toEqual([]);
  });
});

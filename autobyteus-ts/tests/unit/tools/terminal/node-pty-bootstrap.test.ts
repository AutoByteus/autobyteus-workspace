import { chmod, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ensureFileIsExecutable } from '../../../../src/tools/terminal/node-pty-bootstrap.js';

async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'autobyteus-node-pty-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe('node-pty bootstrap', () => {
  it('adds execute bits when a helper file is not executable', async () => {
    await withTempDir(async (tempDir) => {
      const helperPath = path.join(tempDir, 'spawn-helper');
      await writeFile(helperPath, '#!/bin/sh\n');
      await chmod(helperPath, 0o644);

      const repaired = await ensureFileIsExecutable(helperPath);
      const repairedMode = (await stat(helperPath)).mode & 0o777;

      expect(repaired).toBe(true);
      expect(repairedMode).toBe(0o755);
    });
  });

  it('returns false when the file is already executable', async () => {
    await withTempDir(async (tempDir) => {
      const helperPath = path.join(tempDir, 'spawn-helper');
      await writeFile(helperPath, '#!/bin/sh\n');
      await chmod(helperPath, 0o755);

      const repaired = await ensureFileIsExecutable(helperPath);
      const repairedMode = (await stat(helperPath)).mode & 0o777;

      expect(repaired).toBe(false);
      expect(repairedMode).toBe(0o755);
    });
  });

  it('returns false when the file does not exist', async () => {
    await withTempDir(async (tempDir) => {
      const helperPath = path.join(tempDir, 'missing-helper');

      await expect(ensureFileIsExecutable(helperPath)).resolves.toBe(false);
    });
  });
});

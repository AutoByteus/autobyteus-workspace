import { chmod, mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ensureFileIsExecutable,
  resolveNodePtySpawnHelperPath,
} from '../../../../src/tools/terminal/node-pty-bootstrap.js';

const requireFromTest = createRequire(import.meta.url);

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

  it('uses node-pty selected native dir instead of first existing build helper', async () => {
    await withTempDir(async (tempDir) => {
      const nodePtyRoot = path.join(tempDir, 'node-pty');
      const utilsPath = path.join(nodePtyRoot, 'lib', 'utils.js');
      const staleBuildDir = path.join(nodePtyRoot, 'build', 'Release');
      const selectedPrebuildDir = path.join(nodePtyRoot, 'prebuilds', 'darwin-x64');

      await mkdir(staleBuildDir, { recursive: true });
      await mkdir(path.dirname(utilsPath), { recursive: true });
      await mkdir(selectedPrebuildDir, { recursive: true });
      await writeFile(path.join(staleBuildDir, 'pty.node'), '');
      await writeFile(path.join(staleBuildDir, 'spawn-helper'), '#!/bin/sh\n');
      await writeFile(path.join(selectedPrebuildDir, 'pty.node'), '');
      await writeFile(path.join(selectedPrebuildDir, 'spawn-helper'), '#!/bin/sh\n');
      await writeFile(
        utilsPath,
        "exports.loadNativeModule = () => ({ dir: '../prebuilds/darwin-x64/', module: {} });\n",
      );

      const fakeRequire = ((specifier: string) => {
        if (specifier === 'node-pty/lib/utils.js') {
          return requireFromTest(utilsPath);
        }
        return requireFromTest(specifier);
      }) as NodeJS.Require;
      fakeRequire.resolve = ((specifier: string) => {
        if (specifier === 'node-pty/lib/utils.js') {
          return utilsPath;
        }
        return requireFromTest.resolve(specifier);
      }) as NodeJS.Require['resolve'];

      await expect(
        resolveNodePtySpawnHelperPath({ requireFn: fakeRequire, platform: 'darwin', arch: 'x64' }),
      ).resolves.toBe(path.join(selectedPrebuildDir, 'spawn-helper'));
    });
  });
});

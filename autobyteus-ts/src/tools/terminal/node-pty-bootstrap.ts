import { constants as fsConstants } from 'node:fs';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const requireFromHere = createRequire(import.meta.url);
const nativeModuleDirs = [
  'build/Release',
  'build/Debug',
  `prebuilds/${process.platform}-${process.arch}`,
];
const nativeModuleRelatives = ['..', '.'];

const normalizeBundledPath = (value: string): string => (
  value
    .replace('app.asar', 'app.asar.unpacked')
    .replace('node_modules.asar', 'node_modules.asar.unpacked')
);

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
};

export async function ensureFileIsExecutable(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fsConstants.X_OK);
    return false;
  } catch {
    // Fall through and repair the file if it exists without execute permission.
  }

  try {
    const stats = await fs.stat(filePath);
    const currentMode = stats.mode & 0o777;
    const repairedMode = currentMode | 0o111;

    if (repairedMode === currentMode) {
      return false;
    }

    await fs.chmod(filePath, repairedMode);
    return true;
  } catch {
    return false;
  }
}

export async function resolveNodePtySpawnHelperPath(): Promise<string | null> {
  let utilsPath: string;

  try {
    utilsPath = requireFromHere.resolve('node-pty/lib/utils.js');
  } catch {
    return null;
  }

  const utilsDir = path.dirname(utilsPath);

  for (const relative of nativeModuleRelatives) {
    for (const nativeDir of nativeModuleDirs) {
      const baseDir = normalizeBundledPath(path.resolve(utilsDir, relative, nativeDir));
      const ptyNodePath = path.join(baseDir, 'pty.node');
      const helperPath = path.join(baseDir, 'spawn-helper');

      if (await fileExists(ptyNodePath) && await fileExists(helperPath)) {
        return helperPath;
      }
    }
  }

  return null;
}

export async function ensureNodePtySpawnHelperExecutable(): Promise<boolean> {
  if (process.platform === 'win32') {
    return false;
  }

  const helperPath = await resolveNodePtySpawnHelperPath();
  if (!helperPath) {
    return false;
  }

  return ensureFileIsExecutable(helperPath);
}

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

const normalizeBundledPath = (value) => (
  value
    .replace('app.asar', 'app.asar.unpacked')
    .replace('node_modules.asar', 'node_modules.asar.unpacked')
);

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const ensureExecutable = async (filePath) => {
  try {
    await fs.access(filePath, fsConstants.X_OK);
    return false;
  } catch {
    // Fall through and repair the permission bits if possible.
  }

  const stats = await fs.stat(filePath);
  const currentMode = stats.mode & 0o777;
  const repairedMode = currentMode | 0o111;

  if (repairedMode === currentMode) {
    return false;
  }

  await fs.chmod(filePath, repairedMode);
  return true;
};

const resolveNodePtySpawnHelperPath = async () => {
  let utilsPath;

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
};

async function main() {
  if (process.platform === 'win32') {
    return;
  }

  const helperPath = await resolveNodePtySpawnHelperPath();
  if (!helperPath) {
    console.log('[node-pty-fix] skipped: no spawn-helper found');
    return;
  }

  try {
    const repaired = await ensureExecutable(helperPath);
    console.log(`[node-pty-fix] ${repaired ? 'repaired' : 'ok'}: ${helperPath}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[node-pty-fix] skipped: ${message}`);
  }
}

await main();

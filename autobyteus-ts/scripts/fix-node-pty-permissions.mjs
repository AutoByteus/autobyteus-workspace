import { constants as fsConstants } from 'node:fs';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const requireFromHere = createRequire(import.meta.url);
const currentArchFallbackDirs = [
  `prebuilds/${process.platform}-${process.arch}`,
  'build/Release',
  'build/Debug',
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

const resolveFallbackHelperPath = async (utilsPath) => {
  const utilsDir = path.dirname(utilsPath);

  for (const nativeDir of currentArchFallbackDirs) {
    for (const relative of nativeModuleRelatives) {
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

const resolveNodePtySpawnHelperPath = async () => {
  let utilsPath;

  try {
    utilsPath = requireFromHere.resolve('node-pty/lib/utils.js');
  } catch {
    return null;
  }

  let utilsModule;
  try {
    utilsModule = requireFromHere('node-pty/lib/utils.js');
  } catch {
    return resolveFallbackHelperPath(utilsPath);
  }

  if (typeof utilsModule.loadNativeModule !== 'function') {
    return resolveFallbackHelperPath(utilsPath);
  }

  try {
    const nativeModule = utilsModule.loadNativeModule('pty');
    if (!nativeModule || typeof nativeModule.dir !== 'string') {
      return resolveFallbackHelperPath(utilsPath);
    }
    const baseDir = normalizeBundledPath(path.resolve(path.dirname(utilsPath), nativeModule.dir));
    const helperPath = path.join(baseDir, 'spawn-helper');
    if (await fileExists(path.join(baseDir, 'pty.node')) && await fileExists(helperPath)) {
      return helperPath;
    }
  } catch {
    return resolveFallbackHelperPath(utilsPath);
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

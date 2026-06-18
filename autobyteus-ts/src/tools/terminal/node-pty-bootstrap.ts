import { constants as fsConstants } from 'node:fs';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const requireFromHere = createRequire(import.meta.url);
const currentArchFallbackDirs = (platform: string, arch: string): string[] => [
  `prebuilds/${platform}-${arch}`,
  'build/Release',
  'build/Debug',
];
const nativeModuleRelatives = ['..', '.'];

type NodePtyRequire = NodeJS.Require;

type NodePtyNativeModule = {
  dir?: unknown;
};

type NodePtyUtilsModule = {
  loadNativeModule?: (name: string) => NodePtyNativeModule;
};

type ResolveNodePtyOptions = {
  requireFn?: NodePtyRequire;
  platform?: string;
  arch?: string;
};

type ResolvedNodePtyHelper = {
  utilsPath?: string;
  selectedNativeDir?: string;
  helperPath?: string;
  resolutionError?: string;
};

export type NodePtySpawnHelperDiagnostics = {
  platform: string;
  arch: string;
  utilsPath?: string;
  selectedNativeDir?: string;
  helperPath?: string;
  helperExecutable?: boolean;
  resolutionError?: string;
};

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

const isExecutable = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath, fsConstants.X_OK);
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

const resolveFallbackHelperPath = async (
  utilsPath: string,
  platform: string,
  arch: string,
): Promise<string | undefined> => {
  const utilsDir = path.dirname(utilsPath);

  for (const nativeDir of currentArchFallbackDirs(platform, arch)) {
    for (const relative of nativeModuleRelatives) {
      const baseDir = normalizeBundledPath(path.resolve(utilsDir, relative, nativeDir));
      const ptyNodePath = path.join(baseDir, 'pty.node');
      const helperPath = path.join(baseDir, 'spawn-helper');

      if (await fileExists(ptyNodePath) && await fileExists(helperPath)) {
        return helperPath;
      }
    }
  }

  return undefined;
};

async function resolveNodePtyHelper(
  options: ResolveNodePtyOptions = {},
): Promise<ResolvedNodePtyHelper> {
  const requireFn = options.requireFn ?? requireFromHere;
  const platform = options.platform ?? process.platform;
  const arch = options.arch ?? process.arch;
  let utilsPath: string;

  try {
    utilsPath = requireFn.resolve('node-pty/lib/utils.js');
  } catch (error) {
    return {
      resolutionError: `node-pty utils not found: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  let utilsModule: NodePtyUtilsModule;
  try {
    utilsModule = requireFn('node-pty/lib/utils.js') as NodePtyUtilsModule;
  } catch (error) {
    const helperPath = await resolveFallbackHelperPath(utilsPath, platform, arch);
    return {
      utilsPath,
      helperPath,
      resolutionError: `node-pty utils could not be loaded: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  if (typeof utilsModule.loadNativeModule !== 'function') {
    const helperPath = await resolveFallbackHelperPath(utilsPath, platform, arch);
    return {
      utilsPath,
      helperPath,
      resolutionError: 'node-pty utils did not expose loadNativeModule',
    };
  }

  const utilsDir = path.dirname(utilsPath);

  try {
    const nativeModule = utilsModule.loadNativeModule('pty');
    if (!nativeModule || typeof nativeModule.dir !== 'string') {
      const helperPath = await resolveFallbackHelperPath(utilsPath, platform, arch);
      return {
        utilsPath,
        helperPath,
        resolutionError: 'node-pty loadNativeModule returned no native directory',
      };
    }

    const selectedNativeDir = normalizeBundledPath(path.resolve(utilsDir, nativeModule.dir));
    const ptyNodePath = path.join(selectedNativeDir, 'pty.node');
    const helperPath = path.join(selectedNativeDir, 'spawn-helper');

    if (!(await fileExists(ptyNodePath))) {
      return {
        utilsPath,
        selectedNativeDir,
        helperPath,
        resolutionError: `selected node-pty native module is missing: ${ptyNodePath}`,
      };
    }
    if (!(await fileExists(helperPath))) {
      return {
        utilsPath,
        selectedNativeDir,
        helperPath,
        resolutionError: `selected node-pty spawn-helper is missing: ${helperPath}`,
      };
    }

    return {
      utilsPath,
      selectedNativeDir,
      helperPath,
    };
  } catch (error) {
    const helperPath = await resolveFallbackHelperPath(utilsPath, platform, arch);
    return {
      utilsPath,
      helperPath,
      resolutionError: `node-pty native module selection failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function resolveNodePtySpawnHelperPath(
  options: ResolveNodePtyOptions = {},
): Promise<string | null> {
  const resolved = await resolveNodePtyHelper(options);
  return resolved.helperPath ?? null;
}

export async function getNodePtySpawnHelperDiagnostics(): Promise<NodePtySpawnHelperDiagnostics> {
  const resolved = await resolveNodePtyHelper();

  return {
    platform: process.platform,
    arch: process.arch,
    utilsPath: resolved.utilsPath,
    selectedNativeDir: resolved.selectedNativeDir,
    helperPath: resolved.helperPath,
    helperExecutable: resolved.helperPath ? await isExecutable(resolved.helperPath) : undefined,
    resolutionError: resolved.resolutionError,
  };
}

export function formatNodePtySpawnHelperDiagnostics(
  diagnostics: NodePtySpawnHelperDiagnostics,
): string {
  const fields = [
    `platform=${diagnostics.platform}`,
    `arch=${diagnostics.arch}`,
    `utilsPath=${diagnostics.utilsPath ?? 'unresolved'}`,
    `selectedNativeDir=${diagnostics.selectedNativeDir ?? 'unresolved'}`,
    `helperPath=${diagnostics.helperPath ?? 'unresolved'}`,
    `helperExecutable=${diagnostics.helperExecutable === undefined ? 'unknown' : String(diagnostics.helperExecutable)}`,
  ];
  if (diagnostics.resolutionError) {
    fields.push(`resolutionError=${diagnostics.resolutionError}`);
  }
  return `node-pty diagnostics: ${fields.join(' ')}`;
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

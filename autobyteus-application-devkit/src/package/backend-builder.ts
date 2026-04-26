import fs from 'node:fs/promises';
import { builtinModules } from 'node:module';
import path from 'node:path';
import { build } from 'esbuild';
import type { ResolvedApplicationProjectPaths } from '../paths/application-project-paths.js';

const MODULE_SPECIFIER_PATTERN = /(?:import|export)\s+(?:[^"'`]*?\s+from\s+)?["']([^"']+)["']/g;
const NODE_BUILTIN_MODULES = new Set(builtinModules.map((name) => name.replace(/^node:/, '')));

const pathExists = async (targetPath: string): Promise<boolean> => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const isBareRuntimeSpecifier = (specifier: string): boolean => {
  const normalized = specifier.trim();
  return Boolean(normalized)
    && !normalized.startsWith('.')
    && !normalized.startsWith('/')
    && !normalized.startsWith('node:')
    && !NODE_BUILTIN_MODULES.has(normalized.split('/')[0] ?? normalized)
    && !normalized.startsWith('file:')
    && !normalized.startsWith('data:');
};

const assertBackendEntrySelfContained = async (entryPath: string): Promise<void> => {
  const content = await fs.readFile(entryPath, 'utf8');
  const bareSpecifiers = [...content.matchAll(MODULE_SPECIFIER_PATTERN)]
    .map((match) => match[1] ?? '')
    .filter(isBareRuntimeSpecifier);
  if (bareSpecifiers.length > 0) {
    throw new Error(
      `Backend entry contains non-bundled package imports: ${[...new Set(bareSpecifiers)].join(', ')}`,
    );
  }
};

export const buildBackendBundle = async (input: {
  paths: ResolvedApplicationProjectPaths;
}): Promise<{ entryModuleRelativePath: string }> => {
  if (!await pathExists(input.paths.sourceBackendEntryPoint)) {
    throw new Error(`Backend entry point does not exist: ${input.paths.sourceBackendEntryPoint}`);
  }

  const backendDistRoot = path.join(input.paths.generatedBackendRoot, 'dist');
  await fs.rm(backendDistRoot, { recursive: true, force: true });
  await fs.mkdir(backendDistRoot, { recursive: true });
  const entryPath = path.join(backendDistRoot, 'entry.mjs');
  await build({
    entryPoints: [input.paths.sourceBackendEntryPoint],
    outfile: entryPath,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    sourcemap: false,
    absWorkingDir: input.paths.projectRoot,
    logLevel: 'silent',
    legalComments: 'none',
    external: ['node:*'],
  });
  await assertBackendEntrySelfContained(entryPath);
  return { entryModuleRelativePath: 'backend/dist/entry.mjs' };
};

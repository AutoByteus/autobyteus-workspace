import fs from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import type { ResolvedApplicationProjectPaths } from '../paths/application-project-paths.js';

const FRONTEND_SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts']);

const ensureDirectory = async (targetPath: string): Promise<void> => {
  await fs.mkdir(targetPath, { recursive: true });
};

const pathExists = async (targetPath: string): Promise<boolean> => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const shouldCopyFrontendFile = (sourcePath: string, entryPointPath: string): boolean => {
  if (path.resolve(sourcePath) === path.resolve(entryPointPath)) {
    return false;
  }
  return !FRONTEND_SOURCE_EXTENSIONS.has(path.extname(sourcePath).toLowerCase());
};

const copyStaticFrontendAssets = async (input: {
  sourceRoot: string;
  targetRoot: string;
  entryPointPath: string;
  currentSourceRoot?: string;
}): Promise<void> => {
  const sourceRoot = input.currentSourceRoot ?? input.sourceRoot;
  const entries = await fs.readdir(sourceRoot, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(sourceRoot, entry.name);
    const relativePath = path.relative(input.sourceRoot, sourcePath);
    const targetPath = path.join(input.targetRoot, relativePath);
    if (entry.isDirectory()) {
      await copyStaticFrontendAssets({ ...input, currentSourceRoot: sourcePath });
      continue;
    }
    if (!entry.isFile() || !shouldCopyFrontendFile(sourcePath, input.entryPointPath)) {
      continue;
    }
    await ensureDirectory(path.dirname(targetPath));
    await fs.copyFile(sourcePath, targetPath);
  }
};

export const buildFrontendAssets = async (input: {
  paths: ResolvedApplicationProjectPaths;
  uiRoot?: string;
}): Promise<{ uiRoot: string; entryScript: string }> => {
  const uiRoot = input.uiRoot ?? input.paths.generatedUiRoot;
  if (!await pathExists(input.paths.sourceFrontendEntryPoint)) {
    throw new Error(`Frontend entry point does not exist: ${input.paths.sourceFrontendEntryPoint}`);
  }
  if (!await pathExists(input.paths.sourceFrontendEntryHtml)) {
    throw new Error(`Frontend entry HTML does not exist: ${input.paths.sourceFrontendEntryHtml}`);
  }

  await fs.rm(uiRoot, { recursive: true, force: true });
  await ensureDirectory(uiRoot);
  await copyStaticFrontendAssets({
    sourceRoot: input.paths.sourceFrontendRoot,
    targetRoot: uiRoot,
    entryPointPath: input.paths.sourceFrontendEntryPoint,
  });
  await build({
    entryPoints: [input.paths.sourceFrontendEntryPoint],
    outfile: path.join(uiRoot, 'app.js'),
    bundle: true,
    platform: 'browser',
    format: 'esm',
    target: 'es2022',
    sourcemap: false,
    absWorkingDir: input.paths.projectRoot,
    logLevel: 'silent',
    legalComments: 'none',
  });

  return { uiRoot, entryScript: 'app.js' };
};

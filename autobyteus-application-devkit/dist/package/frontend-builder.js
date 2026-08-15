import fs from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
const FRONTEND_SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts']);
const ensureDirectory = async (targetPath) => {
    await fs.mkdir(targetPath, { recursive: true });
};
const pathExists = async (targetPath) => {
    try {
        await fs.access(targetPath);
        return true;
    }
    catch {
        return false;
    }
};
const shouldCopyFrontendFile = (sourcePath, entryPointPath) => {
    if (path.resolve(sourcePath) === path.resolve(entryPointPath)) {
        return false;
    }
    return !FRONTEND_SOURCE_EXTENSIONS.has(path.extname(sourcePath).toLowerCase());
};
const copyStaticFrontendAssets = async (input) => {
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
export const buildFrontendAssets = async (input) => {
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
//# sourceMappingURL=frontend-builder.js.map
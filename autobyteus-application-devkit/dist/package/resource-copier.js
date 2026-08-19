import fs from 'node:fs/promises';
import path from 'node:path';
const pathExists = async (targetPath) => {
    try {
        await fs.access(targetPath);
        return true;
    }
    catch {
        return false;
    }
};
const copyTreeIfExists = async (sourcePath, targetPath) => {
    if (!sourcePath || !await pathExists(sourcePath)) {
        return false;
    }
    await fs.rm(targetPath, { recursive: true, force: true });
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.cp(sourcePath, targetPath, { recursive: true });
    return true;
};
export const copyApplicationResources = async (input) => {
    const hasMigrations = await copyTreeIfExists(input.paths.sourceMigrationsRoot, path.join(input.paths.generatedBackendRoot, 'migrations'));
    const hasAssets = await copyTreeIfExists(input.paths.sourceBackendAssetsRoot, path.join(input.paths.generatedBackendRoot, 'assets'));
    await copyTreeIfExists(input.paths.sourceAgentsRoot, path.join(input.paths.generatedApplicationRoot, 'agents'));
    await copyTreeIfExists(input.paths.sourceAgentTeamsRoot, path.join(input.paths.generatedApplicationRoot, 'agent-teams'));
    return { hasMigrations, hasAssets };
};
//# sourceMappingURL=resource-copier.js.map
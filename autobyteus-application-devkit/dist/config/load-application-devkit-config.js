import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveApplicationDevkitConfig, } from './application-devkit-config.js';
const CONFIG_FILE_NAME = 'autobyteus-app.config.mjs';
const isObjectRecord = (value) => (Boolean(value) && typeof value === 'object' && !Array.isArray(value));
const readConfigModuleValue = async (configPath) => {
    try {
        await fs.access(configPath);
    }
    catch {
        return null;
    }
    const imported = await import(`${pathToFileURL(configPath).href}?mtime=${Date.now()}`);
    if (!isObjectRecord(imported.default)) {
        throw new Error(`${CONFIG_FILE_NAME} must export a default config object.`);
    }
    return imported.default;
};
export const loadApplicationDevkitConfig = async (projectRoot) => {
    const resolvedProjectRoot = path.resolve(projectRoot);
    const configPath = path.join(resolvedProjectRoot, CONFIG_FILE_NAME);
    const config = await readConfigModuleValue(configPath);
    return {
        configPath: config ? configPath : null,
        config: resolveApplicationDevkitConfig(config),
    };
};
//# sourceMappingURL=load-application-devkit-config.js.map
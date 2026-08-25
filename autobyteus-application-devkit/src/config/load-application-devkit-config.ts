import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  resolveApplicationDevkitConfig,
  type ApplicationDevkitConfig,
  type ResolvedApplicationDevkitConfig,
} from './application-devkit-config.js';

export const APPLICATION_DEVKIT_CONFIG_FILE_NAME = 'autobyteus-app.config.mjs';

export const resolveApplicationDevkitConfigPath = (
  projectRoot: string,
): string => path.join(path.resolve(projectRoot), APPLICATION_DEVKIT_CONFIG_FILE_NAME);

const isObjectRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const readConfigModuleValue = async (configPath: string): Promise<ApplicationDevkitConfig | null> => {
  try {
    await fs.access(configPath);
  } catch {
    return null;
  }

  const imported = await import(`${pathToFileURL(configPath).href}?mtime=${Date.now()}`) as {
    default?: unknown;
  };
  if (!isObjectRecord(imported.default)) {
    throw new Error(
      `${APPLICATION_DEVKIT_CONFIG_FILE_NAME} must export a default config object.`,
    );
  }
  return imported.default as ApplicationDevkitConfig;
};

export type LoadedApplicationDevkitConfig = {
  configPath: string | null;
  config: ResolvedApplicationDevkitConfig;
};

export const loadApplicationDevkitConfig = async (
  projectRoot: string,
): Promise<LoadedApplicationDevkitConfig> => {
  const resolvedProjectRoot = path.resolve(projectRoot);
  const configPath = resolveApplicationDevkitConfigPath(resolvedProjectRoot);
  const config = await readConfigModuleValue(configPath);

  return {
    configPath: config ? configPath : null,
    config: resolveApplicationDevkitConfig(config),
  };
};

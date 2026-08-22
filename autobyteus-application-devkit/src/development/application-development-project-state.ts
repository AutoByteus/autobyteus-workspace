import path from 'node:path';
import {
  loadApplicationDevkitConfig,
  type LoadedApplicationDevkitConfig,
} from '../config/load-application-devkit-config.js';
import {
  readApplicationSourceManifest,
  type ApplicationSourceManifest,
} from '../package/package-assembler.js';

export type ApplicationDevelopmentProjectState = Readonly<{
  config: LoadedApplicationDevkitConfig;
  manifest: ApplicationSourceManifest;
  outputPackageRoot: string;
}>;

export const resolveApplicationDevelopmentProjectState = async (
  projectRoot: string,
): Promise<ApplicationDevelopmentProjectState> => {
  const resolvedProjectRoot = path.resolve(projectRoot);
  const [config, manifest] = await Promise.all([
    loadApplicationDevkitConfig(resolvedProjectRoot),
    readApplicationSourceManifest(resolvedProjectRoot),
  ]);
  return Object.freeze({
    config,
    manifest,
    outputPackageRoot: path.resolve(
      resolvedProjectRoot,
      config.config.output.packageRoot,
    ),
  });
};

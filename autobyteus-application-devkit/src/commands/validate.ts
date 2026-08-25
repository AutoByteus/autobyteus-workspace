import path from 'node:path';
import { validateApplicationPackage } from '../validation/package-validator.js';
import { formatValidationDiagnostics } from '../validation/validation-result.js';
import { parseCommandOptions, readStringFlag } from './command-options.js';
import { loadApplicationDevkitConfig } from '../config/load-application-devkit-config.js';
import { readApplicationSourceManifest } from '../package/package-assembler.js';
import { validateStandaloneApplicationPackage } from 'autobyteus-server-ts';

export const runValidateCommand = async (args: string[]): Promise<void> => {
  const options = parseCommandOptions(args);
  const projectRoot = path.resolve(readStringFlag(options, 'project-root') ?? process.cwd());
  const target = readStringFlag(options, 'target');
  if (target && target !== 'package' && target !== 'standalone') {
    throw new Error("--target must be 'package' or 'standalone'.");
  }
  const loadedConfig = await loadApplicationDevkitConfig(projectRoot);
  const manifest = await readApplicationSourceManifest(projectRoot);
  const packageRoot = path.resolve(
    readStringFlag(options, 'package-root')
    ?? path.join(projectRoot, loadedConfig.config.output.packageRoot),
  );
  const result = await validateApplicationPackage(packageRoot);
  if (!result.valid) {
    console.error(formatValidationDiagnostics(result));
    process.exitCode = 1;
    return;
  }
  if (loadedConfig.config.standalone.enabled || target === 'standalone') {
    await validateStandaloneApplicationPackage({
      packageRoot,
      localApplicationId: manifest.id,
    });
  }
  console.log(`Package is valid: ${path.resolve(packageRoot)}`);
};

import path from 'node:path';
import { startStandaloneApplicationHost } from 'autobyteus-server-ts';
import { loadApplicationDevkitConfig } from '../config/load-application-devkit-config.js';
import { readApplicationSourceManifest } from '../package/package-assembler.js';
import { validateApplicationPackage } from '../validation/package-validator.js';
import { formatValidationDiagnostics } from '../validation/validation-result.js';
import { waitForDevelopmentShutdown } from '../development/development-process-lifetime.js';
import {
  parseCommandOptions,
  readPortFlag,
  readStringFlag,
} from './command-options.js';

export const runStartCommand = async (args: string[]): Promise<void> => {
  const options = parseCommandOptions(args);
  const projectRoot = path.resolve(
    readStringFlag(options, 'project-root') ?? process.cwd(),
  );
  const config = await loadApplicationDevkitConfig(projectRoot);
  const manifest = await readApplicationSourceManifest(projectRoot);
  const packageRoot = path.resolve(
    readStringFlag(options, 'package-root')
    ?? path.join(projectRoot, config.config.output.packageRoot),
  );
  const validation = await validateApplicationPackage(packageRoot);
  if (!validation.valid) {
    throw new Error(
      `The existing application build is invalid. Run pnpm build first.\n`
      + formatValidationDiagnostics(validation),
    );
  }
  const handle = await startStandaloneApplicationHost({
    packageRoot,
    localApplicationId: manifest.id,
    appDataDir: path.resolve(
      readStringFlag(options, 'data-dir')
      ?? path.join(projectRoot, '.autobyteus', 'standalone-data'),
    ),
    host: readStringFlag(options, 'host'),
    port: readPortFlag(options, 'port') ?? config.config.dev.port,
    publicBaseUrl: readStringFlag(options, 'public-base-url'),
  });
  console.log(`Standalone application ready: ${handle.url}`);
  await waitForDevelopmentShutdown(handle.close);
};

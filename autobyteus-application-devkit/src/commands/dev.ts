import path from 'node:path';
import { runStandaloneDevelopmentSession } from '../development/standalone-development-session.js';
import { runStudioDevelopmentSession } from '../development/studio-development-session.js';
import {
  parseCommandOptions,
  readBooleanFlag,
  readPortFlag,
  readStringFlag,
} from './command-options.js';

export const runDevCommand = async (args: string[]): Promise<void> => {
  const options = parseCommandOptions(args);
  const projectRoot = path.resolve(
    readStringFlag(options, 'project-root') ?? process.cwd(),
  );
  const hostMode = readStringFlag(options, 'host') ?? 'standalone';
  if (hostMode === 'studio') {
    await runStudioDevelopmentSession({
      projectRoot,
      studioUrl: readStringFlag(options, 'studio-url') ?? 'http://127.0.0.1:8000',
    });
    return;
  }
  if (hostMode !== 'standalone') {
    throw new Error("--host must be 'standalone' or 'studio'.");
  }
  await runStandaloneDevelopmentSession({
    projectRoot,
    host: readStringFlag(options, 'listen-host') ?? '127.0.0.1',
    portOverride: readPortFlag(options, 'port'),
    publicBaseUrl: readStringFlag(options, 'public-base-url'),
    openBrowser: !readBooleanFlag(options, 'no-open'),
  });
};

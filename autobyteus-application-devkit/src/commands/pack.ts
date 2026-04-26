import { packApplicationProject } from '../package/package-assembler.js';
import { parseCommandOptions, readStringFlag } from './command-options.js';

export const runPackCommand = async (args: string[]): Promise<void> => {
  const options = parseCommandOptions(args);
  const result = await packApplicationProject({
    projectRoot: readStringFlag(options, 'project-root') ?? process.cwd(),
    outputPackageRootOverride: readStringFlag(options, 'out'),
  });
  console.log(`Generated importable package at ${result.packageRoot}`);
  console.log(`Generated application root at ${result.applicationRoot}`);
};

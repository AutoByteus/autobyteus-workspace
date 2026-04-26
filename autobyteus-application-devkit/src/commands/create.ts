import { materializeApplicationTemplate } from '../template/template-materializer.js';
import { parseCommandOptions, readBooleanFlag, readStringFlag } from './command-options.js';

export const runCreateCommand = async (args: string[]): Promise<void> => {
  const options = parseCommandOptions(args);
  const targetDirectory = options.positionals[0];
  if (!targetDirectory) {
    throw new Error('Usage: autobyteus-app create <dir> --id <local-id> --name <name>');
  }
  const applicationId = readStringFlag(options, 'id');
  const applicationName = readStringFlag(options, 'name');
  if (!applicationId) {
    throw new Error('create requires --id <local-id>.');
  }
  if (!applicationName) {
    throw new Error('create requires --name <name>.');
  }
  const result = await materializeApplicationTemplate({
    targetDirectory,
    applicationId,
    applicationName,
    packageName: readStringFlag(options, 'package-name'),
    force: readBooleanFlag(options, 'force'),
  });
  console.log(`Created AutoByteus application project at ${result.projectRoot}`);
  console.log(`Application id: ${result.applicationId}`);
};

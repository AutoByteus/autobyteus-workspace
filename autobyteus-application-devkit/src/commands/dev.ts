import { startDevBootstrapServer } from '../dev-server/dev-bootstrap-server.js';
import { parseCommandOptions, readBooleanFlag, readPortFlag, readStringFlag } from './command-options.js';

export const runDevCommand = async (args: string[]): Promise<void> => {
  const options = parseCommandOptions(args);
  const server = await startDevBootstrapServer({
    projectRoot: readStringFlag(options, 'project-root') ?? process.cwd(),
    port: readPortFlag(options, 'port'),
    applicationId: readStringFlag(options, 'application-id'),
    backendBaseUrl: readStringFlag(options, 'backend-base-url'),
    backendNotificationsUrl: readStringFlag(options, 'backend-notifications-url'),
    mockBackend: readBooleanFlag(options, 'mock-backend'),
  });
  console.log(`AutoByteus application dev host: ${server.url}`);
  console.log(`Local application id: ${server.session.localApplicationId}`);
  console.log(`Bootstrap application id: ${server.session.applicationId}`);
};

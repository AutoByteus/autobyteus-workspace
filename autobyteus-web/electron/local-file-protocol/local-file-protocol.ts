import { protocol } from 'electron';
import { logger } from '../logger';
import { createLocalFileResponse } from './local-file-response';

const LOCAL_FILE_SCHEME = 'local-file';
const localFileProtocolLogger = logger.child('local-file-protocol');

export function registerLocalFileProtocolScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: LOCAL_FILE_SCHEME,
      privileges: { standard: true, stream: true },
    },
  ]);
}

export function installLocalFileProtocol(): void {
  protocol.handle(LOCAL_FILE_SCHEME, async (request) => {
    try {
      return await createLocalFileResponse(request);
    } catch (error) {
      localFileProtocolLogger.error('Unexpected failure while creating a local-file response.', error);
      return new Response(null, {
        status: 404,
        headers: { 'Cache-Control': 'no-store' },
      });
    }
  });
}

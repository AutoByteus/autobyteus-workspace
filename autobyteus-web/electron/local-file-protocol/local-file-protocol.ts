import { protocol, session, type WebFrameMain } from 'electron';
import { logger } from '../logger';
import { createLocalFileResponse } from './local-file-response';
import { LOCAL_FILE_SCHEME } from '../../shared/localFileUrl';

const localFileProtocolLogger = logger.child('local-file-protocol');

type LocalFileProtocolInstallOptions = {
  isOwnedMainFrame: (webContentsId: number, frame: WebFrameMain) => boolean;
};

export function registerLocalFileProtocolScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: LOCAL_FILE_SCHEME,
      privileges: {
        standard: true,
        stream: true,
        supportFetchAPI: true,
        corsEnabled: true,
      },
    },
  ]);
}

export function installLocalFileProtocol({
  isOwnedMainFrame,
}: LocalFileProtocolInstallOptions): void {
  session.defaultSession.webRequest.onBeforeRequest(
    { urls: [`${LOCAL_FILE_SCHEME}://*/*`] },
    (details, callback) => {
      let isAuthorized = false;
      if (
        typeof details.webContentsId === 'number'
        && details.frame !== null
        && details.frame !== undefined
      ) {
        try {
          isAuthorized = isOwnedMainFrame(details.webContentsId, details.frame);
        } catch (error) {
          localFileProtocolLogger.error(
            'Unexpected failure while authorizing a local-file request.',
            error,
          );
        }
      }
      callback({ cancel: !isAuthorized });
    },
  );

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

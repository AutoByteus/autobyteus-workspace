import { protocol } from 'electron'
import { LOCAL_FILE_SCHEME } from '../../shared/localFileUrl'

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
  ])
}

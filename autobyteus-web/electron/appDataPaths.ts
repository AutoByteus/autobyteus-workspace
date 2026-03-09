import * as os from 'os'
import * as path from 'path'

export function getCanonicalBaseDataPath(homeDir: string = os.homedir()): string {
  return path.join(homeDir, '.autobyteus')
}

export function getCanonicalServerDataPath(baseDataPath: string = getCanonicalBaseDataPath()): string {
  return path.join(baseDataPath, 'server-data')
}

export function getCanonicalExtensionsPath(baseDataPath: string = getCanonicalBaseDataPath()): string {
  return path.join(baseDataPath, 'extensions')
}

export function getCanonicalLogsPath(baseDataPath: string = getCanonicalBaseDataPath()): string {
  return path.join(baseDataPath, 'logs')
}

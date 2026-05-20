import * as path from 'path'
import { toPrismaSqliteUrl } from './prismaSqliteUrl'

export function buildServerRuntimeEnv(
  appDataDir: string,
  publicServerUrl: string,
  baseEnv: NodeJS.ProcessEnv,
  runtimeOverrides: Record<string, string> = {}
): Record<string, string> {
  const dbPath = path.join(appDataDir, 'db', 'production.db')

  return {
    // Ensure Prisma uses runtime server-data DB path from process start.
    DATABASE_URL: toPrismaSqliteUrl(dbPath),
    DB_TYPE: baseEnv.DB_TYPE ?? 'sqlite',
    AUTOBYTEUS_DATA_DIR: appDataDir,
    AUTOBYTEUS_SERVER_HOST: publicServerUrl,
    ...runtimeOverrides,
  }
}

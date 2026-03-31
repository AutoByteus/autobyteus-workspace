import * as path from 'path'

function toPrismaSqliteUrl(filePath: string): string {
  const normalizedPath = filePath.replace(/\\/g, '/')
  return normalizedPath.startsWith('/') ? `file:${normalizedPath}` : `file:/${normalizedPath}`
}

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
    PERSISTENCE_PROVIDER: baseEnv.PERSISTENCE_PROVIDER ?? 'sqlite',
    DB_TYPE: baseEnv.DB_TYPE ?? 'sqlite',
    AUTOBYTEUS_DATA_DIR: appDataDir,
    AUTOBYTEUS_SERVER_HOST: publicServerUrl,
    ...runtimeOverrides,
  }
}

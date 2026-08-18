export const EMBEDDED_SERVER_PLATFORM_FATAL_PROTOCOL =
  'autobyteus.embedded-server.platform-fatal.v1' as const

const PLATFORM_FATAL_CODE_VALUES = [
  'APP_CONFIG_INITIALIZATION_FAILED',
  'RUNTIME_LOGGING_INITIALIZATION_FAILED',
  'DATABASE_MIGRATION_FAILED',
  'APPLICATION_DATABASE_INITIALIZATION_FAILED',
  'SECRET_VAULT_INITIALIZATION_FAILED',
  'APP_DATA_STARTUP_GATE_FAILED',
  'BUILT_IN_AGENTS_BOOTSTRAP_FAILED',
  'HTTP_SERVER_INITIALIZATION_FAILED',
  'TEMP_WORKSPACE_INITIALIZATION_FAILED',
  'APPLICATION_ORCHESTRATION_RECOVERY_FAILED',
  'UNEXPECTED_SERVER_STARTUP_FAILURE',
] as const

const PLATFORM_FATAL_CODES = new Set<string>(PLATFORM_FATAL_CODE_VALUES)
export type EmbeddedServerPlatformFatalCode = typeof PLATFORM_FATAL_CODE_VALUES[number]

export type EmbeddedServerPlatformFatal = Readonly<{
  protocol: typeof EMBEDDED_SERVER_PLATFORM_FATAL_PROTOCOL
  code: EmbeddedServerPlatformFatalCode
  summary: string
  logPath: string | null
}>

const exactKeys = (value: Record<string, unknown>): boolean => {
  const actual = Object.keys(value).sort()
  const expected = ['code', 'logPath', 'protocol', 'summary']
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

export const parseEmbeddedServerPlatformFatal = (
  line: string,
): EmbeddedServerPlatformFatal | null => {
  const trimmed = line.trim()
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null
  try {
    const value = JSON.parse(trimmed) as unknown
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const record = value as Record<string, unknown>
    if (
      !exactKeys(record)
      || record.protocol !== EMBEDDED_SERVER_PLATFORM_FATAL_PROTOCOL
      || typeof record.code !== 'string'
      || !PLATFORM_FATAL_CODES.has(record.code)
      || typeof record.summary !== 'string'
      || !record.summary.trim()
      || record.summary.length > 2_000
      || (record.logPath !== null && (typeof record.logPath !== 'string' || !record.logPath.trim()))
    ) return null
    return Object.freeze({
      protocol: EMBEDDED_SERVER_PLATFORM_FATAL_PROTOCOL,
      code: record.code as EmbeddedServerPlatformFatalCode,
      summary: record.summary.trim(),
      logPath: typeof record.logPath === 'string' ? record.logPath.trim() : null,
    })
  } catch {
    return null
  }
}

export const platformFatalError = (fatal: EmbeddedServerPlatformFatal): Error => new Error(
  `Server startup failed [${fatal.code}]: ${fatal.summary}`
  + (fatal.logPath ? ` Server log: ${fatal.logPath}` : ''),
)

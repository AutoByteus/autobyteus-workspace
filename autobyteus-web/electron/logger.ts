import * as fs from 'fs'
import * as path from 'path'
import * as util from 'util'
import { getCanonicalLogsPath, getCanonicalServerDataPath } from './appDataPaths'

export type ElectronLogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent'

type ScopedLogLevelOverride = {
  scope: string
  level: ElectronLogLevel
}

type LoggerConfig = {
  level: ElectronLogLevel
  scopedLogLevelOverrides: ScopedLogLevelOverride[]
}

type CreateElectronLoggerOptions = {
  env?: NodeJS.ProcessEnv
  baseDataPath?: string
  logPath?: string
  enableConsole?: boolean
  writeStartupRecord?: boolean
  fileMode?: 'a' | 'w'
  rootLoggerName?: string
}

export type ElectronAppLogger = {
  child: (scope: string) => ElectronAppLogger
  trace: (message?: unknown, ...args: unknown[]) => void
  debug: (message?: unknown, ...args: unknown[]) => void
  info: (message?: unknown, ...args: unknown[]) => void
  warn: (message?: unknown, ...args: unknown[]) => void
  error: (message?: unknown, ...args: unknown[]) => void
  fatal: (message?: unknown, ...args: unknown[]) => void
  isLevelEnabled: (level: ElectronLogLevel) => boolean
  getLogPath: () => string
  close: () => void
}

const DEFAULT_ROOT_LOGGER_NAME = 'electron'

const LOG_LEVEL_PRIORITY: Record<ElectronLogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
  silent: 70,
}

const parseLogLevel = (value: string | null | undefined): ElectronLogLevel | null => {
  const normalized = value?.trim().toLowerCase()
  switch (normalized) {
    case 'fatal':
    case 'error':
    case 'warn':
    case 'info':
    case 'debug':
    case 'trace':
    case 'silent':
      return normalized
    default:
      return null
  }
}

const normalizeScopeName = (value: string | null | undefined): string | null => {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) {
    return null
  }
  return normalized.replace(/\.+/g, '.').replace(/^\.+|\.+$/g, '')
}

const parseScopedLogLevelOverrides = (value: string | null | undefined): ScopedLogLevelOverride[] => {
  const normalized = value?.trim()
  if (!normalized) {
    return []
  }

  const dedupedOverrides = new Map<string, ElectronLogLevel>()
  for (const token of normalized.split(/[\n,;]+/)) {
    const trimmedToken = token.trim()
    if (!trimmedToken) {
      continue
    }

    const separatorIndex = trimmedToken.includes('=')
      ? trimmedToken.indexOf('=')
      : trimmedToken.indexOf(':')
    if (separatorIndex <= 0) {
      continue
    }

    const scope = normalizeScopeName(trimmedToken.slice(0, separatorIndex))
    const level = parseLogLevel(trimmedToken.slice(separatorIndex + 1))
    if (!scope || !level) {
      continue
    }
    dedupedOverrides.set(scope, level)
  }

  return Array.from(dedupedOverrides, ([scope, level]) => ({ scope, level }))
}

const scopeMatchesLoggerName = (loggerName: string, scope: string): boolean =>
  loggerName === scope || loggerName.startsWith(`${scope}.`)

const resolveScopedLogLevel = (loggingConfig: LoggerConfig, loggerName: string): ElectronLogLevel => {
  const normalizedLoggerName = normalizeScopeName(loggerName)
  if (!normalizedLoggerName) {
    return loggingConfig.level
  }

  let matchedOverride: ScopedLogLevelOverride | null = null
  for (const override of loggingConfig.scopedLogLevelOverrides) {
    if (!scopeMatchesLoggerName(normalizedLoggerName, override.scope)) {
      continue
    }
    if (!matchedOverride || override.scope.length > matchedOverride.scope.length) {
      matchedOverride = override
    }
  }

  return matchedOverride?.level ?? loggingConfig.level
}

const shouldEmitLog = (effectiveLevel: ElectronLogLevel, recordLevel: ElectronLogLevel): boolean =>
  LOG_LEVEL_PRIORITY[recordLevel] >= LOG_LEVEL_PRIORITY[effectiveLevel]

const joinLoggerScope = (parentScope: string, childScope: string): string => {
  const normalizedChildScope = normalizeScopeName(childScope)
  if (!normalizedChildScope) {
    return parentScope
  }
  if (!parentScope) {
    return normalizedChildScope
  }
  return `${parentScope}.${normalizedChildScope}`
}

const stripWrappedQuotes = (value: string): string => {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }
  return value
}

const readServerDataEnv = (baseDataPath?: string): NodeJS.ProcessEnv => {
  const envPath = path.join(getCanonicalServerDataPath(baseDataPath), '.env')
  if (!fs.existsSync(envPath)) {
    return {}
  }

  const env: NodeJS.ProcessEnv = {}
  const content = fs.readFileSync(envPath, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) {
      continue
    }

    const separatorIndex = line.indexOf('=')
    if (separatorIndex <= 0) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    const value = stripWrappedQuotes(line.slice(separatorIndex + 1).trim())
    if (!key) {
      continue
    }
    env[key] = value
  }

  return env
}

const resolveLoggerConfig = (env: NodeJS.ProcessEnv, baseDataPath?: string): LoggerConfig => {
  const serverDataEnv = readServerDataEnv(baseDataPath)
  const level = parseLogLevel(env.LOG_LEVEL) ?? parseLogLevel(serverDataEnv.LOG_LEVEL) ?? 'info'
  const overrideSource =
    env.AUTOBYTEUS_LOG_LEVEL_OVERRIDES ?? serverDataEnv.AUTOBYTEUS_LOG_LEVEL_OVERRIDES

  return {
    level,
    scopedLogLevelOverrides: parseScopedLogLevelOverrides(overrideSource),
  }
}

const getConsoleMethodNameForLevel = (
  level: ElectronLogLevel,
): 'debug' | 'log' | 'warn' | 'error' => {
  switch (level) {
    case 'trace':
    case 'debug':
      return 'debug'
    case 'warn':
      return 'warn'
    case 'error':
    case 'fatal':
      return 'error'
    case 'info':
    case 'silent':
    default:
      return 'log'
  }
}

const formatLogRecord = (
  level: ElectronLogLevel,
  loggerName: string,
  message: unknown,
  args: unknown[],
): string => {
  const timestamp = new Date().toISOString()
  const formattedMessage = util.format(message, ...args)
  return `[${timestamp}] [${level.toUpperCase()}] [${loggerName}] ${formattedMessage}`
}

class ElectronLoggerRoot {
  private readonly loggingConfig: LoggerConfig
  private readonly logPath: string
  private readonly enableConsole: boolean
  private fileStream: fs.WriteStream | null = null

  constructor(private readonly options: CreateElectronLoggerOptions) {
    this.loggingConfig = resolveLoggerConfig(options.env ?? process.env, options.baseDataPath)
    this.enableConsole = options.enableConsole ?? true
    const logsPath = options.logPath ?? path.join(getCanonicalLogsPath(options.baseDataPath), 'app.log')
    this.logPath = logsPath
    this.initLogStream()

    if (options.writeStartupRecord !== false) {
      this.write(options.rootLoggerName ?? DEFAULT_ROOT_LOGGER_NAME, 'info', 'Application started')
    }
  }

  private initLogStream(): void {
    try {
      fs.mkdirSync(path.dirname(this.logPath), { recursive: true })
      const openFlag = this.options.fileMode ?? 'w'
      fs.closeSync(fs.openSync(this.logPath, openFlag))
      this.fileStream = fs.createWriteStream(this.logPath, { flags: 'a' })
    } catch (error) {
      this.fileStream = null
      console.error('Failed to create log file stream:', error)
    }
  }

  child(scope: string): ElectronAppLogger {
    const rootLoggerName = normalizeScopeName(this.options.rootLoggerName ?? DEFAULT_ROOT_LOGGER_NAME)
      ?? DEFAULT_ROOT_LOGGER_NAME
    return new ElectronScopedLogger(this, joinLoggerScope(rootLoggerName, scope))
  }

  isLevelEnabled(loggerName: string, level: ElectronLogLevel): boolean {
    return shouldEmitLog(resolveScopedLogLevel(this.loggingConfig, loggerName), level)
  }

  write(loggerName: string, level: ElectronLogLevel, message?: unknown, ...args: unknown[]): void {
    if (!this.isLevelEnabled(loggerName, level)) {
      return
    }

    const formattedMessage = formatLogRecord(level, loggerName, message ?? '', args)
    if (this.enableConsole) {
      const consoleMethodName = getConsoleMethodNameForLevel(level)
      console[consoleMethodName](formattedMessage)
    }
    this.fileStream?.write(`${formattedMessage}\n`)
  }

  getLogPath(): string {
    return this.logPath
  }

  close(): void {
    if (this.fileStream) {
      this.fileStream.end()
      this.fileStream = null
    }
  }
}

class ElectronScopedLogger implements ElectronAppLogger {
  constructor(
    private readonly root: ElectronLoggerRoot,
    private readonly loggerName: string,
  ) {}

  child(scope: string): ElectronAppLogger {
    return new ElectronScopedLogger(this.root, joinLoggerScope(this.loggerName, scope))
  }

  trace(message?: unknown, ...args: unknown[]): void {
    this.root.write(this.loggerName, 'trace', message, ...args)
  }

  debug(message?: unknown, ...args: unknown[]): void {
    this.root.write(this.loggerName, 'debug', message, ...args)
  }

  info(message?: unknown, ...args: unknown[]): void {
    this.root.write(this.loggerName, 'info', message, ...args)
  }

  warn(message?: unknown, ...args: unknown[]): void {
    this.root.write(this.loggerName, 'warn', message, ...args)
  }

  error(message?: unknown, ...args: unknown[]): void {
    this.root.write(this.loggerName, 'error', message, ...args)
  }

  fatal(message?: unknown, ...args: unknown[]): void {
    this.root.write(this.loggerName, 'fatal', message, ...args)
  }

  isLevelEnabled(level: ElectronLogLevel): boolean {
    return this.root.isLevelEnabled(this.loggerName, level)
  }

  getLogPath(): string {
    return this.root.getLogPath()
  }

  close(): void {
    this.root.close()
  }
}

export const createElectronLogger = (
  options: CreateElectronLoggerOptions = {},
): ElectronAppLogger => {
  const rootLoggerName = normalizeScopeName(options.rootLoggerName ?? DEFAULT_ROOT_LOGGER_NAME)
    ?? DEFAULT_ROOT_LOGGER_NAME
  const root = new ElectronLoggerRoot({
    ...options,
    rootLoggerName,
  })
  return new ElectronScopedLogger(root, rootLoggerName)
}

export const logger = createElectronLogger()

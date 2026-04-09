import { type ElectronAppLogger, type ElectronLogLevel } from '../logger'

export type ServerProcessOutputForwarder = {
  pushChunk: (output: string) => void
  flush: () => void
}

const parseStructuredServerLogLevel = (output: string): ElectronLogLevel | null => {
  const trimmed = output.trim()
  if (!trimmed.startsWith('{')) {
    return null
  }

  try {
    const parsed = JSON.parse(trimmed) as { level?: unknown }
    switch (parsed.level) {
      case 10:
        return 'trace'
      case 20:
        return 'debug'
      case 30:
        return 'info'
      case 40:
        return 'warn'
      case 50:
      case 60:
        return 'error'
      default:
        return null
    }
  } catch {
    return null
  }
}

export const classifyServerOutputLevel = (
  output: string,
  defaultLevel: ElectronLogLevel,
): ElectronLogLevel => {
  const structuredLevel = parseStructuredServerLogLevel(output)
  if (structuredLevel) {
    return structuredLevel
  }

  const normalized = output.toUpperCase()
  if (normalized.includes('[TRACE]') || normalized.includes('TRACE:')) {
    return 'trace'
  }
  if (normalized.includes('[DEBUG]') || normalized.includes('DEBUG:')) {
    return 'debug'
  }
  if (normalized.includes('[ERROR]') || normalized.includes('[FATAL]') || normalized.includes('ERROR:')) {
    return 'error'
  }
  if (normalized.includes('[WARN]') || normalized.includes('WARN:') || normalized.includes('WARNING:')) {
    return 'warn'
  }
  if (normalized.includes('[INFO]') || normalized.includes('INFO:')) {
    return 'info'
  }
  return defaultLevel
}

const writeServerOutputLog = (
  targetLogger: ElectronAppLogger,
  level: ElectronLogLevel,
  output: string,
): void => {
  switch (level) {
    case 'trace':
      targetLogger.trace(output)
      return
    case 'debug':
      targetLogger.debug(output)
      return
    case 'warn':
      targetLogger.warn(output)
      return
    case 'error':
    case 'fatal':
      targetLogger.error(output)
      return
    case 'info':
    case 'silent':
    default:
      targetLogger.info(output)
  }
}

const emitServerOutputLine = (
  targetLogger: ElectronAppLogger,
  output: string,
  defaultLevel: ElectronLogLevel,
): void => {
  const normalizedOutput = output.trimEnd()
  if (!normalizedOutput) {
    return
  }
  writeServerOutputLog(
    targetLogger,
    classifyServerOutputLevel(normalizedOutput, defaultLevel),
    normalizedOutput,
  )
}

export const createServerProcessOutputForwarder = (
  targetLogger: ElectronAppLogger,
  defaultLevel: ElectronLogLevel,
): ServerProcessOutputForwarder => {
  let pendingOutput = ''

  const drainCompletedLines = (): void => {
    while (true) {
      const newlineIndex = pendingOutput.indexOf('\n')
      if (newlineIndex < 0) {
        return
      }

      const completedLine = pendingOutput.slice(0, newlineIndex)
      pendingOutput = pendingOutput.slice(newlineIndex + 1)
      emitServerOutputLine(
        targetLogger,
        completedLine.endsWith('\r') ? completedLine.slice(0, -1) : completedLine,
        defaultLevel,
      )
    }
  }

  return {
    pushChunk: (output: string): void => {
      pendingOutput += output
      drainCompletedLines()
    },
    flush: (): void => {
      emitServerOutputLine(
        targetLogger,
        pendingOutput.endsWith('\r') ? pendingOutput.slice(0, -1) : pendingOutput,
        defaultLevel,
      )
      pendingOutput = ''
    },
  }
}

export const forwardServerProcessOutput = (
  targetLogger: ElectronAppLogger,
  output: string,
  defaultLevel: ElectronLogLevel,
): void => {
  const forwarder = createServerProcessOutputForwarder(targetLogger, defaultLevel)
  forwarder.pushChunk(output)
  forwarder.flush()
}

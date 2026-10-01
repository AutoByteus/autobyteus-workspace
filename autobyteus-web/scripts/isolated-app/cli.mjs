#!/usr/bin/env node
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createInstanceLifecycle } from './instanceLifecycle.mjs'
import { EXIT_CODES, IsolatedAppError, usageError } from './isolatedAppErrors.mjs'

const OUTPUT_SCHEMA_VERSION = 1

export const USAGE = `Usage: pnpm isolated-app <command> [options]

Commands:
  start     Start an isolated AutoByteus instance and wait until it is ready
            [--app <path>] [--from-worktree] [--build] [--control-port <n>]
            [--server-port <n>] [--data-root <path>] [--keep]
            Control and server ports default to free ports; read them from the result.
  list      List recorded isolated instances and whether they are running
  stop      Stop an instance [<instanceId>] [--keep]
  restart   Stop and start an instance again with the same settings [<instanceId>]

Output: one JSON value on stdout {schemaVersion, ok, command, result | error}.
Exit codes: 0 ok, 2 usage, 3 environment, 4 instance not found, 5 operation failure.`

function parsePort(flag, raw) {
  if (raw === undefined || !/^\d+$/.test(raw)) {
    throw usageError('USAGE_ERROR', `${flag} requires a TCP port number`)
  }
  return Number(raw)
}

/**
 * Relative paths resolve against the directory `pnpm` was invoked from (`INIT_CWD`), not the
 * repository root that `pnpm --dir` switches to.
 */
function resolveUserPath(flag, raw, env) {
  if (!raw) throw usageError('USAGE_ERROR', `${flag} requires a path`)
  if (path.isAbsolute(raw)) return raw
  if (!env.INIT_CWD) {
    throw usageError('USAGE_ERROR', `${flag} must be absolute when not run through pnpm (INIT_CWD is unset)`)
  }
  return path.resolve(env.INIT_CWD, raw)
}

export function parseArgs(argv, env = process.env) {
  const [command, ...rest] = argv
  if (!command || command === '--help' || command === '-h' || command === 'help') {
    return { command: 'help' }
  }
  if (!['start', 'list', 'stop', 'restart'].includes(command)) {
    throw usageError('USAGE_ERROR', `Unknown command: ${command}`)
  }

  const options = {}
  const positional = []
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index]
    const allowed = (flag, commands) => {
      if (!commands.includes(command)) throw usageError('USAGE_ERROR', `${flag} is not valid for ${command}`)
    }
    if (arg === '--app') {
      allowed(arg, ['start'])
      options.app = resolveUserPath(arg, rest[++index], env)
    } else if (arg === '--from-worktree') {
      allowed(arg, ['start'])
      options.fromWorktree = true
    } else if (arg === '--build') {
      allowed(arg, ['start'])
      options.build = true
    } else if (arg === '--control-port') {
      allowed(arg, ['start'])
      options.controlPort = parsePort(arg, rest[++index])
    } else if (arg === '--server-port') {
      allowed(arg, ['start'])
      options.serverPort = parsePort(arg, rest[++index])
    } else if (arg === '--data-root') {
      allowed(arg, ['start'])
      options.dataRoot = resolveUserPath(arg, rest[++index], env)
    } else if (arg === '--keep') {
      allowed(arg, ['start', 'stop'])
      options.keep = true
    } else if (arg.startsWith('-')) {
      throw usageError('USAGE_ERROR', `Unknown option: ${arg}`)
    } else {
      positional.push(arg)
    }
  }

  const acceptsId = command === 'stop' || command === 'restart'
  if (positional.length > (acceptsId ? 1 : 0)) {
    throw usageError('USAGE_ERROR', `Unexpected argument: ${positional[acceptsId ? 1 : 0]}`)
  }
  if (acceptsId && positional[0]) options.instanceId = positional[0]
  return { command, options }
}

function toErrorPayload(error) {
  if (error instanceof IsolatedAppError) {
    return {
      exitCode: EXIT_CODES[error.category] ?? EXIT_CODES.operation,
      error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
    }
  }
  return {
    exitCode: EXIT_CODES.operation,
    error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : String(error) },
  }
}

export async function runCli(argv, {
  env = process.env,
  createLifecycle = createInstanceLifecycle,
  write = (text) => process.stdout.write(text),
} = {}) {
  let command = argv[0] ?? 'help'
  let payload
  let exitCode = EXIT_CODES.ok
  try {
    const parsed = parseArgs(argv, env)
    command = parsed.command
    if (command === 'help') {
      write(`${USAGE}\n`)
      return EXIT_CODES.ok
    }
    const lifecycle = createLifecycle()
    const result = await lifecycle[command](parsed.options)
    payload = { schemaVersion: OUTPUT_SCHEMA_VERSION, ok: true, command, result }
  } catch (error) {
    const failure = toErrorPayload(error)
    exitCode = failure.exitCode
    payload = { schemaVersion: OUTPUT_SCHEMA_VERSION, ok: false, command, error: failure.error }
  }
  write(`${JSON.stringify(payload, null, 2)}\n`)
  return exitCode
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  runCli(process.argv.slice(2)).then((exitCode) => {
    process.exitCode = exitCode
  })
}

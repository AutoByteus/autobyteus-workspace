import { execFile, spawn } from 'node:child_process'
import fs from 'node:fs'
import { isPosixProcessGroupAbsent } from '../electron-launch/processGroupControl.mjs'

/** Command-line switch that marks a desktop process as a specific isolated instance. */
export const INSTANCE_MARKER_SWITCH = '--autobyteus-isolated-instance'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Desktop arguments for an isolated instance: loopback CDP control port, no throttling while the
 * window is covered (recordings keep receiving frames), and the identity marker.
 */
export function buildInstanceArgs({ instanceId, controlPort }) {
  return [
    `--remote-debugging-port=${controlPort}`,
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    `${INSTANCE_MARKER_SWITCH}=${instanceId}`,
  ]
}

/**
 * Start the desktop app detached as its own process group; output goes to `logPath`.
 * Returns the group id (the leader pid).
 */
export async function spawnDetachedInstance({
  executablePath,
  args,
  env,
  logPath,
  spawnProcess = spawn,
}) {
  const logFd = fs.openSync(logPath, 'a', 0o600)
  try {
    const child = spawnProcess(executablePath, args, {
      env,
      detached: true,
      stdio: ['ignore', logFd, logFd],
    })
    await new Promise((resolve, reject) => {
      child.once('spawn', resolve)
      child.once('error', reject)
    })
    child.unref()
    return child.pid
  } finally {
    fs.closeSync(logFd)
  }
}

export function readProcessCommand(pid) {
  return new Promise((resolve) => {
    execFile('ps', ['-o', 'command=', '-p', String(pid)], { timeout: 5000 }, (error, stdout) => {
      resolve(error ? null : stdout.trim() || null)
    })
  })
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error.code === 'EPERM'
  }
}

/**
 * Identity guard applied before any signal: the recorded process group still belongs to this
 * instance. While the group leader lives it must carry this instance's marker (a reused PID would
 * not). A live group whose leader has exited still belongs to us, because a PID cannot be reused
 * while it is still a process-group id.
 */
export async function isRecordedInstanceRunning(record, {
  isGroupAbsent = isPosixProcessGroupAbsent,
  isLeaderAlive = isProcessAlive,
  readCommand = readProcessCommand,
} = {}) {
  if (isGroupAbsent(record.pid)) return false
  if (!isLeaderAlive(record.pid)) return true
  const command = await readCommand(record.pid)
  return Boolean(command && command.includes(`${INSTANCE_MARKER_SWITCH}=${record.id}`))
}

async function fetchJson(fetchImpl, url) {
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(2000) })
  if (!response.ok) throw new Error(`${url} returned ${response.status}`)
  return response.json()
}

/**
 * Readiness: process group alive → backend health 200 → CDP lists the renderer main page.
 */
export async function waitForInstanceReady({
  pid,
  serverPort,
  controlPort,
  timeoutMs = 120_000,
  pollMs = 250,
  fetchImpl = fetch,
  isGroupAbsent = isPosixProcessGroupAbsent,
}) {
  const deadline = Date.now() + timeoutMs
  let lastState = 'waiting for process'
  while (Date.now() < deadline) {
    if (isGroupAbsent(pid)) {
      return { ready: false, reason: 'exited', lastState }
    }
    try {
      const health = await fetchImpl(`http://127.0.0.1:${serverPort}/rest/health`, {
        signal: AbortSignal.timeout(2000),
      })
      if (!health.ok) {
        lastState = `backend health returned ${health.status}`
      } else {
        const targets = await fetchJson(fetchImpl, `http://127.0.0.1:${controlPort}/json/list`)
        const mainPage = Array.isArray(targets)
          ? targets.find((target) => target.type === 'page' && String(target.url).includes('/renderer/index.html'))
          : null
        if (mainPage) return { ready: true, mainPage }
        lastState = 'backend ready; waiting for the main window on the control port'
      }
    } catch (error) {
      lastState = error instanceof Error ? error.message : String(error)
    }
    await delay(pollMs)
  }
  return { ready: false, reason: 'timeout', lastState }
}

export function readLogTail(logPath, lineCount = 40) {
  try {
    const lines = fs.readFileSync(logPath, 'utf8').split(/\r?\n/)
    return lines.slice(Math.max(0, lines.length - lineCount - 1)).join('\n').trim()
  } catch {
    return ''
  }
}

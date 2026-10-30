// Starting, probing and stopping one server process. Used by the two owners of server processes:
// ServerSupervisor (the node's server) and SelfCheck (a candidate on loopback). Holds no policy.
import { spawn } from 'node:child_process'
import net from 'node:net'
import { constants as osConstants } from 'node:os'
import path from 'node:path'

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** The exit code that reports how a server ended: its own code, or 128 + the signal number. */
export function exitCodeOf({ code, signal }) {
  if (code !== null && code !== undefined) return code
  return 128 + (osConstants.signals[signal] ?? 0)
}

/**
 * Spawns `node <package>/dist/app.js --host --port --data-dir` (C4) in its own process group, its
 * working directory the package. Resolves once spawned: { process, exited } where `exited` resolves
 * with { code, signal } after the server exits and its group is killed.
 */
export async function spawnServer({ packageDir, host, port, dataDir, env, stdio = 'inherit', log }) {
  const child = spawn(process.execPath, [
    path.join(packageDir, 'dist', 'app.js'), '--host', host, '--port', String(port), '--data-dir', dataDir,
  ], { cwd: packageDir, detached: true, stdio, env })
  const exited = new Promise((resolve) => {
    child.once('exit', (code, signal) => {
      killGroup(child.pid, log)
      resolve({ code, signal })
    })
  })
  await new Promise((resolve, reject) => {
    child.once('spawn', resolve)
    child.once('error', reject)
  })
  return { process: child, exited }
}

/** SIGTERM, then after `stopMs` SIGKILL of the process group. Resolves { forced } after the exit. */
export async function stopServer({ process: child, exited }, stopMs, log) {
  child.kill('SIGTERM')
  let timer
  const limit = new Promise((resolve) => { timer = setTimeout(() => resolve('limit'), stopMs) })
  const outcome = await Promise.race([exited.then(() => 'exited'), limit])
  clearTimeout(timer)
  if (outcome === 'limit') {
    log('server-stop-timeout', { pid: child.pid, limitMs: stopMs })
    killGroup(child.pid, log)
    await exited
  }
  return { forced: outcome === 'limit' }
}

export function killGroup(pid, log) {
  try {
    process.kill(-pid, 'SIGKILL')
  } catch (error) {
    if (error.code !== 'ESRCH') log('server-group-kill-failed', { pid, error: error.code })
  }
}

/** Whether `GET /rest/health` answers 200 within `timeoutMs`; false as soon as `exited` settles. */
export async function waitForHealth(port, timeoutMs, exited) {
  let gone = false
  exited.then(() => { gone = true })
  const deadline = Date.now() + timeoutMs
  while (!gone && Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/rest/health`, { signal: AbortSignal.timeout(3_000) })
      if (response.status === 200) return true
    } catch {
      // not listening yet
    }
    await sleep(500)
  }
  return false
}

export function portInUse(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port })
    socket.once('connect', () => { socket.destroy(); resolve(true) })
    socket.once('error', () => resolve(false))
  })
}

/** A TCP port on 127.0.0.1 that is free now. */
export function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
  })
}

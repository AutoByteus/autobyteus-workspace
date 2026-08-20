import { execFile } from 'node:child_process'
import net from 'node:net'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function execFileResult(command, args) {
  return new Promise((resolve) => {
    execFile(command, args, (error, stdout) => resolve({ error, stdout }))
  })
}

async function descendantPids(rootPid) {
  if (process.platform === 'win32') return []
  const { error, stdout } = await execFileResult('ps', ['-axo', 'pid=,ppid='])
  if (error) return []
  const children = new Map()
  for (const line of stdout.split(/\r?\n/)) {
    const [pidText, parentText] = line.trim().split(/\s+/)
    const pid = Number(pidText)
    const parent = Number(parentText)
    if (!Number.isInteger(pid) || !Number.isInteger(parent)) continue
    const existing = children.get(parent) ?? []
    existing.push(pid)
    children.set(parent, existing)
  }
  const ordered = []
  const visit = (pid) => {
    for (const child of children.get(pid) ?? []) visit(child)
    if (pid !== rootPid) ordered.push(pid)
  }
  visit(rootPid)
  return ordered
}

export async function terminateOwnedProcessTree(pid, force = false) {
  if (!Number.isInteger(pid) || pid <= 0) return
  if (process.platform === 'win32') {
    await execFileResult('taskkill', [
      '/pid', String(pid), '/t', ...(force ? ['/f'] : []),
    ])
    return
  }
  const signal = force ? 'SIGKILL' : 'SIGTERM'
  for (const targetPid of [...await descendantPids(pid), pid]) {
    try {
      process.kill(targetPid, signal)
    } catch (error) {
      if (error.code !== 'ESRCH') throw error
    }
  }
}

async function waitForPortRelease(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  let lastError = null
  while (Date.now() < deadline) {
    try {
      await new Promise((resolve, reject) => {
        const server = net.createServer()
        server.once('error', reject)
        server.listen({ host: '0.0.0.0', port, exclusive: true }, () => {
          server.close((error) => error ? reject(error) : resolve())
        })
      })
      return
    } catch (error) {
      lastError = error
      await delay(100)
    }
  }
  throw new Error(`E2E listener port ${port} was not released: ${lastError?.message ?? 'timeout'}`)
}

export function createElectronE2ESession(prepared, processController) {
  let cleanupPromise = null
  const waitUntilReady = async (timeoutMs = 120_000) => {
    const deadline = Date.now() + timeoutMs
    let lastError = null
    while (Date.now() < deadline) {
      if (!processController.isRunning()) {
        throw new Error(`Electron E2E process exited before readiness${processController.outputSummary?.() ?? ''}`)
      }
      try {
        const response = await fetch(prepared.healthUrl, { signal: AbortSignal.timeout(2000) })
        if (response.ok) return prepared.metadata
        lastError = new Error(`health returned ${response.status}`)
      } catch (error) {
        lastError = error
      }
      await delay(250)
    }
    throw new Error(`Electron E2E readiness timed out: ${lastError?.message ?? 'unknown error'}`)
  }

  const cleanup = () => {
    if (cleanupPromise) return cleanupPromise
    cleanupPromise = (async () => {
      let safeToDisposeRoot = false
      try {
        try {
          await processController.closeGracefully()
        } catch {
          // The targeted fallback below remains authoritative when graceful close fails.
        }
        const exited = await processController.waitForExit(5000)
        if (!exited && processController.pid) {
          await terminateOwnedProcessTree(processController.pid, true)
          const forcedExit = await processController.waitForExit(3000)
          if (!forcedExit && processController.isRunning()) {
            throw new Error(`Owned Electron process tree ${processController.pid} did not exit`)
          }
        }
        await waitForPortRelease(prepared.port, 5000)
        safeToDisposeRoot = true
      } finally {
        if (safeToDisposeRoot) {
          await prepared.disposeOwnedDataRoot()
        }
      }
    })()
    return cleanupPromise
  }

  return Object.freeze({
    metadata: prepared.metadata,
    processController,
    waitUntilReady,
    cleanup,
  })
}

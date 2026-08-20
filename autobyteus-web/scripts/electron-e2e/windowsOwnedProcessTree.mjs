import { execFile } from 'node:child_process'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function execFileOutput(command, args) {
  return new Promise((resolve, reject) => {
    execFile(command, args, {
      maxBuffer: 4 * 1024 * 1024,
      timeout: 5000,
    }, (error, stdout, stderr) => {
      if (error) {
        error.message = `${error.message}${stderr ? `: ${stderr.trim()}` : ''}`
        reject(error)
      } else {
        resolve(stdout)
      }
    })
  })
}

async function listWindowsProcesses() {
  const script = [
    'Get-CimInstance Win32_Process',
    '| Select-Object ProcessId,ParentProcessId,CreationDate',
    '| ConvertTo-Json -Compress',
  ].join(' ')
  const stdout = await execFileOutput(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', script],
  )
  const trimmed = stdout.trim()
  if (!trimmed) return []
  const parsed = JSON.parse(trimmed)
  return (Array.isArray(parsed) ? parsed : [parsed]).map((entry) => ({
    pid: Number(entry.ProcessId),
    parentPid: Number(entry.ParentProcessId),
    createdAt: String(entry.CreationDate ?? ''),
  })).filter((entry) => (
    Number.isInteger(entry.pid) && entry.pid > 0 && entry.createdAt.length > 0
  ))
}

async function terminateWindowsProcessTree(pid, force) {
  await execFileOutput('taskkill', [
    '/pid', String(pid), '/t', ...(force ? ['/f'] : []),
  ])
}

function createUnconfirmedHistoryError(rootPid, reason) {
  const error = new Error(
    `Windows process-tree history for root PID ${rootPid} is incomplete: ${reason}`,
  )
  error.code = 'ELECTRON_E2E_WINDOWS_TREE_HISTORY_UNCONFIRMED'
  return error
}

export async function createWindowsOwnedProcessTree(rootPid, dependencies = {}) {
  const getProcessSnapshot = dependencies.listProcesses ?? listWindowsProcesses
  const terminateProcessTree = dependencies.terminateProcessTree
    ?? terminateWindowsProcessTree
  const wait = dependencies.delay ?? delay
  const now = dependencies.now ?? Date.now
  const captureTimeoutMs = dependencies.captureTimeoutMs ?? 2000
  const tracked = new Map()
  let rootCreatedAt = null
  let rootTreeShutdownTargeted = false
  let historyError = null

  // Snapshot ancestry is safe only while every captured creation identity is
  // still qualified. A successful /t command against the exact root seals that
  // gap; otherwise any captured-identity loss makes completion fail closed.
  const refresh = async (requireRoot = false) => {
    const processes = await getProcessSnapshot()
    const byPid = new Map(processes.map((entry) => [entry.pid, entry]))
    if (tracked.size === 0) {
      const root = byPid.get(rootPid)
      if (!root) {
        if (requireRoot) throw new Error(`Cannot capture Windows process tree root PID ${rootPid}`)
        return
      }
      tracked.set(root.pid, root.createdAt)
      rootCreatedAt = root.createdAt
    }

    const trackedAlive = new Set()
    for (const [pid, createdAt] of tracked) {
      if (byPid.get(pid)?.createdAt === createdAt) trackedAlive.add(pid)
    }
    let changed = true
    while (changed) {
      changed = false
      for (const entry of processes) {
        if (!trackedAlive.has(entry.parentPid) || tracked.has(entry.pid)) continue
        tracked.set(entry.pid, entry.createdAt)
        trackedAlive.add(entry.pid)
        changed = true
      }
    }

    if (!trackedAlive.has(rootPid) && !rootTreeShutdownTargeted && !historyError) {
      historyError = createUnconfirmedHistoryError(
        rootPid,
        'the captured root disappeared before a creation-qualified tree shutdown completed',
      )
    }

    if (!rootTreeShutdownTargeted) {
      const deadTrackedPids = new Set(
        [...tracked.keys()].filter((pid) => !trackedAlive.has(pid)),
      )
      const disappearedTrackedPid = deadTrackedPids.values().next().value
      if (disappearedTrackedPid && !historyError) {
        historyError = createUnconfirmedHistoryError(
          rootPid,
          `captured PID ${disappearedTrackedPid} disappeared before qualified tree shutdown`,
        )
      }
    }

    return { processes, byPid, trackedAlive }
  }

  let captureError = null
  const deadline = now() + captureTimeoutMs
  while (tracked.size === 0 && now() < deadline) {
    try {
      await refresh(true)
    } catch (error) {
      captureError = error
      await wait(100)
    }
  }
  if (tracked.size === 0) {
    throw captureError ?? new Error(`Cannot capture Windows process tree root PID ${rootPid}`)
  }

  const matchingProcesses = async () => {
    const { byPid } = await refresh()
    return [...tracked].filter(([pid, createdAt]) => byPid.get(pid)?.createdAt === createdAt)
      .map(([pid]) => byPid.get(pid))
  }
  const terminate = async (force) => {
    const processes = await matchingProcesses()
    const ownedPids = new Set(processes.map((entry) => entry.pid))
    const topLevelProcesses = processes.filter((entry) => !ownedPids.has(entry.parentPid))
    for (const entry of topLevelProcesses) {
      try {
        const { byPid } = await refresh()
        if (byPid.get(entry.pid)?.createdAt !== entry.createdAt) {
          if (!historyError) {
            historyError = createUnconfirmedHistoryError(
              rootPid,
              `PID ${entry.pid} changed creation identity before targeted shutdown`,
            )
          }
          continue
        }
        await terminateProcessTree(entry.pid, force)
        if (entry.pid === rootPid && entry.createdAt === rootCreatedAt) {
          rootTreeShutdownTargeted = true
        }
      } catch {
        // Verification below, not taskkill's exit code, determines completion.
      }
    }
  }

  return Object.freeze({
    identity: `windows-process-tree:${rootPid}`,
    refreshOwnedTree: refresh,
    isOwnedTreeAbsent: async () => {
      const matches = await matchingProcesses()
      if (matches.length > 0) return false
      if (historyError) throw historyError
      return true
    },
    requestDefaultGracefulClose: () => terminate(false),
    forceOwnedTree: () => terminate(true),
  })
}

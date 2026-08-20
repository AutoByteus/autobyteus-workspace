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
  })).filter((entry) => Number.isInteger(entry.pid) && entry.pid > 0)
}

export async function createWindowsOwnedProcessTree(rootPid) {
  const tracked = new Map()

  const refresh = async (requireRoot = false) => {
    const processes = await listWindowsProcesses()
    const byPid = new Map(processes.map((entry) => [entry.pid, entry]))
    if (tracked.size === 0) {
      const root = byPid.get(rootPid)
      if (!root) {
        if (requireRoot) throw new Error(`Cannot capture Windows process tree root PID ${rootPid}`)
        return
      }
      tracked.set(root.pid, root.createdAt)
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
  }

  let captureError = null
  const deadline = Date.now() + 2000
  while (tracked.size === 0 && Date.now() < deadline) {
    try {
      await refresh(true)
    } catch (error) {
      captureError = error
      await delay(100)
    }
  }
  if (tracked.size === 0) {
    throw captureError ?? new Error(`Cannot capture Windows process tree root PID ${rootPid}`)
  }

  const matchingProcesses = async () => {
    const processes = await listWindowsProcesses()
    const byPid = new Map(processes.map((entry) => [entry.pid, entry]))
    return [...tracked].filter(([pid, createdAt]) => byPid.get(pid)?.createdAt === createdAt)
      .map(([pid]) => byPid.get(pid))
  }
  const terminate = async (force) => {
    await refresh()
    const processes = await matchingProcesses()
    const ownedPids = new Set(processes.map((entry) => entry.pid))
    const topLevelProcesses = processes.filter((entry) => !ownedPids.has(entry.parentPid))
    for (const entry of topLevelProcesses) {
      try {
        await execFileOutput('taskkill', [
          '/pid', String(entry.pid), '/t', ...(force ? ['/f'] : []),
        ])
      } catch {
        // Verification below, not taskkill's exit code, determines completion.
      }
    }
  }

  return Object.freeze({
    identity: `windows-process-tree:${rootPid}`,
    refreshOwnedTree: refresh,
    isOwnedTreeAbsent: async () => (await matchingProcesses()).length === 0,
    requestDefaultGracefulClose: () => terminate(false),
    forceOwnedTree: () => terminate(true),
  })
}

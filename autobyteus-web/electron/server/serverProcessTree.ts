import { execFile } from 'child_process'

/**
 * Desktop copy of the server's process-tree selection (`autobyteus-server-ts/src/utils/process-tree.ts`;
 * Electron main cannot import server code). macOS/Linux only. The table is read asynchronously so
 * Electron main is not blocked during quit. Used only by `BaseServerManager.forceStop`.
 */

const PS_TIMEOUT_MS = 2000
/** How long recorded descendants get to end after SIGTERM before they are SIGKILLed. */
export const PROCESS_TREE_GRACE_MS = 1500
const POLL_INTERVAL_MS = 50

export type ProcessRow = Readonly<{ pid: number; ppid: number; pgid: number }>
/** `process.kill` shape: a positive target is a pid, a negative one a process group. */
export type KillTarget = (target: number, signal: NodeJS.Signals | 0) => void

export const parseProcessTable = (output: string): ProcessRow[] => output.split('\n').flatMap(line => {
  const fields = line.trim().split(/\s+/).map(Number)
  if (fields.length !== 3 || fields.some(value => !Number.isInteger(value) || value < 0)) return []
  const [pid, ppid, pgid] = fields as [number, number, number]
  return [{ pid, ppid, pgid }]
})

export const readProcessTable = (): Promise<ProcessRow[]> => new Promise((resolve, reject) => {
  execFile('ps', ['-A', '-o', 'pid=,ppid=,pgid='], { encoding: 'utf8', timeout: PS_TIMEOUT_MS, maxBuffer: 8 * 1024 * 1024 },
    (error, stdout) => error ? reject(error) : resolve(parseProcessTable(stdout)))
})

/**
 * The server's descendant targets, recorded before any signal: descendants in the server's own group
 * (by pid) and groups led by a descendant (by -pgid). Never the server, its group or anything else
 * in that group (Electron itself shares it).
 */
export const selectServerTreeTargets = (rows: readonly ProcessRow[], serverPid: number): number[] => {
  const serverPgid = rows.find(row => row.pid === serverPid)?.pgid
  if (serverPgid === undefined) return []
  const children = new Map<number, ProcessRow[]>()
  for (const row of rows) {
    if (row.pid === row.ppid) continue
    const siblings = children.get(row.ppid)
    if (siblings) siblings.push(row)
    else children.set(row.ppid, [row])
  }
  const descendants: ProcessRow[] = []
  const seen = new Set<number>([serverPid])
  const queue = [serverPid]
  while (queue.length) {
    for (const child of children.get(queue.shift()!) ?? []) {
      if (seen.has(child.pid)) continue
      seen.add(child.pid)
      descendants.push(child)
      queue.push(child.pid)
    }
  }
  const descendantPids = new Set(descendants.map(row => row.pid))
  const groups = [...new Set(descendants.map(row => row.pgid))]
    .filter(pgid => pgid > 1 && pgid !== serverPgid && descendantPids.has(pgid))
  return [...descendants.filter(row => row.pgid === serverPgid).map(row => row.pid), ...groups.map(pgid => -pgid)]
}

/** Signals each recorded target; a target already gone (ESRCH) is skipped. Returns the other failures. */
export const signalTargets = (targets: readonly number[], signal: NodeJS.Signals, kill: KillTarget): unknown[] => {
  const errors: unknown[] = []
  for (const target of targets) {
    try { kill(target, signal) }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') errors.push(error) }
  }
  return errors
}

/** Polls the recorded targets until all are gone or the window ends; returns the survivors. Only ESRCH proves absence. */
export const waitForTargetsGone = async (targets: readonly number[], windowMs: number, kill: KillTarget): Promise<number[]> => {
  const alive = (target: number) => {
    try { kill(target, 0); return true } catch (error) { return (error as NodeJS.ErrnoException).code !== 'ESRCH' }
  }
  const deadline = Date.now() + windowMs
  let remaining = targets.filter(alive)
  while (remaining.length && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
    remaining = remaining.filter(alive)
  }
  return remaining
}

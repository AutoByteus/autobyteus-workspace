import { spawnSync } from "node:child_process";
import process from "node:process";

/**
 * Process-table primitives for stopping what a process started (macOS/Linux only; callers decide
 * what to do on Windows). Pure selection plus exact signalling; no stop policy lives here.
 */

const PS_TIMEOUT_MS = 2_000;

export type ProcessRow = Readonly<{ pid: number; ppid: number; pgid: number }>;

export const parseProcessTable = (output: string): ProcessRow[] => output.split("\n").flatMap((line) => {
  const fields = line.trim().split(/\s+/).map(Number);
  if (fields.length !== 3 || fields.some((value) => !Number.isInteger(value) || value < 0)) return [];
  const [pid, ppid, pgid] = fields as [number, number, number];
  return [{ pid, ppid, pgid }];
});

/**
 * Reads the whole process table through one bounded `ps` call. Throws when it cannot be read. The
 * `ps` reader lists itself as a child of the caller; its row is dropped, so no caller ever selects
 * (or signals) the reader as one of its own processes.
 */
export const readProcessTable = (): ProcessRow[] => {
  const result = spawnSync("ps", ["-A", "-o", "pid=,ppid=,pgid="], {
    encoding: "utf8", timeout: PS_TIMEOUT_MS, stdio: ["ignore", "pipe", "ignore"],
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`ps exited with ${result.status ?? result.signal}`);
  return parseProcessTable(result.stdout).filter((row) => row.pid !== result.pid);
};

const selectDescendants = (rows: readonly ProcessRow[], rootPid: number): ProcessRow[] => {
  const children = new Map<number, ProcessRow[]>();
  for (const row of rows) {
    if (row.pid === row.ppid) continue;
    const siblings = children.get(row.ppid);
    if (siblings) siblings.push(row);
    else children.set(row.ppid, [row]);
  }
  const descendants: ProcessRow[] = [];
  const seen = new Set<number>([rootPid]);
  const queue = [rootPid];
  while (queue.length) {
    for (const child of children.get(queue.shift()!) ?? []) {
      if (seen.has(child.pid)) continue;
      seen.add(child.pid);
      descendants.push(child);
      queue.push(child.pid);
    }
  }
  return descendants;
};

/**
 * Selects the process groups led by a live descendant of `rootPid`, excluding `excludedPgids` and
 * pgid <= 1. Requiring the group leader to descend from the root prevents signalling any group the
 * root's tree did not create.
 */
export const selectDescendantProcessGroups = (
  rows: readonly ProcessRow[],
  rootPid: number,
  excludedPgids: readonly number[],
): number[] => {
  const descendants = selectDescendants(rows, rootPid);
  const descendantPids = new Set(descendants.map((row) => row.pid));
  const excluded = new Set(excludedPgids);
  return [...new Set(descendants.map((row) => row.pgid))].filter((pgid) =>
    pgid > 1 && !excluded.has(pgid) && descendantPids.has(pgid));
};

/** Selects the descendants of `rootPid` that are members of group `pgid` (never `rootPid` itself). */
export const selectDescendantPidsInGroup = (
  rows: readonly ProcessRow[],
  rootPid: number,
  pgid: number,
): number[] => selectDescendants(rows, rootPid).filter((row) => row.pgid === pgid).map((row) => row.pid);

/** Signals each exact captured group independently; only ESRCH proves absence. */
export const signalProcessGroups = (pgids: readonly number[], signal: NodeJS.Signals): void => {
  const errors: unknown[] = [];
  for (const pgid of pgids) {
    try { process.kill(-pgid, signal); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ESRCH") errors.push(error);
    }
  }
  if (errors.length) throw new AggregateError(errors, "Exact process-group signal failed.");
};

/** Exact captured groups only. ESRCH is proof of absence; permission failure is not. */
export const processGroupsInactive = (pgids: readonly number[]): boolean => {
  let inactive = true;
  for (const pgid of pgids) {
    try { process.kill(-pgid, 0); inactive = false; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error; }
  }
  return inactive;
};

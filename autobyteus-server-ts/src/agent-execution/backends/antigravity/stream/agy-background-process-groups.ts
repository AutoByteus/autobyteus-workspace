import { execFileSync } from "node:child_process";
import process from "node:process";

/**
 * AGY runs each background command (e.g. a daemon started with `IsDaemon`) in its own session/process
 * group under the AGY process. Those groups survive a SIGTERM of AGY, so the AGY process owner stops
 * them explicitly while AGY is still alive. Private to the AGY stream folder.
 */

const PS_TIMEOUT_MS = 2_000;

type ProcessRow = Readonly<{ pid: number; ppid: number; pgid: number }>;

export const parseProcessTable = (output: string): ProcessRow[] => output.split("\n").flatMap((line) => {
  const fields = line.trim().split(/\s+/).map(Number);
  if (fields.length !== 3 || fields.some((value) => !Number.isInteger(value) || value < 0)) return [];
  const [pid, ppid, pgid] = fields as [number, number, number];
  return [{ pid, ppid, pgid }];
});

/**
 * Selects the process groups led by a live descendant of AGY, excluding AGY's own group, this server's
 * group, and pgid <= 1. Requiring the group leader to descend from AGY prevents signalling any group
 * that AGY did not create.
 */
export const selectAgyBackgroundProcessGroups = (
  rows: readonly ProcessRow[],
  agyPid: number,
  serverPid: number,
): number[] => {
  const agyPgid = rows.find((row) => row.pid === agyPid)?.pgid;
  const serverPgid = rows.find((row) => row.pid === serverPid)?.pgid;
  const children = new Map<number, ProcessRow[]>();
  for (const row of rows) {
    if (row.pid === row.ppid) continue;
    const siblings = children.get(row.ppid);
    if (siblings) siblings.push(row);
    else children.set(row.ppid, [row]);
  }
  const descendants: ProcessRow[] = [];
  const seen = new Set<number>([agyPid]);
  const queue = [agyPid];
  while (queue.length) {
    for (const child of children.get(queue.shift()!) ?? []) {
      if (seen.has(child.pid)) continue;
      seen.add(child.pid);
      descendants.push(child);
      queue.push(child.pid);
    }
  }
  const descendantPids = new Set(descendants.map((row) => row.pid));
  return [...new Set(descendants.map((row) => row.pgid))].filter((pgid) =>
    pgid > 1 && pgid !== agyPgid && pgid !== serverPgid && descendantPids.has(pgid));
};

/** Lists AGY's background process groups on macOS/Linux; Windows is not covered. */
export const listAgyBackgroundProcessGroups = (agyPid: number, serverPid = process.pid): number[] => {
  if (process.platform === "win32") return [];
  const output = execFileSync("ps", ["-A", "-o", "pid=,ppid=,pgid="], {
    encoding: "utf8", timeout: PS_TIMEOUT_MS, stdio: ["ignore", "pipe", "ignore"],
  });
  return selectAgyBackgroundProcessGroups(parseProcessTable(output), agyPid, serverPid);
};

/** Signals each exact captured group independently; only ESRCH proves absence. */
export const signalProcessGroups = (pgids: readonly number[], signal: NodeJS.Signals): void => {
  const errors: unknown[] = [];
  for (const pgid of pgids) {
    try { process.kill(-pgid, signal); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ESRCH") errors.push(error);
    }
  }
  if (errors.length) throw new AggregateError(errors, "Exact AGY process-group signal failed.");
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

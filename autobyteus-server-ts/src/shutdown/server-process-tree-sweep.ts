import {
  readProcessTable, selectDescendantPidsInGroup, selectDescendantProcessGroups, type ProcessRow,
} from "../utils/process-tree.js";

/**
 * One sweep of what this server process started and is still running: runtime CLIs, their tool
 * commands, AGY daemons and native command groups their owner could not confirm stopped. Holds no
 * shutdown policy; `ServerProcessShutdown` decides what each outcome means for the exit code.
 *
 * Targets are recorded once, before any signal: descendants in the server's own process group (by
 * pid) and groups led by a descendant (by -pgid). The server's own group is never signalled, and
 * nothing is selected by port. Re-listing after SIGTERM would let re-parented processes escape.
 */
export type ProcessTreeSweepResult =
  | Readonly<{ outcome: "not-applicable" }>
  | Readonly<{ outcome: "confirmed"; targets: number }>
  | Readonly<{ outcome: "unconfirmed"; targets: number; reason: string }>;

export type ProcessTreeSweepDeps = Readonly<{
  platform: NodeJS.Platform;
  rootPid: number;
  readTable: () => ProcessRow[];
  /** `process.kill` shape: a positive target is a pid, a negative one a process group. */
  kill: (target: number, signal: NodeJS.Signals | 0) => void;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  log: (message: string) => void;
}>;

export const PROCESS_TREE_GRACE_MS = 1_500;
const KILL_CONFIRMATION_MS = 500;
const POLL_INTERVAL_MS = 50;

const defaultDeps: ProcessTreeSweepDeps = {
  platform: process.platform,
  rootPid: process.pid,
  readTable: readProcessTable,
  kill: (target, signal) => { process.kill(target, signal); },
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  log: (message) => console.warn(message),
};

const errorCode = (error: unknown): string | undefined => (error as NodeJS.ErrnoException | null)?.code;
const describeTarget = (target: number): string => target < 0 ? `group ${-target}` : `pid ${target}`;

export async function terminateServerProcessTree(
  overrides: Partial<ProcessTreeSweepDeps> = {},
): Promise<ProcessTreeSweepResult> {
  const deps: ProcessTreeSweepDeps = { ...defaultDeps, ...overrides };
  // Windows has no `ps` and no POSIX signals; the desktop's `taskkill /f /t` covers its forced path.
  if (deps.platform === "win32") return { outcome: "not-applicable" };

  let rows: ProcessRow[];
  try { rows = deps.readTable(); }
  catch (error) {
    deps.log(`Server process-tree sweep could not read the process table: ${String(error)}`);
    return { outcome: "unconfirmed", targets: 0, reason: `process table unreadable: ${String(error)}` };
  }
  const rootPgid = rows.find((row) => row.pid === deps.rootPid)?.pgid;
  if (rootPgid === undefined) {
    return { outcome: "unconfirmed", targets: 0, reason: `server pid ${deps.rootPid} missing from the process table` };
  }
  const pids = selectDescendantPidsInGroup(rows, deps.rootPid, rootPgid);
  const groups = selectDescendantProcessGroups(rows, deps.rootPid, [rootPgid]);
  const targets = [...pids, ...groups.map((pgid) => -pgid)];
  if (!targets.length) return { outcome: "confirmed", targets: 0 };

  deps.log(`Server process-tree sweep: ${pids.length} process(es) and ${groups.length} process group(s) still running; sending SIGTERM.`);
  const signal = (signalled: readonly number[], name: NodeJS.Signals) => {
    for (const target of signalled) {
      try { deps.kill(target, name); } catch (error) {
        if (errorCode(error) !== "ESRCH") deps.log(`Server process-tree sweep could not ${name} ${describeTarget(target)}: ${String(error)}`);
      }
    }
  };
  // Only ESRCH proves absence; EPERM means the target exists but cannot be signalled.
  const alive = (target: number) => {
    try { deps.kill(target, 0); return true; } catch (error) { return errorCode(error) !== "ESRCH"; }
  };
  const waitForExit = async (pending: readonly number[], windowMs: number): Promise<number[]> => {
    const deadline = deps.now() + windowMs;
    let remaining = pending.filter(alive);
    while (remaining.length && deps.now() < deadline) {
      await deps.sleep(POLL_INTERVAL_MS);
      remaining = remaining.filter(alive);
    }
    return remaining;
  };

  signal(targets, "SIGTERM");
  let survivors = await waitForExit(targets, PROCESS_TREE_GRACE_MS);
  if (survivors.length) {
    deps.log(`Server process-tree sweep: ${survivors.length} target(s) survived SIGTERM; sending SIGKILL.`);
    signal(survivors, "SIGKILL");
    survivors = await waitForExit(survivors, KILL_CONFIRMATION_MS);
  }
  if (!survivors.length) return { outcome: "confirmed", targets: targets.length };
  return {
    outcome: "unconfirmed",
    targets: targets.length,
    reason: `still alive after SIGKILL: ${survivors.map(describeTarget).join(", ")}`,
  };
}

import type { AgentRun } from "../domain/agent-run.js";
import type { AgentRunManager } from "./agent-run-manager.js";

type LiveRuns = Pick<AgentRunManager, "listActiveRuns" | "getActiveRun">;
type Observation = "running" | "none" | "unknown";
export type BackgroundWorkInspection = ReadonlyMap<AgentRun, Observation>;
export type BusyRunCount = Readonly<{ busy: number; unknown: number }>;
export const BUSY_RUN_OBSERVATION_BUDGET_MS = 6_000;

export function busyStatusOf(run: AgentRun) {
  const status = run.getStatusSnapshot().status;
  const backgroundTasks = run.hasRunningBackgroundTasks();
  return { status, backgroundTasks, busy: status === "initializing" || status === "running" || backgroundTasks };
}

/** Missing observations (including timeout) are not evidence of idle. Never mutate the returned snapshot later. */
export async function inspectBackgroundWork(runs: readonly AgentRun[], budgetMs: number, source: "all" | "snapshot" = "all"): Promise<BackgroundWorkInspection> {
  const observed = new Map<AgentRun, Observation>(runs.map(run => [run, "unknown"]));
  if (!runs.length) return observed;
  const inspections = Promise.all(runs.map(async run => {
    try {
      const view = await run.inspectBackgroundTasks();
      // The recorder already sampled event-stream tasks synchronously; only supplement its snapshot-only runtimes.
      if (source === "snapshot" && view.kind !== "snapshot") return;
      observed.set(run, view.kind === "unavailable" ? "unknown"
        : view.kind === "unsupported" ? "none"
        : view.tasks.some(task => task.status === "running") ? "running" : "none");
    } catch { observed.set(run, "unknown"); }
  }));
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([inspections, new Promise<void>(done => { timer = setTimeout(done, budgetMs); })]);
    return new Map(observed);
  } finally { clearTimeout(timer); }
}

export function inspectBusyAgentRuns(manager: LiveRuns): Promise<BackgroundWorkInspection> {
  const inspect = manager.listActiveRuns().flatMap(id => {
    const run = manager.getActiveRun(id);
    if (!run) return [];
    try { return busyStatusOf(run).busy ? [] : [run]; } catch { return []; } // missing observation finalizes as unknown
  });
  return inspectBackgroundWork(inspect, BUSY_RUN_OBSERVATION_BUDGET_MS);
}

/** Synchronous: both scopes run this only after both inspections return. Identity, not run ID, binds the result. */
export function finalizeBusyRuns(manager: LiveRuns, inspected: BackgroundWorkInspection): BusyRunCount {
  let busy = 0, unknown = 0;
  for (const id of manager.listActiveRuns()) {
    const run = manager.getActiveRun(id);
    if (!run) { unknown++; continue; }
    try {
      const observed = inspected.get(run);
      if (busyStatusOf(run).busy || observed === "running") busy++;
      else if (observed !== "none") unknown++;
    } catch { unknown++; }
  }
  return { busy, unknown };
}

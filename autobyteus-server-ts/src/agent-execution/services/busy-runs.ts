import type { AgentRun } from "../domain/agent-run.js";

type Observation = "running" | "none" | "unknown";
export type BackgroundWorkInspection = ReadonlyMap<AgentRun, Observation>;

export function busyStatusOf(run: AgentRun) {
  const status = run.getStatusSnapshot().status;
  const backgroundTasks = run.hasRunningBackgroundTasks();
  return { status, backgroundTasks, busy: status === "initializing" || status === "running" || backgroundTasks };
}

/** Missing observations (including timeout) are not evidence of idle. Never mutate the returned snapshot later. */
export async function inspectBackgroundWork(runs: readonly AgentRun[], budgetMs: number): Promise<BackgroundWorkInspection> {
  const observed = new Map<AgentRun, Observation>(runs.map(run => [run, "unknown"]));
  if (!runs.length) return observed;
  const inspections = Promise.all(runs.map(async run => {
    try {
      const view = await run.inspectBackgroundTasks();
      // The recorder already sampled event-stream tasks synchronously; only supplement its snapshot-only runtimes.
      if (view.kind !== "snapshot") return;
      observed.set(run, view.tasks.some(task => task.status === "running") ? "running" : "none");
    } catch { observed.set(run, "unknown"); }
  }));
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([inspections, new Promise<void>(done => { timer = setTimeout(done, budgetMs); })]);
    return new Map(observed);
  } finally { clearTimeout(timer); }
}

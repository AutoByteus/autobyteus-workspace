import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { TaskAgentCoordinatingRun } from "./agent-run-metadata-types.js";

/**
 * A local delegated run of a top run whose Task entry is open (design D-1). `started` tells the store whether
 * the run must have its own file: a run whose start is pending or failed may have none, and is then left out
 * silently.
 */
export type OpenDelegatedRun = Readonly<{ run: TaskExecutionReference; started: boolean }>;

/**
 * Which local delegated runs belong to a top run's tree (design D-1, CM-8): asked of the Task side, which owns the
 * relationship. No top run stores a list of them. Synchronous, from the Task records in memory.
 */
export interface OpenDelegatedRunSource {
  /** The runs whose current Task entry names this top run and is open. Throws when the Task records are not loaded. */
  openDelegatedRunsOf(coordinatingRun: TaskAgentCoordinatingRun): readonly OpenDelegatedRun[];
}

let bound: OpenDelegatedRunSource | null = null;

/** The composition binds the loaded Task side once (`project-task-execution-resource-composition.ts`). */
export const bindOpenDelegatedRunSource = (source: OpenDelegatedRunSource): void => { bound = source; };
export const unbindOpenDelegatedRunSource = (source: OpenDelegatedRunSource): void => { if (bound === source) bound = null; };

/** The bound source; a composed tree read before the Task records are loaded is a programming error. */
export const getOpenDelegatedRunSource = (): OpenDelegatedRunSource => {
  if (!bound) throw new Error("A collaboration tree was read before the Task records were loaded.");
  return bound;
};

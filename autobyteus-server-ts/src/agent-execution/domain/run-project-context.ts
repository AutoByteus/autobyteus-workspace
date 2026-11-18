/**
 * The Project a run was started under, as the run is told it (REQ-006): its Project ID and current name. Read when the
 * run is configured (start or restore); a deleted Project yields none.
 */
export type RunProjectContext = Readonly<{ projectId: string; name: string }>;

/** A top-level run that can be started under a Project: an Agent run, or a Team run (its members share its Project). */
export type RunProjectRoot = Readonly<{ kind: "agent" | "agent_team"; runId: string }>;

/**
 * Run creation records a start through this port, once per run and before the run's own records (DS-001, DS-002).
 * Refuses an unknown Project with an error whose `code` is `PROJECT_NOT_FOUND`.
 */
export interface RunProjectStarts {
  recordStart(projectId: string, root: RunProjectRoot): Promise<void>;
}

/** Run config builders read a run's Project through this port (DS-005); null when it was not started under one. */
export interface RunProjectContextReader {
  contextOfRun(root: RunProjectRoot): Promise<RunProjectContext | null>;
}

/** Both ports, bound by `compositions/project-run-links-composition.ts` (Projects owns the record). */
export type RunProjects = RunProjectStarts & RunProjectContextReader;

let configured: RunProjects | null = null;

/** Bound once per process by the composition; `close()` releases the binding. */
export const configureRunProjects = (projects: RunProjects): Readonly<{ close(): void }> => {
  configured = projects;
  return Object.freeze({ close: () => { if (configured === projects) configured = null; } });
};

/** Records a run started under the chosen Project; without Projects composed in this process, the start is refused. */
export const recordRunProjectStart = async (projectId: string, root: RunProjectRoot): Promise<void> => {
  if (!configured) throw new Error("Projects are not available in this process; a run cannot be started under a Project.");
  await configured.recordStart(projectId, root);
};

/** The run's Project; null when it was not started under one, the Project is gone, or no Projects are composed. */
export const readRunProjectContext = async (root: RunProjectRoot): Promise<RunProjectContext | null> =>
  configured ? configured.contextOfRun(root) : null;

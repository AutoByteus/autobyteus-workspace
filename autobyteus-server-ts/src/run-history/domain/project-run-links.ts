import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";

/**
 * Which runs work for one Project, read from the Task records (the only Task ↔ run truth; REQ-003, REQ-008).
 * `projectId: null` asks for the Tasks with no Project (Temp tasks).
 */
export type ProjectRunLinkSet = Readonly<{
  /** The host roots of any assignment of the Project's Tasks, and whether each hosts open work of the Project. */
  hostRoots: readonly Readonly<{ hostRoot: RootExecutionIdentity; hasOpenWork: boolean }>[];
  /** Per host root (by `rootExecutionIdentityKey`): the copies that belong to the Project. */
  executionsByHostRoot: ReadonlyMap<string, readonly TaskExecutionReference[]>;
}>;

/** The port run history reads Project run links through (bound to Projects by `compositions/project-run-links-composition.ts`). */
export interface ProjectRunLinks {
  runLinksOf(projectId: string | null): Promise<ProjectRunLinkSet>;
}

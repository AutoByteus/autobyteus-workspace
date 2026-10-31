import type { RunProjectRoot } from "../../agent-execution/domain/run-project-context.js";

/** The port run history reads Project run links through (bound to Projects by `compositions/project-run-links-composition.ts`). */
export interface ProjectRunLinks {
  /**
   * The top-level runs started under the Project (its `project_runs.json`); refuses an unknown Project with an error
   * whose `code` is `PROJECT_NOT_FOUND`.
   */
  startedRunsOf(projectId: string): Promise<readonly RunProjectRoot[]>;
}

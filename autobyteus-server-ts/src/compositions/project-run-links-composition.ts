import type { TaskExecutionResourceService } from "../projects/services/task-execution-resource-service.js";
import { getProjectService } from "../projects/services/project-service.js";
import { ProjectRunService } from "../projects/services/project-run-service.js";
import { ProjectRunStore } from "../projects/stores/project-run-store.js";
import type { ProjectsLayout } from "../projects/stores/projects-layout.js";
import { configureProjectRunLinks } from "../run-history/services/project-run-history-service.js";
import { configureRunProjects } from "../agent-execution/domain/run-project-context.js";

/**
 * Binds the ports run history and run execution read and record Projects through (projects-left-navigation):
 * - `ProjectRunLinks`: which runs work for a Project, from the Task records the Task resource service holds in memory,
 *   and the runs started under it, from `ProjectRunService`;
 * - `RunProjectStarts` / `RunProjectContextReader`: run creation records a start; config builders read a run's Project.
 * The started-runs view is loaded here, in the Task resources' composition step, before any run is admitted or
 * restored, so a restore always finds its Project. Neither side imports Projects; `close()` releases the bindings.
 */
export const composeProjectRunLinks = async (input: Readonly<{
  taskExecutionResources: Pick<TaskExecutionResourceService, "runLinksOf">;
  projectsLayout: ProjectsLayout;
}>): Promise<Readonly<{ close(): void }>> => {
  const projectRuns = new ProjectRunService(new ProjectRunStore(input.projectsLayout), {
    getProject: (projectId) => getProjectService().getProject(projectId),
  });
  await projectRuns.load();
  const links = configureProjectRunLinks({
    runLinksOf: (projectId) => input.taskExecutionResources.runLinksOf(projectId),
    startedRunsOf: (projectId) => projectRuns.startedRunsOf(projectId),
  });
  const runProjects = configureRunProjects({
    recordStart: (projectId, root) => projectRuns.recordStart(projectId, root),
    contextOfRun: (root) => projectRuns.contextOfRun(root),
  });
  return Object.freeze({ close: () => { links.close(); runProjects.close(); } });
};

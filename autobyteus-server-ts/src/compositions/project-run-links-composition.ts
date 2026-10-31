import type { TaskExecutionResourceService } from "../projects/services/task-execution-resource-service.js";
import { getProjectService } from "../projects/services/project-service.js";
import { configureProjectRunLinks } from "../run-history/services/project-run-history-service.js";
import { configureRunProjectContextReader } from "../agent-execution/domain/run-project-context.js";

/**
 * Binds the two ports run history and run execution read Projects through: Project run links (which runs work for a
 * Project, from the Task records the Task resource service holds in memory) and the run's Project context (a Project's
 * name by ID). Neither side imports Projects; `close()` releases both bindings.
 */
export const composeProjectRunLinks = (taskExecutionResources: Pick<TaskExecutionResourceService, "runLinksOf">): Readonly<{ close(): void }> => {
  const links = configureProjectRunLinks({ runLinksOf: (projectId) => taskExecutionResources.runLinksOf(projectId) });
  const reader = configureRunProjectContextReader({
    contextOf: async (projectId) => {
      const project = await getProjectService().getProject(projectId);
      return project ? Object.freeze({ projectId: project.projectId, name: project.name }) : null;
    },
  });
  return Object.freeze({ close: () => { links.close(); reader.close(); } });
};

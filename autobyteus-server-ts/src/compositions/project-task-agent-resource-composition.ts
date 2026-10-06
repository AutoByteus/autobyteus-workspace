import path from "node:path";
import type { ActiveCollaborationRootDirectory } from "../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import type { TaskAgentResourcePort } from "../agent-collaboration/execution/task/task-agent-resource-port.js";
import { TaskAgentResourceService } from "../projects/services/task-agent-resource-service.js";
import { TaskAgentResourceStore } from "../projects/stores/task-agent-resource-store.js";
import { ProjectsLayout } from "../projects/stores/projects-layout.js";
import { AdHocTasksLayout } from "../projects/stores/ad-hoc-tasks-layout.js";
import { AdHocTaskStore } from "../projects/stores/ad-hoc-task-store.js";
import {
  initializeProjectTaskServiceProcessInstance,
  releaseProjectTaskServiceProcessInstance,
} from "../projects/services/project-task-service.js";

/**
 * The one place Projects and collaboration runtime are bound. It loads the Task agent run resource
 * view of both Task roots (`projects/` and `ad-hoc-tasks/`) once (after app-data migrations; a
 * damaged file is non-fatal), initializes the Task service process instance with an exact-root stop
 * request, and returns the neutral port roots receive.
 */
export const composeProjectTaskAgentResources = async (deps: Readonly<{
  activeRootDirectory: ActiveCollaborationRootDirectory;
  appDataDir: string;
}>): Promise<TaskAgentResourcePort> => {
  const adHocTasksLayout = new AdHocTasksLayout(path.join(deps.appDataDir, "ad-hoc-tasks"));
  const taskAgentResources = new TaskAgentResourceService(new TaskAgentResourceStore(
    new ProjectsLayout(path.join(deps.appDataDir, "projects")), adHocTasksLayout));
  await taskAgentResources.load();
  return initializeProjectTaskServiceProcessInstance({
    taskAgentResources,
    adHocTasks: new AdHocTaskStore(adHocTasksLayout),
    requestRelease: (hostRoot, agentRuns) =>
      deps.activeRootDirectory.resolve(hostRoot)?.releaseTaskAgentResources?.(agentRuns) ?? null,
  });
};

/** Host close and startup rollback release the process binding composed above. */
export const releaseProjectTaskAgentResources = (port: TaskAgentResourcePort): void => {
  releaseProjectTaskServiceProcessInstance(port);
};

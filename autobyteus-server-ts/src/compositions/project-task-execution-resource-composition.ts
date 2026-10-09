import path from "node:path";
import type { ActiveCollaborationRootDirectory } from "../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import type { TaskExecutionResourcePort } from "../agent-collaboration/execution/task/task-execution-resource-port.js";
import { TaskExecutionResourceService } from "../projects/services/task-execution-resource-service.js";
import { TaskExecutionResourceStore } from "../projects/stores/task-execution-resource-store.js";
import { ProjectsLayout } from "../projects/stores/projects-layout.js";
import { AdHocTasksLayout } from "../projects/stores/ad-hoc-tasks-layout.js";
import { AdHocTaskStore } from "../projects/stores/ad-hoc-task-store.js";
import { getProjectService } from "../projects/services/project-service.js";
import { getProjectChangePublisher } from "../projects/changes/project-change-publisher.js";
import { getProjectChangeHub } from "../projects/changes/project-change-hub.js";
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
export const composeProjectTaskExecutionResources = async (deps: Readonly<{
  activeRootDirectory: ActiveCollaborationRootDirectory;
  appDataDir: string;
}>): Promise<TaskExecutionResourcePort> => {
  const adHocTasksLayout = new AdHocTasksLayout(path.join(deps.appDataDir, "ad-hoc-tasks"));
  const taskExecutionResources = new TaskExecutionResourceService(new TaskExecutionResourceStore(
    new ProjectsLayout(path.join(deps.appDataDir, "projects")), adHocTasksLayout));
  await taskExecutionResources.load();
  const service = initializeProjectTaskServiceProcessInstance({
    taskExecutionResources,
    adHocTasks: new AdHocTaskStore(adHocTasksLayout),
    requestRelease: (hostRoot, executions) =>
      deps.activeRootDirectory.resolve(hostRoot)?.releaseTaskExecutions?.(executions) ?? null,
    // A Task root's live status comes only from its hosting root; an inactive root answers offline.
    workerStatus: (hostRoot, execution) => {
      const root = deps.activeRootDirectory.resolve(hostRoot);
      return root ? root.taskExecutionStatus?.(execution) ?? "offline" : null;
    },
  });
  // The `/ws/projects` feed: views are built from the services' committed state, after `load()`.
  getProjectChangePublisher().bind({
    readProject: (projectId) => getProjectService().getProject(projectId),
    readTask: (location) => service.readTaskChangeView(location),
    readWorkerStatus: (location) => service.workerStatusOf(location),
  }, (message) => getProjectChangeHub().broadcast(message));
  return service;
};

/** Host close and startup rollback release the process binding composed above. */
export const releaseProjectTaskExecutionResources = (port: TaskExecutionResourcePort): void => {
  getProjectChangePublisher().unbind();
  releaseProjectTaskServiceProcessInstance(port);
};

import type { TaskEntriesListener } from "../../src/agent-collaboration/execution/task/task-execution-resource-port.js";
import { TaskExecutionResourceService } from "../../src/projects/services/task-execution-resource-service.js";
import { TaskExecutionResourceStore } from "../../src/projects/stores/task-execution-resource-store.js";
import type { ProjectTaskService } from "../../src/projects/services/project-task-service.js";
import { NO_RUN_SIDE_TASK_PORTS } from "./explicit-host-collaborators.js";

type ProjectTaskDependencies = NonNullable<ConstructorParameters<typeof ProjectTaskService>[0]>;

/** A test with no delegation tree: its Task changes tell a listener that keeps none. */
const noTree: TaskEntriesListener = { entriesChanged: () => undefined };

/**
 * A Task side's run resources for a test, with its entries listener set as the composition root sets the tree
 * (autobyteus-461 SR-047: a Task change with no listener fails). A test with a tree passes it as `listener`.
 */
export const taskRunResources = (
  store = new TaskExecutionResourceStore(), now?: () => Date, listener: TaskEntriesListener = noTree,
): TaskExecutionResourceService => {
  const resources = new TaskExecutionResourceService(store, now);
  resources.setEntriesListener(listener);
  return resources;
};

type RunSidePorts = keyof typeof NO_RUN_SIDE_TASK_PORTS;

/**
 * A `ProjectTaskService`'s dependencies with its run resources over the same layouts as its stores, and the run-side
 * ports the test states, else `NO_RUN_SIDE_TASK_PORTS` (no running roots).
 */
export const withTaskRunResources = (
  deps: Omit<ProjectTaskDependencies, "taskExecutionResources" | RunSidePorts> & Partial<Pick<ProjectTaskDependencies, RunSidePorts>>,
): ProjectTaskDependencies =>
  ({ ...NO_RUN_SIDE_TASK_PORTS, ...deps, taskExecutionResources: taskRunResources(new TaskExecutionResourceStore(deps.store?.layout, deps.adHocTasks?.layout)) });

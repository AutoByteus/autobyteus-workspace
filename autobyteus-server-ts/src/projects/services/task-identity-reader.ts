import type { DelegatedTaskIdentityView } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import { AD_HOC_TASK_ID_PREFIX } from "../domain/ad-hoc-task.js";
import { ProjectError } from "../domain/project-errors.js";
import type { AdHocTaskStore } from "../stores/ad-hoc-task-store.js";
import type { TaskReferences } from "./task-references.js";

/** A description's first non-empty line, the title of a Task with no Project (autobyteus-32 D1). */
export const firstLineOf = (description: string): string =>
  description.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? "";

/**
 * A Task's identity by its ID, for routing requests and decision records (autobyteus-32): a Project Task's key, Project
 * and title; a Task with no Project's first description line. An unknown Task rejects TASK_NOT_FOUND.
 */
export const readDelegatedTaskIdentity = async (
  references: Pick<TaskReferences, "byId">,
  adHocTasks: Pick<AdHocTaskStore, "read">,
  taskId: string,
): Promise<DelegatedTaskIdentityView> => {
  if (taskId.startsWith(AD_HOC_TASK_ID_PREFIX)) {
    const task = await adHocTasks.read(taskId);
    if (!task) throw new ProjectError("TASK_NOT_FOUND", "The Task was deleted.");
    return { taskKey: null, projectId: null, title: firstLineOf(task.description) };
  }
  const { projectId, task } = await references.byId(taskId);
  return { taskKey: task.taskKey, projectId, title: task.title };
};

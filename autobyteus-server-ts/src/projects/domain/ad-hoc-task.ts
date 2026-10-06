import type { ProjectTaskStatus } from "./models.js";

/** Every ad-hoc Task ID starts with this prefix (`ad_hoc_task_<uuid>`). */
export const AD_HOC_TASK_ID_PREFIX = "ad_hoc_task_";

/**
 * A Task with no Project, as persisted in `<appData>/ad-hoc-tasks/<taskId>/task.json`. Only a
 * description-only `delegate_task` from an agent that is not working on a Task creates one. It
 * stores text only: the delegated description and the given reference file paths, never file
 * contents. Its host root is not stored; it follows from the Task's agent run resources.
 */
export interface AdHocTask {
  taskId: string;
  description: string;
  referenceFiles: string[];
  status: ProjectTaskStatus;
  createdAt: string;
  updatedAt: string;
}

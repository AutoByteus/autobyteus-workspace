import type { RunTaskRecords } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import type { ProjectChangeMarks } from "../changes/project-change-publisher.js";
import type { TaskExecutionResourceService } from "./task-execution-resource-service.js";

/**
 * The run side's view of the Task records (SR-053): `isOpen` from the loaded records, and a run's status change marks
 * the Task it is the root of (its worker status is read later). Created by the composition root at step 1.
 */
export const createRunTaskRecords = (
  resources: Pick<TaskExecutionResourceService, "isOpen" | "rootTaskLocationOf">,
  marks: Pick<ProjectChangeMarks, "workerStatusChanged">,
): RunTaskRecords => Object.freeze({
  isOpen: (execution) => resources.isOpen(execution),
  statusChanged: (execution) => {
    try {
      const location = resources.rootTaskLocationOf(execution);
      if (location) marks.workerStatusChanged(location);
    } catch (error) { console.warn("TASK_ROOT_STATUS_MARK_FAILED", error); }
  },
});

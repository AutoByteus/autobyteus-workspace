import type { BaseTaskPlan } from '../base-task-plan.js';
import {
  TaskStatusReportItemSchema,
  TaskStatusReportSchema,
  type TaskStatusReport
} from '../schemas/task-status-report.js';

export class TaskPlanConverter {
  static toSchema(taskPlan: BaseTaskPlan): TaskStatusReport | null {
    if (taskPlan.tasks.length === 0) {
      return null;
    }

    const internalStatus = taskPlan.getStatusOverview();
    const idToNameMap = new Map(taskPlan.tasks.map((task) => [task.task_id, task.task_name]));

    const reportItems = taskPlan.tasks.map((task) => {
      const depNames = (task.dependencies ?? []).map((depId) => idToNameMap.get(depId) ?? String(depId));

      return TaskStatusReportItemSchema.parse({
        task_name: task.task_name,
        assignee_name: task.assignee_name,
        description: task.description,
        dependencies: depNames,
        status: internalStatus.taskStatuses?.[task.task_id],
        file_deliverables: task.file_deliverables
      });
    });

    return TaskStatusReportSchema.parse({ tasks: reportItems });
  }
}

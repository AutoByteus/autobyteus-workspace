import { BaseTool } from '../../../tools/base-tool.js';
import { ToolCategory } from '../../../tools/tool-category.js';
import { TaskDefinitionSchema } from '../../schemas/task-definition.js';
import { TaskStatus } from '../../base-task-plan.js';
import type { TaskToolContext } from './types.js';

export class GetMyTasks extends BaseTool {
  static CATEGORY = ToolCategory.TASK_MANAGEMENT;

  static getName(): string {
    return 'get_my_tasks';
  }

  static getDescription(): string {
    return (
      'Retrieves the list of tasks currently assigned to you from the team\'s shared task plan. ' +
      'This is your personal to-do list. Use this to understand your current workload and decide what to do next.'
    );
  }

  static getArgumentSchema() {
    return null;
  }

  protected async _execute(context: TaskToolContext): Promise<string> {
    const agentName = context?.config?.name ?? 'Unknown';
    const teamContext = context?.customData?.teamContext;
    if (!teamContext) {
      return 'Error: Team context is not available. Cannot access the task plan.';
    }

    const taskPlan = teamContext.state?.taskPlan ?? null;
    if (!taskPlan) {
      return 'Error: Task plan has not been initialized for this team.';
    }

    const statusOverview = taskPlan.getStatusOverview();
    const myTasks = (taskPlan.tasks ?? []).filter(
      (task) => task.assignee_name === agentName && statusOverview.taskStatuses?.[task.task_id] === TaskStatus.QUEUED
    );

    if (myTasks.length === 0) {
      return 'Your personal task queue is empty. You have no new tasks assigned and ready to be started.';
    }

    try {
      const tasksForLLM = myTasks.map((task) => TaskDefinitionSchema.parse(task));
      return JSON.stringify(tasksForLLM, null, 2);
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      return `Error: An unexpected error occurred while formatting your tasks: ${details}`;
    }
  }
}

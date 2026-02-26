import { BaseTool } from '../../../tools/base-tool.js';
import { ToolCategory } from '../../../tools/tool-category.js';
import { TaskPlanConverter } from '../../converters/task-plan-converter.js';
import type { TaskToolContext } from './types.js';

export class GetTaskPlanStatus extends BaseTool {
  static CATEGORY = ToolCategory.TASK_MANAGEMENT;

  static getName(): string {
    return 'get_task_plan_status';
  }

  static getDescription(): string {
    return (
      "Retrieves the current status of the team's task plan, including the status of all individual tasks. " +
      'Returns the status as a structured, LLM-friendly JSON string.'
    );
  }

  static getArgumentSchema() {
    return null;
  }

  protected async _execute(context: TaskToolContext): Promise<string> {
    const teamContext = context?.customData?.teamContext;
    if (!teamContext) {
      return 'Error: Team context is not available to the agent. Cannot access the task plan.';
    }

    const taskPlan = teamContext.state?.taskPlan ?? null;
    if (!taskPlan) {
      return 'Error: Task plan has not been initialized for this team.';
    }

    try {
      const statusReport = TaskPlanConverter.toSchema(taskPlan);
      if (!statusReport) {
        return 'The task plan is currently empty. No tasks have been published.';
      }

      return JSON.stringify(statusReport, null, 2);
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      return `An unexpected error occurred while retrieving or formatting task plan status: ${details}`;
    }
  }
}

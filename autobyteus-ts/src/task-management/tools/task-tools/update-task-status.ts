import { ZodError } from 'zod';
import { BaseTool } from '../../../tools/base-tool.js';
import { ToolCategory } from '../../../tools/tool-category.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../utils/parameter-schema.js';
import { TaskStatus } from '../../base-task-plan.js';
import { FileDeliverableSchema } from '../../schemas/deliverable-schema.js';
import { createFileDeliverable } from '../../deliverable.js';
import { zodToParameterSchema } from '../../../tools/zod-schema-converter.js';
import type { TaskToolContext } from './types.js';

export class UpdateTaskStatus extends BaseTool {
  static CATEGORY = ToolCategory.TASK_MANAGEMENT;

  static getName(): string {
    return 'update_task_status';
  }

  static getDescription(): string {
    return (
      "Updates the status of a specific task on the team's shared task plan. " +
      "When completing a task, this tool can also be used to formally submit a list of file deliverables."
    );
  }

  static getArgumentSchema(): ParameterSchema {
    const schema = new ParameterSchema();
    schema.addParameter(new ParameterDefinition({
      name: 'task_name',
      type: ParameterType.STRING,
      description: "The unique name of the task to update (e.g., 'implement_scraper').",
      required: true
    }));
    schema.addParameter(new ParameterDefinition({
      name: 'status',
      type: ParameterType.ENUM,
      description: `The new status for the task. Must be one of: ${Object.values(TaskStatus).join(', ')}.`,
      required: true,
      enumValues: Object.values(TaskStatus)
    }));
    schema.addParameter(new ParameterDefinition({
      name: 'deliverables',
      type: ParameterType.ARRAY,
      description:
        "Optional. A list of file deliverables to submit for this task, typically when status is 'completed'. Each deliverable must include a file_path and a summary.",
      required: false,
      arrayItemSchema: zodToParameterSchema(FileDeliverableSchema)
    }));
    return schema;
  }

  protected async _execute(context: TaskToolContext, kwargs: Record<string, unknown> = {}): Promise<string> {
    const taskName = (kwargs as { task_name?: string }).task_name;
    const status = (kwargs as { status?: string }).status;
    const deliverables = (kwargs as { deliverables?: Array<Record<string, unknown>> }).deliverables;

    const agentName = context?.config?.name ?? 'Unknown';
    const teamContext = context?.customData?.teamContext;
    if (!teamContext) {
      return 'Error: Team context is not available. Cannot access the task plan.';
    }

    const taskPlan = teamContext.state?.taskPlan ?? null;
    if (!taskPlan) {
      return 'Error: Task plan has not been initialized for this team.';
    }

    if (!taskPlan.tasks || taskPlan.tasks.length === 0) {
      return 'Error: No tasks are currently loaded on the task plan.';
    }

    const targetTask = taskPlan.tasks.find((task) => task.task_name === taskName);
    if (!targetTask) {
      return `Error: Failed to update status for task '${taskName}'. The task name does not exist on the current plan.`;
    }

    const statusEnum = Object.values(TaskStatus).includes(status as TaskStatus)
      ? (status as TaskStatus)
      : null;
    if (!statusEnum) {
      return `Error: Invalid status '${status}'. Must be one of: ${Object.values(TaskStatus).join(', ')}.`;
    }

    if (deliverables && deliverables.length > 0) {
      try {
        for (const data of deliverables) {
          const parsed = FileDeliverableSchema.parse(data);
          const fullDeliverable = createFileDeliverable({
            ...parsed,
            author_agent_name: agentName
          });
          targetTask.file_deliverables.push(fullDeliverable);
        }
      } catch (error) {
        let details = '';
        if (error instanceof ZodError) {
          details = error.issues.map((issue) => issue.message).filter(Boolean).join('; ');
        } else if (error instanceof Error) {
          details = error.message;
        } else {
          details = String(error);
        }
        return `Error: Failed to process deliverables due to invalid data: ${details}. Task status was NOT updated.`;
      }
    }

    if (!taskPlan.updateTaskStatus(targetTask.task_id, statusEnum, agentName)) {
      return `Error: Failed to update status for task '${taskName}'. An unexpected error occurred on the task plan.`;
    }

    let successMsg = `Successfully updated status of task '${taskName}' to '${status}'.`;
    if (deliverables && deliverables.length > 0) {
      successMsg += ` and submitted ${deliverables.length} deliverable(s).`;
    }
    return successMsg;
  }
}

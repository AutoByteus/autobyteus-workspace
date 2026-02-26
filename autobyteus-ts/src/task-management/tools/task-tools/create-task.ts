import { ZodError } from 'zod';
import { BaseTool } from '../../../tools/base-tool.js';
import { ToolCategory } from '../../../tools/tool-category.js';
import { zodToParameterSchema } from '../../../tools/zod-schema-converter.js';
import { TaskDefinitionSchema, type TaskDefinition } from '../../schemas/task-definition.js';
import type { TaskToolContext } from './types.js';

export class CreateTask extends BaseTool {
  static CATEGORY = ToolCategory.TASK_MANAGEMENT;

  static getName(): string {
    return 'create_task';
  }

  static getDescription(): string {
    return (
      "Adds a single new task to the team's shared task plan. This is an additive action " +
      'and does not affect existing tasks. Use this to create follow-up tasks or delegate new work.'
    );
  }

  static getArgumentSchema() {
    return zodToParameterSchema(TaskDefinitionSchema);
  }

  protected async _execute(context: TaskToolContext, kwargs: Record<string, unknown> = {}): Promise<string> {
    const taskName = (kwargs as { task_name?: string }).task_name ?? 'unnamed task';
    const teamContext = context?.customData?.teamContext;
    if (!teamContext) {
      return 'Error: Team context is not available. Cannot access the task plan.';
    }

    const taskPlan = teamContext.state?.taskPlan ?? null;
    if (!taskPlan) {
      return 'Error: Task plan has not been initialized for this team.';
    }

    let taskDef: TaskDefinition;
    try {
      taskDef = TaskDefinitionSchema.parse(kwargs);
    } catch (error) {
      let details = '';
      if (error instanceof ZodError) {
        details = error.issues.map((issue) => issue.message).filter(Boolean).join('; ');
      } else if (error instanceof Error) {
        details = error.message;
      } else {
        details = String(error);
      }
      const suffix = details ? `: ${details}` : '';
      return `Error: Invalid task definition provided${suffix}`;
    }

    const newTask = taskPlan.addTask(taskDef);
    if (newTask) {
      return `Successfully created new task '${newTask.task_name}' (ID: ${newTask.task_id}) in the task plan.`;
    }

    return `Error: Failed to create task '${taskName}' in the plan for an unknown reason.`;
  }
}

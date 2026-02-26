import { ZodError } from 'zod';
import { BaseTool } from '../../../tools/base-tool.js';
import { ToolCategory } from '../../../tools/tool-category.js';
import { zodToParameterSchema } from '../../../tools/zod-schema-converter.js';
import { TasksDefinitionSchema, type TasksDefinition } from '../../schemas/task-definition.js';
import type { TaskToolContext } from './types.js';

export class CreateTasks extends BaseTool {
  static CATEGORY = ToolCategory.TASK_MANAGEMENT;

  static getName(): string {
    return 'create_tasks';
  }

  static getDescription(): string {
    return (
      "Adds a list of new tasks to the team's shared task plan. This action is additive and " +
      "does not affect existing tasks or the team's overall goal."
    );
  }

  static getArgumentSchema() {
    return zodToParameterSchema(TasksDefinitionSchema);
  }

  protected async _execute(context: TaskToolContext, kwargs: Record<string, unknown> = {}): Promise<string> {
    const teamContext = context?.customData?.teamContext;
    if (!teamContext) {
      return 'Error: Team context is not available. Cannot access the task plan.';
    }

    const taskPlan = teamContext.state?.taskPlan ?? null;
    if (!taskPlan) {
      return 'Error: Task plan has not been initialized for this team.';
    }

    let tasksDef: TasksDefinition;
    try {
      tasksDef = TasksDefinitionSchema.parse({ tasks: (kwargs as { tasks?: unknown }).tasks });
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
      return `Error: Invalid task definitions provided${suffix}`;
    }

    const newlyCreated = taskPlan.addTasks(tasksDef.tasks);
    if (newlyCreated && newlyCreated.length > 0) {
      return `Successfully created ${newlyCreated.length} new task(s) in the task plan.`;
    }

    return 'No tasks were created. The provided list may have been empty.';
  }
}

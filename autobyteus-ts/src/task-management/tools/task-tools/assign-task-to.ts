import { ZodError } from 'zod';
import { BaseTool } from '../../../tools/base-tool.js';
import { ToolCategory } from '../../../tools/tool-category.js';
import { zodToParameterSchema } from '../../../tools/zod-schema-converter.js';
import { TaskDefinitionSchema, type TaskDefinition } from '../../schemas/task-definition.js';
import { InterAgentMessageRequestEvent } from '../../../agent-team/events/agent-team-events.js';
import type { TaskToolContext } from './types.js';

export class AssignTaskTo extends BaseTool {
  static CATEGORY = ToolCategory.TASK_MANAGEMENT;

  static getName(): string {
    return 'assign_task_to';
  }

  static getDescription(): string {
    return (
      'Creates and assigns a single new task to a specific team member, and sends them a direct notification ' +
      'with the task details. Use this to delegate a well-defined piece of work you have identified.'
    );
  }

  static getArgumentSchema() {
    return zodToParameterSchema(TaskDefinitionSchema);
  }

  protected async _execute(context: TaskToolContext, kwargs: Record<string, unknown> = {}): Promise<string> {
    const taskName = (kwargs as { task_name?: string }).task_name ?? 'unnamed task';

    const teamContext = context?.customData?.teamContext;
    if (!teamContext) {
      return 'Error: Team context is not available. Cannot access the task plan or send messages.';
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
    if (!newTask) {
      return `Error: Failed to publish task '${taskName}' to the plan for an unknown reason.`;
    }
    const assigneeName = newTask.assignee_name;

    const teamManager = teamContext.teamManager;
    if (!teamManager) {
      return (
        `Successfully published task '${newTask.task_name}', but could not send a direct notification ` +
        'because the TeamManager is not available.'
      );
    }

    try {
      const senderAgentId = context?.agentId ?? 'unknown';
      let notificationContent =
        `You have been assigned a new task directly from agent '${context?.config?.name ?? 'Unknown'}'.\n\n` +
        `**Task Name**: '${newTask.task_name}'\n` +
        `**Description**: ${newTask.description}\n`;

      if (newTask.dependencies && newTask.dependencies.length > 0) {
        const idToNameMap = new Map(taskPlan.tasks.map((task) => [task.task_id, task.task_name]));
        const depNames = newTask.dependencies.map((depId: string) => idToNameMap.get(depId) ?? String(depId));
        notificationContent += `**Dependencies**: ${depNames.join(', ')}\n`;
      }

      notificationContent +=
        '\nThis task has been logged on the team\'s task plan. You can begin work when its dependencies are met.';

      const event = new InterAgentMessageRequestEvent(
        senderAgentId,
        assigneeName,
        notificationContent,
        'task_assignment'
      );

      await teamManager.dispatchInterAgentMessageRequest(event);
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      return (
        `Successfully published task '${newTask.task_name}', but failed to send the direct notification message. ` +
        `Error: ${details}`
      );
    }

    return `Successfully assigned task '${newTask.task_name}' to agent '${newTask.assignee_name}' and sent a notification.`;
  }
}

import { BaseTool } from '../../../tools/base-tool.js';
import { ToolCategory } from '../../../tools/tool-category.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../utils/parameter-schema.js';
import { ToDoStatus } from '../../todo.js';
import type { TodoToolContext } from './types.js';

function notifyTodoUpdate(context: TodoToolContext): void {
  const notifier = context?.statusManager?.notifier;
  const todoList = context?.state?.todoList;
  if (notifier && todoList) {
    const todosForLLM = todoList.getAllTodos();
    if (typeof notifier.notifyAgentDataTodoListUpdated === 'function') {
      notifier.notifyAgentDataTodoListUpdated(todosForLLM);
    }
  }
}

export class UpdateToDoStatus extends BaseTool {
  static CATEGORY = ToolCategory.TASK_MANAGEMENT;

  static getName(): string {
    return 'update_todo_status';
  }

  static getDescription(): string {
    return 'Updates the status of a specific item on your personal to-do list.';
  }

  static getArgumentSchema(): ParameterSchema {
    const schema = new ParameterSchema();
    schema.addParameter(new ParameterDefinition({
      name: 'todo_id',
      type: ParameterType.STRING,
      description: "The unique ID of the to-do item to update (e.g., 'todo_...').",
      required: true
    }));
    schema.addParameter(new ParameterDefinition({
      name: 'status',
      type: ParameterType.ENUM,
      description: `The new status. Must be one of: ${Object.values(ToDoStatus).join(', ')}.`,
      required: true,
      enumValues: Object.values(ToDoStatus)
    }));
    return schema;
  }

  protected async _execute(context: TodoToolContext, kwargs: Record<string, unknown> = {}): Promise<string> {
    const todoId = kwargs.todo_id as string | undefined;
    const status = kwargs.status as string | undefined;

    if (context.state.todoList == null) {
      return 'Error: You do not have a to-do list to update.';
    }

    const todoList = context.state.todoList;

    if (!todoId || typeof todoId !== 'string') {
      return 'Error: todo_id is required and must be a string.';
    }

    const statusEnum = Object.values(ToDoStatus).includes(status as ToDoStatus)
      ? (status as ToDoStatus)
      : null;
    if (!statusEnum) {
      return `Error: Invalid status '${status}'. Must be one of: ${Object.values(ToDoStatus).join(', ')}.`;
    }

    if (!todoList.getTodoById(todoId)) {
      return `Error: Failed to update status. A to-do item with ID '${todoId}' does not exist on your list.`;
    }

    if (todoList.updateTodoStatus(todoId, statusEnum)) {
      notifyTodoUpdate(context);
      return `Successfully updated status of to-do item '${todoId}' to '${status}'.`;
    }

    return `Error: Failed to update status for item '${todoId}'. An unexpected error occurred.`;
  }
}

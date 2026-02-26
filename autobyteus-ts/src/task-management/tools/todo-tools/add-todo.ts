import { ZodError } from 'zod';
import { BaseTool } from '../../../tools/base-tool.js';
import { ToolCategory } from '../../../tools/tool-category.js';
import { zodToParameterSchema } from '../../../tools/zod-schema-converter.js';
import { ToDoDefinitionSchema, type ToDoDefinition } from '../../schemas/todo-definition.js';
import { ToDoList } from '../../todo-list.js';
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

export class AddToDo extends BaseTool {
  static CATEGORY = ToolCategory.TASK_MANAGEMENT;

  static getName(): string {
    return 'add_todo';
  }

  static getDescription(): string {
    return (
      'Adds a single new item to your personal to-do list. ' +
      'Use this if you discover a new step is needed to complete your task.'
    );
  }

  static getArgumentSchema() {
    return zodToParameterSchema(ToDoDefinitionSchema);
  }

  protected async _execute(context: TodoToolContext, kwargs: Record<string, unknown> = {}): Promise<string> {
    const agentId = context?.agentId ?? 'unknown';

    if (context.state.todoList == null) {
      context.state.todoList = new ToDoList(agentId);
    }

    const todoList = context.state.todoList as ToDoList;

    let todoDef: ToDoDefinition;
    try {
      todoDef = ToDoDefinitionSchema.parse(kwargs);
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
      return `Error: Invalid to-do item definition provided${suffix}`;
    }

    const newTodo = todoList.addTodo(todoDef);
    if (newTodo) {
      notifyTodoUpdate(context);
      return `Successfully added new item to your to-do list: '${newTodo.description}' (ID: ${newTodo.todo_id}).`;
    }

    return 'Error: Failed to add item to the to-do list for an unknown reason.';
  }
}

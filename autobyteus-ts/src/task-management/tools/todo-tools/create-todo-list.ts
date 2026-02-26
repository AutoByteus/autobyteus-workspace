import { ZodError } from 'zod';
import { BaseTool } from '../../../tools/base-tool.js';
import { ToolCategory } from '../../../tools/tool-category.js';
import { zodToParameterSchema } from '../../../tools/zod-schema-converter.js';
import { ToDosDefinitionSchema, type ToDosDefinition } from '../../schemas/todo-definition.js';
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

export class CreateToDoList extends BaseTool {
  static CATEGORY = ToolCategory.TASK_MANAGEMENT;

  static getName(): string {
    return 'create_todo_list';
  }

  static getDescription(): string {
    return (
      'Creates a new personal to-do list for you to manage your own sub-tasks. ' +
      'This will overwrite any existing to-do list you have. Use this to break down a larger task into smaller steps. ' +
      'Returns the full list of created to-do items with their new IDs.'
    );
  }

  static getArgumentSchema() {
    return zodToParameterSchema(ToDosDefinitionSchema);
  }

  protected async _execute(context: TodoToolContext, kwargs: Record<string, unknown> = {}): Promise<string> {
    const agentId = context?.agentId ?? 'unknown';

    let todosDef: ToDosDefinition;
    try {
      todosDef = ToDosDefinitionSchema.parse(kwargs);
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
      return `Error: Invalid to-do list definition provided${suffix}`;
    }

    const todoList = new ToDoList(agentId);
    const newTodos = todoList.addTodos(todosDef.todos);
    context.state.todoList = todoList;

    notifyTodoUpdate(context);

    try {
      return JSON.stringify(newTodos, null, 2);
    } catch (error) {
      return `Successfully created ${newTodos.length} to-do items, but failed to return them in the response.`;
    }
  }
}

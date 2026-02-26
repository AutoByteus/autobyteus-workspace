import type { ToDo } from '../../todo.js';
import type { ToDoList } from '../../todo-list.js';

export type TodoToolContext = {
  agentId?: string;
  statusManager?: {
    notifier?: {
      notifyAgentDataTodoListUpdated?: (todos: ToDo[]) => void;
    };
  };
  state: {
    todoList: ToDoList | null;
  };
};

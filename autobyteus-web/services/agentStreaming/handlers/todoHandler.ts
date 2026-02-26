/**
 * To-Do List event handler.
 */

import type { AgentContext } from '~/types/agent/AgentContext';
import type { TodoListUpdatePayload } from '../protocol/messageTypes';
import { ToDoStatus } from '~/types/todo';
import { useAgentTodoStore } from '~/stores/agentTodoStore';

/**
 * Map backend todo status string to frontend ToDoStatus enum.
 */
function mapTodoStatus(status: string): ToDoStatus {
  const statusLower = status.toLowerCase();
  if (statusLower === 'done' || statusLower === 'completed') {
    return ToDoStatus.DONE;
  }
  if (statusLower === 'in_progress' || statusLower === 'in-progress') {
    return ToDoStatus.IN_PROGRESS;
  }
  return ToDoStatus.PENDING;
}

/**
 * Handle TODO_LIST_UPDATE event.
 */
export function handleTodoListUpdate(
  payload: TodoListUpdatePayload,
  context: AgentContext
): void {
  const store = useAgentTodoStore();
  
  const todos = payload.todos.map(todo => ({
    todoId: todo.todo_id,
    description: todo.description,
    status: mapTodoStatus(todo.status),
  }));
  
  store.setTodos(context.state.agentId, todos);
}

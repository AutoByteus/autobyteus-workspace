import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { handleTodoListUpdate } from '../todoHandler';
import { useAgentTodoStore } from '~/stores/agentTodoStore';
import { ToDoStatus } from '~/types/todo';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { TodoListUpdatePayload } from '../../protocol/messageTypes';

describe('todoHandler', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('handleTodoListUpdate maps payload and updates store', () => {
    const store = useAgentTodoStore();
    const context = {
      state: { agentId: 'test-agent' }
    } as any;

    const payload: TodoListUpdatePayload = {
      todos: [
        { todo_id: '1', description: 'Task 1', status: 'done' },
        { todo_id: '2', description: 'Task 2', status: 'in_progress' },
        { todo_id: '3', description: 'Task 3', status: 'pending' },
      ],
    };

    handleTodoListUpdate(payload, context);

    const storedTodos = store.getTodos('test-agent');
    expect(storedTodos).toHaveLength(3);
    
    expect(storedTodos[0]).toEqual({
      todoId: '1',
      description: 'Task 1',
      status: ToDoStatus.DONE
    });
    expect(storedTodos[1]).toEqual({
      todoId: '2',
      description: 'Task 2',
      status: ToDoStatus.IN_PROGRESS
    });
    expect(storedTodos[2]).toEqual({
      todoId: '3',
      description: 'Task 3',
      status: ToDoStatus.PENDING
    });
  });
});

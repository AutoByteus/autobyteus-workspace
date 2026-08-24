import { defineStore } from 'pinia';
import type { ToDo } from '~/types/todo';

/**
 * @store agentTodoStore
 * @description Dedicated store for managing agent "To-Do" lists (Goals).
 * Separated from execution logs (Activities) to allow strictly distinct data lifecycles.
 */
interface AgentTodos {
  todos: ToDo[];
}

export const useAgentTodoStore = defineStore('agentTodo', {
  state: () => ({
    todosByRunId: new Map<string, AgentTodos>(),
  }),

  getters: {
    getTodos: (state) => (runId: string): ToDo[] => {
      return state.todosByRunId.get(runId)?.todos ?? [];
    },
  },

  actions: {
    _ensureEntry(runId: string): AgentTodos {
      if (!this.todosByRunId.has(runId)) {
        this.todosByRunId.set(runId, {
          todos: [],
        });
      }
      return this.todosByRunId.get(runId)!;
    },

    setTodos(runId: string, todos: ToDo[]) {
      const entry = this._ensureEntry(runId);
      entry.todos = todos;
    },
    
    clearTodos(runId: string) {
      this.todosByRunId.delete(runId);
    }
  },
});

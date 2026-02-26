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
    todosByAgentId: new Map<string, AgentTodos>(),
  }),

  getters: {
    getTodos: (state) => (agentId: string): ToDo[] => {
      return state.todosByAgentId.get(agentId)?.todos ?? [];
    },
  },

  actions: {
    _ensureEntry(agentId: string): AgentTodos {
      if (!this.todosByAgentId.has(agentId)) {
        this.todosByAgentId.set(agentId, {
          todos: [],
        });
      }
      return this.todosByAgentId.get(agentId)!;
    },

    setTodos(agentId: string, todos: ToDo[]) {
      const entry = this._ensureEntry(agentId);
      entry.todos = todos;
    },
    
    clearTodos(agentId: string) {
      this.todosByAgentId.delete(agentId);
    }
  },
});

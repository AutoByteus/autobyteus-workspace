import { defineStore } from 'pinia';

export type MemoryScope = 'agent' | 'team';

interface MemoryScopeState {
  scope: MemoryScope;
}

export const useMemoryScopeStore = defineStore('memoryScopeStore', {
  state: (): MemoryScopeState => ({
    scope: 'agent',
  }),

  actions: {
    setScope(scope: MemoryScope) {
      this.scope = scope;
    },

    resetToDefault() {
      this.scope = 'agent';
    },
  },
});

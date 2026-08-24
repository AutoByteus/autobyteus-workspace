import { defineStore } from 'pinia';

export type WorkspaceCenterViewMode = 'chat' | 'config';

interface WorkspaceCenterViewState {
  mode: WorkspaceCenterViewMode;
}

export const useWorkspaceCenterViewStore = defineStore('workspaceCenterView', {
  state: (): WorkspaceCenterViewState => ({
    mode: 'chat',
  }),

  getters: {
    isConfigMode(): boolean {
      return this.mode === 'config';
    },
  },

  actions: {
    showChat() {
      this.mode = 'chat';
    },

    showConfig() {
      this.mode = 'config';
    },
  },
});

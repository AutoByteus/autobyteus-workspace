import { defineStore } from 'pinia'

export const useWorkspaceUIStore = defineStore('workspaceUI', {
  state: () => ({
    isWorkspaceSelectorVisible: false
  }),
  
  actions: {
    toggleWorkspaceSelector() {
      this.isWorkspaceSelectorVisible = !this.isWorkspaceSelectorVisible
    },
    hideWorkspaceSelector() {
      this.isWorkspaceSelectorVisible = false
    }
  }
})
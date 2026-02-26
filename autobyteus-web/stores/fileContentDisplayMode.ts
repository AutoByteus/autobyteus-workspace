import { defineStore } from 'pinia'

interface FileContentDisplayModeState {
  zenMode: boolean;
}

export const useFileContentDisplayModeStore = defineStore('fileContentDisplayMode', {
  state: (): FileContentDisplayModeState => ({
    zenMode: false
  }),

  actions: {
    toggleZenMode() {
      this.zenMode = !this.zenMode
    },
    
    exitZenMode() {
      this.zenMode = false
    }
  },

  getters: {
    isZenMode: (state): boolean => state.zenMode
  }
})


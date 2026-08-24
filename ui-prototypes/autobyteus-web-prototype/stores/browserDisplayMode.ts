import { defineStore } from 'pinia'

interface BrowserDisplayModeState {
  zenMode: boolean
}

export const useBrowserDisplayModeStore = defineStore('browserDisplayMode', {
  state: (): BrowserDisplayModeState => ({
    zenMode: false,
  }),

  actions: {
    toggleZenMode() {
      this.zenMode = !this.zenMode
    },

    exitZenMode() {
      this.zenMode = false
    },
  },

  getters: {
    isZenMode: (state): boolean => state.zenMode,
  },
})

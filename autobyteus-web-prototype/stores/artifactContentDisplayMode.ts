import { defineStore } from 'pinia'

interface ArtifactContentDisplayModeState {
  zenMode: boolean
}

export const useArtifactContentDisplayModeStore = defineStore('artifactContentDisplayMode', {
  state: (): ArtifactContentDisplayModeState => ({
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

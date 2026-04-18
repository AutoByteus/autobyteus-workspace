import { defineStore } from 'pinia'

export type HostShellPresentation = 'standard' | 'application_immersive'

export const useAppLayoutStore = defineStore('appLayout', {
  state: () => ({
    isMobileMenuOpen: false,
    hostShellPresentation: 'standard' as HostShellPresentation,
  }),

  actions: {
    toggleMobileMenu() {
      this.isMobileMenuOpen = !this.isMobileMenuOpen
    },

    closeMobileMenu() {
      this.isMobileMenuOpen = false
    },

    openMobileMenu() {
      this.isMobileMenuOpen = true
    },

    setHostShellPresentation(presentation: HostShellPresentation) {
      this.hostShellPresentation = presentation
      if (presentation === 'application_immersive') {
        this.closeMobileMenu()
      }
    },

    resetHostShellPresentation() {
      this.hostShellPresentation = 'standard'
    },
  },
})

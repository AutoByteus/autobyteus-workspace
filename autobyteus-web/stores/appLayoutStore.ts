import { defineStore } from 'pinia';

export const useAppLayoutStore = defineStore('appLayout', {
  state: () => ({
    isMobileMenuOpen: false,
  }),

  actions: {
    toggleMobileMenu() {
      this.isMobileMenuOpen = !this.isMobileMenuOpen;
    },

    closeMobileMenu() {
      this.isMobileMenuOpen = false;
    },

    openMobileMenu() {
      this.isMobileMenuOpen = true;
    },
  },
});

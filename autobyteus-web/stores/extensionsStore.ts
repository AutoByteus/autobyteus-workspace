import { defineStore } from 'pinia';
import { useToasts } from '~/composables/useToasts';
import type { ExtensionId, ManagedExtensionState } from '~/electron/extensions/types';

interface ExtensionsStoreState {
  initialized: boolean;
  isElectron: boolean;
  extensions: ManagedExtensionState[];
  isBusy: boolean;
  error: string | null;
}

export const useExtensionsStore = defineStore('extensions', {
  state: (): ExtensionsStoreState => ({
    initialized: false,
    isElectron: typeof window !== 'undefined' && Boolean(window.electronAPI),
    extensions: [],
    isBusy: false,
    error: null,
  }),

  getters: {
    voiceInput(state): ManagedExtensionState | null {
      return state.extensions.find((extension) => extension.id === 'voice-input') || null;
    },
  },

  actions: {
    applyRemoteState(extensions: ManagedExtensionState[]): void {
      this.extensions = extensions;
      this.error = null;
    },

    async initialize(): Promise<void> {
      if (this.initialized) {
        return;
      }

      this.isElectron = typeof window !== 'undefined' && Boolean(window.electronAPI);
      this.initialized = true;

      if (!this.isElectron || !window.electronAPI?.getExtensionsState) {
        return;
      }

      try {
        const state = await window.electronAPI.getExtensionsState();
        this.applyRemoteState(state);
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to load extensions'
      }
    },

    async refresh(): Promise<void> {
      if (!window.electronAPI?.getExtensionsState) {
        return;
      }

      const state = await window.electronAPI.getExtensionsState();
      this.applyRemoteState(state);
    },

    async installExtension(extensionId: ExtensionId): Promise<void> {
      if (!window.electronAPI?.installExtension) {
        return;
      }

      this.isBusy = true;
      try {
        const state = await window.electronAPI.installExtension(extensionId);
        this.applyRemoteState(state);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to install extension'
        this.error = message;
        useToasts().addToast(message, 'error');
      } finally {
        this.isBusy = false;
      }
    },

    async removeExtension(extensionId: ExtensionId): Promise<void> {
      if (!window.electronAPI?.removeExtension) {
        return;
      }

      this.isBusy = true;
      try {
        const state = await window.electronAPI.removeExtension(extensionId);
        this.applyRemoteState(state);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to remove extension'
        this.error = message;
        useToasts().addToast(message, 'error');
      } finally {
        this.isBusy = false;
      }
    },

    async reinstallExtension(extensionId: ExtensionId): Promise<void> {
      if (!window.electronAPI?.reinstallExtension) {
        return;
      }

      this.isBusy = true;
      try {
        const state = await window.electronAPI.reinstallExtension(extensionId);
        this.applyRemoteState(state);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to reinstall extension'
        this.error = message;
        useToasts().addToast(message, 'error');
      } finally {
        this.isBusy = false;
      }
    },
  },
});

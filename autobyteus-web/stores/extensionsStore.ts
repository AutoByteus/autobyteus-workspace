import { defineStore } from 'pinia';
import { useToasts } from '~/composables/useToasts';
import type { ExtensionId, ManagedExtensionState } from '~/electron/extensions/types';

type ExtensionAction = 'install' | 'remove' | 'reinstall' | null;

interface ExtensionsStoreState {
  initialized: boolean;
  isElectron: boolean;
  extensions: ManagedExtensionState[];
  isBusy: boolean;
  pendingAction: ExtensionAction;
  error: string | null;
}

export const useExtensionsStore = defineStore('extensions', {
  state: (): ExtensionsStoreState => ({
    initialized: false,
    isElectron: typeof window !== 'undefined' && Boolean(window.electronAPI),
    extensions: [],
    isBusy: false,
    pendingAction: null,
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

    updateLocalExtension(extensionId: ExtensionId, patch: Partial<ManagedExtensionState>): void {
      const index = this.extensions.findIndex((extension) => extension.id === extensionId);
      if (index === -1) {
        return;
      }

      this.extensions[index] = {
        ...this.extensions[index],
        ...patch,
      };
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
      this.pendingAction = 'install';
      this.updateLocalExtension(extensionId, {
        status: 'installing',
        message: 'Downloading runtime and model. This can take a minute on first install.',
        lastError: null,
      });
      try {
        const state = await window.electronAPI.installExtension(extensionId);
        this.applyRemoteState(state);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to install extension'
        this.error = message;
        this.updateLocalExtension(extensionId, {
          status: 'error',
          message: 'Failed to install Voice Input.',
          lastError: message,
        });
        useToasts().addToast(message, 'error');
      } finally {
        this.isBusy = false;
        this.pendingAction = null;
      }
    },

    async removeExtension(extensionId: ExtensionId): Promise<void> {
      if (!window.electronAPI?.removeExtension) {
        return;
      }

      this.isBusy = true;
      this.pendingAction = 'remove';
      try {
        const state = await window.electronAPI.removeExtension(extensionId);
        this.applyRemoteState(state);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to remove extension'
        this.error = message;
        useToasts().addToast(message, 'error');
      } finally {
        this.isBusy = false;
        this.pendingAction = null;
      }
    },

    async reinstallExtension(extensionId: ExtensionId): Promise<void> {
      if (!window.electronAPI?.reinstallExtension) {
        return;
      }

      this.isBusy = true;
      this.pendingAction = 'reinstall';
      this.updateLocalExtension(extensionId, {
        status: 'installing',
        message: 'Reinstalling Voice Input. Runtime assets are being refreshed now.',
        lastError: null,
      });
      try {
        const state = await window.electronAPI.reinstallExtension(extensionId);
        this.applyRemoteState(state);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to reinstall extension'
        this.error = message;
        this.updateLocalExtension(extensionId, {
          status: 'error',
          message: 'Failed to reinstall Voice Input.',
          lastError: message,
        });
        useToasts().addToast(message, 'error');
      } finally {
        this.isBusy = false;
        this.pendingAction = null;
      }
    },

    async openExtensionFolder(extensionId: ExtensionId): Promise<void> {
      if (!window.electronAPI?.openExtensionFolder) {
        return;
      }

      const result = await window.electronAPI.openExtensionFolder(extensionId);
      if (!result.success) {
        const message = result.error || 'Failed to open extension folder'
        useToasts().addToast(message, 'error');
      }
    },
  },
});

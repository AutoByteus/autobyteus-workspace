import { defineStore } from 'pinia';
import { useToasts } from '~/composables/useToasts';
import type {
  ExtensionId,
  ManagedExtensionState,
  UpdateVoiceInputSettingsPayload,
  VoiceInputLanguageMode,
} from '~/electron/extensions/types';
import { localizationRuntime } from '~/localization/runtime/localizationRuntime';

type ExtensionAction =
  | 'install'
  | 'enable'
  | 'disable'
  | 'remove'
  | 'reinstall'
  | 'update-settings'
  | null;

const INSTALL_POLL_INTERVAL_MS = 750;
let installPollingTimer: ReturnType<typeof setInterval> | null = null;

function t(key: string, params?: Record<string, string | number>): string {
  return localizationRuntime.translate(key, params);
}

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
    startInstallPolling(): void {
      this.stopInstallPolling();
      if (!window.electronAPI?.getExtensionsState) {
        return;
      }

      installPollingTimer = setInterval(() => {
        void this.refreshInstallState();
      }, INSTALL_POLL_INTERVAL_MS);
    },

    stopInstallPolling(): void {
      if (installPollingTimer) {
        clearInterval(installPollingTimer);
        installPollingTimer = null;
      }
    },

    async refreshInstallState(): Promise<void> {
      if (!window.electronAPI?.getExtensionsState) {
        return;
      }

      try {
        const state = await window.electronAPI.getExtensionsState();
        this.applyRemoteState(state);
      } catch {
        // Keep the in-flight optimistic state if polling fails transiently.
      }
    },

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
        this.error = error instanceof Error ? error.message : t('settings.extensions.store.failedToLoadExtensions');
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
        enabled: false,
        message: t('settings.extensions.store.fetchingRuntimeManifest'),
        installProgress: {
          phase: 'fetching-manifest',
          percent: null,
          bytesReceived: null,
          bytesTotal: null,
        },
        lastError: null,
      });
      this.startInstallPolling();
      try {
        const state = await window.electronAPI.installExtension(extensionId);
        this.applyRemoteState(state);
      } catch (error) {
        const message = error instanceof Error ? error.message : t('settings.extensions.store.failedToInstallExtension');
        this.error = message;
        this.updateLocalExtension(extensionId, {
          status: 'error',
          enabled: false,
          message: t('settings.extensions.store.failedToInstallVoiceInput'),
          installProgress: null,
          lastError: message,
        });
        useToasts().addToast(message, 'error');
      } finally {
        this.stopInstallPolling();
        this.isBusy = false;
        this.pendingAction = null;
      }
    },

    async enableExtension(extensionId: ExtensionId): Promise<void> {
      if (!window.electronAPI?.enableExtension) {
        return;
      }

      this.isBusy = true;
      this.pendingAction = 'enable';
      try {
        const state = await window.electronAPI.enableExtension(extensionId);
        this.applyRemoteState(state);
      } catch (error) {
        const message = error instanceof Error ? error.message : t('settings.extensions.store.failedToEnableExtension');
        this.error = message;
        useToasts().addToast(message, 'error');
      } finally {
        this.isBusy = false;
        this.pendingAction = null;
      }
    },

    async disableExtension(extensionId: ExtensionId): Promise<void> {
      if (!window.electronAPI?.disableExtension) {
        return;
      }

      this.isBusy = true;
      this.pendingAction = 'disable';
      try {
        const state = await window.electronAPI.disableExtension(extensionId);
        this.applyRemoteState(state);
      } catch (error) {
        const message = error instanceof Error ? error.message : t('settings.extensions.store.failedToDisableExtension');
        this.error = message;
        useToasts().addToast(message, 'error');
      } finally {
        this.isBusy = false;
        this.pendingAction = null;
      }
    },

    async updateVoiceInputSettings(payload: UpdateVoiceInputSettingsPayload): Promise<void> {
      if (!window.electronAPI?.updateVoiceInputSettings) {
        return;
      }

      this.isBusy = true;
      this.pendingAction = 'update-settings';
      try {
        const state = await window.electronAPI.updateVoiceInputSettings('voice-input', payload);
        this.applyRemoteState(state);
      } catch (error) {
        const message = error instanceof Error ? error.message : t('settings.extensions.store.failedToUpdateVoiceInputSettings');
        this.error = message;
        useToasts().addToast(message, 'error');
      } finally {
        this.isBusy = false;
        this.pendingAction = null;
      }
    },

    async updateVoiceInputLanguageMode(languageMode: VoiceInputLanguageMode): Promise<void> {
      await this.updateVoiceInputSettings({ languageMode });
    },

    async updateVoiceInputAudioInputDevice(audioInputDeviceId: string | null): Promise<void> {
      await this.updateVoiceInputSettings({ audioInputDeviceId });
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
        const message = error instanceof Error ? error.message : t('settings.extensions.store.failedToRemoveExtension');
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
        message: t('settings.extensions.store.fetchingRuntimeManifest'),
        installProgress: {
          phase: 'fetching-manifest',
          percent: null,
          bytesReceived: null,
          bytesTotal: null,
        },
        lastError: null,
      });
      this.startInstallPolling();
      try {
        const state = await window.electronAPI.reinstallExtension(extensionId);
        this.applyRemoteState(state);
      } catch (error) {
        const message = error instanceof Error ? error.message : t('settings.extensions.store.failedToReinstallExtension');
        this.error = message;
        this.updateLocalExtension(extensionId, {
          status: 'error',
          enabled: false,
          message: t('settings.extensions.store.failedToReinstallVoiceInput'),
          installProgress: null,
          lastError: message,
        });
        useToasts().addToast(message, 'error');
      } finally {
        this.stopInstallPolling();
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
        const message = result.error || t('settings.extensions.store.failedToOpenExtensionFolder');
        useToasts().addToast(message, 'error');
      }
    },
  },
});

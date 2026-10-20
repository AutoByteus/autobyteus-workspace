import { defineStore } from 'pinia';
import { useToasts } from '~/composables/useToasts';
import { localizationRuntime } from '~/localization/runtime/localizationRuntime';
import type { AppUpdateChannel, AppUpdateState, AppUpdateStatus } from '~/shared/appUpdateTypes';
import {
  buildAppUpdateErrorToastSignature,
  getAppUpdateErrorToastMessageKey,
  isQuietStartupAppUpdateError,
} from '~/utils/appUpdateErrorDisplay';

type Cleanup = () => void;

type AppUpdateStatePayload = AppUpdateState;

let updateStateCleanup: Cleanup | null = null;

function t(key: string, params?: Record<string, string | number>): string {
  return localizationRuntime.translate(key, params);
}

interface AppUpdateStoreState extends AppUpdateStatePayload {
  initialized: boolean;
  isElectron: boolean;
  lastErrorToastSignature: string | null;
}

const DEFAULT_STATE: AppUpdateStatePayload = {
  status: 'idle',
  currentVersion: '',
  currentVersionIsPrerelease: false,
  updateChannel: 'stable',
  updateStaged: false,
  availableVersion: null,
  downloadPercent: null,
  downloadTransferredBytes: null,
  downloadTotalBytes: null,
  releaseNotes: null,
  message: '',
  errorKind: null,
  errorOperation: null,
  checkedAt: null,
  notification: null,
};

export const useAppUpdateStore = defineStore('appUpdate', {
  state: (): AppUpdateStoreState => ({
    ...DEFAULT_STATE,
    initialized: false,
    isElectron: typeof window !== 'undefined' && Boolean(window.electronAPI),
    lastErrorToastSignature: null,
  }),

  actions: {
    async initialize(): Promise<void> {
      if (this.initialized) {
        return;
      }

      this.isElectron = typeof window !== 'undefined' && Boolean(window.electronAPI);
      this.initialized = true;

      if (!this.isElectron || !window.electronAPI) {
        return;
      }

      if (updateStateCleanup) {
        updateStateCleanup();
      }

      updateStateCleanup = window.electronAPI.onAppUpdateState((payload) => {
        this.applyRemoteState(payload);
      });

      try {
        const initialState = await window.electronAPI.getAppUpdateState();
        this.applyRemoteState(initialState);
      } catch {
        const { addToast } = useToasts();
        addToast(t('settings.updates.store.initializeFailed'), 'error');
        this.applyRemoteState({
          ...DEFAULT_STATE,
          status: 'error',
          message: t('settings.updates.store.initializeFailed'),
          errorKind: 'unknown',
          errorOperation: 'updater-event',
          checkedAt: new Date().toISOString(),
        });
      }
    },

    async checkForUpdates(): Promise<void> {
      if (this.status === 'disabled' || !window.electronAPI?.checkForAppUpdates) {
        return;
      }

      try {
        const nextState = await window.electronAPI.checkForAppUpdates();
        this.applyRemoteState(nextState);
      } catch {
        this.applyRemoteState({
          ...DEFAULT_STATE,
          status: 'error',
          currentVersion: this.currentVersion,
          // A failed IPC call says nothing about the main-process channel facts; keep them.
          currentVersionIsPrerelease: this.currentVersionIsPrerelease,
          updateChannel: this.updateChannel,
          updateStaged: this.updateStaged,
          message: t('settings.updates.store.errors.unknown'),
          errorKind: 'unknown',
          errorOperation: 'manual-check',
          checkedAt: new Date().toISOString(),
        });
      }
    },

    async downloadUpdate(): Promise<void> {
      if (this.status === 'disabled' || !window.electronAPI?.downloadAppUpdate) {
        return;
      }

      try {
        const nextState = await window.electronAPI.downloadAppUpdate();
        this.applyRemoteState(nextState);
      } catch {
        this.applyRemoteState({
          status: 'error',
          message: t('settings.updates.store.errors.download'),
          errorKind: 'download',
          errorOperation: 'download',
          checkedAt: new Date().toISOString(),
        });
      }
    },

    async installUpdateAndRestart(): Promise<void> {
      if (this.status === 'disabled' || !window.electronAPI?.installAppUpdateAndRestart) {
        return;
      }

      this.applyRemoteState({
        status: 'installing',
        message: t('settings.updates.store.installingAndRestarting'),
        errorKind: null,
        errorOperation: null,
      });

      let result: { accepted: boolean };
      try {
        result = await window.electronAPI.installAppUpdateAndRestart();
      } catch {
        this.applyRemoteState({
          status: 'error',
          message: t('settings.updates.store.restartInstallFailed'),
          errorKind: 'install',
          errorOperation: 'install',
          checkedAt: new Date().toISOString(),
        });
        return;
      }

      if (!result.accepted) {
        this.applyRemoteState({
          status: 'downloaded',
          message: t('settings.updates.store.downloadedRestartToInstall'),
        });
        const { addToast } = useToasts();
        addToast(t('settings.updates.store.updateNotReadyToInstall'), 'info');
      }
    },

    async setUpdateChannel(channel: AppUpdateChannel): Promise<void> {
      if (this.status === 'disabled' || !window.electronAPI?.setAppUpdateChannel) {
        return;
      }

      const { addToast } = useToasts();
      try {
        const result = await window.electronAPI.setAppUpdateChannel(channel);
        if (!result.accepted) {
          // Refused while an update is busy or staged; the main process keeps its channel.
          return;
        }
        this.applyRemoteState(result.state);
        if (!result.persisted) {
          addToast(t('settings.updates.store.channelSaveFailed'), 'error');
        }
      } catch {
        addToast(t('settings.updates.store.errors.unknown'), 'error');
      }
    },

    /** The user saw the app update notification (the shell keeps its read state). */
    async markNotificationRead(): Promise<void> {
      if (!this.notification || this.notification.read || !window.electronAPI?.markAppUpdateNotificationRead) {
        return;
      }
      this.applyRemoteState(await window.electronAPI.markAppUpdateNotificationRead());
    },

    /** Removes the handled app update notification. */
    async clearNotification(): Promise<void> {
      if (!window.electronAPI?.clearAppUpdateNotification) {
        return;
      }
      this.applyRemoteState(await window.electronAPI.clearAppUpdateNotification());
    },

    applyRemoteState(payload: Partial<AppUpdateStatePayload>): void {
      const previousStatus = this.status;
      this.status = (payload.status ?? this.status) as AppUpdateStatus;
      this.currentVersion = payload.currentVersion ?? this.currentVersion;
      this.currentVersionIsPrerelease = payload.currentVersionIsPrerelease ?? this.currentVersionIsPrerelease;
      this.updateChannel = payload.updateChannel ?? this.updateChannel;
      this.updateStaged = payload.updateStaged ?? this.updateStaged;
      this.availableVersion = payload.availableVersion !== undefined ? payload.availableVersion : this.availableVersion;
      this.downloadPercent = payload.downloadPercent !== undefined ? payload.downloadPercent : this.downloadPercent;
      this.downloadTransferredBytes = payload.downloadTransferredBytes !== undefined
        ? payload.downloadTransferredBytes
        : this.downloadTransferredBytes;
      this.downloadTotalBytes = payload.downloadTotalBytes !== undefined
        ? payload.downloadTotalBytes
        : this.downloadTotalBytes;
      this.releaseNotes = payload.releaseNotes !== undefined ? payload.releaseNotes : this.releaseNotes;
      this.message = payload.message ?? '';
      this.errorKind = payload.errorKind !== undefined ? payload.errorKind : this.errorKind;
      this.errorOperation = payload.errorOperation !== undefined ? payload.errorOperation : this.errorOperation;
      if (payload.status && payload.status !== 'error') {
        this.errorKind = null;
        this.errorOperation = null;
      }
      this.checkedAt = payload.checkedAt ?? this.checkedAt;
      this.notification = payload.notification !== undefined ? payload.notification : this.notification;

      const isQuietError = isQuietStartupAppUpdateError(this);

      if (this.status !== 'error') {
        this.lastErrorToastSignature = null;
      }

      // Once per download: later broadcasts (for example marking the notification read) repeat the status.
      if (this.status === 'downloaded' && previousStatus !== 'downloaded') {
        const { addToast } = useToasts();
        addToast(t('settings.updates.store.downloadedRestartToInstall'), 'success');
      }

      if (this.status === 'error' && !isQuietError) {
        const signature = buildAppUpdateErrorToastSignature(this.errorKind, this.errorOperation, this.message);
        if (signature !== this.lastErrorToastSignature) {
          this.lastErrorToastSignature = signature;
          const { addToast } = useToasts();
          addToast(t(getAppUpdateErrorToastMessageKey(this.errorKind)), 'error');
        }
      }
    },
  },
});

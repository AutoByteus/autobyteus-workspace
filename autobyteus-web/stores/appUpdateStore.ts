import { defineStore } from 'pinia';
import { useToasts } from '~/composables/useToasts';

type Cleanup = () => void;

type AppUpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'no-update'
  | 'error';

type AppUpdateStatePayload = {
  status: AppUpdateStatus;
  currentVersion: string;
  availableVersion: string | null;
  downloadPercent: number | null;
  downloadTransferredBytes: number | null;
  downloadTotalBytes: number | null;
  releaseNotes: string | null;
  message: string;
  error: string | null;
  checkedAt: string | null;
};

let updateStateCleanup: Cleanup | null = null;
let noUpdateHideTimer: ReturnType<typeof setTimeout> | null = null;
const NO_UPDATE_HIDE_DELAY_MS = 3000;

function clearNoUpdateHideTimer(): void {
  if (!noUpdateHideTimer) {
    return;
  }
  clearTimeout(noUpdateHideTimer);
  noUpdateHideTimer = null;
}

interface AppUpdateStoreState extends AppUpdateStatePayload {
  initialized: boolean;
  isElectron: boolean;
  visible: boolean;
  dismissedVersion: string | null;
}

const DEFAULT_STATE: AppUpdateStatePayload = {
  status: 'idle',
  currentVersion: '',
  availableVersion: null,
  downloadPercent: null,
  downloadTransferredBytes: null,
  downloadTotalBytes: null,
  releaseNotes: null,
  message: '',
  error: null,
  checkedAt: null,
};

export const useAppUpdateStore = defineStore('appUpdate', {
  state: (): AppUpdateStoreState => ({
    ...DEFAULT_STATE,
    initialized: false,
    isElectron: typeof window !== 'undefined' && Boolean(window.electronAPI),
    visible: false,
    dismissedVersion: null,
  }),

  getters: {
    shouldShow(state): boolean {
      if (!state.isElectron) {
        return false;
      }

      if (!state.visible) {
        return false;
      }

      if (state.status === 'available' && state.availableVersion && state.availableVersion === state.dismissedVersion) {
        return false;
      }

      return true;
    },

    progressLabel(state): string {
      if (state.downloadPercent == null) {
        return '';
      }
      return `${Math.round(state.downloadPercent)}%`;
    },
  },

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
      } catch (error) {
        const { addToast } = useToasts();
        addToast('Failed to initialize app updates.', 'error');
        this.applyRemoteState({
          ...DEFAULT_STATE,
          status: 'error',
          message: 'Failed to initialize app updates.',
          error: error instanceof Error ? error.message : 'Unknown error',
          checkedAt: new Date().toISOString(),
        });
      }
    },

    async checkForUpdates(): Promise<void> {
      if (!window.electronAPI?.checkForAppUpdates) {
        return;
      }

      const nextState = await window.electronAPI.checkForAppUpdates();
      this.applyRemoteState(nextState);
    },

    async downloadUpdate(): Promise<void> {
      if (!window.electronAPI?.downloadAppUpdate) {
        return;
      }

      const nextState = await window.electronAPI.downloadAppUpdate();
      this.applyRemoteState(nextState);
    },

    async installUpdateAndRestart(): Promise<void> {
      if (!window.electronAPI?.installAppUpdateAndRestart) {
        return;
      }

      const result = await window.electronAPI.installAppUpdateAndRestart();
      if (!result.accepted) {
        const { addToast } = useToasts();
        addToast('Update is not ready to install yet.', 'info');
      }
    },

    dismissNotice(): void {
      clearNoUpdateHideTimer();
      this.visible = false;
      if (this.status === 'available' && this.availableVersion) {
        this.dismissedVersion = this.availableVersion;
      }
    },

    applyRemoteState(payload: Partial<AppUpdateStatePayload>): void {
      this.status = (payload.status ?? this.status) as AppUpdateStatus;
      this.currentVersion = payload.currentVersion ?? this.currentVersion;
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
      this.error = payload.error !== undefined ? payload.error : this.error;
      this.checkedAt = payload.checkedAt ?? this.checkedAt;
      clearNoUpdateHideTimer();

      if (this.status === 'available') {
        if (!this.availableVersion || this.availableVersion !== this.dismissedVersion) {
          this.visible = true;
        }
      } else if (this.status === 'downloading' || this.status === 'downloaded' || this.status === 'checking' || this.status === 'error') {
        this.visible = true;
      } else if (this.status === 'no-update') {
        this.visible = true;
        noUpdateHideTimer = setTimeout(() => {
          if (this.status === 'no-update') {
            this.visible = false;
          }
          noUpdateHideTimer = null;
        }, NO_UPDATE_HIDE_DELAY_MS);
      }

      if (this.status === 'downloaded') {
        const { addToast } = useToasts();
        addToast('Update downloaded. Restart to install.', 'success');
      }

      if (this.status === 'error' && this.error) {
        const { addToast } = useToasts();
        addToast(`Update error: ${this.error}`, 'error');
      }
    },
  },
});

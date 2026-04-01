import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { PreviewHostBounds, PreviewShellSessionSummary, PreviewShellSnapshot } from '~/types/previewShell';

export const usePreviewShellStore = defineStore('previewShell', () => {
  const initialized = ref(false);
  const previewVisible = ref(false);
  const activePreviewSessionId = ref<string | null>(null);
  const sessions = ref<PreviewShellSessionSummary[]>([]);
  const lastError = ref<string | null>(null);
  let snapshotCleanup: (() => void) | null = null;

  const applySnapshot = (snapshot: PreviewShellSnapshot): void => {
    previewVisible.value = snapshot.previewVisible;
    activePreviewSessionId.value = snapshot.activePreviewSessionId;
    sessions.value = [...snapshot.sessions];
    lastError.value = null;
  };

  const guardElectronApi = (): boolean => {
    return Boolean(window.electronAPI?.getPreviewShellSnapshot);
  };

  const initialize = async (): Promise<void> => {
    if (initialized.value) {
      return;
    }

    initialized.value = true;
    if (!process.client || !guardElectronApi()) {
      return;
    }

    snapshotCleanup?.();
    snapshotCleanup = window.electronAPI!.onPreviewShellSnapshotUpdated((snapshot) => {
      applySnapshot(snapshot);
    });

    try {
      applySnapshot(await window.electronAPI!.getPreviewShellSnapshot());
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error);
    }
  };

  const focusSession = async (previewSessionId: string): Promise<void> => {
    await initialize();
    if (!window.electronAPI?.focusPreviewSession) {
      return;
    }

    try {
      applySnapshot(await window.electronAPI.focusPreviewSession(previewSessionId));
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error);
    }
  };

  const setActiveSession = async (previewSessionId: string): Promise<void> => {
    await initialize();
    if (!window.electronAPI?.setActivePreviewSession) {
      return;
    }

    try {
      applySnapshot(await window.electronAPI.setActivePreviewSession(previewSessionId));
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error);
    }
  };

  const updateHostBounds = async (bounds: PreviewHostBounds | null): Promise<void> => {
    await initialize();
    if (!window.electronAPI?.updatePreviewHostBounds) {
      return;
    }

    try {
      applySnapshot(await window.electronAPI.updatePreviewHostBounds(bounds));
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error);
    }
  };

  const closeSession = async (previewSessionId: string): Promise<void> => {
    await initialize();
    if (!window.electronAPI?.closePreviewShellSession) {
      return;
    }

    try {
      applySnapshot(await window.electronAPI.closePreviewShellSession(previewSessionId));
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error);
    }
  };

  return {
    initialized,
    previewVisible,
    activePreviewSessionId,
    sessions,
    lastError,
    initialize,
    focusSession,
    setActiveSession,
    updateHostBounds,
    closeSession,
  };
});


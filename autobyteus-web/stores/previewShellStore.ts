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

  const areSessionsEqual = (
    left: PreviewShellSessionSummary[],
    right: PreviewShellSessionSummary[],
  ): boolean => {
    if (left.length !== right.length) {
      return false;
    }

    return left.every((session, index) => {
      const candidate = right[index];
      return (
        candidate?.preview_session_id === session.preview_session_id &&
        candidate?.title === session.title &&
        candidate?.url === session.url
      );
    });
  };

  const applySnapshot = (snapshot: PreviewShellSnapshot): void => {
    const nextPreviewVisible = Boolean(snapshot.previewVisible);
    const nextActivePreviewSessionId =
      typeof snapshot.activePreviewSessionId === 'string' && snapshot.activePreviewSessionId.trim().length > 0
        ? snapshot.activePreviewSessionId
        : null;
    const nextSessions = Array.isArray(snapshot.sessions) ? [...snapshot.sessions] : [];

    if (
      previewVisible.value === nextPreviewVisible &&
      activePreviewSessionId.value === nextActivePreviewSessionId &&
      areSessionsEqual(sessions.value, nextSessions)
    ) {
      lastError.value = null;
      return;
    }

    previewVisible.value = nextPreviewVisible;
    activePreviewSessionId.value = nextActivePreviewSessionId;
    sessions.value = nextSessions;
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

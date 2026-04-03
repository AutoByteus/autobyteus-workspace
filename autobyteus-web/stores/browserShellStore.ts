import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type {
  BrowserHostBounds,
  BrowserShellNavigateTabRequest,
  BrowserShellOpenTabRequest,
  BrowserShellReloadTabRequest,
  BrowserShellTabSummary,
  BrowserShellSnapshot,
} from '~/types/browserShell';

export const useBrowserShellStore = defineStore('browserShell', () => {
  const hasElectronBrowserShellApi = (): boolean => {
    return Boolean(window.electronAPI?.getBrowserShellSnapshot);
  };

  const initialized = ref(false);
  const browserAvailable = ref(process.client ? hasElectronBrowserShellApi() : false);
  const activeTabId = ref<string | null>(null);
  const sessions = ref<BrowserShellTabSummary[]>([]);
  const lastError = ref<string | null>(null);
  let snapshotCleanup: (() => void) | null = null;

  const areSessionsEqual = (
    left: BrowserShellTabSummary[],
    right: BrowserShellTabSummary[],
  ): boolean => {
    if (left.length !== right.length) {
      return false;
    }

    return left.every((session, index) => {
      const candidate = right[index];
      return (
        candidate?.tab_id === session.tab_id &&
        candidate?.title === session.title &&
        candidate?.url === session.url
      );
    });
  };

  const applySnapshot = (snapshot: BrowserShellSnapshot): void => {
    const nextActiveBrowserTabId =
      typeof snapshot.activeTabId === 'string' && snapshot.activeTabId.trim().length > 0
        ? snapshot.activeTabId
        : null;
    const nextSessions = Array.isArray(snapshot.sessions) ? [...snapshot.sessions] : [];

    if (
      activeTabId.value === nextActiveBrowserTabId &&
      areSessionsEqual(sessions.value, nextSessions)
    ) {
      lastError.value = null;
      return;
    }

    activeTabId.value = nextActiveBrowserTabId;
    sessions.value = nextSessions;
    lastError.value = null;
  };

  const guardElectronApi = (): boolean => {
    return Boolean(window.electronAPI?.getBrowserShellSnapshot);
  };

  const initialize = async (): Promise<void> => {
    if (initialized.value) {
      return;
    }

    initialized.value = true;
    browserAvailable.value = process.client ? guardElectronApi() : false;
    if (!process.client || !browserAvailable.value) {
      return;
    }

    snapshotCleanup?.();
    snapshotCleanup = window.electronAPI!.onBrowserShellSnapshotUpdated((snapshot) => {
      applySnapshot(snapshot);
    });

    try {
      applySnapshot(await window.electronAPI!.getBrowserShellSnapshot());
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error);
    }
  };

  const openTab = async (request: BrowserShellOpenTabRequest): Promise<void> => {
    await initialize();
    if (!window.electronAPI?.openBrowserTab) {
      return;
    }

    try {
      applySnapshot(await window.electronAPI.openBrowserTab(request));
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error);
    }
  };

  const navigateTab = async (request: BrowserShellNavigateTabRequest): Promise<void> => {
    await initialize();
    if (!window.electronAPI?.navigateBrowserTab) {
      return;
    }

    try {
      applySnapshot(await window.electronAPI.navigateBrowserTab(request));
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error);
    }
  };

  const reloadTab = async (request: BrowserShellReloadTabRequest): Promise<void> => {
    await initialize();
    if (!window.electronAPI?.reloadBrowserTab) {
      return;
    }

    try {
      applySnapshot(await window.electronAPI.reloadBrowserTab(request));
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error);
    }
  };

  const focusSession = async (browserSessionId: string): Promise<void> => {
    await initialize();
    if (!window.electronAPI?.focusBrowserTab) {
      return;
    }

    try {
      applySnapshot(await window.electronAPI.focusBrowserTab(browserSessionId));
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error);
    }
  };

  const setActiveSession = async (browserSessionId: string): Promise<void> => {
    await initialize();
    if (!window.electronAPI?.setActiveBrowserTab) {
      return;
    }

    try {
      applySnapshot(await window.electronAPI.setActiveBrowserTab(browserSessionId));
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error);
    }
  };

  const updateHostBounds = async (bounds: BrowserHostBounds | null): Promise<void> => {
    await initialize();
    if (!window.electronAPI?.updateBrowserHostBounds) {
      return;
    }

    try {
      applySnapshot(await window.electronAPI.updateBrowserHostBounds(bounds));
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error);
    }
  };

  const closeSession = async (browserSessionId: string): Promise<void> => {
    await initialize();
    if (!window.electronAPI?.closeBrowserShellSession) {
      return;
    }

    try {
      applySnapshot(await window.electronAPI.closeBrowserShellSession(browserSessionId));
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error);
    }
  };

  const activeSession = computed<BrowserShellTabSummary | null>(() => {
    if (!activeTabId.value) {
      return null;
    }
    return sessions.value.find((session) => session.tab_id === activeTabId.value) ?? null;
  });

  return {
    initialized,
    browserAvailable,
    activeTabId,
    activeSession,
    sessions,
    lastError,
    initialize,
    openTab,
    navigateTab,
    reloadTab,
    focusSession,
    setActiveSession,
    updateHostBounds,
    closeSession,
  };
});

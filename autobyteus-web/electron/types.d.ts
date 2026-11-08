import type {
  AppUpdateAutoCheck,
  AppUpdateAutomaticChangeResult,
  AppUpdateChannel,
  AppUpdateChannelChangeResult,
  AppUpdateState,
} from '../shared/appUpdateTypes';
import type { NodeAutoUpdateEntries } from '../shared/nodeAutoUpdateTypes';
import type { NodeAccessActionResult, NodeAccessStates } from '../shared/nodeAccessTypes';
import type {
  NodeRegistryChange,
  NodeRegistrySnapshot,
  WindowNodeContext,
} from './nodeRegistryTypes';
import type {
  BrowserHostBounds,
  BrowserShellNavigateTabRequest,
  BrowserShellOpenTabRequest,
  BrowserShellReloadTabRequest,
  BrowserShellSetDeviceEmulationRequest,
  BrowserShellSnapshot,
} from '../types/browserShell';
import type { ServerHealthResult, ServerStatusSnapshot } from '../types/serverStatus';

type Cleanup = () => void;

interface Window {
  electronAPI?: {
    sendPing: (message: string) => void;
    onPong: (callback: (response: string) => void) => void;

    getServerStatus: () => Promise<ServerStatusSnapshot>;
    restartServer: () => Promise<ServerStatusSnapshot>;
    onServerStatus: (callback: (status: ServerStatusSnapshot) => void) => Cleanup;
    checkServerHealth: () => Promise<ServerHealthResult>;

    openNodeWindow: (entryId: string) => Promise<{ windowId: number; created: boolean }>;
    focusNodeWindow: (entryId: string) => Promise<{ focused: boolean; reason?: string }>;
    listNodeWindows: () => Promise<Array<{ windowId: number; entryId: string }>>;
    getWindowContext: () => Promise<WindowNodeContext>;
    upsertNodeRegistry: (change: NodeRegistryChange) => Promise<NodeRegistrySnapshot>;
    getNodeRegistrySnapshot: () => Promise<NodeRegistrySnapshot>;
    onNodeRegistryUpdated: (callback: (snapshot: NodeRegistrySnapshot) => void) => Cleanup;
    getBrowserShellSnapshot: () => Promise<BrowserShellSnapshot>;
    openBrowserTab: (request: BrowserShellOpenTabRequest) => Promise<BrowserShellSnapshot>;
    navigateBrowserTab: (request: BrowserShellNavigateTabRequest) => Promise<BrowserShellSnapshot>;
    reloadBrowserTab: (request: BrowserShellReloadTabRequest) => Promise<BrowserShellSnapshot>;
    focusBrowserTab: (browserSessionId: string) => Promise<BrowserShellSnapshot>;
    setActiveBrowserTab: (browserSessionId: string) => Promise<BrowserShellSnapshot>;
    updateBrowserHostBounds: (bounds: BrowserHostBounds | null) => Promise<BrowserShellSnapshot>;
    setBrowserDeviceEmulation: (
      request: BrowserShellSetDeviceEmulationRequest,
    ) => Promise<BrowserShellSnapshot>;
    closeBrowserShellSession: (browserSessionId: string) => Promise<BrowserShellSnapshot>;
    onBrowserShellSnapshotUpdated: (callback: (snapshot: BrowserShellSnapshot) => void) => Cleanup;
    getAppUpdateState: () => Promise<AppUpdateState>;
    checkForAppUpdates: () => Promise<AppUpdateState>;
    downloadAppUpdate: () => Promise<AppUpdateState>;
    installAppUpdateAndRestart: () => Promise<{ accepted: boolean }>;
    setAppUpdateChannel: (channel: AppUpdateChannel) => Promise<AppUpdateChannelChangeResult>;
    setAppUpdateAutomatic: (enabled: boolean) => Promise<AppUpdateAutomaticChangeResult>;
    markAppUpdateNotificationRead: () => Promise<AppUpdateState>;
    clearAppUpdateNotification: () => Promise<AppUpdateState>;
    setAppUpdateAutoCheck: (settings: AppUpdateAutoCheck) => Promise<AppUpdateState>;
    onAppUpdateState: (callback: (updateState: AppUpdateState) => void) => Cleanup;
    getNodeAutoUpdateState: () => Promise<NodeAutoUpdateEntries>;
    markNodeAutoUpdateRead: (entryId: string) => Promise<NodeAutoUpdateEntries>;
    recheckNodeAutoUpdate: (entryId: string) => Promise<void>;
    onNodeAutoUpdateChanged: (callback: (entries: NodeAutoUpdateEntries) => void) => Cleanup;
    getNodeAccessStates: () => Promise<NodeAccessStates>;
    connectNode: (entryId: string, setupCode: string) => Promise<NodeAccessActionResult>;
    disconnectNode: (entryId: string) => Promise<NodeAccessActionResult>;
    onNodeAccessChanged: (callback: (states: NodeAccessStates) => void) => Cleanup;

    getLogFilePath: () => Promise<string>;
    openLogFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
    openExternalLink: (url: string) => Promise<{ success: boolean; error?: string }>;
    readLogFile: (
      filePath: string,
    ) => Promise<{ success: boolean; error?: string; content?: string; filePath?: string }>;
    readLocalTextFile: (
      filePath: string,
    ) => Promise<{
      success: boolean;
      error?: string;
      errorCode?: 'invalid-path' | 'unavailable' | 'not-regular-file' | 'unreadable';
      content?: string;
    }>;

    getPlatform: () => Promise<'win32' | 'linux' | 'darwin'>;
    getAppLocale: () => Promise<string>;
    onAppQuitting: (callback: () => void) => Cleanup;
    startShutdown: () => void;
    resetServerData: () => Promise<{ success: boolean; error?: string }>;
    showFolderDialog: () => Promise<{ canceled: boolean; path: string | null; error?: string }>;
    getPathForFile: (file: File) => Promise<string | null>;
  };
}

export {};

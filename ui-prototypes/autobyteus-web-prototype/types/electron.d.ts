import type { AppUpdateState } from '../shared/appUpdateTypes';
import type { ServerHealthResult, ServerStatusSnapshot } from './serverStatus';
import type {
  NodeRegistryChange,
  NodeRegistrySnapshot,
  WindowNodeContext,
} from './node';
import type {
  BrowserHostBounds,
  BrowserShellNavigateTabRequest,
  BrowserShellOpenTabRequest,
  BrowserShellReloadTabRequest,
  BrowserShellSetDeviceEmulationRequest,
  BrowserShellSnapshot,
} from './browserShell';
import type {
  ExtensionId,
  ManagedExtensionState,
  UpdateVoiceInputSettingsPayload,
  VoiceInputTranscriptionRequest,
  VoiceInputTranscriptionResult,
} from '../electron/extensions/types';

type Cleanup = () => void;

export {};

declare global {
  interface Window {
    electronAPI: {
      sendPing: (message: string) => void;
      onPong: (callback: (response: string) => void) => void;

      getServerStatus: () => Promise<ServerStatusSnapshot>;
      restartServer: () => Promise<ServerStatusSnapshot>;
      onServerStatus: (callback: (status: ServerStatusSnapshot) => void) => Cleanup;
      checkServerHealth: () => Promise<ServerHealthResult>;

      openNodeWindow: (nodeId: string) => Promise<{ windowId: number; created: boolean }>;
      focusNodeWindow: (nodeId: string) => Promise<{ focused: boolean; reason?: string }>;
      listNodeWindows: () => Promise<Array<{ windowId: number; nodeId: string }>>;
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
      onAppUpdateState: (callback: (updateState: AppUpdateState) => void) => Cleanup;

      getLogFilePath: () => Promise<string>;
      openLogFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
      openExternalLink: (url: string) => Promise<{ success: boolean; error?: string }>;
      readLogFile: (
        filePath: string,
      ) => Promise<{ success: boolean; content?: string; filePath?: string; error?: string }>;
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
      getExtensionsState: () => Promise<ManagedExtensionState[]>;
      installExtension: (extensionId: ExtensionId) => Promise<ManagedExtensionState[]>;
      enableExtension: (extensionId: ExtensionId) => Promise<ManagedExtensionState[]>;
      disableExtension: (extensionId: ExtensionId) => Promise<ManagedExtensionState[]>;
      updateVoiceInputSettings: (
        extensionId: ExtensionId,
        payload: UpdateVoiceInputSettingsPayload,
      ) => Promise<ManagedExtensionState[]>;
      removeExtension: (extensionId: ExtensionId) => Promise<ManagedExtensionState[]>;
      reinstallExtension: (extensionId: ExtensionId) => Promise<ManagedExtensionState[]>;
      openExtensionFolder: (extensionId: ExtensionId) => Promise<{ success: boolean; error?: string }>;
      transcribeVoiceInput: (request: VoiceInputTranscriptionRequest) => Promise<VoiceInputTranscriptionResult>;
    };
  }
}

import type {
  NodeRegistryChange,
  NodeRegistrySnapshot,
  RemoteBrowserBridgeDescriptor,
  RemoteBrowserSharingSettings,
  RemoteBrowserSharingSettingsResult,
  WindowNodeContext,
} from './node';
import type {
  ExtensionId,
  ManagedExtensionState,
  UpdateVoiceInputSettingsPayload,
  VoiceInputTranscriptionRequest,
  VoiceInputTranscriptionResult,
} from '../electron/extensions/types';

type Cleanup = () => void;

type AppUpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'installing'
  | 'no-update'
  | 'error';

type AppUpdateState = {
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

type ServerStatusPayload = {
  status: 'starting' | 'running' | 'error' | 'restarting' | 'shutting-down';
  port: number;
  urls: Record<string, string>;
  message?: string;
  isExternalServerDetected?: boolean;
};

type ServerHealthPayload = {
  status: 'ok' | 'error';
  data?: any;
  message?: string;
  isExternalServerDetected?: boolean;
};

export {};

declare global {
  interface Window {
    electronAPI: {
      sendPing: (message: string) => void;
      onPong: (callback: (response: string) => void) => void;

      getServerStatus: () => Promise<ServerStatusPayload>;
      restartServer: () => Promise<ServerStatusPayload>;
      onServerStatus: (callback: (status: ServerStatusPayload) => void) => Cleanup;
      checkServerHealth: () => Promise<ServerHealthPayload>;

      openNodeWindow: (nodeId: string) => Promise<{ windowId: number; created: boolean }>;
      focusNodeWindow: (nodeId: string) => Promise<{ focused: boolean; reason?: string }>;
      listNodeWindows: () => Promise<Array<{ windowId: number; nodeId: string }>>;
      getWindowContext: () => Promise<WindowNodeContext>;
      upsertNodeRegistry: (change: NodeRegistryChange) => Promise<NodeRegistrySnapshot>;
      getNodeRegistrySnapshot: () => Promise<NodeRegistrySnapshot>;
      onNodeRegistryUpdated: (callback: (snapshot: NodeRegistrySnapshot) => void) => Cleanup;
      getRemoteBrowserSharingSettings: () => Promise<RemoteBrowserSharingSettings>;
      updateRemoteBrowserSharingSettings: (
        settings: RemoteBrowserSharingSettings,
      ) => Promise<RemoteBrowserSharingSettingsResult>;
      issueRemoteBrowserBridgeDescriptor: (nodeId: string) => Promise<RemoteBrowserBridgeDescriptor>;
      confirmRemoteBrowserBridgeDescriptor: (nodeId: string) => Promise<{ ok: true }>;
      revokeRemoteBrowserBridgeDescriptor: (
        nodeId: string,
        state: 'revoked' | 'expired' | 'rejected',
        errorMessage?: string | null,
      ) => Promise<{ ok: true }>;
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
      ) => Promise<{ success: boolean; error?: string; content?: string }>;

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

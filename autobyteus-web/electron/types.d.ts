import type {
  NodeRegistryChange,
  NodeRegistrySnapshot,
  WindowNodeContext,
} from './nodeRegistryTypes';

type Cleanup = () => void;

interface Window {
  electronAPI?: {
    sendPing: (message: string) => void;
    onPong: (callback: (response: string) => void) => void;

    getServerStatus: () => Promise<any>;
    restartServer: () => Promise<any>;
    onServerStatus: (callback: (status: any) => void) => Cleanup;
    checkServerHealth: () => Promise<any>;

    openNodeWindow: (nodeId: string) => Promise<{ windowId: number; created: boolean }>;
    focusNodeWindow: (nodeId: string) => Promise<{ focused: boolean; reason?: string }>;
    listNodeWindows: () => Promise<Array<{ windowId: number; nodeId: string }>>;
    getWindowContext: () => Promise<WindowNodeContext>;
    upsertNodeRegistry: (change: NodeRegistryChange) => Promise<NodeRegistrySnapshot>;
    getNodeRegistrySnapshot: () => Promise<NodeRegistrySnapshot>;
    onNodeRegistryUpdated: (callback: (snapshot: NodeRegistrySnapshot) => void) => Cleanup;

    getLogFilePath: () => Promise<string>;
    openLogFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
    openExternalLink: (url: string) => Promise<{ success: boolean; error?: string }>;
    readLogFile: (
      filePath: string,
    ) => Promise<{ success: boolean; error?: string; content?: string; filePath?: string }>;
    readLocalTextFile: (
      filePath: string,
    ) => Promise<{ success: boolean; error?: string; content?: string }>;

    getPlatform: () => Promise<'win32' | 'linux' | 'darwin'>;
    onAppQuitting: (callback: () => void) => Cleanup;
    startShutdown: () => void;
    resetServerData: () => Promise<{ success: boolean; error?: string }>;
    showFolderDialog: () => Promise<{ canceled: boolean; path: string | null; error?: string }>;
    getPathForFile: (file: File) => Promise<string | null>;
  };
}

export {};

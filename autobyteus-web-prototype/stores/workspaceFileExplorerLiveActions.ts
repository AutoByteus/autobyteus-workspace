import { FileExplorerStreamingService } from '~/services/fileExplorerStreaming/FileExplorerStreamingService';
import { useFileExplorerStore } from '~/stores/fileExplorer';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { getOpenFolderPathsForRefresh } from '~/utils/fileExplorer/openFolderRefresh';
import type { FileSystemChangeEvent } from '~/types/fileSystemChangeTypes';
import type { FetchFolderChildrenOptions } from '~/stores/fileExplorerTreeActions';

interface WorkspaceLiveHost {
  fileSystemConnections: Map<string, FileExplorerStreamingService>;
  fileExplorerLiveConsumers: Map<string, Set<string>>;
  fileExplorerSnapshotRefreshes: Map<string, Promise<void>>;
  handleFileSystemChange(
    workspaceId: string,
    event: FileSystemChangeEvent,
    source?: 'mutation' | 'stream',
  ): void;
  fetchFolderChildren(
    workspaceId: string,
    folderPath: string,
    options?: FetchFolderChildrenOptions,
  ): Promise<void>;
}

export const acquireFileExplorerLiveSessionForStore = (
  store: WorkspaceLiveHost,
  workspaceId: string,
  consumerId: string,
): (() => void) => {
  if (!workspaceId || !consumerId) {
    return () => undefined;
  }

  let consumers = store.fileExplorerLiveConsumers.get(workspaceId);
  if (!consumers) {
    consumers = new Set();
    store.fileExplorerLiveConsumers.set(workspaceId, consumers);
  }

  const alreadyRegistered = consumers.has(consumerId);
  consumers.add(consumerId);
  if (!alreadyRegistered && consumers.size === 1) {
    connectFileExplorerLiveStreamForStore(store, workspaceId);
    refreshFileExplorerSnapshotForStore(store, workspaceId);
  }

  return () => releaseFileExplorerLiveSessionForStore(store, workspaceId, consumerId);
};

export const releaseFileExplorerLiveSessionForStore = (
  store: WorkspaceLiveHost,
  workspaceId: string,
  consumerId: string,
): void => {
  const consumers = store.fileExplorerLiveConsumers.get(workspaceId);
  if (!consumers) {
    return;
  }

  consumers.delete(consumerId);
  if (consumers.size === 0) {
    const fileExplorerStore = useFileExplorerStore();
    store.fileExplorerLiveConsumers.delete(workspaceId);
    fileExplorerStore.abortSearch(workspaceId);
    fileExplorerStore.invalidateFolderChildrenGeneration(workspaceId);
    store.fileExplorerSnapshotRefreshes.delete(workspaceId);
    disconnectFileExplorerLiveStreamForStore(store, workspaceId);
  }
};

export const connectFileExplorerLiveStreamForStore = (
  store: WorkspaceLiveHost,
  workspaceId: string,
): void => {
  if (store.fileSystemConnections.has(workspaceId)) {
    return;
  }

  console.log(`[Workspace] Connecting to file system changes for workspace: ${workspaceId}`);
  const windowNodeContextStore = useWindowNodeContextStore();
  const wsEndpoint = windowNodeContextStore.getBoundEndpoints().fileExplorerWs;
  let refreshSnapshotOnReconnect = false;

  const service = new FileExplorerStreamingService(wsEndpoint, {
    onFileSystemChange: (event: FileSystemChangeEvent) => {
      console.log(`[Workspace] Received file system change for ${workspaceId}:`, event);
      store.handleFileSystemChange(workspaceId, event, 'stream');
    },
    onConnect: (sessionId: string) => {
      console.log(`[Workspace] Connected to file system changes: ${sessionId}`);
      if (!refreshSnapshotOnReconnect) {
        return;
      }

      refreshSnapshotOnReconnect = false;
      if (store.fileExplorerLiveConsumers.has(workspaceId)) {
        void refreshFileExplorerSnapshotForStore(store, workspaceId);
      }
    },
    onDisconnect: (reason?: string) => {
      console.log(`[Workspace] Disconnected from file system changes: ${reason}`);
      refreshSnapshotOnReconnect = true;
    },
    onError: (error: Error) => {
      console.error(`[Workspace] File system WebSocket error for ${workspaceId}:`, error);
    },
  });

  service.connect(workspaceId);
  store.fileSystemConnections.set(workspaceId, service);
};

export const disconnectFileExplorerLiveStreamForStore = (
  store: WorkspaceLiveHost,
  workspaceId: string,
): void => {
  const service = store.fileSystemConnections.get(workspaceId);
  if (!service) {
    return;
  }
  service.disconnect();
  store.fileSystemConnections.delete(workspaceId);
  console.log(`[Workspace] Disconnected from file system watcher for workspace: ${workspaceId}`);
};

export const disconnectAllFileExplorerLiveStreamsForStore = (
  store: WorkspaceLiveHost,
): void => {
  const fileExplorerStore = useFileExplorerStore();
  const workspaceIds = new Set([
    ...store.fileSystemConnections.keys(),
    ...store.fileExplorerLiveConsumers.keys(),
    ...store.fileExplorerSnapshotRefreshes.keys(),
  ]);
  for (const workspaceId of workspaceIds) {
    disconnectFileExplorerLiveStreamForStore(store, workspaceId);
    fileExplorerStore.abortSearch(workspaceId);
    fileExplorerStore.invalidateFolderChildrenGeneration(workspaceId);
  }
  store.fileExplorerLiveConsumers.clear();
  store.fileExplorerSnapshotRefreshes.clear();
};

export const clearFileExplorerLiveSessionForWorkspaceForStore = (
  store: WorkspaceLiveHost,
  workspaceId: string,
): void => {
  const fileExplorerStore = useFileExplorerStore();
  store.fileExplorerLiveConsumers.delete(workspaceId);
  fileExplorerStore.abortSearch(workspaceId);
  fileExplorerStore.invalidateFolderChildrenGeneration(workspaceId);
  store.fileExplorerSnapshotRefreshes.delete(workspaceId);
  disconnectFileExplorerLiveStreamForStore(store, workspaceId);
};

export const refreshFileExplorerSnapshotForStore = (
  store: WorkspaceLiveHost,
  workspaceId: string,
): Promise<void> => {
  const activeRefresh = store.fileExplorerSnapshotRefreshes.get(workspaceId);
  if (activeRefresh) {
    return activeRefresh;
  }

  const fileExplorerStore = useFileExplorerStore();
  const generation = fileExplorerStore.beginFolderChildrenGeneration(workspaceId);
  const openFolderPaths = getOpenFolderPathsForRefresh(
    fileExplorerStore._getWorkspaceState(workspaceId)?.openFolders || {},
  );
  const refreshTask = (async () => {
    await store.fetchFolderChildren(workspaceId, '', { generation });
    if (!fileExplorerStore.isFolderChildrenGenerationCurrent(workspaceId, generation)) {
      return;
    }
    for (const folderPath of openFolderPaths) {
      if (!fileExplorerStore.isFolderChildrenGenerationCurrent(workspaceId, generation)) {
        return;
      }
      await store.fetchFolderChildren(workspaceId, folderPath, { generation });
    }
  })()
    .catch((error) => {
      console.warn(`[Workspace] Failed to refresh file explorer snapshot for ${workspaceId}:`, error);
    })
    .finally(() => {
      if (store.fileExplorerSnapshotRefreshes.get(workspaceId) === refreshTask) {
        store.fileExplorerSnapshotRefreshes.delete(workspaceId);
      }
    });
  store.fileExplorerSnapshotRefreshes.set(workspaceId, refreshTask);
  return refreshTask;
};

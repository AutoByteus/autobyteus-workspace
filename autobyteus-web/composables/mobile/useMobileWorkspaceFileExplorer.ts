import { computed, onBeforeUnmount, ref, unref, watch, type MaybeRef } from 'vue';
import { useWorkspaceFileExplorer } from '~/composables/useWorkspaceFileExplorer';
import { useFileExplorerStore } from '~/stores/fileExplorer';
import type { OpenFileState } from '~/stores/fileExplorerState';
import { useWorkspaceStore } from '~/stores/workspace';
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata';
import { normalizeWorkspaceRootPath } from '~/utils/workspaceMetadata';

export type MobileWorkspaceResolutionStatus = 'no-workspace-context' | 'resolving' | 'resolved' | 'unresolved';

export interface MobileWorkspaceFileNode {
  name: string;
  path: string;
  is_file: boolean;
  children: MobileWorkspaceFileNode[];
  id: string;
  childrenLoaded?: boolean;
}

export interface MobileResolvedWorkspace {
  workspaceId: string;
  name: string;
  displayName?: string;
  absolutePath: string | null;
  workspaceRootPath: string | null;
  kind?: string | null;
}

function normalizeMobileWorkspaceRoot(value: string | null | undefined): string {
  return normalizeWorkspaceRootPath(value);
}

const formatError = (error: unknown): string => (
  error instanceof Error ? error.message : String(error)
);

const metadataDisplayName = (metadata: WorkspaceMetadata | null): string => (
  metadata?.displayName || metadata?.workspaceRootPath?.split(/[\\/]/).filter(Boolean).at(-1) || metadata?.workspaceId || 'Workspace'
);

/** The open agent's folder (`activeWorkspaceTarget.workspaceRootPath`): its tree, its search and its files, read only. */
export function useMobileWorkspaceFileExplorer(workspaceRootPathRef: MaybeRef<string | null>) {
  const workspaceStore = useWorkspaceStore();
  const fileExplorerStore = useFileExplorerStore();
  const activeWorkspaceId = ref('');
  const activeWorkspaceMetadata = ref<WorkspaceMetadata | null>(null);
  const resolvingKey = ref<string | null>(null);
  const workspaceResolutionError = ref<string | null>(null);
  const folderLoadingByPath = ref<Record<string, boolean>>({});
  const folderErrorByPath = ref<Record<string, string | null>>({});
  const fileOpenErrorByPath = ref<Record<string, string | null>>({});
  const explorer = useWorkspaceFileExplorer(activeWorkspaceId);
  let resolutionSequence = 0;
  let releaseLiveSession: (() => void) | null = null;
  let rootLoadAbortController: AbortController | null = null;

  const requestedRootPath = computed(() => normalizeMobileWorkspaceRoot(unref(workspaceRootPathRef)));

  const workspace = computed<MobileResolvedWorkspace | null>(() => {
    const id = activeWorkspaceId.value || activeWorkspaceMetadata.value?.workspaceId || '';
    if (!id) return null;
    const registered = workspaceStore.workspaces[id];
    const metadata = activeWorkspaceMetadata.value;
    const rootPath = registered?.workspaceRootPath
      || registered?.absolutePath
      || metadata?.workspaceRootPath
      || null;
    return {
      workspaceId: id,
      name: registered?.name || metadataDisplayName(metadata),
      displayName: registered?.displayName || metadata?.displayName || metadataDisplayName(metadata),
      absolutePath: registered?.absolutePath ?? rootPath,
      workspaceRootPath: rootPath,
      kind: registered?.kind || metadata?.kind || 'filesystem',
    };
  });

  const resolutionStatus = computed<MobileWorkspaceResolutionStatus>(() => {
    if (!requestedRootPath.value) return 'no-workspace-context';
    if (resolvingKey.value) return 'resolving';
    if (activeWorkspaceId.value) return 'resolved';
    return 'unresolved';
  });

  const tree = computed<MobileWorkspaceFileNode | null>(() => explorer.tree.value as MobileWorkspaceFileNode | null);
  const searchResults = computed<MobileWorkspaceFileNode[]>(() => explorer.searchResults.value as MobileWorkspaceFileNode[]);
  const isSearchLoading = explorer.isSearchLoading;
  const searchError = explorer.searchError;

  const releaseCurrentLiveSession = () => {
    releaseLiveSession?.();
    releaseLiveSession = null;
  };

  const abortCurrentRootLoad = () => {
    rootLoadAbortController?.abort();
    rootLoadAbortController = null;
  };

  const resolveContextWorkspaceMetadata = async (): Promise<WorkspaceMetadata | null> => {
    const rootPath = requestedRootPath.value;
    return rootPath ? workspaceStore.resolveWorkspaceMetadataByRootPath(rootPath) : null;
  };

  async function resolveWorkspaceForContext(): Promise<void> {
    const root = requestedRootPath.value;
    const key = root;
    if (resolvingKey.value === key) return;

    const sequence = ++resolutionSequence;
    abortCurrentRootLoad();
    releaseCurrentLiveSession();
    activeWorkspaceId.value = '';
    activeWorkspaceMetadata.value = null;
    resolvingKey.value = null;
    workspaceResolutionError.value = null;
    folderLoadingByPath.value = {};
    folderErrorByPath.value = {};
    fileOpenErrorByPath.value = {};

    if (!root) return;

    resolvingKey.value = key;
    try {
      const metadata = await resolveContextWorkspaceMetadata();
      if (sequence !== resolutionSequence) return;
      if (!metadata) {
        workspaceResolutionError.value = `Workspace at ${root} could not be resolved.`;
        return;
      }

      const registered = await workspaceStore.ensureWorkspaceMetadata(metadata);
      if (sequence !== resolutionSequence) return;
      const registeredMetadata = workspaceStore.registerWorkspaceInfoMetadata(registered) || metadata;
      const existingState = fileExplorerStore._getWorkspaceState(registered.workspaceId);
      const hasSeededTree = Boolean(
        existingState?.tree
          && (existingState.tree.children.length > 0 || existingState.tree.name !== registered.workspaceId),
      );
      if (!hasSeededTree) {
        rootLoadAbortController = new AbortController();
        await fileExplorerStore.fetchFolderChildren(registered.workspaceId, '', {
          signal: rootLoadAbortController.signal,
        });
      }
      if (sequence !== resolutionSequence) return;
      activeWorkspaceMetadata.value = registeredMetadata;
      activeWorkspaceId.value = registered.workspaceId;
    } catch (error) {
      if (sequence === resolutionSequence) {
        activeWorkspaceId.value = '';
        activeWorkspaceMetadata.value = null;
        workspaceResolutionError.value = formatError(error);
      }
    } finally {
      if (sequence === resolutionSequence && resolvingKey.value === key) {
        resolvingKey.value = null;
        rootLoadAbortController = null;
      }
    }
  }

  function folderPathKey(path: string | null | undefined): string {
    return path || '/';
  }

  function setFolderLoading(path: string, value: boolean): void {
    folderLoadingByPath.value = { ...folderLoadingByPath.value, [folderPathKey(path)]: value };
  }

  function setFolderError(path: string, value: string | null): void {
    folderErrorByPath.value = { ...folderErrorByPath.value, [folderPathKey(path)]: value };
  }

  function isFolderLoading(path: string): boolean {
    return Boolean(folderLoadingByPath.value[folderPathKey(path)]);
  }

  function getFolderError(path: string): string | null {
    return folderErrorByPath.value[folderPathKey(path)] ?? null;
  }

  async function ensureFolderChildren(node: MobileWorkspaceFileNode): Promise<boolean> {
    const id = activeWorkspaceId.value;
    if (!id || node.is_file) return false;
    if (node.childrenLoaded) return true;

    const path = node.path || '';
    setFolderLoading(path, true);
    setFolderError(path, null);
    try {
      await workspaceStore.fetchFolderChildren(id, path);
      if (!node.childrenLoaded) {
        const message = 'Folder contents could not be loaded. Try again from the mobile Files tab.';
        setFolderError(path, message);
        return false;
      }
      return true;
    } catch (error) {
      setFolderError(path, error instanceof Error ? error.message : 'Folder contents could not be loaded.');
      return false;
    } finally {
      setFolderLoading(path, false);
    }
  }

  async function searchFiles(query: string): Promise<void> {
    if (!activeWorkspaceId.value) return;
    try {
      await Promise.resolve(explorer.searchFiles(query));
    } catch {
      // The authoritative file-explorer store owns searchError; mobile presentation reads it from there.
    }
  }

  async function openFileReadOnly(filePath: string): Promise<void> {
    if (!activeWorkspaceId.value) return;
    fileOpenErrorByPath.value = { ...fileOpenErrorByPath.value, [filePath]: null };
    try {
      await Promise.resolve(explorer.openFilePreview(filePath));
    } catch (error) {
      fileOpenErrorByPath.value = {
        ...fileOpenErrorByPath.value,
        [filePath]: error instanceof Error ? error.message : 'File could not be opened.',
      };
    }
  }

  function getOpenFileState(filePath: string): OpenFileState | null {
    const id = activeWorkspaceId.value;
    if (!id) return null;
    const active = fileExplorerStore.getActiveFileData(id);
    if (active?.path === filePath) return active;
    return fileExplorerStore._getWorkspaceState(id)?.openFiles.find((file) => file.path === filePath) ?? null;
  }

  function getFileOpenError(filePath: string): string | null {
    return fileOpenErrorByPath.value[filePath] ?? null;
  }

  watch(
    () => activeWorkspaceId.value,
    (id) => {
      releaseCurrentLiveSession();
      if (id) {
        releaseLiveSession = workspaceStore.acquireFileExplorerLiveSession(id, `mobile-files:${id}`);
      }
    },
  );

  watch(
    () => requestedRootPath.value,
    () => { void resolveWorkspaceForContext(); },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    ++resolutionSequence;
    resolvingKey.value = null;
    abortCurrentRootLoad();
    releaseCurrentLiveSession();
  });

  return {
    workspace,
    resolutionStatus,
    workspaceResolutionError,
    resolveWorkspaceForContext,
    tree,
    ensureFolderChildren,
    isFolderLoading,
    getFolderError,
    searchFiles,
    searchResults,
    isSearchLoading,
    searchError,
    openFileReadOnly,
    getOpenFileState,
    getFileOpenError,
  };
}

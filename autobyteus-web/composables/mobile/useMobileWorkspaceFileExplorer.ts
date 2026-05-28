import { computed, ref, unref, watch, type MaybeRef } from 'vue';
import { useFileExplorerStore, type OpenFileState } from '~/stores/fileExplorer';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useWorkspaceStore, type WorkspaceInfo } from '~/stores/workspace';
import type { MobileWorkContext } from '~/types/mobileWork';
import { TreeNode } from '~/utils/fileExplorer/TreeNode';

export type MobileWorkspaceResolutionStatus = 'no-context' | 'no-workspace-context' | 'resolving' | 'resolved' | 'unresolved';

export interface MobileWorkspaceFileNode {
  name: string;
  path: string;
  is_file: boolean;
  children: MobileWorkspaceFileNode[];
  id: string;
  childrenLoaded: boolean;
}

export function normalizeMobileWorkspaceRoot(value: string | null | undefined): string {
  const source = (value || '').trim();
  if (!source) return '';
  const normalized = source.replace(/\\/g, '/');
  if (normalized === '/') return normalized;
  return normalized.replace(/\/+$/, '');
}

const workspaceRoot = (workspace: WorkspaceInfo | null | undefined): string => normalizeMobileWorkspaceRoot(
  workspace?.absolutePath
    || workspace?.workspaceConfig?.root_path
    || workspace?.workspaceConfig?.rootPath
    || null,
);

const contextWorkspaceRoot = (context: MobileWorkContext | null): string => {
  if (!context) return '';
  if (context.kind === 'agent-run' || context.kind === 'team-run') {
    return normalizeMobileWorkspaceRoot(context.workspaceRootPath);
  }
  if (context.kind === 'workspace') {
    return normalizeMobileWorkspaceRoot(context.rootPath);
  }
  return '';
};

const contextWorkspaceId = (context: MobileWorkContext | null): string | null => (
  context?.kind === 'workspace' ? context.workspaceId : null
);

export function useMobileWorkspaceFileExplorer(contextRef: MaybeRef<MobileWorkContext | null>) {
  const workspaceStore = useWorkspaceStore();
  const fileExplorerStore = useFileExplorerStore();
  const runHistoryStore = useRunHistoryStore();
  const resolvingKey = ref<string | null>(null);
  const workspaceResolutionError = ref<string | null>(null);
  const folderLoadingByPath = ref<Record<string, boolean>>({});
  const folderErrorByPath = ref<Record<string, string | null>>({});
  const fileOpenErrorByPath = ref<Record<string, string | null>>({});

  const context = computed(() => unref(contextRef));
  const requestedRootPath = computed(() => contextWorkspaceRoot(context.value));
  const requestedWorkspaceId = computed(() => contextWorkspaceId(context.value));

  const workspaceByRoot = computed(() => {
    const root = requestedRootPath.value;
    if (!root) return null;
    return workspaceStore.allWorkspaces.find((workspace) => workspaceRoot(workspace) === root) ?? null;
  });

  const workspace = computed<WorkspaceInfo | null>(() => {
    const current = context.value;
    if (!current) return null;
    if (current.kind === 'workspace') {
      return workspaceStore.workspaces[current.workspaceId] ?? workspaceByRoot.value;
    }
    if (current.kind === 'agent-run' || current.kind === 'team-run') {
      return workspaceByRoot.value;
    }
    return null;
  });

  const workspaceId = computed(() => workspace.value?.workspaceId ?? null);

  const resolutionStatus = computed<MobileWorkspaceResolutionStatus>(() => {
    const current = context.value;
    if (!current) return 'no-context';
    if (current.kind === 'agent-definition' || current.kind === 'team-definition') {
      return 'no-workspace-context';
    }
    if (workspace.value) return 'resolved';
    if (resolvingKey.value) return 'resolving';
    return 'unresolved';
  });

  const searchResults = computed<MobileWorkspaceFileNode[]>(() => {
    const id = workspaceId.value;
    return id ? fileExplorerStore.getSearchResults(id) as MobileWorkspaceFileNode[] : [];
  });
  const isSearchLoading = computed(() => {
    const id = workspaceId.value;
    return id ? fileExplorerStore.isSearchLoading(id) : false;
  });
  const searchError = computed(() => {
    const id = workspaceId.value;
    return id ? fileExplorerStore.getSearchError(id) : null;
  });
  const openFiles = computed<OpenFileState[]>(() => {
    const id = workspaceId.value;
    return id ? fileExplorerStore._getWorkspaceState(id)?.openFiles ?? [] : [];
  });
  const recentFiles = computed<MobileWorkspaceFileNode[]>(() => openFiles.value
    .slice(-8)
    .reverse()
    .map((file) => new TreeNode(
      file.path.split(/[\\/]/).pop() || file.path,
      file.path,
      true,
      [],
      `recent-${file.path}`,
      true,
    )));

  async function resolveWorkspaceForContext(): Promise<void> {
    if (workspace.value) {
      workspaceResolutionError.value = null;
      return;
    }
    const current = context.value;
    if (!current || current.kind === 'agent-definition' || current.kind === 'team-definition') {
      return;
    }

    const root = requestedRootPath.value;
    const directId = requestedWorkspaceId.value;
    const key = directId || root;
    if (!key || resolvingKey.value === key) {
      return;
    }

    resolvingKey.value = key;
    workspaceResolutionError.value = null;
    try {
      if (directId && !workspaceStore.workspaces[directId] && !workspaceStore.workspacesFetched) {
        await workspaceStore.fetchAllWorkspaces();
        if (workspace.value) return;
      }
      if (root) {
        await runHistoryStore.ensureWorkspaceByRootPath(root);
      }
      if (!workspace.value) {
        workspaceResolutionError.value = root
          ? `Workspace at ${root} could not be resolved.`
          : 'The selected context does not include a workspace path.';
      }
    } catch (error) {
      workspaceResolutionError.value = error instanceof Error ? error.message : 'Workspace could not be resolved.';
    } finally {
      if (resolvingKey.value === key) {
        resolvingKey.value = null;
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
    const id = workspaceId.value;
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
      const message = error instanceof Error ? error.message : 'Folder contents could not be loaded.';
      setFolderError(path, message);
      return false;
    } finally {
      setFolderLoading(path, false);
    }
  }

  async function searchFiles(query: string): Promise<void> {
    const id = workspaceId.value;
    if (!id) return;
    try {
      await fileExplorerStore.searchFiles(query, id);
    } catch {
      // The authoritative store owns searchError; mobile presentation reads it from there.
    }
  }

  async function openFileReadOnly(filePath: string): Promise<void> {
    const id = workspaceId.value;
    if (!id) return;
    fileOpenErrorByPath.value = { ...fileOpenErrorByPath.value, [filePath]: null };
    try {
      await fileExplorerStore.openFilePreview(filePath, id);
    } catch (error) {
      fileOpenErrorByPath.value = {
        ...fileOpenErrorByPath.value,
        [filePath]: error instanceof Error ? error.message : 'File could not be opened.',
      };
    }
  }

  function getOpenFileState(filePath: string): OpenFileState | null {
    const id = workspaceId.value;
    if (!id) return null;
    const active = fileExplorerStore.getActiveFileData(id);
    if (active?.path === filePath) return active;
    return fileExplorerStore._getWorkspaceState(id)?.openFiles.find((file) => file.path === filePath) ?? null;
  }

  function getFileOpenError(filePath: string): string | null {
    return fileOpenErrorByPath.value[filePath] ?? null;
  }

  watch(
    () => [context.value?.kind ?? 'none', requestedWorkspaceId.value ?? '', requestedRootPath.value, workspace.value?.workspaceId ?? ''],
    () => { void resolveWorkspaceForContext(); },
    { immediate: true },
  );

  return {
    workspace,
    workspaceId,
    requestedRootPath,
    resolutionStatus,
    workspaceResolutionError,
    resolveWorkspaceForContext,
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
    openFiles,
    recentFiles,
  };
}

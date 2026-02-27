import { nextTick, ref, type ComputedRef, type Ref } from 'vue';

export const useWorkspaceHistoryWorkspaceCreation = (params: {
  isEmbeddedWindow: Ref<boolean> | ComputedRef<boolean>;
  createWorkspace: (rootPath: string) => Promise<string>;
  fetchAllWorkspaces: () => Promise<unknown>;
  pickFolderPath: () => Promise<string | null>;
  onWorkspaceCreated: (workspaceRootPath: string) => void;
}) => {
  const showCreateWorkspaceInline = ref(false);
  const workspacePathDraft = ref('');
  const workspacePathError = ref('');
  const creatingWorkspace = ref(false);
  const workspacePathInputRef = ref<HTMLInputElement | null>(null);

  const focusWorkspaceInput = async (): Promise<void> => {
    await nextTick();
    workspacePathInputRef.value?.focus();
  };

  const resetCreateWorkspaceInline = (): void => {
    showCreateWorkspaceInline.value = false;
    workspacePathDraft.value = '';
    workspacePathError.value = '';
  };

  const createWorkspaceFromPath = async (rootPath: string): Promise<boolean> => {
    try {
      creatingWorkspace.value = true;
      workspacePathError.value = '';
      const normalizedRootPath = await params.createWorkspace(rootPath);
      params.onWorkspaceCreated(normalizedRootPath);
      await params.fetchAllWorkspaces();
      resetCreateWorkspaceInline();
      return true;
    } catch (error) {
      console.error('Failed to add workspace:', error);
      workspacePathDraft.value = rootPath;
      workspacePathError.value = 'Failed to add workspace. Please verify the path and try again.';
      showCreateWorkspaceInline.value = true;
      await focusWorkspaceInput();
      return false;
    } finally {
      creatingWorkspace.value = false;
    }
  };

  const closeCreateWorkspaceInput = (): void => {
    if (creatingWorkspace.value) {
      return;
    }
    resetCreateWorkspaceInline();
  };

  const confirmCreateWorkspace = async (): Promise<void> => {
    const rootPath = workspacePathDraft.value.trim();
    if (!rootPath) {
      workspacePathError.value = 'Workspace path is required.';
      await focusWorkspaceInput();
      return;
    }

    await createWorkspaceFromPath(rootPath);
  };

  const onCreateWorkspace = async (): Promise<void> => {
    if (creatingWorkspace.value) {
      return;
    }

    const hasNativePicker = Boolean(window.electronAPI?.showFolderDialog);
    if (params.isEmbeddedWindow.value && hasNativePicker) {
      workspacePathError.value = '';
      const selectedPath = await params.pickFolderPath();
      if (!selectedPath) {
        return;
      }
      await createWorkspaceFromPath(selectedPath);
      return;
    }

    if (showCreateWorkspaceInline.value) {
      closeCreateWorkspaceInput();
      return;
    }

    workspacePathError.value = '';
    workspacePathDraft.value = '';
    showCreateWorkspaceInline.value = true;
    await focusWorkspaceInput();
  };

  return {
    showCreateWorkspaceInline,
    workspacePathDraft,
    workspacePathError,
    creatingWorkspace,
    workspacePathInputRef,
    onCreateWorkspace,
    closeCreateWorkspaceInput,
    confirmCreateWorkspace,
  };
};

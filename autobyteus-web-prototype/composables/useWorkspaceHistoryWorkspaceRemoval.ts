import { computed, ref } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import type { RunTreeWorkspaceNode } from '~/utils/runTreeProjection';

export const useWorkspaceHistoryWorkspaceRemoval = (params: {
  removeWorkspace: (workspaceId: string) => Promise<{ workspaceRootPath: string | null; message: string }>;
  pruneWorkspaceHistory: (workspaceId: string, workspaceRootPath: string | null | undefined) => void;
  pruneWorkspaceExpansion: (workspaceId: string) => void;
  addToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}) => {
  const { t } = useLocalization();
  const pendingWorkspace = ref<RunTreeWorkspaceNode | null>(null);
  const removingWorkspaceIds = ref<Record<string, boolean>>({});
  const showRemoveConfirmation = computed(() => pendingWorkspace.value !== null);

  const onRemoveWorkspace = (workspace: RunTreeWorkspaceNode): void => {
    if (removingWorkspaceIds.value[workspace.workspaceId]) return;
    pendingWorkspace.value = workspace;
  };

  const closeRemoveConfirmation = (): void => {
    if (!pendingWorkspace.value) return;
    if (removingWorkspaceIds.value[pendingWorkspace.value.workspaceId]) return;
    pendingWorkspace.value = null;
  };

  const confirmRemoveWorkspace = async (): Promise<void> => {
    const workspace = pendingWorkspace.value;
    if (!workspace) return;
    removingWorkspaceIds.value = { ...removingWorkspaceIds.value, [workspace.workspaceId]: true };
    try {
      const result = await params.removeWorkspace(workspace.workspaceId);
      const rootPath = result.workspaceRootPath || workspace.workspaceRootPath;
      params.pruneWorkspaceHistory(workspace.workspaceId, rootPath);
      params.pruneWorkspaceExpansion(workspace.workspaceId);
      pendingWorkspace.value = null;
      params.addToast(
        result.message || t('workspace.composables.useWorkspaceHistoryWorkspaceRemoval.workspace_removed_fallback'),
        'success',
      );
    } catch (error: any) {
      params.addToast(
        error?.message || t('workspace.composables.useWorkspaceHistoryWorkspaceRemoval.workspace_remove_failed_fallback'),
        'error',
      );
    } finally {
      const { [workspace.workspaceId]: _removed, ...remaining } = removingWorkspaceIds.value;
      removingWorkspaceIds.value = remaining;
    }
  };

  return {
    pendingWorkspace,
    removingWorkspaceIds,
    showRemoveConfirmation,
    onRemoveWorkspace,
    closeRemoveConfirmation,
    confirmRemoveWorkspace,
  };
};

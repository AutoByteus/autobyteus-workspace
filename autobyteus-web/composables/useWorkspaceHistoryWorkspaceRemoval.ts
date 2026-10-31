import { computed, ref } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import type { RunTreeWorkspaceNode } from '~/utils/runTreeProjection';
import { escapeHtml } from '~/utils/escapeHtml';

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

  /** The confirmation's HTML message (ConfirmationModal renders HTML): every interpolated part is escaped. */
  const removeConfirmationMessage = computed(() => {
    const workspace = pendingWorkspace.value;
    if (!workspace) return '';
    const name = escapeHtml(workspace.workspaceName || t(
      'workspace.components.workspace.history.WorkspaceAgentRunsTreePanel.this_workspace',
    ));
    const root = escapeHtml(workspace.workspaceRootPath);
    const questionPrefix = escapeHtml(t(
      'workspace.components.workspace.history.WorkspaceAgentRunsTreePanel.remove_workspace_question_prefix',
    ));
    const questionSuffix = escapeHtml(t(
      'workspace.components.workspace.history.WorkspaceAgentRunsTreePanel.remove_workspace_question_suffix',
    ));
    const body = escapeHtml(t(
      'workspace.components.workspace.history.WorkspaceAgentRunsTreePanel.remove_workspace_non_destructive_body',
    ));
    return `${questionPrefix} <strong>${name}</strong> ${questionSuffix}<br><br>${body}<br><br><span class="break-all text-xs text-gray-500">${root}</span>`;
  });

  return {
    pendingWorkspace,
    removeConfirmationMessage,
    removingWorkspaceIds,
    showRemoveConfirmation,
    onRemoveWorkspace,
    closeRemoveConfirmation,
    confirmRemoveWorkspace,
  };
};

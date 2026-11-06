import { computed, ref } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import { escapeHtml } from '~/utils/escapeHtml';

/** The folder a removal is about: its registry ID, its name and its root path. */
export type RemovableWorkspace = Readonly<{ workspaceId: string; name: string; rootPath: string }>;

/** Stands in for the folder name in the translated question, so the name can be bolded after escaping. */
const NAME_SLOT = '\u0000';

/**
 * Removing a folder (workspace-tree-vs-chooser REQ-002, REQ-004, DS-006): the chat chooser's "Remove", after a
 * confirmation. It unregisters the folder (today's `removeWorkspace`), so it leaves every chooser and every view of the
 * left panel; files, memories and run history stay. The server refuses while a run is running in the folder, and the
 * refusal is the error toast. The Workspaces tree prunes its own expansion when a folder leaves its list.
 */
export const useWorkspaceHistoryWorkspaceRemoval = (params: {
  removeWorkspace: (workspaceId: string) => Promise<{ workspaceRootPath: string | null; message: string }>;
  pruneWorkspaceHistory: (workspaceId: string, workspaceRootPath: string | null | undefined) => void;
  /** After a successful removal, with the removed folder's ID. */
  onRemoved?: (workspaceId: string) => void;
  addToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}) => {
  const { t } = useLocalization();
  const pendingWorkspace = ref<RemovableWorkspace | null>(null);
  const removingWorkspaceIds = ref<Record<string, boolean>>({});
  const showRemoveConfirmation = computed(() => pendingWorkspace.value !== null);
  const removing = computed(() => Boolean(pendingWorkspace.value && removingWorkspaceIds.value[pendingWorkspace.value.workspaceId]));

  const onRemoveWorkspace = (workspace: RemovableWorkspace): void => {
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
      params.pruneWorkspaceHistory(workspace.workspaceId, result.workspaceRootPath || workspace.rootPath);
      params.onRemoved?.(workspace.workspaceId);
      params.addToast(t('workspaceFolders.removedToast', { name: workspace.name }), 'success');
    } catch (error: any) {
      // The refusal (a run is running there) or a failure: the server's message; nothing changed (VIS-010).
      params.addToast(error?.message || t('workspace.composables.useWorkspaceHistoryWorkspaceRemoval.workspace_remove_failed_fallback'), 'error');
    } finally {
      const { [workspace.workspaceId]: _removed, ...remaining } = removingWorkspaceIds.value;
      removingWorkspaceIds.value = remaining;
      pendingWorkspace.value = null;
    }
  };

  /** The confirmation's HTML message (ConfirmationModal renders HTML): every interpolated part is escaped. */
  const removeConfirmationMessage = computed(() => {
    const workspace = pendingWorkspace.value;
    if (!workspace) return '';
    const question = escapeHtml(t('workspaceFolders.removeQuestion', { name: NAME_SLOT }))
      .replace(NAME_SLOT, `<strong>${escapeHtml(workspace.name)}</strong>`);
    const body = escapeHtml(t('workspaceFolders.removeBody'));
    const root = escapeHtml(workspace.rootPath);
    return `${question}<br><br>${body}<br><br><span class="break-all text-xs text-gray-500">${root}</span>`;
  });

  return {
    pendingWorkspace,
    removeConfirmationMessage,
    removing,
    showRemoveConfirmation,
    onRemoveWorkspace,
    closeRemoveConfirmation,
    confirmRemoveWorkspace,
  };
};

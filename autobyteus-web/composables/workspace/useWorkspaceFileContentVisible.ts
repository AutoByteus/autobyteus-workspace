import { computed } from 'vue'
import { useFileExplorerStore } from '~/stores/fileExplorer'
import { useWorkspaceStore } from '~/stores/workspace'

/** Whether the active workspace has open files (the workspace frame's file content pane). */
export function useWorkspaceFileContentVisible() {
  const fileExplorerStore = useFileExplorerStore()
  const workspaceStore = useWorkspaceStore()
  return computed(() => {
    const wsId = workspaceStore.activeWorkspace?.workspaceId || workspaceStore.activeWorkspaceMetadata?.workspaceId
    return wsId ? fileExplorerStore.getOpenFiles(wsId).length > 0 : false
  })
}

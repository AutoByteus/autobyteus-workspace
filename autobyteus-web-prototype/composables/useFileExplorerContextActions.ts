import { computed, onUnmounted, ref, watch } from 'vue'
import type { ComputedRef } from 'vue'
import type { useWorkspaceFileExplorer } from '~/composables/useWorkspaceFileExplorer'
import {
  getCreateParentPath,
  getFileExplorerContextMenuItems,
  resolveCreatePath,
  type FileExplorerContextActionId,
  type FileExplorerContextRequest,
  type FileExplorerContextTarget,
  type FileExplorerRenameRequest,
} from '~/utils/fileExplorer/contextMenu'

type WorkspaceFileExplorer = ReturnType<typeof useWorkspaceFileExplorer>

type UseFileExplorerContextActionsOptions = {
  explorer: WorkspaceFileExplorer
  panelActive: ComputedRef<boolean>
}

export function useFileExplorerContextActions({
  explorer,
  panelActive,
}: UseFileExplorerContextActionsOptions) {
  const currentTarget = ref<FileExplorerContextTarget | null>(null)
  const menuVisible = ref(false)
  const menuPosition = ref({ top: 0, left: 0 })
  const addDialogVisible = ref(false)
  const addFileMode = ref(true)
  const deleteDialogVisible = ref(false)
  const renameRequest = ref<FileExplorerRenameRequest | null>(null)
  let renameRequestCounter = 0
  let documentClickAttached = false
  let documentKeydownAttached = false

  const menuItems = computed(() => getFileExplorerContextMenuItems(currentTarget.value))

  const addDialogParentPath = computed(() => {
    return currentTarget.value ? getCreateParentPath(currentTarget.value) : ''
  })

  const deleteTargetName = computed(() => {
    return currentTarget.value?.kind === 'node' ? currentTarget.value.name : ''
  })

  const hasWorkspace = computed(() => Boolean(explorer.workspaceId.value))

  const openContextMenu = (request: FileExplorerContextRequest) => {
    if (!panelActive.value || !hasWorkspace.value) return

    currentTarget.value = request.target
    menuPosition.value = request.position
    addDialogVisible.value = false
    deleteDialogVisible.value = false
    menuVisible.value = true
    syncDocumentListeners()
  }

  const closeMenu = () => {
    menuVisible.value = false
    syncDocumentListeners()
  }

  const closeAll = () => {
    menuVisible.value = false
    addDialogVisible.value = false
    deleteDialogVisible.value = false
    currentTarget.value = null
    syncDocumentListeners()
  }

  const selectAction = (actionId: FileExplorerContextActionId) => {
    const target = currentTarget.value
    if (!target || !panelActive.value) return

    switch (actionId) {
      case 'add-file':
        addFileMode.value = true
        addDialogVisible.value = true
        closeMenu()
        return
      case 'add-folder':
        addFileMode.value = false
        addDialogVisible.value = true
        closeMenu()
        return
      case 'rename':
        if (target.kind !== 'node') return
        renameRequest.value = {
          requestId: ++renameRequestCounter,
          nodeId: target.nodeId,
          path: target.path,
          name: target.name,
        }
        closeAll()
        return
      case 'delete':
        if (target.kind !== 'node') return
        deleteDialogVisible.value = true
        closeMenu()
        return
    }
  }

  const confirmAdd = async (name: string) => {
    const target = currentTarget.value
    if (!target || !panelActive.value) return

    addDialogVisible.value = false
    const finalPath = resolveCreatePath(target, name)
    try {
      await explorer.createFileOrFolder(finalPath, addFileMode.value)
      currentTarget.value = null
    } catch (error) {
      console.error('Failed to create file/folder:', error)
    } finally {
      syncDocumentListeners()
    }
  }

  const cancelAdd = () => {
    addDialogVisible.value = false
    currentTarget.value = null
    syncDocumentListeners()
  }

  const confirmDelete = async () => {
    const target = currentTarget.value
    if (!target || target.kind !== 'node' || !panelActive.value) return

    deleteDialogVisible.value = false
    try {
      await explorer.deleteFileOrFolder(target.path)
      currentTarget.value = null
    } catch (error) {
      console.error('Failed to delete:', error)
    } finally {
      syncDocumentListeners()
    }
  }

  const cancelDelete = () => {
    deleteDialogVisible.value = false
    currentTarget.value = null
    syncDocumentListeners()
  }

  const onDocumentClick = () => {
    closeAll()
  }

  const onDocumentKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      closeAll()
    }
  }

  const syncDocumentListeners = () => {
    const shouldAttachClick = menuVisible.value
    const shouldAttachKeydown = menuVisible.value || addDialogVisible.value || deleteDialogVisible.value

    if (shouldAttachClick && !documentClickAttached) {
      document.addEventListener('click', onDocumentClick)
      documentClickAttached = true
    } else if (!shouldAttachClick && documentClickAttached) {
      document.removeEventListener('click', onDocumentClick)
      documentClickAttached = false
    }

    if (shouldAttachKeydown && !documentKeydownAttached) {
      document.addEventListener('keydown', onDocumentKeydown)
      documentKeydownAttached = true
    } else if (!shouldAttachKeydown && documentKeydownAttached) {
      document.removeEventListener('keydown', onDocumentKeydown)
      documentKeydownAttached = false
    }
  }

  watch(panelActive, (isActive) => {
    if (!isActive) closeAll()
  })

  onUnmounted(() => {
    if (documentClickAttached) {
      document.removeEventListener('click', onDocumentClick)
      documentClickAttached = false
    }
    if (documentKeydownAttached) {
      document.removeEventListener('keydown', onDocumentKeydown)
      documentKeydownAttached = false
    }
  })

  return {
    currentTarget,
    menuVisible,
    menuPosition,
    menuItems,
    addDialogVisible,
    addFileMode,
    addDialogParentPath,
    deleteDialogVisible,
    deleteTargetName,
    renameRequest,
    openContextMenu,
    closeAll,
    selectAction,
    confirmAdd,
    cancelAdd,
    confirmDelete,
    cancelDelete,
  }
}

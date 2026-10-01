import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { useWorkspaceStore } from '~/stores/workspace'
import { getFilePathsFromFolder } from '~/utils/fileExplorer/fileUtils'
import type { TreeNode } from '~/utils/fileExplorer/TreeNode'

/**
 * Resolves the file paths a drop onto a message textarea should insert as text:
 * file-explorer nodes (absolute, under the active workspace), native files in Electron,
 * or plain file names in a browser.
 */
export function useComposerFilePathDrop() {
  const windowNodeContextStore = useWindowNodeContextStore()
  const workspaceStore = useWorkspaceStore()

  const resolveDroppedFilePaths = async (event: DragEvent): Promise<string[]> => {
    const dataTransfer = event.dataTransfer
    if (!dataTransfer) return []

    const dragData = dataTransfer.getData('application/json')
    if (dragData) {
      console.log('[INFO] Drop event is from internal file explorer.')
      try {
        const droppedNode: TreeNode = JSON.parse(dragData)
        let filePaths = getFilePathsFromFolder(droppedNode)
        if (workspaceStore.activeWorkspace?.absolutePath) {
          const basePath = workspaceStore.activeWorkspace.absolutePath
          const separator = basePath.includes('\\') ? '\\' : '/'
          filePaths = filePaths.map(relativePath => {
            const cleanRelativePath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath
            const parts = [basePath.replace(/[/\\]$/, ''), ...cleanRelativePath.split('/')]
            return parts.join(separator)
          })
        }
        return filePaths
      } catch (error) {
        console.error('Failed to parse dropped node data:', error)
        return []
      }
    }

    if (windowNodeContextStore.isEmbeddedWindow && dataTransfer.files.length > 0 && window.electronAPI) {
      console.log('[INFO] Drop event from native OS in Electron.')
      const files = Array.from(dataTransfer.files)
      const paths = (await Promise.all(files.map(f => window.electronAPI.getPathForFile(f))))
        .filter((p): p is string => Boolean(p))
      console.log('[INFO] Received native file paths from preload bridge:', paths)
      return paths
    }

    if (!windowNodeContextStore.isEmbeddedWindow && dataTransfer.files.length > 0) {
      console.log('[INFO] Drop event from native OS in browser, using filenames as fallback.')
      return Array.from(dataTransfer.files).map(file => file.name)
    }

    return []
  }

  return { resolveDroppedFilePaths }
}

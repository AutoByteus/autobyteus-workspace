import { TreeNode } from '~/utils/fileExplorer/TreeNode'
import { createNodeIdToNodeDictionary } from '~/utils/fileExplorer/fileUtils'
import type { RecentStructuralChangeEcho } from '~/utils/fileExplorer/stateSync'

export type FileDataType = 'Text' | 'Image' | 'Audio' | 'Video' | 'Excel' | 'PDF' | 'Unsupported'

export type FileOpenMode = 'edit' | 'preview'

export interface OpenFileState {
  path: string
  type: FileDataType
  mode: FileOpenMode
  content: string | null
  url: string | null
  isLoading: boolean
  error: string | null
}

export interface WorkspaceFileExplorerState {
  tree: TreeNode
  nodeIdToNode: Record<string, TreeNode>
  openFolders: Record<string, boolean>
  openFiles: OpenFileState[]
  activeFile: string | null
  searchResults: any[]
  searchLoading: boolean
  searchError: string | null
  searchAbortController: AbortController | null
  folderChildrenGeneration: number
  folderChildrenAbortController: AbortController | null
  saveContentError: Record<string, string | null>
  saveContentLoading: Record<string, boolean>
  deleteError: Record<string, string | null>
  deleteLoading: Record<string, boolean>
  moveError: Record<string, string | null>
  moveLoading: Record<string, boolean>
  renameError: Record<string, string | null>
  renameLoading: Record<string, boolean>
  createError: Record<string, string | null>
  createLoading: Record<string, boolean>
  filesToIgnoreNextModify: Set<string>
  recentStructuralChangeEchoes: RecentStructuralChangeEcho[]
}

export interface FileExplorerStoreState {
  fileExplorerStateByWorkspace: Map<string, WorkspaceFileExplorerState>
}

export const createDefaultWorkspaceFileExplorerState = (
  workspaceId = 'workspace',
): WorkspaceFileExplorerState => {
  const rootNode = new TreeNode(workspaceId, '', false, [], 'root', true)
  return {
    tree: rootNode,
    nodeIdToNode: createNodeIdToNodeDictionary(rootNode),
    openFolders: {},
    openFiles: [],
    activeFile: null,
    searchResults: [],
    searchLoading: false,
    searchError: null,
    searchAbortController: null,
    folderChildrenGeneration: 0,
    folderChildrenAbortController: null,
    saveContentError: {},
    saveContentLoading: {},
    deleteError: {},
    deleteLoading: {},
    moveError: {},
    moveLoading: {},
    renameError: {},
    renameLoading: {},
    createError: {},
    createLoading: {},
    filesToIgnoreNextModify: new Set(),
    recentStructuralChangeEchoes: [],
  }
}

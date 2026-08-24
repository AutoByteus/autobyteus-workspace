import { defineStore } from 'pinia'
import {
  createDefaultWorkspaceFileExplorerState,
  type FileExplorerStoreState,
  type OpenFileState,
  type WorkspaceFileExplorerState,
} from '~/stores/fileExplorerState'
import { fileExplorerContentActions } from '~/stores/fileExplorerContentActions'
import { fileExplorerMutationActions } from '~/stores/fileExplorerMutationActions'
import { fileExplorerSearchActions } from '~/stores/fileExplorerSearchActions'
import { fileExplorerTreeActions } from '~/stores/fileExplorerTreeActions'


export const useFileExplorerStore = defineStore('fileExplorer', {
  state: (): FileExplorerStoreState => ({
    fileExplorerStateByWorkspace: new Map(),
  }),

  getters: {
    _getWorkspaceState: (state) => (workspaceId: string): WorkspaceFileExplorerState | null => {
      if (!workspaceId) return null
      return state.fileExplorerStateByWorkspace.get(workspaceId) || null
    },

    isFolderOpen: (state) => (folderPath: string, workspaceId: string): boolean => {
      const wsState = state.fileExplorerStateByWorkspace.get(workspaceId)
      return wsState ? !!wsState.openFolders[folderPath] : false
    },

    getOpenFiles: (state) => (workspaceId: string): string[] => {
      const wsState = state.fileExplorerStateByWorkspace.get(workspaceId)
      return wsState ? wsState.openFiles.map((file) => file.path) : []
    },

    getActiveFile: (state) => (workspaceId: string): string | null => {
      const wsState = state.fileExplorerStateByWorkspace.get(workspaceId)
      return wsState ? wsState.activeFile : null
    },

    getActiveFileData: (state) => (workspaceId: string): OpenFileState | null => {
      const wsState = state.fileExplorerStateByWorkspace.get(workspaceId)
      if (!wsState?.activeFile) return null
      return wsState.openFiles.find((file) => file.path === wsState.activeFile) || null
    },

    getFileContent: (state) => (filePath: string, workspaceId: string): string | null => {
      const wsState = state.fileExplorerStateByWorkspace.get(workspaceId)
      const file = wsState?.openFiles.find((entry) => entry.path === filePath)
      return file ? file.content : null
    },

    isContentLoading: (state) => (filePath: string, workspaceId: string): boolean => {
      const wsState = state.fileExplorerStateByWorkspace.get(workspaceId)
      const file = wsState?.openFiles.find((entry) => entry.path === filePath)
      return file ? file.isLoading : false
    },

    getContentError: (state) => (filePath: string, workspaceId: string): string | null => {
      const wsState = state.fileExplorerStateByWorkspace.get(workspaceId)
      const file = wsState?.openFiles.find((entry) => entry.path === filePath)
      return file ? file.error : null
    },

    getSearchResults: (state) => (workspaceId: string): any[] => {
      return state.fileExplorerStateByWorkspace.get(workspaceId)?.searchResults || []
    },

    isSearchLoading: (state) => (workspaceId: string): boolean => {
      return state.fileExplorerStateByWorkspace.get(workspaceId)?.searchLoading || false
    },

    getSearchError: (state) => (workspaceId: string): string | null => {
      return state.fileExplorerStateByWorkspace.get(workspaceId)?.searchError || null
    },

    getWorkspaceTree: (state) => (workspaceId: string) => {
      return state.fileExplorerStateByWorkspace.get(workspaceId)?.tree || null
    },

    isSaveContentLoading: (state) => (filePath: string, workspaceId: string): boolean => {
      return state.fileExplorerStateByWorkspace.get(workspaceId)?.saveContentLoading[filePath] || false
    },

    getSaveContentError: (state) => (filePath: string, workspaceId: string): string | null => {
      return state.fileExplorerStateByWorkspace.get(workspaceId)?.saveContentError[filePath] || null
    },
  },

  actions: {
    _getOrCreateWorkspaceState(workspaceId: string): WorkspaceFileExplorerState {
      if (!workspaceId) {
        throw new Error('Cannot get file explorer state: workspaceId is required.')
      }
      if (!this.fileExplorerStateByWorkspace.has(workspaceId)) {
        this.fileExplorerStateByWorkspace.set(
          workspaceId,
          createDefaultWorkspaceFileExplorerState(workspaceId),
        )
      }
      return this.fileExplorerStateByWorkspace.get(workspaceId)!
    },

    toggleFolder(folderPath: string, workspaceId: string) {
      const wsState = this._getOrCreateWorkspaceState(workspaceId)
      wsState.openFolders[folderPath] = !wsState.openFolders[folderPath]
    },

    ...fileExplorerContentActions,
    ...fileExplorerTreeActions,
    ...fileExplorerMutationActions,
    ...fileExplorerSearchActions,
  },
})

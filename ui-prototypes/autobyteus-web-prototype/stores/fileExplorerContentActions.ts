import { getApolloClient } from '~/utils/apolloClient'
import { GetFileContent } from '~/graphql/queries/file_explorer_queries'
import { WriteFileContent } from '~/graphql/mutations/file_explorer_mutations'
import type {
  GetFileContentQuery,
  GetFileContentQueryVariables,
  WriteFileContentMutation,
  WriteFileContentMutationVariables,
} from '~/generated/graphql'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import type { FileSystemChangeEvent } from '~/types/fileSystemChangeTypes'
import { determineFileType } from '~/utils/fileExplorer/fileUtils'
import {
  remapOpenFilePaths,
  remapOpenFolderPaths,
  remapPrefixedPath,
} from '~/utils/fileExplorer/stateSync'
import type {
  FileOpenMode,
  FilePreviewAccessIntent,
  OpenFileState,
} from '~/stores/fileExplorerState'
import { buildWorkspaceContentUrl } from '~/utils/fileExplorer/workspaceResourceUrl'
import { hasTrustedElectronLocalFileCapability } from '~/utils/fileExplorer/localFileCapability'
import { localFilePreviewError } from '~/utils/fileExplorer/localFileError'
import { buildLocalFileUrl } from '~/shared/localFileUrl'

function isAbsoluteLocalPath(path: string): boolean {
  if (path.startsWith('/')) {
    return true
  }
  return /^[a-zA-Z]:[\\/]/.test(path)
}

const normalizeDeletedPath = (path: string): string =>
  path.trim().replace(/^\/+/, '').replace(/\/+$/, '')

const isPathInDeletedScope = (filePath: string, deletedPath: string): boolean => {
  const normalizedDeletedPath = normalizeDeletedPath(deletedPath)
  if (!normalizedDeletedPath) {
    return filePath === ''
  }
  return filePath === normalizedDeletedPath || filePath.startsWith(`${normalizedDeletedPath}/`)
}

export const fileExplorerContentActions = {
  async openFile(this: any, filePath: string, workspaceId: string) {
    return this._openFileWithMode(filePath, 'edit', workspaceId)
  },

  async openFilePreview(
    this: any,
    filePath: string,
    workspaceId: string,
    options?: { accessIntent?: FilePreviewAccessIntent },
  ) {
    return this._openFileWithMode(filePath, 'preview', workspaceId, options)
  },

  async _openFileWithMode(
    this: any,
    filePath: string,
    mode: FileOpenMode,
    workspaceId: string,
    options?: { accessIntent?: FilePreviewAccessIntent },
  ) {
    console.log(`[FileExplorer] Opening file: ${filePath}`)
    const wsState = this._getOrCreateWorkspaceState(workspaceId)
    const windowNodeContextStore = useWindowNodeContextStore()
    const existingFile = wsState.openFiles.find((file: OpenFileState) => file.path === filePath)

    if (!existingFile) {
      const fileType = await determineFileType(filePath)
      console.log(`[FileExplorer] Determined file type for "${filePath}": ${fileType}`)
      const newFileState: OpenFileState = {
        path: filePath,
        type: fileType,
        mode: options?.accessIntent ? 'preview' : mode,
        accessIntent: options?.accessIntent ?? null,
        content: null,
        url: null,
        relativeResourceContext: null,
        isLoading: true,
        error: null,
      }
      wsState.openFiles.push(newFileState)
      console.log('[FileExplorer] Pushed new initial file state:', JSON.parse(JSON.stringify(newFileState)))

      if (
        windowNodeContextStore.isEmbeddedWindow
        && isAbsoluteLocalPath(filePath)
        && hasTrustedElectronLocalFileCapability()
      ) {
        await this._loadLocalFile(newFileState, filePath)
      } else {
        this._loadWorkspaceOrExternalFile(newFileState, filePath, workspaceId, windowNodeContextStore)
      }
    } else {
      existingFile.accessIntent = options?.accessIntent ?? null
      existingFile.mode = options?.accessIntent ? 'preview' : mode
    }

    wsState.activeFile = filePath
  },

  async _loadLocalFile(this: any, fileState: OpenFileState, filePath: string) {
    console.log('[FileExplorer] Handling as a local absolute path in Electron.')
    if (fileState.type === 'Text') {
      try {
        const result = await window.electronAPI.readLocalTextFile(filePath)
        fileState.content = result.success ? result.content ?? '' : null
        fileState.error = result.success
          ? null
          : localFilePreviewError(result.errorCode || 'unavailable')
      } catch (error) {
        fileState.error = localFilePreviewError('unavailable')
      }
    } else if (['Image', 'Audio', 'Video', 'Excel', 'PDF'].includes(fileState.type)) {
      fileState.url = buildLocalFileUrl(filePath)
      console.log(`[FileExplorer] Constructed local media URL: ${fileState.url}`)
    } else {
      console.warn(`[FileExplorer] Unsupported local file type "${fileState.type}" for "${filePath}".`)
      fileState.error = localFilePreviewError('unsupported-type')
    }
    fileState.isLoading = false
  },

  _loadWorkspaceOrExternalFile(
    this: any,
    fileState: OpenFileState,
    filePath: string,
    workspaceId: string,
    windowNodeContextStore: ReturnType<typeof useWindowNodeContextStore>,
  ) {
    const isExternalUrl = filePath.startsWith('http://') || filePath.startsWith('https://')
    if (isExternalUrl) {
      console.log('[FileExplorer] Handling as an external URL.')
      fileState.url = filePath
      fileState.isLoading = false
      return
    }

    console.log('[FileExplorer] Handling as a workspace path.')
    fileState.relativeResourceContext = { kind: 'workspace', workspaceId }
    if (fileState.type === 'Text') {
      console.log(`[FileExplorer] Fetching text content for "${filePath}" via GraphQL.`)
      void this.fetchFileContent(filePath, workspaceId)
      return
    }

    if (['Image', 'Audio', 'Video', 'Excel', 'PDF'].includes(fileState.type)) {
      if (workspaceId) {
        const restBaseUrl = windowNodeContextStore.getBoundEndpoints().rest.replace(/\/$/, '')
        fileState.url = buildWorkspaceContentUrl(restBaseUrl, workspaceId, filePath)
        fileState.isLoading = false
        console.log(`[FileExplorer] Constructed absolute media URL for "${filePath}": ${fileState.url}`)
      } else {
        fileState.error = 'No workspaceId provided for media URL.'
        fileState.isLoading = false
        console.error('[FileExplorer] Cannot construct media URL: No active workspace.')
      }
      return
    }

    console.warn(`[FileExplorer] Unsupported file type "${fileState.type}" for "${filePath}".`)
    fileState.isLoading = false
  },

  setFileMode(this: any, filePath: string, mode: FileOpenMode, workspaceId: string) {
    const wsState = this._getOrCreateWorkspaceState(workspaceId)
    const file = wsState.openFiles.find((entry: OpenFileState) => entry.path === filePath)
    if (file) {
      file.mode = file.accessIntent?.readOnly ? 'preview' : mode
    }
  },

  closeFile(this: any, filePath: string, workspaceId: string) {
    const wsState = this._getOrCreateWorkspaceState(workspaceId)
    wsState.openFiles = wsState.openFiles.filter((file: OpenFileState) => file.path !== filePath)
    if (wsState.activeFile === filePath) {
      const lastOpenFile = wsState.openFiles[wsState.openFiles.length - 1]
      wsState.activeFile = lastOpenFile ? lastOpenFile.path : null
    }
  },

  closePathScopedFiles(this: any, deletedPath: string, workspaceId: string) {
    const wsState = this._getOrCreateWorkspaceState(workspaceId)
    const activeFileWasDeleted = Boolean(
      wsState.activeFile && isPathInDeletedScope(wsState.activeFile, deletedPath),
    )

    wsState.openFiles = wsState.openFiles.filter((file: OpenFileState) => {
      return !isPathInDeletedScope(file.path, deletedPath)
    })

    const activeFileStillOpen = Boolean(
      wsState.activeFile && wsState.openFiles.some((file: OpenFileState) => file.path === wsState.activeFile),
    )

    if (activeFileWasDeleted || (wsState.activeFile && !activeFileStillOpen)) {
      const lastOpenFile = wsState.openFiles[wsState.openFiles.length - 1]
      wsState.activeFile = lastOpenFile ? lastOpenFile.path : null
    }
  },

  setActiveFile(this: any, filePath: string, workspaceId: string) {
    const wsState = this._getOrCreateWorkspaceState(workspaceId)
    if (wsState.openFiles.some((file: OpenFileState) => file.path === filePath)) {
      wsState.activeFile = filePath
    }
  },

  closeAllFiles(this: any, workspaceId: string) {
    const wsState = this._getOrCreateWorkspaceState(workspaceId)
    wsState.openFiles = []
    wsState.activeFile = null
  },

  closeOtherFiles(this: any, exceptFilePath: string, workspaceId: string) {
    const wsState = this._getOrCreateWorkspaceState(workspaceId)
    wsState.openFiles = wsState.openFiles.filter((file: OpenFileState) => file.path === exceptFilePath)
    wsState.activeFile = wsState.openFiles.length > 0 ? exceptFilePath : null
  },

  navigateToNextTab(this: any, workspaceId: string) {
    const wsState = this._getOrCreateWorkspaceState(workspaceId)
    if (wsState.openFiles.length <= 1) return
    const currentIndex = wsState.openFiles.findIndex((file: OpenFileState) => file.path === wsState.activeFile)
    if (currentIndex === -1) return
    wsState.activeFile = wsState.openFiles[(currentIndex + 1) % wsState.openFiles.length].path
  },

  navigateToPreviousTab(this: any, workspaceId: string) {
    const wsState = this._getOrCreateWorkspaceState(workspaceId)
    if (wsState.openFiles.length <= 1) return
    const currentIndex = wsState.openFiles.findIndex((file: OpenFileState) => file.path === wsState.activeFile)
    if (currentIndex === -1) return
    const prevIndex = currentIndex <= 0 ? wsState.openFiles.length - 1 : currentIndex - 1
    wsState.activeFile = wsState.openFiles[prevIndex].path
  },

  async fetchFileContent(this: any, filePath: string, workspaceId: string) {
    const wsState = this._getOrCreateWorkspaceState(workspaceId)
    const file = wsState.openFiles.find((entry: OpenFileState) => entry.path === filePath)
    if (!file || file.content !== null) return
    file.isLoading = true
    file.error = null
    if (!workspaceId) throw new Error('workspaceId required for fetching content')

    try {
      const client = getApolloClient()
      const { data, errors } = await client.query<GetFileContentQuery, GetFileContentQueryVariables>({
        query: GetFileContent,
        variables: { workspaceId, filePath },
        fetchPolicy: 'network-only',
      })
      if (errors?.length) throw new Error(errors.map((error: { message: string }) => error.message).join(', '))
      const content = data?.fileContent ?? ''
      file.content = content
      file.isLoading = false
      return content
    } catch (error) {
      console.error('Failed to fetch file content', error)
      file.error = error instanceof Error ? error.message : 'Failed to fetch file content'
      file.isLoading = false
      throw error
    }
  },

  invalidateFileContent(this: any, filePath: string, workspaceId: string) {
    const wsState = this._getOrCreateWorkspaceState(workspaceId)
    const file = wsState.openFiles.find((entry: OpenFileState) => entry.path === filePath)
    if (file?.type === 'Text') {
      file.content = null
      void this.fetchFileContent(filePath, workspaceId)
    }
  },

  remapPathScopedState(this: any, oldPrefix: string, newPrefix: string, workspaceId: string) {
    const wsState = this._getOrCreateWorkspaceState(workspaceId)
    wsState.openFolders = remapOpenFolderPaths(wsState.openFolders, oldPrefix, newPrefix)
    wsState.openFiles = remapOpenFilePaths(wsState.openFiles, oldPrefix, newPrefix)
    if (wsState.activeFile) {
      wsState.activeFile = remapPrefixedPath(wsState.activeFile, oldPrefix, newPrefix)
    }
  },

  async _writeFileCore(this: any, workspaceId: string, filePath: string, content: string) {
    const client = getApolloClient()
    const wsState = this._getOrCreateWorkspaceState(workspaceId)
    wsState.filesToIgnoreNextModify.add(filePath)
    setTimeout(() => wsState.filesToIgnoreNextModify.delete(filePath), 5000)

    try {
      const { data, errors } = await client.mutate<WriteFileContentMutation, WriteFileContentMutationVariables>({
        mutation: WriteFileContent,
        variables: { workspaceId, filePath, content },
      })
      if (errors?.length) {
        wsState.filesToIgnoreNextModify.delete(filePath)
        throw new Error(errors.map((error: { message: string }) => error.message).join(', '))
      }
      if (!data?.writeFileContent) {
        wsState.filesToIgnoreNextModify.delete(filePath)
        throw new Error('An unknown error occurred while writing the file.')
      }

      const file = wsState.openFiles.find((entry: OpenFileState) => entry.path === filePath)
      if (file) file.content = content
      const changeEvent: FileSystemChangeEvent = JSON.parse(data.writeFileContent)
      this.recordRecentStructuralChangeEcho(workspaceId, changeEvent)
      this.handleFileSystemChange(workspaceId, changeEvent, 'mutation')
    } catch (error) {
      console.error('Core file write operation failed:', error)
      wsState.filesToIgnoreNextModify.delete(filePath)
      throw error
    }
  },

  async saveFileContentFromEditor(this: any, workspaceId: string, filePath: string, content: string) {
    const wsState = this._getOrCreateWorkspaceState(workspaceId)
    wsState.saveContentError[filePath] = null
    wsState.saveContentLoading[filePath] = true
    try {
      await this._writeFileCore(workspaceId, filePath, content)
    } catch (error) {
      wsState.saveContentError[filePath] = error instanceof Error ? error.message : 'An unknown error occurred'
      throw error
    } finally {
      wsState.saveContentLoading[filePath] = false
    }
  },
}

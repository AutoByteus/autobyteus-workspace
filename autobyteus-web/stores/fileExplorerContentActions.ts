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
import { loadNodeFile, nodeFilePreviewError } from '~/utils/fileExplorer/nodeFileContent'

function isAbsoluteLocalPath(path: string): boolean {
  if (path.startsWith('/')) {
    return true
  }
  return /^[a-zA-Z]:[\\/]/.test(path)
}

/**
 * How an open file is read, decided once from its form and the window (autobyteus-471): an absolute path is a local
 * file in the embedded window that can read local files, and a node file (read-only, through the node-file route, as
 * the phone reads it) in every other window; a relative path is a workspace file; an `http(s)` URL is external.
 */
type FileLoadRoute = 'local' | 'node-file' | 'workspace-or-external'

const loadRouteOf = (
  filePath: string,
  windowNodeContextStore: ReturnType<typeof useWindowNodeContextStore>,
): FileLoadRoute => {
  if (!isAbsoluteLocalPath(filePath)) return 'workspace-or-external'
  return windowNodeContextStore.isEmbeddedWindow && hasTrustedElectronLocalFileCapability() ? 'local' : 'node-file'
}

/** The object URLs this store made for node files; each is revoked when its file closes or is read again. */
const nodeFileObjectUrls = new Set<string>()

const releaseNodeFileUrl = (file: Pick<OpenFileState, 'url'>): void => {
  if (file.url && nodeFileObjectUrls.delete(file.url)) URL.revokeObjectURL(file.url)
}

const releaseClosedNodeFileUrls = (before: readonly OpenFileState[], after: readonly OpenFileState[]): void => {
  const kept = new Set(after)
  before.filter((file) => !kept.has(file)).forEach(releaseNodeFileUrl)
}

const NODE_FILE_BLOB_TYPES = new Set(['Image', 'Audio', 'Video', 'Excel', 'PDF'])

/** A node file is read-only whoever opens it (autobyteus-471 REQ-001): a caller's own read-only intent, else this one. */
const NODE_FILE_ACCESS_INTENT: FilePreviewAccessIntent = { source: 'node-file', readOnly: true }

const accessIntentOf = (route: FileLoadRoute, requested: FilePreviewAccessIntent | undefined): FilePreviewAccessIntent | null =>
  requested ?? (route === 'node-file' ? NODE_FILE_ACCESS_INTENT : null)

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
    const route = loadRouteOf(filePath, windowNodeContextStore)
    const accessIntent = accessIntentOf(route, options?.accessIntent)

    if (!existingFile) {
      const fileType = await determineFileType(filePath)
      console.log(`[FileExplorer] Determined file type for "${filePath}": ${fileType}`)
      const newFileState: OpenFileState = {
        path: filePath,
        type: fileType,
        mode: accessIntent ? 'preview' : mode,
        accessIntent,
        content: null,
        url: null,
        contentRevision: 0,
        relativeResourceContext: null,
        isLoading: true,
        error: null,
      }
      wsState.openFiles.push(newFileState)
      console.log('[FileExplorer] Pushed new initial file state:', JSON.parse(JSON.stringify(newFileState)))

      if (route === 'local') {
        await this._loadLocalFile(newFileState, filePath)
      } else if (route === 'node-file') {
        await this._loadNodeFile(filePath, workspaceId, windowNodeContextStore)
      } else {
        this._loadWorkspaceOrExternalFile(newFileState, filePath, workspaceId, windowNodeContextStore)
      }
    } else {
      existingFile.accessIntent = accessIntent
      existingFile.mode = accessIntent ? 'preview' : mode
      // An explicit open shows the file's current content (autobyteus-450 REQ-003); an unsaved draft stays.
      this._reloadOpenFile(existingFile, filePath, workspaceId, windowNodeContextStore)
    }

    wsState.activeFile = filePath
  },

  /** Reads an already-open file again, the way it was first loaded; `editorDraft` is never touched. */
  _reloadOpenFile(
    this: any,
    fileState: OpenFileState,
    filePath: string,
    workspaceId: string,
    windowNodeContextStore: ReturnType<typeof useWindowNodeContextStore>,
  ) {
    const route = loadRouteOf(filePath, windowNodeContextStore)
    // A node file is fetched again whatever its type: its object URL is the only copy (autobyteus-471).
    if (route === 'node-file') {
      void this._loadNodeFile(filePath, workspaceId, windowNodeContextStore)
      return
    }
    if (fileState.type !== 'Text') {
      fileState.contentRevision += 1
      return
    }
    if (route === 'local') {
      void this._loadLocalFile(fileState, filePath)
      return
    }
    if (fileState.relativeResourceContext) {
      this.invalidateFileContent(filePath, workspaceId)
    }
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

  /**
   * Reads a node file once through the shared node-file loader (autobyteus-471 DS-001), with the window's owner
   * credential the desktop app attaches: text becomes content, a viewable type an object URL (revoked when the file
   * closes or is read again), a refusal the plain reason (`nodeFilePreviewError`, worded by the Files panel).
   */
  async _loadNodeFile(
    this: any,
    filePath: string,
    workspaceId: string,
    windowNodeContextStore: ReturnType<typeof useWindowNodeContextStore>,
  ) {
    const openFileState = (): OpenFileState | undefined =>
      this._getOrCreateWorkspaceState(workspaceId).openFiles.find((file: OpenFileState) => file.path === filePath)
    const fileState = openFileState()
    if (!fileState) return
    if (fileState.type !== 'Text' && !NODE_FILE_BLOB_TYPES.has(fileState.type)) {
      fileState.isLoading = false
      return
    }
    fileState.isLoading = true
    const restBaseUrl = windowNodeContextStore.getBoundEndpoints().rest
    const loaded = await loadNodeFile(restBaseUrl, filePath, fileState.type === 'Text')
    // Closed while it was read: nothing is kept (no object URL is made for it).
    const current = openFileState()
    if (!current) return
    releaseNodeFileUrl(current)
    current.url = null
    if (loaded.kind === 'refused') {
      current.content = null
      current.error = nodeFilePreviewError(loaded.refusal)
    } else if (loaded.kind === 'text') {
      current.content = loaded.content
      current.error = null
    } else {
      const url = URL.createObjectURL(loaded.blob)
      nodeFileObjectUrls.add(url)
      current.url = url
      current.error = null
      current.contentRevision += 1
    }
    current.isLoading = false
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
    const before = wsState.openFiles
    wsState.openFiles = wsState.openFiles.filter((file: OpenFileState) => file.path !== filePath)
    releaseClosedNodeFileUrls(before, wsState.openFiles)
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

    const before = wsState.openFiles
    wsState.openFiles = wsState.openFiles.filter((file: OpenFileState) => {
      return !isPathInDeletedScope(file.path, deletedPath)
    })
    releaseClosedNodeFileUrls(before, wsState.openFiles)

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
    releaseClosedNodeFileUrls(wsState.openFiles, [])
    wsState.openFiles = []
    wsState.activeFile = null
  },

  closeOtherFiles(this: any, exceptFilePath: string, workspaceId: string) {
    const wsState = this._getOrCreateWorkspaceState(workspaceId)
    const before = wsState.openFiles
    wsState.openFiles = wsState.openFiles.filter((file: OpenFileState) => file.path === exceptFilePath)
    releaseClosedNodeFileUrls(before, wsState.openFiles)
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

  updateEditorDraft(this: any, workspaceId: string, filePath: string, content: string) {
    const wsState = this._getWorkspaceState(workspaceId)
    const file = wsState?.openFiles.find((entry: OpenFileState) => entry.path === filePath)
    if (!file || file.type !== 'Text' || file.mode !== 'edit' || file.accessIntent?.readOnly) return
    // While a Save is pending, committed content is about to change, so input that matches
    // it now is not clean. The draft is settled against the resulting content when Save ends.
    const savePending = !!wsState.saveContentLoading[filePath]
    file.editorDraft = !savePending && content === file.content ? undefined : { content }
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
      // Later input made while Save was in flight belongs to the user: keep it unless it
      // equals the committed content now in effect (saved bytes on success, unchanged on failure).
      const file = wsState.openFiles.find((entry: OpenFileState) => entry.path === filePath)
      if (file?.editorDraft && file.editorDraft.content === file.content) file.editorDraft = undefined
      wsState.saveContentLoading[filePath] = false
    }
  },
}

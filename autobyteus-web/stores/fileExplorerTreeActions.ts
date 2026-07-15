import { getApolloClient } from '~/utils/apolloClient'
import { GetFolderChildren } from '~/graphql/queries/file_explorer_queries'
import type { FileSystemChangeEvent } from '~/types/fileSystemChangeTypes'
import { handleFileSystemChange as applyTreeChanges } from '~/utils/fileExplorer/fileUtils'
import {
  consumeRecentStructuralChangeEchoes,
  recordRecentStructuralChangeEchoes,
} from '~/utils/fileExplorer/stateSync'
import { replaceFolderChildren } from '~/utils/fileExplorer/openFolderRefresh'

export interface FetchFolderChildrenOptions {
  generation?: number
  signal?: AbortSignal
}

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === 'AbortError'

const describeGraphQLErrors = (errors: readonly any[]): string => errors
  .map((error) => error?.message || String(error))
  .filter(Boolean)
  .join('; ')

const createFolderChildrenError = (message: string): Error =>
  new Error(message || 'Folder contents could not be loaded.')

export const fileExplorerTreeActions = {
  beginFolderChildrenGeneration(this: any, workspaceId: string): number {
    const wsState = this._getOrCreateWorkspaceState(workspaceId)
    wsState.folderChildrenAbortController?.abort()
    wsState.folderChildrenGeneration += 1
    wsState.folderChildrenAbortController = new AbortController()
    return wsState.folderChildrenGeneration
  },

  invalidateFolderChildrenGeneration(this: any, workspaceId: string): number {
    const wsState = this._getWorkspaceState(workspaceId)
    if (!wsState) return 0

    wsState.folderChildrenGeneration += 1
    wsState.folderChildrenAbortController?.abort()
    wsState.folderChildrenAbortController = null
    return wsState.folderChildrenGeneration
  },

  isFolderChildrenGenerationCurrent(
    this: any,
    workspaceId: string,
    generation: number,
  ): boolean {
    const wsState = this._getWorkspaceState(workspaceId)
    return Boolean(wsState && wsState.folderChildrenGeneration === generation)
  },

  recordRecentStructuralChangeEcho(this: any, workspaceId: string, event: FileSystemChangeEvent) {
    const wsState = this._getOrCreateWorkspaceState(workspaceId)
    wsState.recentStructuralChangeEchoes = recordRecentStructuralChangeEchoes(
      wsState.recentStructuralChangeEchoes,
      event,
    )
  },

  consumeRecentStructuralChangeEchoes(
    this: any,
    workspaceId: string,
    event: FileSystemChangeEvent,
  ): FileSystemChangeEvent {
    const wsState = this._getOrCreateWorkspaceState(workspaceId)
    const result = consumeRecentStructuralChangeEchoes(wsState.recentStructuralChangeEchoes, event)
    wsState.recentStructuralChangeEchoes = result.remainingEchoes
    return result.filteredEvent
  },

  handleFileSystemChange(
    this: any,
    workspaceId: string,
    event: FileSystemChangeEvent,
    source: 'mutation' | 'stream' = 'stream',
  ) {
    const wsState = this._getOrCreateWorkspaceState(workspaceId)
    const effectiveEvent = source === 'stream'
      ? this.consumeRecentStructuralChangeEchoes(workspaceId, event)
      : event

    if (effectiveEvent.changes.length === 0) return
    applyTreeChanges(wsState.tree, wsState.nodeIdToNode, effectiveEvent)
    effectiveEvent.changes.forEach((change) => {
      if (change.type !== 'modify') return
      const node = wsState.nodeIdToNode[change.node_id]
      if (!node?.is_file) return
      if (wsState.filesToIgnoreNextModify.has(node.path)) {
        wsState.filesToIgnoreNextModify.delete(node.path)
        return
      }
      this.invalidateFileContent(node.path, workspaceId)
    })
  },

  async fetchFolderChildren(
    this: any,
    workspaceId: string,
    folderPath: string,
    options: FetchFolderChildrenOptions = {},
  ): Promise<void> {
    const wsState = this._getOrCreateWorkspaceState(workspaceId)
    const generation = options.generation ?? wsState.folderChildrenGeneration
    let controller = wsState.folderChildrenAbortController
    if (!options.signal && (!controller || controller.signal.aborted)) {
      controller = new AbortController()
      wsState.folderChildrenAbortController = controller
    }
    const signal = options.signal ?? controller?.signal
    const isStale = () =>
      Boolean(signal?.aborted || wsState.folderChildrenGeneration !== generation)
    const client = getApolloClient()
    try {
      const { data, errors } = await client.query({
        query: GetFolderChildren,
        variables: { workspaceId, folderPath },
        fetchPolicy: 'network-only',
        context: signal ? { fetchOptions: { signal } } : undefined,
      })
      if (isStale()) return
      if (errors?.length) {
        throw createFolderChildrenError(describeGraphQLErrors(errors))
      }
      if (typeof data?.folderChildren !== 'string' || !data.folderChildren) {
        throw createFolderChildrenError('Folder children response was missing.')
      }

      let folderData: any
      try {
        folderData = JSON.parse(data.folderChildren)
      } catch {
        throw createFolderChildrenError('Folder children response was invalid.')
      }
      if (isStale()) return
      if (!folderData || typeof folderData !== 'object') {
        throw createFolderChildrenError('Folder children response was invalid.')
      }
      if (folderData.error) {
        throw createFolderChildrenError(String(folderData.error))
      }
      if (!folderData.id) {
        throw createFolderChildrenError('Folder children response did not include a folder id.')
      }
      if (!Array.isArray(folderData.children)) {
        throw createFolderChildrenError('Folder children response did not include a children list.')
      }

      if (folderPath === '' || folderPath === '/') {
        const oldId = wsState.tree.id
        if (oldId !== folderData.id) {
          wsState.tree.id = folderData.id
          delete wsState.nodeIdToNode[oldId]
        }
        wsState.tree.path = folderData.path ?? wsState.tree.path
        if (folderData.name) wsState.tree.name = folderData.name
        wsState.nodeIdToNode[folderData.id] = wsState.tree
      }

      let folderNode = wsState.nodeIdToNode[folderData.id]
      if (!folderNode && (folderPath === '' || folderPath === '/')) {
        folderNode = wsState.tree
      }
      if (!folderNode) {
        throw createFolderChildrenError(`Folder node not found for path: ${folderPath || '/'}`)
      }
      if (isStale()) return
      replaceFolderChildren(folderNode, folderData.children, wsState.nodeIdToNode)
    } catch (error) {
      if (isAbortError(error) || signal?.aborted || wsState.folderChildrenGeneration !== generation) {
        return
      }
      console.error('Error fetching folder children:', error)
      throw error
    }
  },
}

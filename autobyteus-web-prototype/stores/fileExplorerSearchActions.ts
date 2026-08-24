import { getApolloClient } from '~/utils/apolloClient'
import { SearchFiles } from '~/graphql/queries/file_explorer_queries'
import type { SearchFilesQuery, SearchFilesQueryVariables } from '~/generated/graphql'
import { findFileByPath } from '~/utils/fileExplorer/fileUtils'
import { TreeNode } from '~/utils/fileExplorer/TreeNode'

const nodeForSearchPath = (filePath: string): TreeNode => {
  const fileName = filePath.split('/').pop() || filePath
  return new TreeNode(fileName, filePath, true, [], `search-${filePath}`, true)
}

export const fileExplorerSearchActions = {
  abortSearch(this: any, workspaceId: string) {
    const wsState = this._getWorkspaceState(workspaceId)
    if (!wsState) return

    wsState.searchAbortController?.abort()
    wsState.searchAbortController = null
    wsState.searchLoading = false
  },

  async searchFiles(this: any, query: string, workspaceId: string) {
    const wsState = this._getOrCreateWorkspaceState(workspaceId)
    wsState.searchAbortController?.abort()
    wsState.searchAbortController = new AbortController()
    const currentAbortController = wsState.searchAbortController
    wsState.searchLoading = true
    wsState.searchError = null

    if (!query.trim()) {
      wsState.searchResults = []
      wsState.searchLoading = false
      return
    }
    if (!workspaceId) {
      wsState.searchError = 'workspaceId required for search.'
      wsState.searchLoading = false
      return
    }

    try {
      const client = getApolloClient()
      const { data, errors } = await client.query<SearchFilesQuery, SearchFilesQueryVariables>({
        query: SearchFiles,
        variables: { workspaceId, query },
        context: { fetchOptions: { signal: currentAbortController.signal } },
      })
      if (currentAbortController.signal.aborted) return
      if (errors?.length) throw new Error(errors.map((error) => error.message).join(', '))

      const treeChildren = this._getWorkspaceState(workspaceId)?.tree.children || []
      wsState.searchResults = (data?.searchFiles || []).map((filePath) => {
        return findFileByPath(treeChildren, filePath) || nodeForSearchPath(filePath)
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      console.error('Error searching files:', error)
      wsState.searchError = error instanceof Error ? error.message : 'An unknown error occurred'
      throw error
    } finally {
      if (!currentAbortController.signal.aborted) {
        wsState.searchLoading = false
      }
    }
  },
}

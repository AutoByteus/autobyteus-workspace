import { getApolloClient } from '~/utils/apolloClient'
import {
  DeleteFileOrFolder,
  MoveFileOrFolder,
  RenameFileOrFolder,
  CreateFileOrFolder,
} from '~/graphql/mutations/file_explorer_mutations'
import type {
  DeleteFileOrFolderMutation,
  DeleteFileOrFolderMutationVariables,
  MoveFileOrFolderMutation,
  MoveFileOrFolderMutationVariables,
  RenameFileOrFolderMutation,
  RenameFileOrFolderMutationVariables,
  CreateFileOrFolderMutation,
  CreateFileOrFolderMutationVariables,
} from '~/generated/graphql'
import type { FileSystemChangeEvent } from '~/types/fileSystemChangeTypes'

const messagesFromErrors = (errors: readonly { message: string }[] | undefined): string | null => {
  return errors?.length ? errors.map((error) => error.message).join(', ') : null
}

export const fileExplorerMutationActions = {
  async deleteFileOrFolder(this: any, filePath: string, workspaceId: string) {
    const wsState = this._getOrCreateWorkspaceState(workspaceId)
    wsState.deleteError[filePath] = null
    wsState.deleteLoading[filePath] = true
    if (!workspaceId) throw new Error('workspaceId required')

    try {
      const client = getApolloClient()
      const { data, errors } = await client.mutate<DeleteFileOrFolderMutation, DeleteFileOrFolderMutationVariables>({
        mutation: DeleteFileOrFolder,
        variables: { workspaceId, path: filePath },
      })
      const message = messagesFromErrors(errors)
      if (message) throw new Error(message)
      if (data?.deleteFileOrFolder) {
        this.closePathScopedFiles(filePath, workspaceId)
        this._applyMutationChangeEvent(workspaceId, data.deleteFileOrFolder)
      }
      wsState.deleteLoading[filePath] = false
      return data
    } catch (error) {
      console.error('Failed to delete file/folder:', error)
      wsState.deleteError[filePath] = error instanceof Error ? error.message : 'An unknown error occurred'
      wsState.deleteLoading[filePath] = false
      throw error
    }
  },

  async renameFileOrFolder(this: any, targetPath: string, newName: string, workspaceId: string) {
    const wsState = this._getOrCreateWorkspaceState(workspaceId)
    wsState.renameError[targetPath] = null
    wsState.renameLoading[targetPath] = true
    if (!workspaceId) throw new Error('workspaceId required')

    try {
      const client = getApolloClient()
      const { data, errors } = await client.mutate<RenameFileOrFolderMutation, RenameFileOrFolderMutationVariables>({
        mutation: RenameFileOrFolder,
        variables: { workspaceId, targetPath, newName },
      })
      const message = messagesFromErrors(errors)
      if (message) throw new Error(message)
      if (data?.renameFileOrFolder) {
        const segments = targetPath.split('/')
        segments[segments.length - 1] = newName
        this.remapPathScopedState(targetPath, segments.join('/'), workspaceId)
        this._applyMutationChangeEvent(workspaceId, data.renameFileOrFolder)
      }
      wsState.renameLoading[targetPath] = false
      return data
    } catch (error) {
      console.error('Failed to rename file/folder:', error)
      wsState.renameError[targetPath] = error instanceof Error ? error.message : 'An unknown error occurred'
      wsState.renameLoading[targetPath] = false
      throw error
    }
  },

  async moveFileOrFolder(this: any, sourcePath: string, destinationPath: string, workspaceId: string) {
    const wsState = this._getOrCreateWorkspaceState(workspaceId)
    wsState.moveError[sourcePath] = null
    wsState.moveLoading[sourcePath] = true
    if (!workspaceId) throw new Error('workspaceId required')

    try {
      const client = getApolloClient()
      const { data, errors } = await client.mutate<MoveFileOrFolderMutation, MoveFileOrFolderMutationVariables>({
        mutation: MoveFileOrFolder,
        variables: { workspaceId, sourcePath, destinationPath },
      })
      const message = messagesFromErrors(errors)
      if (message) throw new Error(message)
      if (data?.moveFileOrFolder) {
        this.remapPathScopedState(sourcePath, destinationPath, workspaceId)
        this._applyMutationChangeEvent(workspaceId, data.moveFileOrFolder)
      }
      wsState.moveLoading[sourcePath] = false
      return data
    } catch (error) {
      console.error('Failed to move file/folder:', error)
      wsState.moveError[sourcePath] = error instanceof Error ? error.message : 'An unknown error occurred'
      wsState.moveLoading[sourcePath] = false
      throw error
    }
  },

  async createFileOrFolder(this: any, path: string, isFile: boolean, workspaceId: string) {
    const wsState = this._getOrCreateWorkspaceState(workspaceId)
    wsState.createError[path] = null
    wsState.createLoading[path] = true
    if (!workspaceId) throw new Error('workspaceId required')

    try {
      const client = getApolloClient()
      const { data, errors } = await client.mutate<CreateFileOrFolderMutation, CreateFileOrFolderMutationVariables>({
        mutation: CreateFileOrFolder,
        variables: { workspaceId, path, isFile },
      })
      const message = messagesFromErrors(errors)
      if (message) throw new Error(message)
      if (data?.createFileOrFolder) {
        this._applyMutationChangeEvent(workspaceId, data.createFileOrFolder)
      }
      wsState.createLoading[path] = false
      return data
    } catch (error) {
      console.error('Failed to create file/folder:', error)
      wsState.createError[path] = error instanceof Error ? error.message : 'An unknown error occurred'
      wsState.createLoading[path] = false
      throw error
    }
  },

  _applyMutationChangeEvent(this: any, workspaceId: string, rawChangeEvent: string) {
    const changeEvent: FileSystemChangeEvent = JSON.parse(rawChangeEvent)
    this.recordRecentStructuralChangeEcho(workspaceId, changeEvent)
    this.handleFileSystemChange(workspaceId, changeEvent, 'mutation')
  },
}

import { defineStore } from 'pinia'
import { getApolloClient } from '~/utils/apolloClient'
import { GetFileContent, SearchFiles } from '~/graphql/queries/file_explorer_queries'
import { 
  WriteFileContent, 
  DeleteFileOrFolder, 
  MoveFileOrFolder,
  RenameFileOrFolder,
  CreateFileOrFolder
} from '~/graphql/mutations/file_explorer_mutations'
import type { 
  GetFileContentQuery, 
  GetFileContentQueryVariables, 
  WriteFileContentMutation, 
  WriteFileContentMutationVariables,
  DeleteFileOrFolderMutation,
  DeleteFileOrFolderMutationVariables,
  MoveFileOrFolderMutation,
  MoveFileOrFolderMutationVariables,
  SearchFilesQuery,
  SearchFilesQueryVariables,
  RenameFileOrFolderMutation,
  RenameFileOrFolderMutationVariables,
  CreateFileOrFolderMutation,
  CreateFileOrFolderMutationVariables
} from '~/generated/graphql'
import { useWorkspaceStore } from '~/stores/workspace'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import type { FileSystemChangeEvent } from '~/types/fileSystemChangeTypes'
import { findFileByPath, determineFileType } from '~/utils/fileExplorer/fileUtils'
import { TreeNode } from '~/utils/fileExplorer/TreeNode'

// --- NEW TYPES FOR MULTI-CONTENT SUPPORT ---
export type FileDataType = 'Text' | 'Image' | 'Audio' | 'Video' | 'Excel' | 'PDF' | 'Unsupported';

export type FileOpenMode = 'edit' | 'preview';

export interface OpenFileState {
  path: string;
  type: FileDataType;
  mode: FileOpenMode;
  content: string | null; // For text files
  url: string | null;     // For media files
  isLoading: boolean;
  error: string | null;
}
// ------------------------------------------

interface WorkspaceFileExplorerState {
  openFolders: Record<string, boolean>;
  openFiles: OpenFileState[];
  activeFile: string | null;
  
  // State for file search
  searchResults: any[];
  searchLoading: boolean;
  searchError: string | null;
  searchAbortController: AbortController | null;
  
  // State for manual saves from the editor
  saveContentError: Record<string, string | null>;
  saveContentLoading: Record<string, boolean>;

  // State for other file operations
  deleteError: Record<string, string | null>;
  deleteLoading: Record<string, boolean>;
  moveError: Record<string, string | null>;
  moveLoading: Record<string, boolean>;
  renameError: Record<string, string | null>;
  renameLoading: Record<string, boolean>;
  createError: Record<string, string | null>;
  createLoading: Record<string, boolean>;

  // Used to prevent re-fetching content for self-initiated saves
  filesToIgnoreNextModify: Set<string>;
}

interface FileExplorerStoreState {
  fileExplorerStateByWorkspace: Map<string, WorkspaceFileExplorerState>;
}

const createDefaultWorkspaceFileExplorerState = (): WorkspaceFileExplorerState => ({
  openFolders: {},
  openFiles: [],
  activeFile: null,
  searchResults: [],
  searchLoading: false,
  searchError: null,
  searchAbortController: null,
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
});

/**
 * Checks if a path is an absolute local file path (for Windows, Linux, macOS).
 * @param path The path string to check.
 * @returns True if it's an absolute local path.
 */
function isAbsoluteLocalPath(path: string): boolean {
  // Unix-like paths start with '/'
  if (path.startsWith('/')) {
    return true;
  }
  // Windows paths start with a drive letter, e.g., C:\
  if (/^[a-zA-Z]:[\\/]/.test(path)) {
    return true;
  }
  return false;
}


export const useFileExplorerStore = defineStore('fileExplorer', {
  state: (): FileExplorerStoreState => ({
    fileExplorerStateByWorkspace: new Map(),
  }),

  getters: {
    _getWorkspaceState: (state) => (workspaceId: string): WorkspaceFileExplorerState | null => {
      if (!workspaceId) return null;
      return state.fileExplorerStateByWorkspace.get(workspaceId) || null;
    },

    isFolderOpen: (state) => (folderPath: string, workspaceId: string): boolean => {
      const wsState = state.fileExplorerStateByWorkspace.get(workspaceId);
      return wsState ? !!wsState.openFolders[folderPath] : false;
    },
    getOpenFiles: (state) => (workspaceId: string): string[] => {
      const wsState = state.fileExplorerStateByWorkspace.get(workspaceId);
      return wsState ? wsState.openFiles.map(f => f.path) : [];
    },
    getActiveFile: (state) => (workspaceId: string): string | null => {
      const wsState = state.fileExplorerStateByWorkspace.get(workspaceId);
      return wsState ? wsState.activeFile : null;
    },
    getActiveFileData: (state) => (workspaceId: string): OpenFileState | null => {
      const wsState = state.fileExplorerStateByWorkspace.get(workspaceId);
      if (!wsState || !wsState.activeFile) return null;
      return wsState.openFiles.find(f => f.path === wsState.activeFile) || null;
    },
    getFileContent: (state) => (filePath: string, workspaceId: string): string | null => {
      const wsState = state.fileExplorerStateByWorkspace.get(workspaceId);
      if (!wsState) return null;
      const file = wsState.openFiles.find(f => f.path === filePath);
      return file ? file.content : null;
    },
    isContentLoading: (state) => (filePath: string, workspaceId: string): boolean => {
      const wsState = state.fileExplorerStateByWorkspace.get(workspaceId);
      if (!wsState) return false;
      const file = wsState.openFiles.find(f => f.path === filePath);
      return file ? file.isLoading : false;
    },
    getContentError: (state) => (filePath: string, workspaceId: string): string | null => {
      const wsState = state.fileExplorerStateByWorkspace.get(workspaceId);
      if (!wsState) return null;
      const file = wsState.openFiles.find(f => f.path === filePath);
      return file ? file.error : null;
    },
    getSearchResults: (state) => (workspaceId: string): any[] => {
      const wsState = state.fileExplorerStateByWorkspace.get(workspaceId);
      return wsState ? wsState.searchResults : [];
    },
    isSearchLoading: (state) => (workspaceId: string): boolean => {
        const wsState = state.fileExplorerStateByWorkspace.get(workspaceId);
      return wsState ? wsState.searchLoading : false;
    },
    getSearchError: (state) => (workspaceId: string): string | null => {
        const wsState = state.fileExplorerStateByWorkspace.get(workspaceId);
      return wsState ? wsState.searchError : null;
    },
    isSaveContentLoading: (state) => (filePath: string, workspaceId: string): boolean => {
        const wsState = state.fileExplorerStateByWorkspace.get(workspaceId);
      return wsState?.saveContentLoading[filePath] || false;
    },
    getSaveContentError: (state) => (filePath: string, workspaceId: string): string | null => {
        const wsState = state.fileExplorerStateByWorkspace.get(workspaceId);
      return wsState?.saveContentError[filePath] || null;
    },
  },

  actions: {
    /**
     * Internal helper to get state. THROWS if workspaceId is missing or session invalid.
     * Callers must ensure workspaceId is provided.
     */
    _getOrCreateWorkspaceState(workspaceId: string): WorkspaceFileExplorerState {
      if (!workspaceId) {
        throw new Error("Cannot get file explorer state: workspaceId is required.");
      }
      if (!this.fileExplorerStateByWorkspace.has(workspaceId)) {
        this.fileExplorerStateByWorkspace.set(workspaceId, createDefaultWorkspaceFileExplorerState());
      }
      return this.fileExplorerStateByWorkspace.get(workspaceId)!;
    },

    toggleFolder(folderPath: string, workspaceId: string) {
      const wsState = this._getOrCreateWorkspaceState(workspaceId);
      wsState.openFolders[folderPath] = !wsState.openFolders[folderPath];
    },

    async openFile(filePath: string, workspaceId: string) {
      return this._openFileWithMode(filePath, 'edit', workspaceId);
    },

    async openFilePreview(filePath: string, workspaceId: string) {
      return this._openFileWithMode(filePath, 'preview', workspaceId);
    },

    async _openFileWithMode(filePath: string, mode: FileOpenMode, workspaceId: string) {
      console.log(`[FileExplorer] Opening file: ${filePath}`);
      const wsState = this._getOrCreateWorkspaceState(workspaceId);
      const windowNodeContextStore = useWindowNodeContextStore();

      const existingFile = wsState.openFiles.find(f => f.path === filePath);

      if (!existingFile) {
          const fileType = await determineFileType(filePath);
          console.log(`[FileExplorer] Determined file type for "${filePath}": ${fileType}`);

          const newFileState: OpenFileState = {
              path: filePath,
              type: fileType,
              mode,
              content: null,
              url: null,
              isLoading: true,
              error: null,
          };
          wsState.openFiles.push(newFileState);
          console.log('[FileExplorer] Pushed new initial file state:', JSON.parse(JSON.stringify(newFileState)));

          // **NEW LOGIC: Handle local absolute paths in Electron**
          if (windowNodeContextStore.isEmbeddedWindow && isAbsoluteLocalPath(filePath) && window.electronAPI) {
              console.log(`[FileExplorer] Handling as a local absolute path in Electron.`);
              if (newFileState.type === 'Text') {
                  try {
                      const result = await window.electronAPI.readLocalTextFile(filePath);
                      if (result.success) {
                          newFileState.content = result.content ?? '';
                      } else {
                          newFileState.error = result.error || 'Failed to read local file.';
                      }
                  } catch (e) {
                      newFileState.error = e instanceof Error ? e.message : String(e);
                  }
              } else if (['Image', 'Audio', 'Video', 'Excel', 'PDF'].includes(newFileState.type)) {
                  // Use the custom 'local-file' protocol
                  newFileState.url = `local-file://${filePath}`;
                  console.log(`[FileExplorer] Constructed local media URL: ${newFileState.url}`);
              } else {
                  console.warn(`[FileExplorer] Unsupported local file type "${newFileState.type}" for "${filePath}".`);
                  newFileState.error = 'Unsupported file type for local preview.';
              }
              newFileState.isLoading = false;
          } else {
              // --- Original logic for workspace files and web URLs ---
              const isExternalUrl = filePath.startsWith('http://') || filePath.startsWith('https://');
              if (isExternalUrl) {
                  console.log(`[FileExplorer] Handling as an external URL.`);
                  newFileState.url = filePath;
                  newFileState.isLoading = false;
              } else {
                  console.log(`[FileExplorer] Handling as a workspace path.`);
                  if (newFileState.type === 'Text') {
                      console.log(`[FileExplorer] Fetching text content for "${filePath}" via GraphQL.`);
                      this.fetchFileContent(filePath, workspaceId);
                  } else if (['Image', 'Audio', 'Video', 'Excel', 'PDF'].includes(newFileState.type)) {
                      if (workspaceId) {
                          const restBaseUrl = windowNodeContextStore.getBoundEndpoints().rest.replace(/\/$/, '');
                          const encodedFilePath = encodeURIComponent(filePath);
                          newFileState.url = `${restBaseUrl}/workspaces/${workspaceId}/content?path=${encodedFilePath}`;
                          newFileState.isLoading = false;
                          console.log(`[FileExplorer] Constructed absolute media URL for "${filePath}": ${newFileState.url}`);
                      } else {
                          newFileState.error = "No workspaceId provided for media URL.";
                          newFileState.isLoading = false;
                          console.error(`[FileExplorer] Cannot construct media URL: No active workspace.`);
                      }
                  } else {
                      console.warn(`[FileExplorer] Unsupported file type "${newFileState.type}" for "${filePath}".`);
                      newFileState.isLoading = false;
                  }
              }
          }
      } else {
          // If already open, just update the desired mode
          existingFile.mode = mode;
      }

      wsState.activeFile = filePath;
  },

    setFileMode(filePath: string, mode: FileOpenMode, workspaceId: string) {
      const wsState = this._getOrCreateWorkspaceState(workspaceId);
      const file = wsState.openFiles.find(f => f.path === filePath);
      if (file) {
        file.mode = mode;
      }
    },

    closeFile(filePath: string, workspaceId: string) {
      const wsState = this._getOrCreateWorkspaceState(workspaceId);
      wsState.openFiles = wsState.openFiles.filter(file => file.path !== filePath);

      if (wsState.activeFile === filePath) {
        const lastOpenFile = wsState.openFiles[wsState.openFiles.length - 1];
        wsState.activeFile = lastOpenFile ? lastOpenFile.path : null;
      }
    },

    setActiveFile(filePath: string, workspaceId: string) {
      const wsState = this._getOrCreateWorkspaceState(workspaceId);
      if (wsState.openFiles.some(f => f.path === filePath)) {
        wsState.activeFile = filePath;
      }
    },

    closeAllFiles(workspaceId: string) {
      const wsState = this._getOrCreateWorkspaceState(workspaceId);
      wsState.openFiles = [];
      wsState.activeFile = null;
    },

    closeOtherFiles(exceptFilePath: string, workspaceId: string) {
      const wsState = this._getOrCreateWorkspaceState(workspaceId);
      // Keep only the file that matches the exceptFilePath
      wsState.openFiles = wsState.openFiles.filter(file => file.path === exceptFilePath);
      // Ensure the kept file is active
      if (wsState.openFiles.length > 0) {
        wsState.activeFile = exceptFilePath;
      } else {
        wsState.activeFile = null;
      }
    },

    navigateToNextTab(workspaceId: string) {
      const wsState = this._getOrCreateWorkspaceState(workspaceId);
      if (wsState.openFiles.length <= 1) return;
      
      const currentIndex = wsState.openFiles.findIndex(f => f.path === wsState.activeFile);
      if (currentIndex === -1) return;

      const nextIndex = (currentIndex + 1) % wsState.openFiles.length;
      wsState.activeFile = wsState.openFiles[nextIndex].path;
    },

    navigateToPreviousTab(workspaceId: string) {
      const wsState = this._getOrCreateWorkspaceState(workspaceId);
      if (wsState.openFiles.length <= 1) return;
      
      const currentIndex = wsState.openFiles.findIndex(f => f.path === wsState.activeFile);
      if (currentIndex === -1) return;

      const prevIndex = currentIndex <= 0 ? wsState.openFiles.length - 1 : currentIndex - 1;
      wsState.activeFile = wsState.openFiles[prevIndex].path;
    },

    async fetchFileContent(filePath: string, workspaceId: string) {
      const wsState = this._getOrCreateWorkspaceState(workspaceId);
      const file = wsState.openFiles.find(f => f.path === filePath);
      if (!file || file.content !== null) return;

      file.isLoading = true;
      file.error = null;

      if (!workspaceId) throw new Error("workspaceId required for fetching content");

      try {
        const client = getApolloClient()
        const { data, errors } = await client.query<GetFileContentQuery, GetFileContentQueryVariables>({
          query: GetFileContent,
          variables: { workspaceId, filePath },
          fetchPolicy: 'network-only'
        });

        if (errors && errors.length > 0) {
          throw new Error(errors.map(e => e.message).join(', '));
        }
        
        if (data) {
          const content = data.fileContent ?? '';
          if (file) {
            file.content = content;
            file.isLoading = false;
          }
          return content;
        }
      } catch (error) {
        console.error('Failed to fetch file content', error);
        if (file) {
          file.error = error instanceof Error ? error.message : 'Failed to fetch file content';
          file.isLoading = false;
        }
        throw error;
      }
    },
    
    invalidateFileContent(filePath: string, workspaceId: string) {
      const wsState = this._getOrCreateWorkspaceState(workspaceId);
      const file = wsState.openFiles.find(f => f.path === filePath);

      if (file && file.type === 'Text') {
        file.content = null;
        this.fetchFileContent(filePath, workspaceId);
      }
    },

    /**
     * Core private action for writing file content. Handles the GraphQL mutation and
     * updates the primary state. It is called by public wrapper actions.
     * @private
     */
    async _writeFileCore(workspaceId: string, filePath: string, content: string) {
      const client = getApolloClient()
      const wsState = this._getOrCreateWorkspaceState(workspaceId);
      
      // "Tag" this file to ignore the incoming subscription event echo for 'modify'
      wsState.filesToIgnoreNextModify.add(filePath);
      // Safety timeout to clear the tag in case the subscription message fails
      setTimeout(() => {
        wsState.filesToIgnoreNextModify.delete(filePath);
      }, 5000);

      try {
        const { data, errors } = await client.mutate<WriteFileContentMutation, WriteFileContentMutationVariables>({
          mutation: WriteFileContent,
          variables: { workspaceId, filePath, content },
        });
      
        if (errors && errors.length > 0) {
          wsState.filesToIgnoreNextModify.delete(filePath);
          throw new Error(errors.map(e => e.message).join(', '));
        }

        if (data?.writeFileContent) {
          // Optimistic update: the mutation was successful, so update our local state immediately.
          const file = wsState.openFiles.find(f => f.path === filePath);
          if (file) {
            file.content = content;
          }
          // Let the subscription handle the tree change event to avoid double-processing.
          // The subscription will call handleFileSystemChange, which will now intelligently
          // ignore the 'modify' event for this file path.
          const changeEvent: FileSystemChangeEvent = JSON.parse(data.writeFileContent);
          const workspaceStore = useWorkspaceStore();
          workspaceStore.handleFileSystemChange(workspaceId, changeEvent);
        } else {
          wsState.filesToIgnoreNextModify.delete(filePath); // Clean up tag on error
          throw new Error('An unknown error occurred while writing the file.');
        }
      } catch (err) {
        console.error('Core file write operation failed:', err);
        wsState.filesToIgnoreNextModify.delete(filePath); // Clean up tag on error
        // Re-throw the error to be caught by the calling wrapper action
        throw err;
      }
    },

    /**
     * Saves file content, typically initiated by a user from the file editor.
     * Manages UI state for save indicators in the editor.
     */
    async saveFileContentFromEditor(workspaceId: string, filePath: string, content: string) {
      const wsState = this._getOrCreateWorkspaceState(workspaceId);
      wsState.saveContentError[filePath] = null;
      wsState.saveContentLoading[filePath] = true;

      try {
        await this._writeFileCore(workspaceId, filePath, content);
      } catch (err) {
        wsState.saveContentError[filePath] = err instanceof Error ? err.message : 'An unknown error occurred';
        // Let the component handle the error propagation if needed
        throw err;
      } finally {
        wsState.saveContentLoading[filePath] = false;
      }
    },

    
    async deleteFileOrFolder(filePath: string, workspaceId: string) {
      const wsState = this._getOrCreateWorkspaceState(workspaceId);
      wsState.deleteError[filePath] = null;
      wsState.deleteLoading[filePath] = true;

      // const workspaceStore = useWorkspaceStore();
      // const actualWorkspaceId = workspaceId || workspaceStore.activeWorkspace?.workspaceId;
      if (!workspaceId) throw new Error("workspaceId required");

      try {
        const client = getApolloClient()
        const { data, errors } = await client.mutate<DeleteFileOrFolderMutation, DeleteFileOrFolderMutationVariables>({
          mutation: DeleteFileOrFolder,
          variables: { workspaceId, path: filePath },
        });

        if (errors && errors.length > 0) {
          throw new Error(errors.map(e => e.message).join(', '));
        }

        if (data?.deleteFileOrFolder) {
          if (wsState.openFiles.some(f => f.path === filePath)) this.closeFile(filePath, workspaceId);
          wsState.openFiles = wsState.openFiles.filter(file => !file.path.startsWith(filePath + '/'));
          
          const changeEvent: FileSystemChangeEvent = JSON.parse(data.deleteFileOrFolder);
          const workspaceStore = useWorkspaceStore();
          workspaceStore.handleFileSystemChange(workspaceId, changeEvent);
        }
        wsState.deleteLoading[filePath] = false;
        return data;
      } catch (err) {
        console.error('Failed to delete file/folder:', err);
        wsState.deleteError[filePath] = err instanceof Error ? err.message : 'An unknown error occurred';
        wsState.deleteLoading[filePath] = false;
        throw err;
      }
    },
    
    async renameFileOrFolder(targetPath: string, newName: string, workspaceId: string) {
      const wsState = this._getOrCreateWorkspaceState(workspaceId);
      wsState.renameError[targetPath] = null;
      wsState.renameLoading[targetPath] = true;
    
      if (!workspaceId) throw new Error("workspaceId required");
    
    
      try {
        const client = getApolloClient()
        const { data, errors } = await client.mutate<RenameFileOrFolderMutation, RenameFileOrFolderMutationVariables>({
          mutation: RenameFileOrFolder,
          variables: { workspaceId, targetPath, newName },
        });
    
        if (errors && errors.length > 0) {
          throw new Error(errors.map(e => e.message).join(', '));
        }
    
        if (data?.renameFileOrFolder) {
          const segments = targetPath.split('/');
          segments[segments.length - 1] = newName;
          const newPath = segments.join('/');
    
          const file = wsState.openFiles.find(f => f.path === targetPath);
          if (file) {
            file.path = newPath;
          }
          if (wsState.activeFile === targetPath) {
            wsState.activeFile = newPath;
          }
    
          const changeEvent: FileSystemChangeEvent = JSON.parse(data.renameFileOrFolder);
          const workspaceStore = useWorkspaceStore();
          workspaceStore.handleFileSystemChange(workspaceId, changeEvent);
        }
    
        wsState.renameLoading[targetPath] = false;
        return data;
      } catch (err) {
        console.error('Failed to rename file/folder:', err);
        wsState.renameError[targetPath] = err instanceof Error ? err.message : 'An unknown error occurred';
        wsState.renameLoading[targetPath] = false;
        throw err;
      }
    },
    
    async moveFileOrFolder(sourcePath: string, destinationPath: string, workspaceId: string) {
      const wsState = this._getOrCreateWorkspaceState(workspaceId);
      wsState.moveError[sourcePath] = null;
      wsState.moveLoading[sourcePath] = true;
    
      if (!workspaceId) throw new Error("workspaceId required");
      
      try {
        const client = getApolloClient()
        const { data, errors } = await client.mutate<MoveFileOrFolderMutation, MoveFileOrFolderMutationVariables>({
          mutation: MoveFileOrFolder,
          variables: { workspaceId, sourcePath, destinationPath },
        });
    
        if (errors && errors.length > 0) {
          throw new Error(errors.map(e => e.message).join(', '));
        }
    
        if (data?.moveFileOrFolder) {
          const file = wsState.openFiles.find(f => f.path === sourcePath);
          if (file) {
            file.path = destinationPath;
          }
          if (wsState.activeFile === sourcePath) {
            wsState.activeFile = destinationPath;
          }
   
          const changeEvent: FileSystemChangeEvent = JSON.parse(data.moveFileOrFolder);
          const workspaceStore = useWorkspaceStore();
          workspaceStore.handleFileSystemChange(workspaceId, changeEvent);
        }
        wsState.moveLoading[sourcePath] = false;
        return data;
    
      } catch (err) {
        console.error('Failed to move file/folder:', err);
        wsState.moveError[sourcePath] = err instanceof Error ? err.message : 'An unknown error occurred';
        wsState.moveLoading[sourcePath] = false;
        throw err;
      }
    },

    async createFileOrFolder(path: string, isFile: boolean, workspaceId: string) {
      const wsState = this._getOrCreateWorkspaceState(workspaceId);
      wsState.createError[path] = null;
      wsState.createLoading[path] = true;

      if (!workspaceId) throw new Error("workspaceId required");

      try {
        const client = getApolloClient()
        const { data, errors } = await client.mutate<CreateFileOrFolderMutation, CreateFileOrFolderMutationVariables>({
          mutation: CreateFileOrFolder,
          variables: { workspaceId, path, isFile },
        });

        if (errors && errors.length > 0) {
            throw new Error(errors.map(e => e.message).join(', '));
        }

        if (data?.createFileOrFolder) {
            const changeEvent: FileSystemChangeEvent = JSON.parse(data.createFileOrFolder);
            const workspaceStore = useWorkspaceStore();
            workspaceStore.handleFileSystemChange(workspaceId, changeEvent);
        }
        wsState.createLoading[path] = false;
        return data;

      } catch(err) {
        console.error('Failed to create file/folder:', err);
        wsState.createError[path] = err instanceof Error ? err.message : 'An unknown error occurred';
        wsState.createLoading[path] = false;
        throw err;
      }
    },

    async searchFiles(query: string, workspaceId: string) {
      const wsState = this._getOrCreateWorkspaceState(workspaceId);
      const workspaceStore = useWorkspaceStore();
      
      // Cancel any previous in-flight search request
      if (wsState.searchAbortController) {
        wsState.searchAbortController.abort();
      }
      wsState.searchAbortController = new AbortController();
      const currentAbortController = wsState.searchAbortController;
      
      wsState.searchLoading = true;
      wsState.searchError = null;
      
      if (!query.trim()) {
        wsState.searchResults = [];
        wsState.searchLoading = false;
        return;
      }
      
      if (!workspaceId) {
        wsState.searchError = "workspaceId required for search.";
        wsState.searchLoading = false;
        return;
      }
      
      try {
        const client = getApolloClient()
        const { data, errors } = await client.query<SearchFilesQuery, SearchFilesQueryVariables>({
          query: SearchFiles,
          variables: { workspaceId, query },
          context: {
            fetchOptions: {
              signal: currentAbortController.signal
            }
          }
        });

        // Check if this request was aborted (a newer request superseded it)
        if (currentAbortController.signal.aborted) {
          return;
        }

        if (errors && errors.length > 0) {
          throw new Error(errors.map(e => e.message).join(', '));
        }

        if (data?.searchFiles) {
          const matchedPaths = data.searchFiles;
          // Create TreeNode objects from returned paths
          // We don't require the file to exist in the loaded tree,
          // since the tree might be shallowly loaded
          wsState.searchResults = matchedPaths.map(filePath => {
            // First try to find in the tree (for proper node metadata)
            const existingNode = findFileByPath(
              workspaceStore.currentWorkspaceTree?.children || [], 
              filePath
            );
            if (existingNode) {
              return existingNode;
            }
            
            // If not in tree, create a simple TreeNode from the path
            const fileName = filePath.split('/').pop() || filePath;
            return new TreeNode(
              fileName,     // name
              filePath,     // path
              true,         // is_file (search results are files)
              [],           // children
              `search-${filePath}`, // id (unique for search results)
              true          // childrenLoaded
            );
          });
        } else {
          wsState.searchResults = [];
        }
      } catch (error) {
        // Ignore aborted requests - they're intentional when a new search supersedes
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        console.error('Error searching files:', error);
        wsState.searchError = error instanceof Error ? error.message : 'An unknown error occurred';
        throw error;
      } finally {
        // Only update loading state if this is still the current request
        if (!currentAbortController.signal.aborted) {
          wsState.searchLoading = false;
        }
      }
    },
    
  }
});

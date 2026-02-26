import { computed, unref } from 'vue';
import type { MaybeRef } from 'vue';
import { useFileExplorerStore } from '~/stores/fileExplorer';
import { useWorkspaceStore } from '~/stores/workspace';

/**
 * A composable that provides a scoped File Explorer interface for a specific workspace.
 * Uses the Global FileExplorerStore but binds all actions and getters to the provided workspaceId.
 * defaults to the active workspace if no ID is provided or if the ref is null/undefined.
 */
export function useWorkspaceFileExplorer(workspaceIdRef?: MaybeRef<string | undefined | null>) {
    const store = useFileExplorerStore();
    const workspaceStore = useWorkspaceStore();

    // Helper to get raw ID safely, falling back to active workspace
    const getWorkspaceId = () => {
        const id = unref(workspaceIdRef) || workspaceStore.activeWorkspace?.workspaceId;
        if (!id) return ''; // Return empty string to signal no context (store handles missing ID by returning null state)
        return id;
    };

    // --- Scoped State ---
    const state = computed(() => {
        const id = getWorkspaceId();
        if (!id) return null;
        return store._getWorkspaceState(id);
    });
    
    // --- Scoped Getters ---
    const openFolders = computed(() => {
        const id = getWorkspaceId();
        return id ? (state.value?.openFolders || {}) : {};
    });
    const openFiles = computed(() => {
        const id = getWorkspaceId();
        return id ? store.getOpenFiles(id) : [];
    });
    const activeFile = computed(() => {
        const id = getWorkspaceId();
        return id ? store.getActiveFile(id) : null;
    });
    const activeFileData = computed(() => {
        const id = getWorkspaceId();
        return id ? store.getActiveFileData(id) : null;
    });
    
    // Search State
    const searchResults = computed(() => {
        const id = getWorkspaceId();
        return id ? store.getSearchResults(id) : [];
    });
    const isSearchLoading = computed(() => {
        const id = getWorkspaceId();
        return id ? store.isSearchLoading(id) : false;
    });
    const searchError = computed(() => {
        const id = getWorkspaceId();
        return id ? store.getSearchError(id) : null;
    });

    // --- Scoped Actions ---
    // Actions now strictly require an ID. If none available, we log warn or ignore.
    const withId = <T extends (...args: any[]) => any>(fn: (id: string, ...args: Parameters<T>) => ReturnType<T>) => {
        return (...args: Parameters<T>): ReturnType<T> | undefined => {
            const id = getWorkspaceId();
            if (!id) {
                console.warn("FileExplorer action blocked: No active workspace ID.");
                return undefined;
            }
            return fn(id, ...args);
        };
    };

    // Navigation & Viewing
    const toggleFolder = (folderPath: string) => {
        const id = getWorkspaceId();
        if (id) store.toggleFolder(folderPath, id);
    };
    const openFile = (filePath: string) => {
        const id = getWorkspaceId();
        if (id) return store.openFile(filePath, id);
        return Promise.resolve();
    };
    const openFilePreview = (filePath: string) => {
        const id = getWorkspaceId();
        if (id) return store.openFilePreview(filePath, id);
        return Promise.resolve();
    };
    const closeFile = (filePath: string) => {
        const id = getWorkspaceId();
        if (id) store.closeFile(filePath, id);
    };
    const setActiveFile = (filePath: string) => {
        const id = getWorkspaceId();
        if (id) store.setActiveFile(filePath, id);
    };
    const closeAllFiles = () => {
        const id = getWorkspaceId();
        if (id) store.closeAllFiles(id);
    };
    const closeOtherFiles = (filePath: string) => {
        const id = getWorkspaceId();
        if (id) store.closeOtherFiles(filePath, id);
    };
    const navigateToNextTab = () => {
        const id = getWorkspaceId();
        if (id) store.navigateToNextTab(id);
    };
    const navigateToPreviousTab = () => {
        const id = getWorkspaceId();
        if (id) store.navigateToPreviousTab(id);
    };
    
    // Modification Actions
    const deleteFileOrFolder = (path: string) => {
        const id = getWorkspaceId();
        if (id) return store.deleteFileOrFolder(path, id);
        return Promise.reject("No workspace ID");
    };
    const renameFileOrFolder = (path: string, newName: string) => {
        const id = getWorkspaceId();
        if (id) return store.renameFileOrFolder(path, newName, id);
        return Promise.reject("No workspace ID");
    };
    const moveFileOrFolder = (source: string, dest: string) => {
        const id = getWorkspaceId();
        if (id) return store.moveFileOrFolder(source, dest, id);
        return Promise.reject("No workspace ID");
    };
    const createFileOrFolder = (path: string, isFile: boolean) => {
        const id = getWorkspaceId();
        if (id) return store.createFileOrFolder(path, isFile, id);
         return Promise.reject("No workspace ID");
    };
    
    // Search
    const searchFiles = (query: string) => {
        const id = getWorkspaceId();
        if (id) store.searchFiles(query, id);
    };

    // File Content & Loading
    const getFileContent = (path: string) => {
        const id = getWorkspaceId();
        return id ? store.getFileContent(path, id) : null;
    };
    const isContentLoading = (path: string) => {
        const id = getWorkspaceId();
        return id ? store.isContentLoading(path, id) : false;
    };
    const getContentError = (path: string) => {
        const id = getWorkspaceId();
        return id ? store.getContentError(path, id) : null;
    };
    const invalidateFileContent = (path: string) => {
        const id = getWorkspaceId();
        if (id) store.invalidateFileContent(path, id);
    };
    
    const saveFileContent = (path: string, content: string) => {
        const id = getWorkspaceId();
        if (!id) throw new Error("Cannot save file: No workspace ID available.");
        return store.saveFileContentFromEditor(id, path, content);
    };

    const isSaveContentLoading = (path: string) => {
        const id = getWorkspaceId();
        return id ? store.isSaveContentLoading(path, id) : false;
    };
    const getSaveContentError = (path: string) => {
        const id = getWorkspaceId();
        return id ? store.getSaveContentError(path, id) : null;
    };

    return {
        // ID
        workspaceId: computed(getWorkspaceId),
        
        // State
        state,
        openFolders,
        openFiles,
        activeFile,
        activeFileData,
        
        // Search
        searchResults,
        isSearchLoading,
        searchError,
        
        // Actions
        toggleFolder,
        openFile,
        openFilePreview,
        closeFile,
        setActiveFile,
        closeAllFiles,
        closeOtherFiles,
        navigateToNextTab,
        navigateToPreviousTab,
        
        // Operations
        deleteFileOrFolder,
        renameFileOrFolder,
        moveFileOrFolder,
        createFileOrFolder,
        searchFiles,
        
        // Content
        getFileContent,
        isContentLoading,
        getContentError,
        invalidateFileContent,
        saveFileContent,
        isSaveContentLoading,
        getSaveContentError
    };
}

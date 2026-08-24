<template>
  <div class="file-explorer flex flex-col h-full pt-4 group">
    <div v-if="activeWorkspace" class="mb-2 px-3 pt-3 flex items-center justify-between gap-2">
      <div class="relative flex-grow">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg class="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
          </svg>
        </div>
        <input
          ref="searchInputRef"
          v-model="searchQuery"
          type="text"
          :placeholder="$t('tools.components.fileExplorer.FileExplorer.search')"
          class="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 block bg-white placeholder-gray-400 transition-shadow"
        />
      </div>
    </div>
    <div class="file-explorer-content flex-grow overflow-y-auto relative" @contextmenu.prevent="handleRootContextMenu">
      <div v-if="isActivatingWorkspace" class="flex flex-col items-center justify-center h-full text-center text-gray-500 italic p-4">Loading workspace…</div>
      <div v-else-if="activationError" class="flex flex-col items-center justify-center h-full text-center text-red-600 p-4">
        <p>{{ activationError }}</p>
        <button class="mt-2 text-sm underline" type="button" @click="activateCurrentWorkspace">Retry</button>
      </div>
      <div v-else-if="!hasWorkspaceTarget" class="flex flex-col items-center justify-center h-full text-center text-gray-500 italic p-4">{{ $t('tools.components.fileExplorer.FileExplorer.no_workspaces_available_add_a_workspace') }}</div>
      <div v-else-if="searchLoading" class="text-gray-500 italic">{{ $t('tools.components.fileExplorer.FileExplorer.loading_search_results') }}</div>
      <div v-else-if="displayedFiles.length === 0 && searchQuery" class="text-gray-500 italic">{{ $t('tools.components.fileExplorer.FileExplorer.no_files_match_your_search') }}</div>
      <div v-else class="space-y-2">
        <FileItem v-for="file in displayedFiles" :key="file.id" :file="file" />
      </div>
    </div>
    <FileContextMenu
      :visible="contextMenuVisible"
      :position="contextMenuPosition"
      :items="contextMenuItems"
      @select="selectContextAction"
    />
    <ConfirmDeleteDialog
      :show="deleteDialogVisible"
      :targetName="deleteTargetName"
      @confirm="confirmContextDelete"
      @cancel="cancelContextDelete"
    />
    <AddFileOrFolderDialog
      :show="addDialogVisible"
      :parentPath="addDialogParentPath"
      :isFile="addFileMode"
      @confirm="confirmContextAdd"
      @cancel="cancelContextAdd"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted, nextTick, provide } from 'vue';
import FileItem from "~/components/fileExplorer/FileItem.vue";
import FileContextMenu from "~/components/fileExplorer/FileContextMenu.vue";
import ConfirmDeleteDialog from "~/components/fileExplorer/ConfirmDeleteDialog.vue";
import AddFileOrFolderDialog from "~/components/fileExplorer/AddFileOrFolderDialog.vue";
import { useWorkspaceStore } from '~/stores/workspace';
import { useWorkspaceFileExplorer } from '~/composables/useWorkspaceFileExplorer';
import { useFileExplorerContextActions } from '~/composables/useFileExplorerContextActions';
import { useFileExplorerStore } from '~/stores/fileExplorer';

let fileExplorerConsumerCounter = 0;

const props = withDefaults(defineProps<{
  workspaceId?: string
  active?: boolean
}>(), {
  active: true,
});

const workspaceStore = useWorkspaceStore();
const fileExplorerStore = useFileExplorerStore();
const activatedWorkspaceId = ref<string | null>(props.workspaceId || null);
const isActivatingWorkspace = ref(false);
const activationError = ref<string | null>(null);
const explorer = useWorkspaceFileExplorer(activatedWorkspaceId);
const panelActive = computed(() => props.active);
const outsideDragSignal = ref(0);
const globalDragResetSignal = ref(0);
const {
  menuVisible: contextMenuVisible,
  menuPosition: contextMenuPosition,
  menuItems: contextMenuItems,
  addDialogVisible,
  addFileMode,
  addDialogParentPath,
  deleteDialogVisible,
  deleteTargetName,
  renameRequest,
  openContextMenu,
  selectAction: selectContextAction,
  confirmAdd: confirmContextAdd,
  cancelAdd: cancelContextAdd,
  confirmDelete: confirmContextDelete,
  cancelDelete: cancelContextDelete,
  closeAll: closeAllContextActions,
} = useFileExplorerContextActions({
  explorer,
  panelActive,
});

// Provide the explorer instance to all children (FileItem)
provide('workspaceFileExplorer', explorer);
provide('fileExplorerPanelActive', panelActive);
provide('requestFileExplorerContextMenu', openContextMenu);
provide('fileExplorerRenameRequest', renameRequest);
provide('fileExplorerOutsideDragSignal', outsideDragSignal);
provide('fileExplorerGlobalDragResetSignal', globalDragResetSignal);

const searchQuery = ref('');
const searchInputRef = ref<HTMLInputElement | null>(null);

const searchLoading = computed(() => explorer.isSearchLoading.value);

const explicitWorkspace = computed(() =>
  props.workspaceId ? workspaceStore.workspaces[props.workspaceId] || null : null,
);

const requestedWorkspaceMetadata = computed(() => {
  if (props.workspaceId) {
    return workspaceStore.workspaceMetadataById[props.workspaceId] || null;
  }
  return workspaceStore.activeWorkspaceMetadata;
});

// Determine the relevant workspace metadata after explicit metadata registration.
const currentWorkspace = computed(() => {
  const workspaceId = activatedWorkspaceId.value || props.workspaceId || '';
  return workspaceId ? workspaceStore.workspaces[workspaceId] || null : null;
});
const activeWorkspace = currentWorkspace; // Alias for template compatibility
const hasWorkspaceTarget = computed(() =>
  Boolean(requestedWorkspaceMetadata.value || explicitWorkspace.value || currentWorkspace.value),
);
const liveSessionConsumerId = `file-explorer:${++fileExplorerConsumerCounter}`;
let releaseLiveSession: (() => void) | null = null;
let activationSequence = 0;
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

const releaseCurrentLiveSession = () => {
  releaseLiveSession?.();
  releaseLiveSession = null;
};

const clearPendingSearch = () => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = null;
  }
};

const suspendInactiveWork = () => {
  ++activationSequence;
  isActivatingWorkspace.value = false;
  releaseCurrentLiveSession();
  clearPendingSearch();
  if (activatedWorkspaceId.value) {
    fileExplorerStore.abortSearch(activatedWorkspaceId.value);
  }
};

const activateCurrentWorkspace = async () => {
  if (!panelActive.value) {
    suspendInactiveWork();
    return;
  }

  const sequence = ++activationSequence;
  activationError.value = null;

  if (explicitWorkspace.value) {
    activatedWorkspaceId.value = explicitWorkspace.value.workspaceId;
    return;
  }

  const reference = requestedWorkspaceMetadata.value;
  if (!reference) {
    activatedWorkspaceId.value = null;
    return;
  }

  isActivatingWorkspace.value = true;
  try {
    const workspace = await workspaceStore.ensureWorkspaceMetadata(reference);
    if (sequence === activationSequence) {
      activatedWorkspaceId.value = workspace.workspaceId;
    }
  } catch (error: any) {
    if (sequence === activationSequence) {
      activatedWorkspaceId.value = null;
      activationError.value = error?.message || 'Failed to load workspace.';
    }
  } finally {
    if (sequence === activationSequence) {
      isActivatingWorkspace.value = false;
    }
  }
};

watch(
  () => [requestedWorkspaceMetadata.value?.workspaceId || props.workspaceId || '', panelActive.value] as const,
  () => {
    if (panelActive.value) {
      activateCurrentWorkspace();
    } else {
      suspendInactiveWork();
    }
  },
  { immediate: true },
);

watch(() => [currentWorkspace.value?.workspaceId ?? '', panelActive.value] as const, ([workspaceId, isActive]) => {
  releaseCurrentLiveSession();
  if (workspaceId && isActive) {
    releaseLiveSession = workspaceStore.acquireFileExplorerLiveSession(workspaceId, liveSessionConsumerId);
  }
}, { immediate: true });

const displayedFiles = computed(() => {
  if (searchQuery.value) {
    return explorer.searchResults.value || [];
  } else {
    // If we have a specific workspace context, use its tree
    if (currentWorkspace.value) {
       return explorer.tree.value?.children || [];
    }
    return [];
  }
});

watch([searchQuery, panelActive], ([newQuery, isActive]) => {
  clearPendingSearch();

  if (!isActive) {
    explorer.abortSearch();
    return;
  }

  // Debounce 500ms before triggering search (industry best practice for detecting typing completion)
  searchDebounceTimer = setTimeout(() => {
    if (panelActive.value) {
      explorer.searchFiles(newQuery);
    }
  }, 500);
});

// Restore focus to search input after displayedFiles changes (prevents focus loss during re-render)
watch(displayedFiles, () => {
  if (document.activeElement === searchInputRef.value) {
    nextTick(() => {
      searchInputRef.value?.focus();
    });
  }
});

// Cleanup timer on unmount
onUnmounted(() => {
  suspendInactiveWork();
  detachGlobalFileExplorerListeners();
});

watch(currentWorkspace, (newWorkspace) => {
  if (!newWorkspace) {
    searchQuery.value = '';
  }
});

onMounted(() => {
  // If we have a query (e.g. restored state) and a workspace, trigger search
  if (panelActive.value && searchQuery.value && currentWorkspace.value) {
    explorer.searchFiles(searchQuery.value);
  }
});

const handleRootContextMenu = (event: MouseEvent) => {
  if (!panelActive.value || !currentWorkspace.value) return;
  if (event.target instanceof Element && event.target.closest('.file-item')) {
    return;
  }

  openContextMenu({
    target: { kind: 'root' },
    position: {
      top: event.clientY,
      left: event.clientX,
    },
  });
};

const onGlobalDragOver = (event: DragEvent) => {
  const isOverFileExplorer = event.target instanceof Element &&
    (event.target.closest('.file-item') !== null || event.target.closest('.file-explorer') !== null);
  if (!isOverFileExplorer) {
    outsideDragSignal.value += 1;
  }
};

const onGlobalDragEnd = () => {
  globalDragResetSignal.value += 1;
};

let globalListenersAttached = false;
const attachGlobalFileExplorerListeners = () => {
  if (globalListenersAttached) return;
  document.addEventListener('dragover', onGlobalDragOver);
  document.addEventListener('dragend', onGlobalDragEnd);
  globalListenersAttached = true;
};

const detachGlobalFileExplorerListeners = () => {
  if (!globalListenersAttached) return;
  document.removeEventListener('dragover', onGlobalDragOver);
  document.removeEventListener('dragend', onGlobalDragEnd);
  globalListenersAttached = false;
};

watch(panelActive, (isActive) => {
  if (isActive) {
    attachGlobalFileExplorerListeners();
    return;
  }

  detachGlobalFileExplorerListeners();
  closeAllContextActions();
  suspendInactiveWork();
}, { immediate: true });
</script>

<style scoped>
.file-explorer {
  height: 100%;
}

.file-explorer-content {
  scrollbar-width: thin;
  scrollbar-color: rgba(155, 155, 155, 0.7) transparent;
}

.file-explorer-content::-webkit-scrollbar {
  width: 8px;
}

.file-explorer-content::-webkit-scrollbar-track {
  background: transparent;
}

.file-explorer-content::-webkit-scrollbar-thumb {
  background-color: rgba(155, 155, 155, 0.7);
  border-radius: 4px;
  border: 2px solid transparent;
}

.file-explorer-content::-webkit-scrollbar-thumb:hover {
  background-color: rgba(155, 155, 155, 0.8);
}
</style>

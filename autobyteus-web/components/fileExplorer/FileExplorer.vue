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
    <div class="file-explorer-content flex-grow overflow-y-auto relative">
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
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted, nextTick, provide } from 'vue';
import FileItem from "~/components/fileExplorer/FileItem.vue";
import { useWorkspaceStore } from '~/stores/workspace';
import { useWorkspaceFileExplorer } from '~/composables/useWorkspaceFileExplorer';

let fileExplorerConsumerCounter = 0;

const props = defineProps<{
  workspaceId?: string
}>();

const workspaceStore = useWorkspaceStore();
const activatedWorkspaceId = ref<string | null>(props.workspaceId || null);
const isActivatingWorkspace = ref(false);
const activationError = ref<string | null>(null);
const explorer = useWorkspaceFileExplorer(activatedWorkspaceId);

// Provide the explorer instance to all children (FileItem)
provide('workspaceFileExplorer', explorer);

const searchQuery = ref('');
const searchInputRef = ref<HTMLInputElement | null>(null);

const searchLoading = computed(() => explorer.isSearchLoading.value);

const explicitWorkspace = computed(() =>
  props.workspaceId ? workspaceStore.workspaces[props.workspaceId] || null : null,
);

const requestedWorkspaceReference = computed(() => {
  if (props.workspaceId) {
    return workspaceStore.workspaceReferencesById[props.workspaceId] || null;
  }
  return workspaceStore.activeWorkspaceReference;
});

// Determine the relevant initialized workspace after explicit activation.
const currentWorkspace = computed(() => {
  const workspaceId = activatedWorkspaceId.value || props.workspaceId || '';
  return workspaceId ? workspaceStore.workspaces[workspaceId] || null : null;
});
const activeWorkspace = currentWorkspace; // Alias for template compatibility
const hasWorkspaceTarget = computed(() =>
  Boolean(requestedWorkspaceReference.value || explicitWorkspace.value || currentWorkspace.value),
);
const liveSessionConsumerId = `file-explorer:${++fileExplorerConsumerCounter}`;
let releaseLiveSession: (() => void) | null = null;

const releaseCurrentLiveSession = () => {
  releaseLiveSession?.();
  releaseLiveSession = null;
};

let activationSequence = 0;
const activateCurrentWorkspace = async () => {
  const sequence = ++activationSequence;
  activationError.value = null;

  if (explicitWorkspace.value) {
    activatedWorkspaceId.value = explicitWorkspace.value.workspaceId;
    return;
  }

  const reference = requestedWorkspaceReference.value;
  if (!reference) {
    activatedWorkspaceId.value = null;
    return;
  }

  isActivatingWorkspace.value = true;
  try {
    const workspace = await workspaceStore.ensureWorkspaceInitialized(reference);
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
  () => requestedWorkspaceReference.value?.workspaceId || props.workspaceId || '',
  () => {
    activateCurrentWorkspace();
  },
  { immediate: true },
);

watch(() => currentWorkspace.value?.workspaceId ?? '', (workspaceId) => {
  releaseCurrentLiveSession();
  if (workspaceId) {
    releaseLiveSession = workspaceStore.acquireFileExplorerLiveSession(workspaceId, liveSessionConsumerId);
  }
}, { immediate: true });

const displayedFiles = computed(() => {
  if (searchQuery.value) {
    return explorer.searchResults.value || [];
  } else {
    // If we have a specific workspace context, use its tree
    if (currentWorkspace.value) {
       return currentWorkspace.value.fileExplorer.children || [];
    }
    return [];
  }
});

// Debounce timer for search
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(searchQuery, (newQuery) => {
  // Clear previous timer
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }
  
  // Debounce 500ms before triggering search (industry best practice for detecting typing completion)
  searchDebounceTimer = setTimeout(() => {
    explorer.searchFiles(newQuery);
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
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }
  releaseCurrentLiveSession();
});

watch(currentWorkspace, (newWorkspace) => {
  if (!newWorkspace) {
    searchQuery.value = '';
  }
});

onMounted(() => {
  // If we have a query (e.g. restored state) and a workspace, trigger search
  if (searchQuery.value && currentWorkspace.value) {
    explorer.searchFiles(searchQuery.value);
  }
});
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

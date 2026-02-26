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
          placeholder="Search..."
          class="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 block bg-white placeholder-gray-400 transition-shadow"
        />
      </div>
    </div>
    <div class="file-explorer-content flex-grow overflow-y-auto relative">
      <div v-if="!hasWorkspaces" class="flex flex-col items-center justify-center h-full text-center text-gray-500 italic p-4">
        No workspaces available. Add a workspace to see files.
      </div>
      <div v-else-if="searchLoading" class="text-gray-500 italic">
        Loading search results...
      </div>
      <div v-else-if="displayedFiles.length === 0 && searchQuery" class="text-gray-500 italic">
        No files match your search.
      </div>
      <div v-else class="space-y-2">
        <FileItem v-for="file in displayedFiles" :key="file.id" :file="file" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted, nextTick, toRef, provide } from 'vue';
import FileItem from "~/components/fileExplorer/FileItem.vue";
import { useWorkspaceStore } from '~/stores/workspace';
import { useWorkspaceFileExplorer } from '~/composables/useWorkspaceFileExplorer';

const props = defineProps<{
  workspaceId?: string
}>();

const workspaceStore = useWorkspaceStore();
// Use the new composable scoped to the provided workspace ID
const explorer = useWorkspaceFileExplorer(toRef(props, 'workspaceId'));

// Provide the explorer instance to all children (FileItem)
provide('workspaceFileExplorer', explorer);

const searchQuery = ref('');
const searchInputRef = ref<HTMLInputElement | null>(null);

const hasWorkspaces = computed(() => workspaceStore.allWorkspaceIds.length > 0);
const searchLoading = computed(() => explorer.isSearchLoading.value);

// Determine the relevant workspace (prop-based or active store-based)
const currentWorkspace = computed(() => {
  if (props.workspaceId) {
    return workspaceStore.workspaces[props.workspaceId];
  }
  return workspaceStore.activeWorkspace;
});
const activeWorkspace = currentWorkspace; // Alias for template compatibility

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

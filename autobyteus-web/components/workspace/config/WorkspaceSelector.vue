<template>
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-2">Workspace Directory</label>
    
    <!-- Mode Toggle -->
    <div class="flex rounded-lg bg-gray-100 p-1 mb-3" role="tablist">
      <button
        type="button"
        @click="mode = 'existing'"
        :disabled="existingDisabled || isInteractionDisabled"
        class="flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        :class="[
          mode === 'existing' 
            ? 'bg-white text-blue-700 shadow-sm' 
            : 'text-gray-600 hover:text-gray-900',
          existingDisabled || isInteractionDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        ]"
        role="tab"
        :aria-selected="mode === 'existing'"
      >
        <span class="flex items-center justify-center">
          <span class="i-heroicons-folder-open-20-solid w-4 h-4 mr-2"></span>
          Existing
        </span>
      </button>
      <button
        type="button"
        @click="mode = 'new'"
        :disabled="isInteractionDisabled"
        class="flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        :class="[
          mode === 'new' 
            ? 'bg-white text-blue-700 shadow-sm' 
            : 'text-gray-600 hover:text-gray-900',
          isInteractionDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        ]"
        role="tab"
        :aria-selected="mode === 'new'"
      >
        <span class="flex items-center justify-center">
          <span class="i-heroicons-plus-circle-20-solid w-4 h-4 mr-2"></span>
          New
        </span>
      </button>
    </div>

    <!-- Existing Workspace Dropdown -->
    <div v-if="mode === 'existing'" class="transition-all duration-200">
      <SearchableSelect
        :model-value="workspaceId"
        @update:model-value="handleExistingSelect"
        :options="workspaceOptions"
        :disabled="isInteractionDisabled"
        placeholder="Select a workspace..."
        search-placeholder="Search workspaces..."
        empty-message="No workspaces loaded yet."
      />
    </div>

    <!-- New Workspace Path Input -->
    <div v-else class="transition-all duration-200">
      <div class="flex gap-2">
        <div class="relative flex-grow">
          <input
            type="text"
            v-model="tempPath"
            @keydown.enter="handleLoad"
            :disabled="isLoading || isInteractionDisabled"
            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:bg-gray-100 disabled:text-gray-500 py-2.5 px-3"
            :class="{ 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500': error }"
            placeholder="/absolute/path/to/workspace"
          />
        </div>
        <!-- Browse Button (Electron only) -->
        <button
          v-if="isEmbeddedWindow"
          type="button"
          @click="handleBrowse"
          :disabled="isLoading || isInteractionDisabled"
          class="inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          title="Browse for folder"
        >
          <Icon icon="heroicons:folder-open" class="w-5 h-5" />
        </button>
        <button
          v-else
          type="button"
          @click="handleLoad"
          :disabled="isLoading || isInteractionDisabled || !tempPath.trim()"
          class="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          title="Load workspace"
        >
          <span v-if="isLoading" class="flex items-center gap-2">
            <Icon icon="heroicons:arrow-path" class="w-5 h-5 animate-spin" />
            <span>Loading</span>
          </span>
          <span v-else>Load</span>
        </button>
      </div>
    </div>
    
    <!-- Helper Text Area -->
    <div class="mt-2.5 min-h-[1.5em]">
      <p v-if="workspaceLocked && !error" class="text-sm text-amber-600 flex items-center">
        <span class="i-heroicons-lock-closed-20-solid h-5 w-5 mr-2 flex-shrink-0"></span>
        {{ workspaceLockedMessageToUse }}
      </p>

      <p v-else-if="error" class="text-sm text-red-600 flex items-center">
        <span class="i-heroicons-exclamation-circle-20-solid h-5 w-5 mr-2 flex-shrink-0"></span>
        {{ error }}
      </p>
      
      <p v-else-if="successMessage" class="text-sm text-green-600 flex items-center font-medium">
        <span class="i-heroicons-check-circle-20-solid h-5 w-5 mr-2 flex-shrink-0 text-green-500"></span>
        {{ successMessage }}
      </p>
      
      <p v-else class="text-sm text-gray-500 flex items-center">
        <template v-if="mode === 'existing'">
          <span v-if="existingDisabled" class="text-amber-600 flex items-center">
            <span class="i-heroicons-information-circle-20-solid h-4 w-4 mr-1.5"></span>
            No workspaces loaded yet. Switch to "New" to load one.
          </span>
          <span v-else>Select a previously loaded workspace.</span>
        </template>
        <template v-else>
          {{ isEmbeddedWindow ? 'Browse for a folder or enter path manually.' : 'Enter path to load a new workspace.' }}
          <span class="i-heroicons-information-circle-20-solid h-4 w-4 ml-1.5 text-gray-400 cursor-help" title="Path must be an absolute file system path"></span>
        </template>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useWorkspaceStore } from '~/stores/workspace';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import SearchableSelect from '~/components/common/SearchableSelect.vue';
import { Icon } from '@iconify/vue';
import { pickFolderPath } from '~/composables/useNativeFolderDialog';

const props = defineProps<{
  workspaceId: string | null;
  isLoading: boolean;
  error: string | null;
  disabled?: boolean;
  workspaceLocked?: boolean;
  workspaceLockedMessage?: string;
}>();

const emit = defineEmits<{
  (e: 'select-existing', workspaceId: string): void;
  (e: 'load-new', path: string): void;
}>();

const workspaceStore = useWorkspaceStore();
const windowNodeContextStore = useWindowNodeContextStore();
const { isEmbeddedWindow } = storeToRefs(windowNodeContextStore);

// Local state
const mode = ref<'existing' | 'new'>('new');
const tempPath = ref('');
const successMessage = ref<string | null>(null);
const isInteractionDisabled = computed(() => (props.disabled ?? false) || (props.workspaceLocked ?? false));
const workspaceLocked = computed(() => props.workspaceLocked === true);
const workspaceLockedMessageToUse = computed(() => {
  return props.workspaceLockedMessage || 'Workspace is fixed for this run.';
});

// Computed
const workspaceOptions = computed(() => {
  const tempId = workspaceStore.tempWorkspaceId;
  
  // Get all non-temp workspaces
  const regularWorkspaces = workspaceStore.allWorkspaces
    .filter(ws => ws.workspaceId !== tempId)
    .map(ws => ({
      id: ws.workspaceId,
      name: ws.name,
      description: ws.absolutePath || ''
    }));
  
  // Put temp workspace at top with special styling
  if (workspaceStore.tempWorkspace) {
    return [
      {
        id: tempId!,
        name: '📁 Temp Workspace (Default)',
        description: 'Default temporary workspace'
      },
      ...regularWorkspaces
    ];
  }
  
  return regularWorkspaces;
});

const existingDisabled = computed(() => workspaceOptions.value.length === 0);

const selectedWorkspace = computed(() => {
  if (!props.workspaceId) return null;
  return workspaceStore.workspaces[props.workspaceId] || null;
});

// Initialize mode based on available workspaces
onMounted(async () => {
  // Fetch all workspaces and ensure temp workspace is available
  try {
    await workspaceStore.fetchAllWorkspaces();
  } catch {
    // Ignore errors (e.g., no Apollo client in tests)
  }
  
  // Auto-select temp workspace if no workspace currently selected
  if (!props.workspaceId && workspaceStore.tempWorkspaceId) {
    emit('select-existing', workspaceStore.tempWorkspaceId);
    mode.value = 'existing';
    return; // Skip further mode logic, we've auto-selected
  }
  
  // Set initial mode based on whether workspaces exist
  if (workspaceOptions.value.length > 0) {
    mode.value = 'existing';
  } else {
    mode.value = 'new';
  }
  
  // If we already have a selected workspace, show success
  if (props.workspaceId && selectedWorkspace.value) {
    successMessage.value = `Workspace: ${selectedWorkspace.value.name}`;
    mode.value = 'existing';
  }
});

// Watch for workspace changes
watch(() => props.workspaceId, (newId) => {
  if (newId && workspaceStore.workspaces[newId]) {
    const ws = workspaceStore.workspaces[newId];
    successMessage.value = `Workspace: ${ws.name}`;
  }
});

// Watch for workspace options changes - update mode if workspaces become available
watch(workspaceOptions, (newOptions) => {
  if (newOptions.length > 0 && mode.value === 'new' && !tempPath.value) {
    // Auto-switch to existing mode if workspaces become available
    mode.value = 'existing';
  }
});

// Clear success message when mode changes or error occurs
watch([mode, () => props.error], () => {
  if (props.error) {
    successMessage.value = null;
  }
});

// Handlers
const handleExistingSelect = (workspaceId: string) => {
  if (isInteractionDisabled.value) return;
  successMessage.value = null;
  emit('select-existing', workspaceId);
};

const handleLoad = () => {
  if (props.isLoading || isInteractionDisabled.value || !tempPath.value.trim()) return;
  successMessage.value = null;
  emit('load-new', tempPath.value.trim());
};

// Native folder picker (Electron only)
const handleBrowse = async () => {
  if (!isEmbeddedWindow.value || !window.electronAPI?.showFolderDialog) return;

  const selectedPath = await pickFolderPath();
  if (selectedPath) {
    tempPath.value = selectedPath;
    handleLoad();
  }
};
</script>

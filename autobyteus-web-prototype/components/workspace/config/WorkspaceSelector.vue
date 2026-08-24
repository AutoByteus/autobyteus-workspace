<template>
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-2">{{ $t('workspace.components.workspace.config.WorkspaceSelector.workspace_directory') }}</label>
    
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
        :placeholder="$t('workspace.components.workspace.config.WorkspaceSelector.select_a_workspace')"
        search-placeholder="Search workspaces..."
        empty-message="No workspaces loaded yet."
        :variant="controlVariant"
      />
    </div>

    <!-- New Workspace Path Input -->
    <div v-else class="transition-all duration-200">
      <div class="flex gap-2">
        <div class="relative flex-grow">
          <input
            type="text"
            v-model="tempPath"
            @keydown.enter.prevent
            :disabled="isLoading || isInteractionDisabled"
            :class="newWorkspaceInputClass"
            :placeholder="$t('workspace.components.workspace.config.WorkspaceSelector.absolute_path_to_workspace')"
          />
        </div>
        <!-- Browse Button (Electron only) -->
        <button
          v-if="canBrowseForFolder"
          type="button"
          @click="handleBrowse"
          :disabled="isLoading || isInteractionDisabled"
          class="inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          :title="$t('workspace.components.workspace.config.WorkspaceSelector.browse_for_folder')"
        >
            <Icon icon="heroicons:folder-open" class="w-5 h-5" />
        </button>
      </div>
    </div>
    
    <!-- Helper Text Area -->
    <div v-if="showHelperTextArea" class="mt-2.5">
      <p v-if="workspaceLocked && !error" class="text-sm text-amber-600 flex items-center">
        <span class="i-heroicons-lock-closed-20-solid h-5 w-5 mr-2 flex-shrink-0"></span>
        {{ workspaceLockedMessageToUse }}
      </p>

      <p v-else-if="error" class="text-sm text-red-600 flex items-center">
        <span class="i-heroicons-exclamation-circle-20-solid h-5 w-5 mr-2 flex-shrink-0"></span>
        {{ error }}
      </p>
      
      <p v-else-if="showSuccessMessage" class="text-sm text-green-600 flex items-center font-medium">
        <span class="i-heroicons-check-circle-20-solid h-5 w-5 mr-2 flex-shrink-0 text-green-500"></span>
        {{ successMessage }}
      </p>
      
      <p v-else-if="mode === 'existing'" class="text-sm text-gray-500 flex items-center">
        <span v-if="existingDisabled" class="text-amber-600 flex items-center">
          <span class="i-heroicons-information-circle-20-solid h-4 w-4 mr-1.5"></span>{{ $t('workspace.components.workspace.config.WorkspaceSelector.no_workspaces_loaded_yet_switch_to') }}</span>
        <span v-else>{{ $t('workspace.components.workspace.config.WorkspaceSelector.select_a_previously_loaded_workspace') }}</span>
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
import { canUseLocalFolderPicker } from '~/utils/mobileFeatureGates';

const props = defineProps<{
  workspaceId: string | null;
  isLoading: boolean;
  error: string | null;
  initialPath?: string;
  disabled?: boolean;
  workspaceLocked?: boolean;
  workspaceLockedMessage?: string;
  controlVariant?: 'default' | 'quiet';
}>();

const emit = defineEmits<{
  (e: 'select-existing', workspaceId: string): void;
  (e: 'workspace-input-change', input: { mode: 'existing' | 'new'; pendingPath: string }): void;
}>();

const workspaceStore = useWorkspaceStore();
const windowNodeContextStore = useWindowNodeContextStore();
const { isEmbeddedWindow } = storeToRefs(windowNodeContextStore);
const canBrowseForFolder = computed(() => canUseLocalFolderPicker({
  isEmbeddedWindow: isEmbeddedWindow.value,
  hasElectronFolderDialog: typeof window !== 'undefined' && Boolean(window.electronAPI?.showFolderDialog),
}));

// Local state
const mode = ref<'existing' | 'new'>('new');
const tempPath = ref(props.initialPath || '');
const successMessage = ref<string | null>(null);
const isInteractionDisabled = computed(() => (props.disabled ?? false) || (props.workspaceLocked ?? false));
const workspaceLocked = computed(() => props.workspaceLocked === true);
const workspaceLockedMessageToUse = computed(() => {
  return props.workspaceLockedMessage || 'Workspace is fixed for this run.';
});
const controlVariant = computed(() => props.controlVariant ?? 'default');
const newWorkspaceInputClass = computed(() => [
  'block w-full rounded-md border px-3 py-2.5 text-sm text-gray-900 transition-colors focus:outline-none disabled:bg-gray-100 disabled:text-gray-500',
  controlVariant.value === 'quiet'
    ? 'border-transparent bg-blue-50/40 ring-1 ring-inset ring-blue-100/80 hover:bg-blue-50/70 hover:ring-blue-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/50'
    : 'border-gray-300 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500',
  props.error ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500' : '',
]);

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
const trimmedPendingPath = computed(() => tempPath.value.trim());
const showSuccessMessage = computed(() =>
  Boolean(successMessage.value) &&
  (mode.value === 'existing' || isInteractionDisabled.value),
);
const showHelperTextArea = computed(() =>
  workspaceLocked.value ||
  Boolean(props.error) ||
  showSuccessMessage.value ||
  mode.value === 'existing',
);
const emitWorkspaceInput = () => {
  emit('workspace-input-change', {
    mode: mode.value,
    pendingPath: mode.value === 'new' ? trimmedPendingPath.value : '',
  });
};

const updateDisplayOnlyState = () => {
  if (props.workspaceId && selectedWorkspace.value) {
    successMessage.value = `Workspace: ${selectedWorkspace.value.name}`;
    mode.value = 'existing';
    return;
  }
  if (props.initialPath) {
    tempPath.value = props.initialPath;
    successMessage.value = `Workspace: ${props.initialPath}`;
    mode.value = 'new';
    return;
  }
  successMessage.value = null;
  mode.value = 'new';
};

const maybeAutoSelectDefaultWorkspace = (): boolean => {
  if (props.workspaceId || isInteractionDisabled.value) {
    return false;
  }
  const tempWorkspaceId = workspaceStore.tempWorkspaceId;
  if (!tempWorkspaceId) {
    return false;
  }
  emit('select-existing', tempWorkspaceId);
  mode.value = 'existing';
  return true;
};

// Initialize mode based on available workspaces
onMounted(async () => {
  if (isInteractionDisabled.value) {
    updateDisplayOnlyState();
    return;
  }

  // Fetch all workspaces and ensure temp workspace is available
  try {
    await workspaceStore.fetchAllWorkspaces();
  } catch {
    // Ignore errors (e.g., no Apollo client in tests)
  }
  
  // Auto-select temp workspace if no workspace currently selected
  const autoSelected = maybeAutoSelectDefaultWorkspace();
  if (autoSelected) {
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
  } else if (props.initialPath) {
    successMessage.value = `Workspace: ${props.initialPath}`;
    mode.value = 'new';
  }
});

// Watch for workspace changes
watch(() => props.workspaceId, (newId) => {
  if (isInteractionDisabled.value) {
    updateDisplayOnlyState();
    return;
  }
  if (newId && workspaceStore.workspaces[newId]) {
    const ws = workspaceStore.workspaces[newId];
    successMessage.value = `Workspace: ${ws.name}`;
    return;
  }
  if (newId && props.initialPath) {
    successMessage.value = `Workspace: ${props.initialPath}`;
    return;
  }
  maybeAutoSelectDefaultWorkspace();
});

watch(() => props.initialPath, (newPath) => {
  if (newPath && !tempPath.value) {
    tempPath.value = newPath;
  }
  if (isInteractionDisabled.value) {
    updateDisplayOnlyState();
    return;
  }
  if (props.workspaceId && newPath && !selectedWorkspace.value) {
    successMessage.value = `Workspace: ${newPath}`;
  }
});

watch(
  () => workspaceStore.tempWorkspaceId,
  () => {
    if (isInteractionDisabled.value) return;
    maybeAutoSelectDefaultWorkspace();
  },
);

// Watch for workspace options changes - update mode if workspaces become available
watch(workspaceOptions, (newOptions) => {
  if (isInteractionDisabled.value) return;
  if (newOptions.length > 0 && mode.value === 'new' && !tempPath.value) {
    // Auto-switch to existing mode if workspaces become available
    mode.value = 'existing';
  }
});

watch(isInteractionDisabled, (disabled) => {
  if (disabled) {
    updateDisplayOnlyState();
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

// Native folder picker (Electron only)
const handleBrowse = async () => {
  if (!canBrowseForFolder.value) return;

  const selectedPath = await pickFolderPath();
  if (selectedPath) {
    tempPath.value = selectedPath;
    successMessage.value = null;
  }
};

watch([mode, tempPath], emitWorkspaceInput, { immediate: true });
</script>

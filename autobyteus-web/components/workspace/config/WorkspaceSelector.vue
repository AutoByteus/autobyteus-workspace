<template>
  <div>
    <label class="block text-sm font-medium text-gray-700 mb-2">{{ $t('workspace.components.workspace.config.WorkspaceSelector.workspace_directory') }}</label>
    
    <!-- Mode Toggle -->
    <div class="flex rounded-lg bg-gray-100 p-1 mb-3" role="tablist">
      <button
        type="button"
        @click="handleModeChange('existing')"
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
        @click="handleModeChange('new')"
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
    <div
      v-if="mode === 'existing'"
      class="transition-all duration-200"
      :data-test="isInteractionDisabled && storedWorkspace ? 'stored-workspace-value' : undefined"
    >
      <SearchableSelect
        :model-value="modelValue.existingWorkspaceId"
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
            :value="modelValue.newWorkspacePath"
            @input="handleNewPathInput"
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

    <p
      v-if="isInteractionDisabled && storedWorkspace?.availability === 'historical-only'"
      class="mt-1 text-xs text-amber-600"
      data-test="stored-workspace-unavailable"
    >
      {{ historicalValueUnavailableMessage }}
    </p>
    
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
import { computed, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useWorkspaceStore } from '~/stores/workspace';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import SearchableSelect from '~/components/common/SearchableSelect.vue';
import { Icon } from '@iconify/vue';
import { pickFolderPath } from '~/composables/useNativeFolderDialog';
import { canUseLocalFolderPicker } from '~/utils/mobileFeatureGates';
import type {
  WorkspaceSelectionMode,
  WorkspaceSelectionState,
} from '~/types/workspace/WorkspaceSelectionState';
import type { ExistingWorkspaceDisplay } from '~/types/agent/ExistingTeamRunFormModel';

const props = withDefaults(defineProps<{
  model:
    | Readonly<{
        mode: 'editable';
        selection: WorkspaceSelectionState;
        isLoading: boolean;
        error: string | null;
      }>
    | Readonly<{
        mode: 'stored';
        workspace: ExistingWorkspaceDisplay | null;
      }>;
  disabled?: boolean;
  workspaceLocked?: boolean;
  workspaceLockedMessage?: string;
  controlVariant?: 'default' | 'quiet';
  autoSelectDefault?: boolean;
  historicalValueUnavailableMessage?: string;
}>(), {
  autoSelectDefault: true,
  historicalValueUnavailableMessage: 'Saved value is unavailable in current options.',
});

const emit = defineEmits<{
  (e: 'update:modelValue', selection: WorkspaceSelectionState): void;
}>();

const workspaceStore = useWorkspaceStore();
const windowNodeContextStore = useWindowNodeContextStore();
const { isEmbeddedWindow } = storeToRefs(windowNodeContextStore);
const canBrowseForFolder = computed(() => canUseLocalFolderPicker({
  isEmbeddedWindow: isEmbeddedWindow.value,
  hasElectronFolderDialog: typeof window !== 'undefined' && Boolean(window.electronAPI?.showFolderDialog),
}));

const storedWorkspace = computed(() => props.model.mode === 'stored' ? props.model.workspace : null);
const modelValue = computed<WorkspaceSelectionState>(() => {
  if (props.model.mode === 'editable') return props.model.selection;
  const workspace = props.model.workspace;
  return workspace?.workspaceId
    ? { mode: 'existing', existingWorkspaceId: workspace.workspaceId, newWorkspacePath: workspace.rootPath }
    : { mode: 'new', existingWorkspaceId: null, newWorkspacePath: workspace?.rootPath ?? '' };
});
const isLoading = computed(() => props.model.mode === 'editable' && props.model.isLoading);
const error = computed(() => props.model.mode === 'editable' ? props.model.error : null);
const mode = computed(() => modelValue.value.mode);
const proposedDefaultWorkspaceId = ref<string | null>(null);
const hasExplicitWorkspaceInteraction = ref(false);
const isInteractionDisabled = computed(() =>
  props.model.mode === 'stored' || (props.disabled ?? false) || (props.workspaceLocked ?? false));
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
  error.value ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500' : '',
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
  const inventoryOptions = workspaceStore.tempWorkspace
    ? [
      {
        id: tempId!,
        name: '📁 Temp Workspace (Default)',
        description: 'Default temporary workspace'
      },
      ...regularWorkspaces
    ]
    : regularWorkspaces;
  const stored = storedWorkspace.value;
  if (stored?.workspaceId && !inventoryOptions.some((option) => option.id === stored.workspaceId)) {
    inventoryOptions.push({
      id: stored.workspaceId,
      name: stored.displayName,
      description: stored.rootPath,
    });
  }
  return inventoryOptions;
});

const existingDisabled = computed(() => workspaceOptions.value.length === 0);

const selectedWorkspace = computed(() => {
  if (!modelValue.value.existingWorkspaceId) return null;
  return workspaceStore.workspaces[modelValue.value.existingWorkspaceId] || null;
});
const successMessage = computed(() => {
  if (mode.value === 'existing' && selectedWorkspace.value) {
    return `Workspace: ${selectedWorkspace.value.name}`;
  }
  if (props.model.mode === 'stored' && storedWorkspace.value) {
    return `Workspace: ${storedWorkspace.value.displayName}`;
  }
  if (isInteractionDisabled.value && modelValue.value.newWorkspacePath) {
    return `Workspace: ${modelValue.value.newWorkspacePath}`;
  }
  return null;
});
const showSuccessMessage = computed(() =>
  Boolean(successMessage.value) &&
  (mode.value === 'existing' || isInteractionDisabled.value),
);
const showHelperTextArea = computed(() =>
  workspaceLocked.value ||
  Boolean(error.value) ||
  showSuccessMessage.value ||
  mode.value === 'existing',
);
const proposeSelection = (changes: Partial<WorkspaceSelectionState>) => {
  if (isInteractionDisabled.value) return;
  if (props.model.mode !== 'editable') return;
  emit('update:modelValue', { ...props.model.selection, ...changes });
};

const maybeAutoSelectDefaultWorkspace = (): boolean => {
  if (
    props.autoSelectDefault === false
    || props.model.mode !== 'editable'
    || modelValue.value.existingWorkspaceId
    || modelValue.value.newWorkspacePath
    || hasExplicitWorkspaceInteraction.value
    || isInteractionDisabled.value
  ) {
    return false;
  }
  const tempWorkspaceId = workspaceStore.tempWorkspaceId;
  if (!tempWorkspaceId) {
    return false;
  }
  if (proposedDefaultWorkspaceId.value === tempWorkspaceId) {
    return true;
  }
  proposedDefaultWorkspaceId.value = tempWorkspaceId;
  proposeSelection({ mode: 'existing', existingWorkspaceId: tempWorkspaceId });
  return true;
};

// Initialize mode based on available workspaces
onMounted(async () => {
  if (isInteractionDisabled.value) {
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
  
  if (
    workspaceOptions.value.length > 0
    && mode.value === 'new'
    && !modelValue.value.newWorkspacePath
    && !hasExplicitWorkspaceInteraction.value
  ) {
    proposeSelection({ mode: 'existing' });
  }
});

watch(() => modelValue.value.existingWorkspaceId, (workspaceId) => {
  if (workspaceId) {
    proposedDefaultWorkspaceId.value = null;
  } else {
    maybeAutoSelectDefaultWorkspace();
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
  if (
    newOptions.length > 0
    && mode.value === 'new'
    && !modelValue.value.newWorkspacePath
    && !hasExplicitWorkspaceInteraction.value
  ) {
    maybeAutoSelectDefaultWorkspace() || proposeSelection({ mode: 'existing' });
  }
});

// Handlers
const handleModeChange = (nextMode: WorkspaceSelectionMode) => {
  hasExplicitWorkspaceInteraction.value = true;
  proposeSelection({ mode: nextMode });
};

const handleExistingSelect = (workspaceId: string) => {
  hasExplicitWorkspaceInteraction.value = true;
  proposeSelection({ mode: 'existing', existingWorkspaceId: workspaceId });
};

const handleNewPathInput = (event: Event) => {
  hasExplicitWorkspaceInteraction.value = true;
  proposeSelection({
    mode: 'new',
    newWorkspacePath: (event.target as HTMLInputElement).value,
  });
};

// Native folder picker (Electron only)
const handleBrowse = async () => {
  if (!canBrowseForFolder.value) return;

  const selectedPath = await pickFolderPath();
  if (selectedPath) {
    hasExplicitWorkspaceInteraction.value = true;
    proposeSelection({ mode: 'new', newWorkspacePath: selectedPath });
  }
};
</script>

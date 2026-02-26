<template>
  <div class="space-y-4">
    <!-- Header: Agent Name -->
    <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Agent Definition</label>
        <div class="block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500 shadow-sm cursor-not-allowed select-none">
            {{ agentDefinition.name }}
        </div>
    </div>

    <!-- Model Selection -->
    <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">LLM Model</label>
        <SearchableGroupedSelect
            :model-value="config.llmModelIdentifier"
            @update:modelValue="updateModel"
            :options="groupedModelOptions"
            :disabled="config.isLocked || !llmStore.providersWithModels.length"
            placeholder="Select a model..."
            search-placeholder="Search models..."
        />
    </div>

    <ModelConfigSection
        :schema="modelConfigSchema"
        :model-config="config.llmConfig"
        :disabled="config.isLocked"
        :apply-defaults="true"
        :clear-on-empty-schema="true"
        @update:config="updateModelConfig"
    />

    <!-- Workspace Selector -->
    <div class="mt-8">
    <WorkspaceSelector
        :workspace-id="config.workspaceId"
        :is-loading="workspaceLoadingState.isLoading"
        :error="workspaceLoadingState.error"
        :disabled="config.isLocked"
        :workspace-locked="workspaceLocked"
        workspace-locked-message="Workspace is fixed for existing runs."
        @select-existing="handleSelectExisting"
        @load-new="handleLoadNew"
    />
    </div>
    
    <!-- Auto Execute -->
    <div class="flex items-center justify-between gap-4 py-2 mt-2">
        <label for="auto-execute" class="block text-base text-gray-900 select-none" :class="{ 'text-gray-400': config.isLocked }">
            Auto approve tools
        </label>
        <button 
            id="auto-execute"
            type="button" 
            class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            :class="config.autoExecuteTools ? 'bg-blue-600' : 'bg-gray-200'"
            @click="updateAutoExecute(!config.autoExecuteTools)"
            :disabled="config.isLocked"
        >
            <span class="sr-only">Auto approve tools</span>
            <span 
                aria-hidden="true" 
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                :class="config.autoExecuteTools ? 'translate-x-5' : 'translate-x-0'"
            />
        </button>
    </div>

    <!-- Skill Access Mode -->
    <div>
      <label for="skill-access-mode" class="block text-sm font-medium text-gray-700 mb-1">
        Skill Access
      </label>
      <select
        id="skill-access-mode"
        :value="config.skillAccessMode"
        :disabled="config.isLocked"
        class="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
        @change="updateSkillAccessMode(($event.target as HTMLSelectElement).value)"
      >
        <option value="PRELOADED_ONLY">Configured skills only (Recommended)</option>
        <option value="GLOBAL_DISCOVERY">All installed skills</option>
        <option value="NONE">No skills</option>
      </select>
      <p class="mt-1 text-xs text-gray-500">
        Controls which skills this agent is allowed to use.
      </p>
    </div>

    <div v-if="config.isLocked" class="flex items-center text-xs text-amber-600 bg-amber-50 p-2 rounded">
        <span class="i-heroicons-lock-closed-20-solid w-4 h-4 mr-1"></span>
        <span>Configuration locked because execution has started.</span>
    </div>

    <div v-else-if="workspaceLocked" class="flex items-center text-xs text-amber-600 bg-amber-50 p-2 rounded">
      <span class="i-heroicons-lock-closed-20-solid w-4 h-4 mr-1"></span>
      <span>Existing run configuration can be changed, but workspace stays fixed.</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig';
import type { AgentRunConfig, SkillAccessMode } from '~/types/agent/AgentRunConfig';
import type { AgentDefinition } from '~/stores/agentDefinitionStore';
import WorkspaceSelector from './WorkspaceSelector.vue';
import SearchableGroupedSelect, { type GroupedOption } from '~/components/agentTeams/SearchableGroupedSelect.vue';
import ModelConfigSection from './ModelConfigSection.vue';

interface WorkspaceLoadingState {
  isLoading: boolean;
  error: string | null;
  loadedPath: string | null;
}

const props = defineProps<{
  config: AgentRunConfig | any;
  agentDefinition: AgentDefinition;
  workspaceLoadingState: WorkspaceLoadingState;
  initialPath?: string;
  workspaceLocked?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select-existing', workspaceId: string): void;
  (e: 'load-new', path: string): void;
}>();

const llmStore = useLLMProviderConfigStore();
const workspaceLocked = computed(() => props.workspaceLocked === true);

onMounted(() => {
  if (llmStore.providersWithModels.length === 0) {
    llmStore.fetchProvidersWithModels();
  }
});

const groupedModelOptions = computed<GroupedOption[]>(() => {
    return llmStore.providersWithModels.map(provider => ({
        label: provider.provider,
        items: provider.models.map(model => ({
            id: model.modelIdentifier,
            name: model.modelIdentifier
        }))
    }));
});

const modelConfigSchema = computed(() => {
    if (!props.config.llmModelIdentifier) return null;
    return llmStore.modelConfigSchemaByIdentifier(props.config.llmModelIdentifier);
});

const updateModel = (value: string) => {
    props.config.llmModelIdentifier = value;
};

const updateModelConfig = (config: Record<string, unknown> | null) => {
    props.config.llmConfig = config;
};

const updateAutoExecute = (checked: boolean) => {
    props.config.autoExecuteTools = checked;
};

const updateSkillAccessMode = (value: string) => {
    props.config.skillAccessMode = value as SkillAccessMode;
};

const handleSelectExisting = (workspaceId: string) => {
    emit('select-existing', workspaceId);
};

const handleLoadNew = (path: string) => {
    emit('load-new', path);
};
</script>

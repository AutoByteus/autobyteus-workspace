<template>
  <div class="space-y-4">
    <!-- Header: Team Name -->
    <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Team Definition</label>
        <div class="block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500 shadow-sm cursor-not-allowed select-none">
            {{ teamDefinition.name }}
        </div>
    </div>

    <div>
        <label for="team-runtime-kind" class="block text-sm font-medium text-gray-700 mb-1">Runtime</label>
        <select
            id="team-runtime-kind"
            :value="config.runtimeKind"
            :disabled="runtimeSelectionLocked"
            class="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
            @change="updateRuntimeKind(($event.target as HTMLSelectElement).value)"
        >
            <option
                v-for="option in runtimeOptions"
                :key="option.value"
                :value="option.value"
                :disabled="!option.enabled"
            >
                {{ option.label }}
            </option>
        </select>
        <p class="mt-1 text-xs text-gray-500">Selects the runtime backend used by this team run.</p>
        <p v-if="selectedRuntimeUnavailableReason" class="mt-1 text-xs text-amber-600">
            {{ selectedRuntimeUnavailableReason }}
        </p>
    </div>

    <!-- Default Model Selection -->
    <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Default LLM Model (Global)</label>
        <SearchableGroupedSelect
            :model-value="config.llmModelIdentifier"
            @update:modelValue="updateModel"
            :options="groupedModelOptions"
            :disabled="config.isLocked || !llmStore.providersWithModels.length"
            placeholder="Select a model..."
            search-placeholder="Search models..."
        />
        <p class="mt-1 text-xs text-gray-500">This model will be used by all members unless overridden.</p>
    </div>

    <!-- Workspace Selector -->
    <div class="mt-8">
    <WorkspaceSelector
        :workspace-id="config.workspaceId"
        :is-loading="workspaceLoadingState.isLoading"
        :error="workspaceLoadingState.error"
        :disabled="config.isLocked"
        @select-existing="handleSelectExisting"
        @load-new="handleLoadNew"
    />
    </div>


    <!-- Team Members Override Section (Collapsible) -->
    <div v-if="teamDefinition.nodes.length > 0" class="mt-4">
        <button
            type="button"
            @click="overridesExpanded = !overridesExpanded"
            class="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors w-full text-left"
            :disabled="config.isLocked"
        >
            <span 
                class="mr-1 transition-transform duration-200"
                :class="overridesExpanded ? 'rotate-90' : ''"
            >
                <span class="i-heroicons-chevron-right-20-solid w-4 h-4"></span>
            </span>
            Team Members Override ({{ teamDefinition.nodes.length }})
        </button>
        
        <div v-show="overridesExpanded" class="mt-3 space-y-2">
            <MemberOverrideItem
                v-for="node in teamDefinition.nodes"
                :key="node.memberName"
                :member-name="node.memberName"
                :agent-definition-id="node.referenceId"
                :override="config.memberOverrides[node.memberName]"
                :global-llm-model="config.llmModelIdentifier"
                :options="groupedModelOptions"
                :is-coordinator="node.memberName === teamDefinition.coordinatorMemberName"
                :disabled="config.isLocked"
                @update:override="handleOverrideUpdate"
            />
        </div>
    </div>

    <!-- Auto Execute (moved to bottom) -->
    <div class="flex items-center justify-between gap-4 py-2 mt-4">
        <label for="team-auto-execute" class="block text-base text-gray-900 select-none" :class="{ 'text-gray-400': config.isLocked }">
            Auto approve tools
        </label>
        <button 
            id="team-auto-execute"
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

    <div v-if="config.isLocked" class="flex items-center text-xs text-amber-600 bg-amber-50 p-2 rounded">
        <span class="i-heroicons-lock-closed-20-solid w-4 h-4 mr-1"></span>
        <span>Configuration locked because execution has started.</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig';
import { useRuntimeCapabilitiesStore } from '~/stores/runtimeCapabilitiesStore';
import type { TeamRunConfig, MemberConfigOverride } from '~/types/agent/TeamRunConfig';
import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore';
import {
  DEFAULT_AGENT_RUNTIME_KIND,
  type AgentRuntimeKind,
} from '~/types/agent/AgentRunConfig';
import WorkspaceSelector from './WorkspaceSelector.vue';
import MemberOverrideItem from './MemberOverrideItem.vue';
import SearchableGroupedSelect, { type GroupedOption } from '~/components/agentTeams/SearchableGroupedSelect.vue';

interface WorkspaceLoadingState {
  isLoading: boolean;
  error: string | null;
  loadedPath: string | null;
}

const props = defineProps<{
  config: TeamRunConfig | any;
  teamDefinition: AgentTeamDefinition;
  workspaceLoadingState: WorkspaceLoadingState;
  initialPath?: string;
}>();

const emit = defineEmits<{
  (e: 'select-existing', workspaceId: string): void;
  (e: 'load-new', path: string): void;
}>();

const llmStore = useLLMProviderConfigStore();
const runtimeCapabilitiesStore = useRuntimeCapabilitiesStore();
const overridesExpanded = ref(true);
const runtimeSelectionLocked = computed(() => props.config.isLocked);

void runtimeCapabilitiesStore.fetchRuntimeCapabilities().catch((error) => {
  console.error('Failed to fetch runtime capabilities:', error);
});

const normalizeRuntimeKind = (runtimeKind: unknown): AgentRuntimeKind =>
  runtimeKind === 'codex_app_server' ? 'codex_app_server' : DEFAULT_AGENT_RUNTIME_KIND;

const sanitizeMemberOverridesForRuntime = () => {
  const modelSet = new Set(llmStore.models);
  const overrides = props.config.memberOverrides || {};
  const normalizedRuntimeKind = normalizeRuntimeKind(props.config.runtimeKind);

  for (const [memberName, override] of Object.entries(overrides)) {
    if (!override || typeof override !== 'object') {
      delete overrides[memberName];
      continue;
    }

    // Backward-compatible cleanup: ignore legacy per-member runtime overrides.
    if (override.runtimeKind && override.runtimeKind !== normalizedRuntimeKind) {
      override.runtimeKind = normalizedRuntimeKind;
    }

    if (override.llmModelIdentifier && !modelSet.has(override.llmModelIdentifier)) {
      override.llmModelIdentifier = undefined;
      override.llmConfig = undefined;
    }

    const hasMeaningfulOverride =
      Boolean(override.llmModelIdentifier) ||
      override.autoExecuteTools !== undefined ||
      Boolean(override.llmConfig && Object.keys(override.llmConfig).length > 0);

    if (!hasMeaningfulOverride) {
      delete overrides[memberName];
    }
  }
};

const ensureModelsForRuntime = async (runtimeKind: AgentRuntimeKind, validateSelectedModel = false) => {
  await llmStore.fetchProvidersWithModels(runtimeKind);

  if (
    validateSelectedModel &&
    props.config.llmModelIdentifier &&
    !llmStore.models.includes(props.config.llmModelIdentifier)
  ) {
    props.config.llmModelIdentifier = '';
  }

  sanitizeMemberOverridesForRuntime();
};

const runtimeOptions = computed<
  Array<{ value: AgentRuntimeKind; label: string; enabled: boolean }>
>(() => {
  const autobyteusEnabled = runtimeCapabilitiesStore.isRuntimeEnabled('autobyteus');
  const codexEnabled = runtimeCapabilitiesStore.isRuntimeEnabled('codex_app_server');

  return [
    {
      value: 'autobyteus',
      label: 'AutoByteus Runtime',
      enabled: autobyteusEnabled,
    },
    {
      value: 'codex_app_server',
      label: 'Codex App Server',
      enabled: codexEnabled,
    },
  ].filter((option) => option.enabled || props.config.runtimeKind === option.value);
});

const selectedRuntimeUnavailableReason = computed(() => {
  const runtimeKind = normalizeRuntimeKind(props.config.runtimeKind);
  if (runtimeCapabilitiesStore.isRuntimeEnabled(runtimeKind)) {
    return null;
  }
  return runtimeCapabilitiesStore.runtimeReason(runtimeKind);
});

watch(
  () => props.config.runtimeKind,
  (runtimeKind, previousRuntimeKind) => {
    const normalizedRuntime = normalizeRuntimeKind(runtimeKind);
    if (props.config.runtimeKind !== normalizedRuntime) {
      props.config.runtimeKind = normalizedRuntime;
      return;
    }
    const validateSelectedModel =
      typeof previousRuntimeKind !== 'undefined' && previousRuntimeKind !== normalizedRuntime;
    void ensureModelsForRuntime(normalizedRuntime, validateSelectedModel);
  },
  { immediate: true },
);

watch(
  () => [runtimeCapabilitiesStore.hasFetched, props.config.runtimeKind, runtimeSelectionLocked.value],
  ([hasFetched, runtimeKind, runtimeLocked]) => {
    if (!hasFetched || runtimeLocked) {
      return;
    }
    const normalizedRuntime = normalizeRuntimeKind(runtimeKind);
    if (runtimeCapabilitiesStore.isRuntimeEnabled(normalizedRuntime)) {
      return;
    }

    props.config.runtimeKind = DEFAULT_AGENT_RUNTIME_KIND;
    props.config.llmModelIdentifier = '';
    void ensureModelsForRuntime(DEFAULT_AGENT_RUNTIME_KIND, false);
  },
  { immediate: true },
);

const groupedModelOptions = computed<GroupedOption[]>(() => {
    return llmStore.providersWithModels.map(provider => ({
        label: provider.provider,
        items: provider.models.map(model => ({
            id: model.modelIdentifier,
            name: model.name || model.modelIdentifier
        }))
    }));
});

const updateRuntimeKind = (value: string) => {
    const runtimeKind = normalizeRuntimeKind(value);
    if (!runtimeCapabilitiesStore.isRuntimeEnabled(runtimeKind)) {
      return;
    }
    if (props.config.runtimeKind === runtimeKind) {
      return;
    }
    props.config.runtimeKind = runtimeKind;
    props.config.llmModelIdentifier = '';
};

const updateModel = (value: string) => {
    props.config.llmModelIdentifier = value;
};

const updateAutoExecute = (checked: boolean) => {
    props.config.autoExecuteTools = checked;
};

const handleSelectExisting = (workspaceId: string) => {
    emit('select-existing', workspaceId);
};

const handleLoadNew = (path: string) => {
    emit('load-new', path);
};

const handleOverrideUpdate = (memberName: string, override: MemberConfigOverride | null) => {
  if (!props.config.memberOverrides) {
    props.config.memberOverrides = {};
  }
  if (override) {
    props.config.memberOverrides[memberName] = override;
  } else {
    delete props.config.memberOverrides[memberName];
  }
};
</script>

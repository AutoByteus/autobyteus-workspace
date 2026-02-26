<template>
  <div class="border border-gray-200 rounded-md p-3 bg-white">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-gray-700">{{ memberName }}</span>
        <span v-if="isCoordinator" class="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
          Coordinator
        </span>
      </div>
      <span v-if="hasOverride" class="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
        Overridden
      </span>
    </div>

    <!-- LLM Model Override -->
    <div class="mb-3">
      <label class="block text-xs text-gray-500 mb-1">LLM Model Override</label>
      <SearchableGroupedSelect
        :model-value="override?.llmModelIdentifier || ''"
        @update:modelValue="handleModelChange"
        :options="options"
        :disabled="disabled"
        placeholder="Use global model (default)"
        search-placeholder="Search models..."
        class="w-full"
      />
    </div>

    <div v-if="isRemoteMember" class="mb-3">
      <label class="block text-xs text-gray-500 mb-1">Remote Workspace Path (Required)</label>
      <input
        :id="`remote-workspace-${memberName}`"
        type="text"
        :value="override?.workspaceRootPath || ''"
        @input="handleWorkspacePathInput"
        :disabled="disabled"
        placeholder="e.g. /home/autobyteus/data/temp_workspace"
        class="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-700 placeholder-gray-400 focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-50"
      />
      <p class="mt-1 text-[11px] text-gray-500">
        Path must exist on the remote node filesystem.
      </p>
    </div>

    <!-- Auto-execute Override -->
    <div class="flex items-center">
      <input
        :id="`override-auto-${memberName}`"
        type="checkbox"
        :checked="override?.autoExecuteTools === true"
        :indeterminate="override?.autoExecuteTools === undefined"
        @change="handleAutoExecuteChange"
        :disabled="disabled"
        class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
      />
      <label :for="`override-auto-${memberName}`" class="ml-2 text-xs text-gray-600 select-none">
        {{ autoExecuteLabel }}
      </label>
    </div>

    <ModelConfigSection
        :schema="modelConfigSchema"
        :model-config="override?.llmConfig"
        :disabled="disabled"
        :compact="true"
        :id-prefix="`config-${memberName}`"
        @update:config="emitOverrideWithConfig"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { MemberConfigOverride } from '~/types/agent/TeamRunConfig';
import SearchableGroupedSelect, { type GroupedOption } from '~/components/agentTeams/SearchableGroupedSelect.vue';
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig';
import ModelConfigSection from './ModelConfigSection.vue';

const props = defineProps<{
  memberName: string;
  agentDefinitionId: string;
  override: MemberConfigOverride | undefined;
  globalLlmModel: string;
  options: GroupedOption[];
  isCoordinator?: boolean;
  isRemoteMember?: boolean;
  disabled: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:override', memberName: string, override: MemberConfigOverride | null): void;
}>();

const llmStore = useLLMProviderConfigStore();

const hasOverride = computed(() => {
  if (!props.override) return false;
  return props.override.llmModelIdentifier || props.override.autoExecuteTools !== undefined || (props.override.llmConfig && Object.keys(props.override.llmConfig).length > 0);
});

const autoExecuteLabel = computed(() => {
  if (props.override?.autoExecuteTools === undefined) {
    return 'Auto-execute: Use global';
  }
  return props.override.autoExecuteTools ? 'Auto-execute: ON' : 'Auto-execute: OFF';
});

const effectiveModelIdentifier = computed(() => {
    // If override has specific model, use it. Otherwise use global.
    // BUT if overrides are completely null, we still know the global model.
    return props.override?.llmModelIdentifier || props.globalLlmModel;
});

const modelConfigSchema = computed(() => {
    if (!effectiveModelIdentifier.value) return null;
    return llmStore.modelConfigSchemaByIdentifier(effectiveModelIdentifier.value);
});

const emitOverrideWithConfig = (nextConfig: Record<string, unknown> | null | undefined) => {
    const newOverride: MemberConfigOverride = {
        agentDefinitionId: props.agentDefinitionId,
        llmModelIdentifier: props.override?.llmModelIdentifier,
        autoExecuteTools: props.override?.autoExecuteTools,
        llmConfig: nextConfig ?? undefined,
        workspaceRootPath: props.override?.workspaceRootPath,
    };

    if (
      !newOverride.llmModelIdentifier &&
      newOverride.autoExecuteTools === undefined &&
      (!newOverride.llmConfig || Object.keys(newOverride.llmConfig).length === 0) &&
      !newOverride.workspaceRootPath
    ) {
        emit('update:override', props.memberName, null);
    } else {
        emit('update:override', props.memberName, newOverride);
    }
};

const handleModelChange = (value: string) => {
  const newOverride: MemberConfigOverride = {
    agentDefinitionId: props.agentDefinitionId,
    llmModelIdentifier: value || undefined,
    autoExecuteTools: props.override?.autoExecuteTools,
    llmConfig: props.override?.llmConfig, // Persist config? Might differ if model changes... ideally verify schema match.
    workspaceRootPath: props.override?.workspaceRootPath,
    // For simplicity, we keep it. If incompatible, it won't be shown in UI (schema mismatch).
  };
  
  // If no overrides set, remove entirely
  if (
    !newOverride.llmModelIdentifier &&
    newOverride.autoExecuteTools === undefined &&
    (!newOverride.llmConfig || Object.keys(newOverride.llmConfig).length === 0) &&
    !newOverride.workspaceRootPath
  ) {
    emit('update:override', props.memberName, null);
  } else {
    emit('update:override', props.memberName, newOverride);
  }
};

const handleAutoExecuteChange = (event: Event) => {
  // const checkbox = event.target as HTMLInputElement; // Not strictly needed for logic below
  
  // Cycle: indeterminate (global) → checked (ON) → unchecked (OFF) → indeterminate
  let newValue: boolean | undefined;
  if (props.override?.autoExecuteTools === undefined) {
    newValue = true; // From global → ON
  } else if (props.override.autoExecuteTools === true) {
    newValue = false; // From ON → OFF
  } else {
    newValue = undefined; // From OFF → global
  }

  const newOverride: MemberConfigOverride = {
    agentDefinitionId: props.agentDefinitionId,
    llmModelIdentifier: props.override?.llmModelIdentifier,
    autoExecuteTools: newValue,
    llmConfig: props.override?.llmConfig,
    workspaceRootPath: props.override?.workspaceRootPath,
  };
  
  if (
    !newOverride.llmModelIdentifier &&
    newOverride.autoExecuteTools === undefined &&
    (!newOverride.llmConfig || Object.keys(newOverride.llmConfig).length === 0) &&
    !newOverride.workspaceRootPath
  ) {
    emit('update:override', props.memberName, null);
  } else {
    emit('update:override', props.memberName, newOverride);
  }
};

const handleWorkspacePathInput = (event: Event) => {
  const nextPath = (event.target as HTMLInputElement).value.trim();
  const newOverride: MemberConfigOverride = {
    agentDefinitionId: props.agentDefinitionId,
    llmModelIdentifier: props.override?.llmModelIdentifier,
    autoExecuteTools: props.override?.autoExecuteTools,
    llmConfig: props.override?.llmConfig,
    workspaceRootPath: nextPath || undefined,
  };

  if (
    !newOverride.llmModelIdentifier &&
    newOverride.autoExecuteTools === undefined &&
    (!newOverride.llmConfig || Object.keys(newOverride.llmConfig).length === 0) &&
    !newOverride.workspaceRootPath
  ) {
    emit('update:override', props.memberName, null);
    return;
  }
  emit('update:override', props.memberName, newOverride);
};
</script>

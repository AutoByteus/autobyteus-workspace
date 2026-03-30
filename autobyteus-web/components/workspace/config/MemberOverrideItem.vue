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
        :model-config="effectiveModelConfig"
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
import {
  hasExplicitMemberLlmConfigOverride,
  hasMeaningfulMemberOverride,
  modelConfigsEqual,
  resolveEffectiveMemberLlmConfig,
} from '~/utils/teamRunConfigUtils';

const props = defineProps<{
  memberName: string;
  agentDefinitionId: string;
  override: MemberConfigOverride | undefined;
  globalLlmModel: string;
  globalLlmConfig?: Record<string, unknown> | null;
  options: GroupedOption[];
  isCoordinator?: boolean;
  disabled: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:override', memberName: string, override: MemberConfigOverride | null): void;
}>();

const llmStore = useLLMProviderConfigStore();

const hasOverride = computed(() => {
  return hasMeaningfulMemberOverride(props.override);
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

const effectiveModelConfig = computed(() =>
  resolveEffectiveMemberLlmConfig(props.override, props.globalLlmConfig),
);

const modelConfigSchema = computed(() => {
    if (!effectiveModelIdentifier.value) return null;
    return llmStore.modelConfigSchemaByIdentifier(effectiveModelIdentifier.value);
});

const buildOverride = (input: {
  llmModelIdentifier?: string;
  autoExecuteTools?: boolean;
  llmConfig?: Record<string, unknown> | null;
}): MemberConfigOverride | null => {
  const override: MemberConfigOverride = {
    agentDefinitionId: props.agentDefinitionId,
  };

  if (input.llmModelIdentifier) {
    override.llmModelIdentifier = input.llmModelIdentifier;
  }

  if (input.autoExecuteTools !== undefined) {
    override.autoExecuteTools = input.autoExecuteTools;
  }

  if (input.llmConfig !== undefined) {
    override.llmConfig = input.llmConfig;
  }

  return hasMeaningfulMemberOverride(override) ? override : null;
};

const emitOverrideWithConfig = (nextConfig: Record<string, unknown> | null | undefined) => {
    const explicitConfig = modelConfigsEqual(nextConfig ?? null, props.globalLlmConfig ?? null)
      ? undefined
      : (nextConfig ?? null);
    emit(
      'update:override',
      props.memberName,
      buildOverride({
        llmModelIdentifier: props.override?.llmModelIdentifier,
        autoExecuteTools: props.override?.autoExecuteTools,
        llmConfig: explicitConfig,
      }),
    );
};

const handleModelChange = (value: string) => {
  emit(
    'update:override',
    props.memberName,
    buildOverride({
      llmModelIdentifier: value || undefined,
      autoExecuteTools: props.override?.autoExecuteTools,
      llmConfig: hasExplicitMemberLlmConfigOverride(props.override)
        ? (props.override?.llmConfig ?? null)
        : undefined,
    }),
  );
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

  emit(
    'update:override',
    props.memberName,
    buildOverride({
      llmModelIdentifier: props.override?.llmModelIdentifier,
      autoExecuteTools: newValue,
      llmConfig: hasExplicitMemberLlmConfigOverride(props.override)
        ? (props.override?.llmConfig ?? null)
        : undefined,
    }),
  );
};
</script>

<template>
  <div v-if="hasSchema" class="mt-4">
    <!-- Thinking Toggle Row -->
    <template v-if="thinkingSupported">
      <ModelConfigBasic
        v-model:enabled="thinkingEnabled"
        :disabled="disabled"
        :label="thinkingLabel"
        :description="thinkingDescription"
        :compact="compact"
      />

      <!-- Advanced Expand Button -->
      <div class="mt-4 text-left">
        <button
          type="button"
          data-testid="advanced-params-toggle"
          @click="showAdvancedParams = !showAdvancedParams"
          :disabled="disabled"
          class="inline-flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900 transition-colors focus:outline-none"
          :aria-expanded="showAdvancedParams"
        >
          <span>Advanced</span>
          <Icon 
            icon="heroicons:chevron-down-20-solid" 
            class="w-4 h-4 transition-transform duration-200" 
            :class="{ 'rotate-180': showAdvancedParams }"
          />
        </button>
      </div>

      <!-- Expanded Advanced Section -->
      <div v-show="showAdvancedParams" class="mt-2">
        <ModelConfigAdvanced
          :schema="schema ?? {}"
          :config="modelConfig"
          :disabled="disabled"
          :compact="compact"
          :id-prefix="idPrefix"
          @update:config="emitConfig"
        />
      </div>
    </template>

    <!-- Fallback for schemas without thinking support (unlikely given logic, but safe) -->
    <div v-else class="text-xs text-gray-400 italic">
      Thinking configuration not available for this model.
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, toRaw } from 'vue';
import { Icon } from '@iconify/vue';
import type { UiModelConfigSchema } from '~/utils/llmConfigSchema';
import { applyThinkingToggle, getThinkingParamKeys, getThinkingToggleState, hasThinkingSupport } from '~/utils/llmThinkingConfigAdapter';
import ModelConfigBasic from './ModelConfigBasic.vue';
import ModelConfigAdvanced from './ModelConfigAdvanced.vue';

const props = defineProps<{
  schema: UiModelConfigSchema | null;
  modelConfig: Record<string, unknown> | null | undefined;
  disabled?: boolean;
  applyDefaults?: boolean;
  clearOnEmptySchema?: boolean;
  compact?: boolean;
  idPrefix?: string;
  thinkingLabel?: string;
  thinkingDescription?: string;
}>();

const emit = defineEmits<{
  (e: 'update:config', value: Record<string, unknown> | null): void;
}>();

const showAdvancedParams = ref(false);

const hasSchema = computed(() => !!props.schema && Object.keys(props.schema).length > 0);

const thinkingSupported = computed(() => hasThinkingSupport(props.schema ?? null));

const thinkingLabel = computed(() => props.thinkingLabel ?? 'Thinking');
// Simpler default description
const thinkingDescription = computed(() => props.thinkingDescription ?? '');

const emitConfig = (nextConfig: Record<string, unknown> | null) => {
  emit('update:config', nextConfig ?? null);
};

const thinkingEnabled = computed({
  get() {
    return getThinkingToggleState(props.schema ?? null, props.modelConfig ?? null);
  },
  set(value: boolean) {
    const updatedConfig = applyThinkingToggle(
      props.schema ?? null,
      value,
      props.modelConfig ?? null,
    );
    emitConfig(updatedConfig ?? null);
  },
});

const configsEqual = (
  left: Record<string, unknown> | null | undefined,
  right: Record<string, unknown> | null | undefined,
) => JSON.stringify(left ?? null) === JSON.stringify(right ?? null);

const applyDefaultsIfNeeded = () => {
  if (!hasSchema.value) return;
  if (!props.applyDefaults) return;

  const nextConfig: Record<string, unknown> = { ...(props.modelConfig ?? {}) };
  let changed = false;
  const thinkingKeys = new Set(getThinkingParamKeys(props.schema ?? null));

  for (const [key, paramSchema] of Object.entries(props.schema ?? {})) {
    if (thinkingKeys.has(key)) continue;
    if (nextConfig[key] === undefined && paramSchema.default !== undefined) {
      nextConfig[key] = paramSchema.default;
      changed = true;
    }
  }

  if (thinkingEnabled.value && props.schema?.thinking_budget_tokens?.default !== undefined) {
    if (nextConfig.thinking_budget_tokens === undefined) {
      nextConfig.thinking_budget_tokens = props.schema.thinking_budget_tokens.default;
      changed = true;
    }
  }

  if (changed && !configsEqual(nextConfig, props.modelConfig ?? null)) {
    emitConfig(nextConfig);
  }
};

const clearConfigIfEmptySchema = () => {
  if (hasSchema.value) return;
  if (!props.clearOnEmptySchema) return;
  if (props.modelConfig == null) return;
  emitConfig(null);
};

watch(
  () => [props.schema, props.modelConfig, props.applyDefaults],
  () => {
    applyDefaultsIfNeeded();
    clearConfigIfEmptySchema();
  },
  { immediate: true },
);

// Collapse advanced section when schema changes
watch(
  () => props.schema,
  () => {
    showAdvancedParams.value = false;
  },
);

// Reset config when schema changes (switching between different providers/models)
// This prevents old provider-specific params (e.g. Claude's thinking_enabled) from
// persisting when switching to a different provider (e.g. GPT)
let previousSchemaJson: string | null = null;
let previousModelConfig: Record<string, unknown> | null | undefined = props.modelConfig;

watch(
  () => [props.schema, props.modelConfig],
  ([newSchema, newModelConfig]) => {
    const newSchemaJson = JSON.stringify(newSchema ?? null);
    
    // On first run, just store the state
    if (previousSchemaJson === null) {
      previousSchemaJson = newSchemaJson;
      previousModelConfig = newModelConfig;
      return;
    }
    
    // If schema changed
    if (newSchemaJson !== previousSchemaJson) {
      previousSchemaJson = newSchemaJson;
      // Only reset if the modelConfig object reference has NOT changed.
      // - If modelConfig changed, it means we switched agents (context switch) -> Don't reset.
      // - If modelConfig is same, it means we changed model dropdown for same agent -> Reset.
      const sameConfigRef =
        toRaw(newModelConfig ?? null) === toRaw(previousModelConfig ?? null);

      if (sameConfigRef) {
        if (props.modelConfig != null) {
          emitConfig(null);
        }
      }
    }
    
    // Always update previous config ref
    previousModelConfig = newModelConfig;
  },
  { immediate: true },
);
</script>

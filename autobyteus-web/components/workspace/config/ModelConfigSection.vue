<template>
  <div v-if="hasPresentation" class="mt-4">
    <!-- Thinking Toggle Row -->
    <template v-if="thinkingControlState.supported">
      <div
        v-if="showMissingHistoricalConfig"
        class="flex items-center justify-between gap-4 rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-2"
        data-testid="missing-historical-config-basic"
      >
        <div>
          <label :class="compact ? 'block text-sm text-gray-900' : 'block text-base text-gray-900'">{{ thinkingLabel }}</label>
          <p v-if="thinkingDescription" :class="compact ? 'text-[0.625rem] text-gray-500' : 'text-xs text-gray-500'">{{ thinkingDescription }}</p>
        </div>
        <span class="text-sm text-gray-500">{{ $t('workspace.components.workspace.config.ModelConfigSection.not_recorded_for_this_historical_run') }}</span>
      </div>
      <ModelConfigBasic
        v-else
        v-model:enabled="thinkingEnabled"
        :disabled="thinkingToggleDisabled"
        :label="thinkingLabel"
        :description="thinkingDescription"
        :read-only-reason="thinkingReadOnlyReason"
        :compact="compact"
      />
      <p v-if="thinkingValidationError" role="alert" class="mt-1 text-xs text-red-700">
        {{ thinkingValidationError }}
      </p>
    </template>

    <!-- Advanced Expand Button -->
    <div v-if="usesAdvancedDisclosure" class="mt-4 text-left">
      <button
        type="button"
        data-testid="advanced-params-toggle"
        @click="showAdvancedParams = !showAdvancedParams"
        :class="advancedToggleClass"
        :aria-expanded="showAdvancedParams"
      >
        <span>{{ $t('workspace.components.workspace.config.ModelConfigSection.advanced') }}</span>
        <Icon
          icon="heroicons:chevron-down-20-solid"
          class="h-4 w-4 text-gray-600 transition-transform duration-200"
          :class="showAdvancedParams ? 'rotate-180' : ''"
        />
      </button>
    </div>

    <!-- Schema-driven advanced parameters. Non-thinking schemas render directly. -->
    <div
      v-if="hasAdvancedSchema"
      v-show="!usesAdvancedDisclosure || showAdvancedParams"
      data-testid="advanced-params-container"
      :class="advancedContainerClass"
    >
      <ModelConfigAdvanced
        :schema="advancedSchema"
        :config="presentedModelConfig"
        :disabled="disabled"
        :compact="compact"
        :id-prefix="idPrefix"
        :missing-historical-config="showMissingHistoricalConfig"
        :missing-historical-config-label="$t('workspace.components.workspace.config.ModelConfigSection.not_recorded_for_this_historical_run')"
        :control-variant="controlVariant"
        :validation-errors="validationErrors"
        @update:config="emitConfig"
      />
    </div>
    <HistoricalModelConfigFallback
      v-if="historicalResiduals.length"
      :entries="historicalResiduals"
      :title="historicalModelConfigTitle"
      :unavailable-message="historicalValueUnavailableMessage"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Icon } from '@iconify/vue';
import { sanitizeModelConfigAgainstSchema, type UiModelConfigSchema } from '~/utils/llmConfigSchema';
import {
  projectHistoricalModelConfigFields,
  type HistoricalModelConfigControlField,
  type HistoricalModelConfigResidualField,
} from '~/utils/historicalModelConfigFields';
import {
  applyThinkingToggle,
  getThinkingControlState,
  getThinkingParamKeys,
  getThinkingToggleOwnedParamKeys,
} from '~/utils/llmThinkingConfigAdapter';
import ModelConfigBasic from './ModelConfigBasic.vue';
import ModelConfigAdvanced from './ModelConfigAdvanced.vue';
import HistoricalModelConfigFallback from './HistoricalModelConfigFallback.vue';
import { useLocalization } from '~/composables/useLocalization';

const { t } = useLocalization();

const props = defineProps<{
  schema: UiModelConfigSchema | null;
  modelConfig: Record<string, unknown> | null | undefined;
  disabled?: boolean;
  readOnly?: boolean;
  applyDefaults?: boolean;
  compact?: boolean;
  idPrefix?: string;
  thinkingLabel?: string;
  thinkingDescription?: string;
  advancedInitiallyExpanded?: boolean;
  missingHistoricalConfig?: boolean;
  controlVariant?: 'default' | 'quiet';
  historical?: boolean;
  historicalValueUnavailableMessage?: string;
  historicalModelConfigTitle?: string;
  validationErrors?: Readonly<Record<string, string>>;
}>();

const emit = defineEmits<{
  (e: 'update:config', value: Record<string, unknown> | null): void;
}>();

const showAdvancedParams = ref(false);

const controlVariant = computed(() => props.controlVariant ?? 'default');
const advancedToggleClass = computed(() => [
  'inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-sm font-medium text-gray-700 transition-colors hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
  controlVariant.value === 'quiet' ? 'hover:bg-slate-50' : '',
]);
const advancedContainerClass = computed(() => [
  usesAdvancedDisclosure.value ? 'mt-2' : '',
  controlVariant.value === 'quiet' && usesAdvancedDisclosure.value
    ? 'border-l border-slate-200 pl-3'
    : '',
]);

const historicalFields = computed(() => props.historical
  ? projectHistoricalModelConfigFields(props.modelConfig, props.schema)
  : []);
const presentedSchema = computed<UiModelConfigSchema | null>(() => {
  if (!props.historical) return props.schema;
  const entries = historicalFields.value
    .filter((field): field is HistoricalModelConfigControlField => field.kind === 'current_control')
    .map((field) => [field.key, field.schema]);
  return entries.length ? Object.fromEntries(entries) : null;
});
const presentedModelConfig = computed<Record<string, unknown> | null>(() => {
  if (!props.historical) return props.modelConfig ?? null;
  const entries = historicalFields.value
    .filter((field): field is HistoricalModelConfigControlField =>
      field.kind === 'current_control' && field.hasExplicitStoredValue)
    .map((field) => [field.key, field.storedValue]);
  return entries.length ? Object.fromEntries(entries) : null;
});
const historicalResiduals = computed<readonly HistoricalModelConfigResidualField[]>(() =>
  historicalFields.value.filter(
    (field): field is HistoricalModelConfigResidualField => field.kind === 'historical_residual',
  ),
);
const historicalValueUnavailableMessage = computed(() =>
  props.historicalValueUnavailableMessage ?? 'Saved value is unavailable in current options.',
);
const historicalModelConfigTitle = computed(() =>
  props.historicalModelConfigTitle ?? 'Saved model configuration',
);
const hasSchema = computed(() => !!presentedSchema.value && Object.keys(presentedSchema.value).length > 0);
const hasPresentation = computed(() => hasSchema.value || historicalResiduals.value.length > 0);

const thinkingControlState = computed(() =>
  getThinkingControlState(presentedSchema.value, presentedModelConfig.value),
);
const validationErrors = computed(() => props.validationErrors ?? {});
const thinkingValidationError = computed(() => getThinkingToggleOwnedParamKeys(presentedSchema.value)
  .map((key) => validationErrors.value[key])
  .find((message): message is string => Boolean(message)) ?? null);
const thinkingReadOnlyReason = computed(() => {
  if (!thinkingControlState.value.enabled || thinkingControlState.value.canDisable) return undefined;
  return thinkingControlState.value.toggleOwnedKeys.length === 0
    ? t('workspace.runModelConfig.thinkingAdvancedOnly')
    : t('workspace.components.workspace.config.ModelConfigSection.thinking_configuration_not_available_for_this_model');
});

const advancedSchema = computed<UiModelConfigSchema>(() => {
  const schema = presentedSchema.value ?? {};
  const toggleOwnedKeys = new Set(getThinkingToggleOwnedParamKeys(presentedSchema.value));
  return Object.fromEntries(
    Object.entries(schema).filter(([key]) => !toggleOwnedKeys.has(key)),
  );
});

const hasAdvancedSchema = computed(() => Object.keys(advancedSchema.value).length > 0);
const usesAdvancedDisclosure = computed(() => hasAdvancedSchema.value);
const shouldDefaultAdvancedOpen = computed(() =>
  props.advancedInitiallyExpanded === true ||
  (
    hasAdvancedSchema.value &&
    props.compact !== true &&
    !showMissingHistoricalConfig.value &&
    thinkingControlState.value.supported &&
    thinkingControlState.value.enabled
  ),
);

const thinkingLabel = computed(() => props.thinkingLabel ?? 'Thinking');
// Simpler default description
const thinkingDescription = computed(() => props.thinkingDescription ?? '');
const showMissingHistoricalConfig = computed(() =>
  props.readOnly === true &&
  props.missingHistoricalConfig === true &&
  props.modelConfig == null,
);

const emitConfig = (nextConfig: Record<string, unknown> | null) => {
  if (props.readOnly) return;
  emit('update:config', nextConfig ?? null);
};

const configsEqual = (
  left: Record<string, unknown> | null | undefined,
  right: Record<string, unknown> | null | undefined,
) => JSON.stringify(left ?? null) === JSON.stringify(right ?? null);

const thinkingToggleDisabled = computed(() => {
  if (props.disabled) return true;
  return thinkingControlState.value.enabled
    ? !thinkingControlState.value.canDisable
    : !thinkingControlState.value.canEnable;
});

const thinkingEnabled = computed({
  get() {
    return thinkingControlState.value.enabled;
  },
  set(value: boolean) {
    const updatedConfig = applyThinkingToggle(
      props.schema ?? null,
      value,
      props.modelConfig ?? null,
    );
    if (configsEqual(updatedConfig ?? null, props.modelConfig ?? null)) {
      if (value) {
        showAdvancedParams.value = true;
      }
      return;
    }
    emitConfig(updatedConfig ?? null);
    if (value) {
      showAdvancedParams.value = true;
    }
  },
});

const applyDefaultsIfNeeded = () => {
  if (props.historical || props.readOnly) return;
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

  if (props.modelConfig?.thinking_enabled === true && props.schema?.thinking_budget_tokens?.default !== undefined) {
    if (nextConfig.thinking_budget_tokens === undefined) {
      nextConfig.thinking_budget_tokens = props.schema.thinking_budget_tokens.default;
      changed = true;
    }
  }

  if (changed && !configsEqual(nextConfig, props.modelConfig ?? null)) {
    emitConfig(nextConfig);
  }
};

const sanitizeConfigIfNeeded = (): boolean => {
  if (props.historical || props.readOnly) return false;
  if (!hasSchema.value) return false;
  const sanitized = sanitizeModelConfigAgainstSchema(props.schema ?? null, props.modelConfig ?? null);
  if (configsEqual(sanitized, props.modelConfig ?? null)) {
    return false;
  }
  emitConfig(sanitized);
  return true;
};

watch(
  () => [props.schema, props.modelConfig, props.applyDefaults],
  () => {
    if (sanitizeConfigIfNeeded()) {
      return;
    }
    applyDefaultsIfNeeded();
  },
  { immediate: true },
);

watch(
  () => [
    props.schema,
    props.compact,
    props.readOnly,
    props.missingHistoricalConfig,
  ],
  () => {
    showAdvancedParams.value = shouldDefaultAdvancedOpen.value;
  },
  { immediate: true },
);

watch(
  () => props.advancedInitiallyExpanded,
  (advancedInitiallyExpanded) => {
    if (advancedInitiallyExpanded) {
      showAdvancedParams.value = true;
    }
  },
);
</script>

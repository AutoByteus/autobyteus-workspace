<template>
  <div class="space-y-4">
    <div>
      <label :for="runtimeFieldId" class="mb-1 block text-sm font-medium text-gray-700">{{ runtimeLabelText }}</label>
      <select
        :id="runtimeFieldId"
        :value="normalizedStoredRuntimeKind"
        :disabled="runtimeSelectionLockedComputed"
        :class="nativeSelectClass"
        @change="updateRuntimeKind(($event.target as HTMLSelectElement).value)"
      >
        <option
          v-if="allowBlankRuntime"
          value=""
        >
          {{ blankRuntimeLabelText }}
        </option>
        <option
          v-for="option in runtimeOptions"
          :key="option.value"
          :value="option.value"
          :disabled="!option.enabled"
        >
          {{ option.label }}
        </option>
      </select>
      <p v-if="runtimeHelpText" class="mt-1 text-xs text-gray-500">{{ runtimeHelpText }}</p>
      <p v-if="selectedRuntimeUnavailableReason" class="mt-1 text-xs text-amber-600">
        {{ selectedRuntimeUnavailableReason }}
      </p>
    </div>

    <div>
      <label class="mb-1 block text-sm font-medium text-gray-700">{{ modelLabelText }}</label>
      <SearchableGroupedSelect
        :model-value="llmModelIdentifier || ''"
        @update:modelValue="updateModel"
        :options="groupedModelOptions"
        :disabled="modelSelectionLockedComputed || !availableProviderGroups.length"
        :placeholder="modelPlaceholderText"
        search-placeholder="Search models..."
        :variant="controlVariant"
      />
      <p v-if="modelHelpText" class="mt-1 text-xs text-gray-500">{{ modelHelpText }}</p>
      <p
        v-if="selectedModelUnavailable"
        class="mt-1 text-xs text-amber-600"
        data-test="historical-model-unavailable"
      >
        {{ historicalValueUnavailableMessage }}
      </p>
      <p v-if="isLoadingModels" role="status" class="mt-1 text-xs text-blue-700">
        {{ t('workspace.runModelConfig.loadingModels') }}
      </p>
      <div v-else-if="modelLoadError" role="alert" class="mt-2 flex items-center justify-between gap-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
        <span>{{ t('workspace.runModelConfig.catalogError') }}</span>
        <button type="button" class="font-semibold underline" :disabled="disabledComputed" @click="retryModelCatalog">{{ t('workspace.runModelConfig.retry') }}</button>
      </div>
    </div>

    <ModelConfigSection
      :schema="modelConfigSchema"
      :model-config="llmConfig"
      :disabled="modelConfigDisabledComputed"
      :read-only="modelConfigReadOnlyComputed"
      :apply-defaults="true"
      :thinking-label="thinkingLabel"
      :thinking-description="thinkingDescription"
      :id-prefix="idPrefix"
      :advanced-initially-expanded="advancedInitiallyExpanded"
      :missing-historical-config="missingHistoricalConfig"
      :historical="historicalModelConfig"
      :historical-value-unavailable-message="historicalValueUnavailableMessage"
      :historical-model-config-title="historicalModelConfigTitle"
      :validation-errors="mergedValidationErrors"
      :control-variant="controlVariant"
      @update:config="updateModelConfig"
    />
    <p v-if="showNoAdjustableSettings" class="text-xs text-gray-500">
      {{ t('workspace.runModelConfig.noAdjustableSettings') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef, watch } from 'vue'
import SearchableGroupedSelect from '~/components/agentTeams/SearchableGroupedSelect.vue'
import ModelConfigSection from '~/components/workspace/config/ModelConfigSection.vue'
import {
  DEFAULT_AGENT_RUNTIME_KIND,
  type AgentRuntimeKind,
} from '~/types/agent/AgentRunConfig'
import {
  normalizeScopedRuntimeKind,
  resolveEffectiveScopedRuntimeKind,
  useRuntimeScopedModelSelection,
} from '~/composables/useRuntimeScopedModelSelection'
import { projectHistoricalModelConfigFields } from '~/utils/historicalModelConfigFields'
import { validateUiModelConfig, type UiModelConfigValidationIssue } from '~/utils/llmConfigSchema'
import { useLocalization } from '~/composables/useLocalization'

const { t } = useLocalization()

const props = defineProps<{
  runtimeKind?: string | null
  llmModelIdentifier?: string | null
  llmConfig?: Record<string, unknown> | null
  disabled?: boolean
  readOnly?: boolean
  runtimeSelectionLocked?: boolean
  modelSelectionLocked?: boolean
  modelConfigDisabled?: boolean
  modelConfigReadOnly?: boolean
  allowBlankRuntime?: boolean
  blankRuntimeLabel?: string
  runtimeLabel?: string
  modelLabel?: string
  runtimeHelpText?: string | null
  modelHelpText?: string | null
  modelPlaceholder?: string
  thinkingLabel?: string
  thinkingDescription?: string
  idPrefix?: string
  advancedInitiallyExpanded?: boolean
  missingHistoricalConfig?: boolean
  controlVariant?: 'default' | 'quiet'
  historicalValueUnavailableMessage?: string
  historicalModelConfigTitle?: string
  historicalModelConfig?: boolean
  validationErrors?: Readonly<Record<string, string>>
}>()

const emit = defineEmits<{
  (e: 'update:runtimeKind', value: string): void
  (e: 'update:llmModelIdentifier', value: string): void
  (e: 'update:llmConfig', value: Record<string, unknown> | null): void
  (e: 'schema-state', value: { status: 'loading' | 'ready' | 'invalid' | 'unavailable'; message: string | null }): void
}>()

const disabledComputed = computed(() => props.disabled === true)
const readOnlyComputed = computed(() => props.readOnly === true)
const modelConfigReadOnlyComputed = computed(() => readOnlyComputed.value || props.modelConfigReadOnly === true)
const runtimeSelectionLockedComputed = computed(
  () => disabledComputed.value || props.runtimeSelectionLocked === true,
)
const modelSelectionLockedComputed = computed(
  () => disabledComputed.value || props.modelSelectionLocked === true,
)
const allowBlankRuntime = computed(() => props.allowBlankRuntime === true)
const runtimeLabelText = computed(() => props.runtimeLabel ?? 'Runtime')
const modelLabelText = computed(() => props.modelLabel ?? 'Model')
const blankRuntimeLabelText = computed(
  () => props.blankRuntimeLabel ?? 'Choose when launching',
)
const modelPlaceholderText = computed(() => props.modelPlaceholder ?? 'Select a model')
const runtimeFieldId = computed(() => `${props.idPrefix ?? 'launch'}-runtime-kind`)
const controlVariant = computed(() => props.controlVariant ?? 'default')
const historicalValueUnavailableMessage = computed(() => props.historicalValueUnavailableMessage ?? 'Saved value is unavailable in current options.')
const historicalModelConfigTitle = computed(() => props.historicalModelConfigTitle ?? 'Saved model configuration')
const nativeSelectClass = computed(() => [
  'block w-full rounded-md border px-3 py-2 text-sm text-gray-900 transition-colors focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500',
  controlVariant.value === 'quiet'
    ? 'border-transparent bg-blue-50/40 ring-1 ring-inset ring-blue-100/80 hover:bg-blue-50/70 hover:ring-blue-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/50'
    : 'border-gray-300 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500',
])

const {
  availableProviderGroups,
  effectiveRuntimeKind,
  ensureModelsForRuntime,
  groupedModelOptions,
  hasModelIdentifier,
  isLoadingModels,
  modelLoadError,
  modelConfigSchemaByIdentifier,
  normalizedStoredRuntimeKind,
  reloadModelsForRuntime,
  runtimeOptions,
  selectedRuntimeUnavailableReason,
} = useRuntimeScopedModelSelection({
  runtimeKind: toRef(props, 'runtimeKind'),
  allowBlankRuntime: props.allowBlankRuntime,
})

watch(
  () => props.runtimeKind,
  async (runtimeKind, previousRuntimeKind) => {
    const normalizedStoredRuntime = normalizeScopedRuntimeKind(runtimeKind, allowBlankRuntime.value)
    if ((props.runtimeKind ?? '') !== normalizedStoredRuntime) {
      if (readOnlyComputed.value || runtimeSelectionLockedComputed.value) {
        return
      }
      emit('update:runtimeKind', normalizedStoredRuntime)
      return
    }

    const validateSelectedModel =
      typeof previousRuntimeKind !== 'undefined' &&
      resolveEffectiveScopedRuntimeKind(previousRuntimeKind) !== effectiveRuntimeKind.value

    try {
      await ensureModelsForRuntime(resolveEffectiveScopedRuntimeKind(effectiveRuntimeKind.value))
    } catch {
      return
    }

    if (
      validateSelectedModel &&
      props.llmModelIdentifier &&
      !hasModelIdentifier(props.llmModelIdentifier)
    ) {
      if (readOnlyComputed.value || modelSelectionLockedComputed.value) {
        return
      }
      emit('update:llmModelIdentifier', '')
      emit('update:llmConfig', null)
    }
  },
  { immediate: true },
)

watch(
  [
    () => runtimeOptions.value,
    () => props.runtimeKind,
    () => runtimeSelectionLockedComputed.value,
  ],
  ([, runtimeKind, runtimeLocked]) => {
    if (runtimeLocked) {
      return
    }

    if (readOnlyComputed.value) {
      return
    }

    const effectiveRuntime = resolveEffectiveScopedRuntimeKind(runtimeKind)
    const selectedOption = runtimeOptions.value.find((option) => option.value === effectiveRuntime)
    if (selectedOption?.enabled !== false) {
      return
    }

    const fallbackRuntime = allowBlankRuntime.value ? '' : DEFAULT_AGENT_RUNTIME_KIND
    if (normalizedStoredRuntimeKind.value !== fallbackRuntime) {
      emit('update:runtimeKind', fallbackRuntime)
    }
    emit('update:llmModelIdentifier', '')
    emit('update:llmConfig', null)
  },
)

const modelConfigSchema = computed(() =>
  modelConfigSchemaByIdentifier(props.llmModelIdentifier),
)
const selectedModelUnavailable = computed(() => Boolean(
  props.historicalModelConfig &&
  props.llmModelIdentifier?.trim() &&
  !isLoadingModels.value &&
  !hasModelIdentifier(props.llmModelIdentifier),
))
const modelConfigUnavailable = computed(() => Boolean(
  modelLoadError.value || selectedModelUnavailable.value || historicalResidualsPresent.value,
))
const historicalResidualsPresent = computed(() => Boolean(
  props.historicalModelConfig && projectHistoricalModelConfigFields(props.llmConfig, modelConfigSchema.value)
    .some((field) => field.kind === 'historical_residual'),
))
const validationMessage = (issue: UiModelConfigValidationIssue): string => {
  const key = `workspace.runModelConfig.validation.${issue.code}`
  return t(key, issue.expected === undefined ? undefined : { expected: issue.expected })
}
const localValidationIssues = computed(() => modelConfigSchema.value
  ? validateUiModelConfig(modelConfigSchema.value, props.llmConfig)
  : [])
const localValidationErrors = computed<Record<string, string>>(() => Object.fromEntries(
  localValidationIssues.value.map((issue) => [issue.key, validationMessage(issue)]),
))
const mergedValidationErrors = computed<Record<string, string>>(() => ({
  ...localValidationErrors.value,
  ...(props.validationErrors ?? {}),
}))
const modelConfigDisabledComputed = computed(() =>
  disabledComputed.value || props.modelConfigDisabled === true || modelConfigUnavailable.value || isLoadingModels.value,
)
const showNoAdjustableSettings = computed(() => Boolean(
  !isLoadingModels.value && !modelConfigUnavailable.value && props.llmModelIdentifier?.trim() && !modelConfigSchema.value,
))

watch(
  [isLoadingModels, modelLoadError, selectedModelUnavailable, modelConfigSchema, historicalResidualsPresent, mergedValidationErrors],
  () => {
    if (isLoadingModels.value) {
      emit('schema-state', { status: 'loading', message: null })
    } else if (modelConfigUnavailable.value) {
      emit('schema-state', {
        status: 'unavailable',
        message: modelLoadError.value || (historicalResidualsPresent.value
          ? t('workspace.runModelConfig.schemaUnavailable')
          : historicalValueUnavailableMessage.value),
      })
    } else if (Object.keys(mergedValidationErrors.value).length) {
      emit('schema-state', {
        status: 'invalid',
        message: Object.values(mergedValidationErrors.value)[0] ?? null,
      })
    } else {
      emit('schema-state', { status: 'ready', message: null })
    }
  },
  { immediate: true },
)

const retryModelCatalog = () => {
  void reloadModelsForRuntime(resolveEffectiveScopedRuntimeKind(effectiveRuntimeKind.value))
}
const updateRuntimeKind = (value: string) => {
  if (readOnlyComputed.value || runtimeSelectionLockedComputed.value) return
  const normalizedRuntime = normalizeScopedRuntimeKind(value, allowBlankRuntime.value)
  if (normalizedRuntime === normalizedStoredRuntimeKind.value) {
    return
  }
  emit('update:runtimeKind', normalizedRuntime)
  emit('update:llmModelIdentifier', '')
  emit('update:llmConfig', null)
}

const updateModel = (value: string) => {
  if (readOnlyComputed.value || modelSelectionLockedComputed.value) return
  if (value === (props.llmModelIdentifier ?? '')) {
    return
  }
  emit('update:llmModelIdentifier', value)
  emit('update:llmConfig', null)
}

const updateModelConfig = (config: Record<string, unknown> | null) => {
  if (modelConfigReadOnlyComputed.value || modelConfigDisabledComputed.value) return
  emit('update:llmConfig', config)
}
</script>

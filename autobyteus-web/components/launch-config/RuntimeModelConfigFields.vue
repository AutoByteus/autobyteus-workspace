<template>
  <div class="space-y-4">
    <div>
      <label :for="runtimeFieldId" class="mb-1 block text-sm font-medium text-gray-700">{{ runtimeLabelText }}</label>
      <select
        :id="runtimeFieldId"
        :value="normalizedStoredRuntimeKind"
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
      <p v-if="selectedRuntimeUnavailableReason" class="mt-1 text-xs text-amber-600">
        {{ selectedRuntimeUnavailableReason }}
        <button type="button" class="ml-1 font-semibold underline" @click="retryModelCatalog">{{ t('workspace.runModelConfig.retry') }}</button>
      </p>
    </div>

    <div>
      <label class="mb-1 block text-sm font-medium text-gray-700">{{ modelLabelText }}</label>
      <SearchableGroupedSelect
        :model-value="llmModelIdentifier || ''"
        @update:modelValue="updateModel"
        :options="groupedModelOptions"
        :selected-display="selectedModelDisplay"
        :disabled="!groupedModelOptions.length"
        :placeholder="modelPlaceholderText"
        search-placeholder="Search models..."
        refreshable
        :refreshing="modelListRefreshing"
        :refresh-failed="modelListRefreshFailed"
        @open="refreshModelsOnOpen"
        @refresh="refreshModels"
      />
      <p
        v-if="selectedModelUnavailable"
        class="mt-1 text-xs text-amber-600"
        data-test="selected-model-unavailable"
      >
        {{ t('workspace.runModelConfig.selectedModelUnavailable') }}
        <button type="button" class="ml-1 font-semibold underline" @click="retryModelCatalog">{{ t('workspace.runModelConfig.retry') }}</button>
      </p>
      <p v-if="isLoadingModels" role="status" class="mt-1 text-xs text-blue-700">
        {{ t('workspace.runModelConfig.loadingModels') }}
      </p>
      <div v-else-if="modelLoadError" role="alert" class="mt-2 flex items-center justify-between gap-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
        <span>{{ t('workspace.runModelConfig.catalogError') }}</span>
        <button type="button" class="font-semibold underline" @click="retryModelCatalog">{{ t('workspace.runModelConfig.retry') }}</button>
      </div>
    </div>

    <ModelConfigSection
      :key="llmModelIdentifier || ''"
      :schema="modelConfigSchema"
      :model-config="llmConfig"
      :disabled="modelConfigDisabled"
      :apply-defaults="true"
      :id-prefix="idPrefix"
      :validation-errors="validationErrors"
      :preserve-invalid-draft="true"
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
  normalizeScopedRuntimeKind,
  resolveEffectiveScopedRuntimeKind,
  useRuntimeScopedModelSelection,
} from '~/composables/useRuntimeScopedModelSelection'
import { validateUiModelConfig, type UiModelConfigValidationIssue } from '~/utils/llmConfigSchema'
import { useLocalization } from '~/composables/useLocalization'
import { useRuntimeCurrentModelDescriptor } from '~/composables/useRuntimeCurrentModelDescriptor'

const { t } = useLocalization()

/**
 * Runtime, model and model settings of a new launch (a definition's default launch preferences): the runtime's current
 * catalog is the list, re-read when the picker opens and on "Refresh models". `seedModelIdentifier` is the server-origin
 * model of a draft; it stays shown, with its schema, while the runtime's list does not offer it.
 */
const props = defineProps<{
  seedModelIdentifier?: string | null
  runtimeKind?: string | null
  llmModelIdentifier?: string | null
  llmConfig?: Record<string, unknown> | null
  allowBlankRuntime?: boolean
  blankRuntimeLabel?: string
  runtimeLabel?: string
  modelLabel?: string
  modelPlaceholder?: string
  idPrefix?: string
}>()

const emit = defineEmits<{
  (e: 'update:runtimeKind', value: string): void
  (e: 'update:llmModelIdentifier', value: string): void
  (e: 'update:llmConfig', value: Record<string, unknown> | null): void
}>()

const allowBlankRuntime = computed(() => props.allowBlankRuntime === true)
const runtimeLabelText = computed(() => props.runtimeLabel ?? 'Runtime')
const modelLabelText = computed(() => props.modelLabel ?? 'Model')
const blankRuntimeLabelText = computed(
  () => props.blankRuntimeLabel ?? 'Choose when launching',
)
const modelPlaceholderText = computed(() => props.modelPlaceholder ?? 'Select a model')
const runtimeFieldId = computed(() => `${props.idPrefix ?? 'launch'}-runtime-kind`)
const nativeSelectClass = 'block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500'

const {
  effectiveRuntimeKind,
  ensureModelsForRuntime,
  groupedModelOptions,
  hasModelIdentifier,
  isLoadingModels: catalogLoading,
  isLoadingRuntime,
  modelLoadError,
  modelListRefreshFailed,
  modelListRefreshing,
  modelConfigSchemaByIdentifier,
  normalizedStoredRuntimeKind,
  refreshModels,
  refreshModelsOnOpen,
  reloadModelsForRuntime,
  runtimeOptions,
  selectedRuntimeUnavailableReason,
} = useRuntimeScopedModelSelection({
  runtimeKind: toRef(props, 'runtimeKind'),
  allowBlankRuntime: props.allowBlankRuntime,
})
const currentSeed = useRuntimeCurrentModelDescriptor(effectiveRuntimeKind, computed(() => props.seedModelIdentifier))
const isLoadingModels = computed(() => isLoadingRuntime.value || catalogLoading.value
  || Boolean(props.llmModelIdentifier === props.seedModelIdentifier
    && !hasModelIdentifier(props.llmModelIdentifier) && currentSeed.loading.value))
const selectedModelDisplay = computed(() =>
  props.llmModelIdentifier === props.seedModelIdentifier ? currentSeed.selectedDisplay.value : null)

watch(
  () => props.runtimeKind,
  async (runtimeKind, previousRuntimeKind, onCleanup) => {
    let current = true
    onCleanup(() => { current = false })
    const normalizedStoredRuntime = normalizeScopedRuntimeKind(runtimeKind, allowBlankRuntime.value)
    if ((props.runtimeKind ?? '') !== normalizedStoredRuntime) {
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
      current && validateSelectedModel &&
      props.llmModelIdentifier &&
      !hasModelIdentifier(props.llmModelIdentifier) && props.llmModelIdentifier !== props.seedModelIdentifier
    ) {
      emit('update:llmModelIdentifier', '')
      emit('update:llmConfig', null)
    }
  },
  { immediate: true },
)

const modelConfigSchema = computed(() =>
  props.llmModelIdentifier === props.seedModelIdentifier && !hasModelIdentifier(props.llmModelIdentifier)
    ? currentSeed.schema.value : modelConfigSchemaByIdentifier(props.llmModelIdentifier))
const selectedModelUnavailable = computed(() => Boolean(
  props.llmModelIdentifier?.trim() &&
  !isLoadingModels.value && !modelLoadError.value && !hasModelIdentifier(props.llmModelIdentifier)
    && !(props.llmModelIdentifier === props.seedModelIdentifier && currentSeed.descriptor.value),
))
const modelConfigUnavailable = computed(() => Boolean(
  modelLoadError.value || selectedModelUnavailable.value
    || (props.llmModelIdentifier === props.seedModelIdentifier && currentSeed.error.value),
))
const validationMessage = (issue: UiModelConfigValidationIssue): string => {
  const key = `workspace.runModelConfig.validation.${issue.code}`
  return t(key, issue.expected === undefined ? undefined : { expected: issue.expected })
}
const validationErrors = computed<Record<string, string>>(() => Object.fromEntries(
  (modelConfigSchema.value ? validateUiModelConfig(modelConfigSchema.value, props.llmConfig) : [])
    .map((issue) => [issue.key, validationMessage(issue)]),
))
const modelConfigDisabled = computed(() => modelConfigUnavailable.value || isLoadingModels.value)
const showNoAdjustableSettings = computed(() => Boolean(
  !isLoadingModels.value && !modelConfigUnavailable.value && props.llmModelIdentifier?.trim() && !modelConfigSchema.value,
))

const retryModelCatalog = () => {
  void reloadModelsForRuntime(resolveEffectiveScopedRuntimeKind(effectiveRuntimeKind.value))
}
const updateRuntimeKind = (value: string) => {
  const normalizedRuntime = normalizeScopedRuntimeKind(value, allowBlankRuntime.value)
  if (normalizedRuntime === normalizedStoredRuntimeKind.value) {
    return
  }
  emit('update:runtimeKind', normalizedRuntime)
  emit('update:llmModelIdentifier', '')
  emit('update:llmConfig', null)
}

const updateModel = (value: string) => {
  if (value === (props.llmModelIdentifier ?? '')) {
    return
  }
  emit('update:llmModelIdentifier', value)
  emit('update:llmConfig', null)
}

const updateModelConfig = (config: Record<string, unknown> | null) => {
  if (modelConfigDisabled.value) return
  emit('update:llmConfig', config)
}
</script>

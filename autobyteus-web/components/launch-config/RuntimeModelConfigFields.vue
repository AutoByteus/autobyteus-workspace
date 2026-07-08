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
        :disabled="disabledComputed || !availableProviderGroups.length"
        :placeholder="modelPlaceholderText"
        search-placeholder="Search models..."
        :variant="controlVariant"
      />
      <p v-if="modelHelpText" class="mt-1 text-xs text-gray-500">{{ modelHelpText }}</p>
    </div>

    <ModelConfigSection
      :schema="modelConfigSchema"
      :model-config="llmConfig"
      :disabled="disabledComputed"
      :read-only="readOnlyComputed"
      :apply-defaults="true"
      :thinking-label="thinkingLabel"
      :thinking-description="thinkingDescription"
      :id-prefix="idPrefix"
      :advanced-initially-expanded="advancedInitiallyExpanded"
      :missing-historical-config="missingHistoricalConfig"
      :control-variant="controlVariant"
      @update:config="updateModelConfig"
    />
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

const props = defineProps<{
  runtimeKind?: string | null
  llmModelIdentifier?: string | null
  llmConfig?: Record<string, unknown> | null
  disabled?: boolean
  readOnly?: boolean
  runtimeSelectionLocked?: boolean
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
}>()

const emit = defineEmits<{
  (e: 'update:runtimeKind', value: string): void
  (e: 'update:llmModelIdentifier', value: string): void
  (e: 'update:llmConfig', value: Record<string, unknown> | null): void
}>()

const disabledComputed = computed(() => props.disabled === true)
const readOnlyComputed = computed(() => props.readOnly === true)
const runtimeSelectionLockedComputed = computed(
  () => disabledComputed.value || props.runtimeSelectionLocked === true,
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
  modelConfigSchemaByIdentifier,
  normalizedStoredRuntimeKind,
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
      if (readOnlyComputed.value) {
        return
      }
      emit('update:runtimeKind', normalizedStoredRuntime)
      return
    }

    const validateSelectedModel =
      typeof previousRuntimeKind !== 'undefined' &&
      resolveEffectiveScopedRuntimeKind(previousRuntimeKind) !== effectiveRuntimeKind.value

    await ensureModelsForRuntime(effectiveRuntimeKind.value)

    if (
      validateSelectedModel &&
      props.llmModelIdentifier &&
      !hasModelIdentifier(props.llmModelIdentifier)
    ) {
      if (readOnlyComputed.value) {
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

const updateRuntimeKind = (value: string) => {
  if (readOnlyComputed.value) return
  const normalizedRuntime = normalizeScopedRuntimeKind(value, allowBlankRuntime.value)
  if (normalizedRuntime === normalizedStoredRuntimeKind.value) {
    return
  }
  emit('update:runtimeKind', normalizedRuntime)
  emit('update:llmModelIdentifier', '')
  emit('update:llmConfig', null)
}

const updateModel = (value: string) => {
  if (readOnlyComputed.value) return
  if (value === (props.llmModelIdentifier ?? '')) {
    return
  }
  emit('update:llmModelIdentifier', value)
  emit('update:llmConfig', null)
}

const updateModelConfig = (config: Record<string, unknown> | null) => {
  if (readOnlyComputed.value) return
  emit('update:llmConfig', config)
}
</script>

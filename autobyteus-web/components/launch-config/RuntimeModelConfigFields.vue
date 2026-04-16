<template>
  <div class="space-y-4">
    <div>
      <label :for="runtimeFieldId" class="mb-1 block text-sm font-medium text-gray-700">{{ runtimeLabelText }}</label>
      <select
        :id="runtimeFieldId"
        :value="normalizedStoredRuntimeKind"
        :disabled="runtimeSelectionLockedComputed"
        class="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
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
        :disabled="disabledComputed || !llmStore.providersWithModels.length"
        :placeholder="modelPlaceholderText"
        search-placeholder="Search models..."
      />
      <p v-if="modelHelpText" class="mt-1 text-xs text-gray-500">{{ modelHelpText }}</p>
    </div>

    <ModelConfigSection
      :schema="modelConfigSchema"
      :model-config="llmConfig"
      :disabled="disabledComputed"
      :apply-defaults="true"
      :clear-on-empty-schema="true"
      :thinking-label="thinkingLabel"
      :thinking-description="thinkingDescription"
      :id-prefix="idPrefix"
      @update:config="updateModelConfig"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import SearchableGroupedSelect, { type GroupedOption } from '~/components/agentTeams/SearchableGroupedSelect.vue'
import ModelConfigSection from '~/components/workspace/config/ModelConfigSection.vue'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { useRuntimeAvailabilityStore } from '~/stores/runtimeAvailabilityStore'
import {
  DEFAULT_AGENT_RUNTIME_KIND,
  runtimeKindToLabel,
  type AgentRuntimeKind,
} from '~/types/agent/AgentRunConfig'
import { getModelSelectionLabel } from '~/utils/modelSelectionLabel'

const props = defineProps<{
  runtimeKind?: string | null
  llmModelIdentifier?: string | null
  llmConfig?: Record<string, unknown> | null
  disabled?: boolean
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
}>()

const emit = defineEmits<{
  (e: 'update:runtimeKind', value: string): void
  (e: 'update:llmModelIdentifier', value: string): void
  (e: 'update:llmConfig', value: Record<string, unknown> | null): void
}>()

const llmStore = useLLMProviderConfigStore()
const runtimeAvailabilityStore = useRuntimeAvailabilityStore()

void runtimeAvailabilityStore.fetchRuntimeAvailabilities().catch((error) => {
  console.error('Failed to fetch runtime availabilities:', error)
})

const disabledComputed = computed(() => props.disabled === true)
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

const normalizeStoredRuntimeKind = (runtimeKind: unknown): string => {
  if (typeof runtimeKind !== 'string') {
    return allowBlankRuntime.value ? '' : DEFAULT_AGENT_RUNTIME_KIND
  }
  const normalized = runtimeKind.trim()
  if (!normalized) {
    return allowBlankRuntime.value ? '' : DEFAULT_AGENT_RUNTIME_KIND
  }
  return normalized
}

const resolveEffectiveRuntimeKind = (runtimeKind: unknown): AgentRuntimeKind => {
  const normalized = typeof runtimeKind === 'string' ? runtimeKind.trim() : ''
  return (normalized || DEFAULT_AGENT_RUNTIME_KIND) as AgentRuntimeKind
}

const normalizedStoredRuntimeKind = computed(() => normalizeStoredRuntimeKind(props.runtimeKind))
const effectiveRuntimeKind = computed(() => resolveEffectiveRuntimeKind(props.runtimeKind))

const ensureModelsForRuntime = async (
  runtimeKind: AgentRuntimeKind,
  validateSelectedModel = false,
) => {
  await llmStore.fetchProvidersWithModels(runtimeKind)
  if (
    validateSelectedModel &&
    props.llmModelIdentifier &&
    !llmStore.models.includes(props.llmModelIdentifier)
  ) {
    emit('update:llmModelIdentifier', '')
    emit('update:llmConfig', null)
  }
}

const runtimeOptions = computed<Array<{
  value: string
  label: string
  enabled: boolean
}>>(() => {
  const selectedRuntimeKind = effectiveRuntimeKind.value
  const optionByKind = new Map<string, { value: string; label: string; enabled: boolean }>()

  for (const availability of runtimeAvailabilityStore.availabilities) {
    optionByKind.set(availability.runtimeKind, {
      value: availability.runtimeKind,
      label: runtimeKindToLabel(availability.runtimeKind),
      enabled: availability.enabled,
    })
  }

  if (!optionByKind.has(DEFAULT_AGENT_RUNTIME_KIND)) {
    optionByKind.set(DEFAULT_AGENT_RUNTIME_KIND, {
      value: DEFAULT_AGENT_RUNTIME_KIND,
      label: runtimeKindToLabel(DEFAULT_AGENT_RUNTIME_KIND),
      enabled: true,
    })
  }

  if (!optionByKind.has(selectedRuntimeKind)) {
    optionByKind.set(selectedRuntimeKind, {
      value: selectedRuntimeKind,
      label: runtimeKindToLabel(selectedRuntimeKind),
      enabled: runtimeAvailabilityStore.isRuntimeEnabled(selectedRuntimeKind),
    })
  }

  return Array.from(optionByKind.values()).filter(
    (option) => option.enabled || selectedRuntimeKind === option.value,
  )
})

const selectedRuntimeUnavailableReason = computed(() => {
  const availability = runtimeAvailabilityStore.availabilityByKind(effectiveRuntimeKind.value)
  if (!availability) {
    return effectiveRuntimeKind.value === DEFAULT_AGENT_RUNTIME_KIND
      ? null
      : 'Runtime is not available in current capabilities.'
  }
  if (availability.enabled) {
    return null
  }
  return runtimeAvailabilityStore.runtimeReason(effectiveRuntimeKind.value)
})

watch(
  () => props.runtimeKind,
  (runtimeKind, previousRuntimeKind) => {
    const normalizedStoredRuntime = normalizeStoredRuntimeKind(runtimeKind)
    if ((props.runtimeKind ?? '') !== normalizedStoredRuntime) {
      emit('update:runtimeKind', normalizedStoredRuntime)
      return
    }

    const validateSelectedModel =
      typeof previousRuntimeKind !== 'undefined' &&
      resolveEffectiveRuntimeKind(previousRuntimeKind) !== effectiveRuntimeKind.value

    void ensureModelsForRuntime(effectiveRuntimeKind.value, validateSelectedModel)
  },
  { immediate: true },
)

watch(
  () => [
    runtimeAvailabilityStore.hasFetched,
    props.runtimeKind,
    runtimeSelectionLockedComputed.value,
  ],
  ([hasFetched, runtimeKind, runtimeLocked]) => {
    if (!hasFetched || runtimeLocked) {
      return
    }

    const effectiveRuntime = resolveEffectiveRuntimeKind(runtimeKind)
    const availability = runtimeAvailabilityStore.availabilityByKind(effectiveRuntime)
    if (!availability || availability.enabled) {
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

const groupedModelOptions = computed<GroupedOption[]>(() => {
  if (!llmStore.providersWithModels.length) return []
  return llmStore.providersWithModels.map(provider => ({
    label: provider.provider,
    items: provider.models.map(model => ({
      id: model.modelIdentifier,
      name: getModelSelectionLabel(model, effectiveRuntimeKind.value),
    })),
  }))
})

const modelConfigSchema = computed(() => {
  if (!props.llmModelIdentifier) return null
  return llmStore.modelConfigSchemaByIdentifier(props.llmModelIdentifier)
})

const updateRuntimeKind = (value: string) => {
  if (runtimeSelectionLockedComputed.value) {
    return
  }

  const nextStoredRuntime = normalizeStoredRuntimeKind(value)
  const nextEffectiveRuntime = resolveEffectiveRuntimeKind(nextStoredRuntime)
  if (nextStoredRuntime && !runtimeAvailabilityStore.isRuntimeEnabled(nextEffectiveRuntime)) {
    return
  }

  if (nextStoredRuntime === normalizedStoredRuntimeKind.value) {
    return
  }

  const runtimeChanged = nextEffectiveRuntime !== effectiveRuntimeKind.value
  emit('update:runtimeKind', nextStoredRuntime)

  if (runtimeChanged) {
    emit('update:llmModelIdentifier', '')
    emit('update:llmConfig', null)
  }
}

const updateModel = (value: string) => {
  emit('update:llmModelIdentifier', value)
}

const updateModelConfig = (config: Record<string, unknown> | null) => {
  emit('update:llmConfig', config)
}
</script>

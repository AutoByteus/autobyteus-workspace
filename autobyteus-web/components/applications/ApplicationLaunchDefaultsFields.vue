<template>
  <div
    data-testid="application-launch-defaults-fields"
    class="rounded-2xl border border-slate-200 bg-white p-4"
  >
    <div class="space-y-4">
      <div class="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-sm font-semibold text-blue-900">
              {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.toolExecutionLabel') }}
            </p>
            <p class="mt-1 text-xs text-blue-800">
              {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.toolExecutionDescription') }}
            </p>
          </div>
          <div class="flex items-center gap-3">
            <span class="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-blue-700">
              {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.toolExecutionLockedOn') }}
            </span>
            <button
              type="button"
              disabled
              aria-checked="true"
              class="relative inline-flex h-6 w-11 cursor-not-allowed rounded-full border-2 border-transparent bg-blue-600 opacity-80"
            >
              <span class="sr-only">{{ $t('applications.components.applications.ApplicationLaunchSetupPanel.toolExecutionLabel') }}</span>
              <span
                aria-hidden="true"
                class="pointer-events-none inline-block h-5 w-5 translate-x-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
              />
            </button>
          </div>
        </div>
      </div>

      <label
        v-if="supportsRuntimeKind"
        class="block"
      >
        <span class="mb-1 block text-sm font-medium text-slate-700">
          {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.runtimeLabel') }}
        </span>
        <select
          :id="runtimeFieldId"
          :value="normalizedStoredRuntimeKind"
          :disabled="runtimeSelectionLockedComputed"
          class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
          @change="updateRuntimeKind(($event.target as HTMLSelectElement).value)"
        >
          <option value="">
            {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.useApplicationDefaultRuntime') }}
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
        <p class="mt-1 text-xs text-slate-500">
          {{ runtimeHelpText }}
        </p>
        <p v-if="selectedRuntimeUnavailableReason" class="mt-1 text-xs text-amber-600">
          {{ selectedRuntimeUnavailableReason }}
        </p>
      </label>

      <div v-if="supportsModelIdentifier">
        <label class="mb-1 block text-sm font-medium text-slate-700">
          {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.modelLabel') }}
        </label>
        <SearchableGroupedSelect
          :model-value="draft.llmModelIdentifier || ''"
          :options="groupedModelOptions"
          :disabled="disabledComputed || !availableProviderGroups.length"
          :placeholder="$t('applications.components.applications.ApplicationLaunchSetupPanel.modelPlaceholder')"
          search-placeholder="Search models..."
          @update:model-value="updateModel"
        />
        <p class="mt-1 text-xs text-slate-500">
          {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.modelHelp') }}
        </p>
      </div>

      <label
        v-if="supportsWorkspaceRootPath"
        class="block"
      >
        <span class="mb-1 block text-sm font-medium text-slate-700">
          {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.workspaceRootPathLabel') }}
        </span>
        <input
          :value="draft.workspaceRootPath"
          type="text"
          class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
          :disabled="disabledComputed"
          :placeholder="$t('applications.components.applications.ApplicationLaunchSetupPanel.workspaceRootPathPlaceholder')"
          @input="updateWorkspaceRootPath(($event.target as HTMLInputElement).value)"
        >
        <p class="mt-1 text-xs text-slate-500">
          {{ workspaceHelpText }}
        </p>
      </label>

      <p
        v-if="!hasAdditionalDefaults"
        class="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
      >
        {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.noAdditionalDefaults') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import SearchableGroupedSelect, { type GroupedOption } from '~/components/agentTeams/SearchableGroupedSelect.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { useRuntimeAvailabilityStore } from '~/stores/runtimeAvailabilityStore'
import {
  DEFAULT_AGENT_RUNTIME_KIND,
  runtimeKindToLabel,
  type AgentRuntimeKind,
} from '~/types/agent/AgentRunConfig'
import {
  getModelSelectionOptionLabel,
  getModelSelectionSelectedLabel,
} from '~/utils/modelSelectionLabel'
import {
  slotHasAdditionalDefaults,
  slotSupportsModelIdentifier,
  slotSupportsRuntimeKind,
  slotSupportsWorkspaceRootPath,
  type ApplicationResourceSlotDeclaration,
  type SlotDraft,
} from '~/utils/application/applicationLaunchSetup'

const props = defineProps<{
  slot: ApplicationResourceSlotDeclaration
  draft: SlotDraft
  disabled?: boolean
  hasEffectiveResource?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:runtimeKind', value: string): void
  (e: 'update:llmModelIdentifier', value: string): void
  (e: 'update:workspaceRootPath', value: string): void
}>()

const { t: $t } = useLocalization()
const llmStore = useLLMProviderConfigStore()
const runtimeAvailabilityStore = useRuntimeAvailabilityStore()

const disabledComputed = computed(() => props.disabled === true)
const runtimeSelectionLockedComputed = computed(() => disabledComputed.value)
const supportsRuntimeKind = computed(() => slotSupportsRuntimeKind(props.slot))
const supportsModelIdentifier = computed(() => slotSupportsModelIdentifier(props.slot))
const supportsRuntimeOrModelDefaults = computed(
  () => supportsRuntimeKind.value || supportsModelIdentifier.value,
)
const supportsWorkspaceRootPath = computed(() => slotSupportsWorkspaceRootPath(props.slot))
const hasAdditionalDefaults = computed(() => slotHasAdditionalDefaults(props.slot))
const runtimeHelpText = computed(() => (
  props.hasEffectiveResource === true
    ? $t('applications.components.applications.ApplicationLaunchSetupPanel.runtimeHelp')
    : $t('applications.components.applications.ApplicationLaunchSetupPanel.selectResourceFirst')
))
const workspaceHelpText = computed(() => (
  props.hasEffectiveResource === true
    ? $t('applications.components.applications.ApplicationLaunchSetupPanel.workspaceRootPathHelp')
    : $t('applications.components.applications.ApplicationLaunchSetupPanel.selectResourceFirst')
))
const runtimeFieldId = computed(() => `application-slot-${props.slot.slotKey}-runtime-kind`)

const normalizeStoredRuntimeKind = (runtimeKind: unknown): string => {
  if (typeof runtimeKind !== 'string') {
    return ''
  }
  return runtimeKind.trim()
}

const resolveEffectiveRuntimeKind = (runtimeKind: unknown): AgentRuntimeKind => {
  const normalized = typeof runtimeKind === 'string' ? runtimeKind.trim() : ''
  return (normalized || DEFAULT_AGENT_RUNTIME_KIND) as AgentRuntimeKind
}

const normalizedStoredRuntimeKind = computed(() => normalizeStoredRuntimeKind(props.draft.runtimeKind))
const effectiveRuntimeKind = computed(() => resolveEffectiveRuntimeKind(props.draft.runtimeKind))
const availableProviderGroups = computed(() => llmStore.providersWithModelsForSelection ?? [])

watch(
  supportsRuntimeOrModelDefaults,
  (supported) => {
    if (!supported) {
      return
    }

    void runtimeAvailabilityStore.fetchRuntimeAvailabilities().catch((error) => {
      console.error('Failed to fetch runtime availabilities:', error)
    })
  },
  { immediate: true },
)

const ensureModelsForRuntime = async (
  runtimeKind: AgentRuntimeKind,
  validateSelectedModel = false,
) => {
  await llmStore.fetchProvidersWithModels(runtimeKind)
  if (
    validateSelectedModel
    && props.draft.llmModelIdentifier
    && !llmStore.models.includes(props.draft.llmModelIdentifier)
  ) {
    emit('update:llmModelIdentifier', '')
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
  () => props.draft.runtimeKind,
  (runtimeKind, previousRuntimeKind) => {
    if (!supportsRuntimeOrModelDefaults.value) {
      return
    }

    const normalizedStoredRuntime = normalizeStoredRuntimeKind(runtimeKind)
    if ((props.draft.runtimeKind ?? '') !== normalizedStoredRuntime) {
      emit('update:runtimeKind', normalizedStoredRuntime)
      return
    }

    const validateSelectedModel =
      typeof previousRuntimeKind !== 'undefined'
      && resolveEffectiveRuntimeKind(previousRuntimeKind) !== effectiveRuntimeKind.value

    void ensureModelsForRuntime(effectiveRuntimeKind.value, validateSelectedModel)
  },
  { immediate: true },
)

watch(
  () => [
    supportsRuntimeOrModelDefaults.value,
    runtimeAvailabilityStore.hasFetched,
    props.draft.runtimeKind,
    runtimeSelectionLockedComputed.value,
  ],
  ([supportsRuntimeOrModelDefaultsValue, hasFetched, runtimeKind, runtimeLocked]) => {
    if (!supportsRuntimeOrModelDefaultsValue || !hasFetched || runtimeLocked) {
      return
    }

    const effectiveRuntime = resolveEffectiveRuntimeKind(runtimeKind)
    const availability = runtimeAvailabilityStore.availabilityByKind(effectiveRuntime)
    if (!availability || availability.enabled) {
      return
    }

    if (normalizedStoredRuntimeKind.value !== '') {
      emit('update:runtimeKind', '')
    }
    emit('update:llmModelIdentifier', '')
  },
)

const groupedModelOptions = computed<GroupedOption[]>(() => {
  if (!availableProviderGroups.value.length) {
    return []
  }

  return availableProviderGroups.value.map((providerGroup) => ({
    label: providerGroup.provider.name,
    items: providerGroup.models.map((model) => ({
      id: model.modelIdentifier,
      name: getModelSelectionOptionLabel(model, effectiveRuntimeKind.value),
      selectedLabel: getModelSelectionSelectedLabel(
        providerGroup.provider.name,
        model,
        effectiveRuntimeKind.value,
      ),
    })),
  }))
})

const updateRuntimeKind = (value: string) => {
  const normalizedRuntime = normalizeStoredRuntimeKind(value)
  if (normalizedRuntime === normalizedStoredRuntimeKind.value) {
    return
  }
  emit('update:runtimeKind', normalizedRuntime)
  emit('update:llmModelIdentifier', '')
}

const updateModel = (value: string) => {
  emit('update:llmModelIdentifier', value)
}

const updateWorkspaceRootPath = (value: string) => {
  emit('update:workspaceRootPath', value)
}
</script>

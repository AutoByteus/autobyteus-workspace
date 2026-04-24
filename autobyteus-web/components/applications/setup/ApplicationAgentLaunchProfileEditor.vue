<template>
  <div class="space-y-4">
    <label v-if="supportsRuntimeKind" class="block">
      <span class="mb-1 block text-sm font-medium text-slate-700">
        {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.runtimeLabel') }}
      </span>
      <select
        :value="normalizedStoredRuntimeKind"
        :disabled="disabled"
        class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
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
        {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.runtimeHelp') }}
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
        :model-value="draft.llmModelIdentifier"
        :options="groupedModelOptions"
        :disabled="disabled || !availableProviderGroups.length"
        :placeholder="$t('applications.components.applications.ApplicationLaunchSetupPanel.modelPlaceholder')"
        search-placeholder="Search models..."
        @update:model-value="updateModel"
      />
      <p class="mt-1 text-xs text-slate-500">
        {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.modelHelp') }}
      </p>
    </div>

    <div v-if="supportsWorkspaceRootPath">
      <label class="mb-1 block text-sm font-medium text-slate-700">
        {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.workspaceRootPathLabel') }}
      </label>
      <ApplicationWorkspaceRootSelector
        :model-value="draft.workspaceRootPath"
        :disabled="disabled"
        @update:model-value="updateWorkspaceRootPath"
      />
      <p class="mt-1 text-xs text-slate-500">
        {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.workspaceRootPathHelp') }}
      </p>
    </div>

    <p
      v-if="!supportsRuntimeKind && !supportsModelIdentifier && !supportsWorkspaceRootPath"
      class="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
    >
      {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.noAdditionalDefaults') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import SearchableGroupedSelect from '~/components/agentTeams/SearchableGroupedSelect.vue'
import ApplicationWorkspaceRootSelector from '~/components/applications/setup/ApplicationWorkspaceRootSelector.vue'
import { useLocalization } from '~/composables/useLocalization'
import {
  normalizeScopedRuntimeKind,
  useRuntimeScopedModelSelection,
} from '~/composables/useRuntimeScopedModelSelection'
import type {
  ApplicationAgentLaunchProfileDraft,
  ApplicationSlotEditorReadiness,
} from '~/utils/application/applicationLaunchProfile'

const props = withDefaults(defineProps<{
  slot: import('@autobyteus/application-sdk-contracts').ApplicationResourceSlotDeclaration
  draft: ApplicationAgentLaunchProfileDraft
  disabled?: boolean
}>(), {
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:draft', value: ApplicationAgentLaunchProfileDraft): void
  (e: 'readiness-change', value: ApplicationSlotEditorReadiness): void
}>()

const { t: $t } = useLocalization()

const supportsRuntimeKind = computed(() => props.slot.supportedLaunchConfig?.AGENT?.runtimeKind === true)
const supportsModelIdentifier = computed(() => props.slot.supportedLaunchConfig?.AGENT?.llmModelIdentifier === true)
const supportsWorkspaceRootPath = computed(() => props.slot.supportedLaunchConfig?.AGENT?.workspaceRootPath === true)

const {
  availableProviderGroups,
  groupedModelOptions,
  hasModelIdentifier,
  normalizedStoredRuntimeKind,
  runtimeOptions,
  selectedRuntimeUnavailableReason,
} = useRuntimeScopedModelSelection({
  runtimeKind: computed(() => props.draft.runtimeKind),
  allowBlankRuntime: true,
})

watch(
  () => [supportsRuntimeKind.value, supportsModelIdentifier.value, supportsWorkspaceRootPath.value, props.draft] as const,
  () => {
    const sanitizedDraft: ApplicationAgentLaunchProfileDraft = {
      ...props.draft,
      runtimeKind: supportsRuntimeKind.value ? props.draft.runtimeKind : '',
      llmModelIdentifier: supportsModelIdentifier.value ? props.draft.llmModelIdentifier : '',
      workspaceRootPath: supportsWorkspaceRootPath.value ? props.draft.workspaceRootPath : '',
    }
    if (JSON.stringify(sanitizedDraft) !== JSON.stringify(props.draft)) {
      emit('update:draft', sanitizedDraft)
    }
  },
  { immediate: true, deep: true },
)

watch(
  () => [props.draft.runtimeKind, props.draft.llmModelIdentifier],
  () => {
    if (
      props.draft.llmModelIdentifier
      && !hasModelIdentifier(props.draft.llmModelIdentifier)
    ) {
      emit('update:draft', {
        ...props.draft,
        llmModelIdentifier: '',
      })
      return
    }

    emit('readiness-change', {
      isReady: !supportsModelIdentifier.value || props.draft.llmModelIdentifier.trim().length > 0,
      blockingReason:
        supportsModelIdentifier.value && props.draft.llmModelIdentifier.trim().length === 0
          ? $t('applications.components.applications.ApplicationLaunchSetupPanel.requiredModelBeforeEntry', {
            slot: props.slot.name,
          })
          : null,
      hasEffectiveResource: true,
    })
  },
  { immediate: true },
)

const updateRuntimeKind = (value: string) => {
  emit('update:draft', {
    ...props.draft,
    runtimeKind: normalizeScopedRuntimeKind(value, true),
    llmModelIdentifier: '',
  })
}

const updateModel = (value: string) => {
  emit('update:draft', {
    ...props.draft,
    llmModelIdentifier: value,
  })
}

const updateWorkspaceRootPath = (value: string) => {
  emit('update:draft', {
    ...props.draft,
    workspaceRootPath: value,
  })
}
</script>

<template>
  <div class="space-y-4">
    <div v-if="view.issue" class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <p class="font-medium">{{ view.issue.message }}</p>
    </div>

    <label class="block">
      <span class="mb-1 block text-sm font-medium text-slate-700">
        {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.resourceLabel') }}
      </span>
      <select
        :value="draft.selection"
        class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
        :disabled="disabled"
        @change="updateSelection(($event.target as HTMLSelectElement).value)"
      >
        <option
          v-if="view.slot.defaultResourceRef"
          :value="MANIFEST_DEFAULT_SELECTION"
        >
          {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.useManifestDefault', {
            resource: describeResourceRefForView(view.slot.defaultResourceRef),
          }) }}
        </option>
        <option
          v-if="!view.slot.required"
          value=""
        >
          {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.noResourceSelected') }}
        </option>
        <option
          v-for="resource in slotResources"
          :key="buildResourceRefKey(summaryToResourceRef(resource))"
          :value="buildResourceRefKey(summaryToResourceRef(resource))"
        >
          {{ describeResourceSummaryForView(resource) }}
        </option>
      </select>
    </label>

    <ApplicationAgentLaunchProfileEditor
      v-if="selectedResource?.kind === 'AGENT' && agentDraft"
      :slot="view.slot"
      :draft="agentDraft"
      :disabled="disabled"
      @update:draft="emit('update:launchProfile', $event)"
      @readiness-change="updateChildReadiness"
    />

    <ApplicationTeamLaunchProfileEditor
      v-else-if="selectedResource?.kind === 'AGENT_TEAM' && teamDraft"
      :slot="view.slot"
      :selected-resource="selectedResource"
      :draft="teamDraft"
      :disabled="disabled"
      @update:draft="emit('update:launchProfile', $event)"
      @readiness-change="updateChildReadiness"
    />

    <p
      v-else-if="selectedResource"
      class="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
    >
      {{ $t('applications.components.applications.ApplicationResourceSlotEditor.noEditorForSelection') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ApplicationResourceConfigurationView, ApplicationRuntimeResourceRef, ApplicationRuntimeResourceSummary } from '@autobyteus/application-sdk-contracts'
import ApplicationAgentLaunchProfileEditor from '~/components/applications/setup/ApplicationAgentLaunchProfileEditor.vue'
import ApplicationTeamLaunchProfileEditor from '~/components/applications/setup/ApplicationTeamLaunchProfileEditor.vue'
import { useLocalization } from '~/composables/useLocalization'
import {
  MANIFEST_DEFAULT_SELECTION,
  buildEmptyLaunchProfileDraft,
  buildResourceRefKey,
  describeResourceRef,
  describeResourceSummary,
  resourcesForSlot,
  resolveEffectiveResourceRef,
  summaryToResourceRef,
  type ApplicationAgentLaunchProfileDraft,
  type ApplicationSlotDraft,
  type ApplicationSlotEditorReadiness,
  type ApplicationTeamLaunchProfileDraft,
} from '~/utils/application/applicationLaunchProfile'

const props = withDefaults(defineProps<{
  view: ApplicationResourceConfigurationView
  draft: ApplicationSlotDraft
  availableResources: ApplicationRuntimeResourceSummary[]
  disabled?: boolean
}>(), {
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:selection', value: string): void
  (e: 'update:launchProfile', value: import('~/utils/application/applicationLaunchProfile').ApplicationLaunchProfileDraft): void
  (e: 'readiness-change', value: ApplicationSlotEditorReadiness): void
}>()

const { t: $t } = useLocalization()
const childReadiness = ref<ApplicationSlotEditorReadiness>({
  isReady: true,
  blockingReason: null,
  hasEffectiveResource: false,
})

const slotResources = computed(() => resourcesForSlot(props.view.slot, props.availableResources))
const selectedResourceRef = computed(() => resolveEffectiveResourceRef(props.view, props.draft, props.availableResources))
const selectedResource = computed(() => {
  if (!selectedResourceRef.value) {
    return null
  }
  return slotResources.value.find((resource) => buildResourceRefKey(summaryToResourceRef(resource)) === buildResourceRefKey(selectedResourceRef.value as ApplicationRuntimeResourceRef)) ?? null
})
const agentDraft = computed(() => props.draft.launchProfile?.kind === 'AGENT' ? props.draft.launchProfile as ApplicationAgentLaunchProfileDraft : null)
const teamDraft = computed(() => props.draft.launchProfile?.kind === 'AGENT_TEAM' ? props.draft.launchProfile as ApplicationTeamLaunchProfileDraft : null)
const hasKindSpecificEditor = computed(() => {
  if (!selectedResource.value) {
    return false
  }
  return selectedResource.value.kind === 'AGENT'
    ? Boolean(props.view.slot.supportedLaunchConfig?.AGENT)
    : Boolean(props.view.slot.supportedLaunchConfig?.AGENT_TEAM)
})

watch(
  () => selectedResource.value?.kind ?? null,
  (resourceKind) => {
    if (!resourceKind) {
      if (props.draft.launchProfile) {
        emit('update:launchProfile', null)
      }
      return
    }
    if (!hasKindSpecificEditor.value) {
      if (props.draft.launchProfile) {
        emit('update:launchProfile', null)
      }
      return
    }
    if (props.draft.launchProfile?.kind !== resourceKind) {
      emit('update:launchProfile', buildEmptyLaunchProfileDraft(resourceKind))
    }
  },
  { immediate: true },
)

watch(
  () => [selectedResource.value, props.view.slot.required, childReadiness.value, hasKindSpecificEditor.value] as const,
  () => {
    if (!selectedResource.value) {
      emit('readiness-change', {
        isReady: props.view.slot.required !== true,
        blockingReason: props.view.slot.required
          ? $t('applications.components.applications.ApplicationLaunchSetupPanel.requiredResourceBeforeEntry', {
            slot: props.view.slot.name,
          })
          : null,
        hasEffectiveResource: false,
      })
      return
    }

    if (!hasKindSpecificEditor.value) {
      emit('readiness-change', {
        isReady: true,
        blockingReason: null,
        hasEffectiveResource: true,
      })
      return
    }

    emit('readiness-change', {
      ...childReadiness.value,
      hasEffectiveResource: true,
    })
  },
  { deep: true, immediate: true },
)

const updateChildReadiness = (value: ApplicationSlotEditorReadiness) => {
  childReadiness.value = value
}

const updateSelection = (value: string) => {
  emit('update:selection', value)
}

const describeResourceRefForView = (resourceRef: ApplicationRuntimeResourceRef): string => (
  describeResourceRef(resourceRef, props.availableResources, $t)
)

const describeResourceSummaryForView = (resource: ApplicationRuntimeResourceSummary): string => (
  describeResourceSummary(resource, $t)
)
</script>

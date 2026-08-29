<template>
  <div class="space-y-4">
    <div
      v-if="view.issues.length"
      data-testid="application-launch-slot-issues"
      class="space-y-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
    >
      <div
        v-for="(issue, issueIndex) in view.issues"
        :key="`${issue.scope}:${issue.code}:${issueIndex}`"
      >
        <p class="font-medium">{{ issue.scope }} / {{ issue.code }}</p>
        <p class="mt-1">{{ issue.message }}</p>
        <ul
          v-if="issue.staleMembers?.length"
          data-testid="application-stale-team-members"
          class="mt-2 space-y-2"
        >
          <li
            v-for="member in issue.staleMembers"
            :key="`${member.memberAddress}:${member.agentDefinitionId}`"
            class="rounded-lg border border-amber-200 bg-white/70 px-3 py-2"
          >
            <span class="font-semibold">{{ member.memberAddress }}</span>
            <span class="block">{{ member.displayName }} · {{ member.agentDefinitionId }}</span>
            <span class="block text-xs">
              {{ formatStaleMemberReason(member.reason) }}
              <template v-if="member.currentAgentDefinitionId">
                · {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.currentAgentDefinition') }}:
                {{ member.currentAgentDefinitionId }}
              </template>
            </span>
          </li>
        </ul>
      </div>
    </div>

    <div
      v-if="view.packageBaseline || selectedBaseline || view.savedOverride || view.effectiveConfiguration"
      data-testid="application-launch-authority-summary"
      class="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 md:grid-cols-2 xl:grid-cols-4"
    >
      <div v-if="view.packageBaseline">
        <p class="font-semibold uppercase tracking-wide text-slate-700">
          {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.packageBaseline') }}
        </p>
        <p
          v-for="leaf in view.packageBaseline.leaves"
          :key="`baseline:${leaf.memberAddress ?? leaf.agentDefinitionId}`"
          class="mt-2"
        >
          {{ leaf.memberAddress ?? leaf.displayName }} · {{ leaf.runtimeKind }} · {{ leaf.llmModelIdentifier }}
        </p>
      </div>
      <div v-if="selectedBaseline">
        <p class="font-semibold uppercase tracking-wide text-slate-700">
          {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.selectedResourceBaseline') }}
        </p>
        <p
          v-for="leaf in selectedBaseline.leaves"
          :key="`selected:${leaf.memberAddress ?? leaf.agentDefinitionId}`"
          class="mt-2"
        >
          {{ leaf.memberAddress ?? leaf.displayName }} · {{ leaf.runtimeKind }} · {{ leaf.llmModelIdentifier }}
        </p>
      </div>
      <div>
        <p class="font-semibold uppercase tracking-wide text-slate-700">
          {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.savedOverride') }}
        </p>
        <p class="mt-2 font-medium text-slate-700">{{ view.savedOverrideState }}</p>
        <p v-if="view.savedOverride" class="mt-1">
          {{ describeResourceRefForView(view.savedOverride.executionResourceRef) }}
        </p>
        <p v-else class="mt-1">
          {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.noSavedOverride') }}
        </p>
      </div>
      <div v-if="view.effectiveConfiguration">
        <p class="font-semibold uppercase tracking-wide text-slate-700">
          {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.effectiveConfiguration') }}
        </p>
        <p
          v-for="leaf in view.effectiveConfiguration.leaves"
          :key="`effective:${leaf.memberAddress ?? leaf.agentDefinitionId}`"
          class="mt-2"
        >
          {{ leaf.memberAddress ?? leaf.displayName }} · {{ leaf.runtimeKind }} · {{ leaf.llmModelIdentifier }}
          <span class="mt-1 block text-slate-500">
            {{ formatProvenance(leaf.provenance.runtimeKind) }} · {{ formatProvenance(leaf.provenance.llmModelIdentifier) }}
          </span>
          <span class="mt-1 block text-slate-500">
            llmConfig: {{ formatOptionalProvenance(leaf.provenance.llmConfig) }} ·
            workspace: {{ leaf.provenance.workspaceRootPath }}
          </span>
        </p>
      </div>
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
          v-if="unavailableSavedSelection"
          :value="draft.selection"
          disabled
        >
          {{ describeResourceRefForView(unavailableSavedSelection) }} · {{ view.issues[0]?.message }}
        </option>
        <option
          v-if="view.slot.defaultExecutionResourceRef"
          :value="MANIFEST_DEFAULT_SELECTION"
        >
          {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.useManifestDefault', {
            resource: describeResourceRefForView(view.slot.defaultExecutionResourceRef),
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

    <p
      v-if="selectionProjectionPending"
      data-testid="application-selection-preview-pending"
      class="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700"
    >
      {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.loading') }}
    </p>
    <p
      v-else-if="selectionProjectionError"
      data-testid="application-selection-preview-error"
      class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {{ selectionProjectionError }}
    </p>

    <ApplicationAgentLaunchProfileEditor
      v-if="selectedResourceRef?.kind === 'AGENT' && agentDraft"
      :slot="view.slot"
      :draft="agentDraft"
      :inherited-profile="agentInheritedProfile"
      :disabled="editorDisabled"
      @update:draft="emit('update:launchProfile', $event)"
      @readiness-change="profileReadiness = $event"
    />

    <ApplicationTeamLaunchProfileEditor
      v-else-if="selectedResourceRef?.kind === 'AGENT_TEAM' && teamDraft"
      :slot="view.slot"
      :draft="teamDraft"
      :inherited-profiles="selectedBaseline?.leaves ?? []"
      :preserve-invalid-saved-override="preserveInvalidSavedTeamOverride"
      :disabled="editorDisabled"
      @update:draft="emit('update:launchProfile', $event)"
      @readiness-change="profileReadiness = $event"
    />

    <p
      v-else-if="selectedResourceRef"
      class="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
    >
      {{ $t('applications.components.applications.ApplicationExecutionResourceSlotEditor.noEditorForSelection') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type {
  ApplicationExecutionResourceRef,
  ApplicationExecutionResourceSummary,
  ApplicationLaunchSlotView,
  ApplicationLaunchValueSource,
  ApplicationResolvedResourceLaunchBaseline,
} from '@autobyteus/application-sdk-contracts'
import ApplicationAgentLaunchProfileEditor from '~/components/applications/setup/ApplicationAgentLaunchProfileEditor.vue'
import ApplicationTeamLaunchProfileEditor from '~/components/applications/setup/ApplicationTeamLaunchProfileEditor.vue'
import { useLocalization } from '~/composables/useLocalization'
import {
  MANIFEST_DEFAULT_SELECTION,
  buildEmptyLaunchProfileDraft,
  buildDraftFromView,
  buildResourceRefKey,
  describeResourceRef,
  describeResourceSummary,
  isSameResourceRef,
  resourcesForSlot,
  resolveEffectiveResourceRef,
  resolveSelectedResourceRef,
  summaryToResourceRef,
  type ApplicationAgentLaunchProfileDraft,
  type ApplicationSlotDraft,
  type ApplicationSlotEditorReadiness,
  type ApplicationTeamLaunchProfileDraft,
} from '~/utils/application/applicationLaunchProfile'
import type { ApplicationSelectionPreviewState } from '~/composables/useApplicationLaunchSelectionPreviews'

const props = withDefaults(defineProps<{
  view: ApplicationLaunchSlotView
  draft: ApplicationSlotDraft
  availableResources: ApplicationExecutionResourceSummary[]
  selectionPreviewState?: ApplicationSelectionPreviewState | null
  disabled?: boolean
}>(), {
  selectionPreviewState: null,
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:selection', value: string): void
  (e: 'update:launchProfile', value: import('~/utils/application/applicationLaunchProfile').ApplicationLaunchProfileDraft): void
  (e: 'readiness-change', value: ApplicationSlotEditorReadiness): void
}>()

const { t: $t } = useLocalization()
const slotResources = computed(() => resourcesForSlot(props.view.slot, props.availableResources))
const selectedResourceRef = computed(() => resolveEffectiveResourceRef(props.view, props.draft, props.availableResources))
const agentDraft = computed(() => props.draft.launchProfile?.kind === 'AGENT' ? props.draft.launchProfile as ApplicationAgentLaunchProfileDraft : null)
const teamDraft = computed(() => props.draft.launchProfile?.kind === 'AGENT_TEAM' ? props.draft.launchProfile as ApplicationTeamLaunchProfileDraft : null)
const unavailableSavedSelection = computed(() => {
  const savedRef = props.view.savedOverride?.executionResourceRef ?? null
  if (!savedRef || props.draft.selection !== buildResourceRefKey(savedRef)) return null
  return props.availableResources.some((resource) => (
    isSameResourceRef(summaryToResourceRef(resource), savedRef)
  )) ? null : savedRef
})
const persistedSelectionRef = computed(() => (
  props.view.savedOverride?.executionResourceRef
    ?? props.view.slot.defaultExecutionResourceRef
    ?? null
))
const isPersistedSelection = computed(() => (
  isSameResourceRef(selectedResourceRef.value, persistedSelectionRef.value)
))
const selectedBaseline = computed<ApplicationResolvedResourceLaunchBaseline | null>(() => {
  const selectedRef = selectedResourceRef.value
  if (!selectedRef) return null
  if (isPersistedSelection.value) {
    return props.view.selectedResourceBaseline
      && isSameResourceRef(props.view.selectedResourceBaseline.executionResourceRef, selectedRef)
      ? props.view.selectedResourceBaseline
      : null
  }
  const preview = props.selectionPreviewState?.preview
  return preview?.status === 'RESOLVED'
    && isSameResourceRef(preview.executionResourceRef, selectedRef)
    ? preview.selectedResourceBaseline
    : null
})
const selectionProjectionPending = computed(() => (
  !isPersistedSelection.value && props.selectionPreviewState?.status === 'PENDING'
))
const selectionProjectionError = computed(() => (
  isPersistedSelection.value
    ? selectedResourceRef.value && !selectedBaseline.value
      ? props.view.issues[0]?.message ?? null
      : null
    : props.selectionPreviewState?.status === 'INVALID'
      ? props.selectionPreviewState.error
      : null
))
const selectionProjectionReady = computed(() => (
  !selectedResourceRef.value
    ? props.view.slot.required !== true
    : Boolean(selectedBaseline.value)
))
const editorDisabled = computed(() => props.disabled || !selectionProjectionReady.value)
const agentInheritedProfile = computed(() => selectedBaseline.value?.leaves[0] ?? null)
const profileReadiness = ref<ApplicationSlotEditorReadiness>({
  isReady: false,
  blockingReason: null,
  hasEffectiveResource: false,
})
const preserveInvalidSavedOverride = computed(() => {
  if (
    props.view.savedOverrideState !== 'INVALID'
    || !props.view.savedOverride
  ) {
    return false
  }
  const originalDraft = buildDraftFromView(props.view)
  return (
    props.draft.selection === originalDraft.selection
    && JSON.stringify(props.draft.launchProfile) === JSON.stringify(originalDraft.launchProfile)
  )
})
const preserveInvalidSavedTeamOverride = computed(() => (
  preserveInvalidSavedOverride.value
  && props.view.savedOverride?.launchOverride?.kind === 'AGENT_TEAM'
  && props.view.issues.some((issue) => issue.code === 'SAVED_MEMBER_TOPOLOGY_STALE')
))
const hasKindSpecificEditor = computed(() => {
  if (!selectedResourceRef.value) {
    return false
  }
  return selectedResourceRef.value.kind === 'AGENT'
    ? Boolean(props.view.slot.supportedLaunchConfig?.AGENT)
    : Boolean(props.view.slot.supportedLaunchConfig?.AGENT_TEAM)
})

watch(
  () => selectedResourceRef.value?.kind ?? null,
  (resourceKind) => {
    if (!resourceKind) {
      if (props.draft.launchProfile && !preserveInvalidSavedOverride.value) {
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
  () => [
    selectedResourceRef.value,
    props.view.slot.required,
    selectionProjectionReady.value,
    selectionProjectionPending.value,
    selectionProjectionError.value,
    profileReadiness.value,
  ] as const,
  () => {
    if (!selectedResourceRef.value) {
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

    if (!selectionProjectionReady.value) {
      emit('readiness-change', {
        isReady: false,
        blockingReason: selectionProjectionError.value
          ?? $t('applications.components.applications.ApplicationLaunchSetupPanel.loading'),
        hasEffectiveResource: true,
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

    emit('readiness-change', profileReadiness.value)
  },
  { deep: true, immediate: true },
)

const updateSelection = (value: string) => {
  emit('update:selection', value)
  const nextResourceRef = value === MANIFEST_DEFAULT_SELECTION
    ? props.view.slot.defaultExecutionResourceRef ?? null
    : resolveSelectedResourceRef(value, props.availableResources)
  emit(
    'update:launchProfile',
    nextResourceRef && (
      nextResourceRef.kind === 'AGENT'
        ? Boolean(props.view.slot.supportedLaunchConfig?.AGENT)
        : Boolean(props.view.slot.supportedLaunchConfig?.AGENT_TEAM)
    )
      ? buildEmptyLaunchProfileDraft(nextResourceRef.kind)
      : null,
  )
}

const describeResourceRefForView = (executionResourceRef: ApplicationExecutionResourceRef): string => (
  describeResourceRef(executionResourceRef, props.availableResources, $t)
)

const describeResourceSummaryForView = (resource: ApplicationExecutionResourceSummary): string => (
  describeResourceSummary(resource, $t)
)

const formatProvenance = (source: ApplicationLaunchValueSource): string => (
  source.kind === 'HOST_MEMBER_OVERRIDE'
    ? `${source.kind}:${source.memberAddress}`
    : source.kind === 'PACKAGE_TEAM_DEFAULT' || source.kind === 'SELECTED_RESOURCE_TEAM_DEFAULT'
      ? `${source.kind}:${source.teamDefinitionId}`
      : source.kind === 'PACKAGE_AGENT_DEFAULT' || source.kind === 'SELECTED_RESOURCE_AGENT_DEFAULT'
        ? `${source.kind}:${source.agentDefinitionId}`
        : source.kind
)

const formatOptionalProvenance = (source: ApplicationLaunchValueSource | null): string => (
  source ? formatProvenance(source) : 'none'
)

const formatStaleMemberReason = (
  reason: 'MISSING_FROM_TEAM' | 'AGENT_CHANGED',
): string => (
  reason === 'AGENT_CHANGED'
    ? $t('applications.components.applications.ApplicationLaunchSetupPanel.staleMemberAgentChanged')
    : $t('applications.components.applications.ApplicationLaunchSetupPanel.staleMemberMissing')
)
</script>

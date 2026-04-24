<template>
  <div class="space-y-5">
    <div class="grid gap-4 lg:grid-cols-2">
      <label v-if="supportsRuntimeKind" class="block">
        <span class="mb-1 block text-sm font-medium text-slate-700">
          {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.runtimeLabel') }}
        </span>
        <select
          :value="normalizedStoredRuntimeKind"
          :disabled="disabled"
          class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
          @change="updateDefaults({ runtimeKind: ($event.target as HTMLSelectElement).value, llmModelIdentifier: '' })"
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
      </label>

      <div v-if="supportsModelIdentifier">
        <label class="mb-1 block text-sm font-medium text-slate-700">
          {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.modelLabel') }}
        </label>
        <SearchableGroupedSelect
          :model-value="draft.defaults.llmModelIdentifier"
          :options="groupedModelOptions"
          :disabled="disabled || !availableProviderGroups.length"
          :placeholder="$t('applications.components.applications.ApplicationLaunchSetupPanel.modelPlaceholder')"
          search-placeholder="Search models..."
          @update:model-value="updateDefaults({ llmModelIdentifier: $event })"
        />
        <p class="mt-1 text-xs text-slate-500">
          {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.modelHelp') }}
        </p>
      </div>
    </div>

    <div v-if="supportsWorkspaceRootPath">
      <label class="mb-1 block text-sm font-medium text-slate-700">
        {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.workspaceRootPathLabel') }}
      </label>
      <ApplicationWorkspaceRootSelector
        :model-value="draft.defaults.workspaceRootPath"
        :disabled="disabled"
        @update:model-value="updateDefaults({ workspaceRootPath: $event })"
      />
      <p class="mt-1 text-xs text-slate-500">
        {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.workspaceRootPathHelp') }}
      </p>
    </div>

    <div v-if="teamDefinitionError" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ teamDefinitionError }}
    </div>

    <div v-else-if="!resolvedMembers.length" class="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
      {{ $t('applications.components.applications.ApplicationTeamLaunchProfileEditor.loadingMembers') }}
    </div>

    <div v-else class="space-y-3">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h4 class="text-sm font-semibold text-slate-900">
            {{ $t('applications.components.applications.ApplicationTeamLaunchProfileEditor.memberOverridesHeading') }}
          </h4>
          <p class="text-xs leading-5 text-slate-500">
            {{ $t('applications.components.applications.ApplicationTeamLaunchProfileEditor.memberOverridesHelp') }}
          </p>
        </div>
      </div>

      <ApplicationTeamMemberOverrideItem
        v-for="member in draft.memberProfiles"
        :key="`${member.memberRouteKey}:${member.agentDefinitionId}`"
        :member="member"
        :global-runtime-kind="draft.defaults.runtimeKind"
        :global-llm-model-identifier="draft.defaults.llmModelIdentifier"
        :allow-runtime-override="supportsMemberRuntimeOverride"
        :allow-model-override="supportsMemberModelOverride"
        :disabled="disabled"
        @update:member="updateMember"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import SearchableGroupedSelect from '~/components/agentTeams/SearchableGroupedSelect.vue'
import ApplicationTeamMemberOverrideItem from '~/components/applications/setup/ApplicationTeamMemberOverrideItem.vue'
import ApplicationWorkspaceRootSelector from '~/components/applications/setup/ApplicationWorkspaceRootSelector.vue'
import { useLocalization } from '~/composables/useLocalization'
import {
  loadRuntimeProviderGroupsForSelection,
  normalizeScopedRuntimeKind,
  useRuntimeScopedModelSelection,
} from '~/composables/useRuntimeScopedModelSelection'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import type { ApplicationRuntimeResourceSummary } from '@autobyteus/application-sdk-contracts'
import type {
  ApplicationSlotEditorReadiness,
  ApplicationTeamLaunchProfileDraft,
  ApplicationTeamMemberProfileDraft,
} from '~/utils/application/applicationLaunchProfile'
import {
  evaluateTeamLaunchProfileReadiness,
  type TeamLaunchProfileRuntimeModelCatalogs,
} from '~/utils/teamLaunchReadinessCore'
import { resolveLeafTeamMembers } from '~/utils/teamDefinitionMembers'

const props = withDefaults(defineProps<{
  slot: import('@autobyteus/application-sdk-contracts').ApplicationResourceSlotDeclaration
  selectedResource: ApplicationRuntimeResourceSummary | null
  draft: ApplicationTeamLaunchProfileDraft
  disabled?: boolean
}>(), {
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:draft', value: ApplicationTeamLaunchProfileDraft): void
  (e: 'readiness-change', value: ApplicationSlotEditorReadiness): void
}>()

const { t: $t } = useLocalization()
const teamDefinitionStore = useAgentTeamDefinitionStore()
const teamDefinitionError = ref<string | null>(null)
const resolvedMembers = ref<Array<{ memberName: string; memberRouteKey: string; agentDefinitionId: string }>>([])
const runtimeModelCatalogs = ref<TeamLaunchProfileRuntimeModelCatalogs>({})

const supportsRuntimeKind = computed(() => props.slot.supportedLaunchConfig?.AGENT_TEAM?.runtimeKind === true)
const supportsModelIdentifier = computed(() => props.slot.supportedLaunchConfig?.AGENT_TEAM?.llmModelIdentifier === true)
const supportsWorkspaceRootPath = computed(() => props.slot.supportedLaunchConfig?.AGENT_TEAM?.workspaceRootPath === true)
const supportsMemberRuntimeOverride = computed(() => props.slot.supportedLaunchConfig?.AGENT_TEAM?.memberOverrides?.runtimeKind === true)
const supportsMemberModelOverride = computed(() => props.slot.supportedLaunchConfig?.AGENT_TEAM?.memberOverrides?.llmModelIdentifier === true)
const requiresModelCatalogs = computed(() => supportsModelIdentifier.value || supportsMemberModelOverride.value)

const {
  availableProviderGroups,
  groupedModelOptions,
  normalizedStoredRuntimeKind,
  runtimeOptions,
} = useRuntimeScopedModelSelection({
  runtimeKind: computed(() => props.draft.defaults.runtimeKind),
  allowBlankRuntime: true,
})

const repairMemberProfiles = (
  currentMembers: Array<{ memberName: string; memberRouteKey: string; agentDefinitionId: string }>,
  memberProfiles: ApplicationTeamMemberProfileDraft[],
): ApplicationTeamMemberProfileDraft[] => currentMembers.map((currentMember) => {
  const exactMatch = memberProfiles.find((memberProfile) => (
    memberProfile.memberRouteKey === currentMember.memberRouteKey
    && memberProfile.agentDefinitionId === currentMember.agentDefinitionId
  ))
  return {
    memberRouteKey: currentMember.memberRouteKey,
    memberName: currentMember.memberName,
    agentDefinitionId: currentMember.agentDefinitionId,
    runtimeKind: exactMatch?.runtimeKind ?? '',
    llmModelIdentifier: exactMatch?.llmModelIdentifier ?? '',
  }
})

const resolveCurrentMembers = async () => {
  teamDefinitionError.value = null
  const definitionId = props.selectedResource?.definitionId?.trim() || ''
  if (!definitionId) {
    resolvedMembers.value = []
    return
  }

  try {
    await teamDefinitionStore.fetchAllAgentTeamDefinitions()
    const teamDefinition = teamDefinitionStore.getAgentTeamDefinitionById(definitionId)
    if (!teamDefinition) {
      throw new Error(`Team definition '${definitionId}' was not found.`)
    }
    resolvedMembers.value = resolveLeafTeamMembers(teamDefinition, {
      getTeamDefinitionById: (id) => teamDefinitionStore.getAgentTeamDefinitionById(id),
    })
  } catch (error) {
    resolvedMembers.value = []
    teamDefinitionError.value = error instanceof Error ? error.message : String(error)
  }
}

const catalogRuntimeKinds = computed(() => Array.from(new Set([
  normalizeScopedRuntimeKind(props.draft.defaults.runtimeKind, false),
  ...props.draft.memberProfiles.map((memberProfile) => normalizeScopedRuntimeKind(
    memberProfile.runtimeKind || props.draft.defaults.runtimeKind,
    false,
  )),
])))

const memberProfilesAlignedToCurrentMembers = computed(() => (
  resolvedMembers.value.length > 0
  && resolvedMembers.value.length === props.draft.memberProfiles.length
  && resolvedMembers.value.every((member, index) => (
    props.draft.memberProfiles[index]?.memberRouteKey === member.memberRouteKey
    && props.draft.memberProfiles[index]?.agentDefinitionId === member.agentDefinitionId
  ))
))

watch(
  () => [
    supportsRuntimeKind.value,
    supportsModelIdentifier.value,
    supportsWorkspaceRootPath.value,
    supportsMemberRuntimeOverride.value,
    supportsMemberModelOverride.value,
    props.draft,
  ] as const,
  () => {
    const sanitizedDraft: ApplicationTeamLaunchProfileDraft = {
      ...props.draft,
      defaults: {
        runtimeKind: supportsRuntimeKind.value ? props.draft.defaults.runtimeKind : '',
        llmModelIdentifier: supportsModelIdentifier.value ? props.draft.defaults.llmModelIdentifier : '',
        workspaceRootPath: supportsWorkspaceRootPath.value ? props.draft.defaults.workspaceRootPath : '',
      },
      memberProfiles: props.draft.memberProfiles.map((memberProfile) => ({
        ...memberProfile,
        runtimeKind: supportsMemberRuntimeOverride.value ? memberProfile.runtimeKind : '',
        llmModelIdentifier: supportsMemberModelOverride.value ? memberProfile.llmModelIdentifier : '',
      })),
    }
    if (JSON.stringify(sanitizedDraft) !== JSON.stringify(props.draft)) {
      emit('update:draft', sanitizedDraft)
    }
  },
  { deep: true, immediate: true },
)

watch(
  () => props.selectedResource?.definitionId,
  () => {
    void resolveCurrentMembers()
  },
  { immediate: true },
)

watch(
  () => [resolvedMembers.value, props.draft.memberProfiles] as const,
  ([currentMembers]) => {
    if (!currentMembers.length) {
      return
    }
    const repairedProfiles = repairMemberProfiles(currentMembers, props.draft.memberProfiles)
    if (JSON.stringify(repairedProfiles) === JSON.stringify(props.draft.memberProfiles)) {
      return
    }
    emit('update:draft', {
      ...props.draft,
      memberProfiles: repairedProfiles,
    })
  },
  { deep: true, immediate: true },
)

watch(
  () => [
    requiresModelCatalogs.value,
    catalogRuntimeKinds.value,
  ] as const,
  async ([nextRequiresModelCatalogs, runtimeKinds]) => {
    if (!nextRequiresModelCatalogs) {
      runtimeModelCatalogs.value = {}
      return
    }

    const nextCatalogs: TeamLaunchProfileRuntimeModelCatalogs = {}
    await Promise.all(runtimeKinds.map(async (runtimeKind) => {
      const rows = await loadRuntimeProviderGroupsForSelection(runtimeKind as never)
      nextCatalogs[runtimeKind] = rows.flatMap((row) => row.models.map((model) => model.modelIdentifier))
    }))
    runtimeModelCatalogs.value = nextCatalogs
  },
  { deep: true, immediate: true },
)

watch(
  () => [
    props.draft.defaults.runtimeKind,
    props.draft.defaults.llmModelIdentifier,
    props.draft.memberProfiles,
    resolvedMembers.value,
    memberProfilesAlignedToCurrentMembers.value,
    runtimeModelCatalogs.value,
    teamDefinitionError.value,
    requiresModelCatalogs.value,
  ] as const,
  () => {
    if (teamDefinitionError.value) {
      emit('readiness-change', {
        isReady: false,
        blockingReason: teamDefinitionError.value,
        hasEffectiveResource: true,
      })
      return
    }

    if (!resolvedMembers.value.length || !memberProfilesAlignedToCurrentMembers.value) {
      emit('readiness-change', {
        isReady: false,
        blockingReason: $t('applications.components.applications.ApplicationTeamLaunchProfileEditor.loadingMembers'),
        hasEffectiveResource: true,
      })
      return
    }

    const readiness = evaluateTeamLaunchProfileReadiness({
      defaultRuntimeKind: props.draft.defaults.runtimeKind,
      defaultLlmModelIdentifier: props.draft.defaults.llmModelIdentifier,
      memberProfiles: props.draft.memberProfiles,
      runtimeModelCatalogs: runtimeModelCatalogs.value,
      requireModel: requiresModelCatalogs.value,
    })

    emit('readiness-change', {
      isReady: readiness.canSave,
      blockingReason: readiness.blockingIssues[0]?.message || null,
      hasEffectiveResource: true,
    })
  },
  { deep: true, immediate: true },
)

const updateDefaults = (patch: Partial<ApplicationTeamLaunchProfileDraft['defaults']>) => {
  emit('update:draft', {
    ...props.draft,
    defaults: {
      ...props.draft.defaults,
      ...patch,
    },
  })
}

const updateMember = (member: ApplicationTeamMemberProfileDraft) => {
  emit('update:draft', {
    ...props.draft,
    memberProfiles: props.draft.memberProfiles.map((memberProfile) => (
      memberProfile.memberRouteKey === member.memberRouteKey ? member : memberProfile
    )),
  })
}
</script>

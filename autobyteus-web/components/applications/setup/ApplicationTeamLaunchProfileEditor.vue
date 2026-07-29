<template>
  <div class="space-y-5">
    <div class="grid gap-4 lg:grid-cols-2">
      <label v-if="supportsRuntimeKind" class="block">
        <span class="mb-1 block text-sm font-medium text-slate-700">
          {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.runtimeLabel') }}
        </span>
        <select
          :value="normalizedStoredRuntimeKind"
          :disabled="disabled || preserveInvalidSavedOverride"
          class="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
          @change="updateDefaults({ runtimeKind: ($event.target as HTMLSelectElement).value, llmModelIdentifier: '' }, true)"
        >
          <option value="">
            {{ hasMixedInheritedRuntimes
              ? $t('applications.components.applications.ApplicationLaunchSetupPanel.mixedInheritedRuntime')
              : $t('applications.components.applications.ApplicationLaunchSetupPanel.useApplicationDefaultRuntime') }}
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
          :disabled="disabled || preserveInvalidSavedOverride || !canSelectTeamModel || !availableProviderGroups.length"
          :placeholder="hasMixedInheritedRuntimes && !draft.defaults.runtimeKind
            ? $t('applications.components.applications.ApplicationLaunchSetupPanel.mixedInheritedRuntime')
            : $t('applications.components.applications.ApplicationLaunchSetupPanel.modelPlaceholder')"
          search-placeholder="Search models..."
          @update:model-value="updateDefaults({ llmModelIdentifier: $event }, true)"
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
        :disabled="disabled || preserveInvalidSavedOverride"
        @update:model-value="updateDefaults({ workspaceRootPath: $event })"
      />
      <p class="mt-1 text-xs text-slate-500">
        {{ $t('applications.components.applications.ApplicationLaunchSetupPanel.workspaceRootPathHelp') }}
      </p>
    </div>

    <div
      v-if="preserveInvalidSavedOverride"
      data-testid="application-stale-team-override-lock"
      class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
    >
      <p>{{ $t('applications.components.applications.ApplicationTeamLaunchProfileEditor.staleOverrideLocked') }}</p>
      <button
        type="button"
        data-testid="application-replace-stale-team-topology"
        class="mt-3 inline-flex items-center rounded-md border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="disabled || !resolvedMembers.length"
        @click="replaceWithCurrentTopology"
      >
        {{ $t('applications.components.applications.ApplicationTeamLaunchProfileEditor.replaceStaleTopology') }}
      </button>
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
        :inherited-runtime-kind="inheritedProfileForMember(member)?.runtimeKind ?? inheritedTeamRuntimeKind"
        :inherited-llm-model-identifier="inheritedProfileForMember(member)?.llmModelIdentifier ?? ''"
        :allow-runtime-override="supportsMemberRuntimeOverride"
        :allow-model-override="supportsMemberModelOverride"
        :disabled="disabled || preserveInvalidSavedOverride"
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
  useRuntimeScopedModelSelection,
} from '~/composables/useRuntimeScopedModelSelection'
import type {
  ApplicationResolvedLaunchBaselineLeaf,
} from '@autobyteus/application-sdk-contracts'
import type {
  ApplicationSlotEditorReadiness,
  ApplicationTeamLaunchProfileDraft,
  ApplicationTeamMemberProfileDraft,
} from '~/utils/application/applicationLaunchProfile'
import {
  evaluateTeamLaunchProfileReadiness,
  type TeamLaunchProfileRuntimeModelCatalogs,
} from '~/utils/teamLaunchReadinessCore'

const props = withDefaults(defineProps<{
  slot: import('@autobyteus/application-sdk-contracts').ApplicationExecutionResourceSlotDeclaration
  draft: ApplicationTeamLaunchProfileDraft
  inheritedProfiles?: ApplicationResolvedLaunchBaselineLeaf[]
  preserveInvalidSavedOverride?: boolean
  disabled?: boolean
}>(), {
  inheritedProfiles: () => [],
  preserveInvalidSavedOverride: false,
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:draft', value: ApplicationTeamLaunchProfileDraft): void
  (e: 'readiness-change', value: ApplicationSlotEditorReadiness): void
}>()

const { t: $t } = useLocalization()
const runtimeModelCatalogs = ref<TeamLaunchProfileRuntimeModelCatalogs>({})

const supportsRuntimeKind = computed(() => props.slot.supportedLaunchConfig?.AGENT_TEAM?.runtimeKind === true)
const supportsModelIdentifier = computed(() => props.slot.supportedLaunchConfig?.AGENT_TEAM?.llmModelIdentifier === true)
const supportsLlmConfig = computed(() => props.slot.supportedLaunchConfig?.AGENT_TEAM?.llmConfig === true)
const supportsWorkspaceRootPath = computed(() => props.slot.supportedLaunchConfig?.AGENT_TEAM?.workspaceRootPath === true)
const supportsMemberRuntimeOverride = computed(() => props.slot.supportedLaunchConfig?.AGENT_TEAM?.memberOverrides?.runtimeKind === true)
const supportsMemberModelOverride = computed(() => props.slot.supportedLaunchConfig?.AGENT_TEAM?.memberOverrides?.llmModelIdentifier === true)
const supportsMemberLlmConfig = computed(() => props.slot.supportedLaunchConfig?.AGENT_TEAM?.memberOverrides?.llmConfig === true)
const requiresModelCatalogs = computed(() => supportsModelIdentifier.value || supportsMemberModelOverride.value)
const resolvedMembers = computed(() => props.inheritedProfiles.map((profile) => ({
  memberName: profile.memberName,
  memberRouteKey: profile.memberRouteKey ?? props.slot.slotKey,
  agentDefinitionId: profile.agentDefinitionId,
})))
const inheritedRuntimeKinds = computed(() => new Set(
  props.inheritedProfiles.map((profile) => profile.runtimeKind?.trim() ?? ''),
))
const inheritedTeamRuntimeKind = computed(() => {
  return inheritedRuntimeKinds.value.size === 1
    ? [...inheritedRuntimeKinds.value][0] ?? ''
    : ''
})
const hasMixedInheritedRuntimes = computed(() => (
  inheritedRuntimeKinds.value.size > 1
))
const canSelectTeamModel = computed(() => Boolean(
  props.draft.defaults.runtimeKind.trim() || inheritedTeamRuntimeKind.value,
))

const {
  availableProviderGroups,
  groupedModelOptions,
  normalizedStoredRuntimeKind,
  runtimeOptions,
} = useRuntimeScopedModelSelection({
  runtimeKind: computed(() => props.draft.defaults.runtimeKind),
  inheritedRuntimeKind: inheritedTeamRuntimeKind,
  allowBlankRuntime: true,
  useDefaultRuntimeFallback: false,
})

const inheritedProfileForMember = (
  member: ApplicationTeamMemberProfileDraft,
): ApplicationResolvedLaunchBaselineLeaf | null => (
  props.inheritedProfiles.find((profile) => (
    profile.memberRouteKey === member.memberRouteKey
    && profile.agentDefinitionId === member.agentDefinitionId
  )) ?? null
)

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
    ...(exactMatch && Object.prototype.hasOwnProperty.call(exactMatch, 'llmConfig')
      ? { llmConfig: exactMatch.llmConfig ? structuredClone(exactMatch.llmConfig) : null }
      : {}),
  }
})

const catalogRuntimeKinds = computed(() => Array.from(new Set([
  ...props.draft.memberProfiles
    .map((memberProfile) => (
      memberProfile.runtimeKind
        || props.draft.defaults.runtimeKind
        || inheritedProfileForMember(memberProfile)?.runtimeKind
        || ''
    ).trim())
    .filter(Boolean),
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
    supportsLlmConfig.value,
    supportsWorkspaceRootPath.value,
    supportsMemberRuntimeOverride.value,
    supportsMemberModelOverride.value,
    supportsMemberLlmConfig.value,
    props.draft,
  ] as const,
  () => {
    if (props.preserveInvalidSavedOverride) {
      return
    }
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
    if (!supportsLlmConfig.value) {
      delete sanitizedDraft.defaults.llmConfig
    }
    if (!supportsMemberLlmConfig.value) {
      sanitizedDraft.memberProfiles.forEach((memberProfile) => {
        delete memberProfile.llmConfig
      })
    }
    if (JSON.stringify(sanitizedDraft) !== JSON.stringify(props.draft)) {
      emit('update:draft', sanitizedDraft)
    }
  },
  { deep: true, immediate: true },
)

watch(
  () => [resolvedMembers.value, props.draft.memberProfiles] as const,
  ([currentMembers]) => {
    if (props.preserveInvalidSavedOverride || !currentMembers.length) {
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
    requiresModelCatalogs.value,
    props.preserveInvalidSavedOverride,
    props.inheritedProfiles,
  ] as const,
  () => {
    if (props.preserveInvalidSavedOverride) {
      emit('readiness-change', {
        isReady: false,
        blockingReason: $t('applications.components.applications.ApplicationTeamLaunchProfileEditor.staleOverrideLocked'),
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
      memberProfiles: props.draft.memberProfiles.map((memberProfile) => ({
        ...memberProfile,
        inheritedRuntimeKind: inheritedProfileForMember(memberProfile)?.runtimeKind,
        inheritedLlmModelIdentifier:
          inheritedProfileForMember(memberProfile)?.llmModelIdentifier,
      })),
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

const updateDefaults = (
  patch: Partial<ApplicationTeamLaunchProfileDraft['defaults']>,
  invalidatesLlmConfig = false,
) => {
  const defaults = {
    ...props.draft.defaults,
    ...patch,
  }
  if (invalidatesLlmConfig) {
    delete defaults.llmConfig
  }
  emit('update:draft', {
    ...props.draft,
    defaults,
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

const replaceWithCurrentTopology = () => {
  if (!resolvedMembers.value.length) {
    return
  }
  emit('update:draft', {
    ...props.draft,
    memberProfiles: repairMemberProfiles(resolvedMembers.value, props.draft.memberProfiles),
  })
}
</script>

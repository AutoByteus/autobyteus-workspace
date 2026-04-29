<template>
  <div class="space-y-4">
    <div>
      <label class="mb-1 block text-sm font-medium text-gray-700">{{ $t('workspace.components.workspace.config.TeamRunConfigForm.team_definition') }}</label>
      <div class="block w-full cursor-not-allowed select-none rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500 shadow-sm">
        {{ teamDefinition.name }}
      </div>
    </div>

    <RuntimeModelConfigFields
      :runtime-kind="config.runtimeKind"
      :llm-model-identifier="config.llmModelIdentifier"
      :llm-config="config.llmConfig"
      :disabled="isFormReadOnly"
      :read-only="isFormReadOnly"
      :runtime-selection-locked="runtimeSelectionLocked"
      :runtime-help-text="$t('workspace.components.workspace.config.TeamRunConfigForm.selects_the_runtime_backend_used_by')"
      :model-label="$t('workspace.components.workspace.config.TeamRunConfigForm.default_llm_model_global')"
      :model-help-text="$t('workspace.components.workspace.config.TeamRunConfigForm.this_model_will_be_used_by')"
      :advanced-initially-expanded="readOnlyMode"
      :missing-historical-config="missingHistoricalGlobalConfig"
      id-prefix="team-run"
      @update:runtime-kind="updateRuntimeKind"
      @update:llm-model-identifier="updateLlmModelIdentifier"
      @update:llm-config="updateLlmConfig"
    />

    <div class="mt-8">
      <WorkspaceSelector
        :workspace-id="config.workspaceId"
        :is-loading="workspaceLoadingState.isLoading"
        :error="workspaceLoadingState.error"
        :disabled="isFormReadOnly"
        @select-existing="handleSelectExisting"
        @load-new="handleLoadNew"
      />
    </div>

    <div v-if="leafMembers.length > 0" class="mt-4">
      <button
        type="button"
        @click="overridesExpanded = !overridesExpanded"
        class="w-full text-left text-sm font-medium text-gray-700 transition-colors hover:text-gray-900"
      >
        <span class="mr-1 inline-block transition-transform duration-200" :class="overridesExpanded ? 'rotate-90' : ''">
          <span class="i-heroicons-chevron-right-20-solid h-4 w-4"></span>
        </span>
        Team Members Override ({{ leafMembers.length }})
      </button>

      <div v-show="overridesExpanded" class="mt-3 space-y-2">
        <MemberOverrideItem
          v-for="member in leafMembers"
          :key="member.memberRouteKey"
          :member-name="member.memberName"
          :agent-definition-id="member.agentDefinitionId"
          :override="config.memberOverrides[member.memberName]"
          :global-runtime-kind="config.runtimeKind"
          :global-llm-model="config.llmModelIdentifier"
          :global-llm-config="config.llmConfig"
          :is-coordinator="member.memberName === teamDefinition.coordinatorMemberName"
          :disabled="isFormReadOnly"
          :advanced-initially-expanded="readOnlyMode"
          :missing-historical-config="memberMissingHistoricalConfig(member.memberName)"
          @update:override="handleOverrideUpdate"
        />
      </div>
    </div>

    <div class="mt-4 flex items-center justify-between gap-4 py-2">
      <label for="team-auto-execute" class="block text-base text-gray-900 select-none" :class="{ 'text-gray-400': isFormReadOnly }">{{ $t('workspace.components.workspace.config.TeamRunConfigForm.auto_approve_tools') }}</label>
      <button
        id="team-auto-execute"
        type="button"
        class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        :class="config.autoExecuteTools ? 'bg-blue-600' : 'bg-gray-200'"
        @click="updateAutoExecute(!config.autoExecuteTools)"
        :disabled="isFormReadOnly"
      >
        <span class="sr-only">{{ $t('workspace.components.workspace.config.TeamRunConfigForm.auto_approve_tools') }}</span>
        <span
          aria-hidden="true"
          class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
          :class="config.autoExecuteTools ? 'translate-x-5' : 'translate-x-0'"
        />
      </button>
    </div>

    <div>
      <label for="team-skill-access-mode" class="mb-1 block text-sm font-medium text-gray-700">{{ $t('workspace.components.workspace.config.TeamRunConfigForm.skill_access') }}</label>
      <select
        id="team-skill-access-mode"
        :value="config.skillAccessMode"
        :disabled="isFormReadOnly"
        class="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
        @change="updateSkillAccessMode(($event.target as HTMLSelectElement).value)"
      >
        <option value="PRELOADED_ONLY">{{ $t('workspace.components.workspace.config.TeamRunConfigForm.configured_skills_only_recommended') }}</option>
        <option value="GLOBAL_DISCOVERY">{{ $t('workspace.components.workspace.config.TeamRunConfigForm.all_installed_skills') }}</option>
        <option value="NONE">{{ $t('workspace.components.workspace.config.TeamRunConfigForm.no_skills') }}</option>
      </select>
      <p class="mt-1 text-xs text-gray-500">{{ $t('workspace.components.workspace.config.TeamRunConfigForm.controls_which_skills_team_members_are') }}</p>
    </div>

    <div v-if="readOnlyMode" class="flex items-center rounded bg-slate-50 p-2 text-xs text-slate-600">
      <span class="i-heroicons-eye-20-solid mr-1 h-4 w-4"></span>
      <span>{{ $t('workspace.components.workspace.config.TeamRunConfigForm.selected_team_run_configuration_read_only') }}</span>
    </div>

    <div v-else-if="config.isLocked" class="flex items-center rounded bg-amber-50 p-2 text-xs text-amber-600">
      <span class="i-heroicons-lock-closed-20-solid mr-1 h-4 w-4"></span>
      <span>{{ $t('workspace.components.workspace.config.TeamRunConfigForm.configuration_locked_because_execution_has_start') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore'
import type { TeamRunConfig, MemberConfigOverride } from '~/types/agent/TeamRunConfig'
import type { SkillAccessMode } from '~/types/agent/AgentRunConfig'
import RuntimeModelConfigFields from '~/components/launch-config/RuntimeModelConfigFields.vue'
import WorkspaceSelector from './WorkspaceSelector.vue'
import MemberOverrideItem from './MemberOverrideItem.vue'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore'
import { loadRuntimeProviderGroupsForSelection } from '~/composables/useRuntimeScopedModelSelection'
import { resolveLeafTeamMembers } from '~/utils/teamDefinitionMembers'
import {
  hasExplicitMemberLlmConfigOverride,
  hasExplicitMemberLlmModelOverride,
  hasExplicitMemberRuntimeOverride,
  hasMeaningfulMemberOverride,
  resolveEffectiveMemberRuntimeKind,
} from '~/utils/teamRunConfigUtils'

interface WorkspaceLoadingState {
  isLoading: boolean
  error: string | null
  loadedPath: string | null
}

const props = defineProps<{
  config: TeamRunConfig
  teamDefinition: AgentTeamDefinition
  workspaceLoadingState: WorkspaceLoadingState
  initialPath?: string
  readOnly?: boolean
}>()

const emit = defineEmits<{
  (e: 'select-existing', workspaceId: string): void
  (e: 'load-new', path: string): void
}>()

const teamDefinitionStore = useAgentTeamDefinitionStore()
const teamRunConfigStore = useTeamRunConfigStore()
const overridesExpanded = ref(true)
const readOnlyMode = computed(() => props.readOnly === true)
const isFormReadOnly = computed(() => props.config.isLocked || readOnlyMode.value)
const missingHistoricalGlobalConfig = computed(() =>
  readOnlyMode.value &&
  props.config.llmConfig == null,
)
const runtimeSelectionLocked = computed(() => isFormReadOnly.value)
const leafMembers = computed(() =>
  resolveLeafTeamMembers(props.teamDefinition, {
    getTeamDefinitionById: (teamDefinitionId: string) =>
      teamDefinitionStore.getAgentTeamDefinitionById(teamDefinitionId),
  }),
)

watch(
  () => [
    props.config.runtimeKind,
    ...Object.values(props.config.memberOverrides || {}).map((override) => override?.runtimeKind || ''),
  ],
  async () => {
    const runtimeKinds = new Set<string>()
    runtimeKinds.add(props.config.runtimeKind)

    Object.values(props.config.memberOverrides || {}).forEach((override) => {
      runtimeKinds.add(resolveEffectiveMemberRuntimeKind(override, props.config.runtimeKind))
    })

    await Promise.all(
      Array.from(runtimeKinds)
        .filter((runtimeKind) => runtimeKind.trim().length > 0)
        .map(async (runtimeKind) => {
          const rows = await loadRuntimeProviderGroupsForSelection(runtimeKind)
          teamRunConfigStore.setRuntimeModelCatalog(
            runtimeKind,
            rows.flatMap((row) => row.models.map((model) => model.modelIdentifier)),
          )
        }),
    )
  },
  { immediate: true },
)

const handleOverrideUpdate = (memberName: string, override: MemberConfigOverride | null) => {
  if (isFormReadOnly.value) return
  const overrides = { ...(props.config.memberOverrides || {}) }
  if (override && hasMeaningfulMemberOverride(override)) {
    overrides[memberName] = override
  } else {
    delete overrides[memberName]
  }
  props.config.memberOverrides = overrides
}

const memberMissingHistoricalConfig = (memberName: string) => {
  if (!readOnlyMode.value) return false
  const override = props.config.memberOverrides[memberName]
  if (hasExplicitMemberLlmConfigOverride(override)) {
    return override?.llmConfig == null
  }
  return props.config.llmConfig == null
}

const updateAutoExecute = (checked: boolean) => {
  if (isFormReadOnly.value) return
  props.config.autoExecuteTools = checked
}

const updateSkillAccessMode = (value: string) => {
  if (isFormReadOnly.value) return
  props.config.skillAccessMode = value as SkillAccessMode
}

const pruneInheritedMemberLlmConfigs = (changedGlobal: { runtime: boolean; model: boolean }) => {
  if (!changedGlobal.runtime && !changedGlobal.model) return

  const currentOverrides = props.config.memberOverrides || {}
  const nextOverrides: Record<string, MemberConfigOverride> = {}
  let pruned = false

  for (const [memberName, override] of Object.entries(currentOverrides)) {
    const shouldPruneConfig = hasExplicitMemberLlmConfigOverride(override) && (
      (changedGlobal.runtime && !hasExplicitMemberRuntimeOverride(override)) ||
      (changedGlobal.model && !hasExplicitMemberLlmModelOverride(override))
    )

    if (!shouldPruneConfig) {
      nextOverrides[memberName] = override
      continue
    }

    const prunedOverride = { ...override }
    delete prunedOverride.llmConfig
    if (hasMeaningfulMemberOverride(prunedOverride)) {
      nextOverrides[memberName] = prunedOverride
    }
    pruned = true
  }

  if (pruned) {
    props.config.memberOverrides = nextOverrides
  }
}

const updateRuntimeKind = (value: string) => {
  if (isFormReadOnly.value) return
  const runtimeChanged = value !== props.config.runtimeKind
  pruneInheritedMemberLlmConfigs({ runtime: runtimeChanged, model: false })
  props.config.runtimeKind = value
}

const updateLlmModelIdentifier = (value: string) => {
  if (isFormReadOnly.value) return
  const modelChanged = value !== props.config.llmModelIdentifier
  pruneInheritedMemberLlmConfigs({ runtime: false, model: modelChanged })
  props.config.llmModelIdentifier = value
}

const updateLlmConfig = (value: Record<string, unknown> | null) => {
  if (isFormReadOnly.value) return
  props.config.llmConfig = value
}

const handleSelectExisting = (workspaceId: string) => {
  if (isFormReadOnly.value) return
  emit('select-existing', workspaceId)
}

const handleLoadNew = (path: string) => {
  if (isFormReadOnly.value) return
  emit('load-new', path)
}
</script>

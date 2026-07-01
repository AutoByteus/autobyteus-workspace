<template>
  <div class="space-y-4">
    <div
      class="space-y-4"
      data-test="team-definition-group"
    >
      <h3 class="text-sm font-semibold text-slate-900">
        {{ $t('workspace.components.workspace.config.TeamRunConfigForm.team_definition') }}
      </h3>

      <div class="space-y-4 pl-3">
        <div
          class="block w-full cursor-not-allowed select-none rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 shadow-sm"
          data-test="team-definition-name-card"
        >
          {{ teamDefinition.name }}
        </div>

        <TeamRunDefaultsSummary
          :state="runDefaultsSummary.state"
          :runtime-label="runDefaultsSummary.runtimeLabel"
          :model-identifier="runDefaultsSummary.modelIdentifier"
          :model-config-entries="runDefaultsSummary.modelConfigEntries"
          :model-config-changed-from-definition="runDefaultsSummary.modelConfigChangedFromDefinition"
          :auto-execute-tools="config.autoExecuteTools"
          :expanded="runDefaultsExpanded"
          :read-only="isFormReadOnly"
          @toggle="toggleRunDefaultsExpanded"
        >
          <template #expanded>
            <div class="space-y-5">
              <RuntimeModelConfigFields
                :runtime-kind="config.runtimeKind"
                :llm-model-identifier="config.llmModelIdentifier"
                :llm-config="config.llmConfig"
                :disabled="isFormReadOnly"
                :read-only="isFormReadOnly"
                :runtime-selection-locked="runtimeSelectionLocked"
                :model-label="$t('workspace.components.workspace.config.TeamRunConfigForm.default_llm_model_global')"
                :advanced-initially-expanded="readOnlyMode"
                :missing-historical-config="missingHistoricalGlobalConfig"
                :inline-single-advanced-row-when-thinking-on="true"
                id-prefix="team-run"
                @update:runtime-kind="updateRuntimeKind"
                @update:llm-model-identifier="updateLlmModelIdentifier"
                @update:llm-config="updateLlmConfig"
              />

              <div
                class="rounded-md border border-slate-200 bg-white px-3 py-3"
                data-test="team-auto-execute-card"
              >
                <div
                  class="flex items-center justify-between gap-4"
                  data-test="team-auto-execute-title-row"
                >
                  <label for="team-auto-execute" class="block text-sm font-semibold text-slate-900 select-none" :class="{ 'text-gray-400': isFormReadOnly }">{{ $t('workspace.components.workspace.config.TeamRunConfigForm.auto_approve_tools') }}</label>
                  <button
                    id="team-auto-execute"
                    type="button"
                    class="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                <p
                  class="mt-1 text-xs leading-relaxed text-gray-500"
                  data-test="team-auto-execute-description"
                >
                  {{ $t('workspace.components.workspace.config.TeamRunConfigForm.auto_approve_tools_help') }}
                </p>
              </div>
            </div>
          </template>
        </TeamRunDefaultsSummary>

        <div v-if="leafMembers.length > 0" class="space-y-3">
          <TeamMemberOverridesSummary
            :total-members="memberOverridesSummary.totalMembers"
            :active-override-count="memberOverridesSummary.activeOverrideCount"
            :active-override-names="memberOverridesSummary.activeOverrideNames"
            :hidden-override-count="memberOverridesSummary.hiddenOverrideCount"
            :expanded="overridesExpanded"
            :read-only="isFormReadOnly"
            @toggle="toggleOverridesExpanded"
          />

          <div
            v-if="overridesExpanded"
            class="mt-3"
            data-test="team-member-overrides-editor"
          >
            <MemberOverrideTree
              :member-nodes="memberTree"
              :config="config"
              :global-runtime-kind="config.runtimeKind"
              :global-llm-model="config.llmModelIdentifier"
              :global-llm-config="config.llmConfig"
              :global-auto-execute-tools="config.autoExecuteTools"
              :coordinator-member-route-key="coordinatorMemberRouteKey"
              :disabled="isFormReadOnly"
              :advanced-initially-expanded="readOnlyMode"
              :read-only-mode="readOnlyMode"
              @update:override="handleOverrideUpdate"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="mt-8">
      <WorkspaceSelector
        :workspace-id="config.workspaceId"
        :is-loading="workspaceLoadingState.isLoading"
        :error="workspaceLoadingState.error"
        :initial-path="initialPath || workspaceLoadingState.loadedPath || ''"
        :disabled="isFormReadOnly"
        @select-existing="handleSelectExisting"
        @workspace-input-change="handleWorkspaceInputChange"
      />
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
import { computed, ref, toRef, watch } from 'vue'
import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore'
import type { TeamRunConfig, MemberConfigOverride } from '~/types/agent/TeamRunConfig'
import type { SkillAccessMode } from '~/types/agent/AgentRunConfig'
import RuntimeModelConfigFields from '~/components/launch-config/RuntimeModelConfigFields.vue'
import WorkspaceSelector from './WorkspaceSelector.vue'
import MemberOverrideTree from './MemberOverrideTree.vue'
import TeamRunDefaultsSummary from './TeamRunDefaultsSummary.vue'
import TeamMemberOverridesSummary from './TeamMemberOverridesSummary.vue'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useTeamRunRuntimeCatalogSync } from '~/composables/useTeamRunRuntimeCatalogSync'
import {
  buildTeamMemberTreeFromDefinition,
  flattenLeafAgentMemberNodes,
} from '~/utils/teamDefinitionMembers'
import {
  hasExplicitMemberLlmConfigOverride,
  hasExplicitMemberLlmModelOverride,
  hasExplicitMemberRuntimeOverride,
  hasMeaningfulMemberOverride,
} from '~/utils/teamRunConfigUtils'
import {
  buildTeamMemberOverridesPresentation,
  buildTeamRunDefaultsPresentation,
} from '~/utils/teamRunConfigPresentation'

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
  (e: 'workspace-input-change', input: { mode: 'existing' | 'new'; pendingPath: string }): void
}>()

const teamDefinitionStore = useAgentTeamDefinitionStore()
const runDefaultsExpanded = ref(true)
const overridesExpanded = ref(props.readOnly === true)
const readOnlyMode = computed(() => props.readOnly === true)
const isFormReadOnly = computed(() => props.config.isLocked || readOnlyMode.value)
const missingHistoricalGlobalConfig = computed(() =>
  readOnlyMode.value &&
  props.config.llmConfig == null,
)
const runtimeSelectionLocked = computed(() => isFormReadOnly.value)
const memberTree = computed(() =>
  buildTeamMemberTreeFromDefinition(props.teamDefinition, {
    getTeamDefinitionById: (teamDefinitionId: string) =>
      teamDefinitionStore.getAgentTeamDefinitionById(teamDefinitionId),
  }),
)
const leafMembers = computed(() => flattenLeafAgentMemberNodes(memberTree.value))
const runDefaultsSummary = computed(() =>
  buildTeamRunDefaultsPresentation({
    config: props.config,
    defaultLaunchConfig: props.teamDefinition.defaultLaunchConfig,
  }),
)
const memberOverridesSummary = computed(() =>
  buildTeamMemberOverridesPresentation({
    leafMembers: leafMembers.value,
    memberOverrides: props.config.memberOverrides,
  }),
)
const coordinatorMemberRouteKey = computed(() => {
  const coordinatorMemberName = props.teamDefinition.coordinatorMemberName?.trim() || ''
  if (!coordinatorMemberName) return ''
  return memberTree.value.find((node) => node.memberName === coordinatorMemberName)?.memberRouteKey || coordinatorMemberName
})

useTeamRunRuntimeCatalogSync(toRef(props, 'config'))

const resetDisclosureStateForContext = (isReadOnly: boolean) => {
  runDefaultsExpanded.value = true
  overridesExpanded.value = isReadOnly
}

watch([
  readOnlyMode,
  () => props.config,
  () => props.config.teamDefinitionId,
  () => props.teamDefinition.id,
], ([isReadOnly]) => {
  resetDisclosureStateForContext(isReadOnly)
})

const toggleRunDefaultsExpanded = () => {
  runDefaultsExpanded.value = !runDefaultsExpanded.value
}

const toggleOverridesExpanded = () => {
  overridesExpanded.value = !overridesExpanded.value
}

const handleOverrideUpdate = (memberRouteKey: string, override: MemberConfigOverride | null) => {
  if (isFormReadOnly.value) return
  const overrides = { ...(props.config.memberOverrides || {}) }
  if (override && hasMeaningfulMemberOverride(override)) {
    overrides[memberRouteKey] = override
  } else {
    delete overrides[memberRouteKey]
  }
  props.config.memberOverrides = overrides
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

const handleWorkspaceInputChange = (input: { mode: 'existing' | 'new'; pendingPath: string }) => {
  if (isFormReadOnly.value) return
  emit('workspace-input-change', input)
}
</script>

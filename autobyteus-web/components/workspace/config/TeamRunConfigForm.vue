<template>
  <div class="space-y-4">
    <div>
      <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('workspace.components.workspace.config.TeamRunConfigForm.team_definition') }}</label>
      <div class="rounded-md bg-slate-50 px-3 py-2 text-sm text-gray-500">{{ teamDefinition.name }}</div>
    </div>

    <div v-if="repairAddresses.length" role="status" class="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800" data-test="team-topology-repair-notice">
      {{ t('workspace.components.workspace.config.TeamRunConfigForm.topology_repaired') }} <span class="font-mono">{{ repairAddresses.join(', ') }}</span>
    </div>

    <TeamScopeConfigEditor
      address="/"
      :display-name="teamDefinition.name"
      :effective-config="configurationView.root.effectiveConfig"
      :workspace-selection="workspaceSelectionFor('/')"
      :is-root="true"
      :disabled="isFormReadOnly"
      :read-only="readOnlyMode"
      :workspace-loading-state="workspaceStateFor('/')"
      :runtime-catalog-state="catalogStateFor(configurationView.root.effectiveConfig.runtimeKind)"
      @update-root="handleRootUpdate"
      @update:workspace-selection="forwardWorkspaceSelection"
      @retry-runtime-catalog="retryRuntimeCatalog"
    />

    <div v-if="memberTree.length" class="space-y-3">
      <button
        type="button"
        class="flex w-full items-center justify-between rounded px-1 py-2 text-left text-sm font-semibold text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        :aria-expanded="membersExpanded"
        aria-controls="team-scope-members"
        @click="membersExpanded = !membersExpanded"
      >
        <span>{{ t('workspace.components.workspace.config.TeamRunConfigForm.scopes_and_agents', { count: memberCount }) }}</span><span aria-hidden="true">{{ membersExpanded ? '▾' : '▸' }}</span>
      </button>
      <div v-show="membersExpanded" id="team-scope-members">
        <TeamMemberConfigTree
          :member-nodes="memberTree"
          :config="config"
          :view="configurationView"
          :coordinator-address="coordinatorAddress"
          :disabled="isFormReadOnly"
          :read-only-mode="readOnlyMode"
          :workspace-state-for="workspaceStateFor"
          :workspace-selection-for="workspaceSelectionFor"
          :catalog-state-for="catalogStateFor"
          @update-team="handleTeamUpdate"
          @reset-team="handleTeamReset"
          @update-agent="handleAgentUpdate"
          @update:workspace-selection="forwardWorkspaceSelection"
          @retry-runtime-catalog="retryRuntimeCatalog"
        />
      </div>
    </div>

    <div v-if="readOnlyMode" class="flex items-center rounded bg-slate-50 p-2 text-xs text-slate-600">
      <span aria-hidden="true" class="mr-1">◉</span><span>{{ t('workspace.components.workspace.config.TeamRunConfigForm.selected_team_run_configuration_read_only') }}</span>
    </div>
    <div v-else-if="config.isLocked" class="flex items-center rounded bg-amber-50 p-2 text-xs text-amber-700">
      <span aria-hidden="true" class="mr-1">🔒</span><span>{{ t('workspace.components.workspace.config.TeamRunConfigForm.configuration_locked_because_execution_has_start') }}</span>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type { AgentConfigOverride, TeamRunConfig, TeamScopeConfigOverride } from '~/types/agent/TeamRunConfig'
import type { TeamLaunchConfigEdit } from '~/types/agent/TeamLaunchDraft'
import type { WorkspaceSelectionState } from '~/types/workspace/WorkspaceSelectionState'
import { useTeamRunConfigStore, type RuntimeModelCatalogState, type WorkspaceLoadingState } from '~/stores/teamRunConfigStore'
import { buildTeamMemberTreeFromDefinition, flattenTeamMemberNodesForDisplay } from '~/utils/teamDefinitionMembers'
import { resolveTeamRunConfiguration } from '~/utils/teamRunLaunchHierarchy'
import { useTeamRunRuntimeCatalogSync } from '~/composables/useTeamRunRuntimeCatalogSync'
import TeamScopeConfigEditor from './TeamScopeConfigEditor.vue'
import TeamMemberConfigTree from './TeamMemberConfigTree.vue'
import { useLocalization } from '~/composables/useLocalization'

const props = defineProps<{
  config: Readonly<TeamRunConfig>
  teamDefinition: AgentTeamDefinition
  workspaceLoadingState?: WorkspaceLoadingState
  workspaceLoadingStates?: Readonly<Record<AgentTeamAddress, WorkspaceLoadingState>>
  workspaceSelections?: Readonly<Partial<Record<AgentTeamAddress, WorkspaceSelectionState>>>
  repairAddresses?: readonly AgentTeamAddress[]
  readOnly?: boolean
}>()
const emit = defineEmits<{
  (e: 'update:workspaceSelection', address: AgentTeamAddress, selection: WorkspaceSelectionState): void
  (e: 'edit-config', edit: TeamLaunchConfigEdit): void
}>()
const definitions = useAgentTeamDefinitionStore()
const launchConfigStore = useTeamRunConfigStore()
const { t } = useLocalization()
const membersExpanded = ref(true)
const readOnlyMode = computed(() => props.readOnly === true)
const isFormReadOnly = computed(() => props.config.isLocked || readOnlyMode.value)
const memberTree = computed(() => buildTeamMemberTreeFromDefinition(props.teamDefinition, { getTeamDefinitionById: definitions.getAgentTeamDefinitionById }))
const configurationView = computed(() => resolveTeamRunConfiguration(props.config, memberTree.value))
const memberCount = computed(() => flattenTeamMemberNodesForDisplay(memberTree.value).length)
const coordinatorAddress = computed(() => memberTree.value.find((node) => node.displayName === props.teamDefinition.coordinatorMemberName)?.address || '/')
const repairAddresses = computed(() => props.repairAddresses || [])
const workspaceStateFor = (address: AgentTeamAddress): WorkspaceLoadingState => props.workspaceLoadingStates?.[address]
  ?? (address === '/' ? props.workspaceLoadingState : null)
  ?? { isLoading: false, error: null, loadedPath: null }
const workspaceSelectionFor = (address: AgentTeamAddress): Readonly<WorkspaceSelectionState> => {
  const explicit = props.workspaceSelections?.[address]
  if (explicit) return explicit
  const effective = configurationView.value.teamsByAddress[address]?.effectiveConfig
  if (!effective) throw new Error(`Team launch view is missing '${address}'.`)
  return {
    mode: effective.workspaceId ? 'existing' : 'new',
    existingWorkspaceId: effective.workspaceId,
    newWorkspacePath: effective.workspaceRootPath || workspaceStateFor(address).loadedPath || '',
  }
}
const catalogStateFor = (runtimeKind: string): RuntimeModelCatalogState => launchConfigStore.runtimeModelCatalogStates[runtimeKind]
  ?? { status: 'idle', error: null }
const { reloadRuntimeKind } = useTeamRunRuntimeCatalogSync(toRef(props, 'config'))
const retryRuntimeCatalog = (runtimeKind: string) => { void reloadRuntimeKind(runtimeKind) }

const handleRootUpdate = (field: 'runtime' | 'model' | 'llmConfig' | 'auto', value: unknown) => {
  if (isFormReadOnly.value) return
  if (field === 'runtime') emit('edit-config', { kind: 'set_root_runtime', runtimeKind: value as string })
  else if (field === 'model') emit('edit-config', { kind: 'set_root_model', llmModelIdentifier: value as string })
  else if (field === 'llmConfig') emit('edit-config', { kind: 'set_root_llm_config', llmConfig: value as Record<string, unknown> | null })
  else emit('edit-config', { kind: 'set_root_auto_execute_tools', autoExecuteTools: value as boolean })
}
const handleTeamUpdate = (teamAddress: AgentTeamAddress, override: TeamScopeConfigOverride | null) => emit('edit-config', { kind: 'set_team_override', teamAddress, override })
const handleTeamReset = (teamAddress: AgentTeamAddress) => emit('edit-config', { kind: 'reset_team_override', teamAddress })
const handleAgentUpdate = (agentAddress: AgentTeamAddress, override: AgentConfigOverride | null) => emit('edit-config', { kind: 'set_agent_override', agentAddress, override })
const forwardWorkspaceSelection = (address: AgentTeamAddress, selection: WorkspaceSelectionState) =>
  emit('update:workspaceSelection', address, selection)
</script>

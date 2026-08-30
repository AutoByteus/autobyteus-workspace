<template>
  <div class="space-y-4" data-test="team-run-config-form" :data-mode="model.mode">
    <div>
      <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('workspace.components.workspace.config.TeamRunConfigForm.team_definition') }}</label>
      <div class="block w-full cursor-not-allowed select-none rounded-md border border-transparent bg-slate-50 px-3 py-2 text-sm text-gray-500">{{ model.definitionLabel }}</div>
    </div>

    <div v-if="model.mode === 'editable' && model.repairAddresses.length" role="status" class="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800" data-test="team-topology-repair-notice">
      {{ t('workspace.components.workspace.config.TeamRunConfigForm.topology_repaired') }} <span class="font-mono">{{ model.repairAddresses.join(', ') }}</span>
    </div>

    <TeamScopeConfigEditor
      :scope="model.root"
      :is-root="true"
      :disabled="isFormReadOnly"
      :model-config-field-errors="modelConfigFieldErrorsByAddress[model.root.address]"
      @update-root="handleRootUpdate"
      @update:workspace-selection="forwardWorkspaceSelection"
      @retry-runtime-catalog="retryRuntimeCatalog"
      @update-existing-model-config="forwardExistingModelConfig"
      @schema-state="forwardSchemaState"
    />

    <div v-if="model.members.length" class="mt-4">
      <button
        type="button"
        class="flex w-full items-center justify-between rounded-md px-1 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        data-test="team-member-overrides-toggle"
        :aria-expanded="membersExpanded"
        :aria-controls="memberOverridesPanelId"
        @click="membersExpanded = !membersExpanded"
      >
        <span class="flex min-w-0 items-center gap-1.5">
          <span class="truncate">
            {{ t('workspace.components.workspace.config.TeamRunConfigForm.team_members_override') }} ({{ memberCount }})
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-4 w-4 flex-shrink-0 transform text-gray-600 transition-transform duration-300"
            :class="membersExpanded ? '' : '-rotate-90'"
            data-test="team-member-overrides-chevron"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      <div
        v-show="membersExpanded"
        :id="memberOverridesPanelId"
        class="mt-3"
        data-test="team-member-overrides-panel"
      >
        <TeamMemberConfigTree
          :member-nodes="model.members"
          :disabled="isFormReadOnly"
          :model-config-field-errors-by-address="modelConfigFieldErrorsByAddress"
          @update-team="handleTeamUpdate"
          @reset-team="handleTeamReset"
          @update-agent="handleAgentUpdate"
          @update:workspace-selection="forwardWorkspaceSelection"
          @retry-runtime-catalog="retryRuntimeCatalog"
          @update-existing-model-config="forwardExistingModelConfig"
          @schema-state="forwardSchemaState"
        />
      </div>
    </div>

    <div v-if="model.mode === 'existing'" class="flex items-center rounded p-2 text-xs" :class="model.modelConfigEditable ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'" data-test="team-run-existing-notice">
      <span aria-hidden="true" class="mr-1">{{ model.modelConfigEditable ? '●' : '🔒' }}</span>
      <span>{{ existingRunStatusMessage }}</span>
    </div>
    <div v-else-if="model.mode === 'editable' && model.isLocked" class="flex items-center rounded bg-amber-50 p-2 text-xs text-amber-700">
      <span aria-hidden="true" class="mr-1">🔒</span><span>{{ t('workspace.components.workspace.config.TeamRunConfigForm.configuration_locked_because_execution_has_start') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type { AgentConfigOverride, TeamScopeConfigOverride } from '~/types/agent/TeamRunConfig'
import type { TeamLaunchConfigEdit } from '~/types/agent/TeamLaunchDraft'
import type { TeamRunFormMemberNode, TeamRunFormModel } from '~/types/agent/TeamRunFormModel'
import type { WorkspaceSelectionState } from '~/types/workspace/WorkspaceSelectionState'
import TeamScopeConfigEditor from './TeamScopeConfigEditor.vue'
import TeamMemberConfigTree from './TeamMemberConfigTree.vue'
import { useLocalization } from '~/composables/useLocalization'

const props = defineProps<{
  model: Readonly<TeamRunFormModel>
  modelConfigFieldErrorsByAddress?: Readonly<Record<string, Readonly<Record<string, string>>>>
}>()
const emit = defineEmits<{
  (e: 'update:workspaceSelection', address: AgentTeamAddress, selection: WorkspaceSelectionState): void
  (e: 'edit-config', edit: TeamLaunchConfigEdit): void
  (e: 'retry-runtime-catalog', runtimeKind: string): void
  (e: 'update-existing-model-config', address: string, config: Record<string, unknown> | null): void
  (e: 'schema-state', address: string, state: { status: 'loading' | 'ready' | 'invalid' | 'unavailable'; message: string | null }): void
}>()
const { t } = useLocalization()
const membersExpanded = ref(false)
const memberOverridesPanelId = 'team-member-overrides-panel'
const model = computed(() => props.model)
const modelConfigFieldErrorsByAddress = computed(() => props.modelConfigFieldErrorsByAddress ?? {})
const isFormReadOnly = computed(() => model.value.mode === 'existing'
  ? model.value.saving || !model.value.modelConfigEditable
  : model.value.isLocked)
const existingRunStatusMessage = computed(() => model.value.mode === 'existing' && model.value.modelConfigReason === 'REFRESH_REQUIRED'
  ? t('workspace.runModelConfig.refreshRequired')
  : model.value.mode === 'existing' && model.value.modelConfigEditable
    ? t('workspace.runModelConfig.teamStopped')
    : t('workspace.runModelConfig.teamActive'))
const countAgents = (nodes: readonly TeamRunFormMemberNode[]): number => nodes.reduce(
  (count, node) => count + (node.kind === 'agent' ? 1 : countAgents(node.children)),
  0,
)
const memberCount = computed(() => countAgents(model.value.members))

const handleRootUpdate = (field: 'runtime' | 'model' | 'llmConfig' | 'auto', value: unknown) => {
  if (model.value.mode !== 'editable' || isFormReadOnly.value) return
  if (field === 'runtime') emit('edit-config', { kind: 'set_root_runtime', runtimeKind: value as string })
  else if (field === 'model') emit('edit-config', { kind: 'set_root_model', llmModelIdentifier: value as string })
  else if (field === 'llmConfig') emit('edit-config', { kind: 'set_root_llm_config', llmConfig: value as Record<string, unknown> | null })
  else emit('edit-config', { kind: 'set_root_auto_execute_tools', autoExecuteTools: value as boolean })
}
const handleTeamUpdate = (teamAddress: AgentTeamAddress, override: TeamScopeConfigOverride | null) => {
  if (model.value.mode === 'editable' && !isFormReadOnly.value) emit('edit-config', { kind: 'set_team_override', teamAddress, override })
}
const handleTeamReset = (teamAddress: AgentTeamAddress) => {
  if (model.value.mode === 'editable' && !isFormReadOnly.value) emit('edit-config', { kind: 'reset_team_override', teamAddress })
}
const handleAgentUpdate = (agentAddress: AgentTeamAddress, override: AgentConfigOverride | null) => {
  if (model.value.mode === 'editable' && !isFormReadOnly.value) emit('edit-config', { kind: 'set_agent_override', agentAddress, override })
}
const forwardWorkspaceSelection = (address: AgentTeamAddress, selection: WorkspaceSelectionState) => {
  if (model.value.mode === 'editable' && !isFormReadOnly.value) emit('update:workspaceSelection', address, selection)
}
const retryRuntimeCatalog = (runtimeKind: string) => {
  if (model.value.mode === 'editable' && !isFormReadOnly.value) emit('retry-runtime-catalog', runtimeKind)
}
const forwardExistingModelConfig = (address: string, config: Record<string, unknown> | null) => {
  if (model.value.mode === 'existing' && !isFormReadOnly.value) emit('update-existing-model-config', address, config)
}
const forwardSchemaState = (address: string, state: { status: 'loading' | 'ready' | 'invalid' | 'unavailable'; message: string | null }) => {
  if (model.value.mode === 'existing') emit('schema-state', address, state)
}
</script>

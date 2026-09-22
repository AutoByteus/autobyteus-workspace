<template>
  <div v-if="existingModel" class="space-y-4" data-test="agent-org-config-form" data-mode="existing">
    <div>
      <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('workspace.agentOrg.runConfig.orgLabel') }}</label>
      <div class="block w-full cursor-not-allowed select-none rounded-md bg-slate-50 px-3 py-2 text-sm text-gray-500">{{ existingModel.definitionLabel }}</div>
    </div>
    <TeamScopeConfigEditor
      :scope="existingModel.root"
      :is-root="true"
      :disabled="existingReadOnly"
      :model-config-field-errors="fieldErrors[existingModel.root.address]"
      @update-existing-model-config="forwardExisting"
      @schema-state="forwardSchema"
    />
    <MemberOverridesDisclosure
      :label="memberOverridesLabel || t('workspace.agentOrg.runConfig.memberOverrides')"
      :count="existingMemberCount"
      test-prefix="org-member-overrides"
    >
      <div v-if="existingDirectAgents.length" class="mb-3 overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
        <AgentOrgDirectAgentOverrideRow
          v-for="agent in existingDirectAgents"
          :key="agent.address"
          :node="agent"
          :expanded="expandedExistingDirectAgent === agent.address"
          :disabled="existingReadOnly"
          :model-config-field-errors="fieldErrors[agent.address]"
          @toggle="toggleExistingDirectAgent(agent.address)"
          @update-existing-model-config="forwardExisting"
          @schema-state="forwardSchema"
        />
      </div>
      <TeamMemberConfigTree
        v-if="existingMountedTeams.length"
        :member-nodes="existingMountedTeams"
        :disabled="existingReadOnly"
        :model-config-field-errors-by-address="fieldErrors"
        @update-existing-model-config="forwardExisting"
        @update:workspace-selection="(address, value) => emit('update:workspace-selection', address, value)"
        @schema-state="forwardSchema"
      />
    </MemberOverridesDisclosure>
    <div class="flex items-center rounded p-2 text-xs"
      :class="existingModel.modelConfigEditable ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'"
      data-test="agent-org-run-existing-notice">
      <span aria-hidden="true" class="mr-1">{{ existingModel.modelConfigEditable ? '●' : '🔒' }}</span>
      <span>{{ existingModel.modelConfigReason === 'REFRESH_REQUIRED'
        ? t('workspace.runModelConfig.refreshRequired')
        : existingModel.modelConfigEditable
          ? t('workspace.runModelConfig.orgStopped')
          : t('workspace.runModelConfig.orgActive') }}</span>
    </div>
  </div>
  <template v-else>
    <slot />
    <MemberOverridesDisclosure
      v-if="editableModel"
      :label="memberOverridesLabel"
      :count="editableModel.configurableAgentCount"
      test-prefix="org-member-overrides"
    >
      <div v-if="editableModel.directAgents.length" class="mb-3 overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
        <AgentOrgDirectAgentOverrideRow
          v-for="agent in editableModel.directAgents"
          :key="agent.address"
          :node="agent"
          :expanded="expandedDirectAgent === agent.address"
          @toggle="emit('toggle-direct-agent', agent.address)"
          @update:override="emit('update-agent', agent.address, $event)"
          @schema-state="(address, state) => emit('schema-state', address, state)"
        />
      </div>
      <TeamMemberConfigTree
        v-if="editableModel.mountedTeams.length"
        :member-nodes="editableModel.mountedTeams"
        :disabled="false"
        :team-model-help-text="teamModelHelpText"
        @update-team="(address, value) => emit('update-team', address, value)"
        @reset-team="(address) => emit('reset-team', address)"
        @update-agent="(address, value) => emit('update-agent', address, value)"
        @update:workspace-selection="(address, value) => emit('update:workspace-selection', address, value)"
        @schema-state="(address, state) => emit('schema-state', address, state)"
      />
    </MemberOverridesDisclosure>
  </template>
</template>

<script setup lang="ts">
import type { EditableAgentOrgRunFormModel } from '~/utils/editableAgentOrgRunFormModel'
import type { ExistingTeamFormAgentNode, ExistingTeamFormTeamNode, ExistingTeamRunFormModel } from '~/types/agent/ExistingTeamRunFormModel'
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type { AgentConfigOverride, TeamScopeConfigOverride } from '~/types/agent/TeamRunConfig'
import type { WorkspaceSelectionState } from '~/types/workspace/WorkspaceSelectionState'
import type { ExistingRunModelSelection } from '~/types/agent/ExistingRunModelConfigDraft'
import type { RuntimeModelConfigSchemaState } from '~/types/agent/RuntimeModelConfigSchemaState'
import AgentOrgDirectAgentOverrideRow from './AgentOrgDirectAgentOverrideRow.vue'
import MemberOverridesDisclosure from './MemberOverridesDisclosure.vue'
import TeamMemberConfigTree from './TeamMemberConfigTree.vue'
import TeamScopeConfigEditor from './TeamScopeConfigEditor.vue'
import { computed, ref } from 'vue'
import { useLocalization } from '~/composables/useLocalization'

const props = defineProps<{
  editableModel?: EditableAgentOrgRunFormModel | null
  existingModel?: ExistingTeamRunFormModel | null
  expandedDirectAgent?: AgentTeamAddress | null
  memberOverridesLabel?: string
  teamModelHelpText?: string
  modelConfigFieldErrorsByAddress?: Readonly<Record<string, Readonly<Record<string, string>>>>
}>()
const { t } = useLocalization()
const fieldErrors = computed(() => props.modelConfigFieldErrorsByAddress ?? {})
const existingReadOnly = computed(() => Boolean(props.existingModel
  && (props.existingModel.saving || !props.existingModel.modelConfigEditable)))
const countAgents = (nodes: ExistingTeamRunFormModel['members']): number => nodes.reduce(
  (count, node) => count + (node.kind === 'agent' ? 1 : countAgents(node.children)), 0,
)
const existingMemberCount = computed(() => props.existingModel ? countAgents(props.existingModel.members) : 0)
const existingDirectAgents = computed<readonly ExistingTeamFormAgentNode[]>(() =>
  props.existingModel?.members.filter((node): node is ExistingTeamFormAgentNode => node.kind === 'agent') ?? [],
)
const existingMountedTeams = computed<readonly ExistingTeamFormTeamNode[]>(() =>
  props.existingModel?.members.filter((node): node is ExistingTeamFormTeamNode => node.kind === 'agent_team') ?? [],
)
const expandedExistingDirectAgent = ref<AgentTeamAddress | null>(null)
const toggleExistingDirectAgent = (address: AgentTeamAddress) => {
  expandedExistingDirectAgent.value = expandedExistingDirectAgent.value === address ? null : address
}
const emit = defineEmits<{
  (event: 'toggle-direct-agent', address: AgentTeamAddress): void
  (event: 'update-team', address: AgentTeamAddress, value: TeamScopeConfigOverride | null): void
  (event: 'reset-team', address: AgentTeamAddress): void
  (event: 'update-agent', address: AgentTeamAddress, value: AgentConfigOverride | null): void
  (event: 'update:workspace-selection', address: AgentTeamAddress, value: WorkspaceSelectionState): void
  (event: 'update-existing-model-config', address: string, value: ExistingRunModelSelection, directlyEdited: boolean): void
  (event: 'schema-state', address: string, state: RuntimeModelConfigSchemaState): void
}>()
const forwardExisting = (address: string, value: ExistingRunModelSelection, directlyEdited: boolean) =>
  emit('update-existing-model-config', address, value, directlyEdited)
const forwardSchema = (address: string, state: RuntimeModelConfigSchemaState) =>
  emit('schema-state', address, state)
</script>

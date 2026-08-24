<template>
  <div :class="treeClass" data-test="team-member-config-tree">
    <template v-for="node in memberNodes" :key="node.address">
      <TeamScopeConfigEditor
        v-if="node.kind === 'agent_team'"
        :address="node.address"
        :display-name="node.displayName"
        :effective-config="teamView(node.address).effectiveConfig"
        :inherited-config="parentTeamView(node.address).effectiveConfig"
        :override="teamView(node.address).override"
        :is-customized="teamView(node.address).isCustomized"
        :disabled="disabled"
        :read-only="readOnlyMode"
        :workspace-loading-state="workspaceStateFor(node.address)"
        :runtime-catalog-state="catalogStateFor(teamView(node.address).effectiveConfig.runtimeKind)"
        @update-override="emit('update-team', node.address, $event)"
        @reset="emit('reset-team', node.address)"
        @select-existing="forwardSelectExisting"
        @workspace-input-change="forwardWorkspaceInput"
        @retry-runtime-catalog="forwardRetryRuntimeCatalog"
      >
        <div v-if="node.children.length" class="mt-4 border-l border-slate-200 pl-3">
          <TeamMemberConfigTree
            :member-nodes="node.children"
            :config="config"
            :view="view"
            :coordinator-address="node.coordinatorAddress"
            :disabled="disabled"
            :read-only-mode="readOnlyMode"
            :workspace-state-for="workspaceStateFor"
            :catalog-state-for="catalogStateFor"
            :nested="true"
            @update-team="forwardTeamUpdate"
            @reset-team="forwardTeamReset"
            @update-agent="forwardAgentUpdate"
            @select-existing="forwardSelectExisting"
            @workspace-input-change="forwardWorkspaceInput"
            @retry-runtime-catalog="forwardRetryRuntimeCatalog"
          />
        </div>
      </TeamScopeConfigEditor>

      <MemberOverrideItem
        v-else
        :member-name="node.displayName"
        :member-address="node.address"
        :member-breadcrumb="breadcrumb(node.address)"
        :override="config.agentOverrides[node.address]"
        :global-runtime-kind="agentBaseline(node.address).runtimeKind"
        :global-llm-model="agentBaseline(node.address).llmModelIdentifier"
        :global-llm-config="agentBaseline(node.address).llmConfig"
        :is-coordinator="node.address === coordinatorAddress"
        :disabled="disabled"
        :advanced-initially-expanded="readOnlyMode"
        :missing-historical-config="readOnlyMode && agentView(node.address).effectiveConfig.llmConfig == null"
        :runtime-catalog-state="catalogStateFor(agentView(node.address).effectiveConfig.runtimeKind)"
        @update:override="forwardAgentUpdate"
        @retry-runtime-catalog="forwardRetryRuntimeCatalog"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type {
  AgentConfigOverride,
  ResolvedAgentLaunchView,
  ResolvedTeamRunLaunchConfig,
  ResolvedTeamScopeView,
  TeamRunConfig,
  TeamRunConfigurationView,
  TeamScopeConfigOverride,
} from '~/types/agent/TeamRunConfig'
import type { RuntimeModelCatalogState, WorkspaceLoadingState } from '~/stores/teamRunConfigStore'
import type { TeamDefinitionMemberNode } from '~/utils/teamDefinitionMembers'
import MemberOverrideItem from './MemberOverrideItem.vue'
import TeamScopeConfigEditor from './TeamScopeConfigEditor.vue'

const props = withDefaults(defineProps<{
  memberNodes: readonly TeamDefinitionMemberNode[]
  config: Readonly<TeamRunConfig>
  view: Readonly<TeamRunConfigurationView>
  coordinatorAddress: AgentTeamAddress
  disabled: boolean
  readOnlyMode?: boolean
  nested?: boolean
  workspaceStateFor: (address: AgentTeamAddress) => WorkspaceLoadingState
  catalogStateFor: (runtimeKind: string) => RuntimeModelCatalogState
}>(), { readOnlyMode: false, nested: false })
const emit = defineEmits<{
  (e: 'update-team', address: AgentTeamAddress, override: TeamScopeConfigOverride | null): void
  (e: 'reset-team', address: AgentTeamAddress): void
  (e: 'update-agent', address: AgentTeamAddress, override: AgentConfigOverride | null): void
  (e: 'select-existing', address: AgentTeamAddress, workspaceId: string): void
  (e: 'workspace-input-change', address: AgentTeamAddress, input: { mode: 'existing' | 'new'; pendingPath: string }): void
  (e: 'retry-runtime-catalog', runtimeKind: string): void
}>()

const treeClass = computed(() => props.nested
  ? 'space-y-3'
  : 'space-y-3 rounded-lg bg-slate-50/60 p-2')
const teamView = (address: AgentTeamAddress): ResolvedTeamScopeView => {
  const team = props.view.teamsByAddress[address]
  if (!team) throw new Error(`Team launch view is missing '${address}'.`)
  return team
}
const parentTeamView = (address: AgentTeamAddress): ResolvedTeamScopeView => {
  const parentAddress = teamView(address).parentAddress
  if (!parentAddress) throw new Error(`Nested Team '${address}' has no parent Team scope.`)
  return teamView(parentAddress)
}
const agentView = (address: AgentTeamAddress): ResolvedAgentLaunchView => {
  const agent = props.view.agentsByAddress[address]
  if (!agent) throw new Error(`Team launch view is missing Agent '${address}'.`)
  return agent
}
const agentBaseline = (address: AgentTeamAddress): Readonly<ResolvedTeamRunLaunchConfig> =>
  teamView(agentView(address).containingTeamAddress).effectiveConfig
const breadcrumb = (address: AgentTeamAddress): string => address.split('/').filter(Boolean).join(' / ')
const forwardTeamUpdate = (address: AgentTeamAddress, override: TeamScopeConfigOverride | null) => emit('update-team', address, override)
const forwardTeamReset = (address: AgentTeamAddress) => emit('reset-team', address)
const forwardAgentUpdate = (address: AgentTeamAddress, override: AgentConfigOverride | null) => emit('update-agent', address, override)
const forwardSelectExisting = (address: AgentTeamAddress, workspaceId: string) => emit('select-existing', address, workspaceId)
const forwardWorkspaceInput = (address: AgentTeamAddress, input: { mode: 'existing' | 'new'; pendingPath: string }) => emit('workspace-input-change', address, input)
const forwardRetryRuntimeCatalog = (runtimeKind: string) => emit('retry-runtime-catalog', runtimeKind)
</script>

<template>
  <div class="space-y-3" data-test="team-member-config-tree">
    <template v-for="node in memberNodes" :key="node.address">
      <div v-if="node.kind === 'agent_team'" class="border-l border-slate-200 pl-3">
        <TeamScopeConfigEditor
          :address="node.address"
          :display-name="node.displayName"
          :effective-config="view.teamsByAddress[node.address].effectiveConfig"
          :override="config.teamOverrides[node.address]"
          :is-customized="view.teamsByAddress[node.address].isCustomized"
          :disabled="disabled"
          :read-only="readOnlyMode"
          :workspace-loading-state="workspaceStateFor(node.address)"
          :runtime-catalog-state="catalogStateFor(view.teamsByAddress[node.address].effectiveConfig.runtimeKind)"
          @update-override="(address, override) => $emit('update-team', address, override)"
          @reset="(address) => $emit('reset-team', address)"
          @select-existing="(address, workspaceId) => $emit('select-existing', address, workspaceId)"
          @workspace-input-change="(address, input) => $emit('workspace-input-change', address, input)"
          @retry-runtime-catalog="(runtimeKind) => $emit('retry-runtime-catalog', runtimeKind)"
        />
        <div class="mt-3 pl-3">
          <TeamMemberConfigTree
            :member-nodes="node.children"
            :config="config"
            :view="view"
            :coordinator-address="coordinatorAddress"
            :disabled="disabled"
            :read-only-mode="readOnlyMode"
            :workspace-state-for="workspaceStateFor"
            :catalog-state-for="catalogStateFor"
            @update-team="(address, override) => $emit('update-team', address, override)"
            @reset-team="(address) => $emit('reset-team', address)"
            @update-agent="(address, override) => $emit('update-agent', address, override)"
            @select-existing="(address, workspaceId) => $emit('select-existing', address, workspaceId)"
            @workspace-input-change="(address, input) => $emit('workspace-input-change', address, input)"
            @retry-runtime-catalog="(runtimeKind) => $emit('retry-runtime-catalog', runtimeKind)"
          />
        </div>
      </div>
      <MemberOverrideItem
        v-else
        :member-name="node.displayName"
        :member-address="node.address"
        :member-breadcrumb="node.address.split('/').filter(Boolean).join(' / ')"
        :override="config.agentOverrides[node.address]"
        :global-runtime-kind="view.teamsByAddress[view.agentsByAddress[node.address].containingTeamAddress].effectiveConfig.runtimeKind"
        :global-llm-model="view.teamsByAddress[view.agentsByAddress[node.address].containingTeamAddress].effectiveConfig.llmModelIdentifier"
        :global-llm-config="view.teamsByAddress[view.agentsByAddress[node.address].containingTeamAddress].effectiveConfig.llmConfig"
        :is-coordinator="node.address === coordinatorAddress"
        :disabled="disabled"
        :advanced-initially-expanded="readOnlyMode"
        :missing-historical-config="readOnlyMode && view.agentsByAddress[node.address].effectiveConfig.llmConfig == null"
        :runtime-catalog-state="catalogStateFor(view.agentsByAddress[node.address].effectiveConfig.runtimeKind)"
        @update:override="(address, override) => $emit('update-agent', address, override)"
        @retry-runtime-catalog="(runtimeKind) => $emit('retry-runtime-catalog', runtimeKind)"
      />
    </template>
  </div>
</template>
<script setup lang="ts">
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type { AgentConfigOverride, TeamRunConfig, TeamRunConfigurationView, TeamScopeConfigOverride } from '~/types/agent/TeamRunConfig'
import type { TeamDefinitionMemberNode } from '~/utils/teamDefinitionMembers'
import type { RuntimeModelCatalogState, WorkspaceLoadingState } from '~/stores/teamRunConfigStore'
import TeamScopeConfigEditor from './TeamScopeConfigEditor.vue'
import MemberOverrideItem from './MemberOverrideItem.vue'

defineProps<{
  memberNodes: readonly TeamDefinitionMemberNode[]
  config: Readonly<TeamRunConfig>
  view: TeamRunConfigurationView
  coordinatorAddress: AgentTeamAddress
  disabled: boolean
  readOnlyMode: boolean
  workspaceStateFor: (address: AgentTeamAddress) => WorkspaceLoadingState
  catalogStateFor: (runtimeKind: string) => RuntimeModelCatalogState
}>()
defineEmits<{
  (e: 'update-team', address: AgentTeamAddress, override: TeamScopeConfigOverride | null): void
  (e: 'reset-team', address: AgentTeamAddress): void
  (e: 'update-agent', address: AgentTeamAddress, override: AgentConfigOverride | null): void
  (e: 'select-existing', address: AgentTeamAddress, workspaceId: string): void
  (e: 'workspace-input-change', address: AgentTeamAddress, input: { mode: 'existing' | 'new'; pendingPath: string }): void
  (e: 'retry-runtime-catalog', runtimeKind: string): void
}>()
</script>

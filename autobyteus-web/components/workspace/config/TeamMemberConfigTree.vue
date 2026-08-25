<template>
  <div :class="treeClass" data-test="team-member-config-tree">
    <template v-for="node in memberNodes" :key="node.address">
      <TeamScopeConfigEditor
        v-if="node.kind === 'agent_team'"
        :address="node.scope.address"
        :display-name="node.scope.displayName"
        :effective-config="node.scope.effectiveConfig"
        :workspace-selection="node.scope.workspaceSelection"
        :stored-workspace="node.scope.storedWorkspace"
        :inherited-config="node.scope.inheritedConfig"
        :override="node.scope.override"
        :is-customized="node.scope.isCustomized"
        :disabled="disabled"
        :read-only="readOnlyMode"
        :workspace-operation="node.scope.workspaceOperation"
        :runtime-catalog-state="node.scope.runtimeCatalogState"
        @update-override="emit('update-team', node.address, $event)"
        @reset="emit('reset-team', node.address)"
        @update:workspace-selection="forwardWorkspaceSelection"
        @retry-runtime-catalog="forwardRetryRuntimeCatalog"
      >
        <div v-if="node.children.length" class="mt-3">
          <TeamMemberConfigTree
            :member-nodes="node.children"
            :disabled="disabled"
            :read-only-mode="readOnlyMode"
            :nested="true"
            @update-team="forwardTeamUpdate"
            @reset-team="forwardTeamReset"
            @update-agent="forwardAgentUpdate"
            @update:workspace-selection="forwardWorkspaceSelection"
            @retry-runtime-catalog="forwardRetryRuntimeCatalog"
          />
        </div>
      </TeamScopeConfigEditor>

      <MemberOverrideItem
        v-else
        :mode="node.mode"
        :member-name="node.displayName"
        :member-address="node.address"
        :member-breadcrumb="breadcrumb(node.address)"
        :override="node.mode === 'editable' ? node.override : undefined"
        :effective-config="node.mode === 'stored' ? node.effectiveConfig : undefined"
        :stored-workspace="node.mode === 'stored' ? node.storedWorkspace : undefined"
        :global-runtime-kind="node.mode === 'editable' ? node.baselineConfig.runtimeKind : node.effectiveConfig.runtimeKind"
        :global-llm-model="node.mode === 'editable' ? node.baselineConfig.llmModelIdentifier : node.effectiveConfig.llmModelIdentifier"
        :global-llm-config="node.mode === 'editable' ? node.baselineConfig.llmConfig : node.effectiveConfig.llmConfig"
        :stored-customized="node.mode === 'stored' ? node.isCustomized : undefined"
        :is-coordinator="node.isCoordinator"
        :disabled="disabled"
        :advanced-initially-expanded="readOnlyMode"
        :runtime-catalog-state="node.runtimeCatalogState"
        @update:override="forwardAgentUpdate"
        @retry-runtime-catalog="forwardRetryRuntimeCatalog"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type { AgentConfigOverride, TeamScopeConfigOverride } from '~/types/agent/TeamRunConfig'
import type { TeamRunFormMemberNode } from '~/types/agent/TeamRunFormModel'
import type { WorkspaceSelectionState } from '~/types/workspace/WorkspaceSelectionState'
import MemberOverrideItem from './MemberOverrideItem.vue'
import TeamScopeConfigEditor from './TeamScopeConfigEditor.vue'

const props = withDefaults(defineProps<{
  memberNodes: readonly TeamRunFormMemberNode[]
  disabled: boolean
  readOnlyMode?: boolean
  nested?: boolean
}>(), { readOnlyMode: false, nested: false })
const emit = defineEmits<{
  (e: 'update-team', address: AgentTeamAddress, override: TeamScopeConfigOverride | null): void
  (e: 'reset-team', address: AgentTeamAddress): void
  (e: 'update-agent', address: AgentTeamAddress, override: AgentConfigOverride | null): void
  (e: 'update:workspace-selection', address: AgentTeamAddress, selection: WorkspaceSelectionState): void
  (e: 'retry-runtime-catalog', runtimeKind: string): void
}>()

const treeClass = computed(() => [
  'divide-y divide-slate-300',
  props.nested
    ? 'border-l border-slate-300 pl-3'
    : 'overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm',
])
const breadcrumb = (address: AgentTeamAddress): string => address.split('/').filter(Boolean).join(' / ')
const forwardTeamUpdate = (address: AgentTeamAddress, override: TeamScopeConfigOverride | null) => emit('update-team', address, override)
const forwardTeamReset = (address: AgentTeamAddress) => emit('reset-team', address)
const forwardAgentUpdate = (address: AgentTeamAddress, override: AgentConfigOverride | null) => emit('update-agent', address, override)
const forwardWorkspaceSelection = (address: AgentTeamAddress, selection: WorkspaceSelectionState) =>
  emit('update:workspace-selection', address, selection)
const forwardRetryRuntimeCatalog = (runtimeKind: string) => emit('retry-runtime-catalog', runtimeKind)
</script>

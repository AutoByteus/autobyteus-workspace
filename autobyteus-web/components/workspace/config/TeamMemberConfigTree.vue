<template>
  <div :class="treeClass" data-test="team-member-config-tree">
    <template v-for="node in memberNodes" :key="node.address">
      <TeamScopeConfigEditor
        v-if="node.kind === 'agent_team'"
        :scope="node.scope"
        :disabled="disabled"
        :model-config-field-errors="modelConfigFieldErrorsByAddress[node.address]"
        @update-override="emit('update-team', node.address, $event)"
        @reset="emit('reset-team', node.address)"
        @update:workspace-selection="forwardWorkspaceSelection"
        @retry-runtime-catalog="forwardRetryRuntimeCatalog"
        @update-existing-model-config="forwardExistingModelConfig"
        @schema-state="forwardSchemaState"
      >
        <div v-if="node.children.length" class="mt-3">
          <TeamMemberConfigTree
            :member-nodes="node.children"
            :disabled="disabled"
            :nested="true"
            :model-config-field-errors-by-address="modelConfigFieldErrorsByAddress"
            @update-team="forwardTeamUpdate"
            @reset-team="forwardTeamReset"
            @update-agent="forwardAgentUpdate"
            @update:workspace-selection="forwardWorkspaceSelection"
            @retry-runtime-catalog="forwardRetryRuntimeCatalog"
            @update-existing-model-config="forwardExistingModelConfig"
            @schema-state="forwardSchemaState"
          />
        </div>
      </TeamScopeConfigEditor>

      <MemberOverrideItem
        v-else
        :node="node"
        :member-breadcrumb="breadcrumb(node.address)"
        :disabled="disabled"
        :model-config-field-errors="modelConfigFieldErrorsByAddress[node.address]"
        @update:override="forwardAgentUpdate"
        @retry-runtime-catalog="forwardRetryRuntimeCatalog"
        @update-existing-model-config="forwardExistingModelConfig"
        @schema-state="forwardSchemaState"
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
  nested?: boolean
  modelConfigFieldErrorsByAddress?: Readonly<Record<string, Readonly<Record<string, string>>>>
}>(), { nested: false })
const emit = defineEmits<{
  (e: 'update-team', address: AgentTeamAddress, override: TeamScopeConfigOverride | null): void
  (e: 'reset-team', address: AgentTeamAddress): void
  (e: 'update-agent', address: AgentTeamAddress, override: AgentConfigOverride | null): void
  (e: 'update:workspace-selection', address: AgentTeamAddress, selection: WorkspaceSelectionState): void
  (e: 'retry-runtime-catalog', runtimeKind: string): void
  (e: 'update-existing-model-config', address: string, config: Record<string, unknown> | null): void
  (e: 'schema-state', address: string, state: { status: 'loading' | 'ready' | 'invalid' | 'unavailable'; message: string | null }): void
}>()
const modelConfigFieldErrorsByAddress = computed(() => props.modelConfigFieldErrorsByAddress ?? {})

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
const forwardExistingModelConfig = (address: string, config: Record<string, unknown> | null) =>
  emit('update-existing-model-config', address, config)
const forwardSchemaState = (address: string, state: { status: 'loading' | 'ready' | 'invalid' | 'unavailable'; message: string | null }) =>
  emit('schema-state', address, state)
</script>

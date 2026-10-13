<template>
  <main class="min-h-screen bg-slate-100 p-6 text-slate-900">
    <h1 class="mb-2 text-lg font-semibold">Sidebar Stop — red-default implementation preview</h1>
    <p class="mb-4 text-sm">Actual components/CSS; fixture rows and held actions only. No live workers.</p>
    <section data-preview="surface" class="w-[360px] rounded-md bg-white p-2">
      <WorkspaceHistoryWorkspaceSection :workspace-node="workspace" :workspace-teams="[team]" :workspace-team-history-groups="[]" :state="state" :actions="actions" :avatars="avatars" />
      <div class="mt-3 border-t pt-2" data-preview="copies">
        <WorkspaceTransientExecutionRow v-for="row in copies" :key="row.rowKey" :row="row" :stop-root="copyRoot" :has-children="true" :expanded="true"
          :is-selected="selectedCopy === row.rowKey" @select="selectedCopy = row.rowKey; selections++" @toggle="toggles++" />
      </div>
    </section>
    <p class="mt-3 text-xs" data-preview="counts">{{ selections }} selections / {{ toggles }} toggles</p>
    <output data-preview="root-actions" class="block text-xs">{{ JSON.stringify(rootActions) }}</output>
    <button data-preview="reset" class="mt-3 rounded border px-2 py-1 text-xs" @click="reset">Release fixture root pending</button>
  </main>
</template>
<script setup lang="ts">
import { reactive, ref } from 'vue'
import WorkspaceHistoryWorkspaceSection from '~/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue'
import WorkspaceTransientExecutionRow from '~/components/workspace/history/WorkspaceTransientExecutionRow.vue'
import { buildClosureContext } from '~/services/agentCollaboration/__tests__/agentRootClosureFixture'
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'
import { AgentStatus } from '~/types/agent/AgentStatus'
import type { WorkspaceHistorySectionActions, WorkspaceHistorySectionState, WorkspaceHistoryAvatarBindings } from '~/components/workspace/history/workspaceHistorySectionContracts'
import type { WorkspaceHistoryWorkspaceNode, TeamTreeNode, RunHistoryTransientExecutionRow } from '~/stores/runHistoryTypes'
definePageMeta({ layout: false })
const selectedCopy = ref(''), selections = ref(0), toggles = ref(0)
const pending = reactive<Record<string, boolean>>({})
const rootActions = ref<Array<{ kind: string; id: string }>>([])
const hold = (kind: string, id: string) => { rootActions.value.push({kind, id}); pending[id] = true }
const reset = () => { for (const id of Object.keys(pending)) pending[id] = false }
const select = () => { selections.value++ }, toggle = () => { toggles.value++ }
const tree = taskBearingView().execution_tree
const org = { stableKey: 'org:org-root', rootSubjectKind: 'agent_org' as const, rootRunId: 'org-root', isActive: true,
  summary: 'Org root', createdAt: tree.createdAt, archivedAt: null, closedTaskExecutions: [], executionTree: tree }
const agent = { runId: 'agent-root', summary: 'Project Manager root', currentStatus: AgentStatus.Running,
  lastActivityAt: tree.createdAt, isActive: true, hasCollaboration: false, source: 'history', isDraft: false }
const workspace = { workspaceId: 'preview', stableKey: 'preview', workspaceRootPath: '/preview', workspaceName: 'Fixture workspace',
  workspaceKind: 'filesystem', canRemoveFromWorkspaces: false,
  agents: [{ agentDefinitionId: 'manager', agentName: 'Project Manager', runs: [agent] }],
  agentOrgDefinitions: [{ stableKey: 'org-definition', definitionId: 'org-definition', name: 'Delivery Org', runs: [org] }],
} as WorkspaceHistoryWorkspaceNode
const team = { teamRunId: 'team-root', teamDefinitionId: 'team-definition', teamDefinitionName: 'Review Team',
  summary: 'Team root', workspaceRootPath: '/preview', lastActivityAt: tree.createdAt, isActive: true, deleteLifecycle: 'READY',
  focusedAgentRunId: '', rootTeam: { kind: 'agent_team', teamRunId: 'team-root', teamRunIdForNode: 'team-root', memberAddress: '/', displayName: 'Review Team', children: [] },
  members: [], executionRows: [],
} as unknown as TeamTreeNode
const state = reactive({
  selectedRunId: null, isTeamRunSelected: () => false,
  isWorkspaceExpanded: () => true, isAgentExpanded: () => true, isTeamDefinitionExpanded: () => true,
  isTeamExpanded: () => false, isTeamMemberExpanded: () => false,
  toggleWorkspace: toggle, toggleAgent: toggle, toggleTeamDefinition: toggle, toggleTeamMember: toggle,
  isRunTerminating: (id: string) => !!pending[id], isTeamTerminating: (id: string) => !!pending[id],
  isRunDeleting: () => false, isTeamDeleting: () => false, isRunArchiving: () => false, isTeamArchiving: () => false,
  isWorkspaceRemoving: () => false, isWorkspaceHistoryLoading: () => false, workspaceHistoryError: () => null, formatRelativeTime: () => 'now',
  isAgentOrgDefinitionExpanded: () => true, isAgentOrgRunExpanded: () => false, isAgentOrgRunSelected: () => false,
  isAgentOrgMemberSelected: () => false, isAgentOrgTerminating: (id: string) => !!pending[id], agentOrgTerminationError: () => null,
  toggleAgentOrgDefinition: toggle, toggleAgentOrgRun: toggle, agentOrgContextFor: () => null,
}) as WorkspaceHistorySectionState
const actions = { onSelectRun: select, onSelectTeam: select, onOpenAgentOrgRun: select,
  onTerminateRun: (id: string) => hold('Agent', id), onTerminateTeam: (id: string) => hold('Team', id),
  onTerminateAgentOrg: (run: typeof org) => hold('Org', run.rootRunId),
} as WorkspaceHistorySectionActions
const avatars = { showAgentAvatar: () => false, getAgentInitials: () => 'PM', showTeamAvatar: () => false,
  getTeamAvatarUrl: () => '', showOrgAvatar: () => false, getOrgAvatarUrl: () => '', onOrgAvatarError: () => {},
} as WorkspaceHistoryAvatarBindings
const copyRoot = { rootKind: 'AGENT' as const, rootRunId: 'host-run' }
const context = buildClosureContext()
for (const id of ['writer-run', 'rp-run', 'rb-run']) context.getAgentContext(id)!.state.currentStatus = AgentStatus.Running
useAgentRunCollaborationStore().contexts = { 'host-run': context }
const copies: RunHistoryTransientExecutionRow[] = [
  { kind: 'transient_execution', transientKind: 'task_agent', rowKey: 'writer', teamRunId: 'host-run', memberAddress: '/computer_use_agent', agentRunId: 'writer-run', teamRunIdForNode: null, memberKind: 'agent', displayName: 'Writer copy', currentStatus: AgentStatus.Running, delegatedBy: 'pm', depth: 0, hasChildren: true },
  { kind: 'transient_execution', transientKind: 'task_team', rowKey: 'reviewers', teamRunId: 'host-run', memberAddress: '/product_team', agentRunId: null, teamRunIdForNode: 'review-team', memberKind: 'agent_team', displayName: 'Review Team copy', currentStatus: AgentStatus.Running, delegatedBy: 'pm', depth: 0, hasChildren: true },
]
</script>

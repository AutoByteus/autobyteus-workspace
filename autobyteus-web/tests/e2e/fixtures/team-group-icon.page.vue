<template>
  <main data-preview="team-icons" class="min-h-screen bg-slate-100 p-4 text-slate-900">
    <h1 class="mb-4 text-xl font-semibold">Team identity — renderer regression</h1>
    <p class="mb-4 text-sm">Production components / controlled inputs. selections={{ selections }} inspections={{ inspections }}</p>
    <div class="flex flex-wrap items-start gap-4">
      <section class="w-[320px] rounded-lg bg-white p-2" data-preview="transient">
        <h2 class="mb-2 font-semibold">Shared row: delegated / collaborator / leaf</h2>
        <WorkspaceTransientExecutionRow v-for="row in rows" :key="row.rowKey" :row="row" :has-children="row.hasChildren" :expanded="expanded[row.rowKey]" :is-selected="selected === row.rowKey" @toggle="expanded[row.rowKey] = !expanded[row.rowKey]" @select="selected = row.rowKey; selections++" />
      </section>
      <section class="w-[320px] rounded-lg bg-white p-2" data-preview="agent-parent">
        <h2 class="mb-2 font-semibold">Agent parent: collaborator and delegated copy</h2>
        <AgentRunTaskRows run-id="host-run" label="Research assistant" :run-selected="true" :has-collaboration="true" @select-run="agentSelections++" />
        <output data-preview="agent-selection">{{ collaboration.selectedChild('host-run') }} / {{ agentSelections }}</output>
      </section>
      <section class="w-[320px] rounded-lg bg-white p-2" data-preview="team-parent">
        <h2 class="mb-2 font-semibold">Team parent: stable / collaborator / delegated</h2>
        <WorkspaceTeamExecutionTree :team="team" tree-label="Review Team" :avatars="teamAvatars" :is-team-selected="true" :is-row-expanded="key => teamExpanded[key] !== false" :format-relative-time="() => 'now'" @toggle="row => teamExpanded[row.rowKey] = teamExpanded[row.rowKey] === false" @select="row => teamSelected = row.rowKey" />
        <output data-preview="team-selection">{{ teamSelected }}</output>
      </section>
      <section class="w-[320px] rounded-lg bg-white p-2" data-preview="org">
        <h2 class="mb-2 font-semibold">Org configured / delegated / collaborator</h2>
        <WorkspaceAgentOrgHistoryCollection workspace-id="preview" :groups="groups" :state="state" :actions="actions" :avatars="avatars" />
      </section>
      <section class="w-[320px] rounded-lg bg-white p-2" data-preview="workers">
        <h2 class="mb-2 font-semibold">Project / Temp Task workers</h2>
        <div data-preview="worker-row"><ProjectTaskWorkers :root="worker" /></div>
        <div data-preview="worker-detail"><ProjectTaskWorkers :root="worker" density="detail" /></div>
        <div data-preview="worker-closed"><ProjectTaskWorkers :root="{ ...worker, closed: true }" /></div>
        <div data-preview="worker-failed"><ProjectTaskWorkers :root="{ ...worker, start: 'failed', startError: { code: 'PREVIEW', message: 'No model configured.' } }" density="detail" /></div>
        <ProjectTaskWorkers :root="{ ...worker, kind: 'agent', recipientAddress: '/release_writer' }" />
      </section>
    </div>
    <div data-preview="memory" class="mt-4 max-w-5xl">
      <CollaborationMemoryDetail title="Team memory" :rows="memoryRows" :loading="false" :error="null" :page="1" :total-pages="1" search="" :read-only="false" @inspect-member="inspections++" />
    </div>
  </main>
</template>
<script setup lang="ts">
import { reactive, ref } from 'vue';
import AgentRunTaskRows from '~/components/workspace/history/AgentRunTaskRows.vue';
import WorkspaceTeamExecutionTree from '~/components/workspace/history/WorkspaceTeamExecutionTree.vue';
import { buildClosureContext } from '~/services/agentCollaboration/__tests__/agentRootClosureFixture';
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore';
import WorkspaceTransientExecutionRow from '~/components/workspace/history/WorkspaceTransientExecutionRow.vue';
import WorkspaceAgentOrgHistoryCollection from '~/components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue';
import ProjectTaskWorkers from '~/components/projects/ProjectTaskWorkers.vue';
import CollaborationMemoryDetail from '~/components/memory/CollaborationMemoryDetail.vue';
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture';
import { useWorkspaceHistoryTreeState } from '~/composables/useWorkspaceHistoryTreeState';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import type { RunHistoryTransientExecutionRow } from '~/stores/runHistoryTypes';
import type { TaskRootView } from '~/types/project';
import type { CollaborationMemoryGroup, CollaborationRunMemoryRow } from '~/types/memory';
import { AgentStatus } from '~/types/agent/AgentStatus';
definePageMeta({ layout: false });
const selections = ref(0), inspections = ref(0), selected = ref('');
const rows: RunHistoryTransientExecutionRow[] = ['Delegated Team', 'Collaborator Team', 'Leaf Team', 'Release Writer'].map((name, index) => ({
  kind: 'transient_execution', transientKind: index === 3 ? 'task_agent' : 'task_team',
  rowKey: `preview-${index}`, teamRunId: 'preview-host', memberAddress: `/preview_${index}`, agentRunId: index === 3 ? 'preview-agent' : null,
  teamRunIdForNode: index === 3 ? null : `preview-team-${index}`, memberKind: index === 3 ? 'agent' : 'agent_team',
  displayName: name, currentStatus: index === 3 ? AgentStatus.Idle : null, delegatedBy: index === 1 ? null : 'manager',
  opensOnAppear: index === 1, depth: 0, hasChildren: index < 2,
}));
const expanded = reactive(Object.fromEntries(rows.map(row => [row.rowKey, true])));
// Publish a supported inspected Agent-root view at the store boundary, without transport/model work.
const collaboration = useAgentRunCollaborationStore();
collaboration.contexts = { 'host-run': buildClosureContext() };
collaboration.toggleTaskTeam('host-run', 'team-run');
collaboration.toggleTaskTeam('host-run', 'review-team');
const agentSelections = ref(0), teamSelected = ref('');
const teamExpanded = reactive<Record<string, boolean>>({});
// Team source projection is separately covered by runHistoryTeamExecutionRows + agentSourceSelectors.
// These supported public row props exercise the production parent tree, not another renderer copy.
const stable = { kind: 'agent_team', teamRunId: 'preview-host', teamRunIdForNode: 'stable-team', memberAddress: '/configured', displayName: 'Configured Team', agentRunId: null, children: [] };
const team = { teamRunId: 'preview-host', lastActivityAt: '2026-10-08T00:00:00Z', focusedAgentRunId: null,
  executionRows: [
    { kind: 'stable_member', rowKey: 'team:stable', teamRunId: 'preview-host', teamRunIdForNode: 'stable-team', memberAddress: '/configured', agentRunId: null, memberKind: 'agent_team', displayName: 'Configured Team', depth: 0, hasChildren: false, row: stable },
    ...rows.slice(0, 2).flatMap((row, index) => [row, { ...rows[3], rowKey: `child-${index}`, memberAddress: `/preview_${index}/lead`, agentRunId: `lead-${index}`, transientKind: 'task_team_child', depth: 1 }]),
  ],
} as any;
const teamAvatars = { showTeamMemberAvatar: () => false, getTeamMemberInitials: () => 'LD' } as any;
const history = useRunHistoryStore();
history.workspaceGroups = [{ agentDefinitions: [{ runs: [{ runId: 'preview-host' }] }], teamDefinitions: [] }] as any;
const tree = taskBearingView().execution_tree;
tree.rootOrg.collaborators = [{
  kind: 'agent_team', address: '/product_team', teamDefinitionId: 'product-team', teamRunId: 'product-run',
  coordinatorAddress: '/product_team/lead', members: [{ address: '/product_team/lead', agentDefinitionId: 'lead', agentRunId: 'product-lead', platformAgentRunId: null }],
  handoffs: [], defaultLaunchConfiguration: tree.rootOrg.defaultLaunchConfiguration, taskExecutions: [], addedAt: tree.createdAt, addedViaAgentRunId: 'agent-director',
}];
const groups = [{ stableKey: 'agent_org_definition:org-definition', definitionId: 'org-definition', name: 'Preview Org', runs: [{
  stableKey: 'agent_org_run:org-run', rootSubjectKind: 'agent_org', rootRunId: 'org-run', createdAt: tree.createdAt,
  archivedAt: null, isActive: false, summary: 'Team identity preview', executionTree: tree, closedTaskExecutions: [],
}] }] as any;
const treeState = useWorkspaceHistoryTreeState({ runHistoryStore: history, selectionStore: useAgentSelectionStore() });
treeState.toggleAgentOrgDefinition('preview', 'org-definition'); treeState.toggleAgentOrgRun('org-run'); treeState.toggleAgentOrgTeam('org-run', '/team');
const state = { ...treeState, agentOrgContextFor: () => null, isAgentOrgTerminating: () => false, isAgentOrgDeleting: () => false, isAgentOrgArchiving: () => false, agentOrgTerminationError: () => null } as any;
const actions = { onInspectAgentOrgExecution: () => inspections.value++, onSelectAgentOrgMember: () => selections.value++ } as any;
const avatars = { showOrgAvatar: () => false, getOrgAvatarUrl: () => '', onOrgAvatarError: () => {} };
const worker: TaskRootView = { kind: 'team', recipientAddress: '/software_engineering_team', ingressAgentRunId: 'preview-worker', teamRunId: 'preview-team', hostRoot: { kind: 'agent', runId: 'preview-host' }, start: 'started', startError: null, closed: false, status: 'idle' };
const memory = { latestMemoryAt: null, hasWorkingContext: true, hasEpisodic: false, hasSemantic: false, hasRawTraces: false, hasRawArchive: false };
const configured: CollaborationMemoryGroup = { teamRunId: 'configured', address: '/review_team', displayName: 'Review Team', kind: 'CONFIGURED_TEAM', startedAt: null };
const task: CollaborationMemoryGroup = { ...configured, teamRunId: 'task', kind: 'TASK_TEAM' };
const nested: CollaborationMemoryGroup = { ...task, teamRunId: 'nested', address: '/review_team/helpers', displayName: 'Helpers' };
const memoryRows: CollaborationRunMemoryRow[] = [{ runId: 'preview-memory', summary: 'Configured and delegated Teams', workspaceRootPath: '/test-owned/preview', lastUpdatedAt: null, memory,
  memberTargets: [[configured], [task], [task, nested]].map((groupPath, index) => ({ memberAddress: `${groupPath.at(-1)!.address}/lead`, displayName: 'Lead', agentRunId: `preview-lead-${index}`, executionKind: index ? 'TASK_TEAM_MEMBER' : 'CONFIGURED', startedAt: null, groupPath, memory })),
}];
</script>

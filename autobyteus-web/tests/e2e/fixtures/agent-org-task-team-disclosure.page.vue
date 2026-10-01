<template>
  <main data-test="ttrc-disclosure-probe-root" class="min-h-screen bg-slate-100 p-4 text-slate-900">
    <h1 class="mb-4 text-xl font-semibold">Agent Org delegated Team disclosure probe</h1>
    <aside data-test="sidebar" class="w-[360px] border-r bg-white p-2">
      <WorkspaceAgentOrgHistoryCollection workspace-id="ttrc-ws" :groups="groups" :state="sectionState" :actions="actions" :avatars="avatars" />
    </aside>
  </main>
</template>

<script setup lang="ts">
// Production Org history rows (projector, collection, tree-state composable) over an in-page Org
// execution tree mirroring the reported "Nested Classroom Test Org": a Team that is both mounted and
// delegated, a second delegation of the same Team, a nested delegated Team and a direct delegated Agent.
import { reactive, toRaw, onMounted, onBeforeUnmount } from 'vue';
import WorkspaceAgentOrgHistoryCollection from '~/components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue';
import type { WorkspaceHistorySectionState } from '~/components/workspace/history/workspaceHistorySectionContracts';
import { useWorkspaceHistoryTreeState } from '~/composables/useWorkspaceHistoryTreeState';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import type { AgentOrgHistoryDefinitionGroup, AgentOrgRunHistoryItem } from '~/stores/runHistoryTypes';

definePageMeta({ layout: false });

const ROOT = 'ttrc-org-run';
const launch = {
  runtimeKind: 'codex_app_server', llmModelIdentifier: 'probe-model', llmConfig: null,
  autoExecuteTools: false, workspaceRootPath: null,
};
const agent = (address: string, agentRunId: string) => ({
  address, agentDefinitionId: `definition-${agentRunId}`, role: null, description: null,
  agentRunId, platformAgentRunId: null, launchConfiguration: launch,
});
const mountedTeam = (address: string, teamRunId: string, coordinator: string, members: ReturnType<typeof agent>[]) => ({
  address, teamDefinitionId: `definition-${teamRunId}`, role: null, description: null, teamRunId,
  coordinatorAddress: coordinator, defaultLaunchConfiguration: launch, members, taskExecutions: [],
});
const taskMember = (address: string, agentRunId: string) => ({ address, agentRunId, platformAgentRunId: null });
const executionTree = {
  subjectKind: 'agent_org', createdAt: '2026-09-29T08:00:00.000Z', archivedAt: null, applicationBinding: null, handoffs: [],
  rootOrg: {
    address: '/', orgDefinitionId: 'ttrc-org-definition', orgDefinitionName: 'Nested Classroom Test Org', orgRunId: ROOT,
    defaultLaunchConfiguration: launch,
    members: [
      agent('/Teacher', 'teacher-run'),
      mountedTeam('/StudentStudyGroup', 'ssg-configured', '/StudentStudyGroup/student_one', [
        agent('/StudentStudyGroup/student_one', 'ssg-configured-s1'),
        agent('/StudentStudyGroup/student_two', 'ssg-configured-s2'),
      ]),
      mountedTeam('/Reviewers', 'reviewers-configured', '/Reviewers/chair', [agent('/Reviewers/chair', 'reviewers-configured-chair')]),
    ],
    taskExecutions: [
      {
        address: '/StudentStudyGroup', teamRunId: 'ssg-task-1', delegatorAgentRunId: 'teacher-run', startedAt: '2026-09-29T08:01:00.000Z',
        members: [taskMember('/StudentStudyGroup/student_one', 'ssg1-s1'), taskMember('/StudentStudyGroup/student_two', 'ssg1-s2')],
        taskExecutions: [{
          address: '/Reviewers', teamRunId: 'reviewers-task-nested', delegatorAgentRunId: 'ssg1-s1', startedAt: '2026-09-29T08:02:00.000Z',
          members: [taskMember('/Reviewers/chair', 'reviewers-nested-chair')], taskExecutions: [],
        }],
      },
      {
        address: '/StudentStudyGroup', teamRunId: 'ssg-task-2', delegatorAgentRunId: 'teacher-run', startedAt: '2026-09-29T08:03:00.000Z',
        members: [taskMember('/StudentStudyGroup/student_one', 'ssg2-s1'), taskMember('/StudentStudyGroup/student_two', 'ssg2-s2')],
        taskExecutions: [],
      },
      { address: '/Teacher', agentRunId: 'teacher-task', platformAgentRunId: null, delegatorAgentRunId: 'teacher-run', startedAt: '2026-09-29T08:04:00.000Z' },
    ],
  },
} as unknown as AgentOrgRunHistoryItem['executionTree'];

const groups = reactive<AgentOrgHistoryDefinitionGroup[]>([{
  stableKey: 'agent_org_definition:ttrc-org-definition', definitionId: 'ttrc-org-definition', name: 'Nested Classroom Test Org',
  runs: [{ stableKey: `agent_org_run:${ROOT}`, rootSubjectKind: 'agent_org', rootRunId: ROOT, createdAt: '2026-09-29T08:00:00.000Z',
    archivedAt: null, isActive: false, summary: 'Classroom run', executionTree }],
}]);

const tree = useWorkspaceHistoryTreeState({ runHistoryStore: useRunHistoryStore(), selectionStore: useAgentSelectionStore() });
tree.toggleAgentOrgDefinition('ttrc-ws', 'ttrc-org-definition');
tree.toggleAgentOrgRun(ROOT);
tree.toggleAgentOrgTeam(ROOT, '/StudentStudyGroup');

const calls = reactive<{ inspect: Array<{ agentRunId: string; address: string }>; select: string[]; open: number }>({ inspect: [], select: [], open: 0 });
const noop = () => {};
const sectionState = {
  ...tree,
  isAgentOrgTerminating: () => false, isAgentOrgDeleting: () => false, isAgentOrgArchiving: () => false,
  agentOrgTerminationError: () => null, agentOrgContextFor: () => null,
} as unknown as WorkspaceHistorySectionState;
const actions = {
  onOpenAgentOrgRun: () => { calls.open += 1; },
  onSelectAgentOrgMember: (_run: unknown, address: string) => { calls.select.push(address); },
  onInspectAgentOrgExecution: (_run: unknown, agentRunId: string, address: string) => { calls.inspect.push({ agentRunId, address }); },
  onTerminateAgentOrg: noop, onArchiveAgentOrg: noop, onDeleteAgentOrg: noop,
} as never;
const avatars = { showOrgAvatar: () => false, getOrgAvatarUrl: () => '', onOrgAvatarError: noop };

const teamRunIds = ['ssg-task-1', 'reviewers-task-nested', 'ssg-task-2'];
const probe = {
  /** Emulates a live snapshot: the run becomes active and a new member joins the first delegation. */
  addLateMember: () => {
    const run = toRaw(groups[0]!.runs[0]!);
    const next = structuredClone(toRaw(run.executionTree)) as any;
    next.rootOrg.taskExecutions[0].members.push(taskMember('/StudentStudyGroup/student_two', 'ssg1-late'));
    groups[0]!.runs[0] = { ...run, isActive: true, executionTree: next };
  },
  state: () => ({
    taskTeams: Object.fromEntries(teamRunIds.map((id) => [id, tree.isAgentOrgTaskTeamExpanded(ROOT, id)])),
    mountedTeams: { '/StudentStudyGroup': tree.isAgentOrgTeamExpanded(ROOT, '/StudentStudyGroup'), '/Reviewers': tree.isAgentOrgTeamExpanded(ROOT, '/Reviewers') },
    calls: JSON.parse(JSON.stringify(calls)),
  }),
  resetCalls: () => { calls.inspect.splice(0); calls.select.splice(0); calls.open = 0; },
};
onMounted(() => { (window as any).__taskTeamDisclosureProbe = probe; });
onBeforeUnmount(() => { delete (window as any).__taskTeamDisclosureProbe; });
</script>

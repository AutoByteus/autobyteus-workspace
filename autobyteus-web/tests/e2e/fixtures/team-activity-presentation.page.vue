<template>
  <main data-test="team-activity-probe" class="min-h-screen bg-slate-100 p-6 text-slate-900">
    <header class="mx-auto mb-6 max-w-5xl rounded-lg bg-white p-4 shadow-sm">
      <h1 class="text-xl font-semibold">Binary team activity presentation probe</h1>
      <p data-test="resolved-locale" class="mt-1 text-sm text-slate-600">{{ resolvedLocale }}</p>
      <p data-test="independent-facts" class="mt-1 text-sm text-slate-600">
        member={{ memberStatus }} subscribed={{ subscribed }} stopPending={{ stopPending }} failures={{ stopFailureCount }}
      </p>
      <div class="mt-3 flex flex-wrap gap-2">
        <button data-test="set-locale-en" type="button" @click="setPreference('en')">English</button>
        <button data-test="set-locale-zh" type="button" @click="setPreference('zh-CN')">简体中文</button>
        <button data-test="vary-independent-facts" type="button" @click="varyIndependentFacts">Vary unrelated facts</button>
        <button data-test="begin-stop" type="button" @click="stopPending = true">Begin Stop</button>
        <button data-test="fail-stop" type="button" @click="failStop">Fail Stop</button>
        <button data-test="settle-active-run" type="button" @click="activeRunIsActive = false">Settle active run</button>
        <button data-test="restore-active-run" type="button" @click="activeRunIsActive = true">Restore active run</button>
      </div>
    </header>

    <div class="mx-auto grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-2">
      <section data-test="history-surface" class="rounded-lg bg-white p-4 shadow-sm">
        <h2 class="mb-3 font-semibold">Workspace history surface</h2>
        <WorkspaceHistoryWorkspaceSection
          :workspace-node="workspaceNode"
          :workspace-teams="historyRuns"
          :workspace-team-history-groups="historyGroups"
          :state="historyState"
          :avatars="avatars"
          :actions="actions"
        />
      </section>

      <section data-test="running-surface" class="rounded-lg bg-white p-4 shadow-sm">
        <h2 class="mb-3 font-semibold">Running teams surface</h2>
        <RunningTeamGroup
          definition-name="Browser Review Team"
          definition-id="team-def-browser"
          :runs="runningRuns"
          :selected-run-id="null"
        />
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import WorkspaceHistoryWorkspaceSection from '~/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue';
import RunningTeamGroup from '~/components/workspace/running/RunningTeamGroup.vue';
import { useLocalization } from '~/composables/useLocalization';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentTeamContext, AgentTeamMemberNode } from '~/types/agent/AgentTeamContext';
import type {
  TeamMemberTreeRow,
  TeamRunHistoryDefinitionGroup,
  TeamTreeNode,
} from '~/stores/runHistoryTypes';
import type { RunTreeWorkspaceNode } from '~/utils/runTreeProjection';
import type {
  WorkspaceHistoryAvatarBindings,
  WorkspaceHistorySectionActions,
  WorkspaceHistorySectionState,
} from '~/components/workspace/history/workspaceHistorySectionContracts';

const { resolvedLocale, setPreference } = useLocalization();
const activeRunIsActive = ref(true);
const memberStatus = ref<AgentStatus>(AgentStatus.Error);
const subscribed = ref(false);
const stopPending = ref(false);
const stopFailureCount = ref(0);
const representativeFlip = ref(false);
const historyDefinitionExpanded = ref(true);

const historyMember = (teamRunId: string): TeamMemberTreeRow => ({
  teamRunId,
  memberKind: 'agent',
  memberRouteKey: 'critic',
  memberPath: ['critic'],
  memberName: 'critic',
  displayName: 'Critic',
  memberRunId: `${teamRunId}-critic`,
  workspaceRootPath: '/browser-fixture',
  summary: 'Member activity is deliberately unrelated',
  lastActivityAt: '2026-08-03T09:00:00.000Z',
  currentStatus: memberStatus.value,
  isActive: memberStatus.value === AgentStatus.Running,
  deleteLifecycle: 'READY',
  children: [],
});

const historyRun = (
  teamRunId: string,
  summary: string,
  isActive: boolean,
  lastActivityAt: string,
): TeamTreeNode => {
  const member = historyMember(teamRunId);
  return {
    teamRunId,
    teamDefinitionId: 'team-def-browser',
    teamDefinitionName: 'Browser Review Team',
    workspaceRootPath: '/browser-fixture',
    summary,
    lastActivityAt,
    isActive,
    deleteLifecycle: 'READY',
    focusedMemberRouteKey: 'critic',
    members: [member],
    memberTree: [member],
    executionRows: [{
      kind: 'stable_member',
      teamRunId,
      memberKind: member.memberKind,
      memberRouteKey: member.memberRouteKey,
      memberPath: [...member.memberPath],
      displayName: member.displayName,
      depth: 0,
      hasChildren: false,
      row: member,
    }],
  };
};

const historyRuns = computed<TeamTreeNode[]>(() => [
  historyRun(
    'team-run-active-browser',
    'Active sibling',
    activeRunIsActive.value,
    representativeFlip.value ? '2026-08-03T12:00:00.000Z' : '2026-08-03T08:00:00.000Z',
  ),
  historyRun(
    'team-run-inactive-browser',
    'Inactive sibling',
    false,
    representativeFlip.value ? '2026-08-03T08:00:00.000Z' : '2026-08-03T12:00:00.000Z',
  ),
]);

const historyGroups = computed<TeamRunHistoryDefinitionGroup[]>(() => [{
  teamDefinitionId: 'team-def-browser',
  teamDefinitionName: 'Browser Review Team',
  runs: historyRuns.value.map((run) => ({
    teamRunId: run.teamRunId,
    teamDefinitionId: run.teamDefinitionId,
    teamDefinitionName: run.teamDefinitionName,
    coordinatorMemberRouteKey: 'critic',
    workspaceRootPath: run.workspaceRootPath,
    summary: run.summary,
    createdAt: run.lastActivityAt,
    isActive: run.isActive,
    members: [],
  })),
}]);

const runningMember = (): AgentTeamMemberNode => ({
  memberKind: 'agent',
  memberName: 'critic',
  displayName: 'Critic',
  memberPath: ['critic'],
  memberRouteKey: 'critic',
  memberRunId: 'critic-run-browser',
  agentDefinitionId: 'critic-definition',
  currentStatus: memberStatus.value,
});

const runningRun = (teamRunId: string, isActive: boolean): AgentTeamContext => {
  const member = runningMember();
  return {
    teamRunId,
    config: {
      teamDefinitionId: 'team-def-browser',
      teamDefinitionName: 'Browser Review Team',
      runtimeKind: 'autobyteus',
      workspaceId: null,
      workspaceMetadata: null,
      llmModelIdentifier: 'browser-fixture',
      llmConfig: null,
      autoExecuteTools: false,
      skillAccessMode: 'PRELOADED_ONLY',
      memberOverrides: {},
      isLocked: true,
    },
    memberTree: [member],
    memberNodesByRouteKey: new Map([[member.memberRouteKey, member]]),
    leafAgentContextsByRouteKey: new Map(),
    coordinatorMemberRouteKey: 'critic',
    historicalHydration: null,
    focusedMemberRouteKey: 'critic',
    isActive,
    isSubscribed: subscribed.value,
  };
};

const runningRuns = computed<AgentTeamContext[]>(() => [
  runningRun('team-run-active-browser', activeRunIsActive.value),
  runningRun('team-run-inactive-browser', false),
]);

const workspaceNode: RunTreeWorkspaceNode = {
  workspaceId: 'workspace:browser-fixture',
  workspaceRootPath: '/browser-fixture',
  workspaceName: 'Browser Fixture Workspace',
  workspaceKind: 'filesystem',
  canRemoveFromWorkspaces: false,
  agents: [],
};

const historyState: WorkspaceHistorySectionState = {
  selectedRunId: null,
  isTeamRunSelected: () => false,
  isRunTerminating: () => false,
  isTeamTerminating: () => stopPending.value,
  isRunDeleting: () => false,
  isTeamDeleting: () => false,
  isRunArchiving: () => false,
  isTeamArchiving: () => false,
  isWorkspaceRemoving: () => false,
  isWorkspaceHistoryLoading: () => false,
  workspaceHistoryError: () => null,
  formatRelativeTime: () => 'now',
  isWorkspaceExpanded: () => true,
  toggleWorkspace: () => {},
  isAgentExpanded: () => false,
  toggleAgent: () => {},
  isTeamDefinitionExpanded: () => historyDefinitionExpanded.value,
  toggleTeamDefinition: () => {
    historyDefinitionExpanded.value = !historyDefinitionExpanded.value;
  },
  isTeamExpanded: () => false,
  isTeamMemberExpanded: () => false,
  toggleTeamMember: () => {},
  canTerminateTeam: (isActive) => isActive && !stopPending.value,
};

const avatars: WorkspaceHistoryAvatarBindings = {
  showAgentAvatar: () => false,
  onAgentAvatarError: () => {},
  getAgentInitials: () => 'A',
  showTeamAvatar: () => false,
  getTeamAvatarUrl: () => '',
  onTeamAvatarError: () => {},
  getTeamInitials: () => 'BR',
  showTeamMemberAvatar: () => false,
  getTeamMemberAvatarUrl: () => '',
  onTeamMemberAvatarError: () => {},
  getTeamMemberDisplayName: (member) => member.displayName || member.memberName,
  getTeamMemberInitials: () => 'C',
};

const actions: WorkspaceHistorySectionActions = {
  onRemoveWorkspace: () => {},
  onCreateRun: () => {},
  onSelectRun: () => {},
  onTerminateRun: () => {},
  onArchiveRun: () => {},
  onDeleteRun: () => {},
  onTerminateTeam: () => {},
  onArchiveTeam: () => {},
  onDeleteTeam: () => {},
  onSelectTeam: () => {},
  onSelectTeamMember: () => {},
};

const varyIndependentFacts = () => {
  memberStatus.value = memberStatus.value === AgentStatus.Error
    ? AgentStatus.Running
    : AgentStatus.Error;
  subscribed.value = !subscribed.value;
  representativeFlip.value = !representativeFlip.value;
};

const failStop = () => {
  stopPending.value = false;
  stopFailureCount.value += 1;
};

type TeamActivityProbeControl = {
  beginStop: () => void;
  failStop: () => void;
  restoreActiveRun: () => void;
  setLocale: (locale: 'en' | 'zh-CN') => Promise<void>;
  settleActiveRun: () => void;
  varyIndependentFacts: () => void;
};

onMounted(() => {
  const globalWindow = window as typeof window & { __teamActivityProbe?: TeamActivityProbeControl };
  globalWindow.__teamActivityProbe = {
    beginStop: () => { stopPending.value = true; },
    failStop,
    restoreActiveRun: () => { activeRunIsActive.value = true; },
    setLocale: setPreference,
    settleActiveRun: () => { activeRunIsActive.value = false; },
    varyIndependentFacts,
  };
});

onBeforeUnmount(() => {
  const globalWindow = window as typeof window & { __teamActivityProbe?: TeamActivityProbeControl };
  delete globalWindow.__teamActivityProbe;
});
</script>

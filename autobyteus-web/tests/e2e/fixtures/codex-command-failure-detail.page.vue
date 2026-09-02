<template>
  <main data-test="codex-command-failure-detail-probe" class="min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-8">
    <header class="mx-auto mb-5 max-w-4xl rounded-lg bg-white p-4 shadow-sm">
      <h1 class="text-xl font-semibold">Compact command failure progressive-disclosure probe</h1>
      <p class="mt-1 text-sm text-slate-600">
        Center shows compact failed status and context; Activity preserves the complete diagnostic behind explicit disclosure.
      </p>
      <div class="mt-3 flex flex-wrap gap-2" aria-label="Failure presentation context">
        <button
          v-for="candidate in modes"
          :key="candidate"
          :data-test="`mode-${candidate}`"
          type="button"
          class="rounded border border-slate-300 px-2 py-1 text-xs"
          :aria-pressed="mode === candidate"
          @click="setMode(candidate)"
        >
          {{ candidate }}
        </button>
      </div>
      <dl class="mt-3 grid gap-1 text-xs sm:grid-cols-3">
        <div><dt class="inline font-semibold">Mode:</dt> <dd data-test="current-mode" class="inline">{{ mode }}</dd></div>
        <div><dt class="inline font-semibold">Right tab:</dt> <dd data-test="active-tab" class="inline">{{ activeTab }}</dd></div>
        <div><dt class="inline font-semibold">Highlighted:</dt> <dd data-test="highlighted-id" class="inline">{{ highlightedId || 'none' }}</dd></div>
      </dl>
    </header>

    <section v-if="presentation && activity" class="mx-auto grid max-w-4xl gap-5 lg:grid-cols-2" aria-label="Failed command surfaces">
      <article data-test="center-surface" class="min-w-0 rounded-lg bg-white p-4 shadow-sm">
        <h2 class="mb-3 text-base font-semibold">Center event monitor</h2>
        <p data-test="center-before" class="mb-2 text-xs text-slate-500">Event before failure</p>
        <ToolCallIndicator :key="`center-${mode}`" :presentation="presentation" />
        <p data-test="center-after" class="mt-2 text-xs text-slate-500">Event after failure remains reachable</p>
      </article>

      <article data-test="activity-surface" class="min-w-0 rounded-lg bg-white p-4 shadow-sm">
        <h2 class="mb-3 text-base font-semibold">Activity panel</h2>
        <p data-test="activity-before" class="mb-2 text-xs text-slate-500">Activity before failure</p>
        <ToolActivityItem
          :key="`activity-${mode}`"
          :activity="activity"
          :is-highlighted="highlightedId === invocationId"
        />
        <p data-test="activity-after" class="mt-2 text-xs text-slate-500">Activity after failure remains reachable</p>
      </article>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import ToolCallIndicator from '~/components/conversation/ToolCallIndicator.vue';
import ToolActivityItem from '~/components/progress/ToolActivityItem.vue';
import { useRightSideTabs } from '~/composables/useRightSideTabs';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures';
import { AgentContext } from '~/types/agent/AgentContext';
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { ToolActivity } from '~/types/activity/RunActivity';
import type { Conversation } from '~/types/conversation';
import {
  buildEventMonitorPageToolCardPresentation,
  buildToolCardPresentation,
  type ToolCardPresentation,
  type ToolCardSegment,
} from '~/utils/toolCardPresentation';

const modes = ['standalone-live', 'standalone-replay', 'team-live', 'team-replay'] as const;
type ProbeMode = typeof modes[number];

const STANDALONE_RUN_ID = 'browser-standalone-command-failure';
const TEAM_RUN_ID = 'browser-team-command-failure';
const TEAM_MEMBER_RUN_ID = 'browser-team-member-command-failure';
const TEAM_MEMBER_ADDRESS = '/reviewer';
const invocationId = 'exec-command-failure-browser';
const command = "/bin/bash -lc 'rg evidence | head -1400; printf CODEX_FAILURE_STDERR_MARKER >&2; exit 23'";
const cwd = '/workspace/command-failure';

const buildLargeDiagnostic = (): string => {
  const lines = Array.from({ length: 1915 }, (_, index) => `line-${index}: ${'x'.repeat(170)}`);
  const prefix = lines.join('\n');
  return `${prefix}${'x'.repeat(348_978 - prefix.length)}`;
};

const diagnostic = buildLargeDiagnostic();
if (diagnostic.length !== 348_978 || diagnostic.split('\n').length !== 1915) {
  throw new Error('Large diagnostic fixture shape changed.');
}

const makeContext = (runId: string, definitionId: string): AgentContext => {
  const config: AgentRunConfig = {
    agentDefinitionId: definitionId,
    agentDefinitionName: definitionId,
    llmModelIdentifier: 'browser-probe-model',
    runtimeKind: 'codex_app_server',
    workspaceId: null,
    workspaceMetadata: null,
    autoExecuteTools: false,
    skillAccessMode: 'NONE',
    llmConfig: null,
    isLocked: true,
  };
  const conversation: Conversation = {
    id: runId,
    messages: [],
    createdAt: '2026-09-02T00:00:00.000Z',
    updatedAt: '2026-09-02T00:00:00.000Z',
    agentDefinitionId: definitionId,
  };
  const context = new AgentContext(config, new AgentRunState(runId, conversation));
  context.state.currentStatus = AgentStatus.Idle;
  return context;
};

const standaloneContext = makeContext(STANDALONE_RUN_ID, 'browser-standalone-definition');
const teamMemberContext = makeContext(TEAM_MEMBER_RUN_ID, 'browser-team-member-definition');
const teamContext = buildTestTeamContext({
  teamRunId: TEAM_RUN_ID,
  teamDefinitionId: 'browser-team-definition',
  teamDefinitionName: 'Browser Failure Team',
  coordinatorAddress: TEAM_MEMBER_ADDRESS,
  rootChildren: [testAgentNode(TEAM_MEMBER_ADDRESS, {
    agentRunId: TEAM_MEMBER_RUN_ID,
    agentDefinitionId: 'browser-team-member-definition',
    displayName: 'Reviewer',
    currentStatus: AgentStatus.Idle,
  })],
  contexts: [{ agentRunId: TEAM_MEMBER_RUN_ID, context: teamMemberContext }],
  focusedAgentRunId: TEAM_MEMBER_RUN_ID,
  isActive: false,
});

const activityFor = (): ToolActivity => ({
  kind: 'tool',
  activityId: invocationId,
  invocationId,
  toolName: 'run_bash',
  type: 'terminal_command',
  status: 'error',
  contextText: command,
  arguments: { command, cwd },
  logs: ['normal output before failure'],
  result: null,
  error: diagnostic,
  timestamp: new Date('2026-09-02T12:00:00.000Z'),
});

const segment: ToolCardSegment = {
  type: 'tool_call',
  invocationId,
  toolName: 'run_bash',
  arguments: { command, cwd },
  status: 'error',
  approvalTarget: null,
  logs: [],
  result: null,
  error: diagnostic,
};

const mode = ref<ProbeMode>('standalone-live');
const ready = ref(false);
const selectionStore = useAgentSelectionStore();
const agentContextsStore = useAgentContextsStore();
const teamContextsStore = useAgentTeamContextsStore();
const activityStore = useAgentActivityStore();
const { activeTab, setActiveTab } = useRightSideTabs();
const activeRunId = computed(() => mode.value.startsWith('team-') ? TEAM_MEMBER_RUN_ID : STANDALONE_RUN_ID);
const highlightedId = computed(() => activityStore.getHighlightedActivityId(activeRunId.value));
const activity = computed(() => activityStore.getToolActivities(activeRunId.value)
  .find((candidate) => candidate.invocationId === invocationId) ?? null);
const presentation = computed<ToolCardPresentation>(() => mode.value.endsWith('-replay')
  ? buildEventMonitorPageToolCardPresentation({
      invocationId,
      toolName: 'run_bash',
      statusKey: 'error',
      summaryArgs: { command, cwd },
      approvalTarget: null,
    })
  : buildToolCardPresentation(segment));

const seedActivity = (runId: string, source: 'live' | 'replay') => {
  activityStore.clearActivities(runId);
  if (source === 'live') {
    activityStore.addToolActivity(runId, activityFor());
    return;
  }
  const result = activityStore.replaceProjectionActivitiesIfRevisions([{
    runId,
    expectedRevision: activityStore.getActivityContentRevision(runId),
    activities: [activityFor()],
  }]);
  if (result !== 'applied') throw new Error(`Replay fixture replacement failed: ${result}`);
};

const setMode = (nextMode: ProbeMode) => {
  mode.value = nextMode;
  const team = nextMode.startsWith('team-');
  const runId = team ? TEAM_MEMBER_RUN_ID : STANDALONE_RUN_ID;
  selectionStore.selectRunWithoutShellNavigation(team ? TEAM_RUN_ID : STANDALONE_RUN_ID, team ? 'team' : 'agent');
  seedActivity(runId, nextMode.endsWith('-replay') ? 'replay' : 'live');
  activityStore.setHighlightedActivity(runId, null);
  setActiveTab('terminal');
};

const snapshot = () => ({
  mode: mode.value,
  ready: ready.value,
  activeRunId: activeRunId.value,
  activeTab: activeTab.value,
  highlightedId: highlightedId.value,
  diagnosticLength: diagnostic.length,
  diagnosticLines: diagnostic.split('\n').length,
  activityErrorLength: activity.value?.error?.length ?? 0,
  activityErrorLines: activity.value?.error?.split('\n').length ?? 0,
  activityErrorMatches: activity.value?.error === diagnostic,
  activityStatus: activity.value?.status ?? null,
  activityInvocationId: activity.value?.invocationId ?? null,
});

type FailureDetailProbeControl = {
  ready: boolean;
  modes: readonly ProbeMode[];
  invocationId: string;
  diagnostic: string;
  setMode: (mode: ProbeMode) => void;
  setHighlighted: (highlighted: boolean) => void;
  snapshot: () => ReturnType<typeof snapshot>;
};

onMounted(() => {
  agentContextsStore.runs.set(STANDALONE_RUN_ID, standaloneContext);
  teamContextsStore.addTeamContext(teamContext);
  setMode('standalone-live');
  ready.value = true;
  const globalWindow = window as typeof window & { __commandFailureProbe?: FailureDetailProbeControl };
  globalWindow.__commandFailureProbe = {
    ready: true,
    modes,
    invocationId,
    diagnostic,
    setMode,
    setHighlighted: (highlighted) => activityStore.setHighlightedActivity(
      activeRunId.value,
      highlighted ? invocationId : null,
    ),
    snapshot,
  };
});

onBeforeUnmount(() => {
  activityStore.clearActivities(STANDALONE_RUN_ID);
  activityStore.clearActivities(TEAM_MEMBER_RUN_ID);
  agentContextsStore.runs.delete(STANDALONE_RUN_ID);
  teamContextsStore.removeTeamContext(TEAM_RUN_ID);
  const globalWindow = window as typeof window & { __commandFailureProbe?: FailureDetailProbeControl };
  delete globalWindow.__commandFailureProbe;
});
</script>

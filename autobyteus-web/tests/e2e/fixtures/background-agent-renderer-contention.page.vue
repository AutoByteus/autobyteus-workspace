<template>
  <main data-test="background-contention-probe" class="min-h-screen bg-slate-100 p-4 text-slate-900">
    <header class="mx-auto mb-4 max-w-6xl rounded-lg bg-white p-4 shadow-sm">
      <h1 class="text-xl font-semibold">Background renderer contention probe</h1>
      <p data-test="topology-counts" class="text-sm text-slate-600">
        workspaces={{ workspaceCount }} teams={{ teamCount }} topology={{ runHistoryStore.navigationTopologyRevision }} patches={{ runHistoryStore.navigationPatchRevision }}
      </p>
      <p data-test="load-state" class="text-sm text-slate-600">
        mode={{ loadMode }} active={{ loadActive }} windows={{ loadWindowCount }} dispatches={{ loadDispatchCount }}
      </p>
      <div class="mt-3 flex gap-2">
        <button data-test="files-tab" type="button" class="rounded border px-3 py-1" @click="switchSurface('files')">Files</button>
        <button data-test="teams-tab" type="button" class="rounded border px-3 py-1" @click="switchSurface('teams')">Teams</button>
      </div>
    </header>

    <div class="mx-auto grid max-w-6xl grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section class="min-h-[440px] rounded-lg bg-white p-3 shadow-sm">
        <div v-if="activeSurface === 'files'" data-test="files-surface">
          <h2 class="mb-2 font-semibold">Files</h2>
          <ul class="grid grid-cols-2 gap-1 text-xs sm:grid-cols-3 lg:grid-cols-4">
            <li v-for="index in 120" :key="index" class="truncate rounded bg-slate-50 px-2 py-1">src/file-{{ index }}.ts</li>
          </ul>
        </div>
        <div v-else data-test="teams-surface">
          <h2 class="mb-2 font-semibold">Team hierarchy</h2>
          <WorkspaceHistoryWorkspaceSection
            v-if="firstWorkspaceNode"
            :workspace-node="firstWorkspaceNode"
            :workspace-teams="firstWorkspaceTeams"
            :workspace-team-history-groups="[]"
            :state="historyState"
            :avatars="avatars"
            :actions="actions"
          />
        </div>
      </section>

      <aside class="rounded-lg bg-white p-3 shadow-sm">
        <div data-test="composer-attachments" class="border-b">
          <ContextFilePathInputArea />
        </div>
        <div data-test="composer-input">
          <AgentUserInputTextArea />
        </div>
        <div class="mt-3 text-xs text-slate-600">
          <p data-test="rich-focus">focus={{ richTeam.view.getFocusedAgentRunId() }}</p>
          <p data-test="rich-task-status">task={{ richTaskContext.state.currentStatus }}</p>
          <p data-test="detail-revision">detail={{ detailRevision }}</p>
          <button data-test="detail-only-update" class="mt-1 rounded border px-2 py-1" @click="detailRevision += 1">Update detail only</button>
        </div>
      </aside>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import WorkspaceHistoryWorkspaceSection from '~/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue';
import ContextFilePathInputArea from '~/components/agentInput/ContextFilePathInputArea.vue';
import AgentUserInputTextArea from '~/components/agentInput/AgentUserInputTextArea.vue';
import type {
  WorkspaceHistoryAvatarBindings,
  WorkspaceHistorySectionActions,
  WorkspaceHistorySectionState,
} from '~/components/workspace/history/workspaceHistorySectionContracts';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig';
import type { Conversation } from '~/types/conversation';
import type { RunHistoryTeamExecutionRow } from '~/stores/runHistoryTypes';
import { useWorkspaceStore } from '~/stores/workspace';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { useContextFileUploadStore } from '~/stores/contextFileUploadStore';
import { useExtensionsStore } from '~/stores/extensionsStore';
import { useVoiceInputStore } from '~/stores/voiceInputStore';
import { dispatchAgentStreamMessage, type AgentStreamProjectionTarget } from '~/services/agentStreaming/agentStreamMessageProjector';
import type { ServerMessage } from '~/services/agentStreaming/protocol';
import { buildRecentEventMonitorPresentation } from '~/services/eventMonitor/recentEventMonitorWindow';
import { createUploadedContextAttachment } from '~/utils/contextFiles/contextAttachmentModel';
import {
  buildTestTeamContext,
  testAgentNode,
  testSubTeamNode,
  testTaskRecord,
} from '~/test-support/currentTeamTestFixtures';

definePageMeta({ layout: false });

const workspaceStore = useWorkspaceStore();
const agentContextsStore = useAgentContextsStore();
const teamContextsStore = useAgentTeamContextsStore();
const selectionStore = useAgentSelectionStore();
const runHistoryStore = useRunHistoryStore();
const activityStore = useAgentActivityStore();
const uploadStore = useContextFileUploadStore();
const extensionsStore = useExtensionsStore();
const voiceInputStore = useVoiceInputStore();
const navigationRefreshReasons: string[] = [];
runHistoryStore.$onAction(({ name, args }) => {
  if (name === 'refreshRunNavigationTopology') {
    navigationRefreshReasons.push(String(args[0] ?? 'unknown'));
  }
});

const now = new Date().toISOString();
const workspaceMetadata = (index: number) => ({
  workspaceId: `workspace-${index}`,
  workspaceRootPath: `/probe/workspace-${index}`,
  displayName: `Workspace ${index}`,
  kind: 'filesystem' as const,
});
const configFor = (runId: string, workspaceIndex: number): AgentRunConfig => ({
  agentDefinitionId: `definition-${runId}`,
  agentDefinitionName: runId,
  llmModelIdentifier: 'probe-model',
  runtimeKind: 'autobyteus',
  workspaceId: `workspace-${workspaceIndex}`,
  workspaceMetadata: workspaceMetadata(workspaceIndex),
  autoExecuteTools: false,
  skillAccessMode: 'NONE',
  isLocked: true,
  llmConfig: null,
});
const contextFor = (runId: string, workspaceIndex: number, status = AgentStatus.Running): AgentContext => {
  const conversation: Conversation = { id: runId, createdAt: now, updatedAt: now, messages: [] };
  const context = new AgentContext(configFor(runId, workspaceIndex), new AgentRunState(runId, conversation));
  context.state.currentStatus = status;
  context.isSubscribed = true;
  return context;
};
for (let index = 0; index < 26; index += 1) {
  const metadata = workspaceMetadata(index);
  workspaceStore.workspaces[metadata.workspaceId] = {
    workspaceId: metadata.workspaceId,
    name: metadata.displayName,
    displayName: metadata.displayName,
    workspaceConfig: { root_path: metadata.workspaceRootPath },
    absolutePath: metadata.workspaceRootPath,
    workspaceRootPath: metadata.workspaceRootPath,
    kind: 'filesystem',
  };
  workspaceStore.workspaceMetadataById[metadata.workspaceId] = metadata;
}
workspaceStore.workspacesFetched = true;

const composerContext = contextFor('composer-run', 0, AgentStatus.Idle);
agentContextsStore.runs.set(composerContext.state.runId, composerContext);
selectionStore.selectRunWithoutShellNavigation(composerContext.state.runId, 'agent');

const richWorkerContext = contextFor('rich-worker-run', 0, AgentStatus.Idle);
const richTaskContext = contextFor('rich-task-agent-run', 0, AgentStatus.Running);
const richReviewerContext = contextFor('rich-reviewer-run', 0, AgentStatus.Idle);
const richTaskTeamChildContext = contextFor('rich-task-team-child-run', 0, AgentStatus.Running);
const richWorkerNode = testAgentNode('/worker', {
  agentRunId: richWorkerContext.state.runId,
  displayName: 'Worker',
});
const richReviewerNode = testAgentNode('/ReviewTeam/reviewer', {
  agentRunId: richReviewerContext.state.runId,
  displayName: 'Reviewer',
});
const richStableTeamNode = testSubTeamNode('/ReviewTeam', [richReviewerNode], {
  displayName: 'Review Team',
  teamDefinitionId: 'review-team',
  teamRunId: 'review-team-run',
  coordinatorAddress: '/ReviewTeam/reviewer',
});
const richTaskAgent = testTaskRecord({
  taskId: 'task_0001',
  delegatorAgentRunId: richWorkerContext.state.runId,
  recipientAddress: '/worker',
  target: { agentRunId: richTaskContext.state.runId },
  description: 'Hidden task detail',
});
const richTaskTeam = testTaskRecord({
  taskId: 'task_0002',
  delegatorAgentRunId: richWorkerContext.state.runId,
  recipientAddress: '/ReviewTeam',
  target: { teamRunId: 'rich-task-team-run' },
  description: 'Hidden nested task detail',
});
const richTeam = buildTestTeamContext({
  teamRunId: 'team-0',
  teamDefinitionId: 'contention-team',
  teamDefinitionName: 'Contention Team',
  coordinatorAddress: '/worker',
  focusedAgentRunId: richWorkerContext.state.runId,
  workspaceRootPath: '/probe/workspace-0',
  configuration: {
    workspaceId: 'workspace-0',
    workspaceMetadata: workspaceMetadata(0),
  },
  rootChildren: [richWorkerNode, richStableTeamNode],
  tasks: [richTaskAgent, richTaskTeam],
  taskExecutions: [
    {
      kind: 'task_agent', address: '/worker', agent_run_id: richTaskContext.state.runId,
      platform_agent_run_id: null, started_at: now, settled_at: null,
    },
    {
      kind: 'task_team', address: '/ReviewTeam', team_run_id: 'rich-task-team-run',
      members: [{
        kind: 'task_team_agent', address: '/ReviewTeam/reviewer',
        agent_run_id: richTaskTeamChildContext.state.runId, platform_agent_run_id: null,
      }],
      task_executions: [], started_at: now, settled_at: null,
    },
  ],
  contexts: [
    { agentRunId: richWorkerContext.state.runId, context: richWorkerContext },
    { agentRunId: richTaskContext.state.runId, context: richTaskContext },
    { agentRunId: richReviewerContext.state.runId, context: richReviewerContext },
    { agentRunId: richTaskTeamChildContext.state.runId, context: richTaskTeamChildContext },
  ],
});
const seededTeams = [richTeam];

for (let index = 1; index < 38; index += 1) {
  const workspaceIndex = index % 26;
  const runId = `team-${index}-worker-run`;
  const memberContext = contextFor(runId, workspaceIndex);
  const memberNode = testAgentNode('/worker', {
    agentRunId: runId,
    displayName: `Worker ${index}`,
    currentStatus: AgentStatus.Running,
  });
  const team = buildTestTeamContext({
    teamRunId: `team-${index}`,
    teamDefinitionId: 'contention-team',
    teamDefinitionName: 'Contention Team',
    coordinatorAddress: '/worker',
    focusedAgentRunId: runId,
    workspaceRootPath: `/probe/workspace-${workspaceIndex}`,
    configuration: {
      workspaceId: `workspace-${workspaceIndex}`,
      workspaceMetadata: workspaceMetadata(workspaceIndex),
    },
    rootChildren: [memberNode],
    contexts: [{ agentRunId: runId, context: memberContext }],
  });
  seededTeams.push(team);
}
teamContextsStore.teams = new Map(seededTeams.map((team) => [team.view.getRootTeamRunId(), team]));

const retentionContext = contextFor('retention-run', 1, AgentStatus.Running);
agentContextsStore.runs.set(retentionContext.state.runId, retentionContext);
runHistoryStore.refreshRunNavigationTopology('contention-probe-seed');

const loadTargets: AgentStreamProjectionTarget[] = Array.from(teamContextsStore.teams.values())
  .slice(0, 20)
  .map((team) => {
    const teamRunId = team.view.getRootTeamRunId();
    const agentRunId = teamRunId === richTeam.view.getRootTeamRunId()
      ? richTaskContext.state.runId
      : team.view.getFocusedAgentRunId();
    const context = team.view.getAgentContext(agentRunId)!;
    const memberAddress = team.view.getMemberAddress(agentRunId)!;
    dispatchAgentStreamMessage({
      type: 'SEGMENT_START',
      payload: { id: `load-${teamRunId}`, turn_id: `turn-${teamRunId}`, segment_type: 'text' },
    } as ServerMessage, {
      kind: 'team_member', context, teamRunId, agentRunId, memberAddress,
    });
    return { kind: 'team_member', context, teamRunId, agentRunId, memberAddress } as const;
  });
runHistoryStore.refreshRunNavigationTopology('contention-probe-after-segments');

const workspaceCount = computed(() => workspaceStore.allWorkspaces.length);
const teamCount = computed(() => teamContextsStore.allTeamRuns.length);
const firstWorkspaceNode = computed(() => runHistoryStore.navigationProjection?.workspaceNodes[0] ?? null);
const firstWorkspaceTeams = computed(() => runHistoryStore.navigationProjection?.teamNodesByWorkspaceRoot['/probe/workspace-0'] ?? []);
const activeSurface = ref<'files' | 'teams'>('files');
const actionLatencies = ref<number[]>([]);
const detailRevision = ref(0);
const loadMode = ref('idle');
const loadActive = ref(false);
const loadWindowCount = ref(0);
const loadDispatchCount = ref(0);
let loadTimer: ReturnType<typeof setInterval> | null = null;
let loadPromise: Promise<Record<string, unknown>> | null = null;
let resolveLoad: ((summary: Record<string, unknown>) => void) | null = null;
const longTasks: Array<{ startTime: number; duration: number }> = [];
let longTaskObserver: PerformanceObserver | null = null;

const raf = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const switchSurface = async (surface: 'files' | 'teams') => {
  const started = performance.now();
  activeSurface.value = surface;
  await nextTick();
  await raf();
  actionLatencies.value.push(performance.now() - started);
};
const dispatchWindow = (target: AgentStreamProjectionTarget, index: number) => {
  const runId = target.context.state.runId;
  dispatchAgentStreamMessage({ type: 'AGENT_STATUS', payload: { status: 'running', agent_id: runId } } as ServerMessage, target);
  dispatchAgentStreamMessage({
    type: 'SEGMENT_CONTENT',
    payload: {
      id: `load-${target.kind === 'team_member' ? target.teamRunId : runId}`,
      turn_id: `turn-${target.kind === 'team_member' ? target.teamRunId : runId}`,
      segment_type: 'text', delta: `w${index}|`,
    },
  } as ServerMessage, target);
  loadWindowCount.value += 1;
  loadDispatchCount.value += 2;
};
const loadSnapshot = () => ({
  topologyRevision: runHistoryStore.navigationTopologyRevision,
  patchRevision: runHistoryStore.navigationPatchRevision,
  presentationRevisions: loadTargets.reduce((sum, target) => sum + target.context.state.eventMonitorPresentationRevision, 0),
  contentCharacters: loadTargets.reduce((sum, target) => sum + (target.context.lastAIMessage?.segments
    .filter((segment) => segment.type === 'text').reduce((size, segment) => size + segment.content.length, 0) ?? 0), 0),
});
const stopLoad = (
  before: ReturnType<typeof loadSnapshot>,
  startedAt: number,
  navigationReasons: string[],
) => {
  if (loadTimer) clearInterval(loadTimer);
  loadTimer = null;
  loadActive.value = false;
  const after = loadSnapshot();
  const summary = {
    mode: loadMode.value, elapsedMs: performance.now() - startedAt,
    windows: loadWindowCount.value, dispatches: loadDispatchCount.value,
    topologyDelta: after.topologyRevision - before.topologyRevision,
    navigationReasons,
    patchDelta: after.patchRevision - before.patchRevision,
    presentationRevisionDelta: after.presentationRevisions - before.presentationRevisions,
    contentCharacterDelta: after.contentCharacters - before.contentCharacters,
    statusValues: loadTargets.map((target) => target.context.state.currentStatus),
    longTasks: [...longTasks], actionLatencies: [...actionLatencies.value],
  };
  resolveLoad?.(summary);
  resolveLoad = null;
};
const startLoad = (mode: 'idle' | 'one' | 'aggregate', durationMs = 6500) => {
  if (loadActive.value) throw new Error('Load already active');
  loadMode.value = mode;
  loadActive.value = true;
  loadWindowCount.value = 0;
  loadDispatchCount.value = 0;
  actionLatencies.value = [];
  longTasks.splice(0);
  const before = loadSnapshot();
  const reasonStartIndex = navigationRefreshReasons.length;
  const startedAt = performance.now();
  loadPromise = new Promise((resolve) => { resolveLoad = resolve; });
  if (mode === 'idle') {
    loadTimer = setInterval(() => {}, Math.min(durationMs, 1000));
  } else {
    const intervalMs = mode === 'one' ? 500 : 25;
    let targetIndex = 0;
    loadTimer = setInterval(() => {
      const target = mode === 'one' ? loadTargets[0]! : loadTargets[targetIndex % loadTargets.length]!;
      dispatchWindow(target, loadWindowCount.value);
      targetIndex += 1;
    }, intervalMs);
  }
  setTimeout(() => {
    const reasons = navigationRefreshReasons.slice(reasonStartIndex);
    stopLoad(before, startedAt, reasons);
  }, durationMs);
};
const waitLoad = async () => loadPromise ? await loadPromise : null;

const runNoEffectCheck = () => {
  const target = loadTargets[0]!;
  const before = loadSnapshot();
  dispatchAgentStreamMessage({ type: 'CONNECTED', payload: { agent_id: target.context.state.runId, session_id: 'probe' } } as ServerMessage, target);
  dispatchAgentStreamMessage({ type: 'AGENT_STATUS', payload: { status: 'running', agent_id: target.context.state.runId } } as ServerMessage, target);
  const after = loadSnapshot();
  return {
    topologyDelta: after.topologyRevision - before.topologyRevision,
    patchDelta: after.patchRevision - before.patchRevision,
    presentationRevisionDelta: after.presentationRevisions - before.presentationRevisions,
    status: target.context.state.currentStatus,
  };
};
const runLatest100 = () => {
  const target = { kind: 'standalone', context: retentionContext, runId: retentionContext.state.runId } as const;
  for (let index = 0; index < 110; index += 1) {
    const id = `retained-${index}`;
    const turnId = `retention-turn-${index}`;
    dispatchAgentStreamMessage({ type: 'SEGMENT_START', payload: { id, turn_id: turnId, segment_type: 'text' } } as ServerMessage, target);
    dispatchAgentStreamMessage({ type: 'SEGMENT_CONTENT', payload: { id, turn_id: turnId, segment_type: 'text', delta: id } } as ServerMessage, target);
    dispatchAgentStreamMessage({ type: 'SEGMENT_END', payload: { id, turn_id: turnId, segment_type: 'text' } } as ServerMessage, target);
  }
  const segments = retentionContext.conversation.messages.flatMap((message) => message.type === 'ai' ? message.segments : []);
  const presentation = buildRecentEventMonitorPresentation(
    retentionContext.conversation,
    activityStore.getCompactionActivities(retentionContext.state.runId),
  );
  const visualCount = presentation.reduce((count, item) => count + (item.kind === 'compaction'
    ? 1 : item.message.type === 'user' ? 1 : item.message.segments.length), 0);
  return {
    visualCount, segmentCount: segments.length,
    firstContent: segments[0]?.type === 'text' ? segments[0].content : null,
    lastContent: segments.at(-1)?.type === 'text' ? segments.at(-1)?.content : null,
    topologyRevision: runHistoryStore.navigationTopologyRevision,
  };
};
const inspectHierarchy = () => {
  const team = runHistoryStore.navigationProjection?.teamNodes.find(
    (candidate) => candidate.teamRunId === richTeam.view.getRootTeamRunId(),
  );
  return {
    focusedAgentRunId: team?.focusedAgentRunId,
    rows: team?.executionRows.map((row) => ({
      kind: row.kind, memberAddress: row.memberAddress, agentRunId: row.agentRunId, depth: row.depth,
      hasChildren: row.hasChildren,
      transientKind: row.kind === 'transient_execution' ? row.transientKind : null,
      status: row.kind === 'transient_execution' ? row.currentStatus : row.row.currentStatus,
    })) ?? [],
  };
};
const pasteFile = async (name = 'delayed-proof.txt') => {
  const target = document.querySelector('[data-test="composer-attachments"] [data-file-drop-target="true"]');
  if (!target) throw new Error('Paste target unavailable');
  const transfer = new DataTransfer();
  transfer.items.add(new File(['proof'], name, { type: 'text/plain' }));
  const started = performance.now();
  target.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: transfer }));
  while (!target.textContent?.includes(name)) await raf();
  return { placeholderLatencyMs: performance.now() - started, countText: target.textContent };
};
const resetVoice = async () => voiceInputStore.cancelOperationForSource('composer');
const voiceTimeline = reactive({
  clickedAt: null as number | null,
  startingAt: null as number | null,
  startingVisibleAt: null as number | null,
  recordingAt: null as number | null,
  recordingVisibleAt: null as number | null,
  error: null as string | null,
});
const armVoiceTimeline = () => {
  voiceTimeline.clickedAt = null;
  voiceTimeline.startingAt = null;
  voiceTimeline.startingVisibleAt = null;
  voiceTimeline.recordingAt = null;
  voiceTimeline.recordingVisibleAt = null;
  voiceTimeline.error = null;
};
watch(() => voiceInputStore.isStarting, (starting) => {
  if (!starting || voiceTimeline.startingAt !== null) return;
  voiceTimeline.startingAt = performance.now();
  void nextTick().then(raf).then(() => {
    if (document.body.textContent?.includes('Starting microphone...')) {
      voiceTimeline.startingVisibleAt = performance.now();
    }
  });
}, { flush: 'sync' });
watch(() => voiceInputStore.isRecording, (recording) => {
  if (!recording || voiceTimeline.recordingAt !== null) return;
  voiceTimeline.recordingAt = performance.now();
  void nextTick().then(raf).then(() => {
    if (document.body.textContent?.includes('Recording... Tap stop when you are done.')) {
      voiceTimeline.recordingVisibleAt = performance.now();
    }
  });
}, { flush: 'sync' });
watch(() => voiceInputStore.error, (error) => { voiceTimeline.error = error; }, { flush: 'sync' });
const captureVoiceClick = (event: Event) => {
  const target = event.target instanceof Element ? event.target.closest('button') : null;
  if (target?.getAttribute('title') === 'Start voice input') voiceTimeline.clickedAt = performance.now();
};

const expandedTeams = reactive(new Set<string>());
const expandedMembers = reactive(new Set<string>());
const historyState: WorkspaceHistorySectionState = {
  selectedRunId: null,
  isTeamRunSelected: () => false,
  isRunTerminating: () => false, isTeamTerminating: () => false,
  isRunDeleting: () => false, isTeamDeleting: () => false,
  isRunArchiving: () => false, isTeamArchiving: () => false,
  isWorkspaceRemoving: () => false, isWorkspaceHistoryLoading: () => false,
  workspaceHistoryError: () => null, formatRelativeTime: () => 'now',
  isWorkspaceExpanded: () => true, toggleWorkspace: () => {},
  isAgentExpanded: () => false, toggleAgent: () => {},
  isTeamDefinitionExpanded: () => true, toggleTeamDefinition: () => {},
  isTeamExpanded: (teamRunId) => expandedTeams.has(teamRunId),
  isTeamMemberExpanded: (_workspaceId, teamRunId, routeKey) => expandedMembers.has(`${teamRunId}:${routeKey}`),
  toggleTeamMember: (_workspaceId, teamRunId, routeKey) => {
    const key = `${teamRunId}:${routeKey}`;
    if (expandedMembers.has(key)) expandedMembers.delete(key); else expandedMembers.add(key);
  },
  canTerminateTeam: () => false,
};
const avatars: WorkspaceHistoryAvatarBindings = {
  showAgentAvatar: () => false, onAgentAvatarError: () => {}, getAgentInitials: () => 'A',
  showTeamAvatar: () => false, getTeamAvatarUrl: () => '', onTeamAvatarError: () => {}, getTeamInitials: () => 'CT',
  showTeamMemberAvatar: () => false, getTeamMemberAvatarUrl: () => '', onTeamMemberAvatarError: () => {},
  getTeamMemberDisplayName: (member) => member.displayName || member.memberName, getTeamMemberInitials: () => 'M',
};
const actions: WorkspaceHistorySectionActions = {
  onRemoveWorkspace: () => {}, onCreateRun: () => {}, onSelectRun: () => {},
  onTerminateRun: () => {}, onArchiveRun: () => {}, onDeleteRun: () => {},
  onTerminateTeam: () => {}, onArchiveTeam: () => {}, onDeleteTeam: () => {},
  onSelectTeam: (team) => { if (expandedTeams.has(team.teamRunId)) expandedTeams.delete(team.teamRunId); else expandedTeams.add(team.teamRunId); },
  onSelectTeamMember: (row: RunHistoryTeamExecutionRow) => {
    if (!row.agentRunId) return;
    const result = richTeam.view.focusAgent(row.agentRunId);
    if (result.disposition === 'rejected') throw new Error(result.message);
    runHistoryStore.refreshRunNavigationTopology('contention-probe-member-focus');
  },
};

const originalUpload = uploadStore.uploadAttachment.bind(uploadStore);
uploadStore.uploadAttachment = async ({ file }) => {
  uploadStore.activeRequestCount += 1;
  try {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const storedFilename = `ctx_probe__${file.name}`;
    return createUploadedContextAttachment({
      storedFilename, displayName: file.name, type: 'Text', phase: 'draft',
      locator: `/rest/context-files/drafts/agents/composer-run/${storedFilename}`,
    });
  } finally {
    uploadStore.activeRequestCount -= 1;
  }
};
extensionsStore.$patch({
  initialized: true,
  extensions: [{
    id: 'voice-input', name: 'Voice Input', description: 'Probe', status: 'installed', enabled: true,
    settings: { languageMode: 'auto', audioInputDeviceId: null }, message: 'Ready', installProgress: null,
    installedAt: now, runtimeVersion: 'probe', modelVersion: 'probe', backendKind: 'faster-whisper', lastError: null,
  }],
});

onMounted(() => {
  if ('PerformanceObserver' in window) {
    try {
      longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) longTasks.push({ startTime: entry.startTime, duration: entry.duration });
      });
      longTaskObserver.observe({ type: 'longtask', buffered: true });
    } catch { longTaskObserver = null; }
  }
  const globalWindow = window as typeof window & { __backgroundContentionProbe?: Record<string, unknown> };
  document.addEventListener('click', captureVoiceClick, true);
  globalWindow.__backgroundContentionProbe = {
    startLoad, waitLoad, switchSurface, runNoEffectCheck, runLatest100, inspectHierarchy, pasteFile, resetVoice,
    armVoiceTimeline,
    getVoiceTimeline: () => ({ ...voiceTimeline, isStarting: voiceInputStore.isStarting, isRecording: voiceInputStore.isRecording }),
    getActionLatencies: () => [...actionLatencies.value],
    getRevisions: () => ({ topology: runHistoryStore.navigationTopologyRevision, patch: runHistoryStore.navigationPatchRevision }),
  };
});

onBeforeUnmount(() => {
  if (loadTimer) clearInterval(loadTimer);
  longTaskObserver?.disconnect();
  document.removeEventListener('click', captureVoiceClick, true);
  void voiceInputStore.cleanup();
  uploadStore.uploadAttachment = originalUpload;
  delete (window as typeof window & { __backgroundContentionProbe?: Record<string, unknown> }).__backgroundContentionProbe;
});
</script>

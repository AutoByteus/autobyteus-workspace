<template>
  <main
    data-test="standalone-agent-error-stop-probe"
    class="min-h-screen bg-slate-100 p-6 text-slate-900"
  >
    <section class="mx-auto max-w-2xl rounded-xl bg-white p-4 shadow-sm">
      <h1 class="mb-3 text-lg font-semibold">Standalone Error Stop lifecycle</h1>
      <WorkspaceHistoryWorkspaceSection
        :workspace-node="workspaceNode"
        :workspace-teams="[]"
        :workspace-team-history-groups="[]"
        :state="sectionState"
        :avatars="avatars"
        :actions="sectionActions"
      />
      <div class="mt-4 space-y-1" aria-live="polite" data-test="probe-toasts">
        <p
          v-for="toast in toasts"
          :key="toast.sequence"
          :data-toast-type="toast.type"
          class="rounded bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {{ toast.message }}
        </p>
      </div>
      <output class="mt-3 block text-xs text-slate-500" data-test="probe-selected-run">
        {{ sectionState.selectedRunId || 'none' }}
      </output>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import WorkspaceHistoryWorkspaceSection from '~/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue';
import type {
  WorkspaceHistoryAvatarBindings,
  WorkspaceHistorySectionActions,
  WorkspaceHistorySectionState,
} from '~/components/workspace/history/workspaceHistorySectionContracts';
import { useWorkspaceHistoryMutations } from '~/composables/useWorkspaceHistoryMutations';
import { buildRunHistoryTreeNodes } from '~/stores/runHistoryReadModel';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { RunTreeRow, RunTreeWorkspaceNode } from '~/utils/runTreeProjection';

const ACTIVE_ERROR_RUN = 'run-active-error';
const INACTIVE_ERROR_RUN = 'run-inactive-error';
const HEALTHY_RUN = 'run-healthy';
const workspace = {
  workspaceId: 'workspace-error-stop',
  workspaceRootPath: '/fixture/error-stop',
  absolutePath: '/fixture/error-stop',
  name: 'Error Stop Workspace',
  kind: 'filesystem',
};

type ProbeToast = { sequence: number; message: string; type: string };
const toasts = ref<ProbeToast[]>([]);
const selectedEvents = ref<string[]>([]);
const stopPendingTeamIds = ref<Record<string, boolean>>({});
let toastSequence = 0;
let backendUrl = '';

const buildWorkspaceNode = (): RunTreeWorkspaceNode => {
  const nodes = buildRunHistoryTreeNodes({
    workspaceGroups: [{
      workspaceRootPath: workspace.workspaceRootPath,
      workspaceName: workspace.name,
      agentDefinitions: [{
        agentDefinitionId: 'agent-error-stop',
        agentName: 'Error Stop Agent',
        runs: [
          {
            runId: ACTIVE_ERROR_RUN,
            summary: 'Current error run',
            createdAt: '2026-09-03T12:03:00.000Z',
            archivedAt: null,
            terminatedAt: null,
            status: AgentStatus.Error,
            isActive: true,
            shouldConnectStream: true,
            statusSource: 'ACTIVE_RUNTIME',
          },
          {
            runId: HEALTHY_RUN,
            summary: 'Healthy sibling run',
            createdAt: '2026-09-03T12:02:00.000Z',
            archivedAt: null,
            terminatedAt: null,
            status: AgentStatus.Running,
            isActive: true,
            shouldConnectStream: true,
            statusSource: 'ACTIVE_RUNTIME',
          },
          {
            runId: INACTIVE_ERROR_RUN,
            summary: 'Past error evidence',
            createdAt: '2026-09-03T12:01:00.000Z',
            archivedAt: null,
            terminatedAt: '2026-09-03T12:01:30.000Z',
            status: AgentStatus.Error,
            isActive: false,
            shouldConnectStream: false,
            statusSource: 'TERMINATED_METADATA',
          },
        ],
      }],
      teamDefinitions: [],
    }],
    agentAvatarByDefinitionId: {},
    allWorkspaces: [workspace],
    workspacesById: { [workspace.workspaceId]: workspace },
    agentContexts: new Map([
      [ACTIVE_ERROR_RUN, {
        config: {
          agentDefinitionId: 'agent-error-stop',
          agentDefinitionName: 'Error Stop Agent',
          workspaceId: workspace.workspaceId,
          workspaceMetadata: { workspaceRootPath: workspace.workspaceRootPath },
        },
        state: {
          currentStatus: AgentStatus.Error,
          conversation: {
            messages: [],
            createdAt: '2026-09-03T12:03:00.000Z',
            updatedAt: '2026-09-03T12:03:30.000Z',
          },
        },
      }],
      [INACTIVE_ERROR_RUN, {
        config: {
          agentDefinitionId: 'agent-error-stop',
          agentDefinitionName: 'Error Stop Agent',
          workspaceId: workspace.workspaceId,
          workspaceMetadata: { workspaceRootPath: workspace.workspaceRootPath },
        },
        state: {
          currentStatus: AgentStatus.Error,
          conversation: {
            messages: [],
            createdAt: '2026-09-03T12:01:00.000Z',
            updatedAt: '2026-09-03T12:01:30.000Z',
          },
        },
      }],
    ]),
  });
  if (!nodes[0]) throw new Error('Error Stop fixture did not build a workspace node.');
  return nodes[0];
};

const workspaceNode = reactive<RunTreeWorkspaceNode>(buildWorkspaceNode());

const findRun = (runId: string): RunTreeRow => {
  const run = workspaceNode.agents.flatMap((agent) => agent.runs)
    .find((candidate) => candidate.runId === runId);
  if (!run) throw new Error(`Fixture run '${runId}' was not found.`);
  return run;
};

const replaceWorkspaceNode = (): void => {
  const next = buildWorkspaceNode();
  Object.assign(workspaceNode, next);
  workspaceNode.agents = next.agents;
};

const terminateRun = async (runId: string): Promise<boolean> => {
  if (!backendUrl) throw new Error('Fixture backend URL was not configured.');
  const response = await fetch(`${backendUrl}/graphql`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      operationName: 'TerminateAgentRun',
      query: `mutation TerminateAgentRun($agentRunId: String!) {
        terminateAgentRun(agentRunId: $agentRunId) { success message }
      }`,
      variables: { agentRunId: runId },
    }),
  });
  if (!response.ok) throw new Error(`Termination HTTP ${response.status}`);
  const payload = await response.json() as {
    data?: { terminateAgentRun?: { success?: boolean; message?: string } };
    errors?: Array<{ message?: string }>;
  };
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((entry) => entry.message || 'GraphQL error').join(', '));
  }
  if (!payload.data?.terminateAgentRun?.success) return false;
  const run = findRun(runId);
  Object.assign(run, {
    currentStatus: AgentStatus.Offline,
    lastKnownStatus: 'IDLE',
    isActive: false,
  });
  return true;
};

const mutations = useWorkspaceHistoryMutations({
  terminateRun,
  terminateTeamRun: async () => false,
  removeDraftRun: async () => false,
  deleteRun: async () => false,
  deleteTeamRun: async () => false,
  archiveRun: async () => false,
  archiveTeamRun: async () => false,
  addToast: (message, type) => {
    toastSequence += 1;
    toasts.value.push({ sequence: toastSequence, message, type });
  },
  stopPendingTeamIds,
});

const sectionState = reactive<WorkspaceHistorySectionState>({
  selectedRunId: null,
  isTeamRunSelected: () => false,
  isRunTerminating: (runId) => Boolean(mutations.terminatingRunIds.value[runId]),
  isTeamTerminating: () => false,
  isRunDeleting: () => false,
  isTeamDeleting: () => false,
  isRunArchiving: () => false,
  isTeamArchiving: () => false,
  isWorkspaceRemoving: () => false,
  isWorkspaceHistoryLoading: () => false,
  workspaceHistoryError: () => null,
  formatRelativeTime: () => 'now',
  isWorkspaceExpanded: () => true,
  toggleWorkspace: () => undefined,
  isAgentExpanded: () => true,
  toggleAgent: () => undefined,
  isTeamDefinitionExpanded: () => false,
  toggleTeamDefinition: () => undefined,
  isTeamExpanded: () => false,
  isTeamMemberExpanded: () => false,
  toggleTeamMember: () => undefined,
});

const sectionActions: WorkspaceHistorySectionActions = {
  onRemoveWorkspace: () => undefined,
  onCreateRun: () => undefined,
  onSelectRun: (run) => {
    sectionState.selectedRunId = run.runId;
    selectedEvents.value.push(run.runId);
  },
  onTerminateRun: mutations.onTerminateRun,
  onArchiveRun: () => undefined,
  onDeleteRun: () => undefined,
  onTerminateTeam: () => undefined,
  onArchiveTeam: () => undefined,
  onDeleteTeam: () => undefined,
  onSelectTeam: () => undefined,
  onSelectTeamMember: () => undefined,
};

const avatars: WorkspaceHistoryAvatarBindings = {
  showAgentAvatar: () => false,
  onAgentAvatarError: () => undefined,
  getAgentInitials: () => 'EA',
  showTeamAvatar: () => false,
  getTeamAvatarUrl: () => '',
  onTeamAvatarError: () => undefined,
  getTeamInitials: () => 'T',
  showTeamMemberAvatar: () => false,
  getTeamMemberAvatarUrl: () => '',
  onTeamMemberAvatarError: () => undefined,
  getTeamMemberDisplayName: (member) => member.displayName,
  getTeamMemberInitials: () => 'M',
};

const snapshot = () => ({
  selectedRunId: sectionState.selectedRunId,
  selectedEvents: [...selectedEvents.value],
  toasts: toasts.value.map((toast) => ({ ...toast })),
  rows: workspaceNode.agents.flatMap((agent) => agent.runs).map((run) => ({
    runId: run.runId,
    currentStatus: run.currentStatus,
    lastKnownStatus: run.lastKnownStatus,
    isActive: run.isActive,
    source: run.source,
  })),
  pendingRunIds: Object.keys(mutations.terminatingRunIds.value),
});

const reset = (): void => {
  replaceWorkspaceNode();
  sectionState.selectedRunId = null;
  selectedEvents.value = [];
  toasts.value = [];
};

onMounted(() => {
  backendUrl = new URL(window.location.href).searchParams.get('backendUrl') || '';
  window.__standaloneAgentErrorStopProbe = { snapshot, reset };
});

onBeforeUnmount(() => {
  delete window.__standaloneAgentErrorStopProbe;
});

declare global {
  interface Window {
    __standaloneAgentErrorStopProbe?: {
      snapshot: typeof snapshot;
      reset: typeof reset;
    };
  }
}
</script>

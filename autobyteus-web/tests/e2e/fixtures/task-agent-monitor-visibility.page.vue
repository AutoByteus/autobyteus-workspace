<template>
  <main
    data-test="task-agent-monitor-visibility-probe"
    class="min-h-screen bg-slate-100 p-4 text-slate-900"
  >
    <header class="mx-auto mb-4 max-w-[90rem] rounded-lg bg-white p-4 shadow-sm">
      <h1 class="text-xl font-semibold">Task Agent monitor visibility probe</h1>
      <p data-test="probe-state" class="mt-1 text-sm text-slate-600">
        phase={{ service.synchronizationPhase }} focus={{ team.view.getFocusedAgentRunId() }}
      </p>
    </header>

    <div class="mx-auto grid h-[48rem] max-w-[90rem] grid-cols-[20rem_minmax(0,1fr)_22rem] overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
      <aside class="min-h-0 border-r border-slate-200">
        <TeamMembersPanel />
      </aside>
      <section class="min-h-0 min-w-0">
        <TeamWorkspaceView />
      </section>
      <aside class="min-h-0 border-l border-slate-200">
        <ActivityFeed :collapsed="false" />
      </aside>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';
import type { TeamStreamServerMessage } from '@autobyteus/team-stream-contracts';
import TeamMembersPanel from '~/components/workspace/team/TeamMembersPanel.vue';
import TeamWorkspaceView from '~/components/workspace/team/TeamWorkspaceView.vue';
import ActivityFeed from '~/components/progress/ActivityFeed.vue';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { AgentStatus } from '~/types/agent/AgentStatus';
import {
  buildTestTeamContext,
  testAgentContext,
  testAgentNode,
  testTaskRecord,
} from '~/test-support/currentTeamTestFixtures';
import {
  TeamStreamingService,
  ConnectionState,
  type IWebSocketClient,
  type WebSocketClientEvents,
} from '~/services/agentStreaming';
import { isTeamMemberProjectionAuthoritative } from '~/services/runHydration/teamMemberProjectionHydrationService';

definePageMeta({ layout: false });

const ROOT_TEAM_RUN_ID = 'task-monitor-root-run';
const TEACHER_RUN_ID = 'task-monitor-teacher-run';
const CONFIGURED_STUDENT_RUN_ID = 'task-monitor-configured-student-run';
const TASK_AGENT_RUN_ID = 'task-monitor-task-agent-run';
const TASK_ID = 'task-monitor-task-1';
const TASK_DESCRIPTION = 'Retained task monitor exact identity proof';

class ProbeWebSocketClient implements IWebSocketClient {
  state = ConnectionState.DISCONNECTED;
  private readonly listeners = new Map<keyof WebSocketClientEvents, Set<(...args: any[]) => void>>();

  connect(): void {
    this.state = ConnectionState.CONNECTED;
    this.emit('onStateChange', this.state);
    this.emit('onConnect');
  }

  disconnect(): void {
    this.state = ConnectionState.DISCONNECTED;
    this.emit('onStateChange', this.state);
    this.emit('onDisconnect', 'probe disconnect');
  }

  send(): void {}

  on<K extends keyof WebSocketClientEvents>(event: K, handler: WebSocketClientEvents[K]): void {
    const handlers = this.listeners.get(event) ?? new Set();
    handlers.add(handler as (...args: any[]) => void);
    this.listeners.set(event, handlers);
  }

  off<K extends keyof WebSocketClientEvents>(event: K, handler: WebSocketClientEvents[K]): void {
    this.listeners.get(event)?.delete(handler as (...args: any[]) => void);
  }

  emitMessage(message: TeamStreamServerMessage): void {
    this.emit('onMessage', JSON.stringify(message));
  }

  private emit<K extends keyof WebSocketClientEvents>(event: K, ...args: Parameters<WebSocketClientEvents[K]>): void {
    this.listeners.get(event)?.forEach((handler) => handler(...args));
  }
}

const teacherNode = testAgentNode('/Teacher', {
  agentRunId: TEACHER_RUN_ID,
  displayName: 'Teacher',
  currentStatus: AgentStatus.Idle,
});
const studentNode = testAgentNode('/Student', {
  agentRunId: CONFIGURED_STUDENT_RUN_ID,
  displayName: 'Student',
  currentStatus: AgentStatus.Offline,
});
const taskRecord = testTaskRecord({
  taskId: TASK_ID,
  delegatorAgentRunId: TEACHER_RUN_ID,
  recipientAddress: '/Student',
  target: { agentRunId: TASK_AGENT_RUN_ID },
  description: TASK_DESCRIPTION,
  status: 'active',
  createdAt: '2026-08-31T12:00:00.000Z',
});
const teacherContext = testAgentContext({
  runId: TEACHER_RUN_ID,
  displayName: 'Teacher',
  status: AgentStatus.Idle,
  agentDefinitionId: teacherNode.agentDefinitionId,
});
const studentContext = testAgentContext({
  runId: CONFIGURED_STUDENT_RUN_ID,
  displayName: 'Student',
  status: AgentStatus.Offline,
  agentDefinitionId: studentNode.agentDefinitionId,
});
const taskContext = testAgentContext({
  runId: TASK_AGENT_RUN_ID,
  displayName: 'Student',
  status: AgentStatus.Idle,
  agentDefinitionId: studentNode.agentDefinitionId,
});
const team = buildTestTeamContext({
  teamRunId: ROOT_TEAM_RUN_ID,
  teamDefinitionId: 'task-monitor-team-definition',
  teamDefinitionName: 'Task Monitor Team',
  coordinatorAddress: '/Teacher',
  focusedAgentRunId: TEACHER_RUN_ID,
  rootChildren: [teacherNode, studentNode],
  tasks: [taskRecord],
  contexts: [
    { agentRunId: TEACHER_RUN_ID, context: teacherContext },
    { agentRunId: CONFIGURED_STUDENT_RUN_ID, context: studentContext },
    { agentRunId: TASK_AGENT_RUN_ID, context: taskContext },
  ],
  baseChangeSequence: 40,
});

const teamStore = useAgentTeamContextsStore();
const selectionStore = useAgentSelectionStore();
const runHistoryStore = useRunHistoryStore();
const activityStore = useAgentActivityStore();
teamStore.addTeamContext(team);
selectionStore.setRunSelection(ROOT_TEAM_RUN_ID, 'team');
runHistoryStore.refreshRunNavigationTopology('task-monitor-probe-seed');

const wsClient = new ProbeWebSocketClient();
const service = new TeamStreamingService('ws://127.0.0.1:65534/ws/agent-team', { wsClient });
service.connect(ROOT_TEAM_RUN_ID, team);
const snapshotMessage = (): Extract<TeamStreamServerMessage, { type: 'TEAM_EXECUTION_VIEW_SNAPSHOT' }> => ({
  type: 'TEAM_EXECUTION_VIEW_SNAPSHOT',
  payload: {
    root_team_run_id: ROOT_TEAM_RUN_ID,
    base_change_sequence: 40,
    execution_tree: team.view.getExecutionTree(),
    tasks: team.view.listTaskHistoryRows().map((row) => row.task),
    messages: team.view.listCommunicationMessages(),
    agent_statuses: team.view.listAgentContextEntries().map((entry) => ({
      agent_run_id: entry.agentRunId,
      member_address: entry.memberAddress,
      status: entry.agentRunId === CONFIGURED_STUDENT_RUN_ID ? 'offline' : 'idle',
      trigger: null,
      tool_name: null,
      error_message: null,
      error_details: null,
    })),
  },
});

type ProbeControl = {
  admitSnapshot(): void;
  settleFocusedTask(): void;
  state(): Record<string, unknown>;
  ids: Readonly<{
    rootTeamRunId: string;
    teacherRunId: string;
    configuredStudentRunId: string;
    taskAgentRunId: string;
  }>;
};

const state = () => ({
  phase: service.synchronizationPhase,
  focusedAgentRunId: team.view.getFocusedAgentRunId(),
  focusedMemberAddress: team.view.getFocusedMemberAddress(),
  taskVisible: team.view.listNavigationRows().some((row) => row.agentRunId === TASK_AGENT_RUN_ID),
  taskAuthoritative: isTeamMemberProjectionAuthoritative(team, TASK_AGENT_RUN_ID),
  teacherAuthoritative: isTeamMemberProjectionAuthoritative(team, TEACHER_RUN_ID),
  taskConversationCount: taskContext.state.conversation.messages.length,
  teacherConversationCount: teacherContext.state.conversation.messages.length,
  taskActivityCount: activityStore.getActivities(TASK_AGENT_RUN_ID).length,
  teacherActivityCount: activityStore.getActivities(TEACHER_RUN_ID).length,
  taskAttempt: runHistoryStore.getTeamMemberInspectionAttempt(ROOT_TEAM_RUN_ID, TASK_AGENT_RUN_ID),
  teacherAttempt: runHistoryStore.getTeamMemberInspectionAttempt(ROOT_TEAM_RUN_ID, TEACHER_RUN_ID),
});

onMounted(() => {
  const globalWindow = window as typeof window & { __taskAgentMonitorVisibilityProbe?: ProbeControl };
  globalWindow.__taskAgentMonitorVisibilityProbe = {
    admitSnapshot: () => {
      wsClient.emitMessage({
        type: 'CONNECTED',
        payload: { session_id: 'task-monitor-probe-session', root_team_run_id: ROOT_TEAM_RUN_ID },
      });
      wsClient.emitMessage(snapshotMessage());
    },
    settleFocusedTask: () => {
      wsClient.emitMessage({
        type: 'TASK_DELEGATION_EVENT',
        payload: {
          event_type: 'TASK_EXECUTION_SETTLED',
          change_sequence: 41,
          execution: { agent_run_id: TASK_AGENT_RUN_ID },
          task: { ...taskRecord, status: 'accepted' },
          settled_at: '2026-08-31T12:05:00.000Z',
        },
      });
    },
    state,
    ids: Object.freeze({
      rootTeamRunId: ROOT_TEAM_RUN_ID,
      teacherRunId: TEACHER_RUN_ID,
      configuredStudentRunId: CONFIGURED_STUDENT_RUN_ID,
      taskAgentRunId: TASK_AGENT_RUN_ID,
    }),
  };
});

onBeforeUnmount(() => {
  service.disconnect();
  const globalWindow = window as typeof window & { __taskAgentMonitorVisibilityProbe?: ProbeControl };
  delete globalWindow.__taskAgentMonitorVisibilityProbe;
});
</script>

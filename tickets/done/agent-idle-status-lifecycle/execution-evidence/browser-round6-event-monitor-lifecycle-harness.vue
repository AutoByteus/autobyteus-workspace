<template>
  <main data-testid="round6-harness" class="space-y-4 p-8">
    <h1>Round 6 Event Monitor and lifecycle browser validation</h1>

    <section aria-label="canonical agent lifecycle" class="flex items-center gap-2">
      <WorkspaceCommonStatusDot
        data-testid="agent-status-dot"
        kind="agent"
        :status="context.state.currentStatus"
      />
      <output data-testid="agent-status">{{ context.state.currentStatus }}</output>
    </section>

    <section aria-label="event monitor mutation state" class="space-x-4">
      <output data-testid="event-monitor-revision">{{ context.state.eventMonitorPresentationRevision }}</output>
      <output data-testid="event-monitor-count">{{ eventMonitorVisualCount }}</output>
      <output data-testid="tool-result">{{ toolResult }}</output>
      <output data-testid="tool-log-count">{{ toolLogCount }}</output>
    </section>

    <nav class="flex flex-wrap gap-2" aria-label="validation actions">
      <button data-testid="error-a" @click="dispatchStatus(AgentStatus.Error, 'error-a')">Error A</button>
      <button data-testid="tool-start-a" @click="dispatchToolStartA">Tool start A</button>
      <button data-testid="tool-log-a" @click="dispatchToolLogA">Tool log A</button>
      <button data-testid="running-a" @click="dispatchStatus(AgentStatus.Running, 'running-a')">Running A</button>
      <button data-testid="idle-a" @click="dispatchStatus(AgentStatus.Idle, 'idle-a')">Idle A</button>
      <button data-testid="tool-result-a" @click="dispatchToolResultA">Delayed result A</button>
      <button data-testid="running-b" @click="dispatchStatus(AgentStatus.Running, 'running-b')">Running B</button>
      <button data-testid="idle-b" @click="dispatchStatus(AgentStatus.Idle, 'idle-b')">Idle B</button>
    </nav>

    <output data-testid="event-log">{{ eventLog.join('|') }}</output>
  </main>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentStreamingService } from '~/services/agentStreaming/AgentStreamingService';
import type { ServerMessage } from '~/services/agentStreaming/protocol';
import { buildRecentEventMonitorPresentation } from '~/services/eventMonitor/recentEventMonitorWindow';
import { useAgentActivityStore } from '~/stores/agentActivityStore';

const now = new Date().toISOString();
const context = reactive(new AgentContext(
  {} as never,
  new AgentRunState('round6-browser-run', {
    id: 'round6-browser-run',
    messages: [],
    createdAt: now,
    updatedAt: now,
  }),
));
const service = new AgentStreamingService('ws://127.0.0.1/not-connected');
const eventLog = ref<string[]>([]);
const activityStore = useAgentActivityStore();

const dispatch = (message: ServerMessage, label: string): void => {
  (service as unknown as { dispatchMessage: (value: ServerMessage, target: AgentContext) => void })
    .dispatchMessage(message, context);
  eventLog.value.push(`${label}:${context.state.currentStatus}:r${context.state.eventMonitorPresentationRevision}`);
};

const dispatchStatus = (status: AgentStatus, label: string): void => {
  dispatch({
    type: 'AGENT_STATUS',
    payload: {
      status,
      can_interrupt: status === AgentStatus.Running,
      agent_id: context.state.runId,
    },
  } as ServerMessage, label);
};

const dispatchToolStartA = (): void => dispatch({
  type: 'TOOL_EXECUTION_STARTED',
  payload: {
    invocation_id: 'round6-tool-a',
    tool_name: 'search',
    turn_id: 'round6-turn-a',
    arguments: { query: 'current-base lifecycle neutrality' },
  },
} as ServerMessage, 'tool-start-a');

const dispatchToolLogA = (): void => dispatch({
  type: 'TOOL_LOG',
  payload: {
    tool_invocation_id: 'round6-tool-a',
    tool_name: 'search',
    turn_id: 'round6-turn-a',
    log_entry: 'provider detail remains lifecycle-neutral',
  },
} as ServerMessage, 'tool-log-a');

const dispatchToolResultA = (): void => dispatch({
  type: 'TOOL_EXECUTION_SUCCEEDED',
  payload: {
    invocation_id: 'round6-tool-a',
    tool_name: 'search',
    turn_id: 'round6-turn-a',
    arguments: { query: 'current-base lifecycle neutrality' },
    result: { output: 'round6-delayed-result-retained' },
  },
} as ServerMessage, 'tool-result-a');

const presentation = computed(() => buildRecentEventMonitorPresentation(
  context.conversation,
  activityStore.getCompactionActivities(context.state.runId),
));

const eventMonitorVisualCount = computed(() => presentation.value.reduce((count, item) => (
  count + (item.kind === 'compaction'
    ? 1
    : item.message.type === 'user'
      ? 1
      : item.message.segments.length)
), 0));

const toolSegment = computed(() => context.conversation.messages
  .flatMap((message) => message.type === 'ai' ? message.segments : [])
  .find((segment) => 'invocationId' in segment && segment.invocationId === 'round6-tool-a'));

const toolResult = computed(() => {
  const segment = toolSegment.value;
  if (!segment || !('result' in segment) || segment.result == null) return '';
  return typeof segment.result === 'string' ? segment.result : JSON.stringify(segment.result);
});

const toolLogCount = computed(() => {
  const segment = toolSegment.value;
  return segment && 'logs' in segment && Array.isArray(segment.logs) ? segment.logs.length : 0;
});
</script>

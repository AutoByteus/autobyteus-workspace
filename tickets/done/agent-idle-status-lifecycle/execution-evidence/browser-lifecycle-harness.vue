<template>
  <main data-testid="lifecycle-harness" class="p-8">
    <h1>Lifecycle browser validation harness</h1>
    <section aria-label="agent lifecycle">
      <WorkspaceCommonStatusDot data-testid="agent-status-dot" kind="agent" :status="context.state.currentStatus" />
      <output data-testid="agent-status">{{ context.state.currentStatus }}</output>
    </section>
    <section aria-label="team aggregate lifecycle">
      <WorkspaceCommonStatusDot data-testid="team-status-dot" kind="team" :status="teamStatus" />
      <output data-testid="team-status">{{ teamStatus }}</output>
    </section>
    <button data-testid="run-a" @click="applyStatus(AgentStatus.Running, 'turn-a')">Run turn A</button>
    <button data-testid="idle-a" @click="applyStatus(AgentStatus.Idle, 'turn-a')">Idle turn A</button>
    <button data-testid="late-a" @click="applyLateActivity">Late activity for turn A</button>
    <button data-testid="run-b" @click="applyStatus(AgentStatus.Running, 'turn-b')">Run turn B</button>
    <button data-testid="idle-b" @click="applyStatus(AgentStatus.Idle, 'turn-b')">Idle turn B</button>
    <output data-testid="event-log">{{ eventLog.join('|') }}</output>
    <output data-testid="message-count">{{ context.conversation.messages.length }}</output>
  </main>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { applyLiveAgentStatusEvent } from '~/services/runStatus/agentRuntimeStatusState';
import { handleError } from '~/services/agentStreaming/handlers/agentStatusHandler';

const now = new Date().toISOString();
const context = reactive(new AgentContext(
  {} as never,
  new AgentRunState('browser-probe-run', {
    id: 'browser-probe-run',
    messages: [],
    createdAt: now,
    updatedAt: now,
  }),
));
const eventLog = ref<string[]>([]);
const teamStatus = computed(() => context.state.currentStatus);

const applyStatus = (status: AgentStatus, turnId: string): void => {
  applyLiveAgentStatusEvent(context, {
    status,
    can_interrupt: status === AgentStatus.Running,
    agent_id: 'browser-probe-run',
  });
  eventLog.value.push(`${turnId}:${status}`);
};

const applyLateActivity = (): void => {
  handleError({
    code: 'LATE_TURN_ACTIVITY',
    message: 'Late content for retired turn A',
  }, context);
  eventLog.value.push(`turn-a:late-activity:${context.state.currentStatus}`);
};
</script>

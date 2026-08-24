<template>
  <main class="min-h-screen bg-slate-100 p-8 text-slate-900" data-test="interrupt-result-probe">
    <section class="mx-auto max-w-2xl rounded-xl bg-white p-6 shadow">
      <h1 class="text-xl font-semibold">Interrupt result presentation probe</h1>
      <div class="mt-3 grid grid-cols-2 gap-2 text-sm">
        <p data-test="selection">selection={{ selectionStore.selectedType }}</p>
        <p data-test="status">status={{ activeContextStore.currentStatus }}</p>
        <p data-test="standalone-transcript">standaloneTranscript={{ standaloneContext.conversation.messages.length }}</p>
        <p data-test="team-transcript">teamTranscript={{ teamMemberContext.conversation.messages.length }}</p>
        <p data-test="team-active">teamActive={{ teamContext.view.isRootTeamActive() }}</p>
        <p data-test="team-member-status">teamMemberStatus={{ teamMemberContext.state.currentStatus }}</p>
      </div>
      <div class="mt-4 flex gap-2">
        <button data-test="select-standalone" type="button" @click="selectStandalone">Standalone</button>
        <button data-test="select-team" type="button" @click="selectTeam">Nested team member</button>
      </div>
      <div class="mt-6 rounded-lg border border-slate-200">
        <AgentUserInputTextArea />
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';
import AgentUserInputTextArea from '~/components/agentInput/AgentUserInputTextArea.vue';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentRunStore } from '~/stores/agentRunStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig';
import type { Conversation } from '~/types/conversation';
import { useToasts } from '~/composables/useToasts';
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures';

const STANDALONE_RUN_ID = 'browser-agent-run';
const TEAM_RUN_ID = 'browser-team-run';
const TEAM_MEMBER_ADDRESS = '/review_group/critic';
const TEAM_MEMBER_RUN_ID = 'browser-task-team-critic-run';

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
    createdAt: '2026-08-03T00:00:00.000Z',
    updatedAt: '2026-08-03T00:00:00.000Z',
    agentDefinitionId: definitionId,
  };
  const context = new AgentContext(config, new AgentRunState(runId, conversation));
  context.state.currentStatus = AgentStatus.Running;
  return context;
};

const standaloneContext = makeContext(STANDALONE_RUN_ID, 'browser-agent-definition');
const teamMemberContext = makeContext(TEAM_MEMBER_RUN_ID, 'browser-critic-definition');
const teamContext = buildTestTeamContext({
  teamRunId: TEAM_RUN_ID,
  teamDefinitionId: 'browser-team-definition',
  teamDefinitionName: 'Browser Team',
  coordinatorAddress: TEAM_MEMBER_ADDRESS,
  rootChildren: [testAgentNode(TEAM_MEMBER_ADDRESS, {
    agentRunId: TEAM_MEMBER_RUN_ID,
    agentDefinitionId: 'browser-critic-definition',
    displayName: 'Critic',
    currentStatus: AgentStatus.Running,
  })],
  contexts: [{ agentRunId: TEAM_MEMBER_RUN_ID, context: teamMemberContext }],
  focusedAgentRunId: TEAM_MEMBER_RUN_ID,
  isActive: true,
});

const selectionStore = useAgentSelectionStore();
const activeContextStore = useActiveContextStore();
const agentContextsStore = useAgentContextsStore();
const agentRunStore = useAgentRunStore();
const teamContextsStore = useAgentTeamContextsStore();
const teamRunStore = useAgentTeamRunStore();
const windowNodeContextStore = useWindowNodeContextStore();
const { toasts } = useToasts();

const selectStandalone = () => selectionStore.selectRunWithoutShellNavigation(STANDALONE_RUN_ID, 'agent');
const selectTeam = () => selectionStore.selectRunWithoutShellNavigation(TEAM_RUN_ID, 'team');

type InterruptProbeControl = {
  ready: boolean;
  selectStandalone: () => void;
  selectTeam: () => void;
  snapshot: () => Record<string, unknown>;
};

onMounted(() => {
  const wsPort = new URL(window.location.href).searchParams.get('wsPort');
  if (!wsPort) throw new Error('interrupt result probe requires wsPort');
  windowNodeContextStore.bindNodeContext('browser-probe-node', `http://127.0.0.1:${wsPort}`);
  agentContextsStore.runs.set(STANDALONE_RUN_ID, standaloneContext);
  teamContextsStore.addTeamContext(teamContext);
  selectStandalone();
  agentRunStore.connectToAgentStream(STANDALONE_RUN_ID);
  teamRunStore.connectToTeamStream(TEAM_RUN_ID);

  const globalWindow = window as typeof window & { __interruptProbe?: InterruptProbeControl };
  globalWindow.__interruptProbe = {
    ready: true,
    selectStandalone,
    selectTeam,
    snapshot: () => ({
      selectedType: selectionStore.selectedType,
      standaloneStatus: standaloneContext.state.currentStatus,
      standaloneSubscribed: standaloneContext.isSubscribed,
      standaloneTranscriptCount: standaloneContext.conversation.messages.length,
      teamIsActive: teamContext.view.isRootTeamActive(),
      teamSubscribed: teamRunStore.isTeamStreamReady(TEAM_RUN_ID),
      teamMemberStatus: teamMemberContext.state.currentStatus,
      teamTranscriptCount: teamMemberContext.conversation.messages.length,
      toastCount: toasts.value.length,
      toastMessages: toasts.value.map((toast) => toast.message),
    }),
  };
});

onBeforeUnmount(() => {
  agentRunStore.disconnectAgentStream(STANDALONE_RUN_ID);
  teamRunStore.disconnectTeamStream(TEAM_RUN_ID);
  const globalWindow = window as typeof window & { __interruptProbe?: InterruptProbeControl };
  delete globalWindow.__interruptProbe;
});
</script>

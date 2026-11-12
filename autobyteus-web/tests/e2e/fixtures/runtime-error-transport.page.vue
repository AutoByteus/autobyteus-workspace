<template>
  <main data-test="runtime-error-transport" class="min-h-screen bg-slate-100 p-4 text-slate-900">
    <section class="mx-auto max-w-3xl rounded-lg bg-white p-4">
      <h1 class="text-lg font-semibold">Runtime error transport validation</h1>
      <p data-test="scope">{{ run?.scope }} {{ run?.runId }}</p>
      <p role="alert" v-if="failure">{{ failure }}</p>
      <form @submit.prevent="send">
        <label for="runtime-message">Message</label>
        <textarea id="runtime-message" v-model="draft" class="block w-full border" />
        <button type="submit" :disabled="!connected || sending" class="my-2 rounded border p-2">Send message</button>
      </form>
      <div data-test="conversation" v-if="context">
        <template v-for="(message, index) in context.conversation.messages" :key="message.id">
          <AIMessage v-if="message.type === 'ai'" :message="message" :message-index="index"
            :run-id="context.state.runId" agent-name="Owned runtime fixture" />
        </template>
      </div>
    </section>
  </main>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref, shallowRef } from 'vue';
import AIMessage from '~/components/conversation/AIMessage.vue';
import { AgentStreamingService } from '~/services/agentStreaming/AgentStreamingService';
import { TeamStreamingService } from '~/services/agentStreaming/TeamStreamingService';
import { createTeamExecutionViewState } from '~/services/teamExecution/teamExecutionViewState';
import { createTeamAgentContext, createTeamConfigurationView } from '~/services/teamExecution/teamExecutionContextFactory';
import { parseAgentTeamAddress } from '~/types/agent/AgentTeamAddress';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig';
import { useAgentActivityStore } from '~/stores/agentActivityStore';

type Run = { scope: 'agent' | 'team'; rootId: string; runId: string; address: string; tree?: any };
const run = shallowRef<Run | null>(null);
const context = shallowRef<AgentContext | null>(null);
const draft = ref('');
const failure = ref('');
const connected = ref(false);
const sending = ref(false);
let stream: AgentStreamingService | TeamStreamingService | null = null;
let timer: ReturnType<typeof setInterval>;
const acks: unknown[] = [];
const configure = (input: { serverUrl: string; run: Run }) => {
  stream?.disconnect();
  run.value = input.run;
  const endpoint = input.serverUrl.replace(/^http/, 'ws').replace(/\/$/, '');
  if (input.run.scope === 'agent') {
    const config: AgentRunConfig = { agentDefinitionId: 'owned-runtime-fixture', agentDefinitionName: 'Owned runtime fixture',
      runtimeKind: 'antigravity_cli', llmModelIdentifier: 'gemini-3.8-flash-low', llmConfig: null,
      autoExecuteTools: true, workspaceId: null, workspaceMetadata: null, isLocked: true };
    context.value = reactive(new AgentContext(config, new AgentRunState(input.run.runId, {
      id: input.run.runId, messages: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }))) as AgentContext;
    context.value.state.currentStatus = AgentStatus.Idle;
    stream = new AgentStreamingService(endpoint + '/ws/agent', { onSendMessageCommandAck: (ack) => acks.push(ack) });
    stream.connect(input.run.runId, context.value);
  } else {
    const tree = input.run.tree;
    const address = parseAgentTeamAddress(input.run.address);
    const member = createTeamAgentContext({ tree, agentRunId: input.run.runId, address, workspaceMetadata: null });
    if (!member) throw new Error('Missing exact current Team member source');
    const view = createTeamExecutionViewState({ rootTeamRunId: input.run.rootId, rootActive: true,
      executionTree: tree, closedTaskExecutions: [], configuration: createTeamConfigurationView({ tree, workspaceMetadataByAddress: new Map() }),
      initialFocusedAgentRunId: input.run.runId,
      agentContexts: [{ agentRunId: input.run.runId, memberAddress: address, agentContext: member }],
      createAgentContext: (agentRunId, memberAddress, nextTree) => createTeamAgentContext({ tree: nextTree,
        agentRunId, address: memberAddress, workspaceMetadata: null }),
    });
    context.value = view.getAgentContext(input.run.runId);
    stream = new TeamStreamingService(endpoint + '/ws/agent-team');
    stream.connect(input.run.rootId, { view });
  }
  connected.value = false;
};
const send = async () => {
  if (!stream || !run.value) return;
  sending.value = true;
  try {
    const id = crypto.randomUUID();
    if (stream instanceof TeamStreamingService) await stream.sendMessage(draft.value, run.value.runId, [], [], { messageId: id, dedupeKey: id });
    else stream.sendMessage(draft.value, [], [], { messageId: id, dedupeKey: id });
    draft.value = '';
  } catch (error) { failure.value = String(error); }
  finally { sending.value = false; }
};
const snapshot = () => ({ run: run.value, ready: connected.value, failure: failure.value,
  conversation: context.value?.conversation, activities: run.value ? useAgentActivityStore().getToolActivities(run.value.runId) : [], acks });
onMounted(() => {
  window.__runtimeErrorTransport = { configure, snapshot };
  timer = setInterval(() => { connected.value = stream?.isReady ?? false; }, 25);
});
onBeforeUnmount(() => { clearInterval(timer); stream?.disconnect(); delete window.__runtimeErrorTransport; });
declare global { interface Window { __runtimeErrorTransport?: { configure: typeof configure; snapshot: typeof snapshot } } }
</script>

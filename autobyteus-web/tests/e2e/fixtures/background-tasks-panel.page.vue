<template>
  <main class="min-h-screen bg-slate-100 p-4 text-slate-900" data-test="background-tasks-probe">
    <div class="mb-3 flex gap-2 text-sm">
      <button data-test="select-standalone" type="button" @click="select(STANDALONE_RUN_ID)">Standalone run</button>
      <button data-test="select-other" type="button" @click="select(OTHER_RUN_ID)">Other run</button>
    </div>
    <!-- Right-panel width, as in the desktop workspace layout. -->
    <section data-test="right-panel" class="h-[640px] w-[380px] overflow-hidden rounded border border-gray-200 bg-white">
      <ProgressPanel />
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import ProgressPanel from '~/components/progress/ProgressPanel.vue';
import { dispatchAgentStreamMessage } from '~/services/agentStreaming/agentStreamMessageProjector';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig';
import type { Conversation } from '~/types/conversation';
import type { ServerMessage } from '~/services/agentStreaming/protocol';

const STANDALONE_RUN_ID = 'browser-claude-run';
const OTHER_RUN_ID = 'browser-codex-run';

const makeContext = (runId: string, runtimeKind: string): AgentContext => {
  const config: AgentRunConfig = {
    agentDefinitionId: runId, agentDefinitionName: runId, llmModelIdentifier: 'browser-probe-model',
    runtimeKind, workspaceId: null, workspaceMetadata: null, autoExecuteTools: false,
    llmConfig: null, isLocked: true,
  } as AgentRunConfig;
  const conversation: Conversation = {
    id: runId, messages: [], createdAt: '2026-09-29T16:00:00.000Z', updatedAt: '2026-09-29T16:00:00.000Z',
    agentDefinitionId: runId,
  };
  const context = new AgentContext(config, new AgentRunState(runId, conversation));
  context.state.currentStatus = AgentStatus.Idle;
  return context;
};

const contexts = new Map([
  [STANDALONE_RUN_ID, makeContext(STANDALONE_RUN_ID, 'claude_agent_sdk')],
  [OTHER_RUN_ID, makeContext(OTHER_RUN_ID, 'codex_app_server')],
]);
const agentContextsStore = useAgentContextsStore();
const selectionStore = useAgentSelectionStore();
const select = (runId: string) => selectionStore.selectRunWithoutShellNavigation(runId, 'agent');

onMounted(() => {
  for (const [runId, context] of contexts) agentContextsStore.runs.set(runId, context);
  select(STANDALONE_RUN_ID);
  const globalWindow = window as typeof window & { __backgroundTasksProbe?: Record<string, unknown> };
  globalWindow.__backgroundTasksProbe = {
    ready: true,
    select,
    /** Delivers one server message through the production stream projector for that run. */
    deliver: (runId: string, message: ServerMessage) => {
      const context = contexts.get(runId);
      if (!context) throw new Error(`unknown run ${runId}`);
      return dispatchAgentStreamMessage(message, { kind: 'standalone', runId, context });
    },
    status: (runId: string) => contexts.get(runId)?.state.currentStatus,
  };
});
</script>

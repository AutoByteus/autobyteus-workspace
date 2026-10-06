<template>
  <main data-test="drcs-agent-root-probe" class="min-h-screen bg-slate-100 p-4 text-slate-900">
    <h1 class="mb-4 text-xl font-semibold">Agent root delegated rows (delegated-row-clean-style API/E2E)</h1>
    <aside data-test="sidebar" class="bg-white p-2" :style="{ width: narrow ? '100%' : '360px' }">
      <div class="px-2 py-1 text-sm font-medium text-gray-800">research assistant</div>
      <AgentRunTaskRows run-id="host-run" label="research assistant" :run-selected="true" :has-collaboration="true" />
    </aside>
  </main>
</template>

<script setup lang="ts">
// Temporary API/E2E fixture: the production standalone-Agent-root delegated rows
// (AgentRunTaskRows -> WorkspaceTransientExecutionRow) over the real collaboration store,
// hydrated through the real GraphQL read path (transport emulated by the probe).
import { onBeforeUnmount, onMounted } from 'vue';
import AgentRunTaskRows from '~/components/workspace/history/AgentRunTaskRows.vue';
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore';

definePageMeta({ layout: false });
const narrow = useRoute().query.narrow === '1';
const store = useAgentRunCollaborationStore();
onMounted(() => {
  (window as any).__drcsAgentRoot = {
    selected: () => store.selectedChild('host-run'),
    rows: () => store.taskRows('host-run').map((entry) => ({ name: entry.row.displayName, kind: entry.row.memberKind, depth: entry.row.depth })),
  };
});
onBeforeUnmount(() => { delete (window as any).__drcsAgentRoot; });
</script>

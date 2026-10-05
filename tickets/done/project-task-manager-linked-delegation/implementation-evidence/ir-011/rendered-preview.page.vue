<template>
  <main class="min-h-screen bg-slate-100 p-4 text-slate-900" data-test="ir011-preview">
    <h1 class="mb-2 text-xl font-semibold">Standalone Task history — local integration preview</h1>
    <p class="mb-4 text-sm text-gray-600">Public fixture; stored inspection only, no runtime activation or submission.</p>
    <button class="mb-3 rounded border bg-white px-3 py-1 text-sm" data-test="refresh" @click="reload">Refresh stored children</button>
    <p v-if="loading" data-test="loading">Loading…</p>
    <p v-if="store.errors['host-run']" data-test="error" class="text-red-700">{{ store.errors['host-run'] }}</p>
    <aside class="w-[360px] max-w-full rounded border bg-white p-2">
      <button data-test="host" class="mb-2 w-full rounded px-2 py-1 text-left text-sm font-semibold focus-visible:ring-2" @click="store.selectChild('host-run', null)">Research Assistant</button>
      <AgentRunTaskRows run-id="host-run" label="Research Assistant" :run-selected="true" :has-collaboration="false" />
      <p v-if="!loading && !store.taskRows('host-run').length" data-test="empty" class="p-2 text-sm text-gray-500">No stored children.</p>
    </aside>
    <section v-if="messages" class="mt-4 h-[400px] max-w-full rounded border bg-white" data-test="messages">
      <CollaborationMessagesPanel :messages="messages" :rows="messages.listMessages()" />
    </section>
  </main>
</template>
<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import AgentRunTaskRows from '~/components/workspace/history/AgentRunTaskRows.vue';
import CollaborationMessagesPanel from '~/components/workspace/collaboration/CollaborationMessagesPanel.vue';
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore';
definePageMeta({ layout: false });
const store = useAgentRunCollaborationStore();
const loading = ref(false);
const messages = computed(() => store.childTargetFor('host-run')?.collaborationMessages ?? store.hostMessagesView('host-run'));
const reload = async () => { loading.value = true; await store.inspect('host-run'); loading.value = false; };
onMounted(async () => {
  (window as any).__ir011State = () => ({ loading: loading.value, selected: store.selectedChild('host-run'), target: store.childTargetFor('host-run')?.browse,
    rows: store.taskRows('host-run').map(x => x.row.displayName), error: store.errors['host-run'], labels: messages.value?.listMessages().map(x => x.counterpart.label) });
  await reload();
});
onBeforeUnmount(() => { store.release('host-run'); delete (window as any).__ir011State; });
</script>

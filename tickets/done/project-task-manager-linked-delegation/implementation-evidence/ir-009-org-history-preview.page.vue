<template>
  <main data-test="ir009-history-preview" class="min-h-screen bg-slate-100 p-4 text-slate-900">
    <h1 class="mb-2 text-xl font-semibold">Org history — local implementation preview</h1>
    <p class="mb-4 text-sm text-gray-600">Public facade fixture; runtime open/inspection callbacks are recorded only.</p>
    <button data-test="refresh" class="mb-3 rounded border bg-white px-3 py-1 text-sm" @click="history.refreshAgentOrgHistory()">Refresh Org history</button>
    <button data-test="scoped-refresh" class="mb-3 ml-2 rounded border bg-white px-3 py-1 text-sm" @click="history.refreshAgentOrgHistoryItem(selectedId)">Refresh selected Org</button>
    <p v-if="Object.keys(history.agentOrgHistoryItemErrors).length" data-test="row-error" class="p-2 text-xs text-red-600">{{ Object.values(history.agentOrgHistoryItemErrors)[0] }}</p>
    <aside class="w-[360px] max-w-full rounded border bg-white p-2">
      <div v-if="history.loading" data-test="loading" class="p-3 text-xs text-gray-500">Loading history…</div>
      <p v-if="history.historyFamilyErrors.agentOrg" data-test="org-error" class="p-2 text-xs text-red-600">{{ history.historyFamilyErrors.agentOrg }}</p>
      <div v-if="!history.loading && !nodes.length" data-test="empty" class="p-3 text-xs text-gray-500">No run history yet.</div>
      <section v-for="node in nodes" :key="node.workspaceId" class="mb-3">
        <h2 class="truncate px-2 text-xs font-semibold text-gray-500">{{ node.workspaceName }}</h2>
        <WorkspaceAgentOrgHistoryCollection :workspace-id="node.workspaceId" :groups="node.agentOrgDefinitions" :state="state" :actions="actions" :avatars="avatars" />
      </section>
    </aside>
  </main>
</template>
<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, reactive } from 'vue';
import WorkspaceAgentOrgHistoryCollection from '~/components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useWorkspaceHistoryTreeState } from '~/composables/useWorkspaceHistoryTreeState';
import type { WorkspaceHistorySectionActions, WorkspaceHistorySectionState, WorkspaceHistoryAvatarBindings } from '~/components/workspace/history/workspaceHistorySectionContracts';
definePageMeta({ layout: false });
const history = useRunHistoryStore();
let selectedId = "";
const nodes = computed(() => history.getTreeNodes());
const tree = useWorkspaceHistoryTreeState({ runHistoryStore: history, selectionStore: useAgentSelectionStore() });
const state = { ...tree, agentOrgContextFor: () => null } as unknown as WorkspaceHistorySectionState;
const calls = reactive<{ open: string[]; inspect: unknown[] }>({ open: [], inspect: [] });
const actions = {
  onOpenAgentOrgRun: (run) => { calls.open.push(run.rootRunId); },
  onInspectAgentOrgExecution: (run, agentRunId, address) => { calls.inspect.push({ rootRunId: run.rootRunId, agentRunId, address }); },
} as WorkspaceHistorySectionActions;
const avatars = { showOrgAvatar: () => false, getOrgAvatarUrl: () => '', onOrgAvatarError: () => {} } as WorkspaceHistoryAvatarBindings;
onMounted(async () => {
  (window as any).__ir009HistoryState = () => JSON.parse(JSON.stringify({ loading: history.loading, rows: history.agentOrgHistory, errors: history.historyFamilyErrors, rowErrors: history.agentOrgHistoryItemErrors, calls }));
  await history.fetchTree();
  selectedId = history.agentOrgHistory[0]?.rootRunId ?? "";
});
onBeforeUnmount(() => { delete (window as any).__ir009HistoryState; });
</script>

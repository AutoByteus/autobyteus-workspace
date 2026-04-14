<template>
  <div class="h-full flex-1 overflow-auto bg-slate-50">
    <div class="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <div class="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div class="relative flex-1 rounded-lg border border-slate-200 bg-white shadow-sm">
          <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M9 3a6 6 0 104.472 10.001l2.763 2.764a1 1 0 001.414-1.414l-2.764-2.763A6 6 0 009 3zm-4 6a4 4 0 118 0 4 4 0 01-8 0z" clip-rule="evenodd" />
            </svg>
          </div>
          <input
            type="text"
            v-model="searchQuery"
            name="agent-search"
            id="agent-search"
            class="block w-full rounded-lg border-transparent bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            :placeholder="$t('agents.components.agents.AgentList.search_agents_by_name_or_description')"
          />
        </div>

        <div class="flex items-center justify-end gap-2">
          <button
            @click="handleReload"
            :disabled="reloading"
            class="inline-flex items-center rounded-lg border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            :class="[
              reloading
                ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100',
            ]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="mr-2 h-4 w-4" :class="{'animate-spin': reloading}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {{ reloading ? $t('agents.components.agents.AgentList.reloading') : $t('agents.components.agents.AgentList.reload') }}
          </button>
          <button
            @click="$emit('navigate', { view: 'create' })"
            class="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >{{ $t('agents.components.agents.AgentList.create_agent') }}</button>
        </div>
      </div>

      <div v-if="syncError" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {{ syncError }}
      </div>
      <div v-if="syncInfo" class="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
        {{ syncInfo }}
      </div>
      <NodeSyncReportPanel
        v-if="lastAgentSyncReport"
        :report="lastAgentSyncReport"
        :title="$t('agents.components.agents.AgentList.agent_sync_report')"
        data-testid="agent-sync-report"
      />

      <div v-if="loading && !reloading" class="rounded-lg border border-slate-200 bg-white py-20 text-center shadow-sm">
        <div class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <p class="text-slate-600">{{ $t('agents.components.agents.AgentList.loading_agent_definitions') }}</p>
      </div>
      <div v-else-if="error" class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        <p class="font-bold">{{ $t('agents.components.agents.AgentList.error_loading_agent_definitions') }}</p>
        <p>{{ errorMessage }}</p>
      </div>

      <div v-else-if="filteredAgentDefinitions.length > 0" class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <AgentCard
          v-for="agentDef in filteredAgentDefinitions"
          :key="agentDef.id"
          :agent-def="agentDef"
          @view-details="viewDetails"
          @run-agent="runAgent"
          @sync-agent="syncAgent"
        />
      </div>

      <div v-else class="rounded-lg border border-slate-200 bg-white py-16 text-center shadow-sm">
        <div class="text-slate-500">
          <svg class="mx-auto mb-4 h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 7a4 4 0 014 4c0 1.37-.69 2.62-1.84 3.38-.42.28-.66.77-.66 1.28V17a1 1 0 01-1 1h-1.5a1 1 0 01-1-1v-1.34c0-.51-.25-1-.66-1.28A4 4 0 018 11a4 4 0 014-4zm-3 12h6M10 5.5a2 2 0 114 0" />
          </svg>
          <p class="mb-2 text-lg font-medium">{{ $t('agents.components.agents.AgentList.no_agents_found') }}</p>
          <p class="text-slate-400">
            {{ searchQuery.trim() ? $t('agents.components.agents.AgentList.emptyFiltered', { query: searchQuery.trim() }) : $t('agents.components.agents.AgentList.emptyDefault') }}
          </p>
        </div>
      </div>
    </div>

    <NodeSyncTargetPickerModal
      v-model="isTargetPickerOpen"
      :title="$t('agents.components.agents.AgentList.sync_agent')"
      :description="pendingSyncAgent ? $t('agents.components.agents.AgentList.syncTargetDescription', { name: pendingSyncAgent.name }) : null"
      :source-node-name="sourceNodeName"
      :targets="availableSyncTargets"
      :busy="nodeSyncStore.isRunning"
      :confirm-label="$t('agents.components.agents.AgentList.syncConfirmLabel')"
      @confirm="confirmAgentSync"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useAgentDefinitionStore, type AgentDefinition } from '~/stores/agentDefinitionStore';
import AgentCard from '~/components/agents/AgentCard.vue';
import { useRunActions } from '~/composables/useRunActions';
import { useNodeStore } from '~/stores/nodeStore';
import { useNodeSyncStore } from '~/stores/nodeSyncStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { EMBEDDED_NODE_ID } from '~/types/node';
import NodeSyncTargetPickerModal from '~/components/sync/NodeSyncTargetPickerModal.vue';
import NodeSyncReportPanel from '~/components/sync/NodeSyncReportPanel.vue';
import type { NodeSyncRunReport } from '~/types/nodeSync';
import { useToasts } from '~/composables/useToasts';

const emit = defineEmits(['navigate']);

const agentDefinitionStore = useAgentDefinitionStore();
const { prepareAgentRun } = useRunActions();
const { addToast } = useToasts();
const { deleteResult } = storeToRefs(agentDefinitionStore);
const nodeStore = useNodeStore();
const nodeSyncStore = useNodeSyncStore();
const windowNodeContextStore = useWindowNodeContextStore();

const agentDefinitions = computed(() => agentDefinitionStore.agentDefinitions);
const loading = computed(() => agentDefinitionStore.loading);
const error = computed<Error | null>(() => agentDefinitionStore.error instanceof Error ? agentDefinitionStore.error : agentDefinitionStore.error ? new Error(String(agentDefinitionStore.error)) : null);
const errorMessage = computed(() => error.value?.message || '');

const searchQuery = ref('');
const reloading = ref(false);
const syncInfo = ref<string | null>(null);
const syncError = ref<string | null>(null);
const pendingSyncAgent = ref<AgentDefinition | null>(null);
const isTargetPickerOpen = ref(false);
const availableSyncTargets = ref<Array<{ id: string; name: string; baseUrl: string }>>([]);
const lastAgentSyncReport = ref<NodeSyncRunReport | null>(null);

const sourceNodeId = computed(() => windowNodeContextStore.nodeId || EMBEDDED_NODE_ID);
const sourceNodeName = computed(() => nodeStore.getNodeById(sourceNodeId.value)?.name || 'Current Node');

// Watch for delete result and show it through the shared global toaster.
watch(deleteResult, (newResult) => {
  if (newResult) {
    addToast(newResult.message, newResult.success ? 'success' : 'error');
    agentDefinitionStore.clearDeleteResult();
  }
}, { immediate: true });

const filteredAgentDefinitions = computed(() => {
  if (!searchQuery.value) {
    return agentDefinitions.value;
  }
  const lowerCaseQuery = searchQuery.value.toLowerCase();
  return agentDefinitions.value.filter((agent) => {
    const name = agent.name?.toLowerCase() ?? '';
    const description = agent.description?.toLowerCase() ?? '';
    const ownerTeamName = agent.ownerTeamName?.toLowerCase() ?? '';
    const ownerApplicationName = agent.ownerApplicationName?.toLowerCase() ?? '';
    const ownerPackageId = agent.ownerPackageId?.toLowerCase() ?? '';
    const tools = (agent.toolNames ?? []).join(' ').toLowerCase();
    const skills = (agent.skillNames ?? []).join(' ').toLowerCase();
    return (
      name.includes(lowerCaseQuery)
      || description.includes(lowerCaseQuery)
      || ownerTeamName.includes(lowerCaseQuery)
      || ownerApplicationName.includes(lowerCaseQuery)
      || ownerPackageId.includes(lowerCaseQuery)
      || tools.includes(lowerCaseQuery)
      || skills.includes(lowerCaseQuery)
    );
  });
});

onMounted(() => {
  // Fetch main agent definitions
  if (agentDefinitions.value.length === 0) {
    agentDefinitionStore.fetchAllAgentDefinitions();
  }

  nodeStore.initializeRegistry().catch((error) => {
    syncError.value = error instanceof Error ? error.message : String(error);
  });
  nodeSyncStore.initialize().catch((error) => {
    syncError.value = error instanceof Error ? error.message : String(error);
  });
});

const handleReload = async () => {
  reloading.value = true;
  try {
    await agentDefinitionStore.reloadAllAgentDefinitions();
  } catch (e) {
    console.error("Failed to reload agents:", e);
    // Optionally show a notification to the user
  } finally {
    reloading.value = false;
  }
};

const viewDetails = (agentDefinitionId: string) => {
  emit('navigate', { view: 'detail', id: agentDefinitionId });
};

const runAgent = (agentDef: AgentDefinition) => {
  prepareAgentRun(agentDef);
  navigateTo('/workspace');
};

const syncAgent = async (agentDef: AgentDefinition): Promise<void> => {
  syncInfo.value = null;
  syncError.value = null;
  lastAgentSyncReport.value = null;

  if ((agentDef.ownershipScope ?? 'SHARED') !== 'SHARED') {
    syncError.value = 'Only shared agents can be synced individually.';
    return;
  }

  const targetNodes = nodeStore.nodes.filter((node) => node.id !== sourceNodeId.value);
  if (targetNodes.length === 0) {
    syncError.value = 'No target nodes available for sync.';
    return;
  }

  pendingSyncAgent.value = agentDef;
  availableSyncTargets.value = targetNodes.map((node) => ({
    id: node.id,
    name: node.name,
    baseUrl: node.baseUrl,
  }));
  isTargetPickerOpen.value = true;
};

const confirmAgentSync = async (targetNodeIds: string[]): Promise<void> => {
  if (!pendingSyncAgent.value) {
    return;
  }

  try {
    const result = await nodeSyncStore.runSelectiveAgentSync({
      sourceNodeId: sourceNodeId.value,
      targetNodeIds,
      agentDefinitionIds: [pendingSyncAgent.value.id],
      includeDependencies: true,
      includeDeletes: false,
    });

    lastAgentSyncReport.value = result.report ?? null;
    const successCount = result.targetResults.filter((target) => target.status === 'success').length;
    if (result.status === 'failed') {
      syncError.value = result.error || 'Agent sync failed.';
      return;
    }

    syncInfo.value = `Agent sync ${result.status}. ${successCount}/${result.targetResults.length} target(s) succeeded.`;
  } catch (error) {
    syncError.value = error instanceof Error ? error.message : String(error);
  } finally {
    pendingSyncAgent.value = null;
  }
};
</script>

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
            placeholder="Search agents by name or description..."
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
            {{ reloading ? 'Reloading...' : 'Reload' }}
          </button>
          <button
            @click="$emit('navigate', { view: 'create' })"
            class="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Create Agent
          </button>
        </div>
      </div>

      <div v-if="syncError" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {{ syncError }}
      </div>
      <div v-if="runError" class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {{ runError }}
      </div>
      <div v-if="syncInfo" class="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
        {{ syncInfo }}
      </div>
      <NodeSyncReportPanel
        v-if="lastAgentSyncReport"
        :report="lastAgentSyncReport"
        title="Agent Sync Report"
        data-testid="agent-sync-report"
      />

      <div v-if="loading && !reloading" class="rounded-lg border border-slate-200 bg-white py-20 text-center shadow-sm">
        <div class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <p class="text-slate-600">Loading agent definitions...</p>
      </div>
      <div v-else-if="error" class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        <p class="font-bold">Error loading agent definitions:</p>
        <p>{{ error.message }}</p>
      </div>

      <div v-else-if="hasAnyResults" class="space-y-6">
        <div v-if="filteredAgentDefinitions.length > 0" class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AgentCard
            v-for="agentDef in filteredAgentDefinitions"
            :key="agentDef.id"
            :agent-def="agentDef"
            @view-details="viewDetails"
            @run-agent="runAgent"
            @sync-agent="syncAgent"
          />
        </div>

        <section
          v-for="section in remoteCatalogSections"
          :key="`remote-agents-${section.nodeId}`"
          class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div class="mb-3 flex items-center justify-between gap-2">
            <h3 class="text-sm font-semibold text-slate-900">{{ section.nodeName }}</h3>
            <span
              class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              :class="section.status === 'ready' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'"
            >
              {{ section.status.toUpperCase() }}
            </span>
          </div>
          <p v-if="section.errorMessage" class="mb-3 text-xs text-amber-700">{{ section.errorMessage }}</p>
          <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <RemoteAgentCard
              v-for="agent in section.agents"
              :key="`${section.nodeId}-${agent.definitionId}`"
              :agent="agent"
              :node-status="section.status"
              :node-error-message="section.errorMessage"
              :busy="Boolean(remoteRunBusyByAgentKey[`${section.nodeId}:${agent.definitionId}`])"
              @run="runRemoteAgent(section.nodeId, agent)"
            />
          </div>
        </section>
      </div>

      <div v-else class="rounded-lg border border-slate-200 bg-white py-16 text-center shadow-sm">
        <div class="text-slate-500">
          <svg class="mx-auto mb-4 h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 7a4 4 0 014 4c0 1.37-.69 2.62-1.84 3.38-.42.28-.66.77-.66 1.28V17a1 1 0 01-1 1h-1.5a1 1 0 01-1-1v-1.34c0-.51-.25-1-.66-1.28A4 4 0 018 11a4 4 0 014-4zm-3 12h6M10 5.5a2 2 0 114 0" />
          </svg>
          <p class="mb-2 text-lg font-medium">No agents found</p>
          <p class="text-slate-400">
            {{ searchQuery.trim() ? `No agents matched "${searchQuery}"` : 'Create a new agent to get started.' }}
          </p>
        </div>
      </div>
    </div>

    <NodeSyncTargetPickerModal
      v-model="isTargetPickerOpen"
      title="Sync Agent"
      :description="pendingSyncAgent ? `Select target node(s) for '${pendingSyncAgent.name}'.` : null"
      :source-node-name="sourceNodeName"
      :targets="availableSyncTargets"
      :busy="nodeSyncStore.isRunning"
      confirm-label="Sync Agent"
      @confirm="confirmAgentSync"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useAgentDefinitionStore, type AgentDefinition } from '~/stores/agentDefinitionStore';
import AgentCard from '~/components/agents/AgentCard.vue';
import RemoteAgentCard from '~/components/agents/RemoteAgentCard.vue';
import {
  useHomeNodeRunLauncher,
  type HomeNodeRunnableAgent,
} from '~/composables/useHomeNodeRunLauncher';
import { useNodeStore } from '~/stores/nodeStore';
import { useNodeSyncStore } from '~/stores/nodeSyncStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { useFederatedCatalogStore } from '~/stores/federatedCatalogStore';
import { EMBEDDED_NODE_ID } from '~/types/node';
import NodeSyncTargetPickerModal from '~/components/sync/NodeSyncTargetPickerModal.vue';
import NodeSyncReportPanel from '~/components/sync/NodeSyncReportPanel.vue';
import type { NodeSyncRunReport } from '~/types/nodeSync';
import { useToasts } from '~/composables/useToasts';

const emit = defineEmits(['navigate']);

const agentDefinitionStore = useAgentDefinitionStore();
const { addToast } = useToasts();
const { launchFromCatalogAgent } = useHomeNodeRunLauncher();
const { deleteResult } = storeToRefs(agentDefinitionStore);
const nodeStore = useNodeStore();
const nodeSyncStore = useNodeSyncStore();
const windowNodeContextStore = useWindowNodeContextStore();
const federatedCatalogStore = useFederatedCatalogStore();

const agentDefinitions = computed(() => agentDefinitionStore.agentDefinitions);
const loading = computed(() => agentDefinitionStore.loading);
const error = computed(() => agentDefinitionStore.error);

const searchQuery = ref('');
const reloading = ref(false);
const syncInfo = ref<string | null>(null);
const syncError = ref<string | null>(null);
const runError = ref<string | null>(null);
const pendingSyncAgent = ref<AgentDefinition | null>(null);
const isTargetPickerOpen = ref(false);
const availableSyncTargets = ref<Array<{ id: string; name: string; baseUrl: string }>>([]);
const lastAgentSyncReport = ref<NodeSyncRunReport | null>(null);
const remoteRunBusyByAgentKey = ref<Record<string, boolean>>({});

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
    const tools = (agent.toolNames ?? []).join(' ').toLowerCase();
    const skills = (agent.skillNames ?? []).join(' ').toLowerCase();
    return (
      name.includes(lowerCaseQuery)
      || description.includes(lowerCaseQuery)
      || tools.includes(lowerCaseQuery)
      || skills.includes(lowerCaseQuery)
    );
  });
});

const remoteCatalogSections = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  return federatedCatalogStore.catalogByNode
    .filter((scope) => scope.nodeId !== sourceNodeId.value)
    .map((scope) => ({
      nodeId: scope.nodeId,
      nodeName: scope.nodeName,
      status: scope.status,
      errorMessage: scope.errorMessage,
      agents: scope.agents.filter((agent) => {
        if (!query) {
          return true;
        }
        return (
          agent.name.toLowerCase().includes(query)
          || agent.description.toLowerCase().includes(query)
          || agent.role.toLowerCase().includes(query)
          || (agent.toolNames ?? []).join(' ').toLowerCase().includes(query)
          || (agent.skillNames ?? []).join(' ').toLowerCase().includes(query)
        );
      }),
    }))
    .filter((scope) => scope.agents.length > 0 || Boolean(scope.errorMessage));
});

const hasAnyResults = computed(() =>
  filteredAgentDefinitions.value.length > 0 || remoteCatalogSections.value.length > 0,
);

onMounted(() => {
  // Fetch main agent definitions
  if (agentDefinitions.value.length === 0) {
    agentDefinitionStore.fetchAllAgentDefinitions();
  }

  Promise.resolve(nodeStore.initializeRegistry()).catch((error) => {
    syncError.value = error instanceof Error ? error.message : String(error);
  });
  Promise.resolve(federatedCatalogStore.loadCatalog()).catch((error) => {
    syncError.value = error instanceof Error ? error.message : String(error);
  });
  Promise.resolve(nodeSyncStore.initialize()).catch((error) => {
    syncError.value = error instanceof Error ? error.message : String(error);
  });
});

const handleReload = async () => {
  reloading.value = true;
  try {
    await Promise.all([
      agentDefinitionStore.reloadAllAgentDefinitions(),
      federatedCatalogStore.reloadCatalog(),
    ]);
  } catch (e) {
    console.error("Failed to reload agents:", e);
    // Optionally show a notification to the user
  } finally {
    reloading.value = false;
  }
};

const viewDetails = (agentId: string) => {
  emit('navigate', { view: 'detail', id: agentId });
};

const runAgent = async (agentDef: AgentDefinition): Promise<void> => {
  runError.value = null;
  const localRef: HomeNodeRunnableAgent = {
    homeNodeId: sourceNodeId.value,
    definitionId: agentDef.id,
    name: agentDef.name,
  };

  try {
    await launchFromCatalogAgent(localRef);
  } catch (error) {
    runError.value = error instanceof Error ? error.message : String(error);
  }
};

const runRemoteAgent = async (nodeId: string, agent: { definitionId: string; name: string }): Promise<void> => {
  runError.value = null;
  const agentKey = `${nodeId}:${agent.definitionId}`;
  remoteRunBusyByAgentKey.value = {
    ...remoteRunBusyByAgentKey.value,
    [agentKey]: true,
  };

  try {
    await launchFromCatalogAgent({
      homeNodeId: nodeId,
      definitionId: agent.definitionId,
      name: agent.name,
    });
  } catch (error) {
    runError.value = error instanceof Error ? error.message : String(error);
  } finally {
    const { [agentKey]: _removed, ...remaining } = remoteRunBusyByAgentKey.value;
    remoteRunBusyByAgentKey.value = remaining;
  }
};

const syncAgent = async (agentDef: AgentDefinition): Promise<void> => {
  syncInfo.value = null;
  syncError.value = null;
  lastAgentSyncReport.value = null;

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

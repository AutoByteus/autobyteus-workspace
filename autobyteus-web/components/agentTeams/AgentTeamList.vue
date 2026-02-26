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
            id="team-search"
            v-model="searchQuery"
            type="text"
            class="block w-full rounded-lg border-transparent bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            placeholder="Search teams by name"
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
            <svg xmlns="http://www.w3.org/2000/svg" class="mr-2 h-4 w-4" :class="{ 'animate-spin': reloading }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {{ reloading ? 'Reloading...' : 'Reload' }}
          </button>
          <button
            @click="$emit('navigate', { view: 'team-create' })"
            class="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Create Team
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
        v-if="lastTeamSyncReport"
        :report="lastTeamSyncReport"
        title="Team Sync Report"
        data-testid="team-sync-report"
      />

      <div v-if="loading && !reloading" class="rounded-lg border border-slate-200 bg-white py-20 text-center shadow-sm">
        <div class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <p class="text-slate-600">Loading agent team definitions...</p>
      </div>
      <div v-else-if="error" class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        <p class="font-bold">Error loading agent team definitions:</p>
        <p>{{ error.message }}</p>
      </div>
      <div v-else-if="hasAnyResults" class="space-y-6">
        <div v-if="filteredTeamDefinitions.length > 0" class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AgentTeamCard
            v-for="teamDef in filteredTeamDefinitions"
            :key="teamDef.id"
            :team-def="teamDef"
            @view-details="viewDetails"
            @run-team="handleRunTeam"
            @sync-team="syncTeam"
          />
        </div>

        <section
          v-for="section in remoteCatalogSections"
          :key="`remote-teams-${section.nodeId}`"
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
            <RemoteTeamCard
              v-for="team in section.teams"
              :key="`${section.nodeId}-${team.definitionId}`"
              :team="team"
              :node-status="section.status"
              :node-error-message="section.errorMessage"
              :busy="Boolean(remoteRunBusyByTeamKey[`${section.nodeId}:${team.definitionId}`])"
              @run="runRemoteTeam(section.nodeId, team)"
            />
          </div>
        </section>
      </div>
      <div v-else class="rounded-lg border border-slate-200 bg-white py-16 text-center shadow-sm">
        <div class="text-slate-500">
          <svg class="mx-auto mb-4 h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm4 3h10M7 14h6" />
          </svg>
          <p class="mb-2 text-lg font-medium">No teams found</p>
          <p class="text-slate-400">
            {{ searchQuery.trim() ? `No teams matched "${searchQuery}"` : 'Create your first agent team to get started.' }}
          </p>
        </div>
      </div>
    </div>

    <NodeSyncTargetPickerModal
      v-model="isTargetPickerOpen"
      title="Sync Team"
      :description="pendingSyncTeam ? `Select target node(s) for '${pendingSyncTeam.name}'.` : null"
      :source-node-name="sourceNodeName"
      :targets="availableSyncTargets"
      :busy="nodeSyncStore.isRunning"
      confirm-label="Sync Team"
      @confirm="confirmTeamSync"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useAgentTeamDefinitionStore, type AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore';
import AgentTeamCard from '~/components/agentTeams/AgentTeamCard.vue';
import RemoteTeamCard from '~/components/agentTeams/RemoteTeamCard.vue';
import { useRunActions } from '~/composables/useRunActions';
import {
  useHomeNodeRunLauncher,
  type HomeNodeRunnableTeam,
} from '~/composables/useHomeNodeRunLauncher';
import { useNodeStore } from '~/stores/nodeStore';
import { useNodeSyncStore } from '~/stores/nodeSyncStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { useFederatedCatalogStore } from '~/stores/federatedCatalogStore';
import { EMBEDDED_NODE_ID } from '~/types/node';
import NodeSyncTargetPickerModal from '~/components/sync/NodeSyncTargetPickerModal.vue';
import NodeSyncReportPanel from '~/components/sync/NodeSyncReportPanel.vue';
import type { NodeSyncRunReport } from '~/types/nodeSync';

const emit = defineEmits(['navigate']);

const store = useAgentTeamDefinitionStore();
const { launchFromCatalogTeam } = useHomeNodeRunLauncher();
const { prepareTeamRun } = useRunActions();
const router = useRouter();
const nodeStore = useNodeStore();
const nodeSyncStore = useNodeSyncStore();
const windowNodeContextStore = useWindowNodeContextStore();
const federatedCatalogStore = useFederatedCatalogStore();

const teamDefinitions = computed(() => store.agentTeamDefinitions);
const loading = computed(() => store.loading);
const error = computed(() => store.error);

const searchQuery = ref('');
const reloading = ref(false);
const syncInfo = ref<string | null>(null);
const syncError = ref<string | null>(null);
const runError = ref<string | null>(null);
const pendingSyncTeam = ref<AgentTeamDefinition | null>(null);
const isTargetPickerOpen = ref(false);
const availableSyncTargets = ref<Array<{ id: string; name: string; baseUrl: string }>>([]);
const lastTeamSyncReport = ref<NodeSyncRunReport | null>(null);
const remoteRunBusyByTeamKey = ref<Record<string, boolean>>({});

const sourceNodeId = computed(() => windowNodeContextStore.nodeId || EMBEDDED_NODE_ID);
const sourceNodeName = computed(() => nodeStore.getNodeById(sourceNodeId.value)?.name || 'Current Node');

const filteredTeamDefinitions = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) {
    return teamDefinitions.value;
  }
  return teamDefinitions.value.filter((teamDef) => teamDef.name.toLowerCase().includes(query));
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
      teams: scope.teams.filter((team) => {
        if (!query) {
          return true;
        }
        return (
          team.name.toLowerCase().includes(query)
          || team.description.toLowerCase().includes(query)
          || (team.role || '').toLowerCase().includes(query)
          || team.coordinatorMemberName.toLowerCase().includes(query)
        );
      }),
    }))
    .filter((scope) => scope.teams.length > 0 || Boolean(scope.errorMessage));
});

const hasAnyResults = computed(() =>
  filteredTeamDefinitions.value.length > 0 || remoteCatalogSections.value.length > 0,
);

onMounted(() => {
  if (teamDefinitions.value.length === 0) {
    store.fetchAllAgentTeamDefinitions();
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
      store.reloadAllAgentTeamDefinitions(),
      federatedCatalogStore.reloadCatalog(),
    ]);
  } catch (e) {
    console.error('Failed to reload agent teams:', e);
  } finally {
    reloading.value = false;
  }
};

const viewDetails = (teamId: string) => {
  emit('navigate', { view: 'team-detail', id: teamId });
};

const handleRunTeam = (teamDef: AgentTeamDefinition) => {
  prepareTeamRun(teamDef);
  router.push('/workspace');
};

const runRemoteTeam = async (nodeId: string, team: { definitionId: string; name: string }): Promise<void> => {
  runError.value = null;
  const teamKey = `${nodeId}:${team.definitionId}`;
  remoteRunBusyByTeamKey.value = {
    ...remoteRunBusyByTeamKey.value,
    [teamKey]: true,
  };

  const remoteTeam: HomeNodeRunnableTeam = {
    homeNodeId: nodeId,
    definitionId: team.definitionId,
    name: team.name,
  };

  try {
    await launchFromCatalogTeam(remoteTeam);
  } catch (error) {
    runError.value = error instanceof Error ? error.message : String(error);
  } finally {
    const { [teamKey]: _removed, ...remaining } = remoteRunBusyByTeamKey.value;
    remoteRunBusyByTeamKey.value = remaining;
  }
};

const syncTeam = async (teamDef: AgentTeamDefinition): Promise<void> => {
  syncInfo.value = null;
  syncError.value = null;
  lastTeamSyncReport.value = null;

  const targetNodes = nodeStore.nodes.filter((node) => node.id !== sourceNodeId.value);
  if (targetNodes.length === 0) {
    syncError.value = 'No target nodes available for sync.';
    return;
  }

  pendingSyncTeam.value = teamDef;
  availableSyncTargets.value = targetNodes.map((node) => ({
    id: node.id,
    name: node.name,
    baseUrl: node.baseUrl,
  }));
  isTargetPickerOpen.value = true;
};

const confirmTeamSync = async (targetNodeIds: string[]): Promise<void> => {
  if (!pendingSyncTeam.value) {
    return;
  }

  try {
    const result = await nodeSyncStore.runSelectiveTeamSync({
      sourceNodeId: sourceNodeId.value,
      targetNodeIds,
      agentTeamDefinitionIds: [pendingSyncTeam.value.id],
      includeDependencies: true,
      includeDeletes: false,
    });

    lastTeamSyncReport.value = result.report ?? null;
    const successCount = result.targetResults.filter((target) => target.status === 'success').length;
    if (result.status === 'failed') {
      syncError.value = result.error || 'Team sync failed.';
      return;
    }

    syncInfo.value = `Team sync ${result.status}. ${successCount}/${result.targetResults.length} target(s) succeeded.`;
  } catch (error) {
    syncError.value = error instanceof Error ? error.message : String(error);
  } finally {
    pendingSyncTeam.value = null;
  }
};
</script>

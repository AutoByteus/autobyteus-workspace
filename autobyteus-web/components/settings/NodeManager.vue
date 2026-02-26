<template>
  <div class="h-full flex flex-col overflow-hidden">
    <div class="flex items-center justify-between px-8 pt-8 pb-4 flex-shrink-0">
      <h2 class="text-xl font-semibold text-gray-900">Node Manager</h2>
    </div>

    <div class="flex-1 overflow-auto p-8 space-y-6">
      <section class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 class="text-sm font-semibold text-blue-800">Current Window Node</h3>
        <p class="mt-2 text-sm text-blue-900">
          {{ currentNode?.name || 'Unknown Node' }}
          <span class="ml-2 text-xs uppercase tracking-wide px-2 py-0.5 rounded bg-blue-100 text-blue-700">
            {{ currentNode?.nodeType || 'unknown' }}
          </span>
        </p>
        <p v-if="currentNode?.baseUrl" class="mt-1 text-xs text-blue-700 font-mono">
          {{ currentNode.baseUrl }}
        </p>
      </section>

      <section class="border border-gray-200 rounded-lg p-4">
        <h3 class="text-sm font-semibold text-gray-900">Discovery Sync</h3>
        <p class="mt-1 text-xs text-gray-500">
          Auto-register nodes discovered from the registry node bound to this window.
        </p>

        <div class="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span
            class="px-2 py-1 rounded"
            :class="nodeDiscoveryStore.running ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'"
            data-testid="discovery-running-state"
          >
            {{ nodeDiscoveryStore.running ? 'running' : 'stopped' }}
          </span>
          <span class="px-2 py-1 rounded bg-gray-100 text-gray-700" data-testid="discovery-known-count">
            discovered nodes: {{ discoveredNodeCount }}
          </span>
        </div>

        <div class="mt-3 flex flex-wrap items-center gap-2">
          <button
            class="px-3 py-1.5 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            :disabled="nodeDiscoveryStore.running"
            @click="onStartDiscovery"
            data-testid="discovery-start-button"
          >
            Start
          </button>
          <button
            class="px-3 py-1.5 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            :disabled="!nodeDiscoveryStore.running"
            @click="onStopDiscovery"
            data-testid="discovery-stop-button"
          >
            Stop
          </button>
          <button
            class="px-3 py-1.5 rounded-md border border-blue-300 text-sm text-blue-700 hover:bg-blue-50 disabled:opacity-50"
            :disabled="isRefreshingDiscovery"
            @click="onRefreshDiscovery"
            data-testid="discovery-refresh-button"
          >
            {{ isRefreshingDiscovery ? 'Refreshing...' : 'Refresh Now' }}
          </button>
        </div>

        <p
          v-if="nodeDiscoveryStore.lastError"
          class="mt-2 text-sm text-red-600"
          data-testid="discovery-last-error"
        >
          {{ nodeDiscoveryStore.lastError }}
        </p>
      </section>

      <section class="border border-gray-200 rounded-lg p-4">
        <h3 class="text-sm font-semibold text-gray-900">Add Remote Node</h3>
        <p class="text-xs text-gray-500 mt-1">
          Add a node and optionally bootstrap sync from this window's source node.
        </p>

        <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            v-model="addForm.name"
            type="text"
            placeholder="Node Name"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            data-testid="node-name-input"
          />
          <input
            v-model="addForm.baseUrl"
            type="text"
            placeholder="http://host:port"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
            data-testid="node-url-input"
          />
        </div>

        <div class="mt-3 flex items-center gap-2">
          <button
            class="px-4 py-2 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50"
            :disabled="isAdding || isSyncingBootstrap"
            @click="onAddRemoteNode"
            data-testid="add-node-button"
          >
            {{ isAdding ? 'Adding...' : 'Add Node' }}
          </button>
        </div>

        <label class="mt-3 flex items-center gap-2 text-sm text-gray-700">
          <input
            v-model="bootstrapSyncOnAdd"
            type="checkbox"
            class="rounded border-gray-300"
            data-testid="bootstrap-sync-on-add"
          />
          Bootstrap sync from current window node after add
        </label>

        <p v-if="isSyncingBootstrap" class="mt-2 text-xs text-blue-700">
          Running bootstrap sync...
        </p>
        <p v-if="addError" class="mt-2 text-sm text-red-600" data-testid="add-node-error">
          {{ addError }}
        </p>
        <p v-if="addInfo" class="mt-2 text-sm text-blue-600" data-testid="add-node-info">
          {{ addInfo }}
        </p>
        <ul v-if="addWarnings.length > 0" class="mt-2 text-xs text-amber-700 list-disc list-inside">
          <li v-for="warning in addWarnings" :key="warning">{{ warning }}</li>
        </ul>
      </section>

      <section class="border border-gray-200 rounded-lg p-4">
        <h3 class="text-sm font-semibold text-gray-900">Run Full Sync</h3>
        <p class="mt-1 text-xs text-gray-500">
          Select one source node and one or more target nodes.
        </p>

        <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">Source Node</label>
            <select
              v-model="fullSyncSourceNodeId"
              class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              data-testid="full-sync-source-select"
            >
              <option v-for="node in nodeStore.nodes" :key="node.id" :value="node.id">
                {{ node.name }} ({{ node.baseUrl }})
              </option>
            </select>
          </div>
        </div>

        <div class="mt-4">
          <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Target Nodes</p>
          <div v-if="availableTargetNodes.length === 0" class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            No target nodes available. Add at least one additional node.
          </div>
          <div v-else class="space-y-2">
            <label
              v-for="node in availableTargetNodes"
              :key="node.id"
              class="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 hover:bg-gray-50"
            >
              <input
                v-model="fullSyncTargetNodeIds"
                type="checkbox"
                :value="node.id"
                :data-testid="`full-sync-target-${node.id}`"
                class="rounded border-gray-300"
              />
              <span class="text-sm text-gray-800">{{ node.name }}</span>
              <span class="ml-auto text-xs font-mono text-gray-500">{{ node.baseUrl }}</span>
            </label>
          </div>
        </div>

        <div class="mt-4">
          <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Scope</p>
          <div class="flex flex-wrap gap-3">
            <label
              v-for="scopeOption in scopeOptions"
              :key="scopeOption.value"
              class="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-700"
            >
              <input
                v-model="fullSyncScope"
                type="checkbox"
                :value="scopeOption.value"
                class="rounded border-gray-300"
              />
              {{ scopeOption.label }}
            </label>
          </div>
        </div>

        <div class="mt-4 flex items-center gap-2">
          <button
            class="px-4 py-2 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50"
            :disabled="isRunningFullSync"
            @click="onRunFullSync"
            data-testid="full-sync-run-button"
          >
            {{ isRunningFullSync ? 'Syncing...' : 'Run Full Sync' }}
          </button>
        </div>

        <p v-if="fullSyncError" class="mt-2 text-sm text-red-600" data-testid="full-sync-error">
          {{ fullSyncError }}
        </p>
        <p v-if="fullSyncInfo" class="mt-2 text-sm text-blue-600" data-testid="full-sync-info">
          {{ fullSyncInfo }}
        </p>
        <NodeSyncReportPanel
          v-if="fullSyncReport"
          :report="fullSyncReport"
          title="Full Sync Report"
          data-testid="full-sync-report"
        />
      </section>

      <section class="border border-gray-200 rounded-lg overflow-hidden">
        <div class="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 class="text-sm font-semibold text-gray-900">Configured Nodes</h3>
        </div>

        <div class="divide-y divide-gray-200">
          <div
            v-for="node in nodeStore.nodes"
            :key="node.id"
            class="px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <input
                  v-model="renameDrafts[node.id]"
                  :disabled="node.nodeType === 'embedded' || busyNodeId === node.id"
                  class="w-full md:max-w-sm rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                  :data-testid="`node-name-${node.id}`"
                />
                <span class="text-xs uppercase tracking-wide px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                  {{ node.nodeType }}
                </span>
                <span class="text-xs uppercase tracking-wide px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                  {{ node.registrationSource || (node.nodeType === 'remote' ? 'manual' : 'embedded') }}
                </span>
                <span
                  class="text-xs px-2 py-0.5 rounded"
                  :class="{
                    'bg-green-100 text-green-700': node.capabilityProbeState === 'ready',
                    'bg-amber-100 text-amber-700': node.capabilityProbeState === 'degraded',
                    'bg-gray-100 text-gray-700': !node.capabilityProbeState || node.capabilityProbeState === 'unknown',
                  }"
                >
                  {{ node.capabilityProbeState || 'unknown' }}
                </span>
              </div>
              <p class="mt-1 text-xs text-gray-500 font-mono break-all">{{ node.baseUrl }}</p>
            </div>

            <div class="flex items-center gap-2">
              <button
                class="px-3 py-1.5 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                @click="onFocusNode(node.id)"
                :disabled="busyNodeId === node.id"
                :data-testid="`focus-node-${node.id}`"
              >
                Open
              </button>
              <button
                v-if="node.nodeType === 'remote'"
                class="px-3 py-1.5 rounded-md border border-blue-300 text-sm text-blue-700 hover:bg-blue-50"
                @click="onRenameNode(node.id)"
                :disabled="busyNodeId === node.id"
                :data-testid="`rename-node-${node.id}`"
              >
                Rename
              </button>
              <button
                v-if="node.nodeType === 'remote'"
                class="px-3 py-1.5 rounded-md border border-red-300 text-sm text-red-700 hover:bg-red-50"
                @click="onRemoveRemoteNode(node.id)"
                :disabled="busyNodeId === node.id"
                :data-testid="`remove-node-${node.id}`"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import NodeSyncReportPanel from '~/components/sync/NodeSyncReportPanel.vue';
import { useNodeDiscoveryStore } from '~/stores/nodeDiscoveryStore';
import { useNodeStore } from '~/stores/nodeStore';
import { useNodeSyncStore } from '~/stores/nodeSyncStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import type { NodeSyncRunReport, SyncEntityType } from '~/types/nodeSync';
import { probeNodeCapabilities } from '~/utils/nodeCapabilityProbe';
import { validateServerHostConfiguration } from '~/utils/nodeHostValidation';

const scopeOptions: Array<{ value: SyncEntityType; label: string }> = [
  { value: 'prompt', label: 'Prompts' },
  { value: 'agent_definition', label: 'Agents' },
  { value: 'agent_team_definition', label: 'Agent Teams' },
  { value: 'mcp_server_configuration', label: 'MCP Servers' },
];

const defaultFullSyncScope: SyncEntityType[] = scopeOptions.map((option) => option.value);

const nodeStore = useNodeStore();
const nodeDiscoveryStore = useNodeDiscoveryStore();
const nodeSyncStore = useNodeSyncStore();
const windowNodeContextStore = useWindowNodeContextStore();

const addForm = reactive({
  name: '',
  baseUrl: '',
});

const renameDrafts = reactive<Record<string, string>>({});
const isAdding = ref(false);
const isSyncingBootstrap = ref(false);
const isRunningFullSync = ref(false);
const busyNodeId = ref<string | null>(null);
const addError = ref<string | null>(null);
const addInfo = ref<string | null>(null);
const addWarnings = ref<string[]>([]);
const fullSyncError = ref<string | null>(null);
const fullSyncInfo = ref<string | null>(null);
const fullSyncReport = ref<NodeSyncRunReport | null>(null);
const bootstrapSyncOnAdd = ref(true);
const isRefreshingDiscovery = ref(false);
const fullSyncSourceNodeId = ref('');
const fullSyncTargetNodeIds = ref<string[]>([]);
const fullSyncScope = ref<SyncEntityType[]>([...defaultFullSyncScope]);

const currentNode = computed(() => nodeStore.getNodeById(windowNodeContextStore.nodeId));
const discoveredNodeCount = computed(() => {
  return nodeStore.nodes.filter((node) => node.nodeType === 'remote' && node.registrationSource === 'discovered').length;
});
const availableTargetNodes = computed(() => {
  return nodeStore.nodes.filter((node) => node.id !== fullSyncSourceNodeId.value);
});

function syncRenameDrafts(): void {
  const currentIds = new Set(nodeStore.nodes.map((node) => node.id));
  for (const node of nodeStore.nodes) {
    if (!renameDrafts[node.id]) {
      renameDrafts[node.id] = node.name;
    }
  }
  for (const nodeId of Object.keys(renameDrafts)) {
    if (!currentIds.has(nodeId)) {
      delete renameDrafts[nodeId];
    }
  }
}

function syncFullSyncDefaults(): void {
  const validSourceNodeIds = new Set(nodeStore.nodes.map((node) => node.id));
  if (!validSourceNodeIds.has(fullSyncSourceNodeId.value)) {
    fullSyncSourceNodeId.value = currentNode.value?.id || nodeStore.nodes[0]?.id || '';
  }

  const validTargetNodeIds = new Set(
    nodeStore.nodes
      .filter((node) => node.id !== fullSyncSourceNodeId.value)
      .map((node) => node.id),
  );

  fullSyncTargetNodeIds.value = fullSyncTargetNodeIds.value.filter((nodeId) => validTargetNodeIds.has(nodeId));
  if (fullSyncTargetNodeIds.value.length === 0) {
    fullSyncTargetNodeIds.value = [...validTargetNodeIds];
  }

  if (fullSyncScope.value.length === 0) {
    fullSyncScope.value = [...defaultFullSyncScope];
  }
}

async function onAddRemoteNode(): Promise<void> {
  if (isAdding.value) {
    return;
  }

  addError.value = null;
  addInfo.value = null;
  addWarnings.value = [];

  isAdding.value = true;
  try {
    const hostValidation = validateServerHostConfiguration(addForm.baseUrl);
    addWarnings.value = hostValidation.warnings.map((warning) => warning.message);

    const probeResult = await probeNodeCapabilities(hostValidation.normalizedBaseUrl, {
      timeoutMs: 1500,
    });

    const addedNode = await nodeStore.addRemoteNode({
      name: addForm.name,
      baseUrl: hostValidation.normalizedBaseUrl,
      capabilities: probeResult.capabilities,
      capabilityProbeState: probeResult.state,
    });

    if (bootstrapSyncOnAdd.value && currentNode.value) {
      isSyncingBootstrap.value = true;
      try {
        const bootstrapResult = await nodeSyncStore.runBootstrapSync({
          sourceNodeId: currentNode.value.id,
          targetNodeId: addedNode.id,
        });

        const successCount = bootstrapResult.targetResults.filter((target) => target.status === 'success').length;
        if (bootstrapResult.status === 'failed') {
          addError.value = bootstrapResult.error || 'Bootstrap sync failed.';
        } else {
          addInfo.value = `Node added. Bootstrap sync ${bootstrapResult.status} (${successCount}/${bootstrapResult.targetResults.length} target(s) succeeded).`;
        }
      } finally {
        isSyncingBootstrap.value = false;
      }
    } else if (probeResult.state !== 'ready') {
      addInfo.value =
        'Node added, but capability probe is degraded. Some optional features may stay disabled until the node is reachable.';
    } else if (addWarnings.value.length > 0) {
      addInfo.value = 'Node added with host warnings. Review generated URL behavior on this node.';
    } else {
      addInfo.value = 'Node added successfully.';
    }

    addForm.name = '';
    addForm.baseUrl = '';
    syncRenameDrafts();
    syncFullSyncDefaults();
  } catch (error) {
    addError.value = error instanceof Error ? error.message : String(error);
  } finally {
    isAdding.value = false;
  }
}

async function onRunFullSync(): Promise<void> {
  fullSyncError.value = null;
  fullSyncInfo.value = null;
  fullSyncReport.value = null;

  if (!fullSyncSourceNodeId.value) {
    fullSyncError.value = 'Source node is required.';
    return;
  }

  if (fullSyncTargetNodeIds.value.length === 0) {
    fullSyncError.value = 'At least one target node is required.';
    return;
  }

  if (fullSyncTargetNodeIds.value.includes(fullSyncSourceNodeId.value)) {
    fullSyncError.value = 'Source node cannot also be selected as a target.';
    return;
  }

  if (fullSyncScope.value.length === 0) {
    fullSyncError.value = 'Select at least one sync scope.';
    return;
  }

  isRunningFullSync.value = true;
  try {
    const result = await nodeSyncStore.runFullSync({
      sourceNodeId: fullSyncSourceNodeId.value,
      targetNodeIds: [...fullSyncTargetNodeIds.value],
      scope: [...fullSyncScope.value],
    });

    fullSyncReport.value = result.report ?? null;
    const successCount = result.targetResults.filter((target) => target.status === 'success').length;
    if (result.status === 'failed') {
      fullSyncError.value = result.error || 'Full sync failed.';
      return;
    }

    fullSyncInfo.value = `Full sync ${result.status}. ${successCount}/${result.targetResults.length} target(s) succeeded.`;
  } catch (error) {
    fullSyncError.value = error instanceof Error ? error.message : String(error);
  } finally {
    isRunningFullSync.value = false;
  }
}

async function onStartDiscovery(): Promise<void> {
  await nodeDiscoveryStore.startAutoRegistration();
}

function onStopDiscovery(): void {
  nodeDiscoveryStore.stopAutoRegistration();
}

async function onRefreshDiscovery(): Promise<void> {
  if (isRefreshingDiscovery.value) {
    return;
  }
  isRefreshingDiscovery.value = true;
  try {
    await nodeDiscoveryStore.syncOnce();
  } finally {
    isRefreshingDiscovery.value = false;
  }
}

async function onFocusNode(nodeId: string): Promise<void> {
  if (window.electronAPI?.openNodeWindow) {
    await window.electronAPI.openNodeWindow(nodeId);
  }
}

async function onRenameNode(nodeId: string): Promise<void> {
  if (busyNodeId.value) {
    return;
  }

  const nextName = renameDrafts[nodeId]?.trim() || '';
  const node = nodeStore.getNodeById(nodeId);
  if (!node) {
    return;
  }
  if (!nextName || nextName === node.name) {
    renameDrafts[nodeId] = node.name;
    return;
  }

  busyNodeId.value = nodeId;
  try {
    await nodeStore.renameNode(nodeId, nextName);
  } catch (error) {
    addError.value = error instanceof Error ? error.message : String(error);
    renameDrafts[nodeId] = node.name;
  } finally {
    busyNodeId.value = null;
  }
}

async function onRemoveRemoteNode(nodeId: string): Promise<void> {
  if (busyNodeId.value) {
    return;
  }

  const node = nodeStore.getNodeById(nodeId);
  if (!node || node.nodeType !== 'remote') {
    return;
  }

  const confirmed = window.confirm(`Remove node "${node.name}"?`);
  if (!confirmed) {
    return;
  }

  busyNodeId.value = nodeId;
  try {
    await nodeStore.removeRemoteNode(nodeId);
    syncFullSyncDefaults();
  } catch (error) {
    addError.value = error instanceof Error ? error.message : String(error);
  } finally {
    busyNodeId.value = null;
  }
}

watch(
  () => nodeStore.nodes,
  () => {
    syncRenameDrafts();
    syncFullSyncDefaults();
  },
  { deep: true },
);

watch(fullSyncSourceNodeId, () => {
  syncFullSyncDefaults();
});

onMounted(async () => {
  await nodeStore.initializeRegistry();
  await nodeSyncStore.initialize();
  syncRenameDrafts();
  syncFullSyncDefaults();
});
</script>

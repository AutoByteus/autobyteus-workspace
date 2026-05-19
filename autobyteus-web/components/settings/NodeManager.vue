<template>
  <div class="h-full flex flex-col overflow-hidden bg-slate-50">
    <div class="flex flex-shrink-0 items-center border-b border-slate-200 bg-white/95 px-8 py-4">
      <NodeManagerTabs v-model="activeTab" :aria-label="$t('settings.components.settings.NodeManager.node_manager')" />
    </div>

    <div class="flex-1 overflow-auto px-6 py-6 lg:px-8">
      <div
        v-if="activeTab === 'manage'"
        id="node-manager-panel-manage"
        class="mx-auto w-full max-w-7xl space-y-5"
        role="tabpanel"
        aria-labelledby="node-manager-tab-manage"
        data-testid="node-manager-panel-manage"
      >
        <CurrentWindowNodeCard :node-name="currentNode?.name || $t('settings.components.settings.NodeManager.currentNodeUnknown')" :node-type-label="currentNodeTypeLabel" :base-url="currentNode?.baseUrl" />

        <PhoneAccessCard v-if="windowNodeContextStore.isEmbeddedWindow" />

        <RemoteBrowserSharingPanel />

        <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 class="text-sm font-semibold text-gray-900">{{ $t('settings.components.settings.NodeManager.add_remote_node') }}</h3>
          <p class="text-xs text-gray-500 mt-1">{{ $t('settings.components.settings.NodeManager.add_a_node_and_optionally_bootstrap') }}</p>

          <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              v-model="addForm.name"
              type="text"
              :placeholder="$t('settings.components.settings.NodeManager.node_name')"
              class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              data-testid="node-name-input"
            />
            <input
              v-model="addForm.baseUrl"
              type="text"
              :placeholder="$t('settings.components.settings.NodeManager.http_host_port')"
              class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm shadow-sm transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              data-testid="node-url-input"
            />
          </div>

          <div class="mt-3 flex items-center gap-2">
            <button
              class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
              :disabled="isAdding || isSyncingBootstrap"
              @click="onAddRemoteNode"
              data-testid="add-node-button"
            >
              {{ isAdding ? $t('settings.components.settings.NodeManager.adding') : $t('settings.components.settings.NodeManager.addNode') }}
            </button>
          </div>

          <label class="mt-3 flex items-center gap-2 text-sm text-gray-700">
            <input
              v-model="bootstrapSyncOnAdd"
              type="checkbox"
              class="rounded border-slate-300 text-blue-600 focus:ring-blue-200"
              data-testid="bootstrap-sync-on-add"
            />{{ $t('settings.components.settings.NodeManager.bootstrap_sync_from_current_window_node') }}</label>

          <p v-if="isSyncingBootstrap" class="mt-2 text-xs text-blue-700">{{ $t('settings.components.settings.NodeManager.running_bootstrap_sync') }}</p>
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

        <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 class="text-sm font-semibold text-gray-900">{{ $t('settings.components.settings.NodeManager.run_full_sync') }}</h3>
          <p class="mt-1 text-xs text-gray-500">{{ $t('settings.components.settings.NodeManager.select_one_source_node_and_one') }}</p>

          <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-600">{{ $t('settings.components.settings.NodeManager.source_node') }}</label>
              <select
                v-model="fullSyncSourceNodeId"
                class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                data-testid="full-sync-source-select"
              >
                <option v-for="node in nodeStore.nodes" :key="node.id" :value="node.id">
                  {{ node.name }} ({{ node.baseUrl }})
                </option>
              </select>
            </div>
          </div>

          <div class="mt-4">
            <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">{{ $t('settings.components.settings.NodeManager.target_nodes') }}</p>
            <div v-if="availableTargetNodes.length === 0" class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">{{ $t('settings.components.settings.NodeManager.no_target_nodes_available_add_at') }}</div>
            <div v-else class="space-y-2">
              <label
                v-for="node in availableTargetNodes"
                :key="node.id"
                class="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40"
              >
                <input
                  v-model="fullSyncTargetNodeIds"
                  type="checkbox"
                  :value="node.id"
                  :data-testid="`full-sync-target-${node.id}`"
                  class="rounded border-slate-300 text-blue-600 focus:ring-blue-200"
                />
                <span class="text-sm text-gray-800">{{ node.name }}</span>
                <span class="ml-auto text-xs font-mono text-gray-500">{{ node.baseUrl }}</span>
              </label>
            </div>
          </div>

          <div class="mt-4">
            <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">{{ $t('settings.components.settings.NodeManager.scope') }}</p>
            <div class="flex flex-wrap gap-3">
              <label
                v-for="scopeOption in scopeOptions"
                :key="scopeOption.value"
                class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700"
              >
                <input
                  v-model="fullSyncScope"
                  type="checkbox"
                  :value="scopeOption.value"
                  class="rounded border-slate-300 text-blue-600 focus:ring-blue-200"
                />
                {{ $t(scopeOption.labelKey) }}
              </label>
            </div>
          </div>

          <div class="mt-4 flex items-center gap-2">
            <button
              class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
              :disabled="isRunningFullSync"
              @click="onRunFullSync"
              data-testid="full-sync-run-button"
            >
              {{ isRunningFullSync ? $t('settings.components.settings.NodeManager.syncing') : $t('settings.components.settings.NodeManager.run_full_sync') }}
            </button>
          </div>

          <p v-if="fullSyncError" class="mt-2 text-sm text-red-600" data-testid="full-sync-error">
            {{ fullSyncError }}
          </p>
          <p v-if="fullSyncInfo" class="mt-2 text-sm text-blue-600" data-testid="full-sync-info">
            {{ fullSyncInfo }}
          </p>
          <NodeSyncReportPanel v-if="fullSyncReport" :report="fullSyncReport" :title="$t('settings.components.settings.NodeManager.full_sync_report')" data-testid="full-sync-report" />
        </section>

        <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div class="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <h3 class="text-sm font-semibold text-gray-900">{{ $t('settings.components.settings.NodeManager.configured_nodes') }}</h3>
          </div>

          <div class="divide-y divide-slate-100">
            <div
              v-for="node in nodeStore.nodes"
              :key="node.id"
              class="flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50/80 md:flex-row md:items-center md:justify-between"
            >
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <input
                    v-model="renameDrafts[node.id]"
                    :disabled="node.nodeType === 'embedded' || busyNodeId === node.id"
                    class="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm shadow-sm transition disabled:bg-slate-50 disabled:text-slate-500 md:max-w-sm"
                    :data-testid="`node-name-${node.id}`"
                  />
                  <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                    {{ nodeTypeLabel(node.nodeType) }}
                  </span>
                  <span
                    class="rounded-full px-2.5 py-1 text-xs font-semibold"
                    :class="{
                      'bg-green-100 text-green-700': node.capabilityProbeState === 'ready',
                      'bg-amber-100 text-amber-700': node.capabilityProbeState === 'degraded',
                      'bg-gray-100 text-gray-700': !node.capabilityProbeState || node.capabilityProbeState === 'unknown',
                    }"
                  >
                    {{ capabilityStateLabel(node.capabilityProbeState) }}
                  </span>
                </div>
                <p class="mt-1 text-xs text-gray-500 font-mono break-all">{{ node.baseUrl }}</p>
              </div>

              <div class="flex items-center gap-2">
                <RemoteNodePairingControls :node="node" />
                <button
                  class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                  @click="onFocusNode(node.id)"
                  :disabled="isNodeBusy(node.id)"
                  :data-testid="`focus-node-${node.id}`"
                >
                  {{ $t('settings.components.settings.NodeManager.open') }}
                </button>
                <button
                  v-if="node.nodeType === 'remote'"
                  class="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition hover:border-blue-300 hover:bg-blue-100"
                  @click="onRenameNode(node.id)"
                  :disabled="isNodeBusy(node.id)"
                  :data-testid="`rename-node-${node.id}`"
                >
                  {{ $t('settings.components.settings.NodeManager.rename') }}
                </button>
                <button
                  v-if="node.nodeType === 'remote'"
                  class="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:border-red-300 hover:bg-red-100"
                  @click="onRemoveRemoteNode(node.id)"
                  :disabled="isNodeBusy(node.id)"
                  :data-testid="`remove-node-${node.id}`"
                >
                  {{ $t('settings.components.settings.NodeManager.remove') }}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
      <div
        v-else
        id="node-manager-panel-dockerGuide"
        class="mx-auto w-full max-w-7xl"
        role="tabpanel"
        aria-labelledby="node-manager-tab-dockerGuide"
        data-testid="node-manager-panel-dockerGuide"
      >
        <DockerNodeStartGuideCard />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import NodeSyncReportPanel from '~/components/sync/NodeSyncReportPanel.vue';
import CurrentWindowNodeCard from '~/components/settings/CurrentWindowNodeCard.vue';
import DockerNodeStartGuideCard from '~/components/settings/DockerNodeStartGuideCard.vue';
import NodeManagerTabs from '~/components/settings/NodeManagerTabs.vue';
import PhoneAccessCard from '~/components/settings/PhoneAccessCard.vue';
import RemoteBrowserSharingPanel from '~/components/settings/RemoteBrowserSharingPanel.vue';
import RemoteNodePairingControls from '~/components/settings/RemoteNodePairingControls.vue';
import { useLocalization } from '~/composables/useLocalization';
import { useNodeStore } from '~/stores/nodeStore';
import { useNodeSyncStore } from '~/stores/nodeSyncStore';
import { useRemoteBrowserSharingStore } from '~/stores/remoteBrowserSharingStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import type { NodeSyncRunReport, SyncEntityType } from '~/types/nodeSync';
import { probeNodeCapabilities } from '~/utils/nodeCapabilityProbe';
import { validateServerHostConfiguration } from '~/utils/nodeHostValidation';

const scopeOptions: Array<{ value: SyncEntityType; labelKey: string }> = [
  { value: 'agent_definition', labelKey: 'settings.components.settings.NodeManager.scope.agentDefinitions' },
  { value: 'agent_team_definition', labelKey: 'settings.components.settings.NodeManager.scope.agentTeams' },
  { value: 'mcp_server_configuration', labelKey: 'settings.components.settings.NodeManager.scope.mcpServers' },
];

const defaultFullSyncScope: SyncEntityType[] = scopeOptions.map((option) => option.value);
const { t } = useLocalization();

type NodeManagerTabId = 'manage' | 'dockerGuide';

const nodeStore = useNodeStore();
const nodeSyncStore = useNodeSyncStore();
const remoteBrowserSharingStore = useRemoteBrowserSharingStore();
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
const fullSyncSourceNodeId = ref('');
const fullSyncTargetNodeIds = ref<string[]>([]);
const fullSyncScope = ref<SyncEntityType[]>([...defaultFullSyncScope]);
const activeTab = ref<NodeManagerTabId>('manage');

const currentNode = computed(() => nodeStore.getNodeById(windowNodeContextStore.nodeId));
const nodeTypeLabel = (nodeType: string | undefined) =>
  t(`settings.components.settings.NodeManager.nodeType.${nodeType ?? 'unknown'}` as const);
const capabilityStateLabel = (state: string | undefined) =>
  t(`settings.components.settings.NodeManager.capability.${state ?? 'unknown'}` as const);
const currentNodeTypeLabel = computed(() => nodeTypeLabel(currentNode.value?.nodeType));
const availableTargetNodes = computed(() => nodeStore.nodes.filter((node) => node.id !== fullSyncSourceNodeId.value));

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
          addError.value = bootstrapResult.error || t('settings.components.settings.NodeManager.bootstrapSyncFailed');
        } else {
          addInfo.value = t('settings.components.settings.NodeManager.bootstrapSyncStatus', {
            status: bootstrapResult.status,
            successCount,
            targetCount: bootstrapResult.targetResults.length,
          });
        }
      } finally {
        isSyncingBootstrap.value = false;
      }
    } else if (probeResult.state !== 'ready') {
      addInfo.value = t('settings.components.settings.NodeManager.degradedInfo');
    } else if (addWarnings.value.length > 0) {
      addInfo.value = t('settings.components.settings.NodeManager.warningInfo');
    } else {
      addInfo.value = t('settings.components.settings.NodeManager.addedSuccess');
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
    fullSyncError.value = t('settings.components.settings.NodeManager.sourceNodeRequired');
    return;
  }

  if (fullSyncTargetNodeIds.value.length === 0) {
    fullSyncError.value = t('settings.components.settings.NodeManager.targetNodeRequired');
    return;
  }

  if (fullSyncTargetNodeIds.value.includes(fullSyncSourceNodeId.value)) {
    fullSyncError.value = t('settings.components.settings.NodeManager.sourceCannotAlsoBeTarget');
    return;
  }

  if (fullSyncScope.value.length === 0) {
    fullSyncError.value = t('settings.components.settings.NodeManager.selectSyncScope');
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
      fullSyncError.value = result.error || t('settings.components.settings.NodeManager.fullSyncFailed');
      return;
    }

    fullSyncInfo.value = t('settings.components.settings.NodeManager.fullSyncStatus', {
      status: result.status,
      successCount,
      targetCount: result.targetResults.length,
    });
  } catch (error) {
    fullSyncError.value = error instanceof Error ? error.message : String(error);
  } finally {
    isRunningFullSync.value = false;
  }
}

async function onFocusNode(nodeId: string): Promise<void> {
  if (window.electronAPI?.openNodeWindow) {
    await window.electronAPI.openNodeWindow(nodeId);
  }
}

function isNodeBusy(nodeId: string): boolean {
  return busyNodeId.value === nodeId || remoteBrowserSharingStore.busyNodeId === nodeId;
}

async function onRenameNode(nodeId: string): Promise<void> {
  if (isNodeBusy(nodeId)) {
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
  if (isNodeBusy(nodeId)) {
    return;
  }

  const node = nodeStore.getNodeById(nodeId);
  if (!node || node.nodeType !== 'remote') {
    return;
  }

  const confirmed = window.confirm(t('settings.components.settings.NodeManager.removeConfirm', { name: node.name }));
  if (!confirmed) {
    return;
  }

  busyNodeId.value = nodeId;
  const shouldRevokeLocalPairingOnFailure = node.browserPairing?.state === 'pairing' || node.browserPairing?.state === 'paired';
  let remoteCleanupConfirmed = false;
  try {
    const remoteClearError = await remoteBrowserSharingStore.prepareNodeRemoval(nodeId);
    remoteCleanupConfirmed = shouldRevokeLocalPairingOnFailure && remoteClearError === null;
    await nodeStore.removeRemoteNode(nodeId);
    if (remoteClearError) {
      addInfo.value = t(
        'settings.components.settings.NodeManager.remoteBrowserSharing.info.removeRemoteCleanupUnconfirmed',
        { error: remoteClearError },
      );
    }
    syncFullSyncDefaults();
  } catch (error) {
    if (remoteCleanupConfirmed) {
      try {
        await remoteBrowserSharingStore.revokeLocalPairing(
          nodeId,
          'revoked',
          'Node removal failed after remote browser cleanup completed.',
        );
      } catch {
        // Best-effort local cleanup only.
      }
    }
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
  await remoteBrowserSharingStore.initialize();
  syncRenameDrafts();
  syncFullSyncDefaults();
});
</script>

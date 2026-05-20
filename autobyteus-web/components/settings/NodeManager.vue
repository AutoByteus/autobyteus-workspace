<template>
  <div class="h-full flex flex-col overflow-hidden bg-slate-50">
    <div class="flex flex-shrink-0 items-center border-b border-slate-200 bg-white/95 px-8 py-4">
      <NodeManagerTabs v-model="activeTab" :ariaLabel="$t('settings.components.settings.NodeManager.node_manager')" />
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
          <p class="text-xs text-gray-500 mt-1">{{ $t('settings.components.settings.NodeManager.add_remote_node_description') }}</p>

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
              :disabled="isAdding"
              @click="onAddRemoteNode"
              data-testid="add-node-button"
            >
              {{ isAdding ? $t('settings.components.settings.NodeManager.adding') : $t('settings.components.settings.NodeManager.addNode') }}
            </button>
          </div>
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
import CurrentWindowNodeCard from '~/components/settings/CurrentWindowNodeCard.vue';
import DockerNodeStartGuideCard from '~/components/settings/DockerNodeStartGuideCard.vue';
import NodeManagerTabs from '~/components/settings/NodeManagerTabs.vue';
import PhoneAccessCard from '~/components/settings/PhoneAccessCard.vue';
import RemoteBrowserSharingPanel from '~/components/settings/RemoteBrowserSharingPanel.vue';
import RemoteNodePairingControls from '~/components/settings/RemoteNodePairingControls.vue';
import { useLocalization } from '~/composables/useLocalization';
import { useNodeStore } from '~/stores/nodeStore';
import { useRemoteBrowserSharingStore } from '~/stores/remoteBrowserSharingStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { probeNodeCapabilities } from '~/utils/nodeCapabilityProbe';
import { validateServerHostConfiguration } from '~/utils/nodeHostValidation';

const { t } = useLocalization();

type NodeManagerTabId = 'manage' | 'dockerGuide';

const nodeStore = useNodeStore();
const remoteBrowserSharingStore = useRemoteBrowserSharingStore();
const windowNodeContextStore = useWindowNodeContextStore();

const addForm = reactive({
  name: '',
  baseUrl: '',
});

const renameDrafts = reactive<Record<string, string>>({});
const isAdding = ref(false);
const busyNodeId = ref<string | null>(null);
const addError = ref<string | null>(null);
const addInfo = ref<string | null>(null);
const addWarnings = ref<string[]>([]);
const activeTab = ref<NodeManagerTabId>('manage');

const currentNode = computed(() => nodeStore.getNodeById(windowNodeContextStore.nodeId));
const nodeTypeLabel = (nodeType: string | undefined) =>
  t(`settings.components.settings.NodeManager.nodeType.${nodeType ?? 'unknown'}` as const);
const capabilityStateLabel = (state: string | undefined) =>
  t(`settings.components.settings.NodeManager.capability.${state ?? 'unknown'}` as const);
const currentNodeTypeLabel = computed(() => nodeTypeLabel(currentNode.value?.nodeType));

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

    await nodeStore.addRemoteNode({
      name: addForm.name,
      baseUrl: hostValidation.normalizedBaseUrl,
      capabilities: probeResult.capabilities,
      capabilityProbeState: probeResult.state,
    });

    if (probeResult.state !== 'ready') {
      addInfo.value = t('settings.components.settings.NodeManager.degradedInfo');
    } else if (addWarnings.value.length > 0) {
      addInfo.value = t('settings.components.settings.NodeManager.warningInfo');
    } else {
      addInfo.value = t('settings.components.settings.NodeManager.addedSuccess');
    }

    addForm.name = '';
    addForm.baseUrl = '';
    syncRenameDrafts();
  } catch (error) {
    addError.value = error instanceof Error ? error.message : String(error);
  } finally {
    isAdding.value = false;
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
  },
  { deep: true },
);

onMounted(async () => {
  await nodeStore.initializeRegistry();
  await remoteBrowserSharingStore.initialize();
  syncRenameDrafts();
});
</script>

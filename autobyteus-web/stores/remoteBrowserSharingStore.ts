import { defineStore } from 'pinia';
import { computed, reactive, ref, watch } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import { useAgentDefinitionOptionsStore } from '~/stores/agentDefinitionOptionsStore';
import { useNodeStore } from '~/stores/nodeStore';
import { useToolManagementStore } from '~/stores/toolManagementStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import type {
  NodeBrowserPairingState,
  NodeProfile,
  RemoteBrowserSharingSettings,
} from '~/types/node';
import {
  clearRemoteBrowserBridge,
  registerRemoteBrowserBridge,
} from '~/utils/nodeRemoteBrowserPairingClient';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export const useRemoteBrowserSharingStore = defineStore('remoteBrowserSharingStore', () => {
  const { t } = useLocalization();
  const agentDefinitionOptionsStore = useAgentDefinitionOptionsStore();
  const nodeStore = useNodeStore();
  const toolManagementStore = useToolManagementStore();
  const windowNodeContextStore = useWindowNodeContextStore();

  const settings = reactive<RemoteBrowserSharingSettings>({
    enabled: false,
    advertisedHost: '',
  });
  const requiresRestart = ref(false);
  const error = ref<string | null>(null);
  const info = ref<string | null>(null);
  const busyNodeId = ref<string | null>(null);
  const initialized = ref(false);
  let watcherRegistered = false;

  const currentNode = computed(() => nodeStore.getNodeById(windowNodeContextStore.nodeId));
  const currentNodePairingState = computed(() => currentNode.value?.browserPairing?.state ?? null);

  function pairingStateLabel(state: NodeBrowserPairingState | undefined): string {
    switch (state) {
      case 'pairing':
        return t('settings.components.settings.NodeManager.remoteBrowserSharing.pairingState.pairing');
      case 'paired':
        return t('settings.components.settings.NodeManager.remoteBrowserSharing.pairingState.paired');
      case 'revoked':
        return t('settings.components.settings.NodeManager.remoteBrowserSharing.pairingState.revoked');
      case 'expired':
        return t('settings.components.settings.NodeManager.remoteBrowserSharing.pairingState.expired');
      case 'rejected':
        return t('settings.components.settings.NodeManager.remoteBrowserSharing.pairingState.rejected');
      default:
        return t('settings.components.settings.NodeManager.remoteBrowserSharing.pairingState.unpaired');
    }
  }

  function pairingStateClass(state: NodeBrowserPairingState | undefined): string {
    if (state === 'paired') {
      return 'bg-emerald-100 text-emerald-700';
    }
    if (state === 'pairing') {
      return 'bg-blue-100 text-blue-700';
    }
    if (state === 'expired' || state === 'rejected') {
      return 'bg-red-100 text-red-700';
    }
    if (state === 'revoked') {
      return 'bg-amber-100 text-amber-700';
    }
    return 'bg-gray-100 text-gray-700';
  }

  async function refreshCurrentNodeBrowserCapability(nodeId: string): Promise<void> {
    if (currentNode.value?.id !== nodeId) {
      return;
    }

    try {
      await Promise.all([
        toolManagementStore.fetchLocalToolsGroupedByCategory(),
        agentDefinitionOptionsStore.fetchAllAvailableOptions(),
      ]);
    } catch {
      // Best-effort refresh; visible state still comes from node registry updates.
    }
  }

  function getRemoteNode(nodeId: string): NodeProfile | null {
    const node = nodeStore.getNodeById(nodeId);
    if (!node || node.nodeType !== 'remote') {
      return null;
    }
    return node;
  }

  async function loadSettings(): Promise<void> {
    if (!window.electronAPI?.getRemoteBrowserSharingSettings) {
      return;
    }

    const nextSettings = await window.electronAPI.getRemoteBrowserSharingSettings();
    settings.enabled = nextSettings.enabled;
    settings.advertisedHost = nextSettings.advertisedHost;
  }

  async function initialize(): Promise<void> {
    if (!initialized.value) {
      await loadSettings();
      initialized.value = true;
    }

    if (watcherRegistered) {
      return;
    }

    watch(currentNodePairingState, async (nextState, previousState) => {
      if (!currentNode.value || currentNode.value.nodeType !== 'remote' || nextState === previousState) {
        return;
      }

      await refreshCurrentNodeBrowserCapability(currentNode.value.id);
    });
    watcherRegistered = true;
  }

  async function saveSettings(): Promise<void> {
    if (!window.electronAPI?.updateRemoteBrowserSharingSettings) {
      error.value = t('settings.components.settings.NodeManager.remoteBrowserSharing.errors.electronOnly');
      return;
    }

    error.value = null;
    info.value = null;

    try {
      const result = await window.electronAPI.updateRemoteBrowserSharingSettings({
        enabled: settings.enabled,
        advertisedHost: settings.advertisedHost,
      });
      settings.enabled = result.settings.enabled;
      settings.advertisedHost = result.settings.advertisedHost;
      requiresRestart.value = result.requiresRestart;
      info.value = result.requiresRestart
        ? t('settings.components.settings.NodeManager.remoteBrowserSharing.info.settingsSavedNeedsRestart')
        : t('settings.components.settings.NodeManager.remoteBrowserSharing.info.settingsSaved');
    } catch (nextError) {
      error.value = getErrorMessage(nextError);
    }
  }

  async function pairNode(nodeId: string): Promise<void> {
    if (busyNodeId.value) {
      return;
    }

    const node = getRemoteNode(nodeId);
    if (!node) {
      return;
    }

    error.value = null;
    info.value = null;
    busyNodeId.value = nodeId;

    let descriptorIssued = false;
    try {
      if (
        !window.electronAPI?.issueRemoteBrowserBridgeDescriptor
        || !window.electronAPI.confirmRemoteBrowserBridgeDescriptor
      ) {
        throw new Error(t('settings.components.settings.NodeManager.remoteBrowserSharing.errors.pairingElectronOnly'));
      }

      const descriptor = await window.electronAPI.issueRemoteBrowserBridgeDescriptor(nodeId);
      descriptorIssued = true;
      await registerRemoteBrowserBridge(node.baseUrl, descriptor);
      await window.electronAPI.confirmRemoteBrowserBridgeDescriptor(nodeId);
      await refreshCurrentNodeBrowserCapability(nodeId);
      info.value = t('settings.components.settings.NodeManager.remoteBrowserSharing.info.paired', {
        name: node.name,
      });
    } catch (nextError) {
      const message = getErrorMessage(nextError);

      if (descriptorIssued) {
        try {
          await clearRemoteBrowserBridge(node.baseUrl);
        } catch {
          // Best-effort cleanup only.
        }

        try {
          await window.electronAPI?.revokeRemoteBrowserBridgeDescriptor?.(nodeId, 'rejected', message);
        } catch {
          // Best-effort cleanup only.
        }
      }

      error.value = message;
    } finally {
      busyNodeId.value = null;
    }
  }

  async function unpairNode(nodeId: string): Promise<void> {
    if (busyNodeId.value) {
      return;
    }

    const node = getRemoteNode(nodeId);
    if (!node) {
      return;
    }

    error.value = null;
    info.value = null;
    busyNodeId.value = nodeId;

    let remoteClearError: string | null = null;
    try {
      await clearRemoteBrowserBridge(node.baseUrl);
    } catch (nextError) {
      remoteClearError = getErrorMessage(nextError);
    }

    try {
      await window.electronAPI?.revokeRemoteBrowserBridgeDescriptor?.(nodeId, 'revoked', remoteClearError);
      await refreshCurrentNodeBrowserCapability(nodeId);
      info.value = remoteClearError
        ? t('settings.components.settings.NodeManager.remoteBrowserSharing.info.revokedRemoteCleanupUnconfirmed', {
            name: node.name,
            error: remoteClearError,
          })
        : t('settings.components.settings.NodeManager.remoteBrowserSharing.info.revoked', {
            name: node.name,
          });
    } catch (nextError) {
      error.value = getErrorMessage(nextError);
    } finally {
      busyNodeId.value = null;
    }
  }

  async function prepareNodeRemoval(nodeId: string): Promise<string | null> {
    const node = getRemoteNode(nodeId);
    if (!node) {
      return null;
    }

    if (!node.browserPairing || node.browserPairing.state === 'revoked' || node.browserPairing.state === 'expired') {
      return null;
    }

    try {
      await clearRemoteBrowserBridge(node.baseUrl);
      return null;
    } catch (nextError) {
      return getErrorMessage(nextError);
    }
  }

  async function revokeLocalPairing(
    nodeId: string,
    state: Extract<NodeBrowserPairingState, 'revoked' | 'expired' | 'rejected'> = 'revoked',
    errorMessage: string | null = null,
  ): Promise<void> {
    await window.electronAPI?.revokeRemoteBrowserBridgeDescriptor?.(nodeId, state, errorMessage);
    await refreshCurrentNodeBrowserCapability(nodeId);
  }

  return {
    settings,
    requiresRestart,
    error,
    info,
    busyNodeId,
    initialized,
    initialize,
    saveSettings,
    pairNode,
    unpairNode,
    prepareNodeRemoval,
    revokeLocalPairing,
    pairingStateLabel,
    pairingStateClass,
  };
});

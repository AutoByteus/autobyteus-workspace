import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { AxiosRequestConfig } from 'axios';
import apiService from '~/services/api';
import { useNodeStore } from '~/stores/nodeStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import type { NodeAdminClaimSummary } from '~/types/nodeAdminClaim';
import type {
  PairedDeviceSummary,
  RemoteAccessPairingSessionResponse,
  RemoteAccessSettings,
  RemoteAccessStatus,
  RemoteAccessUrlCandidate,
} from '~/types/remoteAccess';
import { normalizeNodeBaseUrl } from '~/utils/nodeEndpoints';
import {
  emptyNodeAdminClaimSummary,
  fetchRemoteAccessStatusFromBaseUrl,
  formatPhoneAccessRequestError,
  isPhoneAccessClaimAuthError,
  normalizeHttpsPhoneAccessCandidate,
  validatePhoneAccessAdvertisedUrl,
  type AdvertisedUrlValidation,
} from '~/utils/phoneAccessRemoteNode';

const defaultSettings = (): RemoteAccessSettings => ({
  phoneAccessEnabled: false,
  updatedAt: new Date(0).toISOString(),
});

type RemoteClaimUiState = 'unknown' | 'unavailable' | 'missing' | 'configured' | 'invalid';

export const usePhoneAccessStore = defineStore('phoneAccess', () => {
  const windowNodeContextStore = useWindowNodeContextStore();
  const nodeStore = useNodeStore();

  const settings = ref<RemoteAccessSettings>(defaultSettings());
  const candidates = ref<RemoteAccessUrlCandidate[]>([]);
  const activeDevices = ref<PairedDeviceSummary[]>([]);
  const revokedDevices = ref<PairedDeviceSummary[]>([]);
  const activePairing = ref<RemoteAccessPairingSessionResponse | null>(null);
  const selectedServerBaseUrl = ref('');
  const manualServerBaseUrl = ref('');
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const info = ref<string | null>(null);
  const nodeAdminClaimState = ref<RemoteClaimUiState>('unknown');
  const nodeAdminClaimSummary = ref<NodeAdminClaimSummary | null>(null);
  const nodeAdminClaimIdInput = ref('');
  const nodeAdminClaimSecretInput = ref('');
  const advertisedUrlVerified = ref(false);
  const advertisedUrlVerificationMessage = ref<string | null>(null);

  const phoneAccessEnabled = computed(() => settings.value.phoneAccessEnabled);
  const requiresNodeAdminClaim = computed(() => !windowNodeContextStore.isEmbeddedWindow);
  const managementBaseUrl = computed(() => normalizeNodeBaseUrl(windowNodeContextStore.nodeBaseUrl));
  const currentNode = computed(() => nodeStore.getNodeById(windowNodeContextStore.nodeId));
  const currentNodeName = computed(() => (
    requiresNodeAdminClaim.value
      ? currentNode.value?.name || 'AutoByteus Docker Node'
      : 'AutoByteus Desktop'
  ));
  const canManagePhoneAccess = computed(() => !requiresNodeAdminClaim.value || nodeAdminClaimState.value === 'configured');

  const selectedUrlValidation = computed<AdvertisedUrlValidation>(() =>
    validatePhoneAccessAdvertisedUrl(selectedServerBaseUrl.value, requiresNodeAdminClaim.value));

  function resetAdvertisedVerification(): void {
    advertisedUrlVerified.value = false;
    advertisedUrlVerificationMessage.value = null;
  }

  function selectDefaultCandidate(): void {
    if (requiresNodeAdminClaim.value || selectedServerBaseUrl.value) {
      return;
    }
    const httpsCandidates = candidates.value
      .map((candidate) => ({ candidate, normalizedBaseUrl: normalizeHttpsPhoneAccessCandidate(candidate) }))
      .filter((entry): entry is { candidate: RemoteAccessUrlCandidate; normalizedBaseUrl: string } => Boolean(entry.normalizedBaseUrl));
    const preferred = httpsCandidates.find((entry) => entry.candidate.kind !== 'loopback') || httpsCandidates[0];
    selectedServerBaseUrl.value = preferred?.normalizedBaseUrl || '';
  }

  async function loadNodeAdminClaimSummary(): Promise<void> {
    if (!requiresNodeAdminClaim.value) {
      nodeAdminClaimState.value = 'configured';
      nodeAdminClaimSummary.value = null;
      return;
    }
    if (!window.electronAPI?.getNodeAdminClaimSummary) {
      nodeAdminClaimState.value = 'unavailable';
      nodeAdminClaimSummary.value = emptyNodeAdminClaimSummary(windowNodeContextStore.nodeId, managementBaseUrl.value);
      return;
    }
    const summary = await window.electronAPI.getNodeAdminClaimSummary(windowNodeContextStore.nodeId, managementBaseUrl.value);
    nodeAdminClaimSummary.value = summary;
    nodeAdminClaimState.value = summary.status === 'configured' ? 'configured' : 'missing';
  }

  async function getOwnerRequestConfig(options: { required: boolean }): Promise<AxiosRequestConfig | null> {
    if (!requiresNodeAdminClaim.value) {
      return null;
    }
    if (!window.electronAPI?.getNodeAdminClaimHeaders) {
      nodeAdminClaimState.value = 'unavailable';
      if (options.required) {
        throw new Error('Remote Docker Phone Access management requires the Electron app claim store.');
      }
      return null;
    }
    const result = await window.electronAPI.getNodeAdminClaimHeaders(windowNodeContextStore.nodeId, managementBaseUrl.value);
    nodeAdminClaimSummary.value = result.summary;
    if (!result.ok) {
      nodeAdminClaimState.value = result.reason === 'missing' ? 'missing' : 'unavailable';
      if (options.required) {
        throw new Error('Paste the node-admin claim from the mobile-safe Docker launcher before managing Phone Access.');
      }
      return null;
    }
    nodeAdminClaimState.value = 'configured';
    return { headers: result.headers };
  }

  function handleOwnerRequestError(loadError: unknown): void {
    if (requiresNodeAdminClaim.value && isPhoneAccessClaimAuthError(loadError)) {
      nodeAdminClaimState.value = 'invalid';
    }
    error.value = formatPhoneAccessRequestError(loadError);
  }

  const getOwner = <T>(url: string, config: AxiosRequestConfig | null): Promise<{ data: T }> =>
    config ? apiService.get<T>(url, config) : apiService.get<T>(url);

  const postOwner = <T>(url: string, data: unknown, config: AxiosRequestConfig | null): Promise<{ data: T }> =>
    config ? apiService.post<T>(url, data, config) : apiService.post<T>(url, data);

  const putOwner = <T>(url: string, data: unknown, config: AxiosRequestConfig | null): Promise<{ data: T }> =>
    config ? apiService.put<T>(url, data, config) : apiService.put<T>(url, data);

  const deleteOwner = <T>(url: string, config: AxiosRequestConfig | null): Promise<{ data: T }> =>
    config ? apiService.delete<T>(url, config) : apiService.delete<T>(url);

  async function loadAll(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      await loadNodeAdminClaimSummary();
      const ownerConfig = await getOwnerRequestConfig({ required: false });
      if (requiresNodeAdminClaim.value && !ownerConfig) {
        candidates.value = [];
        activeDevices.value = [];
        revokedDevices.value = [];
        return;
      }
      const [settingsResponse, candidatesResponse, activeDevicesResponse, revokedDevicesResponse] = await Promise.all([
        getOwner<{ settings: RemoteAccessSettings }>('/remote-access/settings', ownerConfig),
        getOwner<{ candidates: RemoteAccessUrlCandidate[] }>('/remote-access/address-candidates', ownerConfig),
        getOwner<{ devices: PairedDeviceSummary[] }>('/remote-access/devices', ownerConfig),
        getOwner<{ devices: PairedDeviceSummary[] }>('/remote-access/devices/revoked', ownerConfig),
      ]);
      settings.value = settingsResponse.data.settings;
      candidates.value = candidatesResponse.data.candidates;
      activeDevices.value = activeDevicesResponse.data.devices;
      revokedDevices.value = revokedDevicesResponse.data.devices;
      selectDefaultCandidate();
    } catch (loadError) {
      handleOwnerRequestError(loadError);
    } finally {
      isLoading.value = false;
    }
  }

  async function registerNodeAdminClaim(): Promise<void> {
    error.value = null;
    info.value = null;
    if (!requiresNodeAdminClaim.value) {
      return;
    }
    if (!window.electronAPI?.registerNodeAdminClaim) {
      nodeAdminClaimState.value = 'unavailable';
      error.value = 'Remote Docker Phone Access management requires the Electron app claim store.';
      return;
    }
    try {
      const summary = await window.electronAPI.registerNodeAdminClaim({
        nodeId: windowNodeContextStore.nodeId,
        managementBaseUrl: managementBaseUrl.value,
        claimId: nodeAdminClaimIdInput.value,
        rawSecret: nodeAdminClaimSecretInput.value,
      });
      nodeAdminClaimSummary.value = summary;
      nodeAdminClaimState.value = 'configured';
      nodeAdminClaimIdInput.value = '';
      nodeAdminClaimSecretInput.value = '';
      info.value = 'Node-admin claim saved locally for this Docker node.';
      await loadAll();
    } catch (claimError) {
      error.value = formatPhoneAccessRequestError(claimError);
    }
  }

  async function clearNodeAdminClaim(): Promise<void> {
    if (!requiresNodeAdminClaim.value || !window.electronAPI?.clearNodeAdminClaim) {
      return;
    }
    const summary = await window.electronAPI.clearNodeAdminClaim(windowNodeContextStore.nodeId, managementBaseUrl.value);
    nodeAdminClaimSummary.value = summary;
    nodeAdminClaimState.value = 'missing';
    info.value = 'Node-admin claim removed from this desktop.';
  }

  async function setEnabled(enabled: boolean): Promise<void> {
    error.value = null;
    const ownerConfig = await getOwnerRequestConfig({ required: true });
    const response = await putOwner<{ settings: RemoteAccessSettings }>('/remote-access/settings', {
      phoneAccessEnabled: enabled,
    }, ownerConfig);
    settings.value = response.data.settings;
    if (!enabled) {
      activePairing.value = null;
    }
  }

  async function refreshCandidates(): Promise<void> {
    error.value = null;
    const params: Record<string, string> = {};
    if (manualServerBaseUrl.value.trim()) {
      params.manualServerBaseUrl = manualServerBaseUrl.value.trim();
      selectedServerBaseUrl.value = normalizeNodeBaseUrl(manualServerBaseUrl.value);
      resetAdvertisedVerification();
    }
    const ownerConfig = await getOwnerRequestConfig({ required: requiresNodeAdminClaim.value });
    const response = await apiService.get<{ candidates: RemoteAccessUrlCandidate[] }>('/remote-access/address-candidates', {
      ...(ownerConfig ?? {}),
      params,
    });
    candidates.value = response.data.candidates;
    if (!manualServerBaseUrl.value.trim()) {
      selectDefaultCandidate();
    }
  }

  async function verifyAdvertisedUrlForRemoteQr(): Promise<string | null> {
    resetAdvertisedVerification();
    const validation = selectedUrlValidation.value;
    if (!validation.isValid || !validation.isHttps || !validation.isAndroidFacing) {
      return validation.message || 'Enter a private Android-facing HTTPS URL for this Docker node.';
    }
    try {
      const [managementResponse, advertisedStatus] = await Promise.all([
        apiService.get<RemoteAccessStatus>('/remote-access/status'),
        fetchRemoteAccessStatusFromBaseUrl(validation.normalizedBaseUrl),
      ]);
      const managementId = managementResponse.data.serverInstanceId;
      const advertisedId = advertisedStatus.serverInstanceId;
      if (!managementId || !advertisedId) {
        return 'Could not verify this URL because one status response does not include a server instance ID.';
      }
      if (managementId !== advertisedId) {
        return 'The Android-facing URL reaches a different AutoByteUs node. Map the HTTPS URL to this Docker node, then retry.';
      }
      advertisedUrlVerified.value = true;
      advertisedUrlVerificationMessage.value = 'Android-facing URL verified for this Docker node.';
      return null;
    } catch (verifyError) {
      return `${formatPhoneAccessRequestError(verifyError)} Use a private HTTPS URL mapped to this Docker node, such as Tailscale Serve.`;
    }
  }

  async function createPairingSession(): Promise<void> {
    error.value = null;
    info.value = null;
    if (!phoneAccessEnabled.value) {
      error.value = 'Enable Phone Access before creating a QR code.';
      return;
    }
    if (!selectedServerBaseUrl.value.trim() || (requiresNodeAdminClaim.value && !manualServerBaseUrl.value.trim())) {
      error.value = requiresNodeAdminClaim.value
        ? 'Enter the Android-facing HTTPS URL for this Docker node first.'
        : 'Choose or enter a server URL first.';
      return;
    }
    try {
      const validation = selectedUrlValidation.value;
      if (!validation.isValid || !validation.isHttps || (requiresNodeAdminClaim.value && !validation.isAndroidFacing)) {
        error.value = validation.message;
        return;
      }
      if (requiresNodeAdminClaim.value) {
        const verifyError = await verifyAdvertisedUrlForRemoteQr();
        if (verifyError) {
          error.value = verifyError;
          return;
        }
      }
      const ownerConfig = await getOwnerRequestConfig({ required: true });
      const response = await postOwner<RemoteAccessPairingSessionResponse>('/remote-access/pairing-sessions', {
        serverBaseUrl: validation.normalizedBaseUrl,
        serverName: currentNodeName.value,
      }, ownerConfig);
      activePairing.value = response.data;
      info.value = requiresNodeAdminClaim.value
        ? 'Pairing QR code created for the verified Docker node URL.'
        : 'Pairing QR code created.';
    } catch (createError) {
      handleOwnerRequestError(createError);
    }
  }

  async function refreshDevices(): Promise<void> {
    const ownerConfig = await getOwnerRequestConfig({ required: true });
    const [activeResponse, revokedResponse] = await Promise.all([
      getOwner<{ devices: PairedDeviceSummary[] }>('/remote-access/devices', ownerConfig),
      getOwner<{ devices: PairedDeviceSummary[] }>('/remote-access/devices/revoked', ownerConfig),
    ]);
    activeDevices.value = activeResponse.data.devices;
    revokedDevices.value = revokedResponse.data.devices;
  }

  async function revokeDevice(deviceId: string): Promise<void> {
    const ownerConfig = await getOwnerRequestConfig({ required: true });
    await deleteOwner(`/remote-access/devices/${encodeURIComponent(deviceId)}`, ownerConfig);
    await refreshDevices();
  }

  async function revokeAllDevices(): Promise<number> {
    const ownerConfig = await getOwnerRequestConfig({ required: true });
    const response = await deleteOwner<{ result: { revokedCount: number } }>('/remote-access/devices', ownerConfig);
    await refreshDevices();
    return response.data.result.revokedCount;
  }

  return {
    settings,
    candidates,
    activeDevices,
    revokedDevices,
    activePairing,
    selectedServerBaseUrl,
    manualServerBaseUrl,
    isLoading,
    error,
    info,
    nodeAdminClaimState,
    nodeAdminClaimSummary,
    nodeAdminClaimIdInput,
    nodeAdminClaimSecretInput,
    advertisedUrlVerified,
    advertisedUrlVerificationMessage,
    phoneAccessEnabled,
    requiresNodeAdminClaim,
    managementBaseUrl,
    currentNodeName,
    canManagePhoneAccess,
    selectedUrlValidation,
    loadAll,
    loadNodeAdminClaimSummary,
    registerNodeAdminClaim,
    clearNodeAdminClaim,
    setEnabled,
    refreshCandidates,
    verifyAdvertisedUrlForRemoteQr,
    createPairingSession,
    refreshDevices,
    revokeDevice,
    revokeAllDevices,
  };
});

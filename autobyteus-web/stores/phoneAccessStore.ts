import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import apiService from '~/services/api';
import { useNodeStore } from '~/stores/nodeStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { EMBEDDED_ENTRY_ID } from '~/types/node';
import type {
  ConnectionWay,
  NodeNetwork,
  PairedDeviceSummary,
  RemoteAccessPairingSessionResponse,
  RemoteAccessSettings,
  RemoteAccessStatus,
} from '~/types/remoteAccess';
import { normalizeNodeBaseUrl } from '~/utils/nodeEndpoints';
import {
  blockedReason as computeBlockedReason,
  composeConnectionWays,
  httpAcknowledgedFor,
  readinessFromChecks,
  recognizeNodeKind,
  recommendedWay as computeRecommendedWay,
  portOfBaseUrl,
  type BlockedReason,
  type ComposedWays,
  type PhoneNodeKind,
  type WayReadiness,
} from '~/utils/phoneAccess/phoneConnectionWays';
import { tailscaleServeHttpsPortFor } from '~/utils/phoneAccess/tailscaleServeCommand';
import { fetchRemoteAccessStatusFromBaseUrl, formatPhoneAccessRequestError } from '~/utils/phoneAccessRemoteNode';

/** Each address check gives up after 2 s; all run at once (QR-004). */
const ADDRESS_CHECK_TIMEOUT_MS = 2000;

export type PhoneCodePhase = 'none' | 'creating' | 'shown' | 'expired';

/** The code on screen: which way and address it holds, and the node's session to discard it. */
export type PhoneCode = {
  way: ConnectionWay;
  address: string;
  /** The address the user typed on the Company address tab ("the address you entered"). */
  typed: boolean;
  sessionId: string;
  qrText: string;
  expiresAt: string;
};

/** Why a typed company address made no code. */
export type TypedAddressError = { kind: 'not_this_node' } | { kind: 'refused'; message: string };

const emptyReadiness = (): WayReadiness => ({
  company_address: { ready: false, address: null },
  tailscale: { ready: false, address: null },
  vpn: { ready: false, address: null },
  local_network: { ready: false, address: null },
});

/** A request to the embedded node from another node's window (this computer's facts and its allowed networks). */
const requestEmbeddedNode = async <T>(baseUrl: string, path: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${normalizeNodeBaseUrl(baseUrl)}/rest${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Request to ${path} failed with HTTP ${response.status}.`);
  }
  return response.json() as Promise<T>;
};

export const usePhoneAccessStore = defineStore('phoneAccess', () => {
  const windowNodeContextStore = useWindowNodeContextStore();
  const nodeStore = useNodeStore();

  const isLoading = ref(false);
  const loadError = ref<string | null>(null);
  const phoneAccessEnabled = ref(false);
  const activeDevices = ref<PairedDeviceSummary[]>([]);
  const revokedDevices = ref<PairedDeviceSummary[]>([]);

  const kind = ref<PhoneNodeKind>('embedded');
  const targetNodeId = ref<string | null>(null);
  const targetNetwork = ref<NodeNetwork | null>(null);
  const composed = ref<ComposedWays | null>(null);
  const readiness = ref<WayReadiness>(emptyReadiness());
  const reachedAddresses = ref<Set<string>>(new Set());
  const isChecking = ref(false);
  /** Ways whose "Check again" found nothing (the plain note under the status). */
  const stillNotFound = ref<Set<ConnectionWay>>(new Set());

  const selectedWay = ref<ConnectionWay>('tailscale');
  const codePhase = ref<PhoneCodePhase>('none');
  const code = ref<PhoneCode | null>(null);
  const codeError = ref<string | null>(null);
  const typedAddressError = ref<TypedAddressError | null>(null);

  const currentEntry = computed(() => nodeStore.getEntryById(windowNodeContextStore.entryId));
  const embeddedEntry = computed(() => nodeStore.getEntryById(EMBEDDED_ENTRY_ID));
  const targetBaseUrl = computed(() =>
    normalizeNodeBaseUrl(currentEntry.value?.baseUrl || windowNodeContextStore.nodeBaseUrl));

  /** The node's name on the phone (DEC-016): this computer's name for the desktop's own node, else its name here. */
  const nodeName = computed(() => {
    const registryName = currentEntry.value?.name ?? '';
    if (kind.value === 'embedded') return targetNetwork.value?.computerName || registryName;
    return registryName;
  });

  const recommendedWay = computed(() => computeRecommendedWay(readiness.value));
  const blockedReason = computed<BlockedReason | null>(() =>
    composed.value && !isLoading.value ? computeBlockedReason(kind.value, composed.value, readiness.value) : null);
  const localNetworkAllowed = computed(() => composed.value?.localNetwork.allowed ?? false);
  const tailscaleHttpsReady = computed(() =>
    Boolean(composed.value?.tailscaleHttpsUrl && reachedAddresses.value.has(composed.value.tailscaleHttpsUrl)));
  /** The Tailscale Serve HTTPS port for a node on this computer other than the desktop's own; `null` otherwise. */
  const tailscaleServeHttpsPort = computed(() =>
    kind.value === 'local_container' ? tailscaleServeHttpsPortFor(windowNodeContextStore.entryId, nodeStore.nodes) : null);
  /** The Advanced command applies to nodes on this computer, where its Tailscale runs. */
  const offersTailscaleServeCommand = computed(() => kind.value !== 'remote' && readiness.value.tailscale.ready);
  const nodePort = computed(() => portOfBaseUrl(targetBaseUrl.value));

  async function readNetworkFacts(): Promise<void> {
    const response = await apiService.get<{ network: NodeNetwork }>('/remote-access/network');
    targetNetwork.value = response.data.network;
    kind.value = recognizeNodeKind({
      isEmbeddedEntry: windowNodeContextStore.isEmbeddedWindow,
      targetBaseUrl: targetBaseUrl.value,
      targetNetwork: response.data.network,
    });
    const hostNetwork = kind.value === 'local_container' && embeddedEntry.value
      ? (await requestEmbeddedNode<{ network: NodeNetwork }>(embeddedEntry.value.baseUrl, '/remote-access/network')).network
      : null;
    composed.value = composeConnectionWays({
      kind: kind.value,
      targetBaseUrl: targetBaseUrl.value,
      targetNetwork: response.data.network,
      hostNetwork,
      tailscaleServePort: tailscaleServeHttpsPortFor(windowNodeContextStore.entryId, nodeStore.nodes),
    });
  }

  /** Checks every candidate at once; an address counts only when it answers with this node's ID (REQ-003). */
  async function checkAddresses(): Promise<void> {
    const ways = composed.value;
    if (!ways) return;
    const all = [...new Set(Object.values(ways.candidates).flat())];
    const results = await Promise.allSettled(all.map((address) =>
      fetchRemoteAccessStatusFromBaseUrl(address, { timeoutMs: ADDRESS_CHECK_TIMEOUT_MS })));
    reachedAddresses.value = new Set(all.filter((_address, index) => {
      const result = results[index];
      return result?.status === 'fulfilled' && Boolean(targetNodeId.value) && result.value.nodeId === targetNodeId.value;
    }));
    readiness.value = readinessFromChecks(ways.candidates, reachedAddresses.value);
  }

  async function refreshDevices(): Promise<void> {
    const [activeResponse, revokedResponse] = await Promise.all([
      apiService.get<{ devices: PairedDeviceSummary[] }>('/remote-access/devices'),
      apiService.get<{ devices: PairedDeviceSummary[] }>('/remote-access/devices/revoked'),
    ]);
    activeDevices.value = activeResponse.data.devices;
    revokedDevices.value = revokedResponse.data.devices;
  }

  /** Opens the panel: facts, checks, then the best ready way is selected (TR-001). */
  async function load(): Promise<void> {
    isLoading.value = true;
    loadError.value = null;
    try {
      const [settingsResponse, statusResponse] = await Promise.all([
        apiService.get<{ settings: RemoteAccessSettings }>('/remote-access/settings'),
        apiService.get<RemoteAccessStatus>('/remote-access/status'),
        refreshDevices(),
      ]);
      phoneAccessEnabled.value = settingsResponse.data.settings.phoneAccessEnabled;
      targetNodeId.value = statusResponse.data.nodeId ?? null;
      await readNetworkFacts();
      isChecking.value = true;
      await checkAddresses();
      selectedWay.value = recommendedWay.value ?? 'tailscale';
    } catch (error) {
      loadError.value = formatPhoneAccessRequestError(error);
    } finally {
      isChecking.value = false;
      isLoading.value = false;
    }
  }

  /** "Check again": reads the facts and checks again; the open tab stays (TR-007). */
  async function checkAgain(way: ConnectionWay): Promise<void> {
    isChecking.value = true;
    const others = [...stillNotFound.value].filter((entry) => entry !== way);
    stillNotFound.value = new Set(others);
    try {
      await readNetworkFacts();
      await checkAddresses();
      if (!readiness.value[way].ready) stillNotFound.value = new Set([...others, way]);
    } catch (error) {
      loadError.value = formatPhoneAccessRequestError(error);
    } finally {
      isChecking.value = false;
    }
  }

  /** Close, a tab change, a new code or leaving the page: the node forgets the shown code (REQ-015). */
  async function discardCode(): Promise<void> {
    const shown = code.value;
    code.value = null;
    codePhase.value = 'none';
    codeError.value = null;
    if (!shown) return;
    try {
      await apiService.delete(`/remote-access/pairing-sessions/${encodeURIComponent(shown.sessionId)}`);
    } catch {
      // The code expires on the node within 5 minutes either way.
    }
  }

  function selectWay(way: ConnectionWay): void {
    if (way === selectedWay.value) return;
    void discardCode(); // a code holds only its own tab's address (TR-002)
    typedAddressError.value = null;
    selectedWay.value = way;
  }

  async function ensurePhoneAccessOn(): Promise<void> {
    if (phoneAccessEnabled.value) return;
    const response = await apiService.put<{ settings: RemoteAccessSettings }>('/remote-access/settings', { phoneAccessEnabled: true });
    phoneAccessEnabled.value = response.data.settings.phoneAccessEnabled;
  }

  /** Remembers or forgets this local network on the node that keeps the answer (the embedded node on this computer). */
  async function writeLocalNetworkAllowed(allowed: boolean): Promise<void> {
    const ways = composed.value;
    if (!ways) return;
    const path = `/remote-access/network/local-networks/${encodeURIComponent(ways.localNetwork.networkId)}`;
    if (ways.localNetwork.keeper === 'embedded' && kind.value !== 'embedded' && embeddedEntry.value) {
      await requestEmbeddedNode(embeddedEntry.value.baseUrl, path, { method: 'PUT', body: JSON.stringify({ allowed }) });
    } else {
      await apiService.put(path, { allowed });
    }
    composed.value = { ...ways, localNetwork: { ...ways.localNetwork, allowed } };
  }

  async function createCode(way: ConnectionWay, address: string, typed: boolean): Promise<void> {
    const response = await apiService.post<RemoteAccessPairingSessionResponse>('/remote-access/pairing-sessions', {
      serverBaseUrl: address,
      serverName: nodeName.value,
      connectionWay: way,
      // A typed address is the user's explicit choice (DEC-021); the node still refuses public HTTP.
      trustedPrivateHttpAcknowledged: typed || httpAcknowledgedFor(way, localNetworkAllowed.value),
    });
    code.value = {
      way,
      address,
      typed,
      sessionId: response.data.sessionId,
      qrText: response.data.qrText,
      expiresAt: response.data.payload.expiresAt,
    };
    codePhase.value = 'shown';
  }

  /** "Show QR code" (also "Allow and show QR code", "Turn on and show QR code", "New code") for the open tab (DS-003). */
  async function showCode(): Promise<void> {
    const way = selectedWay.value;
    const address = readiness.value[way].address;
    if (!address) return;
    await discardCode();
    codePhase.value = 'creating';
    try {
      await ensurePhoneAccessOn();
      if (way === 'local_network' && !localNetworkAllowed.value) {
        await writeLocalNetworkAllowed(true); // pressing "Allow and show QR code" is the decision (REQ-004)
      }
      await createCode(way, address, false);
    } catch (error) {
      codePhase.value = 'none';
      codeError.value = formatPhoneAccessRequestError(error);
    }
  }

  /** "Use this address" on the Company address tab: the typed address must reach this node (REQ-003, DEC-022). */
  async function useTypedAddress(rawAddress: string): Promise<void> {
    typedAddressError.value = null;
    let address: string;
    try {
      address = normalizeNodeBaseUrl(rawAddress);
    } catch {
      typedAddressError.value = { kind: 'not_this_node' };
      return;
    }
    await discardCode();
    codePhase.value = 'creating';
    const status = await fetchRemoteAccessStatusFromBaseUrl(address, { timeoutMs: ADDRESS_CHECK_TIMEOUT_MS }).catch(() => null);
    if (!status?.nodeId || status.nodeId !== targetNodeId.value) {
      codePhase.value = 'none';
      typedAddressError.value = { kind: 'not_this_node' };
      return;
    }
    try {
      await ensurePhoneAccessOn();
      await createCode('company_address', address, true);
    } catch (error) {
      codePhase.value = 'none';
      typedAddressError.value = { kind: 'refused', message: formatPhoneAccessRequestError(error) };
    }
  }

  /** "New code" after expiry: the same way and address. */
  async function newCode(): Promise<void> {
    const previous = code.value;
    if (previous?.typed) {
      await useTypedAddress(previous.address);
      return;
    }
    await showCode();
  }

  function markCodeExpired(): void {
    if (codePhase.value === 'shown') codePhase.value = 'expired';
  }

  /** The header switch (TR-009): off discards the shown code; paired phones stay paired. */
  async function setPhoneAccessEnabled(enabled: boolean): Promise<void> {
    const response = await apiService.put<{ settings: RemoteAccessSettings }>('/remote-access/settings', { phoneAccessEnabled: enabled });
    phoneAccessEnabled.value = response.data.settings.phoneAccessEnabled;
    if (!enabled) {
      code.value = null; // the node discards every code when phone access turns off
      codePhase.value = 'none';
    }
  }

  /** The allowed row's switch off (TR-006): forgets this network and discards a shown Wi-Fi/LAN code. */
  async function forgetLocalNetwork(): Promise<void> {
    if (code.value?.way === 'local_network') await discardCode();
    await writeLocalNetworkAllowed(false);
  }

  async function revokeDevice(deviceId: string): Promise<void> {
    await apiService.delete(`/remote-access/devices/${encodeURIComponent(deviceId)}`);
    await refreshDevices();
  }

  async function revokeAllDevices(): Promise<void> {
    await apiService.delete('/remote-access/devices');
    await refreshDevices();
  }

  return {
    isLoading,
    loadError,
    isChecking,
    phoneAccessEnabled,
    activeDevices,
    revokedDevices,
    kind,
    nodeName,
    nodePort,
    readiness,
    recommendedWay,
    blockedReason,
    localNetworkAllowed,
    tailscaleHttpsReady,
    tailscaleServeHttpsPort,
    offersTailscaleServeCommand,
    stillNotFound,
    selectedWay,
    codePhase,
    code,
    codeError,
    typedAddressError,
    load,
    checkAgain,
    selectWay,
    showCode,
    useTypedAddress,
    newCode,
    discardCode,
    markCodeExpired,
    setPhoneAccessEnabled,
    forgetLocalNetwork,
    revokeDevice,
    revokeAllDevices,
  };
});

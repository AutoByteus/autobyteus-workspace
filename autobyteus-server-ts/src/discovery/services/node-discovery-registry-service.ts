export type DiscoveryNodeStatus = "ready" | "degraded" | "unreachable";

export type DiscoveryPeerRecord = {
  nodeId: string;
  nodeName: string;
  baseUrl: string;
  advertisedBaseUrl: string | null;
  lastSeenAtIso: string;
  status: DiscoveryNodeStatus;
  capabilities: Record<string, boolean> | null;
  trustMode: string | null;
};

export type DiscoveryRegistryChangeEvent = {
  peers: DiscoveryPeerRecord[];
  prunedNodeIds: string[];
};

export class DiscoveryRegistryConflictError extends Error {
  readonly code: "NODE_ID_CONFLICT" | "BASE_URL_CONFLICT";

  constructor(code: "NODE_ID_CONFLICT" | "BASE_URL_CONFLICT", message: string) {
    super(message);
    this.name = "DiscoveryRegistryConflictError";
    this.code = code;
  }
}

type UpsertPeerInput = {
  nodeId: string;
  nodeName: string;
  baseUrl: string;
  advertisedBaseUrl?: string | null;
  capabilities?: Record<string, boolean> | null;
  trustMode?: string | null;
  lastSeenAtIso?: string | null;
};

type RegistryOptions = {
  ttlMs?: number;
  degradedAfterMs?: number;
  unreachableAfterMs?: number;
  protectedNodeIds?: string[];
};

const normalizeRequiredString = (value: string, field: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return normalized;
};

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeBaseUrl = (baseUrl: string): string => {
  const parsed = new URL(normalizeRequiredString(baseUrl, "baseUrl"));
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Discovery peer baseUrl must use http or https protocol.");
  }
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  return parsed.toString().replace(/\/+$/, "");
};

const normalizeCapabilities = (
  value: Record<string, boolean> | null | undefined,
): Record<string, boolean> | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const normalized: Record<string, boolean> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "boolean") {
      normalized[key] = raw;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
};

const parsePositiveInt = (value: number | undefined, defaultValue: number): number => {
  if (!Number.isFinite(value)) {
    return defaultValue;
  }
  const normalized = Math.floor(value as number);
  return normalized > 0 ? normalized : defaultValue;
};

const toEpochMs = (iso: string): number => {
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) ? parsed : Date.now();
};

const nextStatus = (
  elapsedMs: number,
  degradedAfterMs: number,
  unreachableAfterMs: number,
): DiscoveryNodeStatus => {
  if (elapsedMs >= unreachableAfterMs) {
    return "unreachable";
  }
  if (elapsedMs >= degradedAfterMs) {
    return "degraded";
  }
  return "ready";
};

export class NodeDiscoveryRegistryService {
  private readonly byNodeId = new Map<string, DiscoveryPeerRecord>();
  private readonly listeners = new Set<(event: DiscoveryRegistryChangeEvent) => void>();
  private readonly ttlMs: number;
  private readonly degradedAfterMs: number;
  private readonly unreachableAfterMs: number;
  private readonly protectedNodeIds = new Set<string>();
  private maintenanceTimer: NodeJS.Timeout | null = null;

  constructor(options?: RegistryOptions) {
    this.ttlMs = parsePositiveInt(options?.ttlMs, 120_000);
    this.degradedAfterMs = parsePositiveInt(options?.degradedAfterMs, 20_000);
    this.unreachableAfterMs = parsePositiveInt(options?.unreachableAfterMs, 45_000);
    if (Array.isArray(options?.protectedNodeIds)) {
      for (const nodeId of options.protectedNodeIds) {
        this.protectedNodeIds.add(normalizeRequiredString(nodeId, "protectedNodeIds[]"));
      }
    }
  }

  onChange(listener: (event: DiscoveryRegistryChangeEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  listPeers(): DiscoveryPeerRecord[] {
    return Array.from(this.byNodeId.values()).sort((left, right) => left.nodeId.localeCompare(right.nodeId));
  }

  snapshotForGraphql(): DiscoveryPeerRecord[] {
    return this.listPeers();
  }

  announce(input: UpsertPeerInput): DiscoveryPeerRecord {
    const nodeId = normalizeRequiredString(input.nodeId, "nodeId");
    const nodeName = normalizeRequiredString(input.nodeName, "nodeName");
    const baseUrl = normalizeBaseUrl(input.baseUrl);

    const byNodeId = this.byNodeId.get(nodeId);
    if (byNodeId && byNodeId.baseUrl !== baseUrl) {
      throw new DiscoveryRegistryConflictError(
        "NODE_ID_CONFLICT",
        `Node '${nodeId}' already exists with baseUrl '${byNodeId.baseUrl}'.`,
      );
    }

    const byBaseUrl = this.listPeers().find((peer) => peer.baseUrl === baseUrl && peer.nodeId !== nodeId);
    if (byBaseUrl) {
      throw new DiscoveryRegistryConflictError(
        "BASE_URL_CONFLICT",
        `baseUrl '${baseUrl}' already belongs to node '${byBaseUrl.nodeId}'.`,
      );
    }

    const nowIso = normalizeOptionalString(input.lastSeenAtIso) ?? new Date().toISOString();
    const nextRecord: DiscoveryPeerRecord = {
      nodeId,
      nodeName,
      baseUrl,
      advertisedBaseUrl: normalizeOptionalString(input.advertisedBaseUrl),
      lastSeenAtIso: nowIso,
      status: "ready",
      capabilities: normalizeCapabilities(input.capabilities),
      trustMode: normalizeOptionalString(input.trustMode),
    };

    this.byNodeId.set(nodeId, nextRecord);
    this.emitChange([]);
    return nextRecord;
  }

  heartbeat(input: { nodeId: string; lastSeenAtIso?: string | null }): boolean {
    const nodeId = normalizeRequiredString(input.nodeId, "nodeId");
    const existing = this.byNodeId.get(nodeId);
    if (!existing) {
      return false;
    }

    this.byNodeId.set(nodeId, {
      ...existing,
      lastSeenAtIso: normalizeOptionalString(input.lastSeenAtIso) ?? new Date().toISOString(),
      status: "ready",
    });
    this.emitChange([]);
    return true;
  }

  mergePeers(peers: DiscoveryPeerRecord[]): void {
    const nextByNodeId = new Map<string, DiscoveryPeerRecord>();

    for (const peer of peers) {
      const normalizedNodeId = normalizeRequiredString(peer.nodeId, "peer.nodeId");
      const existingProtectedRecord = this.byNodeId.get(normalizedNodeId);
      if (this.protectedNodeIds.has(normalizedNodeId) && existingProtectedRecord) {
        nextByNodeId.set(normalizedNodeId, existingProtectedRecord);
        continue;
      }

      const normalizedPeer: DiscoveryPeerRecord = {
        nodeId: normalizedNodeId,
        nodeName: normalizeRequiredString(peer.nodeName, "peer.nodeName"),
        baseUrl: normalizeBaseUrl(peer.baseUrl),
        advertisedBaseUrl: normalizeOptionalString(peer.advertisedBaseUrl),
        lastSeenAtIso: normalizeOptionalString(peer.lastSeenAtIso) ?? new Date().toISOString(),
        status: peer.status,
        capabilities: normalizeCapabilities(peer.capabilities),
        trustMode: normalizeOptionalString(peer.trustMode),
      };
      nextByNodeId.set(normalizedPeer.nodeId, normalizedPeer);
    }

    // Keep protected nodes even if an upstream snapshot temporarily omits them.
    for (const [existingNodeId, existingRecord] of this.byNodeId.entries()) {
      if (!this.protectedNodeIds.has(existingNodeId)) {
        continue;
      }
      if (!nextByNodeId.has(existingNodeId)) {
        nextByNodeId.set(existingNodeId, existingRecord);
      }
    }

    const prunedNodeIds: string[] = [];
    for (const existingNodeId of this.byNodeId.keys()) {
      if (!nextByNodeId.has(existingNodeId)) {
        prunedNodeIds.push(existingNodeId);
      }
    }

    this.byNodeId.clear();
    for (const peer of nextByNodeId.values()) {
      this.byNodeId.set(peer.nodeId, peer);
    }

    this.emitChange(prunedNodeIds);
  }

  startMaintenanceTicker(intervalMs = 5_000): void {
    if (this.maintenanceTimer) {
      return;
    }

    const normalizedIntervalMs = parsePositiveInt(intervalMs, 5_000);
    this.maintenanceTimer = setInterval(() => {
      this.tickMaintenance();
    }, normalizedIntervalMs);
  }

  stopMaintenanceTicker(): void {
    if (!this.maintenanceTimer) {
      return;
    }
    clearInterval(this.maintenanceTimer);
    this.maintenanceTimer = null;
  }

  tickMaintenance(nowEpochMs = Date.now()): string[] {
    const prunedNodeIds: string[] = [];
    let changed = false;

    for (const [nodeId, record] of this.byNodeId.entries()) {
      if (this.protectedNodeIds.has(nodeId)) {
        continue;
      }
      const elapsedMs = nowEpochMs - toEpochMs(record.lastSeenAtIso);
      if (elapsedMs >= this.ttlMs) {
        this.byNodeId.delete(nodeId);
        prunedNodeIds.push(nodeId);
        changed = true;
        continue;
      }

      const status = nextStatus(elapsedMs, this.degradedAfterMs, this.unreachableAfterMs);
      if (status !== record.status) {
        this.byNodeId.set(nodeId, {
          ...record,
          status,
        });
        changed = true;
      }
    }

    if (changed || prunedNodeIds.length > 0) {
      this.emitChange(prunedNodeIds);
    }

    return prunedNodeIds;
  }

  private emitChange(prunedNodeIds: string[]): void {
    if (this.listeners.size === 0) {
      return;
    }

    const payload: DiscoveryRegistryChangeEvent = {
      peers: this.listPeers(),
      prunedNodeIds,
    };

    for (const listener of this.listeners) {
      try {
        listener(payload);
      } catch {
        // Listener failures must not break discovery state propagation.
      }
    }
  }
}

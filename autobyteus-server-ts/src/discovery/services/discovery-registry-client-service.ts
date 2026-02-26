import type { NodeSelfIdentity } from "./node-identity-service.js";
import {
  NodeDiscoveryRegistryService,
  type DiscoveryPeerRecord,
} from "./node-discovery-registry-service.js";

export type DiscoveryRegistryClientServiceOptions = {
  selfIdentity: NodeSelfIdentity;
  registryService: NodeDiscoveryRegistryService;
  registryUrl: string;
  heartbeatIntervalMs?: number;
  syncIntervalMs?: number;
  fetchImpl?: typeof fetch;
};

type PeersResponse = {
  peers?: DiscoveryPeerRecord[];
};

type DiscoveryAcceptedResponse = {
  accepted?: boolean;
  code?: string;
};

const normalizeRequiredString = (value: string, field: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return normalized;
};

const normalizeBaseUrl = (baseUrl: string): string => {
  const parsed = new URL(normalizeRequiredString(baseUrl, "registryUrl"));
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  return parsed.toString().replace(/\/+$/, "");
};

const parseInterval = (value: number | undefined, fallback: number): number => {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  const normalized = Math.floor(value as number);
  return normalized > 0 ? normalized : fallback;
};

export class DiscoveryRegistryClientService {
  private readonly selfIdentity: NodeSelfIdentity;
  private readonly registryService: NodeDiscoveryRegistryService;
  private readonly registryUrl: string;
  private readonly heartbeatIntervalMs: number;
  private readonly syncIntervalMs: number;
  private readonly fetchImpl: typeof fetch;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private syncTimer: NodeJS.Timeout | null = null;
  private registrationInFlight: Promise<void> | null = null;
  private registered = false;

  constructor(options: DiscoveryRegistryClientServiceOptions) {
    this.selfIdentity = options.selfIdentity;
    this.registryService = options.registryService;
    this.registryUrl = normalizeBaseUrl(options.registryUrl);
    this.heartbeatIntervalMs = parseInterval(options.heartbeatIntervalMs, 5_000);
    this.syncIntervalMs = parseInterval(options.syncIntervalMs, 8_000);
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
  }

  async start(): Promise<void> {
    if (!this.fetchImpl) {
      throw new Error("Global fetch is unavailable for discovery registry client service.");
    }

    if (this.heartbeatTimer || this.syncTimer) {
      return;
    }

    this.heartbeatTimer = setInterval(() => {
      void this.sendHeartbeatWithRegistrationRecovery().catch(() => {
        // transient LAN transport failures are retried on next heartbeat tick
      });
    }, this.heartbeatIntervalMs);

    this.syncTimer = setInterval(() => {
      void this.syncPeersFromRegistry().catch(() => {
        // transient LAN transport failures are retried on next sync tick
      });
    }, this.syncIntervalMs);

    try {
      await this.ensureRegistered();
      await this.sendHeartbeatWithRegistrationRecovery();
      await this.syncPeersFromRegistry();
    } catch {
      // The periodic loops above keep retrying; startup should remain non-fatal.
    }
  }

  stop(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  async registerToDiscoveryRegistry(): Promise<void> {
    const response = await this.fetchImpl(`${this.registryUrl}/rest/node-discovery/register`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        nodeId: this.selfIdentity.nodeId,
        nodeName: this.selfIdentity.nodeName,
        baseUrl: this.selfIdentity.baseUrl,
      }),
    });

    if (!response.ok) {
      this.registered = false;
      throw new Error(
        `Discovery register failed with status ${response.status}: ${await response.text()}`,
      );
    }

    const payload = (await response.json()) as DiscoveryAcceptedResponse;
    if (payload.accepted === false && payload.code !== "SELF_REGISTRATION_NOOP") {
      this.registered = false;
      throw new Error(
        `Discovery register rejected: ${payload.code ?? "UNKNOWN"}`,
      );
    }

    this.registered = true;
  }

  async sendHeartbeat(): Promise<void> {
    const response = await this.fetchImpl(`${this.registryUrl}/rest/node-discovery/heartbeat`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        nodeId: this.selfIdentity.nodeId,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Discovery heartbeat failed with status ${response.status}: ${await response.text()}`,
      );
    }

    const payload = (await response.json()) as DiscoveryAcceptedResponse;
    if (payload.accepted === false) {
      throw new Error(`Discovery heartbeat rejected: ${payload.code ?? "UNKNOWN"}`);
    }
  }

  async syncPeersFromRegistry(): Promise<void> {
    const response = await this.fetchImpl(`${this.registryUrl}/rest/node-discovery/peers`, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(
        `Discovery peer sync failed with status ${response.status}: ${await response.text()}`,
      );
    }

    const payload = (await response.json()) as PeersResponse;
    const peers = Array.isArray(payload?.peers) ? payload.peers : [];
    this.registryService.mergePeers(peers);
  }

  private async ensureRegistered(): Promise<void> {
    if (this.registered) {
      return;
    }

    if (this.registrationInFlight) {
      await this.registrationInFlight;
      return;
    }

    this.registrationInFlight = this.registerToDiscoveryRegistry().finally(() => {
      this.registrationInFlight = null;
    });
    await this.registrationInFlight;
  }

  private async sendHeartbeatWithRegistrationRecovery(): Promise<void> {
    await this.ensureRegistered();

    try {
      await this.sendHeartbeat();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("HEARTBEAT_UNKNOWN_NODE")) {
        throw error;
      }

      this.registered = false;
      await this.ensureRegistered();
      await this.sendHeartbeat();
    }
  }
}

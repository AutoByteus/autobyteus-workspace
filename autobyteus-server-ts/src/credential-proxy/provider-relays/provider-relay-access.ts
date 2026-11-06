import type { SecretManagementService } from "../../secret-management/services/secret-management-service.js";
import type { RunPassRegistry } from "../run-pass-registry.js";
import type { ProviderCallListener, ProviderCallObservation } from "./provider-call-observation.js";
import {
  providerRelayBaseUrl,
  providerRelayKeyMissingText,
  type ProviderRelays,
} from "./provider-relays.js";

export type ProviderRelayRunIdentity = Readonly<{ runId: string; agentDefinitionId: string }>;

/** A run's access to its runtime's model provider: the relay's base URL and the run's pass for the API-key header. */
export type ProviderRelayRunAccess = Readonly<{ baseUrl: string; apiKey: string }>;

/** The vault holds no key for the relay: the run cannot start (its text names where to set the key). */
export class ProviderRelayKeyMissingError extends Error {
  constructor(message: string) {
    super(`RELAY_KEY_NOT_SET: ${message}`);
    this.name = "ProviderRelayKeyMissingError";
  }
}

/**
 * The credential proxy's provider relays as runtime backends and discovery use them: grant a run's pass the relay,
 * give a relay's address, and deliver the relay's reports about a run's calls. The pass ends through
 * `RunPassRevocation`.
 */
export interface ProviderRelayAccess {
  /** Grants the relay on the run's pass; refused with `ProviderRelayKeyMissingError` when the vault holds no key. */
  prepareForRun(run: ProviderRelayRunIdentity, relayId: string): Promise<ProviderRelayRunAccess>;
  /** The relay's base URL (throws while the proxy is not listening yet). */
  relayBaseUrl(relayId: string): string;
  /**
   * Delivers the run's provider call observations to this listener until the returned function is called; that
   * function removes exactly this registration and nothing registered later.
   */
  observe(runId: string, listener: ProviderCallListener): () => void;
}

/** Per-run, per-registration listeners of provider call observations. */
export class ProviderCallObservers {
  private readonly byRunId = new Map<string, Set<{ listener: ProviderCallListener }>>();

  add(runId: string, listener: ProviderCallListener): () => void {
    const registration = { listener };
    const registrations = this.byRunId.get(runId) ?? new Set();
    registrations.add(registration);
    this.byRunId.set(runId, registrations);
    return () => {
      const current = this.byRunId.get(runId);
      if (!current?.delete(registration)) return;
      if (current.size === 0) this.byRunId.delete(runId);
    };
  }

  notify(runId: string, observation: ProviderCallObservation): void {
    for (const { listener } of [...(this.byRunId.get(runId) ?? [])]) {
      try { listener(observation); } catch { /* A listener never breaks the forwarded call. */ }
    }
  }
}

export class DefaultProviderRelayAccess implements ProviderRelayAccess {
  constructor(private readonly deps: Readonly<{
    relays: ProviderRelays;
    passes: Pick<RunPassRegistry, "grantProviderRelay">;
    observers: ProviderCallObservers;
    management: () => SecretManagementService;
    proxyBaseUrl: () => string;
  }>) {}

  async prepareForRun(run: ProviderRelayRunIdentity, relayId: string): Promise<ProviderRelayRunAccess> {
    const relay = this.deps.relays.get(relayId);
    if (!relay) throw new Error(`PROVIDER_RELAY_UNKNOWN: ${relayId}`);
    const baseUrl = this.relayBaseUrl(relayId);
    if (await this.deps.management().getStatusForConsumer(relay.consumer) !== "CONFIGURED") {
      throw new ProviderRelayKeyMissingError(providerRelayKeyMissingText(relay));
    }
    return Object.freeze({ baseUrl, apiKey: this.deps.passes.grantProviderRelay(run, relay.id) });
  }

  relayBaseUrl(relayId: string): string {
    return providerRelayBaseUrl(this.deps.proxyBaseUrl(), relayId);
  }

  observe(runId: string, listener: ProviderCallListener): () => void {
    return this.deps.observers.add(runId, listener);
  }
}

import type { SecretManagementService } from "../../secret-management/services/secret-management-service.js";
import type { RunPassRegistry } from "../run-pass-registry.js";
import type { ProviderCallListener, ProviderCallObservation } from "./provider-call-observation.js";
import type { LoginTokenRuntimeKind, RelayCredentialKind, RelayedNodeSettings } from "./provider-relay-settings.js";
import {
  providerRelayBaseUrl,
  providerRelayKeyMissingText,
  type ProviderRelays,
} from "./provider-relays.js";

export type ProviderRelayRunIdentity = Readonly<{ runId: string; agentDefinitionId: string }>;

/** The runtimes whose model calls a relayed node sends through a relay (Antigravity cannot be relayed, DEC-101). */
export type RelayedRuntimeKind = LoginTokenRuntimeKind | "codex_app_server" | "deepseek_harness";

/** The relay each external runtime calls its provider through. */
const RUNTIME_RELAY: Readonly<Record<RelayedRuntimeKind, string>> = Object.freeze({
  claude_agent_sdk: "anthropic",
  codex_app_server: "openai",
  grok_build: "xai",
  deepseek_harness: "deepseek",
});

/** The relay each native (AutoByteus) provider calls through on a relayed node; other providers are local. */
const NATIVE_PROVIDER_RELAY: Readonly<Record<string, string>> = Object.freeze({
  ANTHROPIC: "anthropic", OPENAI: "openai", GROK: "xai", DEEPSEEK: "deepseek", GEMINI: "gemini",
  KIMI: "kimi", GLM: "glm", QWEN: "qwen", MISTRAL: "mistral", MINIMAX: "minimax",
});

/**
 * How one runtime (or native provider) reaches its model provider on this node: `direct` (its own credentials, an
 * unrelayed node), through a relay with the relay credential kind its calls declare, or not at all (a relayed node
 * whose relay node offers no credential for it).
 */
export type ProviderRelayRoute =
  | Readonly<{ kind: "direct" }>
  | Readonly<{ kind: "relay"; relayId: string; relayCredentialKind: RelayCredentialKind }>
  | Readonly<{ kind: "unavailable"; reason: string }>;

/** A run's (or the node's) access to a relay: the relay's base URL, the pass for the runtime's credential header, the kind. */
export type ProviderRelayRunAccess = Readonly<{ baseUrl: string; pass: string; relayCredentialKind: RelayCredentialKind }>;

/** A relayed runtime's sign-in state, decided by C1 alone. */
export type RelayedRuntimeStatus = Readonly<{ state: "signedIn" }> | Readonly<{ state: "signedOut"; detail: string }>;

/** The vault holds no key for the relay: the run cannot start (its text names where to set the key). */
export class ProviderRelayKeyMissingError extends Error {
  constructor(message: string) {
    super(`RELAY_KEY_NOT_SET: ${message}`);
    this.name = "ProviderRelayKeyMissingError";
  }
}

/** A relayed launch that cannot use its relay: the relay node offers no credential for it, or this host has no relay. */
export class ProviderRelayUnavailableError extends Error {
  constructor(readonly code: "RELAY_NOT_LISTED" | "PROVIDER_RELAY_UNAVAILABLE", message: string) {
    super(`${code}: ${message}`);
    this.name = "ProviderRelayUnavailableError";
  }
}

/**
 * The credential proxy's provider relays as runtime backends, status and discovery use them, and the only owner of
 * the relay decision (C1): whether this node is relayed, which relay and relay credential kind each runtime uses, the
 * run and node passes, and the relay's reports about a run's calls. A pass ends through `RunPassRevocation`.
 */
export interface ProviderRelayAccess {
  /** Whether this node sends model calls through a relay node (C1 set). */
  isRelayed(): boolean;
  /** An external runtime's route (DeepSeek Harness always uses its relay, on every node). */
  routeFor(runtimeKind: RelayedRuntimeKind): ProviderRelayRoute;
  /** A native provider's route (`provider`: autobyteus-ts `LLMProvider`); always `apiKey` through a relay. */
  routeForNativeProvider(provider: string): ProviderRelayRoute;
  /** A relayed runtime's sign-in state (only on a relayed node). */
  statusOf(runtimeKind: RelayedRuntimeKind): RelayedRuntimeStatus;
  /**
   * Grants the relay on the run's pass for its kind. Unrelayed: refused with `ProviderRelayKeyMissingError` when the
   * vault holds no key. Relayed: refused with `ProviderRelayUnavailableError` when C1 offers no credential for it.
   * `runtimeKind` `autobyteus` is the native runtime (always `apiKey`).
   */
  prepareForRun(run: ProviderRelayRunIdentity, relayId: string, runtimeKind: RelayedRuntimeKind | "autobyteus"): Promise<ProviderRelayRunAccess>;
  /** The node pass for a relay, for the relayed node's shared processes (only on a relayed node). */
  prepareForNode(relayId: string, runtimeKind: RelayedRuntimeKind): ProviderRelayRunAccess;
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
    /** C1 of this node (`null`: not relayed), read once at start. */
    relayed: RelayedNodeSettings | null;
    relays: ProviderRelays;
    passes: Pick<RunPassRegistry, "grantProviderRelay" | "grantNodeProviderRelay">;
    observers: ProviderCallObservers;
    management: () => SecretManagementService;
    proxyBaseUrl: () => string;
  }>) {}

  isRelayed(): boolean {
    return this.deps.relayed !== null;
  }

  routeFor(runtimeKind: RelayedRuntimeKind): ProviderRelayRoute {
    const relayId = RUNTIME_RELAY[runtimeKind];
    const relayed = this.deps.relayed;
    if (!relayed) {
      return runtimeKind === "deepseek_harness" ? { kind: "relay", relayId, relayCredentialKind: "apiKey" } : { kind: "direct" };
    }
    // The C1 rule (AR-003): listed for a login token → loginToken; else apiKey when the relay is listed.
    if ((runtimeKind === "claude_agent_sdk" || runtimeKind === "grok_build") && relayed.loginTokenRuntimes.has(runtimeKind)) {
      return { kind: "relay", relayId, relayCredentialKind: "loginToken" };
    }
    if (relayed.relays.has(relayId)) return { kind: "relay", relayId, relayCredentialKind: "apiKey" };
    return { kind: "unavailable", reason: this.notListedText(relayId) };
  }

  routeForNativeProvider(provider: string): ProviderRelayRoute {
    const relayed = this.deps.relayed;
    if (!relayed) return { kind: "direct" };
    const relayId = NATIVE_PROVIDER_RELAY[provider.toUpperCase()];
    if (!relayId) return { kind: "direct" };
    return relayed.relays.has(relayId)
      ? { kind: "relay", relayId, relayCredentialKind: "apiKey" }
      : { kind: "unavailable", reason: this.notListedText(relayId) };
  }

  statusOf(runtimeKind: RelayedRuntimeKind): RelayedRuntimeStatus {
    const route = this.routeFor(runtimeKind);
    if (route.kind === "relay") return { state: "signedIn" };
    return { state: "signedOut", detail: route.kind === "unavailable" ? route.reason : "This node is not relayed." };
  }

  async prepareForRun(
    run: ProviderRelayRunIdentity,
    relayId: string,
    runtimeKind: RelayedRuntimeKind | "autobyteus",
  ): Promise<ProviderRelayRunAccess> {
    const relay = this.deps.relays.get(relayId);
    if (!relay) throw new Error(`PROVIDER_RELAY_UNKNOWN: ${relayId}`);
    const baseUrl = this.relayBaseUrl(relayId);
    let kind: RelayCredentialKind;
    if (this.deps.relayed) {
      kind = this.relayedKind(relayId, runtimeKind);
    } else {
      // An unrelayed node attaches its own vault key; nothing reaches the relay without one.
      const source = relay.routes.apiKey.source;
      if (source.kind !== "vault" || await this.deps.management().getStatusForConsumer(source.consumer) !== "CONFIGURED") {
        throw new ProviderRelayKeyMissingError(providerRelayKeyMissingText(relay));
      }
      kind = "apiKey";
    }
    return Object.freeze({ baseUrl, pass: this.deps.passes.grantProviderRelay(run, relay.id, kind), relayCredentialKind: kind });
  }

  prepareForNode(relayId: string, runtimeKind: RelayedRuntimeKind): ProviderRelayRunAccess {
    if (!this.deps.relayed) throw new Error("PROVIDER_RELAY_NODE_PASS_UNRELAYED: only a relayed node has a node pass.");
    if (!this.deps.relays.get(relayId)) throw new Error(`PROVIDER_RELAY_UNKNOWN: ${relayId}`);
    const kind = this.relayedKind(relayId, runtimeKind);
    return Object.freeze({
      baseUrl: this.relayBaseUrl(relayId),
      pass: this.deps.passes.grantNodeProviderRelay(relayId, kind),
      relayCredentialKind: kind,
    });
  }

  relayBaseUrl(relayId: string): string {
    return providerRelayBaseUrl(this.deps.proxyBaseUrl(), relayId);
  }

  observe(runId: string, listener: ProviderCallListener): () => void {
    return this.deps.observers.add(runId, listener);
  }

  /** The kind a relayed launch declares for this relay; refused when C1 offers no credential for it. */
  private relayedKind(relayId: string, runtimeKind: RelayedRuntimeKind | "autobyteus"): RelayCredentialKind {
    const route = runtimeKind === "autobyteus"
      ? (this.deps.relayed!.relays.has(relayId) ? { kind: "relay" as const, relayId, relayCredentialKind: "apiKey" as const }
        : { kind: "unavailable" as const, reason: this.notListedText(relayId) })
      : this.routeFor(runtimeKind);
    if (route.kind === "relay" && route.relayId === relayId) return route.relayCredentialKind;
    throw new ProviderRelayUnavailableError("RELAY_NOT_LISTED",
      route.kind === "unavailable" ? route.reason : this.notListedText(relayId));
  }

  private notListedText(relayId: string): string {
    const name = this.deps.relays.get(relayId)?.providerName ?? relayId;
    return `The relay node offers no ${name} credential to this node (${relayId} is not in AUTOBYTEUS_PROVIDER_RELAYS).`;
  }
}

import {
  ProviderRelayUnavailableError,
  type ProviderRelayAccess,
  type ProviderRelayRunAccess,
  type RelayedRuntimeKind,
} from "./provider-relay-access.js";
import { relayedNodeSettings } from "./provider-relay-settings.js";

let processAccess: ProviderRelayAccess | null = null;

/**
 * The process's provider relays, set only by the composition that owns the credential proxy host (the studio), when it
 * creates the host and before it listens; `null` when it closes it. Process singletons without injected dependencies
 * (the model catalog, runtime availability, the Claude client, the Codex app-servers, Grok discovery) read it;
 * everything else gets the access injected.
 */
export const setProcessProviderRelayAccess = (access: ProviderRelayAccess | null): void => {
  processAccess = access;
};

/** The process's provider relays, or `null` when this process runs no credential proxy. */
export const getProcessProviderRelayAccess = (): ProviderRelayAccess | null => processAccess;

/**
 * For a process singleton's launch: on a relayed node (C1, read-only configuration), the node pass for the relay its
 * runtime uses; `null` on an unrelayed node, which launches as before. A relayed node without the process's relays, or
 * whose relay node offers no credential for this runtime, refuses loudly: it never launches directly.
 */
export const processNodeRelayAccess = (relayId: string, runtimeKind: RelayedRuntimeKind): ProviderRelayRunAccess | null => {
  if (!relayedNodeSettings()) return null;
  if (!processAccess) {
    throw new ProviderRelayUnavailableError("PROVIDER_RELAY_UNAVAILABLE",
      "This node is relayed, but this process runs no AutoByteus credential proxy.");
  }
  return processAccess.prepareForNode(relayId, runtimeKind);
};

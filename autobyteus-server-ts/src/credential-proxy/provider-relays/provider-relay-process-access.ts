import type { ProviderRelayAccess } from "./provider-relay-access.js";

let processAccess: ProviderRelayAccess | null = null;

/**
 * The process's provider relays, set only by the composition that owns the credential proxy host (the studio), when it
 * creates the host; `null` when it closes it. Process singletons without injected dependencies (the model catalog and
 * runtime availability) read it; everything else gets the access injected.
 */
export const setProcessProviderRelayAccess = (access: ProviderRelayAccess | null): void => {
  processAccess = access;
};

/** The process's provider relays, or `null` when this process runs no credential proxy. */
export const getProcessProviderRelayAccess = (): ProviderRelayAccess | null => processAccess;

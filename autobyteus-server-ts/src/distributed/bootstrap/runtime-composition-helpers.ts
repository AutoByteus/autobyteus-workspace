import type { TransportSecurityMode } from "../security/internal-envelope-auth.js";
import type { AddressResolutionOutcome } from "../addressing/transport-address-policy.js";

export const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const emitAddressResolutionLog = (input: {
  operation: "command_dispatch" | "event_uplink";
  outcome: AddressResolutionOutcome;
}): void => {
  if (input.outcome.source === "directory") {
    return;
  }
  const payload = {
    operation: input.operation,
    targetNodeId: input.outcome.targetNodeId,
    source: input.outcome.source,
    rewritten: input.outcome.rewritten,
    reason: input.outcome.reason,
    baseUrl: input.outcome.baseUrl,
  };
  console.info(`[DistributedAddressResolution] ${JSON.stringify(payload)}`);
};

export const parseSecurityModeFromEnv = (): TransportSecurityMode => {
  const raw = normalizeOptionalString(process.env.AUTOBYTEUS_DISTRIBUTED_SECURITY_MODE);
  return raw === "trusted_lan" ? "trusted_lan" : "strict_signed";
};

export const parseAllowedNodeIds = (hostNodeId: string): string[] | null => {
  const raw = normalizeOptionalString(process.env.AUTOBYTEUS_DISTRIBUTED_ALLOWED_NODE_IDS);
  if (!raw) {
    return null;
  }
  const values = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  if (!values.includes(hostNodeId)) {
    values.push(hostNodeId);
  }
  return values;
};

const resolveLocalBaseUrl = (): string => {
  const explicit = normalizeOptionalString(process.env.AUTOBYTEUS_DISTRIBUTED_LOCAL_BASE_URL);
  if (explicit) {
    return explicit;
  }
  const fromServerHost = normalizeOptionalString(process.env.AUTOBYTEUS_SERVER_HOST);
  if (fromServerHost) {
    return fromServerHost;
  }
  return "http://localhost:8000";
};

export const buildHostOnlyNodeDirectoryEntries = (hostNodeId: string) => [
  {
    nodeId: hostNodeId,
    baseUrl: resolveLocalBaseUrl(),
    isHealthy: true,
    supportsAgentExecution: true,
  },
];

export const buildResolveSecretByKeyId = (): ((keyId: string) => string | null) => {
  const byKeyId = new Map<string, string>();
  const configuredKeyId =
    normalizeOptionalString(process.env.AUTOBYTEUS_DISTRIBUTED_KEY_ID) ?? "default";
  const configuredSecret =
    normalizeOptionalString(process.env.AUTOBYTEUS_DISTRIBUTED_SHARED_SECRET) ??
    "autobyteus-dev-internal-secret";
  byKeyId.set(configuredKeyId, configuredSecret);

  const rawSecrets = normalizeOptionalString(process.env.AUTOBYTEUS_DISTRIBUTED_SHARED_SECRETS_JSON);
  if (rawSecrets) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawSecrets);
    } catch (error) {
      throw new Error(
        `AUTOBYTEUS_DISTRIBUTED_SHARED_SECRETS_JSON must be valid JSON object: ${String(error)}`,
      );
    }
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === "string" && key.trim().length > 0 && value.trim().length > 0) {
          byKeyId.set(key.trim(), value.trim());
        }
      }
    }
  }

  return (keyId: string) => byKeyId.get(keyId) ?? null;
};

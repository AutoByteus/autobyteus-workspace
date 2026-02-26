import type { NodeDirectoryService } from "../node-directory/node-directory-service.js";

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeRequiredString = (value: string, field: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return normalized;
};

const normalizeRouteSegment = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const isLoopbackHostname = (hostname: string): boolean => {
  const normalized = hostname.trim().toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
};

const isLoopbackBaseUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return isLoopbackHostname(parsed.hostname);
  } catch {
    return false;
  }
};

export const normalizeDistributedBaseUrl = (value: string): string | null => {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return null;
  }

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    if (parsed.pathname === "/rest") {
      parsed.pathname = "";
    }
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
};

const resolveFallbackBaseUrl = (input: {
  distributedUplinkBaseUrl?: string | null;
  discoveryRegistryUrl?: string | null;
}): string | null =>
  normalizeDistributedBaseUrl(input.distributedUplinkBaseUrl ?? "") ??
  normalizeDistributedBaseUrl(input.discoveryRegistryUrl ?? "");

export type AddressResolutionSource =
  | "directory"
  | "directory_rewritten_loopback"
  | "bootstrap_fallback"
  | "unresolved";

export type AddressResolutionOutcome = {
  resolved: boolean;
  targetNodeId: string;
  baseUrl: string | null;
  source: AddressResolutionSource;
  rewritten: boolean;
  reason: string | null;
};

export const resolveRemoteTargetForEventUplink = (input: {
  localNodeId: string;
  targetNodeId: string;
  nodeDirectoryService: NodeDirectoryService;
  distributedUplinkBaseUrl?: string | null;
  discoveryRegistryUrl?: string | null;
}): AddressResolutionOutcome => {
  const normalizedTargetNodeId = normalizeRouteSegment(input.targetNodeId);
  if (!normalizedTargetNodeId) {
    return {
      resolved: false,
      targetNodeId: input.targetNodeId,
      baseUrl: null,
      source: "unresolved",
      rewritten: false,
      reason: "TARGET_NODE_ID_INVALID",
    };
  }

  const normalizedLocalNodeId = normalizeRequiredString(input.localNodeId, "localNodeId");
  if (normalizedTargetNodeId === normalizedLocalNodeId) {
    return {
      resolved: false,
      targetNodeId: normalizedTargetNodeId,
      baseUrl: null,
      source: "unresolved",
      rewritten: false,
      reason: "TARGET_NODE_IS_LOCAL",
    };
  }

  const fallbackBaseUrl = resolveFallbackBaseUrl({
    distributedUplinkBaseUrl: input.distributedUplinkBaseUrl,
    discoveryRegistryUrl: input.discoveryRegistryUrl,
  });

  const existingEntry = input.nodeDirectoryService.getEntry(normalizedTargetNodeId);
  if (existingEntry) {
    if (!fallbackBaseUrl || !isLoopbackBaseUrl(existingEntry.baseUrl)) {
      return {
        resolved: true,
        targetNodeId: normalizedTargetNodeId,
        baseUrl: existingEntry.baseUrl,
        source: "directory",
        rewritten: false,
        reason: null,
      };
    }
    input.nodeDirectoryService.setEntry({
      nodeId: normalizedTargetNodeId,
      baseUrl: fallbackBaseUrl,
      isHealthy: true,
      supportsAgentExecution: true,
    });
    return {
      resolved: true,
      targetNodeId: normalizedTargetNodeId,
      baseUrl: fallbackBaseUrl,
      source: "directory_rewritten_loopback",
      rewritten: true,
      reason: "REMOTE_LOOPBACK_REWRITTEN",
    };
  }

  if (!fallbackBaseUrl) {
    return {
      resolved: false,
      targetNodeId: normalizedTargetNodeId,
      baseUrl: null,
      source: "unresolved",
      rewritten: false,
      reason: "TARGET_NODE_MISSING_NO_FALLBACK",
    };
  }

  input.nodeDirectoryService.setEntry({
    nodeId: normalizedTargetNodeId,
    baseUrl: fallbackBaseUrl,
    isHealthy: true,
    supportsAgentExecution: true,
  });
  return {
    resolved: true,
    targetNodeId: normalizedTargetNodeId,
    baseUrl: fallbackBaseUrl,
    source: "bootstrap_fallback",
    rewritten: false,
    reason: null,
  };
};

export const resolveRemoteTargetForCommandDispatch = (input: {
  targetNodeId: string;
  nodeDirectoryService: NodeDirectoryService;
}): AddressResolutionOutcome => {
  const normalizedTargetNodeId = normalizeRouteSegment(input.targetNodeId);
  if (!normalizedTargetNodeId) {
    return {
      resolved: false,
      targetNodeId: input.targetNodeId,
      baseUrl: null,
      source: "unresolved",
      rewritten: false,
      reason: "TARGET_NODE_ID_INVALID",
    };
  }

  const existingEntry = input.nodeDirectoryService.getEntry(normalizedTargetNodeId);
  if (!existingEntry) {
    return {
      resolved: false,
      targetNodeId: normalizedTargetNodeId,
      baseUrl: null,
      source: "unresolved",
      rewritten: false,
      reason: "TARGET_NODE_MISSING",
    };
  }

  return {
    resolved: true,
    targetNodeId: normalizedTargetNodeId,
    baseUrl: existingEntry.baseUrl,
    source: "directory",
    rewritten: false,
    reason: null,
  };
};

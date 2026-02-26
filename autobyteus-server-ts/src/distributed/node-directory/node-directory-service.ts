import type { PlacementCandidateNode } from "../policies/default-placement-policy.js";

const normalizeRequiredString = (value: string, field: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return normalized;
};

const normalizeBaseUrl = (baseUrl: string): string => {
  const normalized = normalizeRequiredString(baseUrl, "baseUrl");
  const parsed = new URL(normalized);
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  return parsed.toString().replace(/\/+$/, "");
};

export type NodeDirectoryEntry = {
  nodeId: string;
  baseUrl: string;
  isHealthy: boolean;
  supportsAgentExecution: boolean;
};

export class UnknownNodeDirectoryEntryError extends Error {
  readonly nodeId: string;

  constructor(nodeId: string) {
    super(`No node directory entry found for node '${nodeId}'.`);
    this.name = "UnknownNodeDirectoryEntryError";
    this.nodeId = nodeId;
  }
}

export class NodeDirectoryService {
  private readonly byNodeId = new Map<string, NodeDirectoryEntry>();
  private readonly protectedNodeIds = new Set<string>();

  constructor(
    entries: NodeDirectoryEntry[],
    options?: {
      protectedNodeIds?: string[];
    },
  ) {
    if (Array.isArray(options?.protectedNodeIds)) {
      for (const nodeId of options.protectedNodeIds) {
        const normalized = normalizeRequiredString(nodeId, "protectedNodeIds[]");
        this.protectedNodeIds.add(normalized);
      }
    }
    for (const entry of entries) {
      this.setEntry(entry);
    }
  }

  listEntries(): NodeDirectoryEntry[] {
    return Array.from(this.byNodeId.values());
  }

  listPlacementCandidates(): PlacementCandidateNode[] {
    return this.listEntries().map((entry) => ({
      nodeId: entry.nodeId,
      isHealthy: entry.isHealthy,
      supportsAgentExecution: entry.supportsAgentExecution,
    }));
  }

  getEntry(nodeId: string): NodeDirectoryEntry | null {
    return this.byNodeId.get(nodeId) ?? null;
  }

  getRequiredEntry(nodeId: string): NodeDirectoryEntry {
    const normalizedNodeId = normalizeRequiredString(nodeId, "nodeId");
    const entry = this.byNodeId.get(normalizedNodeId);
    if (!entry) {
      throw new UnknownNodeDirectoryEntryError(normalizedNodeId);
    }
    return entry;
  }

  resolveDistributedCommandUrl(nodeId: string): string {
    const entry = this.getRequiredEntry(nodeId);
    return `${entry.baseUrl}/internal/distributed/v1/commands`;
  }

  resolveDistributedEventUrl(nodeId: string): string {
    const entry = this.getRequiredEntry(nodeId);
    return `${entry.baseUrl}/internal/distributed/v1/events`;
  }

  resolveTeamHistoryCleanupUrl(nodeId: string): string {
    const entry = this.getRequiredEntry(nodeId);
    return `${entry.baseUrl}/internal/distributed/v1/team-history/cleanup`;
  }

  resolveTeamHistoryRuntimeStateProbeUrl(nodeId: string): string {
    const entry = this.getRequiredEntry(nodeId);
    return `${entry.baseUrl}/internal/distributed/v1/team-history/runtime-state`;
  }

  setEntry(entry: NodeDirectoryEntry): void {
    const normalizedNodeId = normalizeRequiredString(entry.nodeId, "nodeId");
    this.byNodeId.set(normalizedNodeId, {
      nodeId: normalizedNodeId,
      baseUrl: normalizeBaseUrl(entry.baseUrl),
      isHealthy: entry.isHealthy,
      supportsAgentExecution: entry.supportsAgentExecution,
    });
  }

  removeEntry(nodeId: string): boolean {
    const normalizedNodeId = normalizeRequiredString(nodeId, "nodeId");
    if (this.protectedNodeIds.has(normalizedNodeId)) {
      return false;
    }
    return this.byNodeId.delete(normalizedNodeId);
  }
}

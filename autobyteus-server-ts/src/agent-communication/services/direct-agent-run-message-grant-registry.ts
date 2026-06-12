import path from "node:path";
import { randomUUID } from "node:crypto";
import type {
  DirectAgentRunMessageGrant,
  DirectAgentRunMessageGrantDecision,
  DirectAgentRunMessageGrantUsage,
  DirectAgentRunMessageGrantUsageSummary,
} from "../domain/direct-agent-run-message-grant.js";

const normalizeString = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeList = (values: string[] | null | undefined): string[] => {
  if (!Array.isArray(values)) {
    return [];
  }
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const value of values) {
    const item = normalizeString(value);
    if (item && !seen.has(item)) {
      seen.add(item);
      normalized.push(item);
    }
  }
  return normalized;
};

const pathWithinRoot = (filePath: string, root: string): boolean => {
  const relative = path.relative(root, filePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
};

export class DirectAgentRunMessageGrantRegistry {
  private static instance: DirectAgentRunMessageGrantRegistry | null = null;
  private readonly grantsBySenderRunId = new Map<string, DirectAgentRunMessageGrant[]>();
  private readonly usagesByGrantId = new Map<string, DirectAgentRunMessageGrantUsage[]>();

  static getInstance(): DirectAgentRunMessageGrantRegistry {
    if (!DirectAgentRunMessageGrantRegistry.instance) {
      DirectAgentRunMessageGrantRegistry.instance = new DirectAgentRunMessageGrantRegistry();
    }
    return DirectAgentRunMessageGrantRegistry.instance;
  }

  static resetInstance(): void {
    DirectAgentRunMessageGrantRegistry.instance = null;
  }

  register(input: Omit<DirectAgentRunMessageGrant, "grantId"> & { grantId?: string | null }): DirectAgentRunMessageGrant {
    const senderRunId = normalizeString(input.senderRunId);
    if (!senderRunId) {
      throw new Error("senderRunId is required for direct message grants.");
    }
    const grant: DirectAgentRunMessageGrant = {
      grantId: normalizeString(input.grantId) ?? `direct_message_grant_${randomUUID()}`,
      senderRunId,
      purpose: normalizeString(input.purpose) ?? "direct_agent_run_message",
      allowedTargetAgentRunIds: normalizeList(input.allowedTargetAgentRunIds),
      allowedMessageTypes: normalizeList(input.allowedMessageTypes),
      allowedReferenceFileRoots: normalizeList(input.allowedReferenceFileRoots),
      allowedReferenceFiles: normalizeList(input.allowedReferenceFiles),
      maxAcceptedDeliveries: input.maxAcceptedDeliveries ?? null,
      expiresAt: normalizeString(input.expiresAt),
    };
    const existing = this.grantsBySenderRunId.get(senderRunId) ?? [];
    existing.push(grant);
    this.grantsBySenderRunId.set(senderRunId, existing);
    return grant;
  }

  evaluate(input: {
    senderRunId: string;
    targetAgentRunId: string;
    messageType: string;
    referenceFiles: string[];
    now?: Date | null;
  }): DirectAgentRunMessageGrantDecision {
    const grants = this.grantsBySenderRunId.get(input.senderRunId) ?? [];
    if (grants.length === 0) {
      return { kind: "not_applicable" };
    }

    let lastRejection: DirectAgentRunMessageGrantDecision | null = null;
    for (const grant of grants) {
      const rejection = this.rejectReason(grant, input, input.now ?? new Date());
      if (!rejection) {
        return { kind: "allowed", grant };
      }
      lastRejection = rejection;
    }
    return lastRejection ?? {
      kind: "rejected",
      grant: null,
      code: "DIRECT_MESSAGE_GRANT_REJECTED",
      message: "Direct message grant rejected this delivery.",
    };
  }

  recordUsage(input: Omit<DirectAgentRunMessageGrantUsage, "createdAt"> & { createdAt?: string | null }): void {
    const usage: DirectAgentRunMessageGrantUsage = {
      ...input,
      createdAt: input.createdAt?.trim() || new Date().toISOString(),
      referenceFiles: [...input.referenceFiles],
    };
    const usages = this.usagesByGrantId.get(usage.grantId) ?? [];
    usages.push(usage);
    this.usagesByGrantId.set(usage.grantId, usages);
  }

  summarizeGrant(grantId: string): DirectAgentRunMessageGrantUsageSummary | null {
    for (const grants of this.grantsBySenderRunId.values()) {
      const grant = grants.find((candidate) => candidate.grantId === grantId) ?? null;
      if (!grant) {
        continue;
      }
      const usages = this.usagesByGrantId.get(grantId) ?? [];
      return {
        grantId,
        senderRunId: grant.senderRunId,
        purpose: grant.purpose,
        latestUsage: usages[usages.length - 1] ?? null,
        acceptedCount: usages.filter((usage) => usage.accepted).length,
      };
    }
    return null;
  }

  private rejectReason(
    grant: DirectAgentRunMessageGrant,
    input: {
      targetAgentRunId: string;
      messageType: string;
      referenceFiles: string[];
    },
    now: Date,
  ): DirectAgentRunMessageGrantDecision | null {
    if (grant.expiresAt && Date.parse(grant.expiresAt) <= now.getTime()) {
      return this.rejected(grant, "DIRECT_MESSAGE_GRANT_EXPIRED", "Direct message grant has expired.");
    }
    const maxAcceptedDeliveries = grant.maxAcceptedDeliveries ?? null;
    if (maxAcceptedDeliveries !== null && this.acceptedCount(grant.grantId) >= maxAcceptedDeliveries) {
      return this.rejected(grant, "DIRECT_MESSAGE_GRANT_EXHAUSTED", "Direct message grant has already been used.");
    }
    const allowedTargets = normalizeList(grant.allowedTargetAgentRunIds);
    if (allowedTargets.length > 0 && !allowedTargets.includes(input.targetAgentRunId)) {
      return this.rejected(grant, "DIRECT_MESSAGE_GRANT_TARGET_DENIED", "Direct message grant does not allow this target_agent_run_id.");
    }
    const allowedMessageTypes = normalizeList(grant.allowedMessageTypes);
    if (allowedMessageTypes.length > 0 && !allowedMessageTypes.includes(input.messageType)) {
      return this.rejected(grant, "DIRECT_MESSAGE_GRANT_MESSAGE_TYPE_DENIED", "Direct message grant does not allow this message_type.");
    }
    const allowedFiles = normalizeList(grant.allowedReferenceFiles);
    const allowedRoots = normalizeList(grant.allowedReferenceFileRoots);
    for (const referenceFile of input.referenceFiles) {
      if (allowedFiles.includes(referenceFile)) {
        continue;
      }
      if (allowedRoots.some((root) => pathWithinRoot(referenceFile, root))) {
        continue;
      }
      return this.rejected(grant, "DIRECT_MESSAGE_GRANT_REFERENCE_DENIED", "Direct message grant does not allow one or more reference_files paths.");
    }
    return null;
  }

  private acceptedCount(grantId: string): number {
    return (this.usagesByGrantId.get(grantId) ?? []).filter((usage) => usage.accepted).length;
  }

  private rejected(
    grant: DirectAgentRunMessageGrant,
    code: string,
    message: string,
  ): DirectAgentRunMessageGrantDecision {
    return { kind: "rejected", grant, code, message };
  }
}

export const getDirectAgentRunMessageGrantRegistry = (): DirectAgentRunMessageGrantRegistry =>
  DirectAgentRunMessageGrantRegistry.getInstance();

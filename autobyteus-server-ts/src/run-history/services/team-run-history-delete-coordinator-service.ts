import type { TeamRunManifest } from "../domain/team-models.js";
import type { TeamHistoryCleanupDispatcher } from "../distributed/team-history-cleanup-dispatcher.js";
import { TeamMemberMemoryLayoutStore } from "../store/team-member-memory-layout-store.js";

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const isLocalNodeId = (candidate: string | null, localNodeId: string): boolean => {
  if (!candidate) {
    return true;
  }
  if (candidate === "embedded-local" || candidate === "local") {
    return true;
  }
  return candidate === localNodeId;
};

export type TeamRunHistoryDeleteCoordinatorResult = {
  status: "COMPLETE" | "PENDING_RETRY";
  pendingNodeIds: string[];
  detail: string;
};

export class TeamRunHistoryDeleteCoordinatorService {
  private readonly memberLayoutStore: TeamMemberMemoryLayoutStore;
  private readonly dispatcher: TeamHistoryCleanupDispatcher | null;
  private readonly localNodeId: string;

  constructor(options: {
    memberLayoutStore: TeamMemberMemoryLayoutStore;
    localNodeId: string;
    dispatcher?: TeamHistoryCleanupDispatcher | null;
  }) {
    this.memberLayoutStore = options.memberLayoutStore;
    this.localNodeId = normalizeRequiredString(options.localNodeId, "localNodeId");
    this.dispatcher = options.dispatcher ?? null;
  }

  async executeDeletePlan(teamRunId: string, manifest: TeamRunManifest): Promise<TeamRunHistoryDeleteCoordinatorResult> {
    const normalizedTeamId = normalizeRequiredString(teamRunId, "teamRunId");
    const localMemberAgentIds = new Set<string>();
    const remoteMemberAgentIdsByNode = new Map<string, Set<string>>();

    for (const binding of manifest.memberBindings) {
      const memberAgentId = normalizeRequiredString(binding.memberAgentId, "memberAgentId");
      const hostNodeId = normalizeOptionalString(binding.hostNodeId);
      if (isLocalNodeId(hostNodeId, this.localNodeId)) {
        localMemberAgentIds.add(memberAgentId);
        continue;
      }
      if (!hostNodeId) {
        throw new Error("hostNodeId is required for remote member cleanup ownership.");
      }
      const nodeId = hostNodeId;
      const existing = remoteMemberAgentIdsByNode.get(nodeId) ?? new Set<string>();
      existing.add(memberAgentId);
      remoteMemberAgentIdsByNode.set(nodeId, existing);
    }

    await this.memberLayoutStore.removeLocalMemberSubtrees(
      normalizedTeamId,
      Array.from(localMemberAgentIds.values()),
    );
    await this.memberLayoutStore.removeTeamDirIfEmpty(normalizedTeamId);

    if (remoteMemberAgentIdsByNode.size === 0) {
      return {
        status: "COMPLETE",
        pendingNodeIds: [],
        detail: "All cleanup completed locally.",
      };
    }

    if (!this.dispatcher) {
      return {
        status: "PENDING_RETRY",
        pendingNodeIds: Array.from(remoteMemberAgentIdsByNode.keys()).sort((a, b) =>
          a.localeCompare(b),
        ),
        detail: "Remote cleanup dispatcher is unavailable.",
      };
    }

    const pendingNodeIds: string[] = [];
    for (const [nodeId, memberAgentIds] of remoteMemberAgentIdsByNode.entries()) {
      const outcome = await this.dispatcher.dispatchCleanup({
        targetNodeId: nodeId,
        teamRunId: normalizedTeamId,
        memberAgentIds: Array.from(memberAgentIds.values()),
      });
      if (!outcome.success) {
        pendingNodeIds.push(nodeId);
      }
    }

    if (pendingNodeIds.length > 0) {
      return {
        status: "PENDING_RETRY",
        pendingNodeIds: pendingNodeIds.sort((a, b) => a.localeCompare(b)),
        detail: "Distributed cleanup is pending on one or more worker nodes.",
      };
    }

    return {
      status: "COMPLETE",
      pendingNodeIds: [],
      detail: "Distributed cleanup completed across all ownership groups.",
    };
  }
}

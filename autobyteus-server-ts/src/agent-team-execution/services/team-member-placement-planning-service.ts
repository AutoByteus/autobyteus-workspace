import { NodeType } from "../../agent-team-definition/domain/enums.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { MemberPlacementResolver } from "../../distributed/member-placement/member-placement-resolver.js";
import {
  createDefaultPlacementCandidateSnapshotProvider,
  type PlacementCandidateSnapshotProvider,
} from "../../distributed/node-directory/placement-candidate-snapshot-provider.js";
import type { PlacementCandidateNode } from "../../distributed/policies/default-placement-policy.js";
import { normalizeMemberRouteKey } from "../../run-history/utils/team-member-agent-id.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export type { PlacementCandidateSnapshotProvider };

export class TeamMemberPlacementPlanningService {
  private readonly teamDefinitionService: AgentTeamDefinitionService;
  private readonly placementResolver: MemberPlacementResolver;
  private readonly nodeSnapshotProvider: PlacementCandidateSnapshotProvider;

  constructor(options: {
    teamDefinitionService?: AgentTeamDefinitionService;
    placementResolver?: MemberPlacementResolver;
    nodeSnapshotProvider?: PlacementCandidateSnapshotProvider;
  } = {}) {
    this.teamDefinitionService =
      options.teamDefinitionService ?? AgentTeamDefinitionService.getInstance();
    this.placementResolver = options.placementResolver ?? new MemberPlacementResolver();
    this.nodeSnapshotProvider =
      options.nodeSnapshotProvider ?? createDefaultPlacementCandidateSnapshotProvider();
  }

  resolveLocalNodeId(): string {
    return normalizeOptionalString(process.env.AUTOBYTEUS_NODE_ID) ?? "node-local";
  }

  async resolveHostNodeIdByMemberRouteKey(
    teamDefinitionId: string,
  ): Promise<Record<string, string>> {
    let leafNodes: Array<{ memberRouteKey: string; homeNodeId: string | null }>;
    try {
      leafNodes = await this.collectLeafMemberNodes(teamDefinitionId);
    } catch (error) {
      logger.warn(
        `Failed to resolve distributed placement for team definition '${teamDefinitionId}', falling back to local node ownership: ${String(error)}`,
      );
      return {};
    }
    if (leafNodes.length === 0) {
      return {};
    }

    const syntheticDefinition = {
      id: `placement:${teamDefinitionId}`,
      name: `placement:${teamDefinitionId}`,
      description: "placement",
      coordinatorMemberName: leafNodes[0]!.memberRouteKey,
      nodes: leafNodes.map((leaf) => ({
        memberName: leaf.memberRouteKey,
        referenceId: `agent:${leaf.memberRouteKey}`,
        referenceType: NodeType.AGENT,
        homeNodeId: leaf.homeNodeId,
      })),
    };

    const placementByMember = this.placementResolver.resolvePlacement({
      teamDefinition: syntheticDefinition as any,
      nodeSnapshots: this.resolveNodeSnapshots(),
      defaultNodeId: this.resolveLocalNodeId(),
    });

    const byRouteKey: Record<string, string> = {};
    for (const [memberRouteKey, placement] of Object.entries(placementByMember)) {
      byRouteKey[memberRouteKey] = placement.nodeId;
    }
    return byRouteKey;
  }

  private resolveNodeSnapshots(): PlacementCandidateNode[] {
    try {
      const snapshots = this.nodeSnapshotProvider.listPlacementCandidateNodes();
      if (Array.isArray(snapshots) && snapshots.length > 0) {
        return snapshots;
      }
    } catch {
      // Fallback to local-only snapshot when distributed runtime is unavailable.
    }

    return [
      {
        nodeId: this.resolveLocalNodeId(),
        isHealthy: true,
        supportsAgentExecution: true,
      },
    ];
  }

  private async collectLeafMemberNodes(
    teamDefinitionId: string,
    routePrefix: string = "",
    visited: Set<string> = new Set(),
  ): Promise<Array<{ memberRouteKey: string; homeNodeId: string | null }>> {
    const normalizedTeamDefinitionId = teamDefinitionId.trim();
    if (!normalizedTeamDefinitionId) {
      return [];
    }
    if (visited.has(normalizedTeamDefinitionId)) {
      throw new Error(
        `Circular team definition dependency while resolving placement for '${normalizedTeamDefinitionId}'.`,
      );
    }
    visited.add(normalizedTeamDefinitionId);

    const definition = await this.teamDefinitionService.getDefinitionById(normalizedTeamDefinitionId);
    if (!definition) {
      throw new Error(`Team definition '${normalizedTeamDefinitionId}' was not found.`);
    }

    const leaves: Array<{ memberRouteKey: string; homeNodeId: string | null }> = [];
    for (const node of definition.nodes) {
      const memberRouteKey = routePrefix
        ? normalizeMemberRouteKey(`${routePrefix}/${node.memberName}`)
        : normalizeMemberRouteKey(node.memberName);

      if (node.referenceType === NodeType.AGENT) {
        leaves.push({
          memberRouteKey,
          homeNodeId: normalizeOptionalString(node.homeNodeId),
        });
        continue;
      }

      if (node.referenceType === NodeType.AGENT_TEAM) {
        leaves.push(
          ...(await this.collectLeafMemberNodes(node.referenceId, memberRouteKey, new Set(visited))),
        );
      }
    }
    return leaves;
  }
}

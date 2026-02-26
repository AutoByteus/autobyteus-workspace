import { beforeEach, describe, expect, it } from "vitest";
import { NodeType } from "../../../src/agent-team-definition/domain/enums.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/models.js";
import { MemberPlacementResolver } from "../../../src/distributed/member-placement/member-placement-resolver.js";
import {
  HomeNodeUnavailableError,
  UnknownHomeNodeError,
} from "../../../src/distributed/policies/placement-constraint-policy.js";

describe("MemberPlacementResolver", () => {
  let resolver: MemberPlacementResolver;

  beforeEach(() => {
    resolver = new MemberPlacementResolver();
  });

  const buildTeamDefinition = () =>
    new AgentTeamDefinition({
      id: "def-1",
      name: "dist-team",
      description: "Distributed test",
      coordinatorMemberName: "leader",
      nodes: [
        new TeamMember({
          memberName: "leader",
          referenceId: "agent-1",
          referenceType: NodeType.AGENT,
          homeNodeId: "node-a",
        }),
        new TeamMember({
          memberName: "helper",
          referenceId: "agent-2",
          referenceType: NodeType.AGENT,
          homeNodeId: "node-b",
        }),
        new TeamMember({
          memberName: "observer",
          referenceId: "agent-3",
          referenceType: NodeType.AGENT,
        }),
      ],
    });

  it("resolves home and default placements", () => {
    const placement = resolver.resolvePlacement({
      teamDefinition: buildTeamDefinition(),
      nodeSnapshots: [
        { nodeId: "node-a", isHealthy: true },
        { nodeId: "node-b", isHealthy: true },
        { nodeId: "node-c", isHealthy: true },
      ],
      defaultNodeId: "node-c",
    });

    expect(placement.leader).toEqual({
      memberName: "leader",
      nodeId: "node-a",
      source: "home",
    });
    expect(placement.helper).toEqual({
      memberName: "helper",
      nodeId: "node-b",
      source: "home",
    });
    expect(placement.observer).toEqual({
      memberName: "observer",
      nodeId: "node-c",
      source: "default",
    });
  });

  it("maps embedded-local homeNodeId to default node id", () => {
    const teamDefinition = buildTeamDefinition();
    teamDefinition.nodes[2]!.homeNodeId = "embedded-local";

    const placement = resolver.resolvePlacement({
      teamDefinition,
      nodeSnapshots: [
        { nodeId: "node-a", isHealthy: true },
        { nodeId: "node-b", isHealthy: true },
        { nodeId: "node-runtime", isHealthy: true },
        { nodeId: "node-remote", isHealthy: true },
      ],
      defaultNodeId: "node-runtime",
    });

    expect(placement.observer?.source).toBe("home");
    expect(placement.observer?.nodeId).toBe("node-runtime");
  });

  it("throws for unknown home node id", () => {
    const teamDefinition = buildTeamDefinition();
    teamDefinition.nodes[1]!.homeNodeId = "node-missing";

    expect(() =>
      resolver.resolvePlacement({
        teamDefinition,
        nodeSnapshots: [
          { nodeId: "node-a", isHealthy: true },
          { nodeId: "node-b", isHealthy: true },
        ],
      }),
    ).toThrow(UnknownHomeNodeError);
  });

  it("throws when home node is known but unavailable", () => {
    const teamDefinition = buildTeamDefinition();

    expect(() =>
      resolver.resolvePlacement({
        teamDefinition,
        nodeSnapshots: [
          { nodeId: "node-a", isHealthy: false },
          { nodeId: "node-b", isHealthy: true },
          { nodeId: "node-c", isHealthy: true },
        ],
      }),
    ).toThrow(HomeNodeUnavailableError);
  });

  it("does not translate stale homeNodeId values", () => {
    const teamDefinition = buildTeamDefinition();
    teamDefinition.nodes[1]!.homeNodeId = "remote-legacy";

    expect(() =>
      resolver.resolvePlacement({
        teamDefinition,
        nodeSnapshots: [
          { nodeId: "node-a", isHealthy: true },
          { nodeId: "node-b", isHealthy: true },
        ],
      }),
    ).toThrow(UnknownHomeNodeError);
  });
});

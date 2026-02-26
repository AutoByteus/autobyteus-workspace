import { describe, expect, it, vi } from "vitest";
import { NodeType } from "../../../src/agent-team-definition/domain/enums.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/models.js";
import { DependencyHydrationService } from "../../../src/distributed/dependency-hydration/dependency-hydration-service.js";

const buildDefinition = () =>
  new AgentTeamDefinition({
    id: "def-1",
    name: "team",
    description: "desc",
    coordinatorMemberName: "coordinator",
    nodes: [
      new TeamMember({
        memberName: "coordinator",
        referenceId: "agent-1",
        referenceType: NodeType.AGENT,
      }),
      new TeamMember({
        memberName: "helper",
        referenceId: "agent-2",
        referenceType: NodeType.AGENT,
      }),
    ],
  });

describe("DependencyHydrationService", () => {
  it("checks dependencies for each placed member", () => {
    const ensureMemberDependencyReady = vi.fn();
    const service = new DependencyHydrationService({
      ensureMemberDependencyReady,
    });

    service.ensureMemberDependenciesAvailable({
      teamDefinition: buildDefinition(),
      placementByMember: {
        coordinator: { memberName: "coordinator", nodeId: "node-a", source: "default" },
        helper: { memberName: "helper", nodeId: "node-b", source: "default" },
      },
    });

    expect(ensureMemberDependencyReady).toHaveBeenCalledTimes(2);
    expect(ensureMemberDependencyReady).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        teamDefinitionId: "def-1",
        memberName: "coordinator",
        nodeId: "node-a",
      }),
    );
  });

  it("throws when placement is missing for any member", () => {
    const service = new DependencyHydrationService();

    expect(() =>
      service.ensureMemberDependenciesAvailable({
        teamDefinition: buildDefinition(),
        placementByMember: {
          coordinator: { memberName: "coordinator", nodeId: "node-a", source: "default" },
        },
      }),
    ).toThrow("Dependency hydration missing placement for member 'helper'.");
  });
});

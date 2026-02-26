import { describe, expect, it } from "vitest";
import { NodeType } from "../../../src/agent-team-definition/domain/enums.js";
import { TeamMember } from "../../../src/agent-team-definition/domain/models.js";
import {
  HomeNodeUnavailableError,
  PlacementConstraintPolicy,
  UnknownHomeNodeError,
} from "../../../src/distributed/policies/placement-constraint-policy.js";

describe("PlacementConstraintPolicy", () => {
  const policy = new PlacementConstraintPolicy();

  it("rejects unknown homeNodeId", () => {
    const member = new TeamMember({
      memberName: "owner",
      referenceId: "agent-5",
      referenceType: NodeType.AGENT,
      homeNodeId: "missing-node",
    });

    expect(() =>
      policy.validateHomeNodeOwnership(member, new Set(["node-1"]), new Set(["node-1"]))
    ).toThrow(UnknownHomeNodeError);
  });

  it("rejects unavailable homeNodeId", () => {
    const member = new TeamMember({
      memberName: "owner",
      referenceId: "agent-6",
      referenceType: NodeType.AGENT,
      homeNodeId: "node-2",
    });

    expect(() =>
      policy.validateHomeNodeOwnership(member, new Set(["node-1", "node-2"]), new Set(["node-1"]))
    ).toThrow(HomeNodeUnavailableError);
  });

  it("allows valid homeNodeId", () => {
    const member = new TeamMember({
      memberName: "helper",
      referenceId: "agent-7",
      referenceType: NodeType.AGENT,
      homeNodeId: "node-1",
    });

    expect(() =>
      policy.validateHomeNodeOwnership(member, new Set(["node-1", "node-2"]), new Set(["node-1"]))
    ).not.toThrow();
  });

  it("allows missing homeNodeId for defensive fallback paths", () => {
    const member = new TeamMember({
      memberName: "fallback",
      referenceId: "agent-8",
      referenceType: NodeType.AGENT,
    });

    expect(() =>
      policy.validateHomeNodeOwnership(member, new Set(["node-1", "node-2"]), new Set(["node-1"]))
    ).not.toThrow();
  });
});

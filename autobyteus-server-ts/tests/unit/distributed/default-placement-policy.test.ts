import { describe, expect, it } from "vitest";
import { NodeType } from "../../../src/agent-team-definition/domain/enums.js";
import { TeamMember } from "../../../src/agent-team-definition/domain/models.js";
import {
  DefaultPlacementPolicy,
  NoPlacementCandidateError,
} from "../../../src/distributed/policies/default-placement-policy.js";

describe("DefaultPlacementPolicy", () => {
  const policy = new DefaultPlacementPolicy();
  const member = new TeamMember({
    memberName: "writer",
    referenceId: "agent-1",
    referenceType: NodeType.AGENT,
  });

  it("prefers explicit defaultNodeId when available", () => {
    const nodeId = policy.assignByCapabilityAndHealth(
      member,
      [
        { nodeId: "node-a", isHealthy: true },
        { nodeId: "node-b", isHealthy: true },
      ],
      "node-b"
    );

    expect(nodeId).toBe("node-b");
  });

  it("filters out unhealthy and non-agent-execution nodes", () => {
    const nodeId = policy.assignByCapabilityAndHealth(member, [
      { nodeId: "node-a", isHealthy: false },
      { nodeId: "node-b", isHealthy: true, supportsAgentExecution: false },
      { nodeId: "node-c", isHealthy: true, supportsAgentExecution: true },
    ]);

    expect(nodeId).toBe("node-c");
  });

  it("throws when no eligible nodes remain", () => {
    expect(() =>
      policy.assignByCapabilityAndHealth(member, [
        { nodeId: "node-a", isHealthy: false },
        { nodeId: "node-b", supportsAgentExecution: false },
      ])
    ).toThrow(NoPlacementCandidateError);
  });
});

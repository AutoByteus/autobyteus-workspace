import { describe, expect, it } from "vitest";
import { assertAgentTeamAddress } from "../../../src/agent-collaboration/domain/agent-team-address.js";
import {
  buildDeliveryEndpointForParticipant,
  type InterAgentMessageParticipant,
} from "../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";

const buildParticipant = (
  overrides: Partial<InterAgentMessageParticipant> = {},
): InterAgentMessageParticipant => ({
  kind: "agent",
  displayName: "review_lead",
  identity: {
    rootTeamRunId: "team-parent",
    memberAddress: assertAgentTeamAddress("/BuildSquad/review_lead"),
    agentRunId: "review-lead-run",
  },
  ...overrides,
});

describe("inter-agent-message-delivery endpoint", () => {
  it("carries the exact current participant without synthesizing a legacy selector", () => {
    const participant = buildParticipant();
    const endpoint = buildDeliveryEndpointForParticipant(participant);

    expect(endpoint).toEqual({ participant });
    expect(endpoint).not.toHaveProperty("selector");
    expect(Object.isFrozen(endpoint)).toBe(true);
  });

  it("preserves the task Agent's intrinsic run identity without a task-chain wrapper", () => {
    const participant = buildParticipant({
      identity: {
        rootTeamRunId: "team-parent",
        memberAddress: assertAgentTeamAddress("/BuildSquad/review_lead"),
        agentRunId: "task-agent-run",
      },
    });

    expect(buildDeliveryEndpointForParticipant(participant).participant).toBe(participant);
    expect(participant.identity).toEqual({
      rootTeamRunId: "team-parent",
      memberAddress: "/BuildSquad/review_lead",
      agentRunId: "task-agent-run",
    });
    expect(participant).not.toHaveProperty("executionAddress");
    expect(participant).not.toHaveProperty("taskTeamRunIds");
  });
});

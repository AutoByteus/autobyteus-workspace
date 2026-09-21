import { createTeamRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { describe, expect, it, vi } from "vitest";
import { buildInterAgentMessageDeliveryIntent } from "../../../src/agent-team-execution/services/inter-agent-message-delivery-intent-builder.js";
import { testMemberExecutionContext } from "../../fixtures/current-team-run-fixtures.js";

const buildContext = () => testMemberExecutionContext({
  rootTeamRunId: "team-1",
  teamRunId: "team-1",
  teamDefinitionId: "team-def-1",
  memberAddress: "/Sender",
  agentRunId: "run-sender",
  deliverInterAgentMessage: vi.fn(),
});

describe("inter-agent-message-delivery-intent-builder", () => {
  it("builds an unresolved intent without pre-resolving recipients", () => {
    const result = buildInterAgentMessageDeliveryIntent({
      memberExecutionContext: buildContext(),
      recipientAddress: "/unknown",
      content: "hello",
      messageType: "agent_message",
      referenceFiles: ["/tmp/reference.md"],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(result.intent).toEqual(expect.objectContaining({
      rootTeamRunId: "team-1",
      recipientAddress: "/unknown",
      content: "hello",
      messageType: "agent_message",
      referenceFiles: ["/tmp/reference.md"],
    }));
    expect(result.intent.sender.participant).toEqual({
      kind: "agent",
      identity: {
        root: createTeamRootExecutionIdentity("team-1"),
        memberAddress: "/Sender",
        agentRunId: "run-sender",
      },
      displayName: "Sender",
    });
    expect(result.intent).not.toHaveProperty("recipient");
    expect(result.intent).not.toHaveProperty("representedSubTeam");
  });
});

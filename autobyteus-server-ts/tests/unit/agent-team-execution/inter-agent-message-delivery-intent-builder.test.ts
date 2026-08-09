import { describe, expect, it, vi } from "vitest";
import { buildInterAgentMessageDeliveryIntent } from "../../../src/agent-team-execution/services/inter-agent-message-delivery-intent-builder.js";
import { testMemberTeamContext } from "../../fixtures/current-team-run-fixtures.js";

const buildContext = () => testMemberTeamContext({
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
      memberTeamContext: buildContext(),
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
      callerAddressing: expect.objectContaining({
        rootTeamRunId: "team-1",
        memberAddress: "/Sender",
      }),
      content: "hello",
      messageType: "agent_message",
      referenceFiles: ["/tmp/reference.md"],
    }));
    expect(result.intent.sender.participant).toEqual({
      kind: "agent",
      executionAddress: {
        rootTeamRunId: "team-1",
        taskTeamRunIds: [],
        memberAddress: "/Sender",
        taskAgentRunId: null,
      },
      agentRunId: "run-sender",
      displayName: "Sender",
      runtimeKind: "autobyteus",
      platformAgentRunId: null,
      taskId: null,
    });
    expect(result.intent).not.toHaveProperty("recipient");
    expect(result.intent).not.toHaveProperty("representedSubTeam");
  });
});

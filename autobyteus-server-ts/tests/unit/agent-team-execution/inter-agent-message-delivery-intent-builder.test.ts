import { describe, expect, it, vi } from "vitest";
import { MemberTeamContext } from "../../../src/agent-team-execution/domain/member-team-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { buildInterAgentMessageDeliveryIntent } from "../../../src/agent-team-execution/services/inter-agent-message-delivery-intent-builder.js";

const buildContext = () => new MemberTeamContext({
  teamRunId: "team-1",
  teamDefinitionId: "team-def-1",
  teamBackendKind: TeamBackendKind.MIXED,
  memberName: "Sender",
  memberPath: ["sender"],
  memberRouteKey: "sender",
  memberRunId: "run-sender",
  collaboration: {
    addressing: {
      rootTeamRunId: "team-1",
      memberAddress: "/sender",
    },
    deliverInterAgentMessage: vi.fn(),
  },
});

describe("inter-agent-message-delivery-intent-builder", () => {
  it("builds an unresolved intent without pre-resolving recipients", () => {
    const result = buildInterAgentMessageDeliveryIntent({
      memberTeamContext: buildContext(),
      recipientName: "/unknown",
      content: "hello",
      messageType: "agent_message",
      referenceFiles: ["/tmp/reference.md"],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(result.intent).toEqual(expect.objectContaining({
      teamRunId: "team-1",
      recipientName: "/unknown",
      callerAddressing: expect.objectContaining({
        rootTeamRunId: "team-1",
        memberAddress: "/sender",
      }),
      content: "hello",
      messageType: "agent_message",
      referenceFiles: ["/tmp/reference.md"],
    }));
    expect(result.intent.sender.participant).toEqual(expect.objectContaining({
      memberName: "Sender",
      memberRunId: "run-sender",
      memberRouteKey: "sender",
    }));
    expect(result.intent).not.toHaveProperty("recipient");
    expect(result.intent).not.toHaveProperty("representedSubTeam");
  });
});

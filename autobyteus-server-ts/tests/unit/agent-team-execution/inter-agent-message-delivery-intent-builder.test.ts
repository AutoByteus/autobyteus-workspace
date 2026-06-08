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
  communicationRecipients: [
    {
      recipientName: "Known Recipient",
      scope: "local_agent",
      participant: {
        memberKind: "agent",
        memberName: "Known Recipient",
        memberPath: ["known"],
        memberRouteKey: "known",
        memberRunId: "run-known",
        address: { teamRunId: "team-1", memberPath: ["known"], memberRouteKey: "known" },
      },
      delivery: { teamRunId: "team-1", selector: { kind: "route_key", memberRouteKey: "known" } },
      role: null,
      description: null,
    },
  ],
  sendMessageToEnabled: true,
  deliverInterAgentMessage: vi.fn(),
});

describe("inter-agent-message-delivery-intent-builder", () => {
  it("builds an unresolved intent without pre-resolving recipients", () => {
    const result = buildInterAgentMessageDeliveryIntent({
      memberTeamContext: buildContext(),
      target: { kind: "recipient_name", recipientName: "Unknown Recipient" },
      content: "hello",
      messageType: "agent_message",
      referenceFiles: ["/tmp/reference.md"],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    expect(result.intent).toEqual(expect.objectContaining({
      teamRunId: "team-1",
      target: { kind: "recipient_name", recipientName: "Unknown Recipient" },
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
    expect(JSON.stringify(result.intent)).not.toContain("run-known");
  });
});

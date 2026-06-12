import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBoundAutoByteusSendMessageToTool } from "../../../../src/agent-tools/agent-communication/send-message-to.js";
import { buildAgentRunMessageSenderContext } from "../../../../src/agent-communication/domain/agent-run-message-sender.js";
import { SendMessageToDispatcher } from "../../../../src/agent-communication/services/send-message-to-dispatcher.js";
import type { GlobalAgentRunMessageRouter } from "../../../../src/agent-communication/services/global-agent-run-message-router.js";
import { MemberTeamContext } from "../../../../src/agent-team-execution/domain/member-team-context.js";
import { TeamBackendKind } from "../../../../src/agent-team-execution/domain/team-backend-kind.js";
import type { InterAgentMessageDeliveryIntent } from "../../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

const createMemberTeamContext = (
  deliverInterAgentMessage: (request: InterAgentMessageDeliveryIntent) => Promise<{ accepted: boolean; message?: string }>,
) => new MemberTeamContext({
  teamRunId: "team-run-1",
  teamDefinitionId: "team-def-1",
  teamName: "Team",
  teamBackendKind: TeamBackendKind.MIXED,
  memberName: "Professor",
  memberPath: ["professor"],
  memberRouteKey: "professor",
  memberRunId: "run-professor",
  coordinatorMemberRouteKey: "professor",
  communicationRecipients: [
    {
      recipientName: "Writer",
      scope: "local_agent",
      participant: {
        memberKind: "agent",
        memberName: "Writer",
        memberPath: ["writer"],
        memberRouteKey: "writer",
        memberRunId: "run-writer",
        address: { teamRunId: "team-run-1", memberPath: ["writer"], memberRouteKey: "writer" },
      },
      delivery: { teamRunId: "team-run-1", selector: { kind: "route_key", memberRouteKey: "writer" } },
      role: null,
      description: null,
    },
  ],
  allowedRecipientNames: ["Writer"],
  sendMessageToEnabled: true,
  deliverInterAgentMessage,
});

const createDispatcher = () => {
  const globalRouter = {
    deliver: vi.fn(async () => ({ accepted: true, code: "DELIVERED", message: "Delivered globally." })),
  } as unknown as GlobalAgentRunMessageRouter;
  return {
    globalRouter,
    dispatcher: new SendMessageToDispatcher({ globalRouter }),
  };
};

describe("AutoByteus server-owned send_message_to", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("routes recipient_name through the team delivery context", async () => {
    const deliverInterAgentMessage = vi.fn(async () => ({ accepted: true }));
    const memberTeamContext = createMemberTeamContext(deliverInterAgentMessage);
    const { dispatcher, globalRouter } = createDispatcher();
    const tool = createBoundAutoByteusSendMessageToTool(
      buildAgentRunMessageSenderContext({
        senderRunId: memberTeamContext.memberRunId,
        senderName: memberTeamContext.memberName,
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        memberTeamContext,
      }),
      dispatcher,
    );

    const result = await tool.execute({}, {
      recipient_name: "Writer",
      content: "Please review this handoff.",
      message_type: "handoff",
    });

    expect(result).toBe("Delivered message to Writer.");
    expect(globalRouter.deliver).not.toHaveBeenCalled();
    expect(deliverInterAgentMessage).toHaveBeenCalledWith(expect.objectContaining({
      target: { kind: "recipient_name", recipientName: "Writer" },
      content: "Please review this handoff.",
      messageType: "handoff",
    }));
  });

  it("routes target_agent_run_id through the global direct router without team context", async () => {
    const { dispatcher, globalRouter } = createDispatcher();
    const tool = createBoundAutoByteusSendMessageToTool(
      buildAgentRunMessageSenderContext({
        senderRunId: "standalone-sender",
        senderName: "Standalone Sender",
        runtimeKind: RuntimeKind.AUTOBYTEUS,
      }),
      dispatcher,
    );

    const result = await tool.execute({}, {
      target_agent_run_id: "active-target-run",
      content: "Direct message body.",
      message_type: "direct_note",
      reference_files: ["/tmp/direct-note.md"],
    });

    expect(result).toBe("Delivered globally.");
    expect(globalRouter.deliver).toHaveBeenCalledWith(expect.objectContaining({
      sender: expect.objectContaining({ senderRunId: "standalone-sender" }),
      targetAgentRunId: "active-target-run",
      content: "Direct message body.",
      messageType: "direct_note",
      referenceFiles: ["/tmp/direct-note.md"],
    }));
  });

  it("rejects recipient_name when the sender is not a team member", async () => {
    const { dispatcher } = createDispatcher();
    const tool = createBoundAutoByteusSendMessageToTool(
      buildAgentRunMessageSenderContext({
        senderRunId: "standalone-sender",
        senderName: "Standalone Sender",
        runtimeKind: RuntimeKind.AUTOBYTEUS,
      }),
      dispatcher,
    );

    const result = await tool.execute({}, {
      recipient_name: "Writer",
      content: "Team-only delivery.",
    });

    expect(result).toContain("recipient_name delivery requires an active team member context");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { CollaborationContractError } from "../../../../src/agent-collaboration/domain/collaboration-contract-error.js";
import { buildAgentRunMessageSenderContext } from "../../../../src/agent-communication/domain/agent-run-message-sender.js";
import type { GlobalAgentRunMessageRouter } from "../../../../src/agent-communication/services/global-agent-run-message-router.js";
import { SendMessageToDispatcher } from "../../../../src/agent-communication/services/send-message-to-dispatcher.js";
import type { InterAgentMessageDeliveryIntent } from "../../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";
import { createBoundAutoByteusSendMessageToTool } from "../../../../src/agent-tools/agent-communication/send-message-to.js";
import { SendMessageToMcpAdapterProvider } from "../../../../src/agent-tools/mcp/providers/send-message-to-mcp-adapter-provider.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { testMemberTeamContext } from "../../../fixtures/current-team-run-fixtures.js";

const parseEnvelope = (value: string) => JSON.parse(value) as {
  accepted: boolean;
  code: string;
  message: string;
  target_agent_run_id: string | null;
};

const createMemberTeamContext = (
  deliverInterAgentMessage: (request: InterAgentMessageDeliveryIntent) => Promise<{
    accepted: boolean;
    code?: string;
    message?: string;
    agentRunId?: string;
  }>,
) => testMemberTeamContext({
  rootTeamRunId: "team-run-1",
  memberAddress: "/professor",
  agentRunId: "run-professor",
  deliverInterAgentMessage,
});

const createDispatcher = (globalResult = {
  accepted: true,
  code: "DIRECT_DELIVERED",
  message: "Delivered globally.",
  agentRunId: "active-target-run",
}) => {
  const globalRouter = {
    deliver: vi.fn(async () => globalResult),
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

  it("routes a hierarchical recipient_address through Team delivery and returns canonical JSON", async () => {
    const deliverInterAgentMessage = vi.fn(async () => ({
      accepted: true,
      agentRunId: "run-research-lead",
    }));
    const memberTeamContext = createMemberTeamContext(deliverInterAgentMessage);
    const { dispatcher, globalRouter } = createDispatcher();
    const tool = createBoundAutoByteusSendMessageToTool(
      buildAgentRunMessageSenderContext({
        senderRunId: memberTeamContext.identity.agentRunId,
        senderName: "professor",
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        memberTeamContext,
      }),
      dispatcher,
    );

    const result = parseEnvelope(await tool.execute({}, {
      recipient_address: "/research_team/research_lead",
      content: "Please review this handoff.",
      message_type: "handoff",
    }));

    expect(result).toEqual({
      accepted: true,
      code: "DELIVERED",
      message: "Delivered message to /research_team/research_lead.",
      target_agent_run_id: "run-research-lead",
    });
    expect(globalRouter.deliver).not.toHaveBeenCalled();
    expect(deliverInterAgentMessage).toHaveBeenCalledWith(expect.objectContaining({
      rootTeamRunId: "team-run-1",
      recipientAddress: "/research_team/research_lead",
      sender: {
        participant: {
          kind: "agent",
          identity: {
            rootTeamRunId: "team-run-1",
            memberAddress: "/professor",
            agentRunId: "run-professor",
          },
          displayName: "professor",
        },
      },
      content: "Please review this handoff.",
      messageType: "handoff",
    }));
  });

  it("preserves exact-run operation codes unchanged in the public envelope", async () => {
    const { dispatcher, globalRouter } = createDispatcher({
      accepted: true,
      code: "DIRECT_MESSAGE_DELIVERED",
      message: "Delivered globally.",
      agentRunId: "active-target-run",
    });
    const tool = createBoundAutoByteusSendMessageToTool(
      buildAgentRunMessageSenderContext({
        senderRunId: "standalone-sender",
        senderName: "Standalone Sender",
        runtimeKind: RuntimeKind.AUTOBYTEUS,
      }),
      dispatcher,
    );

    const result = parseEnvelope(await tool.execute({}, {
      target_agent_run_id: "active-target-run",
      content: "Direct message body.",
      message_type: "direct_note",
      reference_files: ["/tmp/direct-note.md"],
    }));

    expect(result).toEqual({
      accepted: true,
      code: "DIRECT_MESSAGE_DELIVERED",
      message: "Delivered globally.",
      target_agent_run_id: "active-target-run",
    });
    expect(globalRouter.deliver).toHaveBeenCalledWith(expect.objectContaining({
      sender: expect.objectContaining({ senderRunId: "standalone-sender" }),
      targetAgentRunId: "active-target-run",
      content: "Direct message body.",
      messageType: "direct_note",
      referenceFiles: ["/tmp/direct-note.md"],
    }));
  });

  it("exposes a typed Team placement rejection without provider rewording", async () => {
    const memberTeamContext = createMemberTeamContext(async () => {
      throw new CollaborationContractError(
        "COLLABORATION_TARGET_NOT_FOUND",
        "Collaboration target '/missing' was not found.",
      );
    });
    const { dispatcher } = createDispatcher();
    const tool = createBoundAutoByteusSendMessageToTool(
      buildAgentRunMessageSenderContext({
        senderRunId: memberTeamContext.identity.agentRunId,
        senderName: "professor",
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        memberTeamContext,
      }),
      dispatcher,
    );

    expect(parseEnvelope(await tool.execute({}, {
      recipient_address: "/missing",
      content: "Team-only delivery.",
    }))).toEqual({
      accepted: false,
      code: "COLLABORATION_TARGET_NOT_FOUND",
      message: "Collaboration target '/missing' was not found.",
      target_agent_run_id: null,
    });
  });

  it("rejects recipient_address for a non-Team sender with all envelope fields", async () => {
    const { dispatcher } = createDispatcher();
    const tool = createBoundAutoByteusSendMessageToTool(
      buildAgentRunMessageSenderContext({
        senderRunId: "standalone-sender",
        senderName: "Standalone Sender",
        runtimeKind: RuntimeKind.AUTOBYTEUS,
      }),
      dispatcher,
    );

    expect(parseEnvelope(await tool.execute({}, {
      recipient_address: "./writer",
      content: "Team-only delivery.",
    }))).toMatchObject({
      accepted: false,
      code: "TEAM_CONTEXT_REQUIRED",
      target_agent_run_id: null,
    });
  });

  it.each([
    {
      label: "accepted",
      result: {
        accepted: true,
        code: "DELIVERED",
        message: "Delivered through Team routing.",
        agentRunId: "run-writer",
      },
      isError: undefined,
    },
    {
      label: "rejected",
      result: { accepted: false, code: "COLLABORATION_TARGET_NOT_FOUND", message: "Target was not found." },
      isError: true,
    },
  ])("keeps AutoByteus and MCP $label envelopes byte-for-byte equivalent", async ({ result, isError }) => {
    const deliverInterAgentMessage = vi.fn(async () => result);
    const memberTeamContext = createMemberTeamContext(deliverInterAgentMessage);
    const sender = buildAgentRunMessageSenderContext({
      senderRunId: memberTeamContext.identity.agentRunId,
      senderName: "professor",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      memberTeamContext,
    });
    const { dispatcher } = createDispatcher();
    const input = { recipient_address: "./writer", content: "Provider parity." };
    const nativeTool = createBoundAutoByteusSendMessageToTool(sender, dispatcher);
    const nativeText = await nativeTool.execute({}, input);
    const adapter = new SendMessageToMcpAdapterProvider(dispatcher).getAdapters()[0]!;

    const projected = await adapter.execute({
      session: { sender } as never,
      rawArguments: input,
    });
    expect(projected.kind).toBe("mcp_tool_result");
    if (projected.kind !== "mcp_tool_result") throw new Error("Expected MCP tool result.");
    expect(projected.result.content).toEqual([{ type: "text", text: nativeText }]);
    expect(projected.result.structuredContent).toEqual(JSON.parse(nativeText));
    expect(projected.result.isError).toBe(isError);
  });
});

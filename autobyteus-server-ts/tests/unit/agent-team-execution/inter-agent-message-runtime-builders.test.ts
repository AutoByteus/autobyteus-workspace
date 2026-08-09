import { describe, expect, it } from "vitest";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import type {
  InterAgentMessageParticipant,
  ResolvedInterAgentMessageDeliveryRequest,
} from "../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";
import { createTeamExecutionAddress } from "../../../src/agent-team-execution/domain/team-execution-address.js";
import {
  buildInterAgentDeliveryInputMessage,
  buildInterAgentMessageAgentRunEvent,
  buildRecipientVisibleInterAgentMessageContent,
} from "../../../src/agent-team-execution/services/inter-agent-message-runtime-builders.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const executionAddress = (memberAddress: string, taskAgentRunId?: string | null) =>
  createTeamExecutionAddress({
    rootTeamRunId: "team-1",
    taskTeamRunIds: [],
    memberAddress,
    taskAgentRunId,
  });

const participant = (input: {
  displayName: string;
  agentRunId: string;
  memberAddress: string;
  taskAgentRunId?: string | null;
}): InterAgentMessageParticipant => ({
  kind: "agent",
  executionAddress: executionAddress(input.memberAddress, input.taskAgentRunId),
  agentRunId: input.agentRunId,
  displayName: input.displayName,
  runtimeKind: RuntimeKind.AUTOBYTEUS,
  platformAgentRunId: null,
  taskId: input.taskAgentRunId ? "task-1" : null,
});

const buildRequest = (
  overrides: Partial<ResolvedInterAgentMessageDeliveryRequest> = {},
): ResolvedInterAgentMessageDeliveryRequest => {
  const sender = participant({
    displayName: "Writer",
    agentRunId: "run-writer",
    memberAddress: "/Writer",
  });
  const recipient = participant({
    displayName: "Reviewer",
    agentRunId: "run-reviewer",
    memberAddress: "/Reviewer",
  });
  return {
    rootTeamRunId: "team-1",
    callerAddressing: { rootTeamRunId: "team-1", memberAddress: "/Writer" },
    recipientAddress: "/Reviewer",
    sender: { participant: sender },
    recipient: { participant: recipient },
    senderAddress: sender.executionAddress,
    receiverAddress: recipient.executionAddress,
    content: "Please review the draft.",
    messageType: "direct_message",
    referenceFiles: [],
    resolvedTargetKind: "logical_member",
    targetAgentRunId: "run-reviewer",
    ...overrides,
  };
};

describe("inter-agent-message-runtime-builders", () => {
  it("formats recipient-visible content with the current sender identity", () => {
    const request = buildRequest();
    const expected =
      "You received a message from sender name: Writer, sender id: run-writer\nmessage:\nPlease review the draft.";

    expect(buildRecipientVisibleInterAgentMessageContent(request)).toBe(expected);
    const inputMessage = buildInterAgentDeliveryInputMessage(request);
    expect(inputMessage.content).toBe(expected);
    expect(inputMessage.metadata).toEqual(expect.objectContaining({
      sender_agent_id: "run-writer",
      sender_agent_name: "Writer",
      sender_execution_address: executionAddress("/Writer"),
      receiver_execution_address: executionAddress("/Reviewer"),
      original_message_type: "direct_message",
      team_run_id: "team-1",
      reference_files: [],
    }));
    expect(inputMessage.metadata).not.toHaveProperty("sender_member_route_key");
  });

  it("appends a generated Reference files block when explicit references exist", () => {
    const request = buildRequest({
      content: "Please review the draft summary.",
      referenceFiles: ["/tmp/report.md", "/tmp/evidence.log", "/tmp/report.md"],
    });

    expect(buildRecipientVisibleInterAgentMessageContent(request)).toBe(
      "You received a message from sender name: Writer, sender id: run-writer\n" +
        "message:\nPlease review the draft summary.\n\n" +
        "Reference files:\n- /tmp/report.md\n- /tmp/evidence.log",
    );
    expect(buildInterAgentDeliveryInputMessage(request).metadata).toEqual(
      expect.objectContaining({ reference_files: ["/tmp/report.md", "/tmp/evidence.log"] }),
    );
  });

  it("carries recipient input identity, exact execution addresses, and parent communication linkage", () => {
    const inputMessage = buildInterAgentDeliveryInputMessage(buildRequest({
      content: "Reply with exactly TOKEN.",
      messageType: "frontend_parent_to_subteam",
      parentCommunicationMessageId: "team-message-1",
      recipientInputMessageId: "member-input-1",
      recipientInputDedupeKey: "member_input:team-1:reviewer:member-input-1",
    }));

    expect(inputMessage.metadata).toEqual(expect.objectContaining({
      message_id: "member-input-1",
      recipient_input_message_id: "member-input-1",
      dedupe_key: "member_input:team-1:reviewer:member-input-1",
      input_origin: "inter_agent_delivery",
      sender_execution_address: executionAddress("/Writer"),
      receiver_execution_address: executionAddress("/Reviewer"),
      parent_communication_message_id: "team-message-1",
    }));
  });

  it("uses a task Agent's concrete run id and execution address without route aliases", () => {
    const taskSender = participant({
      displayName: "Writer",
      agentRunId: "run-writer-task-1",
      memberAddress: "/Writer",
      taskAgentRunId: "run-writer-task-1",
    });
    const request = buildRequest({
      sender: { participant: taskSender },
      senderAddress: taskSender.executionAddress,
      content: "hello",
      messageType: null,
    });

    expect(buildRecipientVisibleInterAgentMessageContent(request)).toBe(
      "You received a message from sender name: Writer, sender id: run-writer-task-1\nmessage:\nhello",
    );
    expect(buildInterAgentDeliveryInputMessage(request).metadata).toEqual(
      expect.objectContaining({ sender_execution_address: taskSender.executionAddress }),
    );
  });

  it("builds a recipient-owned event with canonical execution addresses and references", () => {
    const request = buildRequest({
      content: "Please review the referenced report.",
      messageType: "handoff",
      referenceFiles: ["/tmp/report.md"],
    });

    expect(buildInterAgentMessageAgentRunEvent({
      recipientRunId: "run-reviewer",
      request,
      createdAt: "2026-04-08T00:00:00.000Z",
    })).toEqual({
      eventType: AgentRunEventType.INTER_AGENT_MESSAGE,
      runId: "run-reviewer",
      payload: {
        message_id: expect.any(String),
        team_run_id: "team-1",
        sender_agent_id: "run-writer",
        sender_agent_name: "Writer",
        sender_address: executionAddress("/Writer"),
        receiver_run_id: "run-reviewer",
        receiver_agent_name: "Reviewer",
        receiver_address: executionAddress("/Reviewer"),
        recipient_role_name: "Reviewer",
        content: "Please review the referenced report.",
        message_type: "handoff",
        reference_files: ["/tmp/report.md"],
        reference_file_entries: [expect.objectContaining({
          referenceId: expect.any(String),
          path: "/tmp/report.md",
          type: "file",
          createdAt: "2026-04-08T00:00:00.000Z",
          updatedAt: "2026-04-08T00:00:00.000Z",
        })],
        created_at: "2026-04-08T00:00:00.000Z",
      },
      statusHint: null,
    });
  });
});

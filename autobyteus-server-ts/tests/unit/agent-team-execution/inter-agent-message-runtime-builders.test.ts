import { describe, expect, it } from "vitest";
import { assertAgentTeamAddress } from "../../../src/agent-collaboration/domain/agent-team-address.js";
import type {
  InterAgentMessageParticipant,
  ResolvedInterAgentMessageDeliveryRequest,
} from "../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";
import {
  buildInterAgentDeliveryInputMessage,
  buildRecipientVisibleInterAgentMessageContent,
} from "../../../src/agent-team-execution/services/inter-agent-message-runtime-builders.js";

const participant = (input: {
  displayName: string;
  agentRunId: string;
  memberAddress: string;
}): InterAgentMessageParticipant => ({
  kind: "agent",
  identity: {
    rootTeamRunId: "team-1",
    memberAddress: assertAgentTeamAddress(input.memberAddress),
    agentRunId: input.agentRunId,
  },
  displayName: input.displayName,
});

const buildRequest = (
  overrides: Partial<ResolvedInterAgentMessageDeliveryRequest> = {},
): ResolvedInterAgentMessageDeliveryRequest => {
  const sender = participant({ displayName: "Writer", agentRunId: "run-writer", memberAddress: "/Writer" });
  const recipient = participant({ displayName: "Reviewer", agentRunId: "run-reviewer", memberAddress: "/Reviewer" });
  return {
    rootTeamRunId: "team-1",
    recipientAddress: "/Reviewer",
    sender: { participant: sender },
    recipient: { participant: recipient },
    senderIdentity: sender.identity,
    receiverIdentity: recipient.identity,
    content: "Please review the draft.",
    messageType: "direct_message",
    referenceFiles: [],
    ...overrides,
  };
};

describe("inter-agent-message-runtime-builders", () => {
  it("formats content and exact current sender/receiver identity metadata", () => {
    const request = buildRequest();
    const expected =
      "You received a message from sender name: Writer, sender id: run-writer\nmessage:\nPlease review the draft.";

    expect(buildRecipientVisibleInterAgentMessageContent(request)).toBe(expected);
    const inputMessage = buildInterAgentDeliveryInputMessage(request);
    expect(inputMessage.content).toBe(expected);
    expect(inputMessage.metadata).toEqual(expect.objectContaining({
      sender_agent_id: "run-writer",
      sender_agent_name: "Writer",
      sender_member_address: "/Writer",
      receiver_member_address: "/Reviewer",
      original_message_type: "direct_message",
      team_run_id: "team-1",
      reference_files: [],
    }));
    expect(inputMessage.metadata).not.toHaveProperty("sender_execution_address");
    expect(inputMessage.metadata).not.toHaveProperty("receiver_execution_address");
    expect(inputMessage.metadata).not.toHaveProperty("sender_member_route_key");
  });

  it("appends a de-duplicated Reference files block", () => {
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

  it("carries recipient input identity and parent communication linkage", () => {
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
      parent_communication_message_id: "team-message-1",
    }));
  });

  it("uses a task Agent's concrete AgentRun ID without task-chain aliases", () => {
    const taskSender = participant({
      displayName: "Writer",
      agentRunId: "run-writer-task-1",
      memberAddress: "/Writer",
    });
    const request = buildRequest({
      sender: { participant: taskSender },
      senderIdentity: taskSender.identity,
      content: "hello",
      messageType: null,
    });

    expect(buildRecipientVisibleInterAgentMessageContent(request)).toBe(
      "You received a message from sender name: Writer, sender id: run-writer-task-1\nmessage:\nhello",
    );
    expect(buildInterAgentDeliveryInputMessage(request).metadata).toEqual(
      expect.objectContaining({ sender_agent_id: "run-writer-task-1", sender_member_address: "/Writer" }),
    );
  });
});

import { describe, expect, it } from "vitest";
import {
  buildInterAgentDeliveryInputMessage,
  buildInterAgentMessageAgentRunEvent,
  buildRecipientVisibleInterAgentMessageContent,
} from "../../../src/agent-team-execution/services/inter-agent-message-runtime-builders.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";

describe("inter-agent-message-runtime-builders", () => {
  it("formats recipient-visible content with sender identity", () => {
    const request = {
      senderRunId: "run-writer",
      senderMemberName: "Writer",
      teamRunId: "team-1",
      recipientMemberName: "Reviewer",
      content: "Please review the draft.",
      messageType: "direct_message",
    };

    expect(buildRecipientVisibleInterAgentMessageContent(request)).toBe(
      "You received a message from sender name: Writer, sender id: run-writer\nmessage:\nPlease review the draft.",
    );

    const inputMessage = buildInterAgentDeliveryInputMessage(request);
    expect(inputMessage.content).toBe(
      "You received a message from sender name: Writer, sender id: run-writer\nmessage:\nPlease review the draft.",
    );
    expect(inputMessage.metadata).toEqual(
      expect.objectContaining({
        sender_agent_id: "run-writer",
        sender_agent_name: "Writer",
        original_message_type: "direct_message",
        team_run_id: "team-1",
        reference_files: [],
      }),
    );
  });

  it("appends a generated Reference files block when explicit references exist", () => {
    const request = {
      senderRunId: "run-writer",
      senderMemberName: "Writer",
      teamRunId: "team-1",
      recipientMemberName: "Reviewer",
      content: "Please review the draft summary.",
      messageType: "direct_message",
      referenceFiles: ["/tmp/report.md", "/tmp/evidence.log"],
    };

    expect(buildRecipientVisibleInterAgentMessageContent(request)).toBe(
      "You received a message from sender name: Writer, sender id: run-writer\n" +
        "message:\nPlease review the draft summary.\n\n" +
        "Reference files:\n- /tmp/report.md\n- /tmp/evidence.log",
    );

    const inputMessage = buildInterAgentDeliveryInputMessage(request);
    expect(inputMessage.metadata).toEqual(
      expect.objectContaining({
        reference_files: ["/tmp/report.md", "/tmp/evidence.log"],
      }),
    );
  });

  it("falls back to sender run id when sender name is unavailable", () => {
    const request = {
      senderRunId: "run-123",
      senderMemberName: null,
      teamRunId: "team-1",
      recipientMemberName: "Reviewer",
      content: "hello",
      messageType: null,
    };

    expect(buildRecipientVisibleInterAgentMessageContent(request)).toBe(
      "You received a message from sender name: run-123, sender id: run-123\nmessage:\nhello",
    );
  });

  it("builds a recipient-owned inter-agent event with persisted team, receiver identity, and explicit references", () => {
    const request = {
      senderRunId: "run-writer",
      senderMemberName: "Writer",
      teamRunId: "team-1",
      recipientMemberName: "Reviewer",
      content: "Please review the referenced report.",
      messageType: "handoff",
      referenceFiles: ["/tmp/report.md"],
    };

    expect(buildInterAgentMessageAgentRunEvent({
      recipientRunId: "run-reviewer",
      request,
    })).toEqual({
      eventType: AgentRunEventType.INTER_AGENT_MESSAGE,
      runId: "run-reviewer",
      payload: {
        team_run_id: "team-1",
        sender_agent_id: "run-writer",
        sender_agent_name: "Writer",
        receiver_run_id: "run-reviewer",
        receiver_agent_name: "Reviewer",
        recipient_role_name: "Reviewer",
        content: "Please review the referenced report.",
        message_type: "handoff",
        reference_files: ["/tmp/report.md"],
      },
      statusHint: null,
    });
  });
});

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

  it("builds a recipient-owned inter-agent event with persisted team and receiver identity", () => {
    const request = {
      senderRunId: "run-writer",
      senderMemberName: "Writer",
      teamRunId: "team-1",
      recipientMemberName: "Reviewer",
      content: "Please review /tmp/report.md.",
      messageType: "handoff",
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
        content: "Please review /tmp/report.md.",
        message_type: "handoff",
      },
      statusHint: null,
    });
  });
});

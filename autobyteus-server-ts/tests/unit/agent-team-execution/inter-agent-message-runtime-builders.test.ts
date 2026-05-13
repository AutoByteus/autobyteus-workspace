import { describe, expect, it } from "vitest";
import {
  buildInterAgentDeliveryInputMessage,
  buildInterAgentMessageAgentRunEvent,
  buildRecipientVisibleInterAgentMessageContent,
} from "../../../src/agent-team-execution/services/inter-agent-message-runtime-builders.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import type {
  InterAgentMessageDeliveryRequest,
  InterAgentMessageParticipant,
} from "../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";
import type { TeamMemberSelector } from "../../../src/agent-team-execution/domain/team-run-member-identity.js";

const participant = (input: {
  memberName: string | null;
  memberRunId: string;
  memberPath: string[];
  teamRunId?: string;
}): InterAgentMessageParticipant => {
  const memberRouteKey = input.memberPath.join("/");
  return {
    memberKind: "agent",
    memberName: input.memberName ?? "",
    memberPath: [...input.memberPath],
    memberRouteKey,
    memberRunId: input.memberRunId,
    address: {
      teamRunId: input.teamRunId ?? "team-1",
      memberPath: [...input.memberPath],
      memberRouteKey,
    },
  };
};

const endpoint = (
  member: InterAgentMessageParticipant,
  selector: TeamMemberSelector = { kind: "path", memberPath: member.memberPath },
) => ({ participant: member, selector });

const buildRequest = (
  overrides: Partial<InterAgentMessageDeliveryRequest> = {},
): InterAgentMessageDeliveryRequest => ({
  teamRunId: "team-1",
  sender: endpoint(participant({
    memberName: "Writer",
    memberRunId: "run-writer",
    memberPath: ["Writer"],
  })),
  recipient: endpoint(participant({
    memberName: "Reviewer",
    memberRunId: "run-reviewer",
    memberPath: ["Reviewer"],
  })),
  content: "Please review the draft.",
  messageType: "direct_message",
  referenceFiles: [],
  ...overrides,
});

describe("inter-agent-message-runtime-builders", () => {
  it("formats recipient-visible content with sender identity", () => {
    const request = buildRequest();

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
    const request = buildRequest({
      content: "Please review the draft summary.",
      referenceFiles: ["/tmp/report.md", "/tmp/evidence.log"],
    });

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

  it("carries recipient member-input identity and parent communication linkage in delivery metadata", () => {
    const inputMessage = buildInterAgentDeliveryInputMessage(buildRequest({
      sender: endpoint(participant({
        memberName: "program_manager",
        memberRunId: "program-manager-run",
        memberPath: ["program_manager"],
      })),
      recipient: endpoint(participant({
        memberName: "BuildSquad",
        memberRunId: "buildsquad-run",
        memberPath: ["BuildSquad"],
      }), { kind: "route_key", memberRouteKey: "BuildSquad" }),
      content: "Reply with exactly TOKEN.",
      messageType: "frontend_parent_to_subteam",
      parentCommunicationMessageId: "team-message-1",
      recipientInputMessageId: "member-input-1",
      recipientInputDedupeKey: "member_input:team-1:BuildSquad:member-input-1",
    }));

    expect(inputMessage.metadata).toEqual(expect.objectContaining({
      message_id: "member-input-1",
      recipient_input_message_id: "member-input-1",
      dedupe_key: "member_input:team-1:BuildSquad:member-input-1",
      input_origin: "inter_agent_delivery",
      sender_member_route_key: "program_manager",
      sender_member_path: ["program_manager"],
      receiver_member_route_key: "BuildSquad",
      receiver_member_path: ["BuildSquad"],
      parent_communication_message_id: "team-message-1",
    }));
  });

  it("falls back to sender run id when sender name is unavailable", () => {
    const request = buildRequest({
      sender: endpoint(participant({
        memberName: null,
        memberRunId: "run-123",
        memberPath: ["anonymous_sender"],
      })),
      content: "hello",
      messageType: null,
    });

    expect(buildRecipientVisibleInterAgentMessageContent(request)).toBe(
      "You received a message from sender name: run-123, sender id: run-123\nmessage:\nhello",
    );
  });

  it("builds a recipient-owned inter-agent event with persisted team, receiver identity, and explicit references", () => {
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
        sender_route_key: "Writer",
        sender_member_route_key: "Writer",
        sender_path: ["Writer"],
        sender_member_path: ["Writer"],
        receiver_run_id: "run-reviewer",
        receiver_agent_name: "Reviewer",
        receiver_member_route_key: "Reviewer",
        receiver_member_path: ["Reviewer"],
        recipient_role_name: "Reviewer",
        content: "Please review the referenced report.",
        message_type: "handoff",
        reference_files: ["/tmp/report.md"],
        reference_file_entries: [
          expect.objectContaining({
            referenceId: expect.any(String),
            path: "/tmp/report.md",
            type: "file",
            createdAt: "2026-04-08T00:00:00.000Z",
            updatedAt: "2026-04-08T00:00:00.000Z",
          }),
        ],
        created_at: "2026-04-08T00:00:00.000Z",
      },
      statusHint: null,
    });
  });
});

import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { buildRootCommunicationInputMessage } from "../../../../src/agent-collaboration/execution/communication/root-communication-runtime-builder.js";
import {
  createCollaborationMemberExecutionIdentity,
  createRootExecutionIdentity,
} from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";

const identity = (rootSubjectKind: "agent_team" | "agent_org" | "agent", memberAddress: string, agentRunId: string) =>
  createCollaborationMemberExecutionIdentity({
    root: createRootExecutionIdentity({ rootSubjectKind, rootRunId: "root-1" }),
    memberAddress,
    agentRunId,
  });

const build = (rootSubjectKind: "agent_team" | "agent_org" | "agent", senderAddress: string, referenceFiles: string[] = []) =>
  buildRootCommunicationInputMessage({
    delivery: {
      senderIdentity: identity(rootSubjectKind, senderAddress, "lead_9a"),
      senderDisplayName: "lead",
      receiverIdentity: identity(rootSubjectKind, "/reviewer", "reviewer_1"),
      receiverDisplayName: "reviewer",
      content: "Please review.",
    },
    message: {
      messageId: "message-1",
      senderAgentRunId: "lead_9a",
      receiverAgentRunId: "reviewer_1",
      content: "Please review.",
      messageType: "agent_message",
      referenceFiles,
      createdAt: "2026-10-04T00:00:00.000Z",
    },
  });

describe("buildRootCommunicationInputMessage (REQ-005 sender address)", () => {
  it.each(["agent_team", "agent_org", "agent"] as const)(
    "states the sender's full address between name and run ID in a %s root",
    (rootSubjectKind) => {
      const message = build(rootSubjectKind, "/eng/lead");
      expect(message.content).toBe(
        "You received a message from sender name: lead, sender address: /eng/lead, sender id: lead_9a\nmessage:\nPlease review.",
      );
      expect(message.metadata).toEqual(expect.objectContaining({
        sender_member_address: "/eng/lead",
        sender_agent_name: "lead",
        sender_agent_id: "lead_9a",
      }));
    },
  );

  it("keeps the de-duplicated Reference files block after the body", () => {
    expect(build("agent", "/lead", [" /a.md ", "/a.md", "/b.md"]).content).toBe(
      "You received a message from sender name: lead, sender address: /lead, sender id: lead_9a\nmessage:\nPlease review."
        + "\n\nReference files:\n- /a.md\n- /b.md",
    );
  });
});

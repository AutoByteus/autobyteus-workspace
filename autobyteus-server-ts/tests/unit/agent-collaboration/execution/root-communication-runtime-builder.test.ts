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

describe("buildRootCommunicationInputMessage (header: the sender run ID only)", () => {
  it.each(["agent_team", "agent_org", "agent"] as const)(
    "names the sender by name and ID, without its address, in a %s root",
    (rootSubjectKind) => {
      const message = build(rootSubjectKind, "/eng/lead");
      expect(message.content).toBe(
        "You received a message from the agent with sender run ID \"lead_9a\".\nmessage:\nPlease review.",
      );
      expect(message.content).not.toContain("/eng/lead");
      expect(message.metadata).toEqual(expect.objectContaining({
        sender_member_address: "/eng/lead",
        sender_agent_name: "lead",
        sender_agent_id: "lead_9a",
      }));
    },
  );

  it("keeps the de-duplicated Reference files block after the body", () => {
    expect(build("agent", "/lead", [" /a.md ", "/a.md", "/b.md"]).content).toBe(
      "You received a message from the agent with sender run ID \"lead_9a\".\nmessage:\nPlease review."
        + "\n\nReference files:\n- /a.md\n- /b.md",
    );
  });
});

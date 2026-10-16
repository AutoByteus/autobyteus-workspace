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

const build = (rootSubjectKind: "agent_team" | "agent_org" | "agent", senderAddress: string, referenceFiles: string[] = [], reaching: string | null = null) =>
  buildRootCommunicationInputMessage({
    delivery: {
      senderIdentity: identity(rootSubjectKind, senderAddress, "lead_9a"),
      senderDisplayName: "lead",
      senderAddress: reaching,
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

describe("buildRootCommunicationInputMessage (header: sender address when it reaches the sender, and run id; no name)", () => {
  it.each(["agent_team", "agent_org", "agent"] as const)(
    "gives only the sender run id when the address does not reach the sender, in a %s root",
    (rootSubjectKind) => {
      const message = build(rootSubjectKind, "/eng/lead");
      expect(message.content).toBe(
        "You received a message from the agent with sender run id \"lead_9a\".\nmessage:\nPlease review.",
      );
      expect(message.content).not.toContain("/eng/lead");
      expect(message.metadata).toEqual(expect.objectContaining({
        sender_member_address: "/eng/lead",
        sender_agent_name: "lead",
        sender_agent_id: "lead_9a",
      }));
    },
  );

  it("gives the sender address and run id when that address reaches the sender (design T-5)", () => {
    expect(build("agent_team", "/lead", [], "/lead").content).toBe(
      "You received a message from the agent with sender address \"/lead\" and sender run id \"lead_9a\".\nmessage:\nPlease review.",
    );
  });

  it("keeps the de-duplicated Reference files block after the body", () => {
    expect(build("agent", "/lead", [" /a.md ", "/a.md", "/b.md"]).content).toBe(
      "You received a message from the agent with sender run id \"lead_9a\".\nmessage:\nPlease review."
        + "\n\nReference files:\n- /a.md\n- /b.md",
    );
  });
});

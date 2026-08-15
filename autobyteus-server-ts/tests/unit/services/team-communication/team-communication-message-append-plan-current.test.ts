import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { createTeamCommunicationMessageAppendPlan } from "../../../../src/services/team-communication/team-communication-message-append-plan.js";

describe("current Team communication append plan", () => {
  it("releases a retained indeterminate reservation only after root fail-stop disposal", () => {
    const cancel = vi.fn();
    const commit = vi.fn(() => Object.freeze({ release: vi.fn() }));
    const replaceCurrent = vi.fn();
    const publish = vi.fn();
    const current = Object.freeze({
      schemaVersion: 1 as const,
      rootTeamRunId: "root-run",
      messages: Object.freeze([]),
    });
    const message = Object.freeze({
      messageId: "message-1",
      senderAgentRunId: "sender-run",
      receiverAgentRunId: "receiver-run",
      content: "hello",
      messageType: "agent_message",
      referenceFiles: Object.freeze([]),
      createdAt: "2026-08-15T00:00:00.000Z",
    });
    const plan = createTeamCommunicationMessageAppendPlan({
      rootTeamRunId: current.rootTeamRunId,
      message,
      inputMessage: new AgentInputUserMessage("hello", SenderType.AGENT),
      reservation: Object.freeze({ agentRunId: "receiver-run", cancel, commit }),
      isAccepting: () => true,
      getCurrent: () => current,
      replaceCurrent,
      publish,
    });

    const prepared = plan.prepareAgainstCurrent();
    expect(prepared.prepared).toBe(true);
    plan.disposeAfterRootFailStop();
    expect(cancel).toHaveBeenCalledOnce();
    if (!prepared.prepared) throw new Error("Expected prepared append plan.");
    prepared.commit.commitAfterDurability();
    expect(commit).not.toHaveBeenCalled();
    expect(replaceCurrent).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });
});

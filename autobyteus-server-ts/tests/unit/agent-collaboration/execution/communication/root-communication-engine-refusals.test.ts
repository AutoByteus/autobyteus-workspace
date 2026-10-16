import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { RootCommunicationEngine } from "../../../../../src/agent-collaboration/execution/communication/root-communication-engine.js";
import type { RootCommunicationAdapter } from "../../../../../src/agent-collaboration/execution/communication/root-communication-adapter.js";
import { TaskDelegationError } from "../../../../../src/agent-collaboration/execution/task/task-delegation-command.js";
import type { CollaborationMemberExecutionIdentity } from "../../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";

const root = { rootSubjectKind: "agent_team", rootRunId: "team-1" } as never;
const identity = (agentRunId: string, memberAddress: string): CollaborationMemberExecutionIdentity =>
  ({ root, memberAddress, agentRunId } as never);
const sender = identity("run-a", "/a");
const receiver = identity("run-b", "/b");

const engineWith = (assertDeliveryAllowed: () => void, isCurrentAgent = () => true) => {
  const adapter: RootCommunicationAdapter = {
    root,
    initialMessages: [],
    isOpen: () => true,
    assertDeliveryAllowed,
    isCurrentAgent,
    buildRecipientInput: () => new AgentInputUserMessage("x"),
    reserveRecipientInput: vi.fn(async () => ({ reserved: false, code: "NOT_RESERVED", message: "stub" })) as never,
    commitAppend: vi.fn() as never,
  };
  return { engine: new RootCommunicationEngine(adapter), adapter };
};
const deliver = (engine: RootCommunicationEngine, to = receiver) => engine.deliver({
  senderIdentity: sender, senderDisplayName: "a", receiverIdentity: to, receiverDisplayName: "b", content: "hello",
});

describe("RootCommunicationEngine refusals reach the agent as results (SR-003 T-4, REQ-008)", () => {
  it.each([
    ["TASK_AGENT_RESOURCE_CONFLICT", "You can't message this agent: it works on a different Task."],
    ["TASK_AGENT_RESOURCE_CLOSED", "Your Task is DONE or CANCELLED, so you can't start new work."],
  ] as const)("%s from the delivery scope is returned, not thrown", async (code, message) => {
    const { engine, adapter } = engineWith(() => { throw new TaskDelegationError(code, message); });
    await expect(deliver(engine)).resolves.toEqual({ accepted: false, code, message });
    expect(adapter.reserveRecipientInput).not.toHaveBeenCalled();
  });

  it("any other error from the delivery scope still throws", async () => {
    const { engine } = engineWith(() => { throw new Error("storage is gone"); });
    await expect(deliver(engine)).rejects.toThrow("storage is gone");
    const { engine: other } = engineWith(() => { throw new TaskDelegationError("ROOT_RUN_NOT_ACTIVE", "stopping"); });
    await expect(deliver(other)).rejects.toThrow("stopping");
  });

  it("a message to yourself and a message to an agent that is not running here say what to do", async () => {
    const { engine } = engineWith(() => undefined);
    await expect(deliver(engine, sender)).resolves.toEqual({
      accepted: false, code: "COLLABORATION_SELF_TARGET_REJECTED", message: "You can't send a message to yourself." });
    const { engine: gone } = engineWith(() => undefined, () => false);
    await expect(deliver(gone)).resolves.toEqual({
      accepted: false, code: "COLLABORATION_CONTEXT_REQUIRED",
      message: "The agent with that ID is not running here, so the message was not sent. Use an exact ID you were given." });
  });
});

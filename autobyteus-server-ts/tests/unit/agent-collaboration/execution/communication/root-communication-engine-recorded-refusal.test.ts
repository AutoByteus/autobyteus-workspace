import { describe, expect, it } from "vitest";
import { isRecordedRunRefusal, RootCommunicationEngine } from "../../../../../src/agent-collaboration/execution/communication/root-communication-engine.js";
import { TaskDelegationError } from "../../../../../src/agent-collaboration/execution/task/task-delegation-command.js";
import type { CollaborationMemberExecutionIdentity, RootExecutionIdentity } from "../../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { communicationPortDouble, reservationDouble } from "../../helpers/communication-port-double.js";

/**
 * autobyteus-461 SR-076 follow-up: a message from another run refused after the receiver's durable write stays in the
 * receiver's log (REQ-012), and the receiver's answer says so, so the sender's log records it too (TC-13). A refusal
 * before the write says nothing of the kind, and a message inside one root never carries it.
 */
const team: RootExecutionIdentity = { rootSubjectKind: "agent_team", rootRunId: "team-1" };
const manager: RootExecutionIdentity = { rootSubjectKind: "agent", rootRunId: "manager" };
const member = (root: RootExecutionIdentity, agentRunId: string): CollaborationMemberExecutionIdentity => ({ root, memberAddress: `/${agentRunId}`, agentRunId } as never);
const message = { messageId: "m-1", senderAgentRunId: "manager", receiverAgentRunId: "lead", content: "Status?", messageType: "agent_message",
  referenceFiles: [], createdAt: "2026-11-13T00:00:00.000Z" };
const CLOSED = new TaskDelegationError("TASK_AGENT_RESOURCE_CLOSED", "The Task is DONE.");
/** The Task closes at the given check: 1 the entry, 2 under the lock (before the write), 3 after the durable write. */
const closingAt = (check: number) => {
  let calls = 0;
  return () => { calls += 1; if (calls >= check) throw CLOSED; };
};
const accept = (engine: RootCommunicationEngine, assertAllowed: () => void) => engine.acceptFromRun({ message, senderIdentity: member(manager, "manager"),
  senderDisplayName: "manager", senderAddress: null, receiverIdentity: member(team, "lead"), receiverDisplayName: "lead", assertAllowed, relation: "related" });

describe("RootCommunicationEngine: a refusal after the receiver's durable write (SR-076)", () => {
  it("the Task closing after the write: the record is kept and shown, and the refusal says the receiver recorded it", async () => {
    const port = communicationPortDouble(team);
    const result = await accept(new RootCommunicationEngine(port), closingAt(3));
    expect(result).toEqual({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED", message: "The Task is DONE.", recordedByReceiver: true });
    expect(isRecordedRunRefusal(result)).toBe(true);
    expect(port.publishMessage).toHaveBeenCalledWith(expect.objectContaining({ message, relation: "related", sender: { run: manager } }));
  });

  it("the recipient stopping after the write: the same", async () => {
    const reservation = { ...reservationDouble("lead"), commit: () => { throw new Error("stopped"); } };
    const port = communicationPortDouble(team, { reserveRecipientInput: async () => ({ reserved: true as const, reservation }) });
    const result = await accept(new RootCommunicationEngine(port), () => undefined);
    expect(result).toMatchObject({ accepted: false, code: "AGENT_RUN_NOT_ACCEPTING_INPUT", recordedByReceiver: true });
  });

  it.each([["at the entry", 1], ["under the lock, before the write", 2]])("the Task closing %s: nothing is recorded, and the refusal does not say so", async (_when, check) => {
    const port = communicationPortDouble(team);
    const result = await accept(new RootCommunicationEngine(port), closingAt(check));
    expect(result).toEqual({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED", message: "The Task is DONE." });
    expect(isRecordedRunRefusal(result)).toBe(false);
    expect(port.publishMessage).not.toHaveBeenCalled();
  });

  it("a message inside one root, refused after its write, is answered as before (its one log has it)", async () => {
    const check = closingAt(3);
    const port = communicationPortDouble(team, { assertDeliveryAllowed: () => check() });
    const result = await new RootCommunicationEngine(port).deliver({ senderIdentity: member(team, "lead"), senderDisplayName: "lead", senderAddress: null,
      receiverIdentity: member(team, "coder"), receiverDisplayName: "coder", content: "Review it." });
    expect(result).toEqual({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED", message: "The Task is DONE." });
  });
});

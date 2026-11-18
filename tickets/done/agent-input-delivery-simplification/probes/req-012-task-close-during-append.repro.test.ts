// REPRODUCTION (fails today; the REQ-012 fix turns it green) (agent-input-delivery-simplification, OBS-003 recheck on 8b34e8ae10). Not a deliverable test.
import { describe, expect, it, vi } from "vitest";
import { writeFileSync } from "node:fs";
import { RootCommunicationEngine } from "../../src/agent-collaboration/execution/communication/root-communication-engine.js";
import { StandaloneRootCommunicationAdapter } from "../../src/standalone-agent-run-root/services/standalone-root-communication-adapter.js";
import { StandaloneRootPersistenceCoordinator } from "../../src/standalone-agent-run-root/services/standalone-root-persistence-coordinator.js";
import { TaskDelegationError } from "../../src/agent-collaboration/execution/task/task-delegation-command.js";

const hostRunId = "host-run";
const root = Object.freeze({ rootSubjectKind: "agent" as const, rootRunId: hostRunId });
const sender = Object.freeze({ root, memberAddress: "/host", agentRunId: "host-run" });
const receiver = Object.freeze({ root, memberAddress: "/helper", agentRunId: "helper-run" });
const emptyFile = { schemaVersion: 1, subjectKind: "agent", hostRunId, messages: [] } as any;

describe("REQ-012: a Task closing during a teammate message append does not stop the root", () => {
  it("records what the root does when the Task closes between the durable append and the reservation commit", async () => {
    let taskOpen = true;
    let finishWrite!: () => void;
    let markStarted!: () => void;
    const writeStarted = new Promise<void>((started) => { markStarted = started; });
    let appendCalls = 0;
    const store = {
      appendMessage: vi.fn(() => {
        appendCalls += 1;
        if (appendCalls > 1) return Promise.resolve({ outcome: "committed", file: "message_log" });
        return new Promise((resolve) => {
          markStarted();
          finishWrite = () => resolve({ outcome: "committed", file: "message_log" });
        });
      }),
      writeMessages: vi.fn(async () => ({ outcome: "committed", file: "communication_messages" })),
      writeTree: vi.fn(async () => ({ outcome: "committed", file: "tree" })),
    };
    const enterPersistenceFailStop = vi.fn();
    const persistence = new StandaloneRootPersistenceCoordinator({
      hostRunId, collaborationDir: "/tmp/probe-v3", store: store as any, packageExists: true,
      getMessages: () => emptyFile, getTree: () => ({}) as any,
      onPackageCreated: async () => undefined, enterPersistenceFailStop,
    });
    const reservationCommit = vi.fn(() => Object.freeze({ release: vi.fn() }));
    const cancel = vi.fn();
    const adapter = new StandaloneRootCommunicationAdapter({
      root, initial: emptyFile, persistence,
      isOpen: () => true, isCurrentAgent: () => true,
      messageLogOwnerOf: () => Object.freeze({ kind: "coordinating" as const }),
      assertDeliveryAllowed: () => {
        if (!taskOpen) throw new TaskDelegationError("TASK_AGENT_RESOURCE_CLOSED", "The Task work for this agent run is closed (its Task is DONE or CANCELLED).");
      },
      reserveRecipientInput: async () => ({ reserved: true, reservation: Object.freeze({ agentRunId: "helper-run", commit: reservationCommit, cancel }) }) as any,
      replaceMessages: vi.fn(), publish: vi.fn(), presentCommittedMessage: vi.fn(),
    });
    const engine = new RootCommunicationEngine(adapter);
    const delivery = engine.deliver({ senderIdentity: sender, senderDisplayName: "host", senderAddress: null,
      receiverIdentity: receiver, receiverDisplayName: "helper", content: "final report" } as any);
    await writeStarted;
    taskOpen = false; // the user or delegator marks the Task DONE while the append is in flight
    finishWrite();
    const outcome = await delivery.then((value) => ({ resolved: value }), (error: Error) => ({ rejected: `${error.name}: ${error.message}` }));
    const later = await persistence.commitCommunication({
      nextMessages: emptyFile, message: { messageId: "m2" } as any, logOwners: [],
      commitAfterDurability: () => undefined, cancelBeforeDurability: () => undefined,
    }).then(() => "accepted", (e: Error) => e.name);
    // eslint-disable-next-line no-console
    writeFileSync("/tmp/req-012-repro-result.json", JSON.stringify({ outcome, failStopEntered: enterPersistenceFailStop.mock.calls.length,
      reservationCommitted: reservationCommit.mock.calls.length, cancelled: cancel.mock.calls.length, laterRootWrite: later,
      engineMessages: engine.getMessages().length }, null, 1));
    expect(outcome).toEqual({ resolved: expect.objectContaining({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" }) });
    expect(enterPersistenceFailStop).not.toHaveBeenCalled();
    expect(reservationCommit).not.toHaveBeenCalled();
    expect(later).toBe("accepted");
  });
});

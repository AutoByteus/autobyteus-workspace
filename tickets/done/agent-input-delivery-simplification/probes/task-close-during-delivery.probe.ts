// DISPOSABLE INVESTIGATION PROBE (agent-input-delivery-simplification, OBS-003). Not a deliverable test.
import { describe, expect, it, vi } from "vitest";
import { RootCommunicationEngine } from "../../src/agent-collaboration/execution/communication/root-communication-engine.js";
import { StandaloneRootCommunicationAdapter } from "../../src/standalone-agent-run-root/services/standalone-root-communication-adapter.js";
import { StandaloneRootPersistenceCoordinator } from "../../src/standalone-agent-run-root/services/standalone-root-persistence-coordinator.js";

const hostRunId = "host-run";
const root = Object.freeze({ rootSubjectKind: "agent" as const, rootRunId: hostRunId });
const sender = Object.freeze({ root, memberAddress: "/host", agentRunId: "host-run" });
const receiver = Object.freeze({ root, memberAddress: "/helper", agentRunId: "helper-run" });

describe("probe: Task closes while a teammate message is being written", () => {
  it("shows what the root does when the scope closes between durable write and reservation commit", async () => {
    let taskOpen = true;
    let finishWrite!: () => void;
    const writeStarted = new Promise<void>((started) => {
      (globalThis as any).__started = started;
    });
    const store = {
      writeMessages: vi.fn(() => new Promise((resolve) => {
        (globalThis as any).__started();
        finishWrite = () => resolve({ outcome: "committed", file: "communication_messages" });
      })),
    };
    const enterPersistenceFailStop = vi.fn();
    const persistence = new StandaloneRootPersistenceCoordinator({
      hostRunId, collaborationDir: "/tmp/probe", store: store as any, packageExists: true,
      getMessages: () => ({ schemaVersion: 1, subjectKind: "agent", hostRunId, messages: [] }) as any,
      onPackageCreated: async () => undefined, enterPersistenceFailStop,
    });
    const reservationCommit = vi.fn(() => Object.freeze({ release: vi.fn() }));
    const cancel = vi.fn();
    const adapter = new StandaloneRootCommunicationAdapter({
      root, initial: { schemaVersion: 1, subjectKind: "agent", hostRunId, messages: [] } as any, persistence,
      isOpen: () => true, isCurrentAgent: () => true,
      assertDeliveryAllowed: () => { if (!taskOpen) throw new Error("TASK_AGENT_RESOURCE_CLOSED"); },
      reserveRecipientInput: async () => ({ reserved: true, reservation: Object.freeze({ agentRunId: "helper-run", commit: reservationCommit, cancel }) }),
      replaceMessages: vi.fn(), publish: vi.fn(), presentCommittedMessage: vi.fn(),
    });
    const engine = new RootCommunicationEngine(adapter);
    const delivery = engine.deliver({ senderIdentity: sender, senderDisplayName: "host", receiverIdentity: receiver,
      receiverDisplayName: "helper", content: "final report" } as any);
    await writeStarted;
    taskOpen = false; // user / delegator marks the Task DONE while the file write is in flight
    finishWrite();
    const outcome = await delivery.then((value) => ({ resolved: value }), (error: Error) => ({ rejected: `${error.name}: ${error.message}` }));
    // eslint-disable-next-line no-console
    console.log("PROBE outcome:", JSON.stringify(outcome), "failStopEntered:", enterPersistenceFailStop.mock.calls.length,
      "reservationCommitted:", reservationCommit.mock.calls.length, "cancelled:", cancel.mock.calls.length);
    const later = await persistence.commitCommunication({ nextMessages: { schemaVersion: 1, subjectKind: "agent", hostRunId, messages: [] } as any,
      commitAfterDurability: () => undefined, cancelBeforeDurability: () => undefined }).then(() => "accepted", (e: Error) => e.name);
    // eslint-disable-next-line no-console
    console.log("PROBE later root write:", later);
    expect(true).toBe(true);
  });
});

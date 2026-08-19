import { describe, expect, it } from "vitest";
import { AgentRunCommandRegistry } from "../../../src/agent-execution/services/agent-run-command-registry.js";

describe("AgentRunCommandRegistry", () => {
  it("admits several distinct commands while preserving duplicate replay identity", () => {
    const registry = new AgentRunCommandRegistry();
    const first = registry.begin({ runId: "run-1", messageId: "msg-1", dedupeKey: "d-1" });
    registry.markAdmitted({ runId: "run-1", messageId: "msg-1" });
    const second = registry.begin({ runId: "run-1", messageId: "msg-2", dedupeKey: "d-2" });
    registry.markAdmitted({ runId: "run-1", messageId: "msg-2" });
    const duplicate = registry.begin({ runId: "run-1", messageId: "msg-1", dedupeKey: "d-1" });

    expect(first.kind).toBe("accepted");
    expect(second.kind).toBe("accepted");
    expect(duplicate).toMatchObject({ kind: "duplicate", record: { state: "ADMITTED" } });
    expect(registry.getOutstandingRecords("run-1").map((record) => record.messageId))
      .toEqual(["msg-1", "msg-2"]);
  });

  it("projects a forwarded record before the oldest admitted record", () => {
    const registry = new AgentRunCommandRegistry();
    registry.begin({ runId: "run-1", messageId: "msg-1", dedupeKey: "d-1" });
    registry.markAdmitted({ runId: "run-1", messageId: "msg-1" });
    registry.begin({ runId: "run-1", messageId: "msg-2", dedupeKey: "d-2" });
    registry.markAdmitted({ runId: "run-1", messageId: "msg-2" });
    registry.markForwarded({ runId: "run-1", messageId: "msg-2", turnId: "turn-2" });

    expect(registry.getPresentedOutstandingRecord("run-1")).toMatchObject({
      messageId: "msg-2",
      state: "FORWARDED",
      turnId: "turn-2",
    });
  });

  it("settles independently and never overwrites a terminal record", () => {
    const registry = new AgentRunCommandRegistry();
    registry.begin({ runId: "run-1", messageId: "msg-1", dedupeKey: "d-1" });
    registry.markAdmitted({ runId: "run-1", messageId: "msg-1" });
    registry.markForwarded({ runId: "run-1", messageId: "msg-1", turnId: null });
    registry.associateIdentified({ runId: "run-1", messageId: "msg-1", turnId: "turn-1" });
    registry.markCompleted({ runId: "run-1", messageId: "msg-1", turnId: "turn-1" });
    registry.markFailed({
      runId: "run-1",
      messageId: "msg-1",
      code: "RUNTIME_REJECTED",
      message: "late",
    });

    expect(registry.getRecord("run-1", "msg-1")).toMatchObject({
      state: "COMPLETED",
      turnId: "turn-1",
    });
    expect(registry.hasOutstandingCommands("run-1")).toBe(false);
  });

  it("retains terminal records during ttl and purges them after ttl", () => {
    const registry = new AgentRunCommandRegistry(60_000);
    registry.begin({ runId: "run-1", messageId: "msg-1", dedupeKey: "d-1" });
    registry.markCompleted({ runId: "run-1", messageId: "msg-1", turnId: "turn-1" });
    expect(registry.begin({ runId: "run-1", messageId: "msg-1", dedupeKey: "d-1" }).kind)
      .toBe("duplicate");

    const record = registry.getRecord("run-1", "msg-1")!;
    record.terminalAt = new Date(Date.now() - 120_000).toISOString();
    expect(registry.begin({ runId: "run-1", messageId: "msg-1", dedupeKey: "d-new" }))
      .toMatchObject({ kind: "accepted", record: { dedupeKey: "d-new" } });
  });
});

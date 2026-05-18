import { describe, expect, it } from "vitest";
import { AgentRunCommandRegistry } from "../../../src/agent-execution/services/agent-run-command-registry.js";

describe("AgentRunCommandRegistry", () => {
  it("returns duplicate_in_progress shape for the same in-flight command and rejects different ids", () => {
    const registry = new AgentRunCommandRegistry();

    const first = registry.begin({
      runId: "run-1",
      messageId: "msg-1",
      dedupeKey: "dedupe-1",
    });
    expect(first.kind).toBe("accepted");

    const duplicate = registry.begin({
      runId: "run-1",
      messageId: "msg-1",
      dedupeKey: "dedupe-1",
    });
    expect(duplicate.kind).toBe("duplicate");
    expect(duplicate.record.state).toBe("STARTING");

    const busy = registry.begin({
      runId: "run-1",
      messageId: "msg-2",
      dedupeKey: "dedupe-2",
    });
    expect(busy.kind).toBe("busy");
    expect(busy.record.state).toBe("REJECTED");
    expect(busy.record.code).toBe("RUN_COMMAND_IN_PROGRESS");
  });

  it("retains terminal records during ttl and purges them after ttl", () => {
    const registry = new AgentRunCommandRegistry(60_000);
    const first = registry.begin({
      runId: "run-1",
      messageId: "msg-1",
      dedupeKey: "dedupe-1",
    });
    expect(first.kind).toBe("accepted");
    registry.markCompleted({ runId: "run-1", messageId: "msg-1", turnId: "turn-1" });

    const duplicateCompleted = registry.begin({
      runId: "run-1",
      messageId: "msg-1",
      dedupeKey: "dedupe-1",
    });
    expect(duplicateCompleted.kind).toBe("duplicate");
    expect(duplicateCompleted.record.state).toBe("COMPLETED");
    expect(duplicateCompleted.record.turnId).toBe("turn-1");

    const record = registry.getRecord("run-1", "msg-1");
    expect(record).not.toBeNull();
    record!.terminalAt = new Date(Date.now() - 120_000).toISOString();

    const acceptedAfterPurge = registry.begin({
      runId: "run-1",
      messageId: "msg-1",
      dedupeKey: "dedupe-1-new",
    });
    expect(acceptedAfterPurge.kind).toBe("accepted");
    expect(acceptedAfterPurge.record.dedupeKey).toBe("dedupe-1-new");
  });
});

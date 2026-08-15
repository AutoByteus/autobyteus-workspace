import { describe, expect, it, vi } from "vitest";
import { TeamRunPersistenceCoordinator } from "../../../src/agent-team-execution/services/team-run-persistence-coordinator.js";

const tree = Object.freeze({ rootTeam: Object.freeze({ teamRunId: "root-run" }) }) as never;

const createHarness = (writeResult: object) => {
  const order: string[] = [];
  const finishLocalTeardown = vi.fn(async () => ({ accepted: true as const }));
  const cancelBeforeDurability = vi.fn(() => order.push("cancel"));
  const commitAfterDurability = vi.fn(() => {
    order.push("detach");
    return Object.freeze({ finishLocalTeardown });
  });
  const commitTreeAndEvent = vi.fn(() => order.push("tree-event"));
  const enterPersistenceFailStop = vi.fn(() => order.push("fail-stop"));
  const executionTreeStore = {
    write: vi.fn(async () => {
      order.push("write");
      return writeResult;
    }),
  };
  const coordinator = new TeamRunPersistenceCoordinator({
    rootTeamRunId: "root-run",
    teamMemoryDir: "/tmp/current-team-run",
    executionTreeStore: executionTreeStore as never,
    taskRecordsStore: { write: vi.fn() } as never,
    communicationStore: { write: vi.fn() } as never,
    enterPersistenceFailStop,
  });
  const command = Object.freeze({
    nextTree: tree,
    settlement: Object.freeze({
      taskId: "task-1",
      binding: Object.freeze({ kind: "agent" as const, address: "/worker" as never, agentRunId: "agent-1" }),
      cancelBeforeDurability,
      commitAfterDurability,
    }),
    commitTreeAndEvent,
  });
  return {
    coordinator, command, order, finishLocalTeardown, cancelBeforeDurability,
    commitAfterDurability, commitTreeAndEvent, enterPersistenceFailStop,
  };
};

describe("TeamRunPersistenceCoordinator task settlement", () => {
  it("cancels synchronously and preserves the live capability on not_renamed", async () => {
    const harness = createHarness({
      outcome: "not_renamed", file: "execution_tree", stage: "rename", cause: new Error("no rename"),
    });

    await expect(harness.coordinator.commitTaskSettlement(harness.command)).resolves.toMatchObject({
      outcome: "not_committed",
    });
    expect(harness.order).toEqual(["write", "cancel"]);
    expect(harness.commitAfterDurability).not.toHaveBeenCalled();
    expect(harness.commitTreeAndEvent).not.toHaveBeenCalled();
    expect(harness.finishLocalTeardown).not.toHaveBeenCalled();
  });

  it("retains hidden preparation and fail-stops on indeterminate finalization", async () => {
    const harness = createHarness({
      outcome: "renamed_finalization_indeterminate",
      file: "execution_tree",
      stage: "sync_directory",
      cause: new Error("directory sync uncertain"),
    });

    await expect(harness.coordinator.commitTaskSettlement(harness.command)).resolves.toEqual({
      outcome: "finalization_indeterminate",
      file: "execution_tree",
      stage: "sync_directory",
    });
    expect(harness.order).toEqual(["write", "fail-stop"]);
    expect(harness.cancelBeforeDurability).not.toHaveBeenCalled();
    expect(harness.commitAfterDurability).not.toHaveBeenCalled();
    expect(harness.commitTreeAndEvent).not.toHaveBeenCalled();
  });

  it("rejects a trailing root mutation after indeterminate finalization", async () => {
    const harness = createHarness({
      outcome: "renamed_finalization_indeterminate",
      file: "execution_tree",
      stage: "sync_directory",
      cause: new Error("directory sync uncertain"),
    });

    const first = harness.coordinator.commitTaskSettlement(harness.command);
    const trailing = harness.coordinator.commitTaskSettlement(harness.command);
    await expect(first).resolves.toMatchObject({ outcome: "finalization_indeterminate" });
    await expect(trailing).rejects.toThrow("pending strict reopen");
    expect(harness.order).toEqual(["write", "fail-stop"]);
    expect(harness.commitAfterDurability).not.toHaveBeenCalled();
    expect(harness.commitTreeAndEvent).not.toHaveBeenCalled();
  });

  it("detaches and swaps current tree/event under the lock but leaves teardown to the caller", async () => {
    const harness = createHarness({ outcome: "committed", file: "execution_tree" });

    const result = await harness.coordinator.commitTaskSettlement(harness.command);

    expect(result.outcome).toBe("committed");
    expect(harness.order).toEqual(["write", "detach", "tree-event"]);
    expect(harness.finishLocalTeardown).not.toHaveBeenCalled();
    if (result.outcome !== "committed") throw new Error("Expected committed settlement.");
    await result.settlement.finishLocalTeardown();
    expect(harness.finishLocalTeardown).toHaveBeenCalledOnce();
  });
});

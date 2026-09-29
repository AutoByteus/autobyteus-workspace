import { describe, expect, it, vi } from "vitest";
import { TeamRunPersistenceCoordinator } from "../../../src/agent-team-execution/services/team-run-persistence-coordinator.js";

const tree = Object.freeze({ rootTeam: Object.freeze({ teamRunId: "root-run" }) }) as never;

const createHarness = (writeResult: object) => {
  const order: string[] = [];
  const assertCommitReady = vi.fn(() => order.push("ready"));
  const abortBeforeCommit = vi.fn(async () => { order.push("abort"); });
  const commitAfterDurability = vi.fn(() => { order.push("commit"); });
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
    communicationStore: { write: vi.fn() } as never,
    enterPersistenceFailStop,
  });
  const prepareAgainstCurrent = vi.fn(() => {
    order.push("prepare");
    return Object.freeze({ nextTree: tree });
  });
  const command = Object.freeze({
    activation: Object.freeze({ assertCommitReady, abortBeforeCommit, commitAfterDurability }),
    prepareAgainstCurrent,
  });
  return {
    coordinator, command, order, executionTreeStore, prepareAgainstCurrent,
    assertCommitReady, abortBeforeCommit, commitAfterDurability, enterPersistenceFailStop,
  };
};

describe("TeamRunPersistenceCoordinator task activation (single execution-tree write)", () => {
  it("writes exactly one execution tree and commits the activation after durability", async () => {
    const harness = createHarness({ outcome: "committed", file: "execution_tree" });

    await expect(harness.coordinator.commitTaskActivation(harness.command)).resolves.toEqual({ outcome: "committed" });
    expect(harness.order).toEqual(["ready", "prepare", "write", "commit"]);
    expect(harness.executionTreeStore.write).toHaveBeenCalledOnce();
    expect(harness.executionTreeStore.write).toHaveBeenCalledWith("/tmp/current-team-run", tree);
    expect(harness.abortBeforeCommit).not.toHaveBeenCalled();
  });

  it("aborts the prepared child and preserves the root on not_renamed", async () => {
    const harness = createHarness({
      outcome: "not_renamed", file: "execution_tree", stage: "rename", cause: new Error("no rename"),
    });

    await expect(harness.coordinator.commitTaskActivation(harness.command)).resolves.toMatchObject({
      outcome: "not_committed",
    });
    expect(harness.order).toEqual(["ready", "prepare", "write", "abort"]);
    expect(harness.commitAfterDurability).not.toHaveBeenCalled();
    expect(harness.enterPersistenceFailStop).not.toHaveBeenCalled();
  });

  it("fail-stops, aborts the prepared child, and rejects trailing mutations on indeterminate finalization", async () => {
    const harness = createHarness({
      outcome: "renamed_finalization_indeterminate",
      file: "execution_tree",
      stage: "sync_directory",
      cause: new Error("directory sync uncertain"),
    });

    const first = harness.coordinator.commitTaskActivation(harness.command);
    const trailing = harness.coordinator.commitTaskActivation(harness.command);
    await expect(first).resolves.toEqual({
      outcome: "finalization_indeterminate",
      file: "execution_tree",
      stage: "sync_directory",
    });
    await expect(trailing).rejects.toThrow("pending strict reopen");
    expect(harness.order).toEqual(["ready", "prepare", "write", "fail-stop", "abort"]);
    expect(harness.commitAfterDurability).not.toHaveBeenCalled();
  });

  it("aborts without writing when preparation against the current tree throws", async () => {
    const harness = createHarness({ outcome: "committed", file: "execution_tree" });
    harness.prepareAgainstCurrent.mockImplementationOnce(() => { throw new Error("stale tree"); });

    await expect(harness.coordinator.commitTaskActivation(harness.command)).rejects.toThrow("stale tree");
    expect(harness.executionTreeStore.write).not.toHaveBeenCalled();
    expect(harness.abortBeforeCommit).toHaveBeenCalledOnce();
    expect(harness.commitAfterDurability).not.toHaveBeenCalled();
  });
});

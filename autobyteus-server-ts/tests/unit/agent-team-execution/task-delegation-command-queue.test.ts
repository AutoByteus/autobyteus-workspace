import { describe, expect, it } from "vitest";
import { TaskDelegationCommandQueue } from "../../../src/agent-team-execution/task-delegation/task-delegation-command-queue.js";

describe("TaskDelegationCommandQueue", () => {
  it("serializes every lifecycle command in admission order", async () => {
    const queue = new TaskDelegationCommandQueue();
    const observed: string[] = [];
    let releaseFirst!: () => void;
    const barrier = new Promise<void>((resolve) => { releaseFirst = resolve; });

    const first = queue.submit({
      kind: "activate",
      executeAtQueueHead: async () => {
        observed.push("activate:start");
        await barrier;
        observed.push("activate:end");
        return "active";
      },
    });
    const second = queue.submit({
      kind: "submit_result",
      executeAtQueueHead: async () => {
        observed.push("submit");
        return "awaiting_review";
      },
    });
    await Promise.resolve();
    expect(observed).toEqual(["activate:start"]);
    releaseFirst();
    await expect(Promise.all([first, second])).resolves.toEqual(["active", "awaiting_review"]);
    expect(observed).toEqual(["activate:start", "activate:end", "submit"]);
  });

  it("closes public admission but retains the same FIFO for shutdown", async () => {
    const queue = new TaskDelegationCommandQueue();
    queue.closeExternalAdmission();
    await expect(queue.submit({ kind: "review_result", executeAtQueueHead: async () => null }))
      .rejects.toThrow("admission is closed");
    await expect(queue.submitShutdown({ kind: "interrupt", executeAtQueueHead: async () => "interrupted" }))
      .resolves.toBe("interrupted");
    await expect(queue.drain()).resolves.toBeUndefined();
  });

  it("makes root fail-stop terminal for already-admitted and later shutdown work", async () => {
    const queue = new TaskDelegationCommandQueue();
    const observed: string[] = [];
    let releaseFirst!: () => void;
    const barrier = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const first = queue.submitShutdown({
      kind: "settle",
      executeAtQueueHead: async () => {
        observed.push("first:start");
        await barrier;
        observed.push("first:end");
        return "first";
      },
    });
    const trailing = queue.submitShutdown({
      kind: "settle",
      executeAtQueueHead: async () => { observed.push("trailing"); return "trailing"; },
    });
    await Promise.resolve();

    queue.enterRootFailStop();
    await expect(trailing).rejects.toThrow("persistence authority is indeterminate");
    await expect(queue.submitShutdown({ kind: "interrupt", executeAtQueueHead: async () => null }))
      .rejects.toThrow("persistence authority is indeterminate");
    releaseFirst();
    await expect(first).resolves.toBe("first");
    await expect(queue.drain()).resolves.toBeUndefined();
    expect(observed).toEqual(["first:start", "first:end"]);
  });
});

import { describe, expect, it } from "vitest";
import {
  RootTaskExecutionCommandQueue,
  RootTaskExecutionFailStoppedError,
} from "../../../src/agent-collaboration/execution/task/root-task-execution-command-queue.js";

describe("RootTaskExecutionCommandQueue", () => {
  it("serializes activation, wake and shutdown commands in admission order", async () => {
    const queue = new RootTaskExecutionCommandQueue();
    const order: string[] = [];
    let releaseFirst!: () => void;
    const first = queue.submit({
      kind: "activate",
      executeAtQueueHead: async () => {
        order.push("activate:start");
        await new Promise<void>((resolve) => { releaseFirst = resolve; });
        order.push("activate:end");
        return "activated";
      },
    });
    const second = queue.submit({ kind: "wake", executeAtQueueHead: async () => { order.push("wake"); return "woken"; } });
    const third = queue.submit({ kind: "reopen", executeAtQueueHead: async () => { order.push("reopen"); } });
    await Promise.resolve();
    await Promise.resolve();
    releaseFirst();
    await expect(first).resolves.toBe("activated");
    await expect(second).resolves.toBe("woken");
    await third;
    expect(order).toEqual(["activate:start", "activate:end", "wake", "reopen"]);
  });

  it("rejects new commands once admission closes and drains in-flight work", async () => {
    const queue = new RootTaskExecutionCommandQueue();
    const running = queue.submit({ kind: "wake", executeAtQueueHead: async () => "done" });
    queue.closeExternalAdmission();
    await expect(queue.submit({ kind: "activate", executeAtQueueHead: async () => null }))
      .rejects.toThrow("Task execution command admission is closed.");
    await expect(running).resolves.toBe("done");
    await expect(queue.drain()).resolves.toBeUndefined();
  });

  it("rejects queued and later commands on root fail-stop", async () => {
    const queue = new RootTaskExecutionCommandQueue();
    let release!: () => void;
    const head = queue.submit({
      kind: "reopen",
      executeAtQueueHead: () => new Promise<string>((resolve) => { release = () => resolve("head"); }),
    });
    const trailing = queue.submit({ kind: "wake", executeAtQueueHead: async () => "trailing" });
    await Promise.resolve();
    queue.enterRootFailStop();
    await expect(trailing).rejects.toBeInstanceOf(RootTaskExecutionFailStoppedError);
    release();
    await expect(head).resolves.toBe("head");
    await expect(queue.submit({ kind: "wake", executeAtQueueHead: async () => null }))
      .rejects.toBeInstanceOf(RootTaskExecutionFailStoppedError);
  });
});

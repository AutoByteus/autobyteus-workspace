import { describe, expect, it, vi } from "vitest";
import { AgentRunEventDispatchQueue } from "../../../../src/agent-execution/events/agent-run-event-dispatch-queue.js";

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
};

describe("AgentRunEventDispatchQueue", () => {
  it("serializes same-run work while allowing different runs to proceed", async () => {
    const queue = new AgentRunEventDispatchQueue();
    const gate = deferred();
    const order: string[] = [];
    const first = queue.enqueue("run-a", async () => {
      order.push("a1:start");
      await gate.promise;
      order.push("a1:end");
    });
    const second = queue.enqueue("run-a", () => { order.push("a2"); });
    const other = queue.enqueue("run-b", () => { order.push("b1"); });

    await other;
    expect(order).toEqual(["a1:start", "b1"]);
    gate.resolve();
    await Promise.all([first, second]);
    expect(order).toEqual(["a1:start", "b1", "a1:end", "a2"]);
  });

  it("continues after a rejection and removes drained tails", async () => {
    const queue = new AgentRunEventDispatchQueue();
    const next = vi.fn();
    await expect(queue.enqueue("run-a", () => Promise.reject(new Error("failed"))))
      .rejects.toThrow("failed");
    await queue.enqueue("run-a", next);
    await Promise.resolve();

    expect(next).toHaveBeenCalledTimes(1);
    expect(queue.pendingRunCount).toBe(0);
  });
});

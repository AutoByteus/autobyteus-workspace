import { describe, expect, it } from "vitest";
import { ClaudeRuntimeTurnScheduler } from "../../../../src/runtime-execution/claude-agent-sdk/claude-runtime-turn-scheduler.js";

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

describe("ClaudeRuntimeTurnScheduler", () => {
  it("serializes turns globally", async () => {
    const scheduler = new ClaudeRuntimeTurnScheduler();
    const order: string[] = [];

    const first = scheduler.schedule("run-a", async () => {
      order.push("first:start");
      await wait(15);
      order.push("first:end");
    });

    const second = scheduler.schedule("run-b", async () => {
      order.push("second:start");
      await wait(5);
      order.push("second:end");
    });

    await Promise.all([first, second]);
    expect(order).toEqual(["first:start", "first:end", "second:start", "second:end"]);
  });

  it("waits for a run to become idle", async () => {
    const scheduler = new ClaudeRuntimeTurnScheduler();
    let active = false;

    const task = scheduler.schedule("run-a", async () => {
      active = true;
      await wait(20);
      active = false;
    });

    await scheduler.waitForRunIdle("run-a");
    expect(active).toBe(false);
    await task;
  });
});

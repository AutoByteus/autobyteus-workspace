import { describe, expect, it } from "vitest";
import { ChannelDispatchLockRegistry } from "../../../../src/external-channel/runtime/channel-dispatch-lock-registry.js";

describe("ChannelDispatchLockRegistry", () => {
  it("serializes work for the same dispatch key", async () => {
    const registry = new ChannelDispatchLockRegistry();
    const events: string[] = [];
    let releaseFirst: (() => void) | null = null;

    const first = registry.runExclusive("agent:run-1", async () => {
      events.push("first:start");
      await new Promise<void>((resolve) => {
        releaseFirst = resolve;
      });
      events.push("first:end");
    });

    const second = registry.runExclusive("agent:run-1", async () => {
      events.push("second:start");
      events.push("second:end");
    });

    await Promise.resolve();
    expect(events).toEqual(["first:start"]);

    releaseFirst?.();
    await Promise.all([first, second]);

    expect(events).toEqual([
      "first:start",
      "first:end",
      "second:start",
      "second:end",
    ]);
  });

  it("allows different dispatch keys to proceed independently", async () => {
    const registry = new ChannelDispatchLockRegistry();
    const events: string[] = [];

    await Promise.all([
      registry.runExclusive("agent:run-1", async () => {
        events.push("agent");
      }),
      registry.runExclusive("team:run-1", async () => {
        events.push("team");
      }),
    ]);

    expect(new Set(events)).toEqual(new Set(["agent", "team"]));
  });
});

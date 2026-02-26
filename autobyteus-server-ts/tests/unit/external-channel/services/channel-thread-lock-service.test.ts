import { describe, expect, it } from "vitest";
import {
  ChannelThreadLockService,
  ChannelThreadLockTimeoutError,
} from "../../../../src/external-channel/services/channel-thread-lock-service.js";

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe("ChannelThreadLockService", () => {
  it("serializes work for the same key", async () => {
    const service = new ChannelThreadLockService(500);
    const order: string[] = [];

    const first = service.withThreadLock("k1", async () => {
      order.push("first-start");
      await delay(30);
      order.push("first-end");
      return "first";
    });

    const second = service.withThreadLock("k1", async () => {
      order.push("second-start");
      await delay(5);
      order.push("second-end");
      return "second";
    });

    const results = await Promise.all([first, second]);

    expect(results).toEqual(["first", "second"]);
    expect(order).toEqual(["first-start", "first-end", "second-start", "second-end"]);
  });

  it("does not serialize different keys", async () => {
    const service = new ChannelThreadLockService(500);
    const timestamps: Record<string, number> = {};

    const first = service.withThreadLock("k1", async () => {
      timestamps.k1 = Date.now();
      await delay(20);
    });
    const second = service.withThreadLock("k2", async () => {
      timestamps.k2 = Date.now();
      await delay(20);
    });

    await Promise.all([first, second]);

    expect(Math.abs(timestamps.k1 - timestamps.k2)).toBeLessThan(20);
  });

  it("throws timeout error when waiting too long", async () => {
    const service = new ChannelThreadLockService(20);

    const blocking = service.withThreadLock("k1", async () => {
      await delay(80);
      return "done";
    });

    await delay(5);

    await expect(
      service.withThreadLock("k1", async () => "later"),
    ).rejects.toBeInstanceOf(ChannelThreadLockTimeoutError);

    await blocking;
  });
});

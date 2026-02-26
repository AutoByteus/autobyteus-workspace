import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { SqlChannelCallbackIdempotencyProvider } from "../../../../src/external-channel/providers/sql-channel-callback-idempotency-provider.js";

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

describe("SqlChannelCallbackIdempotencyProvider", () => {
  it("reserves callback key as first seen", async () => {
    const provider = new SqlChannelCallbackIdempotencyProvider();
    const key = `callback-key-${randomUUID()}`;

    const result = await provider.reserveKey(key, 60);

    expect(result.firstSeen).toBe(true);
    expect(result.record?.key).toBe(key);
    expect(result.record?.firstSeenAt).toBeInstanceOf(Date);
  });

  it("returns duplicate for unexpired callback key", async () => {
    const provider = new SqlChannelCallbackIdempotencyProvider();
    const key = `callback-key-${randomUUID()}`;

    const first = await provider.reserveKey(key, 60);
    const second = await provider.reserveKey(key, 60);

    expect(first.firstSeen).toBe(true);
    expect(second.firstSeen).toBe(false);
    expect(second.record?.key).toBe(key);
  });

  it("re-activates callback key after expiry", async () => {
    const provider = new SqlChannelCallbackIdempotencyProvider();
    const key = `callback-key-${randomUUID()}`;

    const first = await provider.reserveKey(key, 1);
    await sleep(1100);
    const second = await provider.reserveKey(key, 60);

    expect(first.firstSeen).toBe(true);
    expect(second.firstSeen).toBe(true);
    expect(second.record?.firstSeenAt.getTime()).toBeGreaterThan(
      first.record?.firstSeenAt.getTime() ?? 0,
    );
  });

  it("rejects invalid callback key input", async () => {
    const provider = new SqlChannelCallbackIdempotencyProvider();

    await expect(provider.reserveKey("   ", 60)).rejects.toThrow(
      "Callback idempotency key must be a non-empty string.",
    );
  });
});


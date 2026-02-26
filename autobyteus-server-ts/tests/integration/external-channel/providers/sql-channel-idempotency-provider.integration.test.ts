import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { SqlChannelIdempotencyProvider } from "../../../../src/external-channel/providers/sql-channel-idempotency-provider.js";

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

describe("SqlChannelIdempotencyProvider", () => {
  it("reserves a new key as first seen", async () => {
    const provider = new SqlChannelIdempotencyProvider();
    const key = `channel-key-${randomUUID()}`;

    const result = await provider.reserveKey(key, 60);

    expect(result.firstSeen).toBe(true);
    expect(result.record?.key).toBe(key);
    expect(result.record?.firstSeenAt).toBeInstanceOf(Date);
    expect(result.record?.expiresAt).toBeInstanceOf(Date);
  });

  it("returns duplicate when unexpired key already exists", async () => {
    const provider = new SqlChannelIdempotencyProvider();
    const key = `channel-key-${randomUUID()}`;

    const first = await provider.reserveKey(key, 60);
    const second = await provider.reserveKey(key, 60);

    expect(first.firstSeen).toBe(true);
    expect(second.firstSeen).toBe(false);
    expect(second.record?.key).toBe(key);
    expect(second.record?.firstSeenAt).toEqual(first.record?.firstSeenAt);
  });

  it("re-activates key when previous reservation expired", async () => {
    const provider = new SqlChannelIdempotencyProvider();
    const key = `channel-key-${randomUUID()}`;

    const first = await provider.reserveKey(key, 1);
    await sleep(1100);
    const second = await provider.reserveKey(key, 60);

    expect(first.firstSeen).toBe(true);
    expect(second.firstSeen).toBe(true);
    expect(second.record?.firstSeenAt.getTime()).toBeGreaterThan(
      first.record?.firstSeenAt.getTime() ?? 0,
    );
  });

  it("rejects blank key and invalid ttl", async () => {
    const provider = new SqlChannelIdempotencyProvider();

    await expect(provider.reserveKey("   ", 60)).rejects.toThrow(
      "Idempotency key must be a non-empty string.",
    );
    await expect(provider.reserveKey("key", -1)).rejects.toThrow(
      "ttlSeconds must be a finite number >= 0.",
    );
  });
});


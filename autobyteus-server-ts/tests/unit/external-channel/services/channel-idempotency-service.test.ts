import { describe, expect, it, vi } from "vitest";
import { ChannelIdempotencyService } from "../../../../src/external-channel/services/channel-idempotency-service.js";
import type {
  ChannelIdempotencyProvider,
  ChannelIdempotencyReservationResult,
} from "../../../../src/external-channel/providers/channel-idempotency-provider.js";

describe("ChannelIdempotencyService", () => {
  it("returns duplicate=false when key is first seen", async () => {
    const reserveResult: ChannelIdempotencyReservationResult = {
      firstSeen: true,
      record: {
        key: "k1",
        firstSeenAt: new Date("2026-02-08T00:00:00.000Z"),
        expiresAt: new Date("2026-02-09T00:00:00.000Z"),
      },
    };
    const provider: ChannelIdempotencyProvider = {
      reserveKey: vi.fn().mockResolvedValue(reserveResult),
    };
    const service = new ChannelIdempotencyService(provider, { defaultTtlSeconds: 120 });

    const decision = await service.ensureFirstSeen("k1");

    expect(decision.duplicate).toBe(false);
    expect(provider.reserveKey).toHaveBeenCalledWith("k1", 120);
  });

  it("returns duplicate=true when key already exists", async () => {
    const provider: ChannelIdempotencyProvider = {
      reserveKey: vi.fn().mockResolvedValue({
        firstSeen: false,
        record: {
          key: "k1",
          firstSeenAt: new Date("2026-02-08T00:00:00.000Z"),
          expiresAt: new Date("2026-02-09T00:00:00.000Z"),
        },
      }),
    };
    const service = new ChannelIdempotencyService(provider);

    const decision = await service.ensureFirstSeen("k1", 30);

    expect(decision.duplicate).toBe(true);
    expect(provider.reserveKey).toHaveBeenCalledWith("k1", 30);
  });

  it("throws on blank idempotency key", async () => {
    const provider: ChannelIdempotencyProvider = {
      reserveKey: vi.fn(),
    };
    const service = new ChannelIdempotencyService(provider);

    await expect(service.ensureFirstSeen("   ")).rejects.toThrow(
      "Idempotency key must be a non-empty string.",
    );
    expect(provider.reserveKey).not.toHaveBeenCalled();
  });
});

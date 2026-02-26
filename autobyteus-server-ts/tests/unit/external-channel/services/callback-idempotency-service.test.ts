import { describe, expect, it, vi } from "vitest";
import { CallbackIdempotencyService } from "../../../../src/external-channel/services/callback-idempotency-service.js";
import type {
  ChannelIdempotencyProvider,
  ChannelIdempotencyReservationResult,
} from "../../../../src/external-channel/providers/channel-idempotency-provider.js";

describe("CallbackIdempotencyService", () => {
  it("returns duplicate=false when key is first seen", async () => {
    const reserveResult: ChannelIdempotencyReservationResult = {
      firstSeen: true,
      record: {
        key: "cb-1",
        firstSeenAt: new Date("2026-02-08T00:00:00.000Z"),
        expiresAt: new Date("2026-02-09T00:00:00.000Z"),
      },
    };
    const provider: ChannelIdempotencyProvider = {
      reserveKey: vi.fn().mockResolvedValue(reserveResult),
    };
    const service = new CallbackIdempotencyService(provider, {
      defaultTtlSeconds: 600,
    });

    const decision = await service.reserveCallbackKey("cb-1");

    expect(decision.duplicate).toBe(false);
    expect(decision.key).toBe("cb-1");
    expect(provider.reserveKey).toHaveBeenCalledWith("cb-1", 600);
  });

  it("returns duplicate=true when callback key already exists", async () => {
    const provider: ChannelIdempotencyProvider = {
      reserveKey: vi.fn().mockResolvedValue({
        firstSeen: false,
        record: {
          key: "cb-1",
          firstSeenAt: new Date("2026-02-08T00:00:00.000Z"),
          expiresAt: new Date("2026-02-09T00:00:00.000Z"),
        },
      }),
    };
    const service = new CallbackIdempotencyService(provider);

    const decision = await service.reserveCallbackKey("cb-1", 30);

    expect(decision.duplicate).toBe(true);
    expect(provider.reserveKey).toHaveBeenCalledWith("cb-1", 30);
  });

  it("throws on blank callback key", async () => {
    const provider: ChannelIdempotencyProvider = {
      reserveKey: vi.fn(),
    };
    const service = new CallbackIdempotencyService(provider);

    await expect(service.reserveCallbackKey("   ")).rejects.toThrow(
      "Callback idempotency key must be a non-empty string.",
    );
    expect(provider.reserveKey).not.toHaveBeenCalled();
  });
});

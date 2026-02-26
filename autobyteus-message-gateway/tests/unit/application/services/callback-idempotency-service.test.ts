import { describe, expect, it } from "vitest";
import { CallbackIdempotencyService } from "../../../../src/application/services/callback-idempotency-service.js";
import { InMemoryIdempotencyStore } from "../../../../src/infrastructure/idempotency/in-memory-idempotency-store.js";

describe("CallbackIdempotencyService", () => {
  it("returns duplicate=true on callback retry", async () => {
    const service = new CallbackIdempotencyService(new InMemoryIdempotencyStore(), {
      ttlSeconds: 120,
    });

    const first = await service.checkAndMarkCallback("cb-1");
    expect(first.duplicate).toBe(false);

    const second = await service.checkAndMarkCallback("cb-1");
    expect(second.duplicate).toBe(true);
  });
});

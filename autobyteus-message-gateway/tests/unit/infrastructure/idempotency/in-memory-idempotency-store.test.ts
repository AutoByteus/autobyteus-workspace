import { describe, expect, it } from "vitest";
import { InMemoryIdempotencyStore } from "../../../../src/infrastructure/idempotency/in-memory-idempotency-store.js";

describe("InMemoryIdempotencyStore", () => {
  it("returns duplicate=false then duplicate=true while key is active", async () => {
    let nowMs = Date.parse("2026-02-08T00:00:00.000Z");
    const store = new InMemoryIdempotencyStore(() => nowMs);

    const first = await store.checkAndSet("message:key-1", 60);
    expect(first.duplicate).toBe(false);

    const second = await store.checkAndSet("message:key-1", 60);
    expect(second.duplicate).toBe(true);
  });

  it("re-activates key after expiry", async () => {
    let nowMs = Date.parse("2026-02-08T00:00:00.000Z");
    const store = new InMemoryIdempotencyStore(() => nowMs);

    await store.checkAndSet("message:key-2", 1);
    nowMs += 1001;

    const next = await store.checkAndSet("message:key-2", 1);
    expect(next.duplicate).toBe(false);
  });

  it("rejects blank key", async () => {
    const store = new InMemoryIdempotencyStore();
    await expect(store.checkAndSet("   ", 30)).rejects.toThrow(
      "Idempotency key cannot be empty.",
    );
  });
});

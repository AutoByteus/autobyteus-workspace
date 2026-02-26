import type {
  IdempotencyReservation,
  IdempotencyStore,
} from "../../domain/models/idempotency-store.js";

type StoreEntry = {
  expiresAtMs: number;
};

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly entries = new Map<string, StoreEntry>();
  private readonly now: () => number;

  constructor(now: () => number = () => Date.now()) {
    this.now = now;
  }

  async checkAndSet(key: string, ttlSeconds: number): Promise<IdempotencyReservation> {
    const normalizedKey = key.trim();
    if (normalizedKey.length === 0) {
      throw new Error("Idempotency key cannot be empty.");
    }
    if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
      throw new Error("Idempotency ttlSeconds must be a positive number.");
    }

    const nowMs = this.now();
    const existing = this.entries.get(normalizedKey);
    if (existing && existing.expiresAtMs > nowMs) {
      return {
        duplicate: true,
        expiresAt: new Date(existing.expiresAtMs),
      };
    }

    const expiresAtMs = nowMs + ttlSeconds * 1000;
    this.entries.set(normalizedKey, { expiresAtMs });
    return {
      duplicate: false,
      expiresAt: new Date(expiresAtMs),
    };
  }
}

export class InMemoryIdempotencyStore {
    entries = new Map();
    now;
    constructor(now = () => Date.now()) {
        this.now = now;
    }
    async checkAndSet(key, ttlSeconds) {
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
//# sourceMappingURL=in-memory-idempotency-store.js.map
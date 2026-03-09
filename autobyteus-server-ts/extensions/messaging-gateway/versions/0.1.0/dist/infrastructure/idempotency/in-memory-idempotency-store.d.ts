import type { IdempotencyReservation, IdempotencyStore } from "../../domain/models/idempotency-store.js";
export declare class InMemoryIdempotencyStore implements IdempotencyStore {
    private readonly entries;
    private readonly now;
    constructor(now?: () => number);
    checkAndSet(key: string, ttlSeconds: number): Promise<IdempotencyReservation>;
}
//# sourceMappingURL=in-memory-idempotency-store.d.ts.map
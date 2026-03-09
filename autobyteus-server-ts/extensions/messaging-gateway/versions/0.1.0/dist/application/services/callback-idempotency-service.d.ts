import type { IdempotencyReservation, IdempotencyStore } from "../../domain/models/idempotency-store.js";
export type CallbackIdempotencyServiceConfig = {
    ttlSeconds: number;
};
export declare class CallbackIdempotencyService {
    private readonly store;
    private readonly config;
    constructor(store: IdempotencyStore, config: CallbackIdempotencyServiceConfig);
    checkAndMarkCallback(key: string): Promise<IdempotencyReservation>;
}
//# sourceMappingURL=callback-idempotency-service.d.ts.map
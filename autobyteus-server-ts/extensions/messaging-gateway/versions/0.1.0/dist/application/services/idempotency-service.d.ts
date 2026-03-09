import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { IdempotencyReservation, IdempotencyStore } from "../../domain/models/idempotency-store.js";
export type IdempotencyServiceConfig = {
    ttlSeconds: number;
};
export declare class IdempotencyService {
    private readonly store;
    private readonly config;
    constructor(store: IdempotencyStore, config: IdempotencyServiceConfig);
    checkAndMark(key: string): Promise<IdempotencyReservation>;
    checkAndMarkEnvelope(envelope: ExternalMessageEnvelope): Promise<IdempotencyReservation>;
}
export declare function buildInboundIdempotencyKey(envelope: ExternalMessageEnvelope): string;
//# sourceMappingURL=idempotency-service.d.ts.map
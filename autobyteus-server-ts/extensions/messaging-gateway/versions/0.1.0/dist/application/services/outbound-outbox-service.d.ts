import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
import type { OutboxStore, OutboundOutboxRecord, OutboundOutboxStatus } from "../../domain/models/outbox-store.js";
export declare class OutboundOutboxService {
    private readonly store;
    constructor(store: OutboxStore);
    enqueueOrGet(dispatchKey: string, payload: ExternalOutboundEnvelope): Promise<{
        record: OutboundOutboxRecord;
        duplicate: boolean;
    }>;
    leasePending(limit: number, nowIso: string): Promise<OutboundOutboxRecord[]>;
    markSending(recordId: string): Promise<OutboundOutboxRecord>;
    markSent(recordId: string): Promise<OutboundOutboxRecord>;
    markRetry(recordId: string, errorMessage: string, nextAttemptAtIso: string): Promise<OutboundOutboxRecord>;
    markDeadLetter(recordId: string, errorMessage: string): Promise<OutboundOutboxRecord>;
    getById(recordId: string): Promise<OutboundOutboxRecord | null>;
    listByStatus(statuses: OutboundOutboxStatus[]): Promise<OutboundOutboxRecord[]>;
    replayFromStatus(recordId: string, expectedStatus: OutboundOutboxStatus): Promise<OutboundOutboxRecord>;
    private requireRecord;
}
//# sourceMappingURL=outbound-outbox-service.d.ts.map
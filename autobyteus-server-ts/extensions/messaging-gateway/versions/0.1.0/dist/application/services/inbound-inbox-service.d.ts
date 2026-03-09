import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import { type InboxStore, type InboundInboxDisposition, type InboundInboxRecord, type InboundInboxStatus } from "../../domain/models/inbox-store.js";
export declare class InboundInboxService {
    private readonly store;
    constructor(store: InboxStore);
    enqueue(envelope: ExternalMessageEnvelope): Promise<{
        record: InboundInboxRecord;
        duplicate: boolean;
    }>;
    leasePending(limit: number, nowIso: string): Promise<InboundInboxRecord[]>;
    markForwarding(recordId: string): Promise<InboundInboxRecord>;
    markCompleted(recordId: string, disposition: InboundInboxDisposition): Promise<InboundInboxRecord>;
    markRetry(recordId: string, errorMessage: string, nextAttemptAtIso: string): Promise<InboundInboxRecord>;
    markDeadLetter(recordId: string, errorMessage: string): Promise<InboundInboxRecord>;
    markBlocked(recordId: string, reason: string): Promise<InboundInboxRecord>;
    getById(recordId: string): Promise<InboundInboxRecord | null>;
    listByStatus(statuses: InboundInboxStatus[]): Promise<InboundInboxRecord[]>;
    replayFromStatus(recordId: string, expectedStatus: InboundInboxStatus): Promise<InboundInboxRecord>;
    private requireRecord;
}
//# sourceMappingURL=inbound-inbox-service.d.ts.map
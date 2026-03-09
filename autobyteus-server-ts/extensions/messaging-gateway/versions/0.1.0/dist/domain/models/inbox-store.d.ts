import type { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import type { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
export type InboundInboxStatus = "RECEIVED" | "FORWARDING" | "COMPLETED_ROUTED" | "COMPLETED_UNBOUND" | "COMPLETED_DUPLICATE" | "BLOCKED" | "FAILED_RETRY" | "DEAD_LETTER";
export type InboundInboxDisposition = "ROUTED" | "UNBOUND" | "DUPLICATE";
export type InboundInboxRecord = {
    id: string;
    ingressKey: string;
    provider: ExternalChannelProvider;
    transport: ExternalChannelTransport;
    accountId: string;
    peerId: string;
    threadId: string | null;
    externalMessageId: string;
    payload: ExternalMessageEnvelope;
    status: InboundInboxStatus;
    attemptCount: number;
    nextAttemptAt: string | null;
    lastError: string | null;
    createdAt: string;
    updatedAt: string;
};
export type InboundInboxCreateInput = {
    ingressKey: string;
    payload: ExternalMessageEnvelope;
    createdAt?: string;
};
export type InboundInboxStatusUpdate = {
    status: InboundInboxStatus;
    attemptCount?: number;
    nextAttemptAt?: string | null;
    lastError?: string | null;
    updatedAt?: string;
};
export type InboundInboxUpsertResult = {
    record: InboundInboxRecord;
    duplicate: boolean;
};
export interface InboxStore {
    upsertByIngressKey(input: InboundInboxCreateInput): Promise<InboundInboxUpsertResult>;
    getById(recordId: string): Promise<InboundInboxRecord | null>;
    leasePending(limit: number, nowIso: string): Promise<InboundInboxRecord[]>;
    updateStatus(recordId: string, update: InboundInboxStatusUpdate): Promise<InboundInboxRecord>;
    listByStatus(statuses: InboundInboxStatus[]): Promise<InboundInboxRecord[]>;
}
//# sourceMappingURL=inbox-store.d.ts.map
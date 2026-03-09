import type { OutboxStore, OutboundOutboxCreateInput, OutboundOutboxRecord, OutboundOutboxStatus, OutboundOutboxStatusUpdate, OutboundOutboxUpsertResult } from "../../domain/models/outbox-store.js";
export declare class FileOutboxStore implements OutboxStore {
    private readonly storePath;
    private state;
    private mutationQueue;
    constructor(rootDir: string, fileName?: string);
    upsertByDispatchKey(input: OutboundOutboxCreateInput): Promise<OutboundOutboxUpsertResult>;
    getById(recordId: string): Promise<OutboundOutboxRecord | null>;
    leasePending(limit: number, nowIso: string): Promise<OutboundOutboxRecord[]>;
    updateStatus(recordId: string, update: OutboundOutboxStatusUpdate): Promise<OutboundOutboxRecord>;
    listByStatus(statuses: OutboundOutboxStatus[]): Promise<OutboundOutboxRecord[]>;
    private withMutation;
    private loadState;
    private persistState;
}
//# sourceMappingURL=file-outbox-store.d.ts.map
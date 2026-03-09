import type { InboxStore, InboundInboxCreateInput, InboundInboxRecord, InboundInboxStatus, InboundInboxStatusUpdate, InboundInboxUpsertResult } from "../../domain/models/inbox-store.js";
export declare class FileInboxStore implements InboxStore {
    private readonly storePath;
    private state;
    private mutationQueue;
    constructor(rootDir: string, fileName?: string);
    upsertByIngressKey(input: InboundInboxCreateInput): Promise<InboundInboxUpsertResult>;
    getById(recordId: string): Promise<InboundInboxRecord | null>;
    leasePending(limit: number, nowIso: string): Promise<InboundInboxRecord[]>;
    updateStatus(recordId: string, update: InboundInboxStatusUpdate): Promise<InboundInboxRecord>;
    listByStatus(statuses: InboundInboxStatus[]): Promise<InboundInboxRecord[]>;
    private withMutation;
    private loadState;
    private persistState;
}
//# sourceMappingURL=file-inbox-store.d.ts.map
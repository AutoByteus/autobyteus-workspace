import type { SessionState } from "../../../domain/models/session-provider-adapter.js";
export type WechatSessionMeta = {
    sessionId: string;
    accountLabel: string;
    status: SessionState;
    createdAt: string;
    updatedAt: string;
};
export declare class WechatSessionStateStore {
    private readonly rootDir;
    constructor(rootDir: string);
    save(meta: WechatSessionMeta): Promise<void>;
    load(sessionId: string): Promise<WechatSessionMeta | null>;
    list(): Promise<WechatSessionMeta[]>;
    delete(sessionId: string): Promise<void>;
    private getSessionsRootDir;
    private getSessionDir;
    private getMetaPath;
}
//# sourceMappingURL=session-state-store.d.ts.map
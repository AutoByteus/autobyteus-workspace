import type { SessionState } from "../../../domain/models/session-provider-adapter.js";
export type SessionMeta = {
    sessionId: string;
    accountLabel: string;
    status: SessionState;
    createdAt: string;
    updatedAt: string;
};
export declare class SessionCredentialStore {
    private readonly rootDir;
    constructor(rootDir: string);
    getSessionAuthPath(sessionId: string): Promise<string>;
    markSessionMeta(meta: SessionMeta): Promise<void>;
    loadSessionMeta(sessionId: string): Promise<SessionMeta | null>;
    listSessionMeta(): Promise<SessionMeta[]>;
    deleteSession(sessionId: string): Promise<void>;
    private getSessionsRootDir;
    private getSessionDir;
    private getMetaPath;
}
//# sourceMappingURL=session-credential-store.d.ts.map
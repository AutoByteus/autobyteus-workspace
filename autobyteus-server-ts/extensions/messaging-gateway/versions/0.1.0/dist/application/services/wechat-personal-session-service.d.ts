import type { ListSessionPeerCandidatesOptions, ListSessionPeerCandidatesResult } from "../../domain/models/session-peer-candidate.js";
import type { SessionProviderAdapter, SessionQr, SessionStatus } from "../../domain/models/session-provider-adapter.js";
export declare class WechatPersonalFeatureDisabledError extends Error {
    constructor();
}
export type WechatPersonalSessionServiceConfig = {
    enabled: boolean;
    qrTtlSeconds: number;
};
export declare class WechatPersonalSessionService {
    private readonly adapter;
    private readonly config;
    constructor(adapter: SessionProviderAdapter, config: WechatPersonalSessionServiceConfig);
    startPersonalSession(accountLabel: string): Promise<{
        sessionId: string;
    }>;
    getPersonalSessionQr(sessionId: string): Promise<SessionQr>;
    getPersonalSessionStatus(sessionId: string): Promise<SessionStatus>;
    listPersonalSessionPeerCandidates(sessionId: string, options?: ListSessionPeerCandidatesOptions): Promise<ListSessionPeerCandidatesResult>;
    stopPersonalSession(sessionId: string): Promise<void>;
    private assertEnabled;
}
//# sourceMappingURL=wechat-personal-session-service.d.ts.map
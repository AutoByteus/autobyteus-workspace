import type { SessionProviderAdapter, SessionQr, SessionStatus } from "../../domain/models/session-provider-adapter.js";
import type { ListSessionPeerCandidatesOptions, ListSessionPeerCandidatesResult } from "../../domain/models/session-peer-candidate.js";
export declare class PersonalSessionFeatureDisabledError extends Error {
    constructor();
}
export type WhatsAppPersonalSessionServiceConfig = {
    enabled: boolean;
    qrTtlSeconds: number;
};
export declare class WhatsAppPersonalSessionService {
    private readonly adapter;
    private readonly config;
    constructor(adapter: SessionProviderAdapter, config: WhatsAppPersonalSessionServiceConfig);
    startPersonalSession(accountLabel: string): Promise<{
        sessionId: string;
    }>;
    getPersonalSessionQr(sessionId: string): Promise<SessionQr>;
    getPersonalSessionStatus(sessionId: string): Promise<SessionStatus>;
    listPersonalSessionPeerCandidates(sessionId: string, options?: ListSessionPeerCandidatesOptions): Promise<ListSessionPeerCandidatesResult>;
    stopPersonalSession(sessionId: string): Promise<void>;
    private assertEnabled;
}
//# sourceMappingURL=whatsapp-personal-session-service.d.ts.map
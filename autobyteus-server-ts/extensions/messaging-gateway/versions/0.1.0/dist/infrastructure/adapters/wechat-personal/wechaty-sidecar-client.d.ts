import type { ProviderSendResult } from "../../../domain/models/provider-adapter.js";
import type { ListSessionPeerCandidatesOptions, PersonalSessionPeerCandidate } from "../../../domain/models/session-peer-candidate.js";
import type { SessionQr, SessionState } from "../../../domain/models/session-provider-adapter.js";
export type WechatyOpenSessionInput = {
    sessionId: string;
    accountLabel: string;
    qrTtlSeconds: number;
};
export type WechatySessionStatus = {
    status: SessionState;
    updatedAt: string;
};
export type WechatyInboundEvent = {
    sessionId: string;
    accountLabel: string;
    peerId: string;
    peerType: "USER" | "GROUP";
    threadId: string | null;
    messageId?: string | null;
    content: string;
    receivedAt: string;
    metadata?: Record<string, unknown>;
};
export interface WechatySidecarClient {
    openSession(input: WechatyOpenSessionInput): Promise<{
        status: SessionState;
        qr: SessionQr | null;
    }>;
    closeSession(sessionId: string): Promise<void>;
    getSessionStatus(sessionId: string): Promise<WechatySessionStatus>;
    getSessionQr(sessionId: string): Promise<SessionQr | null>;
    listPeerCandidates(sessionId: string, options?: ListSessionPeerCandidatesOptions): Promise<PersonalSessionPeerCandidate[]>;
    sendText(input: {
        sessionId: string;
        peerId: string;
        threadId: string | null;
        text: string;
    }): Promise<ProviderSendResult>;
}
export type HttpWechatySidecarClientConfig = {
    baseUrl: string;
    fetchImpl?: typeof fetch;
};
export declare class HttpWechatySidecarClient implements WechatySidecarClient {
    private readonly baseUrl;
    private readonly fetchImpl;
    constructor(config: HttpWechatySidecarClientConfig);
    openSession(input: WechatyOpenSessionInput): Promise<{
        status: SessionState;
        qr: SessionQr | null;
    }>;
    closeSession(sessionId: string): Promise<void>;
    getSessionStatus(sessionId: string): Promise<WechatySessionStatus>;
    getSessionQr(sessionId: string): Promise<SessionQr | null>;
    listPeerCandidates(sessionId: string, options?: ListSessionPeerCandidatesOptions): Promise<PersonalSessionPeerCandidate[]>;
    sendText(input: {
        sessionId: string;
        peerId: string;
        threadId: string | null;
        text: string;
    }): Promise<ProviderSendResult>;
    private request;
}
//# sourceMappingURL=wechaty-sidecar-client.d.ts.map
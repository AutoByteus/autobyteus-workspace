import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { type ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
import type { ProviderSendResult } from "../../../domain/models/provider-adapter.js";
import type { SessionProviderAdapter, SessionQr, SessionStartInput, SessionStartResult, SessionStatus } from "../../../domain/models/session-provider-adapter.js";
import type { ListSessionPeerCandidatesOptions, ListSessionPeerCandidatesResult } from "../../../domain/models/session-peer-candidate.js";
import { type WechatyInboundEvent, type WechatySidecarClient } from "./wechaty-sidecar-client.js";
import { WechatSessionStateStore } from "./session-state-store.js";
export declare class WechatSessionNotFoundError extends Error {
    constructor(sessionId: string);
}
export declare class WechatSessionQrNotReadyError extends Error {
    constructor(sessionId: string);
}
export declare class WechatSessionQrExpiredError extends Error {
    readonly expiresAt: string;
    constructor(expiresAt: string);
}
export declare class WechatSessionNotActiveError extends Error {
    readonly retryable = false;
    constructor(accountLabel: string);
}
export declare class WechatSessionAlreadyRunningError extends Error {
    readonly sessionId: string;
    constructor(sessionId: string);
}
export type WechatRestoreFailureContext = {
    sessionId: string;
    accountLabel: string;
    error: unknown;
};
export type WechatPersonalAdapterConfig = {
    sidecarClient?: WechatySidecarClient;
    sidecarBaseUrl?: string;
    stateStore?: WechatSessionStateStore;
    stateRoot?: string;
    restoreQrTtlSeconds?: number;
    onRestoreFailure?: (context: WechatRestoreFailureContext) => void;
    onUnknownInboundSession?: (event: WechatyInboundEvent) => void;
    now?: () => number;
};
export declare class WechatPersonalAdapter implements SessionProviderAdapter {
    readonly provider = ExternalChannelProvider.WECHAT;
    readonly transport = ExternalChannelTransport.PERSONAL_SESSION;
    private readonly sessions;
    private readonly handlers;
    private readonly sidecarClient;
    private readonly stateStore;
    private readonly restoreQrTtlSeconds;
    private readonly onRestoreFailure;
    private readonly onUnknownInboundSession;
    private readonly now;
    constructor(config?: WechatPersonalAdapterConfig);
    startSession(input: SessionStartInput): Promise<SessionStartResult>;
    stopSession(sessionId: string): Promise<void>;
    getSessionStatus(sessionId: string): Promise<SessionStatus>;
    getSessionQr(sessionId: string): Promise<SessionQr>;
    listSessionPeerCandidates(sessionId: string, options?: ListSessionPeerCandidatesOptions): Promise<ListSessionPeerCandidatesResult>;
    subscribeInbound(handler: (envelope: ExternalMessageEnvelope) => Promise<void>): () => void;
    sendOutbound(payload: ExternalOutboundEnvelope): Promise<ProviderSendResult>;
    restorePersistedSessions(): Promise<void>;
    ingestInboundEvent(event: WechatyInboundEvent): Promise<void>;
    dispose(): void;
    private handleInboundEvent;
    private getSessionRecord;
    private findRunningSession;
    private findActiveSessionByAccountLabel;
    private persistSessionMeta;
    private nowIso;
}
//# sourceMappingURL=wechat-personal-adapter.d.ts.map
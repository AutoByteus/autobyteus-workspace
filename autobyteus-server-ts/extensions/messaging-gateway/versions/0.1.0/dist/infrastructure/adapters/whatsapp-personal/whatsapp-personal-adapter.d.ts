import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
import type { ProviderSendResult } from "../../../domain/models/provider-adapter.js";
import type { SessionProviderAdapter, SessionQr, SessionStartInput, SessionStartResult, SessionStatus } from "../../../domain/models/session-provider-adapter.js";
import type { ListSessionPeerCandidatesOptions, ListSessionPeerCandidatesResult } from "../../../domain/models/session-peer-candidate.js";
import { type WhatsAppSessionClient } from "./baileys-session-client.js";
import { SessionCredentialStore } from "./session-credential-store.js";
import { PersonalPeerCandidateIndex } from "./personal-peer-candidate-index.js";
export declare class SessionNotFoundError extends Error {
    constructor(sessionId: string);
}
export declare class SessionQrNotReadyError extends Error {
    constructor(sessionId: string);
}
export declare class SessionQrExpiredError extends Error {
    readonly expiresAt: string;
    constructor(expiresAt: string);
}
export declare class SessionNotActiveError extends Error {
    readonly retryable = false;
    constructor(accountLabel: string);
}
export declare class SessionAlreadyRunningError extends Error {
    readonly sessionId: string;
    constructor(sessionId: string);
}
export type WhatsAppPersonalAdapterConfig = {
    authRootDir?: string;
    reconnectMaxAttempts?: number;
    reconnectBaseDelayMs?: number;
    maxSessionPeerCandidates?: number;
    sessionClientFactory?: () => WhatsAppSessionClient;
    credentialStore?: SessionCredentialStore;
    peerCandidateIndex?: PersonalPeerCandidateIndex;
    now?: () => number;
};
export declare class WhatsAppPersonalAdapter implements SessionProviderAdapter {
    readonly provider = ExternalChannelProvider.WHATSAPP;
    readonly transport = ExternalChannelTransport.PERSONAL_SESSION;
    private readonly sessions;
    private readonly handlers;
    private readonly credentialStore;
    private readonly sessionClientFactory;
    private readonly reconnectMaxAttempts;
    private readonly reconnectBaseDelayMs;
    private readonly peerCandidateIndex;
    private readonly now;
    constructor(config?: WhatsAppPersonalAdapterConfig);
    startSession(input: SessionStartInput): Promise<SessionStartResult>;
    stopSession(sessionId: string): Promise<void>;
    getSessionStatus(sessionId: string): Promise<SessionStatus>;
    getSessionQr(sessionId: string): Promise<SessionQr>;
    listSessionPeerCandidates(sessionId: string, options?: ListSessionPeerCandidatesOptions): Promise<ListSessionPeerCandidatesResult>;
    subscribeInbound(handler: (envelope: ExternalMessageEnvelope) => Promise<void>): () => void;
    sendOutbound(payload: ExternalOutboundEnvelope): Promise<ProviderSendResult>;
    restorePersistedSessions(): Promise<void>;
    private findActiveSessionByAccountLabel;
    private findRunningSession;
    private attachSessionClient;
    private cleanupSession;
    private handleConnectionUpdate;
    private handleInboundMessage;
    private scheduleReconnect;
    private reconnect;
    private clearReconnectTimer;
    private persistSessionMeta;
    private getSessionRecord;
    private nowIso;
}
//# sourceMappingURL=whatsapp-personal-adapter.d.ts.map
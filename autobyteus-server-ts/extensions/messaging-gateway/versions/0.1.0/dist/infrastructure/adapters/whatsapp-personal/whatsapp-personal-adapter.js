import { randomUUID } from "node:crypto";
import path from "node:path";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { BaileysSessionClient, } from "./baileys-session-client.js";
import { SessionCredentialStore } from "./session-credential-store.js";
import { toSessionState } from "./session-state-mapper.js";
import { toExternalMessageEnvelope } from "./inbound-envelope-mapper.js";
import { PersonalPeerCandidateIndex } from "./personal-peer-candidate-index.js";
export class SessionNotFoundError extends Error {
    constructor(sessionId) {
        super(`Session ${sessionId} was not found.`);
        this.name = "SessionNotFoundError";
    }
}
export class SessionQrNotReadyError extends Error {
    constructor(sessionId) {
        super(`Session ${sessionId} QR code is not ready yet.`);
        this.name = "SessionQrNotReadyError";
    }
}
export class SessionQrExpiredError extends Error {
    expiresAt;
    constructor(expiresAt) {
        super(`Session QR code expired at ${expiresAt}.`);
        this.name = "SessionQrExpiredError";
        this.expiresAt = expiresAt;
    }
}
export class SessionNotActiveError extends Error {
    retryable = false;
    constructor(accountLabel) {
        super(`No active WhatsApp personal session for accountLabel ${accountLabel}.`);
        this.name = "SessionNotActiveError";
    }
}
export class SessionAlreadyRunningError extends Error {
    sessionId;
    constructor(sessionId) {
        super(`A personal session is already running (${sessionId}).`);
        this.name = "SessionAlreadyRunningError";
        this.sessionId = sessionId;
    }
}
export class WhatsAppPersonalAdapter {
    provider = ExternalChannelProvider.WHATSAPP;
    transport = ExternalChannelTransport.PERSONAL_SESSION;
    sessions = new Map();
    handlers = new Set();
    credentialStore;
    sessionClientFactory;
    reconnectMaxAttempts;
    reconnectBaseDelayMs;
    peerCandidateIndex;
    now;
    constructor(config = {}) {
        this.now = config.now ?? (() => Date.now());
        this.reconnectMaxAttempts = config.reconnectMaxAttempts ?? 5;
        this.reconnectBaseDelayMs = config.reconnectBaseDelayMs ?? 1000;
        this.peerCandidateIndex =
            config.peerCandidateIndex ??
                new PersonalPeerCandidateIndex(config.maxSessionPeerCandidates ?? 500);
        this.sessionClientFactory =
            config.sessionClientFactory ??
                (() => {
                    return new BaileysSessionClient();
                });
        this.credentialStore =
            config.credentialStore ??
                new SessionCredentialStore(config.authRootDir ?? path.resolve(process.cwd(), "memory", "whatsapp-personal"));
    }
    async startSession(input) {
        const runningSession = this.findRunningSession();
        if (runningSession) {
            throw new SessionAlreadyRunningError(runningSession.sessionId);
        }
        const accountLabel = input.accountLabel.trim();
        if (accountLabel.length === 0) {
            throw new Error("accountLabel cannot be empty.");
        }
        if (!Number.isFinite(input.qrTtlSeconds) || input.qrTtlSeconds <= 0) {
            throw new Error("qrTtlSeconds must be a positive number.");
        }
        const sessionId = `wa-personal-${randomUUID()}`;
        const createdAt = this.nowIso();
        const authPath = await this.credentialStore.getSessionAuthPath(sessionId);
        const record = {
            sessionId,
            accountLabel,
            status: "PENDING_QR",
            createdAt,
            updatedAt: createdAt,
            qrCode: null,
            qrExpiresAtMs: null,
            qrTtlSeconds: input.qrTtlSeconds,
            authPath,
            client: this.sessionClientFactory(),
            unsubscribers: [],
            reconnectAttempts: 0,
            reconnectTimer: null,
            closedByUser: false,
        };
        this.sessions.set(sessionId, record);
        try {
            await this.attachSessionClient(record);
            await this.persistSessionMeta(record);
        }
        catch (error) {
            await this.cleanupSession(record, { removeCredentials: true });
            this.sessions.delete(sessionId);
            throw error;
        }
        return {
            sessionId,
            accountLabel: record.accountLabel,
            status: record.status,
        };
    }
    async stopSession(sessionId) {
        const record = this.getSessionRecord(sessionId);
        record.closedByUser = true;
        this.clearReconnectTimer(record);
        await this.cleanupSession(record, { removeCredentials: true, logout: true });
        record.status = "STOPPED";
        record.qrCode = null;
        record.qrExpiresAtMs = null;
        record.updatedAt = this.nowIso();
        this.peerCandidateIndex.clearSession(sessionId);
    }
    async getSessionStatus(sessionId) {
        const record = this.getSessionRecord(sessionId);
        return {
            sessionId: record.sessionId,
            accountLabel: record.accountLabel,
            status: record.status,
            updatedAt: record.updatedAt,
        };
    }
    async getSessionQr(sessionId) {
        const record = this.getSessionRecord(sessionId);
        if (!record.qrCode || record.qrExpiresAtMs === null) {
            throw new SessionQrNotReadyError(sessionId);
        }
        const nowMs = this.now();
        if (record.qrExpiresAtMs <= nowMs) {
            throw new SessionQrExpiredError(new Date(record.qrExpiresAtMs).toISOString());
        }
        return {
            code: record.qrCode,
            qr: record.qrCode,
            expiresAt: new Date(record.qrExpiresAtMs).toISOString(),
        };
    }
    async listSessionPeerCandidates(sessionId, options) {
        const record = this.getSessionRecord(sessionId);
        return {
            sessionId: record.sessionId,
            accountLabel: record.accountLabel,
            status: record.status,
            updatedAt: record.updatedAt,
            items: this.peerCandidateIndex.listCandidates(record.sessionId, options),
        };
    }
    subscribeInbound(handler) {
        this.handlers.add(handler);
        return () => {
            this.handlers.delete(handler);
        };
    }
    async sendOutbound(payload) {
        const accountLabel = normalizeNonEmptyString(payload.accountId, "accountId");
        const session = this.findActiveSessionByAccountLabel(accountLabel);
        if (!session) {
            throw new SessionNotActiveError(accountLabel);
        }
        const targetPeer = normalizeOutboundPeer(payload.peerId);
        const chunks = payload.chunks.length > 0
            ? payload.chunks
                .map((chunk) => chunk.text.trim())
                .filter((text) => text.length > 0)
            : [payload.replyText];
        if (chunks.length === 0) {
            throw new Error("No outbound text chunks available for WhatsApp send.");
        }
        let sendResult = await session.client.sendText(targetPeer, chunks[0]);
        for (let index = 1; index < chunks.length; index += 1) {
            sendResult = await session.client.sendText(targetPeer, chunks[index]);
        }
        return {
            providerMessageId: sendResult.providerMessageId,
            deliveredAt: sendResult.deliveredAt,
            metadata: {
                sessionId: session.sessionId,
                chunkCount: chunks.length,
            },
        };
    }
    async restorePersistedSessions() {
        const persisted = await this.credentialStore.listSessionMeta();
        for (const meta of persisted) {
            if (meta.status === "STOPPED" || this.sessions.has(meta.sessionId)) {
                continue;
            }
            const authPath = await this.credentialStore.getSessionAuthPath(meta.sessionId);
            const record = {
                sessionId: meta.sessionId,
                accountLabel: meta.accountLabel,
                status: meta.status === "ACTIVE" ? "DEGRADED" : meta.status,
                createdAt: meta.createdAt,
                updatedAt: this.nowIso(),
                qrCode: null,
                qrExpiresAtMs: null,
                qrTtlSeconds: 120,
                authPath,
                client: this.sessionClientFactory(),
                unsubscribers: [],
                reconnectAttempts: 0,
                reconnectTimer: null,
                closedByUser: false,
            };
            this.sessions.set(record.sessionId, record);
            try {
                await this.attachSessionClient(record);
                await this.persistSessionMeta(record);
            }
            catch {
                await this.cleanupSession(record, { removeCredentials: false });
                this.sessions.delete(record.sessionId);
            }
        }
    }
    findActiveSessionByAccountLabel(accountLabel) {
        for (const record of this.sessions.values()) {
            if (record.accountLabel === accountLabel && record.status === "ACTIVE") {
                return record;
            }
        }
        return null;
    }
    findRunningSession() {
        for (const record of this.sessions.values()) {
            if (record.status !== "STOPPED") {
                return record;
            }
        }
        return null;
    }
    async attachSessionClient(record) {
        const onConnectionUpdate = (event) => {
            void this.handleConnectionUpdate(record, event);
        };
        const onInboundMessage = (event) => {
            void this.handleInboundMessage(record, event);
        };
        record.unsubscribers.push(record.client.onConnectionUpdate(onConnectionUpdate));
        record.unsubscribers.push(record.client.onInboundMessage(onInboundMessage));
        await record.client.open({ authPath: record.authPath });
    }
    async cleanupSession(record, options) {
        for (const unsubscribe of record.unsubscribers) {
            unsubscribe();
        }
        record.unsubscribers = [];
        await record.client.close({ logout: options?.logout ?? false });
        if (options?.removeCredentials) {
            await this.credentialStore.deleteSession(record.sessionId);
        }
    }
    async handleConnectionUpdate(record, event) {
        const mappedStatus = toSessionState({
            connection: event.connection,
            disconnectCode: event.disconnectCode,
        }, record.status);
        let nextStatus = mappedStatus;
        if (typeof event.qr === "string" && event.qr.length > 0) {
            nextStatus = "PENDING_QR";
            record.qrCode = event.qr;
            record.qrExpiresAtMs = this.now() + record.qrTtlSeconds * 1000;
        }
        if (record.status !== nextStatus || typeof event.qr === "string") {
            record.status = nextStatus;
            record.updatedAt = this.nowIso();
            await this.persistSessionMeta(record);
        }
        if (record.status === "ACTIVE") {
            record.reconnectAttempts = 0;
            this.clearReconnectTimer(record);
            return;
        }
        if (record.closedByUser || record.status === "STOPPED") {
            this.clearReconnectTimer(record);
            return;
        }
        if (record.status === "DEGRADED") {
            this.scheduleReconnect(record);
        }
    }
    async handleInboundMessage(record, event) {
        const observedPeer = resolveObservedPeer(event);
        if (observedPeer) {
            this.peerCandidateIndex.recordObservation(record.sessionId, {
                peerId: observedPeer.peerId,
                peerType: observedPeer.peerType,
                threadId: observedPeer.threadId,
                displayName: event.pushName,
                observedAt: event.receivedAt,
            });
        }
        // Route if we have text or media attachments. Otherwise keep discovery-only behavior.
        if (event.text === null && event.attachments.length === 0) {
            return;
        }
        const envelope = toExternalMessageEnvelope({
            sessionId: record.sessionId,
            accountLabel: record.accountLabel,
            chatJid: event.chatJid,
            senderJid: event.senderJid,
            participantJid: event.participantJid,
            messageId: event.messageId,
            text: event.text,
            attachments: event.attachments,
            receivedAt: event.receivedAt,
        });
        for (const handler of this.handlers) {
            await handler(envelope);
        }
    }
    scheduleReconnect(record) {
        if (record.reconnectTimer || record.closedByUser || record.status === "STOPPED") {
            return;
        }
        if (record.reconnectAttempts >= this.reconnectMaxAttempts) {
            record.status = "STOPPED";
            record.updatedAt = this.nowIso();
            void this.persistSessionMeta(record);
            return;
        }
        record.reconnectAttempts += 1;
        const delayMs = this.reconnectBaseDelayMs * Math.max(1, 2 ** (record.reconnectAttempts - 1));
        record.reconnectTimer = setTimeout(() => {
            record.reconnectTimer = null;
            void this.reconnect(record);
        }, delayMs);
    }
    async reconnect(record) {
        if (record.closedByUser || record.status === "STOPPED") {
            return;
        }
        try {
            await record.client.open({ authPath: record.authPath });
        }
        catch {
            this.scheduleReconnect(record);
        }
    }
    clearReconnectTimer(record) {
        if (!record.reconnectTimer) {
            return;
        }
        clearTimeout(record.reconnectTimer);
        record.reconnectTimer = null;
    }
    async persistSessionMeta(record) {
        const meta = {
            sessionId: record.sessionId,
            accountLabel: record.accountLabel,
            status: record.status,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
        };
        await this.credentialStore.markSessionMeta(meta);
    }
    getSessionRecord(sessionId) {
        const record = this.sessions.get(sessionId);
        if (!record) {
            throw new SessionNotFoundError(sessionId);
        }
        return record;
    }
    nowIso() {
        return new Date(this.now()).toISOString();
    }
}
const normalizeNonEmptyString = (value, key) => {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`${key} must be a non-empty string.`);
    }
    return value.trim();
};
const normalizeOutboundPeer = (peerId) => {
    const normalized = normalizeNonEmptyString(peerId, "peerId");
    if (normalized.includes("@")) {
        return normalized;
    }
    return `${normalized}@s.whatsapp.net`;
};
const resolveObservedPeer = (event) => {
    const chatJid = normalizeOptionalString(event.chatJid);
    const senderJid = normalizeOptionalString(event.senderJid);
    const participantJid = normalizeOptionalString(event.participantJid);
    if (!chatJid || !senderJid) {
        return null;
    }
    if (isGroupChatJid(chatJid)) {
        return {
            peerId: participantJid ?? senderJid,
            peerType: "GROUP",
            threadId: chatJid,
        };
    }
    return {
        peerId: senderJid,
        peerType: "USER",
        threadId: null,
    };
};
const normalizeOptionalString = (value) => {
    if (typeof value !== "string") {
        return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
};
const isGroupChatJid = (jid) => jid.endsWith("@g.us");
//# sourceMappingURL=whatsapp-personal-adapter.js.map
import { randomUUID } from "node:crypto";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { ExternalPeerType } from "autobyteus-ts/external-channel/peer-type.js";
import { parseExternalMessageEnvelope, } from "autobyteus-ts/external-channel/external-message-envelope.js";
import { HttpWechatySidecarClient, } from "./wechaty-sidecar-client.js";
import { WechatSessionStateStore, } from "./session-state-store.js";
import { normalizeWechatInboundMessageId } from "./wechat-inbound-message-id-normalizer.js";
export class WechatSessionNotFoundError extends Error {
    constructor(sessionId) {
        super(`Session ${sessionId} was not found.`);
        this.name = "WechatSessionNotFoundError";
    }
}
export class WechatSessionQrNotReadyError extends Error {
    constructor(sessionId) {
        super(`Session ${sessionId} QR code is not ready yet.`);
        this.name = "WechatSessionQrNotReadyError";
    }
}
export class WechatSessionQrExpiredError extends Error {
    expiresAt;
    constructor(expiresAt) {
        super(`Session QR code expired at ${expiresAt}.`);
        this.name = "WechatSessionQrExpiredError";
        this.expiresAt = expiresAt;
    }
}
export class WechatSessionNotActiveError extends Error {
    retryable = false;
    constructor(accountLabel) {
        super(`No active WeChat personal session for accountLabel ${accountLabel}.`);
        this.name = "WechatSessionNotActiveError";
    }
}
export class WechatSessionAlreadyRunningError extends Error {
    sessionId;
    constructor(sessionId) {
        super(`A personal session is already running (${sessionId}).`);
        this.name = "WechatSessionAlreadyRunningError";
        this.sessionId = sessionId;
    }
}
export class WechatPersonalAdapter {
    provider = ExternalChannelProvider.WECHAT;
    transport = ExternalChannelTransport.PERSONAL_SESSION;
    sessions = new Map();
    handlers = new Set();
    sidecarClient;
    stateStore;
    restoreQrTtlSeconds;
    onRestoreFailure;
    onUnknownInboundSession;
    now;
    constructor(config = {}) {
        this.sidecarClient =
            config.sidecarClient ??
                new HttpWechatySidecarClient({
                    baseUrl: config.sidecarBaseUrl ?? "http://localhost:8788",
                });
        this.stateStore =
            config.stateStore ??
                new WechatSessionStateStore(config.stateRoot ?? `${process.cwd()}/memory/wechat-personal`);
        this.restoreQrTtlSeconds = resolvePositiveNumber(config.restoreQrTtlSeconds, 120, "restoreQrTtlSeconds");
        this.onRestoreFailure = config.onRestoreFailure;
        this.onUnknownInboundSession = config.onUnknownInboundSession;
        this.now = config.now ?? (() => Date.now());
    }
    async startSession(input) {
        const runningSession = this.findRunningSession();
        if (runningSession) {
            throw new WechatSessionAlreadyRunningError(runningSession.sessionId);
        }
        const accountLabel = normalizeRequiredString(input.accountLabel, "accountLabel");
        if (!Number.isFinite(input.qrTtlSeconds) || input.qrTtlSeconds <= 0) {
            throw new Error("qrTtlSeconds must be a positive number.");
        }
        const sessionId = `wechat-personal-${randomUUID()}`;
        const createdAt = this.nowIso();
        const opened = await this.sidecarClient.openSession({
            sessionId,
            accountLabel,
            qrTtlSeconds: input.qrTtlSeconds,
        });
        const record = {
            sessionId,
            accountLabel,
            status: opened.status,
            createdAt,
            updatedAt: this.nowIso(),
            qr: opened.qr,
        };
        this.sessions.set(sessionId, record);
        await this.persistSessionMeta(record);
        return {
            sessionId,
            accountLabel,
            status: record.status,
        };
    }
    async stopSession(sessionId) {
        const record = this.getSessionRecord(sessionId);
        await this.sidecarClient.closeSession(sessionId);
        record.status = "STOPPED";
        record.updatedAt = this.nowIso();
        record.qr = null;
        await this.persistSessionMeta(record);
    }
    async getSessionStatus(sessionId) {
        const record = this.getSessionRecord(sessionId);
        const sidecarStatus = await this.sidecarClient.getSessionStatus(sessionId);
        record.status = sidecarStatus.status;
        record.updatedAt = sidecarStatus.updatedAt;
        await this.persistSessionMeta(record);
        return {
            sessionId: record.sessionId,
            accountLabel: record.accountLabel,
            status: record.status,
            updatedAt: record.updatedAt,
        };
    }
    async getSessionQr(sessionId) {
        const record = this.getSessionRecord(sessionId);
        const qr = await this.sidecarClient.getSessionQr(sessionId);
        if (!qr) {
            throw new WechatSessionQrNotReadyError(sessionId);
        }
        const expiresAtMs = Date.parse(qr.expiresAt);
        if (Number.isFinite(expiresAtMs) && expiresAtMs <= this.now()) {
            throw new WechatSessionQrExpiredError(qr.expiresAt);
        }
        record.qr = qr;
        record.updatedAt = this.nowIso();
        await this.persistSessionMeta(record);
        return qr;
    }
    async listSessionPeerCandidates(sessionId, options) {
        const record = this.getSessionRecord(sessionId);
        const items = await this.sidecarClient.listPeerCandidates(sessionId, options);
        return {
            sessionId: record.sessionId,
            accountLabel: record.accountLabel,
            status: record.status,
            updatedAt: record.updatedAt,
            items,
        };
    }
    subscribeInbound(handler) {
        this.handlers.add(handler);
        return () => {
            this.handlers.delete(handler);
        };
    }
    async sendOutbound(payload) {
        const accountLabel = normalizeRequiredString(payload.accountId, "accountId");
        const activeSession = this.findActiveSessionByAccountLabel(accountLabel);
        if (!activeSession) {
            throw new WechatSessionNotActiveError(accountLabel);
        }
        const chunks = payload.chunks.length > 0
            ? payload.chunks
                .map((chunk) => chunk.text.trim())
                .filter((text) => text.length > 0)
            : [payload.replyText];
        if (chunks.length === 0) {
            throw new Error("No outbound text chunks available for WeChat send.");
        }
        let sendResult = await this.sidecarClient.sendText({
            sessionId: activeSession.sessionId,
            peerId: normalizeRequiredString(payload.peerId, "peerId"),
            threadId: payload.threadId,
            text: chunks[0],
        });
        for (let index = 1; index < chunks.length; index += 1) {
            sendResult = await this.sidecarClient.sendText({
                sessionId: activeSession.sessionId,
                peerId: normalizeRequiredString(payload.peerId, "peerId"),
                threadId: payload.threadId,
                text: chunks[index],
            });
        }
        return {
            ...sendResult,
            metadata: {
                ...(sendResult.metadata ?? {}),
                chunkCount: chunks.length,
            },
        };
    }
    async restorePersistedSessions() {
        const persisted = await this.stateStore.list();
        for (const meta of persisted) {
            if (meta.status === "STOPPED" || this.sessions.has(meta.sessionId)) {
                continue;
            }
            try {
                const opened = await this.sidecarClient.openSession({
                    sessionId: meta.sessionId,
                    accountLabel: meta.accountLabel,
                    qrTtlSeconds: this.restoreQrTtlSeconds,
                });
                const record = {
                    sessionId: meta.sessionId,
                    accountLabel: meta.accountLabel,
                    status: opened.status,
                    createdAt: meta.createdAt,
                    updatedAt: this.nowIso(),
                    qr: opened.qr,
                };
                this.sessions.set(record.sessionId, record);
                await this.persistSessionMeta(record);
            }
            catch (error) {
                const failedMeta = {
                    ...meta,
                    status: "STOPPED",
                    updatedAt: this.nowIso(),
                };
                await this.stateStore.save(failedMeta);
                this.onRestoreFailure?.({
                    sessionId: meta.sessionId,
                    accountLabel: meta.accountLabel,
                    error,
                });
            }
        }
    }
    async ingestInboundEvent(event) {
        await this.handleInboundEvent(event);
    }
    dispose() {
        // No-op: HTTP sidecar ingress is route-driven.
    }
    async handleInboundEvent(event) {
        const normalized = normalizeInboundEvent(event);
        const record = this.sessions.get(normalized.sessionId);
        if (!record) {
            this.onUnknownInboundSession?.(normalized);
            return;
        }
        const envelope = parseExternalMessageEnvelope({
            provider: this.provider,
            transport: this.transport,
            accountId: record.accountLabel,
            peerId: normalized.peerId,
            peerType: normalized.peerType ?? ExternalPeerType.USER,
            threadId: normalized.threadId,
            externalMessageId: normalizeWechatInboundMessageId(normalized),
            content: normalized.content,
            attachments: [],
            receivedAt: normalized.receivedAt,
            metadata: normalized.metadata ?? {},
        });
        for (const handler of this.handlers) {
            await handler(envelope);
        }
    }
    getSessionRecord(sessionId) {
        const record = this.sessions.get(sessionId);
        if (!record) {
            throw new WechatSessionNotFoundError(sessionId);
        }
        return record;
    }
    findRunningSession() {
        for (const record of this.sessions.values()) {
            if (record.status !== "STOPPED") {
                return record;
            }
        }
        return null;
    }
    findActiveSessionByAccountLabel(accountLabel) {
        for (const record of this.sessions.values()) {
            if (record.accountLabel === accountLabel && record.status === "ACTIVE") {
                return record;
            }
        }
        return null;
    }
    async persistSessionMeta(record) {
        const meta = {
            sessionId: record.sessionId,
            accountLabel: record.accountLabel,
            status: record.status,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
        };
        await this.stateStore.save(meta);
    }
    nowIso() {
        return new Date(this.now()).toISOString();
    }
}
const normalizeRequiredString = (value, key) => {
    const normalized = value.trim();
    if (normalized.length === 0) {
        throw new Error(`${key} must be a non-empty string.`);
    }
    return normalized;
};
const resolvePositiveNumber = (value, fallback, key) => {
    if (value === undefined) {
        return fallback;
    }
    if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`${key} must be a positive number.`);
    }
    return value;
};
const normalizeInboundEvent = (event) => {
    const sessionId = normalizeRequiredString(event.sessionId, "sessionId");
    const accountLabel = normalizeRequiredString(event.accountLabel, "accountLabel");
    const peerId = normalizeRequiredString(event.peerId, "peerId");
    const content = normalizeRequiredString(event.content, "content");
    const receivedAt = normalizeRequiredString(event.receivedAt, "receivedAt");
    const receivedAtEpoch = Date.parse(receivedAt);
    if (!Number.isFinite(receivedAtEpoch)) {
        throw new Error("receivedAt must be an ISO timestamp.");
    }
    const peerType = event.peerType === "GROUP" ? "GROUP" : "USER";
    const threadId = typeof event.threadId === "string" && event.threadId.trim().length > 0
        ? event.threadId.trim()
        : null;
    const messageId = typeof event.messageId === "string" && event.messageId.trim().length > 0
        ? event.messageId.trim()
        : null;
    return {
        sessionId,
        accountLabel,
        peerId,
        peerType,
        threadId,
        messageId,
        content,
        receivedAt: new Date(receivedAtEpoch).toISOString(),
        metadata: event.metadata ?? {},
    };
};
//# sourceMappingURL=wechat-personal-adapter.js.map
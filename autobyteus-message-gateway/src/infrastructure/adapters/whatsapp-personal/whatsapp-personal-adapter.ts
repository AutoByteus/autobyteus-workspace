import { randomUUID } from "node:crypto";
import path from "node:path";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
import type { ProviderSendResult } from "../../../domain/models/provider-adapter.js";
import type {
  SessionProviderAdapter,
  SessionQr,
  SessionStartInput,
  SessionStartResult,
  SessionState,
  SessionStatus,
} from "../../../domain/models/session-provider-adapter.js";
import type {
  ListSessionPeerCandidatesOptions,
  ListSessionPeerCandidatesResult,
} from "../../../domain/models/session-peer-candidate.js";
import {
  BaileysSessionClient,
  type PersonalConnectionUpdateEvent,
  type PersonalInboundMessageEvent,
  type WhatsAppSessionClient,
} from "./baileys-session-client.js";
import { SessionCredentialStore, type SessionMeta } from "./session-credential-store.js";
import { toSessionState } from "./session-state-mapper.js";
import { toExternalMessageEnvelope } from "./inbound-envelope-mapper.js";
import { PersonalPeerCandidateIndex } from "./personal-peer-candidate-index.js";

export class SessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Session ${sessionId} was not found.`);
    this.name = "SessionNotFoundError";
  }
}

export class SessionQrNotReadyError extends Error {
  constructor(sessionId: string) {
    super(`Session ${sessionId} QR code is not ready yet.`);
    this.name = "SessionQrNotReadyError";
  }
}

export class SessionQrExpiredError extends Error {
  readonly expiresAt: string;

  constructor(expiresAt: string) {
    super(`Session QR code expired at ${expiresAt}.`);
    this.name = "SessionQrExpiredError";
    this.expiresAt = expiresAt;
  }
}

export class SessionNotActiveError extends Error {
  readonly retryable = false;

  constructor(accountLabel: string) {
    super(`No active WhatsApp personal session for accountLabel ${accountLabel}.`);
    this.name = "SessionNotActiveError";
  }
}

export class SessionAlreadyRunningError extends Error {
  readonly sessionId: string;

  constructor(sessionId: string) {
    super(`A personal session is already running (${sessionId}).`);
    this.name = "SessionAlreadyRunningError";
    this.sessionId = sessionId;
  }
}

type SessionRecord = {
  sessionId: string;
  accountLabel: string;
  status: SessionState;
  createdAt: string;
  updatedAt: string;
  qrCode: string | null;
  qrExpiresAtMs: number | null;
  qrTtlSeconds: number;
  authPath: string;
  client: WhatsAppSessionClient;
  unsubscribers: Array<() => void>;
  reconnectAttempts: number;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  closedByUser: boolean;
};

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

export class WhatsAppPersonalAdapter implements SessionProviderAdapter {
  readonly provider = ExternalChannelProvider.WHATSAPP;
  readonly transport = ExternalChannelTransport.PERSONAL_SESSION;

  private readonly sessions = new Map<string, SessionRecord>();
  private readonly handlers = new Set<(envelope: ExternalMessageEnvelope) => Promise<void>>();
  private readonly credentialStore: SessionCredentialStore;
  private readonly sessionClientFactory: () => WhatsAppSessionClient;
  private readonly reconnectMaxAttempts: number;
  private readonly reconnectBaseDelayMs: number;
  private readonly peerCandidateIndex: PersonalPeerCandidateIndex;
  private readonly now: () => number;

  constructor(config: WhatsAppPersonalAdapterConfig = {}) {
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
      new SessionCredentialStore(
        config.authRootDir ?? path.resolve(process.cwd(), "memory", "whatsapp-personal"),
      );
  }

  async startSession(input: SessionStartInput): Promise<SessionStartResult> {
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
    const record: SessionRecord = {
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
    } catch (error) {
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

  async stopSession(sessionId: string): Promise<void> {
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

  async getSessionStatus(sessionId: string): Promise<SessionStatus> {
    const record = this.getSessionRecord(sessionId);
    return {
      sessionId: record.sessionId,
      accountLabel: record.accountLabel,
      status: record.status,
      updatedAt: record.updatedAt,
    };
  }

  async getSessionQr(sessionId: string): Promise<SessionQr> {
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

  async listSessionPeerCandidates(
    sessionId: string,
    options?: ListSessionPeerCandidatesOptions,
  ): Promise<ListSessionPeerCandidatesResult> {
    const record = this.getSessionRecord(sessionId);
    return {
      sessionId: record.sessionId,
      accountLabel: record.accountLabel,
      status: record.status,
      updatedAt: record.updatedAt,
      items: this.peerCandidateIndex.listCandidates(record.sessionId, options),
    };
  }

  subscribeInbound(handler: (envelope: ExternalMessageEnvelope) => Promise<void>): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  async sendOutbound(payload: ExternalOutboundEnvelope): Promise<ProviderSendResult> {
    const accountLabel = normalizeNonEmptyString(payload.accountId, "accountId");
    const session = this.findActiveSessionByAccountLabel(accountLabel);
    if (!session) {
      throw new SessionNotActiveError(accountLabel);
    }

    const targetPeer = normalizeOutboundPeer(payload.peerId);
    const chunks =
      payload.chunks.length > 0
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

  async restorePersistedSessions(): Promise<void> {
    const persisted = await this.credentialStore.listSessionMeta();
    for (const meta of persisted) {
      if (meta.status === "STOPPED" || this.sessions.has(meta.sessionId)) {
        continue;
      }

      const authPath = await this.credentialStore.getSessionAuthPath(meta.sessionId);
      const record: SessionRecord = {
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
      } catch {
        await this.cleanupSession(record, { removeCredentials: false });
        this.sessions.delete(record.sessionId);
      }
    }
  }

  private findActiveSessionByAccountLabel(accountLabel: string): SessionRecord | null {
    for (const record of this.sessions.values()) {
      if (record.accountLabel === accountLabel && record.status === "ACTIVE") {
        return record;
      }
    }
    return null;
  }

  private findRunningSession(): SessionRecord | null {
    for (const record of this.sessions.values()) {
      if (record.status !== "STOPPED") {
        return record;
      }
    }
    return null;
  }

  private async attachSessionClient(record: SessionRecord): Promise<void> {
    const onConnectionUpdate = (event: PersonalConnectionUpdateEvent) => {
      void this.handleConnectionUpdate(record, event);
    };
    const onInboundMessage = (event: PersonalInboundMessageEvent) => {
      void this.handleInboundMessage(record, event);
    };

    record.unsubscribers.push(record.client.onConnectionUpdate(onConnectionUpdate));
    record.unsubscribers.push(record.client.onInboundMessage(onInboundMessage));
    await record.client.open({ authPath: record.authPath });
  }

  private async cleanupSession(
    record: SessionRecord,
    options?: { removeCredentials?: boolean; logout?: boolean },
  ): Promise<void> {
    for (const unsubscribe of record.unsubscribers) {
      unsubscribe();
    }
    record.unsubscribers = [];

    await record.client.close({ logout: options?.logout ?? false });
    if (options?.removeCredentials) {
      await this.credentialStore.deleteSession(record.sessionId);
    }
  }

  private async handleConnectionUpdate(
    record: SessionRecord,
    event: PersonalConnectionUpdateEvent,
  ): Promise<void> {
    const mappedStatus = toSessionState(
      {
        connection: event.connection,
        disconnectCode: event.disconnectCode,
      },
      record.status,
    );

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

  private async handleInboundMessage(
    record: SessionRecord,
    event: PersonalInboundMessageEvent,
  ): Promise<void> {
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

  private scheduleReconnect(record: SessionRecord): void {
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
    const delayMs =
      this.reconnectBaseDelayMs * Math.max(1, 2 ** (record.reconnectAttempts - 1));
    record.reconnectTimer = setTimeout(() => {
      record.reconnectTimer = null;
      void this.reconnect(record);
    }, delayMs);
  }

  private async reconnect(record: SessionRecord): Promise<void> {
    if (record.closedByUser || record.status === "STOPPED") {
      return;
    }

    try {
      await record.client.open({ authPath: record.authPath });
    } catch {
      this.scheduleReconnect(record);
    }
  }

  private clearReconnectTimer(record: SessionRecord): void {
    if (!record.reconnectTimer) {
      return;
    }
    clearTimeout(record.reconnectTimer);
    record.reconnectTimer = null;
  }

  private async persistSessionMeta(record: SessionRecord): Promise<void> {
    const meta: SessionMeta = {
      sessionId: record.sessionId,
      accountLabel: record.accountLabel,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
    await this.credentialStore.markSessionMeta(meta);
  }

  private getSessionRecord(sessionId: string): SessionRecord {
    const record = this.sessions.get(sessionId);
    if (!record) {
      throw new SessionNotFoundError(sessionId);
    }
    return record;
  }

  private nowIso(): string {
    return new Date(this.now()).toISOString();
  }
}

const normalizeNonEmptyString = (value: unknown, key: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} must be a non-empty string.`);
  }
  return value.trim();
};

const normalizeOutboundPeer = (peerId: string): string => {
  const normalized = normalizeNonEmptyString(peerId, "peerId");
  if (normalized.includes("@")) {
    return normalized;
  }
  return `${normalized}@s.whatsapp.net`;
};

type ObservedPeer = {
  peerId: string;
  peerType: "USER" | "GROUP";
  threadId: string | null;
};

const resolveObservedPeer = (event: PersonalInboundMessageEvent): ObservedPeer | null => {
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

const normalizeOptionalString = (value: string | null): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const isGroupChatJid = (jid: string): boolean => jid.endsWith("@g.us");

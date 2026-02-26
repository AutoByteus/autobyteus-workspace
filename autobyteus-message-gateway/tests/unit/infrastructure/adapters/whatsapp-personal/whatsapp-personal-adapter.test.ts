import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
import { describe, expect, it } from "vitest";
import type {
  PersonalConnectionUpdateEvent,
  PersonalInboundMessageEvent,
  WhatsAppSessionClient,
} from "../../../../../src/infrastructure/adapters/whatsapp-personal/baileys-session-client.js";
import { SessionCredentialStore } from "../../../../../src/infrastructure/adapters/whatsapp-personal/session-credential-store.js";
import {
  SessionAlreadyRunningError,
  SessionNotActiveError,
  SessionQrNotReadyError,
  WhatsAppPersonalAdapter,
} from "../../../../../src/infrastructure/adapters/whatsapp-personal/whatsapp-personal-adapter.js";

class FakeSessionClient implements WhatsAppSessionClient {
  private readonly connectionHandlers = new Set<(event: PersonalConnectionUpdateEvent) => void>();
  private readonly inboundHandlers = new Set<
    (event: PersonalInboundMessageEvent) => Promise<void> | void
  >();

  readonly sentTexts: Array<{ toJid: string; text: string }> = [];
  openCalls = 0;
  closeCalls = 0;

  async open(_input: unknown): Promise<void> {
    this.openCalls += 1;
  }

  async close(_options?: { logout?: boolean }): Promise<void> {
    this.closeCalls += 1;
  }

  async sendText(
    toJid: string,
    text: string,
  ): Promise<{ providerMessageId: string | null; deliveredAt: string }> {
    this.sentTexts.push({ toJid, text });
    return {
      providerMessageId: "provider-msg-1",
      deliveredAt: "2026-02-09T00:00:00.000Z",
    };
  }

  onConnectionUpdate(handler: (event: PersonalConnectionUpdateEvent) => void): () => void {
    this.connectionHandlers.add(handler);
    return () => {
      this.connectionHandlers.delete(handler);
    };
  }

  onInboundMessage(
    handler: (event: PersonalInboundMessageEvent) => Promise<void> | void,
  ): () => void {
    this.inboundHandlers.add(handler);
    return () => {
      this.inboundHandlers.delete(handler);
    };
  }

  emitConnection(event: PersonalConnectionUpdateEvent): void {
    for (const handler of this.connectionHandlers) {
      handler(event);
    }
  }

  async emitInbound(event: PersonalInboundMessageEvent): Promise<void> {
    for (const handler of this.inboundHandlers) {
      await handler(event);
    }
  }
}

describe("WhatsAppPersonalAdapter", () => {
  it("starts session and exposes QR/status after real connection events", async () => {
    const nowRef = { value: Date.UTC(2026, 1, 9, 0, 0, 0) };
    const now = () => nowRef.value;
    const clients: FakeSessionClient[] = [];
    const authRoot = await mkdtemp(path.join(os.tmpdir(), "wa-personal-adapter-"));

    try {
      const adapter = new WhatsAppPersonalAdapter({
        now,
        credentialStore: new SessionCredentialStore(authRoot),
        sessionClientFactory: () => {
          const client = new FakeSessionClient();
          clients.push(client);
          return client;
        },
      });

      const created = await adapter.startSession({
        accountLabel: "home",
        qrTtlSeconds: 120,
      });

      expect(created.accountLabel).toBe("home");
      expect(created.status).toBe("PENDING_QR");
      await expect(adapter.getSessionQr(created.sessionId)).rejects.toBeInstanceOf(
        SessionQrNotReadyError,
      );

      clients[0].emitConnection({
        connection: "connecting",
        qr: "QR-CODE-123",
      });
      const qr = await adapter.getSessionQr(created.sessionId);
      expect(qr.code).toBe("QR-CODE-123");
      expect(qr.qr).toBe("QR-CODE-123");

      clients[0].emitConnection({ connection: "open" });
      const status = await adapter.getSessionStatus(created.sessionId);
      expect(status.status).toBe("ACTIVE");
      expect(status.accountLabel).toBe("home");
    } finally {
      await rm(authRoot, { recursive: true, force: true });
    }
  });

  it("maps inbound session messages and dispatches to subscribers", async () => {
    const clients: FakeSessionClient[] = [];
    const authRoot = await mkdtemp(path.join(os.tmpdir(), "wa-personal-adapter-"));

    try {
      const adapter = new WhatsAppPersonalAdapter({
        credentialStore: new SessionCredentialStore(authRoot),
        sessionClientFactory: () => {
          const client = new FakeSessionClient();
          clients.push(client);
          return client;
        },
      });

      const created = await adapter.startSession({
        accountLabel: "home",
        qrTtlSeconds: 120,
      });
      clients[0].emitConnection({ connection: "open" });

      const received: unknown[] = [];
      const unsubscribe = adapter.subscribeInbound(async (envelope) => {
        received.push(envelope);
      });

      await clients[0].emitInbound({
        chatJid: "12345@s.whatsapp.net",
        senderJid: "12345@s.whatsapp.net",
        participantJid: null,
        pushName: "Alice",
        messageId: "msg-1",
        text: "hello",
        attachments: [],
        receivedAt: "2026-02-09T00:00:00.000Z",
        fromMe: false,
      });

      unsubscribe();
      expect(received).toHaveLength(1);
      expect(received[0]).toMatchObject({
        provider: "WHATSAPP",
        transport: "PERSONAL_SESSION",
        accountId: "home",
        peerId: "12345@s.whatsapp.net",
      });

      await adapter.stopSession(created.sessionId);
    } finally {
      await rm(authRoot, { recursive: true, force: true });
    }
  });

  it("indexes peer candidates from direct and group inbound events", async () => {
    const clients: FakeSessionClient[] = [];
    const authRoot = await mkdtemp(path.join(os.tmpdir(), "wa-personal-adapter-"));

    try {
      const adapter = new WhatsAppPersonalAdapter({
        credentialStore: new SessionCredentialStore(authRoot),
        sessionClientFactory: () => {
          const client = new FakeSessionClient();
          clients.push(client);
          return client;
        },
      });

      const created = await adapter.startSession({
        accountLabel: "home",
        qrTtlSeconds: 120,
      });
      clients[0].emitConnection({ connection: "open" });

      await clients[0].emitInbound({
        chatJid: "491701111111@s.whatsapp.net",
        senderJid: "491701111111@s.whatsapp.net",
        participantJid: null,
        pushName: "Alice",
        messageId: "msg-1",
        text: "hello",
        attachments: [],
        receivedAt: "2026-02-09T00:00:00.000Z",
        fromMe: false,
      });
      await clients[0].emitInbound({
        chatJid: "120363111111111@g.us",
        senderJid: "120363111111111@g.us",
        participantJid: "491709999999@s.whatsapp.net",
        pushName: "Bob",
        messageId: "msg-2",
        text: "group message",
        attachments: [],
        receivedAt: "2026-02-09T00:01:00.000Z",
        fromMe: false,
      });

      const result = await adapter.listSessionPeerCandidates(created.sessionId, {
        includeGroups: true,
        limit: 10,
      });

      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toMatchObject({
        peerId: "491709999999@s.whatsapp.net",
        peerType: "GROUP",
        threadId: "120363111111111@g.us",
        displayName: "Bob",
      });
      expect(result.items[1]).toMatchObject({
        peerId: "491701111111@s.whatsapp.net",
        peerType: "USER",
        threadId: null,
        displayName: "Alice",
      });

      await adapter.stopSession(created.sessionId);
      const afterStop = await adapter.listSessionPeerCandidates(created.sessionId);
      expect(afterStop.status).toBe("STOPPED");
      expect(afterStop.items).toEqual([]);
    } finally {
      await rm(authRoot, { recursive: true, force: true });
    }
  });

  it("indexes non-text inbound for discovery and skips envelope routing", async () => {
    const clients: FakeSessionClient[] = [];
    const authRoot = await mkdtemp(path.join(os.tmpdir(), "wa-personal-adapter-"));

    try {
      const adapter = new WhatsAppPersonalAdapter({
        credentialStore: new SessionCredentialStore(authRoot),
        sessionClientFactory: () => {
          const client = new FakeSessionClient();
          clients.push(client);
          return client;
        },
      });

      const created = await adapter.startSession({
        accountLabel: "home",
        qrTtlSeconds: 120,
      });
      clients[0].emitConnection({ connection: "open" });

      const routed: ExternalMessageEnvelope[] = [];
      const unsubscribe = adapter.subscribeInbound(async (envelope) => {
        routed.push(envelope);
      });

      await clients[0].emitInbound({
        chatJid: "491709111111@s.whatsapp.net",
        senderJid: "491709111111@s.whatsapp.net",
        participantJid: null,
        pushName: "NoText Alice",
        messageId: "msg-non-text",
        text: null,
        attachments: [],
        receivedAt: "2026-02-09T00:02:00.000Z",
        fromMe: false,
      });

      const candidates = await adapter.listSessionPeerCandidates(created.sessionId, {
        includeGroups: true,
        limit: 10,
      });

      expect(candidates.items).toContainEqual(
        expect.objectContaining({
          peerId: "491709111111@s.whatsapp.net",
          peerType: "USER",
          threadId: null,
          displayName: "NoText Alice",
        }),
      );
      expect(routed).toHaveLength(0);

      unsubscribe();
      await adapter.stopSession(created.sessionId);
    } finally {
      await rm(authRoot, { recursive: true, force: true });
    }
  });

  it("routes attachment-only inbound events", async () => {
    const clients: FakeSessionClient[] = [];
    const authRoot = await mkdtemp(path.join(os.tmpdir(), "wa-personal-adapter-"));

    try {
      const adapter = new WhatsAppPersonalAdapter({
        credentialStore: new SessionCredentialStore(authRoot),
        sessionClientFactory: () => {
          const client = new FakeSessionClient();
          clients.push(client);
          return client;
        },
      });

      const created = await adapter.startSession({
        accountLabel: "home",
        qrTtlSeconds: 120,
      });
      clients[0].emitConnection({ connection: "open" });

      const routed: ExternalMessageEnvelope[] = [];
      const unsubscribe = adapter.subscribeInbound(async (envelope) => {
        routed.push(envelope);
      });

      await clients[0].emitInbound({
        chatJid: "491709111111@s.whatsapp.net",
        senderJid: "491709111111@s.whatsapp.net",
        participantJid: null,
        pushName: "Voice Alice",
        messageId: "msg-audio",
        text: null,
        attachments: [
          {
            kind: "audio",
            url: "data:audio/wav;base64,ZmFrZQ==",
            mimeType: "audio/wav",
            fileName: "voice.wav",
            sizeBytes: 4,
            metadata: {},
          },
        ],
        receivedAt: "2026-02-09T00:02:00.000Z",
        fromMe: false,
      });

      expect(routed).toHaveLength(1);
      expect(routed[0]).toMatchObject({
        content: "",
        attachments: [
          expect.objectContaining({
            kind: "audio",
            mimeType: "audio/wav",
            fileName: "voice.wav",
          }),
        ],
      });

      unsubscribe();
      await adapter.stopSession(created.sessionId);
    } finally {
      await rm(authRoot, { recursive: true, force: true });
    }
  });

  it("sends outbound through active personal session and rejects when inactive", async () => {
    const clients: FakeSessionClient[] = [];
    const authRoot = await mkdtemp(path.join(os.tmpdir(), "wa-personal-adapter-"));

    try {
      const adapter = new WhatsAppPersonalAdapter({
        credentialStore: new SessionCredentialStore(authRoot),
        sessionClientFactory: () => {
          const client = new FakeSessionClient();
          clients.push(client);
          return client;
        },
      });

      const created = await adapter.startSession({
        accountLabel: "home",
        qrTtlSeconds: 120,
      });
      clients[0].emitConnection({ connection: "open" });

      const payload = {
        provider: "WHATSAPP",
        transport: "PERSONAL_SESSION",
        accountId: "home",
        peerId: "628123456",
        threadId: null,
        correlationMessageId: "corr-1",
        callbackIdempotencyKey: "cb-1",
        replyText: "reply",
        attachments: [],
        chunks: [],
        metadata: {},
      } as ExternalOutboundEnvelope;

      const result = await adapter.sendOutbound(payload);
      expect(result.providerMessageId).toBe("provider-msg-1");
      expect(clients[0].sentTexts[0]).toEqual({
        toJid: "628123456@s.whatsapp.net",
        text: "reply",
      });

      const chunkedResult = await adapter.sendOutbound({
        ...payload,
        chunks: [
          { index: 0, text: "chunk-1" },
          { index: 1, text: "chunk-2" },
        ],
      });
      expect(chunkedResult.metadata).toMatchObject({ chunkCount: 2 });
      expect(clients[0].sentTexts.slice(-2)).toEqual([
        { toJid: "628123456@s.whatsapp.net", text: "chunk-1" },
        { toJid: "628123456@s.whatsapp.net", text: "chunk-2" },
      ]);

      await adapter.stopSession(created.sessionId);
      await expect(adapter.sendOutbound(payload)).rejects.toBeInstanceOf(SessionNotActiveError);
    } finally {
      await rm(authRoot, { recursive: true, force: true });
    }
  });

  it("enforces single running personal session in phase 1", async () => {
    const clients: FakeSessionClient[] = [];
    const authRoot = await mkdtemp(path.join(os.tmpdir(), "wa-personal-adapter-"));

    try {
      const adapter = new WhatsAppPersonalAdapter({
        credentialStore: new SessionCredentialStore(authRoot),
        sessionClientFactory: () => {
          const client = new FakeSessionClient();
          clients.push(client);
          return client;
        },
      });

      await adapter.startSession({
        accountLabel: "home",
        qrTtlSeconds: 120,
      });
      await expect(
        adapter.startSession({
          accountLabel: "work",
          qrTtlSeconds: 120,
        }),
      ).rejects.toBeInstanceOf(SessionAlreadyRunningError);
    } finally {
      await rm(authRoot, { recursive: true, force: true });
    }
  });
});

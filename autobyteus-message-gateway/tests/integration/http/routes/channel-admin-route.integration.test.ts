import fastify from "fastify";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { describe, expect, it } from "vitest";
import type {
  SessionProviderAdapter,
  SessionQr,
  SessionStartInput,
  SessionStartResult,
  SessionStatus,
} from "../../../../src/domain/models/session-provider-adapter.js";
import type {
  ListSessionPeerCandidatesOptions,
  ListSessionPeerCandidatesResult,
} from "../../../../src/domain/models/session-peer-candidate.js";
import { GatewayCapabilityService } from "../../../../src/application/services/gateway-capability-service.js";
import { WhatsAppPersonalSessionService } from "../../../../src/application/services/whatsapp-personal-session-service.js";
import { WechatPersonalSessionService } from "../../../../src/application/services/wechat-personal-session-service.js";
import { registerChannelAdminRoutes } from "../../../../src/http/routes/channel-admin-route.js";
import { WeComAccountRegistry } from "../../../../src/infrastructure/adapters/wecom/wecom-account-registry.js";
import { DiscordPeerCandidateIndex } from "../../../../src/infrastructure/adapters/discord-business/discord-peer-candidate-index.js";
import { DiscordPeerDiscoveryService } from "../../../../src/application/services/discord-peer-discovery-service.js";
import { TelegramPeerCandidateIndex } from "../../../../src/infrastructure/adapters/telegram-business/telegram-peer-candidate-index.js";
import { TelegramPeerDiscoveryService } from "../../../../src/application/services/telegram-peer-discovery-service.js";
import {
  SessionAlreadyRunningError,
  SessionNotFoundError,
  SessionQrNotReadyError,
} from "../../../../src/infrastructure/adapters/whatsapp-personal/whatsapp-personal-adapter.js";

class StubSessionAdapter implements SessionProviderAdapter {
  readonly provider = ExternalChannelProvider.WHATSAPP;
  readonly transport = ExternalChannelTransport.PERSONAL_SESSION;
  private readonly sessions = new Map<
    string,
    SessionStatus & { qr: SessionQr | null }
  >();
  private counter = 0;

  async startSession(input: SessionStartInput): Promise<SessionStartResult> {
    for (const session of this.sessions.values()) {
      if (session.status !== "STOPPED") {
        throw new SessionAlreadyRunningError(session.sessionId);
      }
    }

    this.counter += 1;
    const sessionId = `session-${this.counter}`;
    this.sessions.set(sessionId, {
      sessionId,
      accountLabel: input.accountLabel,
      status: "PENDING_QR",
      updatedAt: new Date().toISOString(),
      qr: {
        code: `QR-${sessionId}`,
        qr: `QR-${sessionId}`,
        expiresAt: new Date(Date.now() + input.qrTtlSeconds * 1000).toISOString(),
      },
    });
    return {
      sessionId,
      accountLabel: input.accountLabel,
      status: "PENDING_QR",
    };
  }

  async stopSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }
    this.sessions.set(sessionId, {
      ...session,
      status: "STOPPED",
      updatedAt: new Date().toISOString(),
    });
  }

  async getSessionStatus(sessionId: string): Promise<SessionStatus> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }
    return {
      sessionId: session.sessionId,
      accountLabel: session.accountLabel,
      status: session.status,
      updatedAt: session.updatedAt,
    };
  }

  async getSessionQr(sessionId: string): Promise<SessionQr> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }
    if (!session.qr) {
      throw new SessionQrNotReadyError(sessionId);
    }
    return session.qr;
  }

  async listSessionPeerCandidates(
    sessionId: string,
    options?: ListSessionPeerCandidatesOptions,
  ): Promise<ListSessionPeerCandidatesResult> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }
    const candidates: ListSessionPeerCandidatesResult["items"] = [
      {
        peerId: "491701111111@s.whatsapp.net",
        peerType: "USER",
        threadId: null,
        displayName: "Alice",
        lastMessageAt: "2026-02-09T09:00:00.000Z",
      },
      {
        peerId: "491709999999@s.whatsapp.net",
        peerType: "GROUP",
        threadId: "120363111111111@g.us",
        displayName: "Bob",
        lastMessageAt: "2026-02-09T09:01:00.000Z",
      },
    ];

    const includeGroups = options?.includeGroups ?? true;
    const limit = options?.limit ?? candidates.length;
    const filtered = includeGroups
      ? candidates
      : candidates.filter((candidate) => candidate.peerType !== "GROUP");

    return {
      sessionId,
      accountLabel: session.accountLabel,
      status: session.status,
      updatedAt: session.updatedAt,
      items: filtered.slice(0, limit),
    };
  }

  subscribeInbound(_handler: (envelope: any) => Promise<void>): () => void {
    return () => undefined;
  }

  async sendOutbound(_payload: unknown): Promise<{
    providerMessageId: string | null;
    deliveredAt: string;
    metadata: Record<string, unknown>;
  }> {
    return {
      providerMessageId: null,
      deliveredAt: new Date().toISOString(),
      metadata: {},
    };
  }
}

describe("channel-admin-route", () => {
  it("creates session and exposes status endpoints", async () => {
    const app = fastify();
    const service = new WhatsAppPersonalSessionService(new StubSessionAdapter(), {
      enabled: true,
      qrTtlSeconds: 120,
    });

    registerChannelAdminRoutes(app, { sessionService: service });

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/channel-admin/v1/whatsapp/personal/sessions",
      payload: { accountLabel: "home" },
    });

    expect(createResponse.statusCode).toBe(201);
    const created = createResponse.json() as {
      sessionId: string;
      accountLabel: string;
      status: string;
    };
    expect(created.accountLabel).toBe("home");
    expect(created.status).toBe("PENDING_QR");

    const qrResponse = await app.inject({
      method: "GET",
      url: `/api/channel-admin/v1/whatsapp/personal/sessions/${created.sessionId}/qr`,
    });
    expect(qrResponse.statusCode).toBe(200);
    expect(qrResponse.json()).toMatchObject({
      code: expect.stringContaining("QR-"),
      qr: expect.stringContaining("QR-"),
    });

    const statusResponse = await app.inject({
      method: "GET",
      url: `/api/channel-admin/v1/whatsapp/personal/sessions/${created.sessionId}/status`,
    });
    expect(statusResponse.statusCode).toBe(200);
    expect(statusResponse.json()).toMatchObject({
      sessionId: created.sessionId,
      accountLabel: "home",
      status: "PENDING_QR",
    });

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/channel-admin/v1/whatsapp/personal/sessions/${created.sessionId}`,
    });
    expect(deleteResponse.statusCode).toBe(204);

    await app.close();
  });

  it("returns 403 when personal session feature is disabled", async () => {
    const app = fastify();
    const service = new WhatsAppPersonalSessionService(new StubSessionAdapter(), {
      enabled: false,
      qrTtlSeconds: 120,
    });

    registerChannelAdminRoutes(app, { sessionService: service });

    const response = await app.inject({
      method: "POST",
      url: "/api/channel-admin/v1/whatsapp/personal/sessions",
      payload: { accountLabel: "home" },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      code: "PERSONAL_SESSION_DISABLED",
    });

    await app.close();
  });

  it("returns 409 when a second personal session is requested", async () => {
    const app = fastify();
    const service = new WhatsAppPersonalSessionService(new StubSessionAdapter(), {
      enabled: true,
      qrTtlSeconds: 120,
    });
    registerChannelAdminRoutes(app, { sessionService: service });

    const first = await app.inject({
      method: "POST",
      url: "/api/channel-admin/v1/whatsapp/personal/sessions",
      payload: { accountLabel: "home" },
    });
    expect(first.statusCode).toBe(201);

    const second = await app.inject({
      method: "POST",
      url: "/api/channel-admin/v1/whatsapp/personal/sessions",
      payload: { accountLabel: "work" },
    });
    expect(second.statusCode).toBe(409);
    expect(second.json()).toMatchObject({
      code: "SESSION_ALREADY_RUNNING",
      sessionId: "session-1",
    });

    await app.close();
  });

  it("returns peer candidates and applies query filters", async () => {
    const app = fastify();
    const service = new WhatsAppPersonalSessionService(new StubSessionAdapter(), {
      enabled: true,
      qrTtlSeconds: 120,
    });
    registerChannelAdminRoutes(app, { sessionService: service });

    const created = await app.inject({
      method: "POST",
      url: "/api/channel-admin/v1/whatsapp/personal/sessions",
      payload: { accountLabel: "home" },
    });
    const createdBody = created.json() as { sessionId: string };

    const response = await app.inject({
      method: "GET",
      url: `/api/channel-admin/v1/whatsapp/personal/sessions/${createdBody.sessionId}/peer-candidates?includeGroups=false&limit=1`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      sessionId: createdBody.sessionId,
      items: [
        {
          peerId: "491701111111@s.whatsapp.net",
          peerType: "USER",
        },
      ],
    });

    await app.close();
  });

  it("returns gateway capabilities and configured wecom accounts", async () => {
    const app = fastify();
    const service = new WhatsAppPersonalSessionService(new StubSessionAdapter(), {
      enabled: true,
      qrTtlSeconds: 120,
    });
    const capabilityService = new GatewayCapabilityService({
      wecomAppEnabled: true,
      wechatPersonalEnabled: false,
      discordEnabled: true,
      discordAccountId: "discord-acct-1",
      telegramEnabled: true,
      telegramAccountId: "telegram-acct-1",
    });
    const accountRegistry = new WeComAccountRegistry([
      {
        accountId: "corp-main",
        label: "Corporate Main",
        mode: "APP",
      },
    ]);
    registerChannelAdminRoutes(app, {
      sessionService: service,
      capabilityService,
      wecomAccountRegistry: accountRegistry,
    });

    const capabilityResponse = await app.inject({
      method: "GET",
      url: "/api/channel-admin/v1/capabilities",
    });
    expect(capabilityResponse.statusCode).toBe(200);
    expect(capabilityResponse.json()).toEqual({
      wechatModes: ["WECOM_APP_BRIDGE"],
      defaultWeChatMode: "WECOM_APP_BRIDGE",
      wecomAppEnabled: true,
      wechatPersonalEnabled: false,
      discordEnabled: true,
      discordAccountId: "discord-acct-1",
      telegramEnabled: true,
      telegramAccountId: "telegram-acct-1",
    });

    const accountResponse = await app.inject({
      method: "GET",
      url: "/api/channel-admin/v1/wecom/accounts",
    });
    expect(accountResponse.statusCode).toBe(200);
    expect(accountResponse.json()).toEqual({
      items: [
        {
          accountId: "corp-main",
          label: "Corporate Main",
          mode: "APP",
        },
      ],
    });

    await app.close();
  });

  it("creates and manages wechat personal sessions via channel-admin routes", async () => {
    const app = fastify();
    const whatsappService = new WhatsAppPersonalSessionService(new StubSessionAdapter(), {
      enabled: true,
      qrTtlSeconds: 120,
    });
    const wechatService = new WechatPersonalSessionService(new StubSessionAdapter(), {
      enabled: true,
      qrTtlSeconds: 120,
    });
    registerChannelAdminRoutes(app, {
      sessionService: whatsappService,
      wechatSessionService: wechatService,
    });

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/channel-admin/v1/wechat/personal/sessions",
      payload: { accountLabel: "wechat-home" },
    });
    expect(createResponse.statusCode).toBe(201);
    const created = createResponse.json() as { sessionId: string };

    const statusResponse = await app.inject({
      method: "GET",
      url: `/api/channel-admin/v1/wechat/personal/sessions/${created.sessionId}/status`,
    });
    expect(statusResponse.statusCode).toBe(200);
    expect(statusResponse.json()).toMatchObject({
      sessionId: created.sessionId,
      accountLabel: "wechat-home",
    });

    const peerResponse = await app.inject({
      method: "GET",
      url: `/api/channel-admin/v1/wechat/personal/sessions/${created.sessionId}/peer-candidates?includeGroups=false&limit=1`,
    });
    expect(peerResponse.statusCode).toBe(200);
    expect(peerResponse.json()).toMatchObject({
      sessionId: created.sessionId,
      items: [
        {
          peerType: "USER",
        },
      ],
    });

    const deleteResponse = await app.inject({
      method: "DELETE",
      url: `/api/channel-admin/v1/wechat/personal/sessions/${created.sessionId}`,
    });
    expect(deleteResponse.statusCode).toBe(204);

    await app.close();
  });

  it("applies provider-specific peer candidate limits for wechat routes", async () => {
    const app = fastify();
    const whatsappService = new WhatsAppPersonalSessionService(new StubSessionAdapter(), {
      enabled: true,
      qrTtlSeconds: 120,
    });
    const wechatService = new WechatPersonalSessionService(new StubSessionAdapter(), {
      enabled: true,
      qrTtlSeconds: 120,
    });
    registerChannelAdminRoutes(app, {
      sessionService: whatsappService,
      wechatSessionService: wechatService,
      defaultPeerCandidateLimit: 1,
      maxPeerCandidateLimit: 1,
      wechatDefaultPeerCandidateLimit: 2,
      wechatMaxPeerCandidateLimit: 2,
    });

    const createResponse = await app.inject({
      method: "POST",
      url: "/api/channel-admin/v1/wechat/personal/sessions",
      payload: { accountLabel: "wechat-home" },
    });
    expect(createResponse.statusCode).toBe(201);
    const created = createResponse.json() as { sessionId: string };

    const peerResponse = await app.inject({
      method: "GET",
      url: `/api/channel-admin/v1/wechat/personal/sessions/${created.sessionId}/peer-candidates?includeGroups=true&limit=99`,
    });
    expect(peerResponse.statusCode).toBe(200);
    expect((peerResponse.json() as { items: unknown[] }).items).toHaveLength(2);

    await app.close();
  });

  it("requires admin token when channel-admin token gate is enabled", async () => {
    const app = fastify();
    const service = new WhatsAppPersonalSessionService(new StubSessionAdapter(), {
      enabled: true,
      qrTtlSeconds: 120,
    });
    registerChannelAdminRoutes(app, {
      sessionService: service,
      adminToken: "secret-token",
    });

    const unauthorized = await app.inject({
      method: "POST",
      url: "/api/channel-admin/v1/whatsapp/personal/sessions",
      payload: { accountLabel: "home" },
    });
    expect(unauthorized.statusCode).toBe(401);
    expect(unauthorized.json()).toMatchObject({
      code: "ADMIN_TOKEN_REQUIRED",
    });

    const authorized = await app.inject({
      method: "POST",
      url: "/api/channel-admin/v1/whatsapp/personal/sessions",
      payload: { accountLabel: "home" },
      headers: {
        authorization: "Bearer secret-token",
      },
    });
    expect(authorized.statusCode).toBe(201);

    await app.close();
  });

  it("returns discord peer candidates from discovery service", async () => {
    const app = fastify();
    const service = new WhatsAppPersonalSessionService(new StubSessionAdapter(), {
      enabled: true,
      qrTtlSeconds: 120,
    });
    const index = new DiscordPeerCandidateIndex({
      maxCandidatesPerAccount: 20,
      candidateTtlSeconds: 86400,
    });
    index.recordObservation({
      accountId: "discord-acct-1",
      peerId: "user:111222333",
      peerType: "USER",
      threadId: null,
      displayName: "Alice",
      lastMessageAt: new Date().toISOString(),
    });
    index.recordObservation({
      accountId: "discord-acct-1",
      peerId: "channel:999888777",
      peerType: "GROUP",
      threadId: "thread-1",
      displayName: "#general",
      lastMessageAt: new Date(Date.now() + 1).toISOString(),
    });
    registerChannelAdminRoutes(app, {
      sessionService: service,
      discordPeerDiscoveryService: new DiscordPeerDiscoveryService(index, {
        enabled: true,
        accountId: "discord-acct-1",
      }),
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/channel-admin/v1/discord/peer-candidates?includeGroups=false&limit=5",
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      accountId: "discord-acct-1",
      items: [
        {
          peerId: "user:111222333",
          peerType: "USER",
        },
      ],
    });

    await app.close();
  });

  it("returns typed disabled error for discord discovery when service is not configured", async () => {
    const app = fastify();
    const service = new WhatsAppPersonalSessionService(new StubSessionAdapter(), {
      enabled: true,
      qrTtlSeconds: 120,
    });
    registerChannelAdminRoutes(app, { sessionService: service });

    const response = await app.inject({
      method: "GET",
      url: "/api/channel-admin/v1/discord/peer-candidates",
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      code: "DISCORD_DISCOVERY_NOT_ENABLED",
    });

    await app.close();
  });

  it("returns telegram peer candidates from discovery service", async () => {
    const app = fastify();
    const service = new WhatsAppPersonalSessionService(new StubSessionAdapter(), {
      enabled: true,
      qrTtlSeconds: 120,
    });
    const index = new TelegramPeerCandidateIndex({
      maxCandidatesPerAccount: 20,
      candidateTtlSeconds: 86400,
    });
    index.recordObservation({
      accountId: "telegram-acct-1",
      peerId: "100200300",
      peerType: "USER",
      threadId: null,
      displayName: "Alice",
      lastMessageAt: new Date().toISOString(),
    });
    index.recordObservation({
      accountId: "telegram-acct-1",
      peerId: "-1001234567890",
      peerType: "GROUP",
      threadId: "77",
      displayName: "Engineering",
      lastMessageAt: new Date(Date.now() + 1).toISOString(),
    });
    registerChannelAdminRoutes(app, {
      sessionService: service,
      telegramPeerDiscoveryService: new TelegramPeerDiscoveryService(index, {
        enabled: true,
        accountId: "telegram-acct-1",
      }),
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/channel-admin/v1/telegram/peer-candidates?includeGroups=false&limit=5",
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      accountId: "telegram-acct-1",
      items: [
        {
          peerId: "100200300",
          peerType: "USER",
        },
      ],
    });

    await app.close();
  });

  it("returns typed disabled error for telegram discovery when service is not configured", async () => {
    const app = fastify();
    const service = new WhatsAppPersonalSessionService(new StubSessionAdapter(), {
      enabled: true,
      qrTtlSeconds: 120,
    });
    registerChannelAdminRoutes(app, { sessionService: service });

    const response = await app.inject({
      method: "GET",
      url: "/api/channel-admin/v1/telegram/peer-candidates",
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      code: "TELEGRAM_DISCOVERY_NOT_ENABLED",
    });

    await app.close();
  });
});

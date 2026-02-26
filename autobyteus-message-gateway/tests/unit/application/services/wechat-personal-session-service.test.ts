import { describe, expect, it } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import {
  WechatPersonalFeatureDisabledError,
  WechatPersonalSessionService,
} from "../../../../src/application/services/wechat-personal-session-service.js";
import type { SessionProviderAdapter } from "../../../../src/domain/models/session-provider-adapter.js";

const createAdapterStub = (): SessionProviderAdapter => ({
  provider: ExternalChannelProvider.WECHAT,
  transport: ExternalChannelTransport.PERSONAL_SESSION,
  startSession: async () => ({
    sessionId: "wechat-session-1",
    accountLabel: "Home WeChat",
    status: "PENDING_QR",
  }),
  stopSession: async () => undefined,
  getSessionStatus: async () => ({
    sessionId: "wechat-session-1",
    accountLabel: "Home WeChat",
    status: "ACTIVE",
    updatedAt: "2026-02-09T10:00:00.000Z",
  }),
  getSessionQr: async () => ({
    code: "qr-1",
    expiresAt: "2026-02-09T10:10:00.000Z",
  }),
  listSessionPeerCandidates: async () => ({
    sessionId: "wechat-session-1",
    accountLabel: "Home WeChat",
    status: "ACTIVE",
    updatedAt: "2026-02-09T10:00:00.000Z",
    items: [],
  }),
  subscribeInbound: () => () => undefined,
  sendOutbound: async () => ({
    providerMessageId: "msg-1",
    deliveredAt: "2026-02-09T10:00:00.000Z",
    metadata: {},
  }),
});

describe("WechatPersonalSessionService", () => {
  it("delegates lifecycle operations when feature is enabled", async () => {
    const adapter = createAdapterStub();
    const service = new WechatPersonalSessionService(adapter, {
      enabled: true,
      qrTtlSeconds: 120,
    });

    const started = await service.startPersonalSession("Home WeChat");
    const status = await service.getPersonalSessionStatus("wechat-session-1");
    const qr = await service.getPersonalSessionQr("wechat-session-1");
    await service.stopPersonalSession("wechat-session-1");

    expect(started.sessionId).toBe("wechat-session-1");
    expect(status.status).toBe("ACTIVE");
    expect(qr.code).toBe("qr-1");
  });

  it("throws feature-disabled error when disabled", async () => {
    const adapter = createAdapterStub();
    const service = new WechatPersonalSessionService(adapter, {
      enabled: false,
      qrTtlSeconds: 120,
    });

    await expect(service.startPersonalSession("Home WeChat")).rejects.toBeInstanceOf(
      WechatPersonalFeatureDisabledError,
    );
  });
});

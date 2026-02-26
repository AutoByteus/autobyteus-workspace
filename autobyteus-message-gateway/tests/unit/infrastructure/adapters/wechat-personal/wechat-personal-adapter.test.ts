import { describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import type { WechatSessionMeta } from "../../../../../src/infrastructure/adapters/wechat-personal/session-state-store.js";
import { WechatPersonalAdapter } from "../../../../../src/infrastructure/adapters/wechat-personal/wechat-personal-adapter.js";
import type { WechatySidecarClient } from "../../../../../src/infrastructure/adapters/wechat-personal/wechaty-sidecar-client.js";

const createStubStateStore = (initial: WechatSessionMeta[] = []) => {
  const items = new Map<string, WechatSessionMeta>(
    initial.map((meta) => [meta.sessionId, { ...meta }]),
  );
  return {
    async list(): Promise<WechatSessionMeta[]> {
      return Array.from(items.values()).map((meta) => ({ ...meta }));
    },
    async save(meta: WechatSessionMeta): Promise<void> {
      items.set(meta.sessionId, { ...meta });
    },
  };
};

const createStubSidecar = (
  options?: {
    openSessionImpl?: WechatySidecarClient["openSession"];
  },
) => {
  const client: WechatySidecarClient = {
    openSession:
      options?.openSessionImpl ??
      (vi.fn(async () => ({
        status: "ACTIVE" as const,
        qr: {
          code: "qr-1",
          expiresAt: "2099-01-01T00:00:00.000Z",
        },
      })) as WechatySidecarClient["openSession"]),
    closeSession: vi.fn(async () => undefined),
    getSessionStatus: vi.fn(async () => ({
      status: "ACTIVE" as const,
      updatedAt: "2026-02-09T10:10:00.000Z",
    })),
    getSessionQr: vi.fn(async () => ({
      code: "qr-1",
      expiresAt: "2099-01-01T00:00:00.000Z",
    })),
    listPeerCandidates: vi.fn(async () => []),
    sendText: vi.fn(async () => ({
      providerMessageId: "msg-out-1",
      deliveredAt: "2026-02-09T10:10:00.000Z",
      metadata: {},
    })),
  };

  return {
    client,
  };
};

describe("WechatPersonalAdapter", () => {
  it("starts session and supports status/qr/send flows", async () => {
    const sidecar = createStubSidecar();
    const adapter = new WechatPersonalAdapter({
      sidecarClient: sidecar.client,
      now: () => Date.parse("2026-02-09T10:00:00.000Z"),
    });

    const started = await adapter.startSession({
      accountLabel: "Home WeChat",
      qrTtlSeconds: 120,
    });
    expect(started.status).toBe("ACTIVE");

    const status = await adapter.getSessionStatus(started.sessionId);
    expect(status.status).toBe("ACTIVE");

    const qr = await adapter.getSessionQr(started.sessionId);
    expect(qr.code).toBe("qr-1");

    const outbound = await adapter.sendOutbound({
      provider: ExternalChannelProvider.WECHAT,
      transport: ExternalChannelTransport.PERSONAL_SESSION,
      accountId: "Home WeChat",
      peerId: "peer-1",
      threadId: null,
      correlationMessageId: "corr-1",
      callbackIdempotencyKey: "cb-1",
      replyText: "hello",
      attachments: [],
      chunks: [],
      metadata: {},
    });
    expect(outbound.providerMessageId).toBe("msg-out-1");
    expect(sidecar.client.sendText).toHaveBeenCalledTimes(1);

    const chunked = await adapter.sendOutbound({
      provider: ExternalChannelProvider.WECHAT,
      transport: ExternalChannelTransport.PERSONAL_SESSION,
      accountId: "Home WeChat",
      peerId: "peer-1",
      threadId: null,
      correlationMessageId: "corr-2",
      callbackIdempotencyKey: "cb-2",
      replyText: "ignored by chunks",
      attachments: [],
      chunks: [
        { index: 0, text: "chunk-1" },
        { index: 1, text: "chunk-2" },
      ],
      metadata: {},
    });
    expect(chunked.metadata).toMatchObject({ chunkCount: 2 });
    expect(sidecar.client.sendText).toHaveBeenCalledTimes(3);
  });

  it("ingests inbound events through explicit ingress API", async () => {
    const sidecar = createStubSidecar();
    const adapter = new WechatPersonalAdapter({
      sidecarClient: sidecar.client,
      now: () => Date.parse("2026-02-09T10:00:00.000Z"),
    });
    const handler = vi.fn(async (_envelope: unknown) => undefined);

    const started = await adapter.startSession({
      accountLabel: "Home WeChat",
      qrTtlSeconds: 120,
    });
    adapter.subscribeInbound(handler);

    await adapter.ingestInboundEvent({
      sessionId: started.sessionId,
      accountLabel: "Home WeChat",
      peerId: "peer-1",
      peerType: "USER",
      threadId: null,
      messageId: "msg-in-1",
      content: "hello inbound",
      receivedAt: "2026-02-09T10:10:00.000Z",
      metadata: {},
    });

    expect(handler).toHaveBeenCalledOnce();
    const firstEnvelope = handler.mock.calls[0]?.[0];
    expect(firstEnvelope).toMatchObject({
      provider: ExternalChannelProvider.WECHAT,
      transport: ExternalChannelTransport.PERSONAL_SESSION,
      accountId: "Home WeChat",
      peerId: "peer-1",
      externalMessageId: "msg-in-1",
    });
  });

  it("drops inbound events for unknown sessions and reports context", async () => {
    const sidecar = createStubSidecar();
    const onUnknownInboundSession = vi.fn();
    const adapter = new WechatPersonalAdapter({
      sidecarClient: sidecar.client,
      onUnknownInboundSession,
    });
    const handler = vi.fn(async (_envelope: unknown) => undefined);
    adapter.subscribeInbound(handler);

    await adapter.ingestInboundEvent({
      sessionId: "missing-session",
      accountLabel: "Home WeChat",
      peerId: "peer-1",
      peerType: "USER",
      threadId: null,
      messageId: "msg-in-1",
      content: "hello inbound",
      receivedAt: "2026-02-09T10:10:00.000Z",
      metadata: {},
    });

    expect(handler).not.toHaveBeenCalled();
    expect(onUnknownInboundSession).toHaveBeenCalledOnce();
  });

  it("uses configured restore QR TTL and reports restore failures", async () => {
    const openSession = vi.fn(async ({ sessionId }: { sessionId: string }) => {
      if (sessionId === "session-fail") {
        throw new Error("restore failed");
      }
      return {
        status: "ACTIVE" as const,
        qr: null,
      };
    });
    const sidecar = createStubSidecar({
      openSessionImpl: openSession as WechatySidecarClient["openSession"],
    });
    const stateStore = createStubStateStore([
      {
        sessionId: "session-fail",
        accountLabel: "Fail Account",
        status: "ACTIVE",
        createdAt: "2026-02-08T10:00:00.000Z",
        updatedAt: "2026-02-08T10:00:00.000Z",
      },
      {
        sessionId: "session-ok",
        accountLabel: "Ok Account",
        status: "ACTIVE",
        createdAt: "2026-02-08T11:00:00.000Z",
        updatedAt: "2026-02-08T11:00:00.000Z",
      },
    ]);
    const saveSpy = vi.spyOn(stateStore, "save");
    const onRestoreFailure = vi.fn();

    const adapter = new WechatPersonalAdapter({
      sidecarClient: sidecar.client,
      stateStore: stateStore as unknown as any,
      restoreQrTtlSeconds: 90,
      onRestoreFailure,
      now: () => Date.parse("2026-02-09T10:00:00.000Z"),
    });

    await adapter.restorePersistedSessions();

    expect(openSession).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "session-fail",
        qrTtlSeconds: 90,
      }),
    );
    expect(openSession).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "session-ok",
        qrTtlSeconds: 90,
      }),
    );
    expect(onRestoreFailure).toHaveBeenCalledOnce();
    expect(onRestoreFailure.mock.calls[0]?.[0]).toMatchObject({
      sessionId: "session-fail",
      accountLabel: "Fail Account",
    });
    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "session-fail",
        status: "STOPPED",
      }),
    );
  });
});

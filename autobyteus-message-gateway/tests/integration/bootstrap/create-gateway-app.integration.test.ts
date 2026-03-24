import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { defaultRuntimeConfig } from "../../../src/config/runtime-config.js";
import { createGatewayApp } from "../../../src/bootstrap/create-gateway-app.js";
import { DiscordBusinessAdapter } from "../../../src/infrastructure/adapters/discord-business/discord-business-adapter.js";
import { TelegramBusinessAdapter } from "../../../src/infrastructure/adapters/telegram-business/telegram-business-adapter.js";
import { FileQueueOwnerLock } from "../../../src/infrastructure/queue/file-queue-owner-lock.js";
import { WechatPersonalAdapter } from "../../../src/infrastructure/adapters/wechat-personal/wechat-personal-adapter.js";
import { createWechatSidecarSignature } from "../../../src/infrastructure/adapters/wechat-personal/wechat-sidecar-signature.js";

describe("create-gateway-app integration", () => {
  it("wires Discord capability payload and lifecycle hooks when enabled", async () => {
    const startSpy = vi
      .spyOn(DiscordBusinessAdapter.prototype, "start")
      .mockResolvedValue(undefined);
    const stopSpy = vi
      .spyOn(DiscordBusinessAdapter.prototype, "stop")
      .mockResolvedValue(undefined);

    const config = defaultRuntimeConfig();
    config.discordEnabled = true;
    config.discordBotToken = "discord-bot-token";
    config.discordAccountId = "discord-acct-1";

    const app = createGatewayApp(config);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const capabilityResponse = await app.inject({
      method: "GET",
      url: "/api/channel-admin/v1/capabilities",
    });
    expect(capabilityResponse.statusCode).toBe(200);
    expect(capabilityResponse.json()).toMatchObject({
      discordEnabled: true,
      discordAccountId: "discord-acct-1",
    });
    expect(startSpy).toHaveBeenCalledOnce();

    await app.close();
    expect(stopSpy).toHaveBeenCalledOnce();

    startSpy.mockRestore();
    stopSpy.mockRestore();
  });

  it("does not start Discord adapter when discord mode is disabled", async () => {
    const startSpy = vi
      .spyOn(DiscordBusinessAdapter.prototype, "start")
      .mockResolvedValue(undefined);
    const stopSpy = vi
      .spyOn(DiscordBusinessAdapter.prototype, "stop")
      .mockResolvedValue(undefined);

    const app = createGatewayApp(defaultRuntimeConfig());
    await new Promise((resolve) => setTimeout(resolve, 0));

    const capabilityResponse = await app.inject({
      method: "GET",
      url: "/api/channel-admin/v1/capabilities",
    });
    expect(capabilityResponse.statusCode).toBe(200);
    expect(capabilityResponse.json()).toMatchObject({
      discordEnabled: false,
      discordAccountId: null,
    });
    expect(startSpy).not.toHaveBeenCalled();

    await app.close();
    expect(stopSpy).not.toHaveBeenCalled();

    startSpy.mockRestore();
    stopSpy.mockRestore();
  });

  it("does not expose WeCom app routes when app mode is disabled", async () => {
    const config = defaultRuntimeConfig();
    config.wecomAppEnabled = false;
    config.wecomAppAccounts = [
      {
        accountId: "corp-main",
        label: "Corporate Main",
        mode: "APP",
      },
    ];

    const app = createGatewayApp(config);
    try {
      const capabilityResponse = await app.inject({
        method: "GET",
        url: "/api/channel-admin/v1/capabilities",
      });
      expect(capabilityResponse.statusCode).toBe(200);
      expect(capabilityResponse.json()).toMatchObject({
        wecomAppEnabled: false,
      });

      const webhookResponse = await app.inject({
        method: "GET",
        url: "/webhooks/wecom-app/corp-main?timestamp=1&nonce=2&signature=3&echostr=hello",
      });
      expect(webhookResponse.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });

  it("wires Telegram capability payload and polling lifecycle hooks when enabled", async () => {
    const startSpy = vi
      .spyOn(TelegramBusinessAdapter.prototype, "start")
      .mockResolvedValue(undefined);
    const stopSpy = vi
      .spyOn(TelegramBusinessAdapter.prototype, "stop")
      .mockResolvedValue(undefined);

    const config = defaultRuntimeConfig();
    config.telegramEnabled = true;
    config.telegramBotToken = "telegram-bot-token";
    config.telegramAccountId = "telegram-acct-1";
    config.telegramPollingEnabled = true;
    config.telegramWebhookEnabled = false;

    const app = createGatewayApp(config);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const capabilityResponse = await app.inject({
      method: "GET",
      url: "/api/channel-admin/v1/capabilities",
    });
    expect(capabilityResponse.statusCode).toBe(200);
    expect(capabilityResponse.json()).toMatchObject({
      telegramEnabled: true,
      telegramAccountId: "telegram-acct-1",
    });
    expect(startSpy).toHaveBeenCalledOnce();

    await app.close();
    expect(stopSpy).toHaveBeenCalledOnce();

    startSpy.mockRestore();
    stopSpy.mockRestore();
  });

  it("applies configured Telegram discovery limits inside the bootstrapped app", async () => {
    const startSpy = vi
      .spyOn(TelegramBusinessAdapter.prototype, "start")
      .mockResolvedValue(undefined);
    const stopSpy = vi
      .spyOn(TelegramBusinessAdapter.prototype, "stop")
      .mockResolvedValue(undefined);

    const runtimeDataRoot = await fsp.mkdtemp(
      path.join(os.tmpdir(), "gateway-telegram-discovery-limit-"),
    );
    const nowEpochSeconds = Math.floor(Date.now() / 1000);

    try {
      const config = defaultRuntimeConfig();
      config.runtimeDataRoot = runtimeDataRoot;
      config.telegramEnabled = true;
      config.telegramBotToken = "telegram-bot-token";
      config.telegramAccountId = "telegram-acct-1";
      config.telegramPollingEnabled = false;
      config.telegramWebhookEnabled = true;
      config.telegramWebhookSecretToken = "telegram-webhook-secret";
      config.telegramDiscoveryMaxCandidates = 1;

      const app = createGatewayApp(config);
      try {
        const firstResponse = await app.inject({
          method: "POST",
          url: "/webhooks/telegram",
          headers: {
            "x-telegram-bot-api-secret-token": "telegram-webhook-secret",
          },
          payload: {
            update_id: 5001,
            message: {
              message_id: 7001,
              date: nowEpochSeconds,
              text: "hello one",
              chat: {
                id: 100200300,
                type: "private",
              },
            },
          },
        });
        expect(firstResponse.statusCode).toBe(200);

        const secondResponse = await app.inject({
          method: "POST",
          url: "/webhooks/telegram",
          headers: {
            "x-telegram-bot-api-secret-token": "telegram-webhook-secret",
          },
          payload: {
            update_id: 5002,
            message: {
              message_id: 7002,
              date: nowEpochSeconds + 1,
              text: "hello two",
              chat: {
                id: 100200301,
                type: "private",
              },
            },
          },
        });
        expect(secondResponse.statusCode).toBe(200);

        const discoveryResponse = await app.inject({
          method: "GET",
          url: "/api/channel-admin/v1/telegram/peer-candidates?includeGroups=false&limit=99",
        });
        expect(discoveryResponse.statusCode).toBe(200);
        expect(discoveryResponse.json()).toMatchObject({
          items: [
            {
              peerId: "100200301",
            },
          ],
        });
        expect(discoveryResponse.json().items).toHaveLength(1);
        expect(startSpy).not.toHaveBeenCalled();
      } finally {
        await app.close();
      }
      expect(stopSpy).not.toHaveBeenCalled();
    } finally {
      await fsp.rm(runtimeDataRoot, { recursive: true, force: true });
    }

    startSpy.mockRestore();
    stopSpy.mockRestore();
  });

  it("releases first lock when second lock acquire fails during startup", async () => {
    const acquireSpy = vi.spyOn(FileQueueOwnerLock.prototype, "acquire");
    const releaseSpy = vi
      .spyOn(FileQueueOwnerLock.prototype, "release")
      .mockResolvedValue(undefined);

    acquireSpy.mockImplementationOnce(async () => undefined).mockImplementationOnce(async () => {
      throw new Error("outbox lock acquire failed");
    });

    const app = createGatewayApp(defaultRuntimeConfig());
    await expect(app.ready()).rejects.toThrow("outbox lock acquire failed");
    expect(releaseSpy).toHaveBeenCalled();

    await app.close().catch(() => undefined);
    acquireSpy.mockRestore();
    releaseSpy.mockRestore();
  });

  it("releases queue owner locks when the gateway app closes", async () => {
    const runtimeDataRoot = await fsp.mkdtemp(
      path.join(os.tmpdir(), "gateway-close-lock-release-"),
    );

    try {
      const config = defaultRuntimeConfig();
      config.runtimeDataRoot = runtimeDataRoot;
      config.wecomAppEnabled = false;

      const app = createGatewayApp(config);
      await app.listen({ host: "127.0.0.1", port: 0 });

      const lockRoot = path.join(
        runtimeDataRoot,
        "reliability-queue",
        "locks",
      );
      const inboxLockPath = path.join(lockRoot, "inbox.lock.json");
      const outboxLockPath = path.join(lockRoot, "outbox.lock.json");

      await expect(fsp.access(inboxLockPath)).resolves.toBeUndefined();
      await expect(fsp.access(outboxLockPath)).resolves.toBeUndefined();

      await app.close();

      await expect(fsp.access(inboxLockPath)).rejects.toMatchObject({
        code: "ENOENT",
      });
      await expect(fsp.access(outboxLockPath)).rejects.toMatchObject({
        code: "ENOENT",
      });
    } finally {
      await fsp.rm(runtimeDataRoot, { recursive: true, force: true });
    }
  });

  it("runs wechat restore only after queue lock acquisition during onReady", async () => {
    const restoreOrder: string[] = [];
    let acquireCallCount = 0;
    const acquireSpy = vi
      .spyOn(FileQueueOwnerLock.prototype, "acquire")
      .mockImplementation(async () => {
        acquireCallCount += 1;
        restoreOrder.push(`acquire-${acquireCallCount}`);
      });
    const releaseSpy = vi
      .spyOn(FileQueueOwnerLock.prototype, "release")
      .mockResolvedValue(undefined);
    const restoreSpy = vi
      .spyOn(WechatPersonalAdapter.prototype, "restorePersistedSessions")
      .mockImplementation(async () => {
        restoreOrder.push("wechat-restore");
      });

    const config = defaultRuntimeConfig();
    config.wechatPersonalEnabled = true;
    config.wechatPersonalSidecarSharedSecret = "wechat-sidecar-secret";

    const app = createGatewayApp(config);
    expect(restoreSpy).not.toHaveBeenCalled();

    await app.ready();
    expect(restoreOrder.slice(0, 3)).toEqual([
      "acquire-1",
      "acquire-2",
      "wechat-restore",
    ]);

    await app.close();
    acquireSpy.mockRestore();
    releaseSpy.mockRestore();
    restoreSpy.mockRestore();
  });

  it("registers signed wechat sidecar ingress route when wechat personal is enabled", async () => {
    const restoreSpy = vi
      .spyOn(WechatPersonalAdapter.prototype, "restorePersistedSessions")
      .mockResolvedValue(undefined);
    const config = defaultRuntimeConfig();
    config.wechatPersonalEnabled = true;
    config.wechatPersonalSidecarSharedSecret = "wechat-sidecar-secret";

    const app = createGatewayApp(config);
    const response = await app.inject({
      method: "POST",
      url: "/api/wechat-sidecar/v1/events",
      payload: {
        sessionId: "session-1",
        accountLabel: "home-wechat",
        peerId: "peer-1",
        peerType: "USER",
        threadId: null,
        content: "hello",
        receivedAt: "2026-02-13T00:00:00.000Z",
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      code: "MISSING_SIGNATURE",
    });

    await app.close();
    restoreSpy.mockRestore();
  });

  it("accepts valid signed wechat sidecar ingress when wechat personal is enabled", async () => {
    const restoreSpy = vi
      .spyOn(WechatPersonalAdapter.prototype, "restorePersistedSessions")
      .mockResolvedValue(undefined);
    const config = defaultRuntimeConfig();
    config.wechatPersonalEnabled = true;
    config.wechatPersonalSidecarSharedSecret = "wechat-sidecar-secret";

    const app = createGatewayApp(config);
    const payload = {
      sessionId: "session-1",
      accountLabel: "home-wechat",
      peerId: "peer-1",
      peerType: "USER",
      threadId: null,
      messageId: "msg-1",
      content: "hello",
      receivedAt: "2026-02-13T00:00:00.000Z",
      metadata: {},
    };
    const rawBody = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = createWechatSidecarSignature(
      rawBody,
      timestamp,
      "wechat-sidecar-secret",
    );

    const response = await app.inject({
      method: "POST",
      url: "/api/wechat-sidecar/v1/events",
      payload,
      headers: {
        "x-autobyteus-sidecar-signature": signature,
        "x-autobyteus-sidecar-timestamp": timestamp,
      },
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({
      accepted: true,
    });

    await app.close();
    restoreSpy.mockRestore();
  });

  it("does not register wechat sidecar ingress route when wechat personal is disabled", async () => {
    const app = createGatewayApp(defaultRuntimeConfig());
    const response = await app.inject({
      method: "POST",
      url: "/api/wechat-sidecar/v1/events",
      payload: {
        sessionId: "session-1",
      },
    });

    expect(response.statusCode).toBe(404);
    await app.close();
  });
});

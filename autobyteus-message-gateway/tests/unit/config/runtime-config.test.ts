import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildRuntimeConfig,
  defaultRuntimeConfig,
} from "../../../src/config/runtime-config.js";

describe("runtime-config", () => {
  it("builds default runtime config", () => {
    expect(defaultRuntimeConfig()).toEqual({
      runtimeDataRoot: path.resolve(process.cwd(), "memory"),
      serverBaseUrl: "http://localhost:8000",
      serverSharedSecret: null,
      serverCallbackSharedSecret: null,
      allowInsecureServerCallbacks: false,
      adminToken: null,
      idempotencyTtlSeconds: 3600,
      callbackIdempotencyTtlSeconds: 3600,
      outboundMaxAttempts: 3,
      outboundBaseDelayMs: 100,
      whatsappBusinessSecret: null,
      wecomWebhookToken: null,
      wecomAppEnabled: true,
      wecomAppAccounts: [],
      wecomDefaultMode: "WECOM_APP_BRIDGE",
      discordEnabled: false,
      discordBotToken: null,
      discordAccountId: null,
      discordDiscoveryMaxCandidates: 200,
      discordDiscoveryTtlSeconds: 604800,
      telegramEnabled: false,
      telegramBotToken: null,
      telegramAccountId: null,
      telegramDiscoveryMaxCandidates: 200,
      telegramDiscoveryTtlSeconds: 604800,
      telegramPollingEnabled: true,
      telegramWebhookEnabled: false,
      telegramWebhookSecretToken: null,
      wechatPersonalEnabled: false,
      wechatPersonalQrTtlSeconds: 120,
      wechatPersonalPeerCandidateLimit: 200,
      wechatPersonalSidecarBaseUrl: "http://localhost:8788",
      wechatPersonalSidecarSharedSecret: null,
      wechatPersonalStateRoot: path.resolve(process.cwd(), "memory", "wechat-personal"),
      whatsappPersonalEnabled: false,
      whatsappPersonalQrTtlSeconds: 120,
      whatsappPersonalAuthRoot: path.resolve(process.cwd(), "memory", "whatsapp-personal"),
      whatsappPersonalPeerCandidateLimit: 200,
      whatsappPersonalReconnectMaxAttempts: 5,
      whatsappPersonalReconnectBaseDelayMs: 1000,
    });
  });

  it("overrides defaults from environment values", () => {
    const config = buildRuntimeConfig({
      GATEWAY_SERVER_BASE_URL: "https://server.example",
      GATEWAY_SERVER_SHARED_SECRET: "gateway-secret",
      GATEWAY_SERVER_CALLBACK_SHARED_SECRET: "callback-secret",
      GATEWAY_ALLOW_INSECURE_SERVER_CALLBACKS: "true",
      GATEWAY_ADMIN_TOKEN: "gateway-admin-token",
      GATEWAY_IDEMPOTENCY_TTL_SECONDS: "900",
      GATEWAY_CALLBACK_IDEMPOTENCY_TTL_SECONDS: "1800",
      GATEWAY_OUTBOUND_MAX_ATTEMPTS: "7",
      GATEWAY_OUTBOUND_BASE_DELAY_MS: "250",
      GATEWAY_WHATSAPP_BUSINESS_SECRET: "wa-secret",
      GATEWAY_WECOM_WEBHOOK_TOKEN: "wecom-token",
      GATEWAY_WECOM_APP_ENABLED: "false",
      GATEWAY_WECOM_APP_ACCOUNTS_JSON:
        '[{"accountId":"corp-main","label":"Corporate Main","mode":"APP"}]',
      GATEWAY_WECOM_APP_DEFAULT_MODE: "DIRECT_PERSONAL_SESSION",
      GATEWAY_DISCORD_ENABLED: "true",
      GATEWAY_DISCORD_BOT_TOKEN: "discord-bot-token",
      GATEWAY_DISCORD_ACCOUNT_ID: "discord-acct-1",
      GATEWAY_DISCORD_DISCOVERY_MAX_CANDIDATES: "120",
      GATEWAY_DISCORD_DISCOVERY_TTL_SECONDS: "86400",
      GATEWAY_TELEGRAM_ENABLED: "true",
      GATEWAY_TELEGRAM_BOT_TOKEN: "telegram-bot-token",
      GATEWAY_TELEGRAM_ACCOUNT_ID: "telegram-acct-1",
      GATEWAY_TELEGRAM_DISCOVERY_MAX_CANDIDATES: "25",
      GATEWAY_TELEGRAM_DISCOVERY_TTL_SECONDS: "43200",
      GATEWAY_TELEGRAM_POLLING_ENABLED: "false",
      GATEWAY_TELEGRAM_WEBHOOK_ENABLED: "true",
      GATEWAY_TELEGRAM_WEBHOOK_SECRET_TOKEN: "telegram-webhook-secret",
      GATEWAY_WECHAT_PERSONAL_ENABLED: "yes",
      GATEWAY_WECHAT_PERSONAL_QR_TTL_SECONDS: "80",
      GATEWAY_WECHAT_PERSONAL_PEER_CANDIDATE_LIMIT: "140",
      GATEWAY_WECHAT_PERSONAL_SIDECAR_BASE_URL: "http://localhost:9001",
      GATEWAY_WECHAT_PERSONAL_SIDECAR_SHARED_SECRET: "wechat-sidecar-secret",
      GATEWAY_WECHAT_PERSONAL_STATE_ROOT: "/tmp/wechat-state",
      GATEWAY_WHATSAPP_PERSONAL_ENABLED: "yes",
      GATEWAY_WHATSAPP_PERSONAL_QR_TTL_SECONDS: "75",
      GATEWAY_WHATSAPP_PERSONAL_AUTH_ROOT: "/tmp/wa-auth",
      GATEWAY_WHATSAPP_PERSONAL_PEER_CANDIDATE_LIMIT: "150",
      GATEWAY_WHATSAPP_PERSONAL_RECONNECT_MAX_ATTEMPTS: "9",
      GATEWAY_WHATSAPP_PERSONAL_RECONNECT_BASE_DELAY_MS: "1500",
    });

    expect(config).toEqual({
      runtimeDataRoot: path.resolve(process.cwd(), "memory"),
      serverBaseUrl: "https://server.example",
      serverSharedSecret: "gateway-secret",
      serverCallbackSharedSecret: "callback-secret",
      allowInsecureServerCallbacks: true,
      adminToken: "gateway-admin-token",
      idempotencyTtlSeconds: 900,
      callbackIdempotencyTtlSeconds: 1800,
      outboundMaxAttempts: 7,
      outboundBaseDelayMs: 250,
      whatsappBusinessSecret: "wa-secret",
      wecomWebhookToken: "wecom-token",
      wecomAppEnabled: false,
      wecomAppAccounts: [
        {
          accountId: "corp-main",
          label: "Corporate Main",
          mode: "APP",
        },
      ],
      wecomDefaultMode: "DIRECT_PERSONAL_SESSION",
      discordEnabled: true,
      discordBotToken: "discord-bot-token",
      discordAccountId: "discord-acct-1",
      discordDiscoveryMaxCandidates: 120,
      discordDiscoveryTtlSeconds: 86400,
      telegramEnabled: true,
      telegramBotToken: "telegram-bot-token",
      telegramAccountId: "telegram-acct-1",
      telegramDiscoveryMaxCandidates: 25,
      telegramDiscoveryTtlSeconds: 43200,
      telegramPollingEnabled: false,
      telegramWebhookEnabled: true,
      telegramWebhookSecretToken: "telegram-webhook-secret",
      wechatPersonalEnabled: true,
      wechatPersonalQrTtlSeconds: 80,
      wechatPersonalPeerCandidateLimit: 140,
      wechatPersonalSidecarBaseUrl: "http://localhost:9001",
      wechatPersonalSidecarSharedSecret: "wechat-sidecar-secret",
      wechatPersonalStateRoot: "/tmp/wechat-state",
      whatsappPersonalEnabled: true,
      whatsappPersonalQrTtlSeconds: 75,
      whatsappPersonalAuthRoot: "/tmp/wa-auth",
      whatsappPersonalPeerCandidateLimit: 150,
      whatsappPersonalReconnectMaxAttempts: 9,
      whatsappPersonalReconnectBaseDelayMs: 1500,
    });
  });

  it("falls back callback secret to GATEWAY_SERVER_SHARED_SECRET", () => {
    const config = buildRuntimeConfig({
      GATEWAY_SERVER_SHARED_SECRET: "gateway-secret",
    });

    expect(config.serverSharedSecret).toBe("gateway-secret");
    expect(config.serverCallbackSharedSecret).toBe("gateway-secret");
  });

  it("rejects invalid numeric config values", () => {
    expect(() =>
      buildRuntimeConfig({
        GATEWAY_OUTBOUND_MAX_ATTEMPTS: "0",
      }),
    ).toThrowError("GATEWAY_OUTBOUND_MAX_ATTEMPTS must be a positive integer.");

    expect(() =>
      buildRuntimeConfig({
        GATEWAY_OUTBOUND_BASE_DELAY_MS: "-1",
      }),
    ).toThrowError("GATEWAY_OUTBOUND_BASE_DELAY_MS must be a non-negative integer.");

    expect(() =>
      buildRuntimeConfig({
        GATEWAY_WHATSAPP_PERSONAL_RECONNECT_MAX_ATTEMPTS: "0",
      }),
    ).toThrowError(
      "GATEWAY_WHATSAPP_PERSONAL_RECONNECT_MAX_ATTEMPTS must be a positive integer.",
    );

    expect(() =>
      buildRuntimeConfig({
        GATEWAY_WHATSAPP_PERSONAL_PEER_CANDIDATE_LIMIT: "0",
      }),
    ).toThrowError(
      "GATEWAY_WHATSAPP_PERSONAL_PEER_CANDIDATE_LIMIT must be a positive integer.",
    );

    expect(() =>
      buildRuntimeConfig({
        GATEWAY_WECHAT_PERSONAL_PEER_CANDIDATE_LIMIT: "0",
      }),
    ).toThrowError(
      "GATEWAY_WECHAT_PERSONAL_PEER_CANDIDATE_LIMIT must be a positive integer.",
    );

    expect(() =>
      buildRuntimeConfig({
        GATEWAY_TELEGRAM_DISCOVERY_MAX_CANDIDATES: "0",
      }),
    ).toThrowError(
      "GATEWAY_TELEGRAM_DISCOVERY_MAX_CANDIDATES must be a positive integer.",
    );

    expect(() =>
      buildRuntimeConfig({
        GATEWAY_TELEGRAM_DISCOVERY_TTL_SECONDS: "0",
      }),
    ).toThrowError(
      "GATEWAY_TELEGRAM_DISCOVERY_TTL_SECONDS must be a positive integer.",
    );
  });

  it("rejects invalid boolean config values", () => {
    expect(() =>
      buildRuntimeConfig({
        GATEWAY_WHATSAPP_PERSONAL_ENABLED: "enabled",
      }),
    ).toThrowError("GATEWAY_WHATSAPP_PERSONAL_ENABLED must be a boolean value.");

    expect(() =>
      buildRuntimeConfig({
        GATEWAY_WECOM_APP_ENABLED: "enabled",
      }),
    ).toThrowError("GATEWAY_WECOM_APP_ENABLED must be a boolean value.");

    expect(() =>
      buildRuntimeConfig({
        GATEWAY_DISCORD_ENABLED: "enabled",
      }),
    ).toThrowError("GATEWAY_DISCORD_ENABLED must be a boolean value.");
  });

  it("requires discord token/account when discord is enabled", () => {
    expect(() =>
      buildRuntimeConfig({
        GATEWAY_DISCORD_ENABLED: "true",
      }),
    ).toThrowError("GATEWAY_DISCORD_BOT_TOKEN is required when GATEWAY_DISCORD_ENABLED=true.");

    expect(() =>
      buildRuntimeConfig({
        GATEWAY_DISCORD_ENABLED: "true",
        GATEWAY_DISCORD_BOT_TOKEN: "discord-bot-token",
      }),
    ).toThrowError("GATEWAY_DISCORD_ACCOUNT_ID is required when GATEWAY_DISCORD_ENABLED=true.");
  });

  it("requires telegram token/account and mode consistency when telegram is enabled", () => {
    expect(() =>
      buildRuntimeConfig({
        GATEWAY_TELEGRAM_ENABLED: "true",
      }),
    ).toThrowError("GATEWAY_TELEGRAM_BOT_TOKEN is required when GATEWAY_TELEGRAM_ENABLED=true.");

    expect(() =>
      buildRuntimeConfig({
        GATEWAY_TELEGRAM_ENABLED: "true",
        GATEWAY_TELEGRAM_BOT_TOKEN: "telegram-bot-token",
      }),
    ).toThrowError("GATEWAY_TELEGRAM_ACCOUNT_ID is required when GATEWAY_TELEGRAM_ENABLED=true.");

    expect(() =>
      buildRuntimeConfig({
        GATEWAY_TELEGRAM_ENABLED: "true",
        GATEWAY_TELEGRAM_BOT_TOKEN: "telegram-bot-token",
        GATEWAY_TELEGRAM_ACCOUNT_ID: "telegram-acct-1",
        GATEWAY_TELEGRAM_POLLING_ENABLED: "true",
        GATEWAY_TELEGRAM_WEBHOOK_ENABLED: "true",
      }),
    ).toThrowError(
      "GATEWAY_TELEGRAM_POLLING_ENABLED and GATEWAY_TELEGRAM_WEBHOOK_ENABLED cannot both be true.",
    );

    expect(() =>
      buildRuntimeConfig({
        GATEWAY_TELEGRAM_ENABLED: "true",
        GATEWAY_TELEGRAM_BOT_TOKEN: "telegram-bot-token",
        GATEWAY_TELEGRAM_ACCOUNT_ID: "telegram-acct-1",
        GATEWAY_TELEGRAM_POLLING_ENABLED: "false",
        GATEWAY_TELEGRAM_WEBHOOK_ENABLED: "false",
      }),
    ).toThrowError(
      "One of GATEWAY_TELEGRAM_POLLING_ENABLED or GATEWAY_TELEGRAM_WEBHOOK_ENABLED must be true when GATEWAY_TELEGRAM_ENABLED=true.",
    );

    expect(() =>
      buildRuntimeConfig({
        GATEWAY_TELEGRAM_ENABLED: "true",
        GATEWAY_TELEGRAM_BOT_TOKEN: "telegram-bot-token",
        GATEWAY_TELEGRAM_ACCOUNT_ID: "telegram-acct-1",
        GATEWAY_TELEGRAM_POLLING_ENABLED: "false",
        GATEWAY_TELEGRAM_WEBHOOK_ENABLED: "true",
      }),
    ).toThrowError(
      "GATEWAY_TELEGRAM_WEBHOOK_SECRET_TOKEN is required when GATEWAY_TELEGRAM_WEBHOOK_ENABLED=true.",
    );
  });

  it("requires wechat sidecar shared secret when wechat personal mode is enabled", () => {
    expect(() =>
      buildRuntimeConfig({
        GATEWAY_WECHAT_PERSONAL_ENABLED: "true",
      }),
    ).toThrowError(
      "GATEWAY_WECHAT_PERSONAL_SIDECAR_SHARED_SECRET is required when GATEWAY_WECHAT_PERSONAL_ENABLED=true.",
    );
  });

  it("rejects invalid wecom account config values", () => {
    expect(() =>
      buildRuntimeConfig({
        GATEWAY_WECOM_APP_ACCOUNTS_JSON: "{invalid",
      }),
    ).toThrowError("GATEWAY_WECOM_APP_ACCOUNTS_JSON must be valid JSON.");

    expect(() =>
      buildRuntimeConfig({
        GATEWAY_WECOM_APP_ACCOUNTS_JSON: '{"accountId":"corp-main"}',
      }),
    ).toThrowError("GATEWAY_WECOM_APP_ACCOUNTS_JSON must be a JSON array.");

    expect(() =>
      buildRuntimeConfig({
        GATEWAY_WECOM_APP_ACCOUNTS_JSON:
          '[{"accountId":"corp-main","mode":"invalid-mode"}]',
      }),
    ).toThrowError("WeCom account mode must be APP or LEGACY.");
  });
});

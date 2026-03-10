import { appConfigProvider } from "../../config/app-config-provider.js";
import { getInternalServerBaseUrlOrThrow } from "../../config/server-runtime-endpoints.js";
import type {
  ManagedMessagingProviderConfig,
  ManagedMessagingProviderStatus,
} from "./types.js";

export const buildManagedMessagingProviderStatuses = (
  providerConfig: ManagedMessagingProviderConfig,
): ManagedMessagingProviderStatus[] => [
  {
    provider: "WHATSAPP",
    supported: true,
    selectedTransport: "BUSINESS_API",
    configured: Boolean(providerConfig.whatsappBusinessSecret),
    effectivelyEnabled: Boolean(providerConfig.whatsappBusinessSecret),
    blockedReason: null,
    accountId: null,
  },
  {
    provider: "WECOM",
    supported: true,
    selectedTransport: "BUSINESS_API",
    configured:
      Boolean(providerConfig.wecomWebhookToken) &&
      providerConfig.wecomAppAccounts.length > 0,
    effectivelyEnabled:
      Boolean(providerConfig.wecomWebhookToken) &&
      providerConfig.wecomAppAccounts.length > 0,
    blockedReason:
      (Boolean(providerConfig.wecomWebhookToken) ||
        providerConfig.wecomAppAccounts.length > 0) &&
      (!providerConfig.wecomWebhookToken ||
        providerConfig.wecomAppAccounts.length === 0)
        ? "WeCom webhook token and at least one app account are required."
        : null,
    accountId: providerConfig.wecomAppAccounts[0]?.accountId ?? null,
  },
  {
    provider: "DISCORD",
    supported: true,
    selectedTransport: "BUSINESS_API",
    configured:
      Boolean(providerConfig.discordBotToken) &&
      Boolean(providerConfig.discordAccountId),
    effectivelyEnabled:
      Boolean(providerConfig.discordBotToken) &&
      Boolean(providerConfig.discordAccountId),
    blockedReason:
      (Boolean(providerConfig.discordBotToken) ||
        Boolean(providerConfig.discordAccountId)) &&
      (!providerConfig.discordBotToken || !providerConfig.discordAccountId)
        ? "Discord bot token and account id are required."
        : null,
    accountId: providerConfig.discordAccountId,
  },
  {
    provider: "TELEGRAM",
    supported: true,
    selectedTransport: "BUSINESS_API",
    configured:
      Boolean(providerConfig.telegramBotToken) &&
      Boolean(providerConfig.telegramAccountId),
    effectivelyEnabled:
      Boolean(providerConfig.telegramBotToken) &&
      Boolean(providerConfig.telegramAccountId),
    blockedReason:
      (Boolean(providerConfig.telegramBotToken) ||
        Boolean(providerConfig.telegramAccountId)) &&
      (!providerConfig.telegramBotToken || !providerConfig.telegramAccountId)
        ? "Telegram bot token and account id are required."
        : null,
    accountId: providerConfig.telegramAccountId,
  },
];

export const buildManagedMessagingGatewayRuntimeEnv = (input: {
  providerConfig: ManagedMessagingProviderConfig;
  bindHost: string;
  bindPort: number;
  adminToken: string;
  runtimeDataRoot: string;
}): NodeJS.ProcessEnv => {
  const serverSharedSecret = normalizeOptionalSecret(
    appConfigProvider.config.get("CHANNEL_GATEWAY_SHARED_SECRET"),
  );
  const serverCallbackSharedSecret =
    appConfigProvider.config.getChannelCallbackSharedSecret() ?? "";
  const providerStatuses = buildManagedMessagingProviderStatuses(
    input.providerConfig,
  );
  const statusByProvider = new Map(
    providerStatuses.map((status) => [status.provider, status]),
  );
  const discordStatus = statusByProvider.get("DISCORD");
  const telegramStatus = statusByProvider.get("TELEGRAM");
  const wecomStatus = statusByProvider.get("WECOM");
  const whatsappStatus = statusByProvider.get("WHATSAPP");

  return {
    GATEWAY_HOST: input.bindHost,
    GATEWAY_PORT: String(input.bindPort),
    GATEWAY_RUNTIME_DATA_ROOT: input.runtimeDataRoot,
    GATEWAY_ADMIN_TOKEN: input.adminToken,
    GATEWAY_SERVER_BASE_URL: getInternalServerBaseUrlOrThrow(),
    GATEWAY_SERVER_SHARED_SECRET: serverSharedSecret,
    GATEWAY_SERVER_CALLBACK_SHARED_SECRET: serverCallbackSharedSecret,
    GATEWAY_ALLOW_INSECURE_SERVER_CALLBACKS: String(
      serverCallbackSharedSecret.length === 0,
    ),
    GATEWAY_WHATSAPP_BUSINESS_SECRET:
      input.providerConfig.whatsappBusinessSecret ?? "",
    GATEWAY_WHATSAPP_PERSONAL_ENABLED: "false",
    GATEWAY_WECHAT_PERSONAL_ENABLED: "false",
    GATEWAY_WECOM_WEBHOOK_TOKEN: input.providerConfig.wecomWebhookToken ?? "",
    GATEWAY_WECOM_APP_ENABLED: String(wecomStatus?.effectivelyEnabled === true),
    GATEWAY_WECOM_APP_ACCOUNTS_JSON: JSON.stringify(
      input.providerConfig.wecomAppAccounts,
    ),
    GATEWAY_WECOM_APP_DEFAULT_MODE: "WECOM_APP_BRIDGE",
    GATEWAY_DISCORD_ENABLED: String(discordStatus?.effectivelyEnabled === true),
    GATEWAY_DISCORD_BOT_TOKEN: input.providerConfig.discordBotToken ?? "",
    GATEWAY_DISCORD_ACCOUNT_ID: input.providerConfig.discordAccountId ?? "",
    GATEWAY_DISCORD_DISCOVERY_MAX_CANDIDATES: String(
      input.providerConfig.discordDiscoveryMaxCandidates,
    ),
    GATEWAY_DISCORD_DISCOVERY_TTL_SECONDS: String(
      input.providerConfig.discordDiscoveryTtlSeconds,
    ),
    GATEWAY_TELEGRAM_ENABLED: String(
      telegramStatus?.effectivelyEnabled === true,
    ),
    GATEWAY_TELEGRAM_BOT_TOKEN: input.providerConfig.telegramBotToken ?? "",
    GATEWAY_TELEGRAM_ACCOUNT_ID: input.providerConfig.telegramAccountId ?? "",
    GATEWAY_TELEGRAM_POLLING_ENABLED: "true",
    GATEWAY_TELEGRAM_WEBHOOK_ENABLED: "false",
    GATEWAY_TELEGRAM_WEBHOOK_SECRET_TOKEN: "",
    GATEWAY_OUTBOUND_MAX_ATTEMPTS: "3",
    GATEWAY_OUTBOUND_BASE_DELAY_MS: "100",
    GATEWAY_IDEMPOTENCY_TTL_SECONDS: "3600",
    GATEWAY_CALLBACK_IDEMPOTENCY_TTL_SECONDS: "3600",
    GATEWAY_WHATSAPP_BUSINESS_ENABLED: String(
      whatsappStatus?.effectivelyEnabled === true,
    ),
  };
};

const normalizeOptionalSecret = (
  value: string | null | undefined,
): string => {
  if (typeof value !== "string") {
    return "";
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : "";
};

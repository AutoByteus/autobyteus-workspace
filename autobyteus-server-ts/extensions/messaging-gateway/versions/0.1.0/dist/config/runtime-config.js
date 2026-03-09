import path from "node:path";
export function defaultRuntimeConfig() {
    return buildRuntimeConfig({});
}
export function buildRuntimeConfig(env) {
    const serverSharedSecret = env.GATEWAY_SERVER_SHARED_SECRET ?? null;
    const serverCallbackSharedSecret = env.GATEWAY_SERVER_CALLBACK_SHARED_SECRET ??
        env.GATEWAY_SERVER_SHARED_SECRET ??
        null;
    const config = {
        runtimeDataRoot: env.GATEWAY_RUNTIME_DATA_ROOT ??
            path.resolve(process.cwd(), "memory"),
        serverBaseUrl: env.GATEWAY_SERVER_BASE_URL ?? "http://localhost:8000",
        serverSharedSecret,
        serverCallbackSharedSecret,
        allowInsecureServerCallbacks: parseBoolean(env.GATEWAY_ALLOW_INSECURE_SERVER_CALLBACKS, false, "GATEWAY_ALLOW_INSECURE_SERVER_CALLBACKS"),
        adminToken: env.GATEWAY_ADMIN_TOKEN ?? null,
        idempotencyTtlSeconds: parsePositiveInteger(env.GATEWAY_IDEMPOTENCY_TTL_SECONDS, 3600, "GATEWAY_IDEMPOTENCY_TTL_SECONDS"),
        callbackIdempotencyTtlSeconds: parsePositiveInteger(env.GATEWAY_CALLBACK_IDEMPOTENCY_TTL_SECONDS, 3600, "GATEWAY_CALLBACK_IDEMPOTENCY_TTL_SECONDS"),
        outboundMaxAttempts: parsePositiveInteger(env.GATEWAY_OUTBOUND_MAX_ATTEMPTS, 3, "GATEWAY_OUTBOUND_MAX_ATTEMPTS"),
        outboundBaseDelayMs: parseNonNegativeInteger(env.GATEWAY_OUTBOUND_BASE_DELAY_MS, 100, "GATEWAY_OUTBOUND_BASE_DELAY_MS"),
        whatsappBusinessSecret: env.GATEWAY_WHATSAPP_BUSINESS_SECRET ?? null,
        wecomWebhookToken: env.GATEWAY_WECOM_WEBHOOK_TOKEN ?? null,
        wecomAppEnabled: parseBoolean(env.GATEWAY_WECOM_APP_ENABLED, true, "GATEWAY_WECOM_APP_ENABLED"),
        wecomAppAccounts: parseWeComAccounts(env.GATEWAY_WECOM_APP_ACCOUNTS_JSON),
        wecomDefaultMode: parseWeComDefaultMode(env.GATEWAY_WECOM_APP_DEFAULT_MODE),
        discordEnabled: parseBoolean(env.GATEWAY_DISCORD_ENABLED, false, "GATEWAY_DISCORD_ENABLED"),
        discordBotToken: env.GATEWAY_DISCORD_BOT_TOKEN ?? null,
        discordAccountId: env.GATEWAY_DISCORD_ACCOUNT_ID ?? null,
        discordDiscoveryMaxCandidates: parsePositiveInteger(env.GATEWAY_DISCORD_DISCOVERY_MAX_CANDIDATES, 200, "GATEWAY_DISCORD_DISCOVERY_MAX_CANDIDATES"),
        discordDiscoveryTtlSeconds: parsePositiveInteger(env.GATEWAY_DISCORD_DISCOVERY_TTL_SECONDS, 7 * 24 * 60 * 60, "GATEWAY_DISCORD_DISCOVERY_TTL_SECONDS"),
        telegramEnabled: parseBoolean(env.GATEWAY_TELEGRAM_ENABLED, false, "GATEWAY_TELEGRAM_ENABLED"),
        telegramBotToken: env.GATEWAY_TELEGRAM_BOT_TOKEN ?? null,
        telegramAccountId: env.GATEWAY_TELEGRAM_ACCOUNT_ID ?? null,
        telegramPollingEnabled: parseBoolean(env.GATEWAY_TELEGRAM_POLLING_ENABLED, true, "GATEWAY_TELEGRAM_POLLING_ENABLED"),
        telegramWebhookEnabled: parseBoolean(env.GATEWAY_TELEGRAM_WEBHOOK_ENABLED, false, "GATEWAY_TELEGRAM_WEBHOOK_ENABLED"),
        telegramWebhookSecretToken: env.GATEWAY_TELEGRAM_WEBHOOK_SECRET_TOKEN ?? null,
        wechatPersonalEnabled: parseBoolean(env.GATEWAY_WECHAT_PERSONAL_ENABLED, false, "GATEWAY_WECHAT_PERSONAL_ENABLED"),
        wechatPersonalQrTtlSeconds: parsePositiveInteger(env.GATEWAY_WECHAT_PERSONAL_QR_TTL_SECONDS, 120, "GATEWAY_WECHAT_PERSONAL_QR_TTL_SECONDS"),
        wechatPersonalPeerCandidateLimit: parsePositiveInteger(env.GATEWAY_WECHAT_PERSONAL_PEER_CANDIDATE_LIMIT, 200, "GATEWAY_WECHAT_PERSONAL_PEER_CANDIDATE_LIMIT"),
        wechatPersonalSidecarBaseUrl: env.GATEWAY_WECHAT_PERSONAL_SIDECAR_BASE_URL ?? "http://localhost:8788",
        wechatPersonalSidecarSharedSecret: env.GATEWAY_WECHAT_PERSONAL_SIDECAR_SHARED_SECRET ?? null,
        wechatPersonalStateRoot: env.GATEWAY_WECHAT_PERSONAL_STATE_ROOT ??
            path.resolve(env.GATEWAY_RUNTIME_DATA_ROOT ?? path.resolve(process.cwd(), "memory"), "wechat-personal"),
        whatsappPersonalEnabled: parseBoolean(env.GATEWAY_WHATSAPP_PERSONAL_ENABLED, false, "GATEWAY_WHATSAPP_PERSONAL_ENABLED"),
        whatsappPersonalQrTtlSeconds: parsePositiveInteger(env.GATEWAY_WHATSAPP_PERSONAL_QR_TTL_SECONDS, 120, "GATEWAY_WHATSAPP_PERSONAL_QR_TTL_SECONDS"),
        whatsappPersonalAuthRoot: env.GATEWAY_WHATSAPP_PERSONAL_AUTH_ROOT ??
            path.resolve(env.GATEWAY_RUNTIME_DATA_ROOT ?? path.resolve(process.cwd(), "memory"), "whatsapp-personal"),
        whatsappPersonalPeerCandidateLimit: parsePositiveInteger(env.GATEWAY_WHATSAPP_PERSONAL_PEER_CANDIDATE_LIMIT, 200, "GATEWAY_WHATSAPP_PERSONAL_PEER_CANDIDATE_LIMIT"),
        whatsappPersonalReconnectMaxAttempts: parsePositiveInteger(env.GATEWAY_WHATSAPP_PERSONAL_RECONNECT_MAX_ATTEMPTS, 5, "GATEWAY_WHATSAPP_PERSONAL_RECONNECT_MAX_ATTEMPTS"),
        whatsappPersonalReconnectBaseDelayMs: parseNonNegativeInteger(env.GATEWAY_WHATSAPP_PERSONAL_RECONNECT_BASE_DELAY_MS, 1000, "GATEWAY_WHATSAPP_PERSONAL_RECONNECT_BASE_DELAY_MS"),
    };
    assertDiscordConfigConsistency(config);
    assertTelegramConfigConsistency(config);
    assertWechatPersonalConfigConsistency(config);
    return config;
}
const parsePositiveInteger = (raw, fallback, key) => {
    if (raw === undefined) {
        return fallback;
    }
    const value = Number(raw);
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`${key} must be a positive integer.`);
    }
    return value;
};
const parseNonNegativeInteger = (raw, fallback, key) => {
    if (raw === undefined) {
        return fallback;
    }
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0) {
        throw new Error(`${key} must be a non-negative integer.`);
    }
    return value;
};
const parseBoolean = (raw, fallback, key) => {
    if (raw === undefined) {
        return fallback;
    }
    const normalized = raw.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") {
        return true;
    }
    if (normalized === "false" || normalized === "0" || normalized === "no") {
        return false;
    }
    throw new Error(`${key} must be a boolean value.`);
};
const assertDiscordConfigConsistency = (config) => {
    if (!config.discordEnabled) {
        return;
    }
    if (!config.discordBotToken) {
        throw new Error("GATEWAY_DISCORD_BOT_TOKEN is required when GATEWAY_DISCORD_ENABLED=true.");
    }
    if (!config.discordAccountId) {
        throw new Error("GATEWAY_DISCORD_ACCOUNT_ID is required when GATEWAY_DISCORD_ENABLED=true.");
    }
};
const assertTelegramConfigConsistency = (config) => {
    if (!config.telegramEnabled) {
        return;
    }
    if (!config.telegramBotToken) {
        throw new Error("GATEWAY_TELEGRAM_BOT_TOKEN is required when GATEWAY_TELEGRAM_ENABLED=true.");
    }
    if (!config.telegramAccountId) {
        throw new Error("GATEWAY_TELEGRAM_ACCOUNT_ID is required when GATEWAY_TELEGRAM_ENABLED=true.");
    }
    if (config.telegramPollingEnabled && config.telegramWebhookEnabled) {
        throw new Error("GATEWAY_TELEGRAM_POLLING_ENABLED and GATEWAY_TELEGRAM_WEBHOOK_ENABLED cannot both be true.");
    }
    if (!config.telegramPollingEnabled && !config.telegramWebhookEnabled) {
        throw new Error("One of GATEWAY_TELEGRAM_POLLING_ENABLED or GATEWAY_TELEGRAM_WEBHOOK_ENABLED must be true when GATEWAY_TELEGRAM_ENABLED=true.");
    }
    if (config.telegramWebhookEnabled && !config.telegramWebhookSecretToken) {
        throw new Error("GATEWAY_TELEGRAM_WEBHOOK_SECRET_TOKEN is required when GATEWAY_TELEGRAM_WEBHOOK_ENABLED=true.");
    }
};
const assertWechatPersonalConfigConsistency = (config) => {
    if (!config.wechatPersonalEnabled) {
        return;
    }
    if (!config.wechatPersonalSidecarSharedSecret) {
        throw new Error("GATEWAY_WECHAT_PERSONAL_SIDECAR_SHARED_SECRET is required when GATEWAY_WECHAT_PERSONAL_ENABLED=true.");
    }
};
const parseWeComAccounts = (raw) => {
    if (raw === undefined) {
        return [];
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        throw new Error("GATEWAY_WECOM_APP_ACCOUNTS_JSON must be valid JSON.");
    }
    if (!Array.isArray(parsed)) {
        throw new Error("GATEWAY_WECOM_APP_ACCOUNTS_JSON must be a JSON array.");
    }
    return parsed.map((entry, index) => normalizeWeComAccountRecord(entry, index));
};
const normalizeWeComAccountRecord = (entry, index) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
        throw new Error(`GATEWAY_WECOM_APP_ACCOUNTS_JSON[${index}] must be an object.`);
    }
    const record = entry;
    const accountId = normalizeRequiredString(record.accountId, `accountId(${index})`);
    const label = normalizeOptionalString(record.label) ?? accountId;
    const mode = parseWeComAccountMode(record.mode);
    return { accountId, label, mode };
};
const parseWeComDefaultMode = (raw) => {
    if (raw === undefined) {
        return "WECOM_APP_BRIDGE";
    }
    const normalized = raw.trim().toUpperCase();
    if (normalized === "WECOM_APP_BRIDGE" || normalized === "DIRECT_PERSONAL_SESSION") {
        return normalized;
    }
    throw new Error("GATEWAY_WECOM_APP_DEFAULT_MODE must be WECOM_APP_BRIDGE or DIRECT_PERSONAL_SESSION.");
};
const parseWeComAccountMode = (raw) => {
    if (raw === undefined || raw === null) {
        return "APP";
    }
    if (typeof raw !== "string") {
        throw new Error("WeCom account mode must be a string when provided.");
    }
    const normalized = raw.trim().toUpperCase();
    if (normalized === "APP" || normalized === "LEGACY") {
        return normalized;
    }
    throw new Error("WeCom account mode must be APP or LEGACY.");
};
const normalizeRequiredString = (value, key) => {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`${key} must be a non-empty string.`);
    }
    return value.trim();
};
const normalizeOptionalString = (value) => {
    if (typeof value !== "string") {
        return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
};
//# sourceMappingURL=runtime-config.js.map
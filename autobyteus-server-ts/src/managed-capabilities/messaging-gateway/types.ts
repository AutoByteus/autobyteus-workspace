import { randomUUID } from "node:crypto";

export const MANAGED_MESSAGING_SUPPORTED_PROVIDERS = [
  "WHATSAPP",
  "WECOM",
  "DISCORD",
  "TELEGRAM",
] as const;

export const MANAGED_MESSAGING_EXCLUDED_PROVIDERS = ["WECHAT"] as const;

export type ManagedMessagingProvider =
  (typeof MANAGED_MESSAGING_SUPPORTED_PROVIDERS)[number];

export type ManagedMessagingLifecycleState =
  | "DISABLED"
  | "IDLE"
  | "RESOLVING_COMPATIBILITY"
  | "DOWNLOADING"
  | "INSTALLING"
  | "STARTING"
  | "RUNNING"
  | "DEGRADED"
  | "UPDATING"
  | "STOPPING"
  | "BLOCKED"
  | "ERROR";

export type ManagedMessagingReleaseManifest = {
  schemaVersion: number;
  releases: ManagedMessagingReleaseDescriptor[];
};

export type ManagedMessagingReleaseDescriptor = {
  serverVersion: string;
  releaseTag: string;
  artifactVersion: string;
  platformKey: string;
  archiveType: "tar.gz";
  downloadUrl: string;
  sha256Url: string;
  metadataUrl?: string | null;
  supportedProviders: string[];
  excludedProviders?: string[];
};

export type ManagedMessagingWeComAccount = {
  accountId: string;
  label: string;
  mode: "APP" | "LEGACY";
};

export type ManagedMessagingProviderConfig = {
  whatsappBusinessEnabled: boolean;
  whatsappBusinessSecret: string | null;
  wecomAppEnabled: boolean;
  wecomWebhookToken: string | null;
  wecomAppAccounts: ManagedMessagingWeComAccount[];
  discordEnabled: boolean;
  discordBotToken: string | null;
  discordAccountId: string | null;
  discordDiscoveryMaxCandidates: number;
  discordDiscoveryTtlSeconds: number;
  telegramEnabled: boolean;
  telegramBotToken: string | null;
  telegramAccountId: string | null;
  telegramPollingEnabled: boolean;
  telegramWebhookEnabled: boolean;
  telegramWebhookSecretToken: string | null;
};

export type ManagedMessagingPersistedState = {
  desiredEnabled: boolean;
  lifecycleState: ManagedMessagingLifecycleState;
  message: string | null;
  lastError: string | null;
  activeVersion: string | null;
  desiredVersion: string | null;
  releaseTag: string | null;
  bindHost: string | null;
  bindPort: number | null;
  pid: number | null;
  preferredBindPort: number | null;
  adminToken: string;
  lastUpdatedAt: string;
};

export type ManagedMessagingRuntimeSnapshot = {
  running: boolean;
  bindHost: string | null;
  bindPort: number | null;
  pid: number | null;
  startedAt: string | null;
};

export type ManagedMessagingProviderStatus = {
  provider: ManagedMessagingProvider;
  supported: boolean;
  selectedTransport: "BUSINESS_API";
  configured: boolean;
  effectivelyEnabled: boolean;
  blockedReason: string | null;
  accountId: string | null;
};

export type ManagedMessagingStatus = {
  supported: boolean;
  enabled: boolean;
  lifecycleState: ManagedMessagingLifecycleState;
  message: string | null;
  lastError: string | null;
  activeVersion: string | null;
  desiredVersion: string | null;
  releaseTag: string | null;
  installedVersions: string[];
  bindHost: string | null;
  bindPort: number | null;
  pid: number | null;
  providerConfig: ManagedMessagingProviderConfig;
  providerStatuses: ManagedMessagingProviderStatus[];
  supportedProviders: string[];
  excludedProviders: string[];
  diagnostics: Record<string, unknown>;
  runtimeReliabilityStatus: Record<string, unknown> | null;
  runtimeRunning: boolean;
};

export type ManagedMessagingRuntimeLaunchConfig = {
  installDir: string;
  version: string;
  bindHost: string;
  bindPort: number;
  env: NodeJS.ProcessEnv;
  stdoutLogPath: string;
  stderrLogPath: string;
};

export const createDefaultManagedMessagingProviderConfig =
  (): ManagedMessagingProviderConfig => ({
    whatsappBusinessEnabled: false,
    whatsappBusinessSecret: null,
    wecomAppEnabled: false,
    wecomWebhookToken: null,
    wecomAppAccounts: [],
    discordEnabled: false,
    discordBotToken: null,
    discordAccountId: null,
    discordDiscoveryMaxCandidates: 200,
    discordDiscoveryTtlSeconds: 7 * 24 * 60 * 60,
    telegramEnabled: false,
    telegramBotToken: null,
    telegramAccountId: null,
    telegramPollingEnabled: true,
    telegramWebhookEnabled: false,
    telegramWebhookSecretToken: null,
  });

export const createDefaultManagedMessagingPersistedState =
  (): ManagedMessagingPersistedState => ({
    desiredEnabled: false,
    lifecycleState: "DISABLED",
    message: "Managed messaging is disabled.",
    lastError: null,
    activeVersion: null,
    desiredVersion: null,
    releaseTag: null,
    bindHost: null,
    bindPort: null,
    pid: null,
    preferredBindPort: null,
    adminToken: randomUUID(),
    lastUpdatedAt: new Date().toISOString(),
  });

export const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const normalizeBoolean = (
  value: unknown,
  fallback = false,
): boolean => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no"].includes(normalized)) {
      return false;
    }
  }
  return fallback;
};

export const normalizePositiveInteger = (
  value: unknown,
  fallback: number,
): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

export const normalizeManagedMessagingProviderConfig = (
  value: unknown,
): ManagedMessagingProviderConfig => {
  const input =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  const base = createDefaultManagedMessagingProviderConfig();

  const rawWeComAccounts = Array.isArray(input.wecomAppAccounts)
    ? input.wecomAppAccounts
    : [];
  const wecomAppAccounts: ManagedMessagingWeComAccount[] = rawWeComAccounts
    .map((entry) => {
      if (typeof entry !== "object" || entry === null) {
        return null;
      }
      const record = entry as Record<string, unknown>;
      const accountId = normalizeOptionalString(record.accountId);
      const label = normalizeOptionalString(record.label);
      const rawMode = normalizeOptionalString(record.mode)?.toUpperCase();
      if (!accountId || !label) {
        return null;
      }
      const mode = rawMode === "LEGACY" ? "LEGACY" : "APP";
      return { accountId, label, mode } satisfies ManagedMessagingWeComAccount;
    })
    .filter((entry): entry is ManagedMessagingWeComAccount => entry !== null);

  return {
    whatsappBusinessEnabled: normalizeBoolean(
      input.whatsappBusinessEnabled,
      base.whatsappBusinessEnabled,
    ),
    whatsappBusinessSecret:
      normalizeOptionalString(input.whatsappBusinessSecret) ??
      base.whatsappBusinessSecret,
    wecomAppEnabled: normalizeBoolean(input.wecomAppEnabled, base.wecomAppEnabled),
    wecomWebhookToken:
      normalizeOptionalString(input.wecomWebhookToken) ?? base.wecomWebhookToken,
    wecomAppAccounts,
    discordEnabled: normalizeBoolean(input.discordEnabled, base.discordEnabled),
    discordBotToken:
      normalizeOptionalString(input.discordBotToken) ?? base.discordBotToken,
    discordAccountId:
      normalizeOptionalString(input.discordAccountId) ?? base.discordAccountId,
    discordDiscoveryMaxCandidates: normalizePositiveInteger(
      input.discordDiscoveryMaxCandidates,
      base.discordDiscoveryMaxCandidates,
    ),
    discordDiscoveryTtlSeconds: normalizePositiveInteger(
      input.discordDiscoveryTtlSeconds,
      base.discordDiscoveryTtlSeconds,
    ),
    telegramEnabled: normalizeBoolean(input.telegramEnabled, base.telegramEnabled),
    telegramBotToken:
      normalizeOptionalString(input.telegramBotToken) ?? base.telegramBotToken,
    telegramAccountId:
      normalizeOptionalString(input.telegramAccountId) ?? base.telegramAccountId,
    telegramPollingEnabled: normalizeBoolean(
      input.telegramPollingEnabled,
      base.telegramPollingEnabled,
    ),
    telegramWebhookEnabled: normalizeBoolean(
      input.telegramWebhookEnabled,
      base.telegramWebhookEnabled,
    ),
    telegramWebhookSecretToken:
      normalizeOptionalString(input.telegramWebhookSecretToken) ??
      base.telegramWebhookSecretToken,
  };
};

export const normalizeManagedMessagingPersistedState = (
  value: unknown,
): ManagedMessagingPersistedState => {
  const input =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  const base = createDefaultManagedMessagingPersistedState();
  const lifecycleState = normalizeOptionalString(input.lifecycleState)?.toUpperCase();
  const validLifecycleState = [
    "DISABLED",
    "IDLE",
    "RESOLVING_COMPATIBILITY",
    "DOWNLOADING",
    "INSTALLING",
    "STARTING",
    "RUNNING",
    "DEGRADED",
    "UPDATING",
    "STOPPING",
    "BLOCKED",
    "ERROR",
  ].includes(lifecycleState ?? "")
    ? (lifecycleState as ManagedMessagingLifecycleState)
    : base.lifecycleState;

  const bindPort = Number(input.bindPort);
  const pid = Number(input.pid);
  const preferredBindPort = Number(input.preferredBindPort);

  return {
    desiredEnabled: normalizeBoolean(input.desiredEnabled, base.desiredEnabled),
    lifecycleState: validLifecycleState,
    message: normalizeOptionalString(input.message),
    lastError: normalizeOptionalString(input.lastError),
    activeVersion: normalizeOptionalString(input.activeVersion),
    desiredVersion: normalizeOptionalString(input.desiredVersion),
    releaseTag: normalizeOptionalString(input.releaseTag),
    bindHost: normalizeOptionalString(input.bindHost),
    bindPort:
      Number.isInteger(bindPort) && bindPort > 0 ? bindPort : base.bindPort,
    pid: Number.isInteger(pid) && pid > 0 ? pid : base.pid,
    preferredBindPort:
      Number.isInteger(preferredBindPort) && preferredBindPort > 0
        ? preferredBindPort
        : base.preferredBindPort,
    adminToken:
      normalizeOptionalString(input.adminToken) ?? base.adminToken,
    lastUpdatedAt:
      normalizeOptionalString(input.lastUpdatedAt) ?? base.lastUpdatedAt,
  };
};


import type {
  GatewayRuntimeReliabilityStatusModel,
  GatewayStepStatus,
  GatewayWeComAccountModel,
  ManagedMessagingGatewayProviderConfigModel,
  ManagedMessagingGatewayProviderStatusModel,
  ManagedMessagingGatewayStatusModel,
  MessagingProvider,
} from '~/types/messaging';

export function normalizeManagedGatewayError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Managed messaging request failed';
}

export function createDefaultManagedProviderConfig(): ManagedMessagingGatewayProviderConfigModel {
  return {
    whatsappBusinessEnabled: true,
    whatsappBusinessSecret: '',
    wecomAppEnabled: true,
    wecomWebhookToken: '',
    wecomAppAccounts: [],
    discordEnabled: true,
    discordBotToken: '',
    discordAccountId: '',
    discordDiscoveryMaxCandidates: 100,
    discordDiscoveryTtlSeconds: 300,
    telegramEnabled: true,
    telegramBotToken: '',
    telegramAccountId: '',
    telegramPollingEnabled: true,
    telegramWebhookEnabled: false,
    telegramWebhookSecretToken: '',
  };
}

export function normalizeProviderConfig(
  rawConfig: unknown,
): ManagedMessagingGatewayProviderConfigModel {
  const config =
    typeof rawConfig === 'object' && rawConfig !== null
      ? (rawConfig as Record<string, unknown>)
      : {};

  const wecomAccounts = Array.isArray(config.wecomAppAccounts)
    ? config.wecomAppAccounts
        .filter((item) => typeof item === 'object' && item !== null)
        .map((item) => {
          const account = item as Record<string, unknown>;
          return {
            accountId: String(account.accountId ?? ''),
            label: String(account.label ?? ''),
            mode: account.mode === 'LEGACY' ? 'LEGACY' : 'APP',
          } as GatewayWeComAccountModel;
        })
        .filter((item) => item.accountId.trim().length > 0)
    : [];

  return {
    whatsappBusinessEnabled: true,
    whatsappBusinessSecret: String(config.whatsappBusinessSecret ?? ''),
    wecomAppEnabled: true,
    wecomWebhookToken: String(config.wecomWebhookToken ?? ''),
    wecomAppAccounts: wecomAccounts,
    discordEnabled: true,
    discordBotToken: String(config.discordBotToken ?? ''),
    discordAccountId: String(config.discordAccountId ?? ''),
    discordDiscoveryMaxCandidates: normalizeNumber(
      config.discordDiscoveryMaxCandidates,
      100,
    ),
    discordDiscoveryTtlSeconds: normalizeNumber(
      config.discordDiscoveryTtlSeconds,
      300,
    ),
    telegramEnabled: true,
    telegramBotToken: String(config.telegramBotToken ?? ''),
    telegramAccountId: String(config.telegramAccountId ?? ''),
    telegramPollingEnabled: true,
    telegramWebhookEnabled: false,
    telegramWebhookSecretToken: '',
  };
}

export function normalizeManagedStatus(rawStatus: unknown): ManagedMessagingGatewayStatusModel {
  const status =
    typeof rawStatus === 'object' && rawStatus !== null
      ? (rawStatus as Record<string, unknown>)
      : {};

  const providerStatusByProvider =
    typeof status.providerStatusByProvider === 'object' &&
    status.providerStatusByProvider !== null
      ? Object.fromEntries(
          Object.entries(
            status.providerStatusByProvider as Record<string, unknown>,
          ).map(([provider, value]) => {
            const item =
              typeof value === 'object' && value !== null
                ? (value as Record<string, unknown>)
                : {};
            return [
              provider,
              {
                provider: provider as MessagingProvider,
                supported: item.supported === true,
                selectedTransport:
                  item.selectedTransport === 'PERSONAL_SESSION'
                    ? 'PERSONAL_SESSION'
                    : 'BUSINESS_API',
                configured: item.configured === true,
                effectivelyEnabled: item.effectivelyEnabled === true,
                blockedReason:
                  typeof item.blockedReason === 'string'
                    ? item.blockedReason
                    : null,
                accountId:
                  typeof item.accountId === 'string' ? item.accountId : null,
              } satisfies ManagedMessagingGatewayProviderStatusModel,
            ];
          }),
        )
      : {};

  return {
    supported: status.supported !== false,
    enabled: status.enabled === true,
    lifecycleState: String(status.lifecycleState ?? 'UNKNOWN'),
    message: typeof status.message === 'string' ? status.message : null,
    lastError: typeof status.lastError === 'string' ? status.lastError : null,
    activeVersion:
      typeof status.activeVersion === 'string' ? status.activeVersion : null,
    desiredVersion:
      typeof status.desiredVersion === 'string' ? status.desiredVersion : null,
    releaseTag: typeof status.releaseTag === 'string' ? status.releaseTag : null,
    installedVersions: Array.isArray(status.installedVersions)
      ? status.installedVersions.map((item) => String(item))
      : [],
    bindHost: typeof status.bindHost === 'string' ? status.bindHost : null,
    bindPort:
      typeof status.bindPort === 'number' ? status.bindPort : null,
    pid: typeof status.pid === 'number' ? status.pid : null,
    providerConfig: normalizeProviderConfig(status.providerConfig),
    providerStatusByProvider,
    supportedProviders: Array.isArray(status.supportedProviders)
      ? status.supportedProviders.map((item) => String(item) as MessagingProvider)
      : [],
    excludedProviders: Array.isArray(status.excludedProviders)
      ? status.excludedProviders.map((item) => String(item) as MessagingProvider)
      : [],
    diagnostics:
      typeof status.diagnostics === 'object' && status.diagnostics !== null
        ? (status.diagnostics as Record<string, unknown>)
        : {},
    runtimeReliabilityStatus:
      typeof status.runtimeReliabilityStatus === 'object' &&
      status.runtimeReliabilityStatus !== null
        ? (status.runtimeReliabilityStatus as GatewayRuntimeReliabilityStatusModel)
        : null,
    runtimeRunning: status.runtimeRunning === true,
  };
}

export function deriveManagedGatewayStepStatus(
  status: ManagedMessagingGatewayStatusModel,
): GatewayStepStatus {
  if (!status.supported) {
    return 'BLOCKED';
  }
  if (status.runtimeRunning) {
    return 'READY';
  }
  if (status.lifecycleState === 'ERROR' || status.lifecycleState === 'BLOCKED') {
    return 'BLOCKED';
  }
  return 'UNKNOWN';
}

function normalizeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

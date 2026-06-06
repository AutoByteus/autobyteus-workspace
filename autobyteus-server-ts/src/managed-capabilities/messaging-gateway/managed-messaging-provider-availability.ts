import type { ManagedMessagingProvider } from "./types.js";

export type ManagedMessagingStatusProvider = ManagedMessagingProvider | "WECHAT";

export const MANAGED_MESSAGING_SUPPORTED_PROVIDERS = [
  "WHATSAPP",
  "WECOM",
  "DISCORD",
  "TELEGRAM",
] as const satisfies readonly ManagedMessagingProvider[];

export const MANAGED_MESSAGING_EXCLUDED_PROVIDERS = [
  "WHATSAPP",
  "WECOM",
  "WECHAT",
] as const satisfies readonly ManagedMessagingStatusProvider[];

export const getManagedMessagingSupportedProviders =
  (): ManagedMessagingProvider[] => [...MANAGED_MESSAGING_SUPPORTED_PROVIDERS];

export const getManagedMessagingExcludedProviders =
  (): ManagedMessagingStatusProvider[] => [
    ...MANAGED_MESSAGING_EXCLUDED_PROVIDERS,
  ];

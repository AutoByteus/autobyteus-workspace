import type {
  BindingScopeInput,
  MessagingProvider,
  MessagingTransport,
} from '~/types/messaging';

export const MESSAGING_PROVIDERS: MessagingProvider[] = [
  'WHATSAPP',
  'WECHAT',
  'WECOM',
  'DISCORD',
  'TELEGRAM',
];

function normalizeBindingScopeAccountId(accountId: string | null | undefined): string | null {
  if (typeof accountId !== 'string') {
    return null;
  }
  const normalized = accountId.trim();
  return normalized.length > 0 ? normalized : null;
}

export function providerRequiresPersonalSession(provider: MessagingProvider): boolean {
  return provider === 'WHATSAPP' || provider === 'WECHAT';
}

export function providerTransport(provider: MessagingProvider): MessagingTransport {
  if (provider === 'WECOM' || provider === 'DISCORD' || provider === 'TELEGRAM') {
    return 'BUSINESS_API';
  }
  return 'PERSONAL_SESSION';
}

export function providerSessionLabel(provider: MessagingProvider): string {
  if (provider === 'WECHAT') {
    return 'WeChat';
  }
  if (provider === 'WHATSAPP') {
    return 'WhatsApp';
  }
  if (provider === 'DISCORD') {
    return 'Discord';
  }
  if (provider === 'TELEGRAM') {
    return 'Telegram';
  }
  return 'WeCom';
}

export function resolveBindingScope(input: {
  provider: BindingScopeInput['provider'];
  requiresPersonalSession: boolean;
  resolvedTransport: BindingScopeInput['transport'];
  discordAccountId: string | null;
  telegramAccountId: string | null;
  sessionAccountLabel: string | null;
}): BindingScopeInput {
  const accountId = input.requiresPersonalSession
    ? input.sessionAccountLabel
    : input.provider === 'DISCORD'
      ? input.discordAccountId
      : input.provider === 'TELEGRAM'
        ? input.telegramAccountId
      : null;

  return {
    provider: input.provider,
    transport: input.resolvedTransport,
    accountId: normalizeBindingScopeAccountId(accountId),
  };
}

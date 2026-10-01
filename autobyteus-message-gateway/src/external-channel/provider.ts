import { throwParseError } from './errors.js';

export enum ExternalChannelProvider {
  WHATSAPP = 'WHATSAPP',
  WECOM = 'WECOM',
  WECHAT = 'WECHAT',
  DISCORD = 'DISCORD',
  TELEGRAM = 'TELEGRAM'
}

export function parseExternalChannelProvider(input: unknown): ExternalChannelProvider {
  if (typeof input !== 'string') {
    throwParseError('INVALID_PROVIDER', "External channel provider must be a string.", 'provider');
  }

  const normalized = input.trim().toUpperCase();
  if (normalized === ExternalChannelProvider.WHATSAPP) {
    return ExternalChannelProvider.WHATSAPP;
  }
  if (normalized === ExternalChannelProvider.WECOM) {
    return ExternalChannelProvider.WECOM;
  }
  if (normalized === ExternalChannelProvider.WECHAT) {
    return ExternalChannelProvider.WECHAT;
  }
  if (normalized === ExternalChannelProvider.DISCORD) {
    return ExternalChannelProvider.DISCORD;
  }
  if (normalized === ExternalChannelProvider.TELEGRAM) {
    return ExternalChannelProvider.TELEGRAM;
  }

  throwParseError('INVALID_PROVIDER', `Unsupported external channel provider: ${input}`, 'provider');
}

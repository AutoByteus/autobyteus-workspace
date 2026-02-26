import { ExternalChannelTransport } from './channel-transport.js';
import { throwParseError } from './errors.js';
import { ExternalChannelProvider } from './provider.js';

export function assertProviderTransportCompatibility(
  provider: ExternalChannelProvider,
  transport: ExternalChannelTransport
): void {
  if (provider === ExternalChannelProvider.WECOM && transport !== ExternalChannelTransport.BUSINESS_API) {
    throwParseError(
      'INCOMPATIBLE_TRANSPORT_PROVIDER',
      `Transport ${transport} is incompatible with provider ${provider}.`,
      'transport'
    );
  }

  if (
    provider === ExternalChannelProvider.WECHAT &&
    transport !== ExternalChannelTransport.PERSONAL_SESSION
  ) {
    throwParseError(
      'INCOMPATIBLE_TRANSPORT_PROVIDER',
      `Transport ${transport} is incompatible with provider ${provider}.`,
      'transport'
    );
  }

  if (
    provider === ExternalChannelProvider.DISCORD &&
    transport !== ExternalChannelTransport.BUSINESS_API
  ) {
    throwParseError(
      'INCOMPATIBLE_TRANSPORT_PROVIDER',
      `Transport ${transport} is incompatible with provider ${provider}.`,
      'transport'
    );
  }

  if (
    provider === ExternalChannelProvider.TELEGRAM &&
    transport !== ExternalChannelTransport.BUSINESS_API
  ) {
    throwParseError(
      'INCOMPATIBLE_TRANSPORT_PROVIDER',
      `Transport ${transport} is incompatible with provider ${provider}.`,
      'transport'
    );
  }
}

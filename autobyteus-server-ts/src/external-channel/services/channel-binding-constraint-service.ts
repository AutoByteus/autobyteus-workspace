import type { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import type { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { assertProviderTransportCompatibility } from "autobyteus-ts/external-channel/provider-transport-compatibility.js";

const ACCEPTED_PROVIDER_TRANSPORT_PAIRS = [
  "DISCORD:BUSINESS_API",
  "TELEGRAM:BUSINESS_API",
  "WHATSAPP:BUSINESS_API",
  "WHATSAPP:PERSONAL_SESSION",
  "WECOM:BUSINESS_API",
  "WECHAT:PERSONAL_SESSION",
] as const;

export class ChannelBindingConstraintService {
  getAcceptedProviderTransportPairs(): string[] {
    return [...ACCEPTED_PROVIDER_TRANSPORT_PAIRS];
  }

  validateProviderTransport(
    provider: ExternalChannelProvider,
    transport: ExternalChannelTransport,
  ): void {
    try {
      assertProviderTransportCompatibility(provider, transport);
    } catch {
      throw new Error(
        `UNSUPPORTED_PROVIDER_TRANSPORT_COMBINATION: provider '${provider}' cannot be used with transport '${transport}'.`,
      );
    }
  }
}

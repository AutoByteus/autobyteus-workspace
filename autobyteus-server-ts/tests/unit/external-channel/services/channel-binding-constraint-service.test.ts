import { describe, expect, it } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { ChannelBindingConstraintService } from "../../../../src/external-channel/services/channel-binding-constraint-service.js";

describe("ChannelBindingConstraintService", () => {
  it("returns accepted provider/transport pairs", () => {
    const service = new ChannelBindingConstraintService();

    expect(service.getAcceptedProviderTransportPairs()).toEqual([
      "DISCORD:BUSINESS_API",
      "TELEGRAM:BUSINESS_API",
      "WHATSAPP:BUSINESS_API",
      "WHATSAPP:PERSONAL_SESSION",
      "WECOM:BUSINESS_API",
      "WECHAT:PERSONAL_SESSION",
    ]);
  });

  it("accepts compatible provider/transport combinations", () => {
    const service = new ChannelBindingConstraintService();

    expect(() =>
      service.validateProviderTransport(
        ExternalChannelProvider.WECHAT,
        ExternalChannelTransport.PERSONAL_SESSION,
      ),
    ).not.toThrow();
    expect(() =>
      service.validateProviderTransport(
        ExternalChannelProvider.WECOM,
        ExternalChannelTransport.BUSINESS_API,
      ),
    ).not.toThrow();
    expect(() =>
      service.validateProviderTransport(
        ExternalChannelProvider.DISCORD,
        ExternalChannelTransport.BUSINESS_API,
      ),
    ).not.toThrow();
    expect(() =>
      service.validateProviderTransport(
        ExternalChannelProvider.TELEGRAM,
        ExternalChannelTransport.BUSINESS_API,
      ),
    ).not.toThrow();
  });

  it("rejects incompatible provider/transport combinations", () => {
    const service = new ChannelBindingConstraintService();

    expect(() =>
      service.validateProviderTransport(
        ExternalChannelProvider.WECHAT,
        ExternalChannelTransport.BUSINESS_API,
      ),
    ).toThrow("UNSUPPORTED_PROVIDER_TRANSPORT_COMBINATION");
    expect(() =>
      service.validateProviderTransport(
        ExternalChannelProvider.WECOM,
        ExternalChannelTransport.PERSONAL_SESSION,
      ),
    ).toThrow("UNSUPPORTED_PROVIDER_TRANSPORT_COMBINATION");
    expect(() =>
      service.validateProviderTransport(
        ExternalChannelProvider.DISCORD,
        ExternalChannelTransport.PERSONAL_SESSION,
      ),
    ).toThrow("UNSUPPORTED_PROVIDER_TRANSPORT_COMBINATION");
    expect(() =>
      service.validateProviderTransport(
        ExternalChannelProvider.TELEGRAM,
        ExternalChannelTransport.PERSONAL_SESSION,
      ),
    ).toThrow("UNSUPPORTED_PROVIDER_TRANSPORT_COMBINATION");
  });
});

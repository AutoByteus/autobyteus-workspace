import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
import type { ProviderSendResult } from "../../../domain/models/provider-adapter.js";

export type WeComAppOutboundStrategyConfig = {
  sendImpl?: (payload: ExternalOutboundEnvelope) => Promise<ProviderSendResult>;
};

export class WeComAppOutboundStrategy {
  private readonly sendImpl: (
    payload: ExternalOutboundEnvelope,
  ) => Promise<ProviderSendResult>;

  constructor(config: WeComAppOutboundStrategyConfig = {}) {
    this.sendImpl =
      config.sendImpl ??
      (async () => ({
        providerMessageId: null,
        deliveredAt: new Date().toISOString(),
        metadata: {
          mode: "APP",
        },
      }));
  }

  async send(payload: ExternalOutboundEnvelope): Promise<ProviderSendResult> {
    return this.sendImpl(payload);
  }
}

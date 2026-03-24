import type { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { InboundHttpRequest } from "../../domain/models/inbound-http-request.js";
import type { InboundProviderAdapter } from "../../domain/models/provider-adapter.js";
import type { InboundInboxService } from "./inbound-inbox-service.js";

export type InboundHandleResult = {
  accepted: boolean;
  duplicate: boolean;
  queued: boolean;
  envelopeCount: number;
};

export type InboundNormalizedResult = {
  duplicate: boolean;
  disposition: "QUEUED" | "DUPLICATE";
};

export type InboundMessageServiceDeps = {
  adaptersByProvider: Map<ExternalChannelProvider, InboundProviderAdapter>;
  inboundInboxService: Pick<InboundInboxService, "enqueue">;
};

export class InboundMessageService {
  private readonly deps: InboundMessageServiceDeps;

  constructor(deps: InboundMessageServiceDeps) {
    this.deps = deps;
  }

  async handleInbound(
    provider: ExternalChannelProvider,
    request: InboundHttpRequest,
  ): Promise<InboundHandleResult> {
    const adapter = this.deps.adaptersByProvider.get(provider);
    if (!adapter) {
      throw new Error(`Adapter is not configured for provider ${provider}.`);
    }

    const envelopes = adapter.parseInbound(request);
    let duplicate = true;
    let queued = false;

    for (const envelope of envelopes) {
      const result = await this.handleNormalizedEnvelope(envelope);
      duplicate = duplicate && result.duplicate;
      queued = queued || result.disposition === "QUEUED";
    }

    return {
      accepted: true,
      duplicate,
      queued,
      envelopeCount: envelopes.length,
    };
  }

  async handleNormalizedEnvelope(
    envelope: ExternalMessageEnvelope,
  ): Promise<InboundNormalizedResult> {
    const enqueueResult = await this.deps.inboundInboxService.enqueue(envelope);
    if (enqueueResult.duplicate) {
      return {
        duplicate: true,
        disposition: "DUPLICATE",
      };
    }
    return {
      duplicate: false,
      disposition: "QUEUED",
    };
  }
}

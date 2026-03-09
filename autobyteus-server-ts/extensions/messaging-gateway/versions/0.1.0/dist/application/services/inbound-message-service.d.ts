import type { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { InboundHttpRequest } from "../../domain/models/inbound-http-request.js";
import type { InboundProviderAdapter } from "../../domain/models/provider-adapter.js";
import type { InboundInboxService } from "./inbound-inbox-service.js";
export type InboundHandleResult = {
    accepted: boolean;
    duplicate: boolean;
    blocked: boolean;
    forwarded: boolean;
    envelopeCount: number;
};
export type InboundNormalizedResult = {
    duplicate: boolean;
    blocked: boolean;
    forwarded: boolean;
    disposition: "QUEUED" | "DUPLICATE";
    bindingResolved: boolean;
};
export type InboundMessageServiceDeps = {
    adaptersByProvider: Map<ExternalChannelProvider, InboundProviderAdapter>;
    inboundInboxService: Pick<InboundInboxService, "enqueue">;
};
export declare class InboundMessageService {
    private readonly deps;
    constructor(deps: InboundMessageServiceDeps);
    handleInbound(provider: ExternalChannelProvider, request: InboundHttpRequest): Promise<InboundHandleResult>;
    handleNormalizedEnvelope(envelope: ExternalMessageEnvelope): Promise<InboundNormalizedResult>;
}
//# sourceMappingURL=inbound-message-service.d.ts.map
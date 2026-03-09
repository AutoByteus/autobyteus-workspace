import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { type ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import type { InboundHttpRequest } from "../../../domain/models/inbound-http-request.js";
import type { ProviderAdapter, ProviderSendResult, SignatureResult } from "../../../domain/models/provider-adapter.js";
export type WeComAdapterConfig = {
    webhookToken: string | null;
    sendImpl?: (payload: ExternalOutboundEnvelope) => Promise<ProviderSendResult>;
};
export declare class WeComAdapter implements ProviderAdapter {
    readonly provider = ExternalChannelProvider.WECOM;
    readonly transport = ExternalChannelTransport.BUSINESS_API;
    private readonly webhookToken;
    private readonly sendImpl;
    constructor(config: WeComAdapterConfig);
    verifyInboundSignature(request: InboundHttpRequest, rawBody: string): SignatureResult;
    parseInbound(request: InboundHttpRequest): ExternalMessageEnvelope[];
    sendOutbound(payload: ExternalOutboundEnvelope): Promise<ProviderSendResult>;
    createSignature(timestamp: string, nonce: string, rawBody: string): string;
}
//# sourceMappingURL=wecom-adapter.d.ts.map
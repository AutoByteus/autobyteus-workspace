import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { type ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import type { ProviderAdapter, ProviderSendResult, SignatureResult } from "../../../domain/models/provider-adapter.js";
import type { InboundHttpRequest } from "../../../domain/models/inbound-http-request.js";
export type WhatsAppBusinessAdapterConfig = {
    appSecret: string | null;
    sendImpl?: (payload: ExternalOutboundEnvelope) => Promise<ProviderSendResult>;
};
export declare class WhatsAppBusinessAdapter implements ProviderAdapter {
    readonly provider = ExternalChannelProvider.WHATSAPP;
    readonly transport = ExternalChannelTransport.BUSINESS_API;
    private readonly appSecret;
    private readonly sendImpl;
    constructor(config: WhatsAppBusinessAdapterConfig);
    verifyInboundSignature(request: InboundHttpRequest, rawBody: string): SignatureResult;
    parseInbound(request: InboundHttpRequest): ExternalMessageEnvelope[];
    sendOutbound(payload: ExternalOutboundEnvelope): Promise<ProviderSendResult>;
    createSignature(rawBody: string): string;
}
//# sourceMappingURL=whatsapp-business-adapter.d.ts.map
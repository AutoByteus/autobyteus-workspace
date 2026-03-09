import type { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import type { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
import type { InboundHttpRequest } from "./inbound-http-request.js";
export type SignatureResult = {
    valid: boolean;
    code: string | null;
    detail: string;
};
export type ProviderSendResult = {
    providerMessageId: string | null;
    deliveredAt: string;
    metadata: Record<string, unknown>;
};
export interface InboundProviderAdapter {
    readonly provider: ExternalChannelProvider;
    readonly transport: ExternalChannelTransport;
    verifyInboundSignature(request: InboundHttpRequest, rawBody: string): SignatureResult;
    parseInbound(request: InboundHttpRequest): ExternalMessageEnvelope[];
}
export interface OutboundProviderAdapter {
    readonly provider: ExternalChannelProvider;
    readonly transport: ExternalChannelTransport;
    sendOutbound(payload: ExternalOutboundEnvelope): Promise<ProviderSendResult>;
}
export type ProviderAdapter = InboundProviderAdapter & OutboundProviderAdapter;
//# sourceMappingURL=provider-adapter.d.ts.map
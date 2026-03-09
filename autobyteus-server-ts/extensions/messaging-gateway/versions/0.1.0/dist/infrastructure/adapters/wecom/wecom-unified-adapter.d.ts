import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
import type { InboundHttpRequest } from "../../../domain/models/inbound-http-request.js";
import type { ProviderAdapter, ProviderSendResult, SignatureResult } from "../../../domain/models/provider-adapter.js";
import type { WeComAccountRegistry } from "./wecom-account-registry.js";
import { WeComAdapter } from "./wecom-adapter.js";
import { WeComAppInboundStrategy } from "./wecom-app-inbound-strategy.js";
import { WeComAppOutboundStrategy } from "./wecom-app-outbound-strategy.js";
export type WeComUnifiedAdapterConfig = {
    legacyAdapter: WeComAdapter;
    accountRegistry: WeComAccountRegistry;
    appInboundStrategy: WeComAppInboundStrategy;
    appOutboundStrategy: WeComAppOutboundStrategy;
};
export declare class WeComUnifiedAdapter implements ProviderAdapter {
    private readonly config;
    readonly provider = ExternalChannelProvider.WECOM;
    readonly transport = ExternalChannelTransport.BUSINESS_API;
    constructor(config: WeComUnifiedAdapterConfig);
    verifyInboundSignature(request: InboundHttpRequest, rawBody: string): SignatureResult;
    parseInbound(request: InboundHttpRequest): ExternalMessageEnvelope[];
    sendOutbound(payload: ExternalOutboundEnvelope): Promise<ProviderSendResult>;
    verifyHandshake(input: {
        accountId: string;
        timestamp: string;
        nonce: string;
        signature: string;
        echo: string;
    }): SignatureResult;
}
//# sourceMappingURL=wecom-unified-adapter.d.ts.map
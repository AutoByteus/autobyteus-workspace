import type { SignatureResult } from "../../../domain/models/provider-adapter.js";
import type { InboundHttpRequest } from "../../../domain/models/inbound-http-request.js";
import { type ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import { WeComAdapter } from "./wecom-adapter.js";
export declare class WeComAppInboundStrategy {
    private readonly legacyAdapter;
    constructor(legacyAdapter: WeComAdapter);
    verifyHandshake(input: {
        timestamp: string;
        nonce: string;
        signature: string;
        echo: string;
    }): SignatureResult;
    verifyCallback(request: InboundHttpRequest, rawBody: string): SignatureResult;
    parseCallback(accountId: string, request: InboundHttpRequest): ExternalMessageEnvelope[];
    createSignature(timestamp: string, nonce: string, rawBody: string): string;
    private mapEventEnvelope;
}
//# sourceMappingURL=wecom-app-inbound-strategy.d.ts.map
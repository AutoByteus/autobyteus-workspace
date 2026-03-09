import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { ExternalDeliveryEvent } from "autobyteus-ts/external-channel/external-delivery-event.js";
export type ServerIngressResult = {
    accepted: boolean;
    duplicate: boolean;
    disposition: "ROUTED" | "UNBOUND" | "DUPLICATE";
    bindingResolved: boolean;
};
export type AutobyteusServerClientConfig = {
    baseUrl: string;
    sharedSecret: string | null;
    fetchImpl?: typeof fetch;
};
export declare class AutobyteusServerClient {
    private static readonly inboundIngressPath;
    private static readonly deliveryIngressPath;
    private readonly baseUrl;
    private readonly sharedSecret;
    private readonly fetchImpl;
    constructor(config: AutobyteusServerClientConfig);
    forwardInbound(payload: ExternalMessageEnvelope): Promise<ServerIngressResult>;
    postDeliveryEvent(payload: ExternalDeliveryEvent): Promise<void>;
    private postJson;
}
//# sourceMappingURL=autobyteus-server-client.d.ts.map
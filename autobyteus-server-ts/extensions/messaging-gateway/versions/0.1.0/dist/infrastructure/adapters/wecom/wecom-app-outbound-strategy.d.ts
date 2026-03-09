import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
import type { ProviderSendResult } from "../../../domain/models/provider-adapter.js";
export type WeComAppOutboundStrategyConfig = {
    sendImpl?: (payload: ExternalOutboundEnvelope) => Promise<ProviderSendResult>;
};
export declare class WeComAppOutboundStrategy {
    private readonly sendImpl;
    constructor(config?: WeComAppOutboundStrategyConfig);
    send(payload: ExternalOutboundEnvelope): Promise<ProviderSendResult>;
}
//# sourceMappingURL=wecom-app-outbound-strategy.d.ts.map
import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
import type { OutboundProviderAdapter } from "../../domain/models/provider-adapter.js";
import { DeadLetterService } from "./dead-letter-service.js";
import { DeliveryStatusService } from "./delivery-status-service.js";
import { OutboundChunkPlanner } from "./outbound-chunk-planner.js";
export type OutboundMessageServiceConfig = {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs?: number;
    backoffFactor?: number;
};
export type OutboundMessageServiceDeps = {
    outboundAdaptersByRoutingKey: Map<string, OutboundProviderAdapter>;
    deliveryStatusService: DeliveryStatusService;
    deadLetterService: DeadLetterService;
    chunkPlanner?: OutboundChunkPlanner;
    config: OutboundMessageServiceConfig;
    sleep?: (ms: number) => Promise<void>;
};
export type OutboundHandleResult = {
    delivered: boolean;
    attempts: number;
    deadLettered: boolean;
};
export declare class OutboundMessageService {
    private readonly deps;
    private readonly chunkPlanner;
    constructor(deps: OutboundMessageServiceDeps);
    handleOutbound(payload: ExternalOutboundEnvelope): Promise<OutboundHandleResult>;
    private nextDelayMs;
    private buildEvent;
}
//# sourceMappingURL=outbound-message-service.d.ts.map
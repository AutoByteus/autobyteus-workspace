import type { FastifyInstance } from "fastify";
import type { InboundInboxService } from "../../application/services/inbound-inbox-service.js";
import type { OutboundOutboxService } from "../../application/services/outbound-outbox-service.js";
import type { ReliabilityStatusService } from "../../application/services/reliability-status-service.js";
export type RuntimeReliabilityRouteDeps = {
    inboundInboxService: Pick<InboundInboxService, "listByStatus" | "replayFromStatus">;
    outboundOutboxService: Pick<OutboundOutboxService, "listByStatus" | "replayFromStatus">;
    reliabilityStatusService: Pick<ReliabilityStatusService, "getSnapshot">;
    adminToken?: string | null;
};
export declare function registerRuntimeReliabilityRoutes(app: FastifyInstance, deps: RuntimeReliabilityRouteDeps): void;
//# sourceMappingURL=runtime-reliability-route.d.ts.map
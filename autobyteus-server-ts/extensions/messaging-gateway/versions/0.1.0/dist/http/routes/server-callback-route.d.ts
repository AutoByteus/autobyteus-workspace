import type { FastifyInstance } from "fastify";
import type { OutboundOutboxService } from "../../application/services/outbound-outbox-service.js";
export type ServerCallbackDeps = {
    outboundOutboxService: Pick<OutboundOutboxService, "enqueueOrGet">;
    serverCallbackSharedSecret?: string | null;
    allowInsecureServerCallbacks?: boolean;
};
export declare function registerServerCallbackRoutes(app: FastifyInstance, deps: ServerCallbackDeps): void;
//# sourceMappingURL=server-callback-route.d.ts.map
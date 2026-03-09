import type { FastifyInstance } from "fastify";
import type { InboundMessageService } from "../../application/services/inbound-message-service.js";
import type { InboundProviderAdapter } from "../../domain/models/provider-adapter.js";
export type ProviderWebhookDeps = {
    inboundMessageService: InboundMessageService;
    adaptersByProvider: Map<string, InboundProviderAdapter>;
};
export declare function registerProviderWebhookRoutes(app: FastifyInstance, deps: ProviderWebhookDeps): void;
//# sourceMappingURL=provider-webhook-route.d.ts.map
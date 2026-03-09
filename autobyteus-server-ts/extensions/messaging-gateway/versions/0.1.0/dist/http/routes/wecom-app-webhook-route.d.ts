import type { FastifyInstance } from "fastify";
import type { InboundMessageService } from "../../application/services/inbound-message-service.js";
import type { InboundHttpRequest } from "../../domain/models/inbound-http-request.js";
import type { WeComAccountRegistry } from "../../infrastructure/adapters/wecom/wecom-account-registry.js";
type SignatureVerifier = {
    verifyHandshake: (input: {
        accountId: string;
        timestamp: string;
        nonce: string;
        signature: string;
        echo: string;
    }) => {
        valid: boolean;
        code: string | null;
        detail: string;
    };
    verifyInboundSignature: (request: InboundHttpRequest, rawBody: string) => {
        valid: boolean;
        code: string | null;
        detail: string;
    };
};
export type WeComAppWebhookRouteDeps = {
    inboundMessageService: InboundMessageService;
    wecomAdapter: SignatureVerifier;
    accountRegistry: WeComAccountRegistry;
};
export declare function registerWeComAppWebhookRoutes(app: FastifyInstance, deps: WeComAppWebhookRouteDeps): void;
export {};
//# sourceMappingURL=wecom-app-webhook-route.d.ts.map
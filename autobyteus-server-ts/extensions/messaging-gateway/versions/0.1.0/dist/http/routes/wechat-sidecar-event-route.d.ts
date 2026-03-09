import type { FastifyInstance } from "fastify";
import type { WechatyInboundEvent } from "../../infrastructure/adapters/wechat-personal/wechaty-sidecar-client.js";
export type WechatSidecarEventDeps = {
    wechatPersonalAdapter: {
        ingestInboundEvent: (event: WechatyInboundEvent) => Promise<void>;
    };
    sidecarSharedSecret: string;
};
export declare function registerWechatSidecarEventRoutes(app: FastifyInstance, deps: WechatSidecarEventDeps): void;
//# sourceMappingURL=wechat-sidecar-event-route.d.ts.map
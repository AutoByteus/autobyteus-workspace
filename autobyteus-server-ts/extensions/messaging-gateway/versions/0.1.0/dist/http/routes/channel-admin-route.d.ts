import type { FastifyInstance } from "fastify";
import type { GatewayCapabilityService } from "../../application/services/gateway-capability-service.js";
import { type DiscordPeerDiscoveryService } from "../../application/services/discord-peer-discovery-service.js";
import { type TelegramPeerDiscoveryService } from "../../application/services/telegram-peer-discovery-service.js";
import type { WhatsAppPersonalSessionService } from "../../application/services/whatsapp-personal-session-service.js";
import type { WechatPersonalSessionService } from "../../application/services/wechat-personal-session-service.js";
import type { WeComAccountRegistry } from "../../infrastructure/adapters/wecom/wecom-account-registry.js";
export type ChannelAdminDeps = {
    sessionService: WhatsAppPersonalSessionService;
    wechatSessionService?: WechatPersonalSessionService;
    discordPeerDiscoveryService?: DiscordPeerDiscoveryService;
    telegramPeerDiscoveryService?: TelegramPeerDiscoveryService;
    capabilityService?: GatewayCapabilityService;
    wecomAccountRegistry?: WeComAccountRegistry;
    adminToken?: string | null;
    defaultPeerCandidateLimit?: number;
    maxPeerCandidateLimit?: number;
    wechatDefaultPeerCandidateLimit?: number;
    wechatMaxPeerCandidateLimit?: number;
};
export declare function registerChannelAdminRoutes(app: FastifyInstance, deps: ChannelAdminDeps): void;
//# sourceMappingURL=channel-admin-route.d.ts.map
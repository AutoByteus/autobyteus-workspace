import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { type ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import type { ProviderSendResult } from "../../../domain/models/provider-adapter.js";
import { DiscordGatewayClient } from "./discord-gateway-client.js";
import { DiscordPeerCandidateIndex, type ListDiscordPeerCandidatesResult } from "./discord-peer-candidate-index.js";
import { DiscordRestClient } from "./discord-rest-client.js";
import { type DiscordThreadContextResolver } from "./discord-thread-context-resolver.js";
export type DiscordBusinessAdapterConfig = {
    botToken: string;
    accountId: string;
    gatewayClient?: DiscordGatewayClientLike;
    restClient?: Pick<DiscordRestClient, "sendMessage">;
    peerCandidateIndex?: DiscordPeerCandidateIndex;
    threadContextResolver?: DiscordThreadContextResolver;
};
type DiscordGatewayClientLike = Pick<DiscordGatewayClient, "connect" | "disconnect" | "onMessageCreate"> & Partial<Pick<DiscordGatewayClient, "onDisconnected">>;
export declare class DiscordBusinessAdapterError extends Error {
    readonly code: string;
    readonly retryable: boolean;
    constructor(input: {
        code: string;
        detail: string;
        retryable: boolean;
    });
}
export declare class DiscordBusinessAdapter {
    readonly provider = ExternalChannelProvider.DISCORD;
    readonly transport = ExternalChannelTransport.BUSINESS_API;
    private readonly accountId;
    private readonly gatewayClient;
    private readonly restClient;
    private readonly peerCandidateIndex;
    private readonly threadContextResolver;
    private readonly handlers;
    private readonly disconnectHandlers;
    constructor(config: DiscordBusinessAdapterConfig);
    subscribeInbound(handler: (envelope: ExternalMessageEnvelope) => Promise<void>): () => void;
    onDisconnected(handler: (reason: string) => void): () => void;
    start(): Promise<void>;
    stop(): Promise<void>;
    listPeerCandidates(options?: {
        accountId?: string;
        includeGroups?: boolean;
        limit?: number;
    }): Promise<ListDiscordPeerCandidatesResult>;
    sendOutbound(payload: ExternalOutboundEnvelope): Promise<ProviderSendResult>;
    private handleGatewayMessageCreate;
    private assertValidOutboundIdentity;
}
export {};
//# sourceMappingURL=discord-business-adapter.d.ts.map
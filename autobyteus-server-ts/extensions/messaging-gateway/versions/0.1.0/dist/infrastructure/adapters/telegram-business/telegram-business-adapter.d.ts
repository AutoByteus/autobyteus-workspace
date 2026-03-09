import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { type ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import type { InboundProviderAdapter, ProviderSendResult, SignatureResult } from "../../../domain/models/provider-adapter.js";
import type { InboundHttpRequest } from "../../../domain/models/inbound-http-request.js";
import { TelegramBotClient } from "./telegram-bot-client.js";
import { TelegramPeerCandidateIndex, type ListTelegramPeerCandidatesResult } from "./telegram-peer-candidate-index.js";
export type TelegramBusinessAdapterConfig = {
    accountId: string;
    botToken?: string;
    pollingEnabled?: boolean;
    webhookEnabled?: boolean;
    webhookSecretToken?: string | null;
    botClient?: TelegramBotClientLike;
    peerCandidateIndex?: TelegramPeerCandidateIndex;
};
type TelegramBotClientLike = Pick<TelegramBotClient, "startPolling" | "stopPolling" | "sendMessage" | "onUpdate" | "onDisconnected">;
export declare class TelegramBusinessAdapterError extends Error {
    readonly code: string;
    readonly retryable: boolean;
    constructor(input: {
        code: string;
        detail: string;
        retryable: boolean;
    });
}
export declare class TelegramBusinessAdapter implements InboundProviderAdapter {
    readonly provider = ExternalChannelProvider.TELEGRAM;
    readonly transport = ExternalChannelTransport.BUSINESS_API;
    private readonly accountId;
    private readonly pollingEnabled;
    private readonly webhookEnabled;
    private readonly webhookSecretToken;
    private readonly botClient;
    private readonly peerCandidateIndex;
    private readonly inboundHandlers;
    private readonly disconnectHandlers;
    constructor(config: TelegramBusinessAdapterConfig);
    subscribeInbound(handler: (envelope: ExternalMessageEnvelope) => Promise<void>): () => void;
    onDisconnected(handler: (reason: string) => void): () => void;
    start(): Promise<void>;
    stop(): Promise<void>;
    verifyInboundSignature(request: InboundHttpRequest, _rawBody: string): SignatureResult;
    parseInbound(request: InboundHttpRequest): ExternalMessageEnvelope[];
    sendOutbound(payload: ExternalOutboundEnvelope): Promise<ProviderSendResult>;
    listPeerCandidates(options?: {
        accountId?: string;
        includeGroups?: boolean;
        limit?: number;
    }): Promise<ListTelegramPeerCandidatesResult>;
    private handleUpdate;
    private normalizeUpdates;
    private toInboundEnvelope;
}
export {};
//# sourceMappingURL=telegram-business-adapter.d.ts.map
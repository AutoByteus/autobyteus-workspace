import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { validateDiscordBindingIdentity, } from "autobyteus-ts/external-channel/discord-binding-identity.js";
import { parseExternalMessageEnvelope, } from "autobyteus-ts/external-channel/external-message-envelope.js";
import { ExternalPeerType } from "autobyteus-ts/external-channel/peer-type.js";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { DiscordGatewayClient, } from "./discord-gateway-client.js";
import { decodeDiscordPeerId, encodeDiscordPeerId, } from "./discord-target-codec.js";
import { DiscordPeerCandidateIndex, } from "./discord-peer-candidate-index.js";
import { DiscordRestClient, DiscordRestClientError } from "./discord-rest-client.js";
import { DefaultDiscordThreadContextResolver, DiscordThreadContextResolverError, } from "./discord-thread-context-resolver.js";
export class DiscordBusinessAdapterError extends Error {
    code;
    retryable;
    constructor(input) {
        super(input.detail);
        this.name = "DiscordBusinessAdapterError";
        this.code = input.code;
        this.retryable = input.retryable;
    }
}
export class DiscordBusinessAdapter {
    provider = ExternalChannelProvider.DISCORD;
    transport = ExternalChannelTransport.BUSINESS_API;
    accountId;
    gatewayClient;
    restClient;
    peerCandidateIndex;
    threadContextResolver;
    handlers = new Set();
    disconnectHandlers = new Set();
    constructor(config) {
        this.accountId = normalizeRequiredString(config.accountId, "accountId");
        this.gatewayClient =
            config.gatewayClient ??
                new DiscordGatewayClient({
                    botToken: normalizeRequiredString(config.botToken, "botToken"),
                });
        this.restClient =
            config.restClient ??
                new DiscordRestClient({
                    botToken: normalizeRequiredString(config.botToken, "botToken"),
                });
        this.peerCandidateIndex =
            config.peerCandidateIndex ??
                new DiscordPeerCandidateIndex({
                    maxCandidatesPerAccount: 200,
                    candidateTtlSeconds: 7 * 24 * 60 * 60,
                });
        this.threadContextResolver =
            config.threadContextResolver ?? new DefaultDiscordThreadContextResolver();
        this.gatewayClient.onMessageCreate(async (event) => this.handleGatewayMessageCreate(event));
        if (typeof this.gatewayClient.onDisconnected === "function") {
            this.gatewayClient.onDisconnected((reason) => {
                for (const handler of this.disconnectHandlers) {
                    handler(reason);
                }
            });
        }
    }
    subscribeInbound(handler) {
        this.handlers.add(handler);
        return () => {
            this.handlers.delete(handler);
        };
    }
    onDisconnected(handler) {
        this.disconnectHandlers.add(handler);
        return () => {
            this.disconnectHandlers.delete(handler);
        };
    }
    async start() {
        await this.gatewayClient.connect();
    }
    async stop() {
        await this.gatewayClient.disconnect();
    }
    async listPeerCandidates(options) {
        return this.peerCandidateIndex.listCandidates({
            accountId: options?.accountId ?? this.accountId,
            includeGroups: options?.includeGroups,
            limit: options?.limit,
        });
    }
    async sendOutbound(payload) {
        const chunks = resolveChunks(payload);
        if (chunks.length === 0) {
            throw new DiscordBusinessAdapterError({
                code: "INVALID_OUTBOUND_PAYLOAD",
                detail: "Discord outbound payload has no non-empty chunks.",
                retryable: false,
            });
        }
        this.assertValidOutboundIdentity(payload);
        const target = decodeDiscordPeerId(payload.peerId);
        const restTarget = target.targetType === "USER"
            ? {
                targetType: "USER",
                userId: target.id,
                threadId: payload.threadId,
            }
            : {
                targetType: "CHANNEL",
                channelId: target.id,
                threadId: payload.threadId,
            };
        try {
            const sendResult = await this.restClient.sendMessage({
                target: restTarget,
                chunks,
            });
            return {
                providerMessageId: sendResult.providerMessageId,
                deliveredAt: sendResult.deliveredAt,
                metadata: {
                    ...(sendResult.metadata ?? {}),
                    chunkCount: chunks.length,
                },
            };
        }
        catch (error) {
            if (error instanceof DiscordRestClientError) {
                throw new DiscordBusinessAdapterError({
                    code: error.code,
                    detail: error.message,
                    retryable: error.retryable,
                });
            }
            throw error;
        }
    }
    async handleGatewayMessageCreate(event) {
        if (event.authorIsBot) {
            return;
        }
        let threadContext;
        try {
            threadContext = await this.threadContextResolver.resolveThreadContext(event);
        }
        catch (error) {
            if (error instanceof DiscordThreadContextResolverError &&
                error.code === "DISCORD_THREAD_PARENT_UNRESOLVED") {
                return;
            }
            throw error;
        }
        const peerTarget = event.guildId === null
            ? {
                targetType: "USER",
                id: event.authorId,
            }
            : {
                targetType: "CHANNEL",
                id: threadContext.canonicalChannelId,
            };
        const peerId = encodeDiscordPeerId(peerTarget);
        const envelope = parseExternalMessageEnvelope({
            provider: this.provider,
            transport: this.transport,
            accountId: this.accountId,
            peerId,
            peerType: event.guildId === null ? ExternalPeerType.USER : ExternalPeerType.GROUP,
            threadId: threadContext.canonicalThreadId,
            externalMessageId: event.id,
            content: event.content,
            attachments: event.attachments.map((attachment) => ({
                kind: "file",
                url: attachment.url,
                mimeType: attachment.contentType,
                fileName: attachment.fileName,
                sizeBytes: attachment.sizeBytes,
                metadata: attachment.id ? { id: attachment.id } : {},
            })),
            receivedAt: event.timestamp,
            metadata: {
                mentioned: event.mentioned,
                mentionsAgent: event.mentionsAgent,
                channelId: event.channelId,
                canonicalChannelId: threadContext.canonicalChannelId,
                guildId: event.guildId,
            },
        });
        this.peerCandidateIndex.recordObservation({
            accountId: this.accountId,
            peerId,
            peerType: event.guildId === null ? "USER" : "GROUP",
            threadId: threadContext.canonicalThreadId,
            displayName: event.authorDisplayName ?? null,
            lastMessageAt: envelope.receivedAt,
        });
        for (const handler of this.handlers) {
            await handler(envelope);
        }
    }
    assertValidOutboundIdentity(payload) {
        const issues = validateDiscordBindingIdentity({
            accountId: payload.accountId,
            peerId: payload.peerId,
            threadId: payload.threadId,
        });
        if (issues.length > 0) {
            throw issueToAdapterError(issues[0]);
        }
        if (payload.accountId !== this.accountId) {
            throw new DiscordBusinessAdapterError({
                code: "ACCOUNT_NOT_CONFIGURED",
                detail: `Discord accountId '${payload.accountId}' does not match configured account '${this.accountId}'.`,
                retryable: false,
            });
        }
    }
}
const resolveChunks = (payload) => {
    const candidateChunks = payload.chunks.length > 0
        ? payload.chunks.map((chunk) => chunk.text)
        : [payload.replyText];
    return candidateChunks
        .map((chunk) => chunk.trim())
        .filter((chunk) => chunk.length > 0);
};
const issueToAdapterError = (issue) => new DiscordBusinessAdapterError({
    code: issue.code,
    detail: issue.detail,
    retryable: false,
});
const normalizeRequiredString = (value, field) => {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`${field} must be a non-empty string.`);
    }
    return value.trim();
};
//# sourceMappingURL=discord-business-adapter.js.map
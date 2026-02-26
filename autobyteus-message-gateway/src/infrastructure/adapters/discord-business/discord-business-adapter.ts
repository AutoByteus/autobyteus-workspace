import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import {
  validateDiscordBindingIdentity,
  type DiscordBindingIdentityValidationIssue,
} from "autobyteus-ts/external-channel/discord-binding-identity.js";
import {
  parseExternalMessageEnvelope,
  type ExternalMessageEnvelope,
} from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
import { ExternalPeerType } from "autobyteus-ts/external-channel/peer-type.js";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import type { ProviderSendResult } from "../../../domain/models/provider-adapter.js";
import {
  DiscordGatewayClient,
  type DiscordGatewayMessageCreateEvent,
} from "./discord-gateway-client.js";
import {
  decodeDiscordPeerId,
  encodeDiscordPeerId,
  type DiscordPeerTarget,
} from "./discord-target-codec.js";
import {
  DiscordPeerCandidateIndex,
  type ListDiscordPeerCandidatesResult,
} from "./discord-peer-candidate-index.js";
import { DiscordRestClient, DiscordRestClientError } from "./discord-rest-client.js";
import {
  DefaultDiscordThreadContextResolver,
  DiscordThreadContextResolverError,
  type DiscordThreadContextResolver,
} from "./discord-thread-context-resolver.js";

export type DiscordBusinessAdapterConfig = {
  botToken: string;
  accountId: string;
  gatewayClient?: DiscordGatewayClientLike;
  restClient?: Pick<DiscordRestClient, "sendMessage">;
  peerCandidateIndex?: DiscordPeerCandidateIndex;
  threadContextResolver?: DiscordThreadContextResolver;
};

type DiscordGatewayClientLike = Pick<
  DiscordGatewayClient,
  "connect" | "disconnect" | "onMessageCreate"
> &
  Partial<Pick<DiscordGatewayClient, "onDisconnected">>;

export class DiscordBusinessAdapterError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(input: { code: string; detail: string; retryable: boolean }) {
    super(input.detail);
    this.name = "DiscordBusinessAdapterError";
    this.code = input.code;
    this.retryable = input.retryable;
  }
}

export class DiscordBusinessAdapter {
  readonly provider = ExternalChannelProvider.DISCORD;
  readonly transport = ExternalChannelTransport.BUSINESS_API;

  private readonly accountId: string;
  private readonly gatewayClient: DiscordGatewayClientLike;
  private readonly restClient: Pick<DiscordRestClient, "sendMessage">;
  private readonly peerCandidateIndex: DiscordPeerCandidateIndex;
  private readonly threadContextResolver: DiscordThreadContextResolver;
  private readonly handlers = new Set<(envelope: ExternalMessageEnvelope) => Promise<void>>();
  private readonly disconnectHandlers = new Set<(reason: string) => void>();

  constructor(config: DiscordBusinessAdapterConfig) {
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
      this.gatewayClient.onDisconnected((reason: string) => {
        for (const handler of this.disconnectHandlers) {
          handler(reason);
        }
      });
    }
  }

  subscribeInbound(handler: (envelope: ExternalMessageEnvelope) => Promise<void>): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  onDisconnected(handler: (reason: string) => void): () => void {
    this.disconnectHandlers.add(handler);
    return () => {
      this.disconnectHandlers.delete(handler);
    };
  }

  async start(): Promise<void> {
    await this.gatewayClient.connect();
  }

  async stop(): Promise<void> {
    await this.gatewayClient.disconnect();
  }

  async listPeerCandidates(options?: {
    accountId?: string;
    includeGroups?: boolean;
    limit?: number;
  }): Promise<ListDiscordPeerCandidatesResult> {
    return this.peerCandidateIndex.listCandidates({
      accountId: options?.accountId ?? this.accountId,
      includeGroups: options?.includeGroups,
      limit: options?.limit,
    });
  }

  async sendOutbound(payload: ExternalOutboundEnvelope): Promise<ProviderSendResult> {
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
    const restTarget =
      target.targetType === "USER"
        ? {
            targetType: "USER" as const,
            userId: target.id,
            threadId: payload.threadId,
          }
        : {
            targetType: "CHANNEL" as const,
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
    } catch (error) {
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

  private async handleGatewayMessageCreate(event: DiscordGatewayMessageCreateEvent): Promise<void> {
    if (event.authorIsBot) {
      return;
    }

    let threadContext: { canonicalChannelId: string; canonicalThreadId: string | null };
    try {
      threadContext = await this.threadContextResolver.resolveThreadContext(event);
    } catch (error) {
      if (
        error instanceof DiscordThreadContextResolverError &&
        error.code === "DISCORD_THREAD_PARENT_UNRESOLVED"
      ) {
        return;
      }
      throw error;
    }

    const peerTarget: DiscordPeerTarget =
      event.guildId === null
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

  private assertValidOutboundIdentity(payload: ExternalOutboundEnvelope): void {
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

const resolveChunks = (payload: ExternalOutboundEnvelope): string[] => {
  const candidateChunks =
    payload.chunks.length > 0
      ? payload.chunks.map((chunk) => chunk.text)
      : [payload.replyText];
  return candidateChunks
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);
};

const issueToAdapterError = (
  issue: DiscordBindingIdentityValidationIssue,
): DiscordBusinessAdapterError =>
  new DiscordBusinessAdapterError({
    code: issue.code,
    detail: issue.detail,
    retryable: false,
  });

const normalizeRequiredString = (value: unknown, field: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return value.trim();
};

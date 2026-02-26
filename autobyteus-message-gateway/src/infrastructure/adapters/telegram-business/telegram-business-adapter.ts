import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import {
  parseExternalMessageEnvelope,
  type ExternalMessageEnvelope,
} from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
import { ExternalPeerType } from "autobyteus-ts/external-channel/peer-type.js";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import type {
  InboundProviderAdapter,
  ProviderSendResult,
  SignatureResult,
} from "../../../domain/models/provider-adapter.js";
import type { InboundHttpRequest } from "../../../domain/models/inbound-http-request.js";
import {
  TelegramBotClient,
  TelegramBotClientError,
  type TelegramUpdate,
  type TelegramUpdateMessage,
} from "./telegram-bot-client.js";
import {
  TelegramPeerCandidateIndex,
  type ListTelegramPeerCandidatesResult,
} from "./telegram-peer-candidate-index.js";

export type TelegramBusinessAdapterConfig = {
  accountId: string;
  botToken?: string;
  pollingEnabled?: boolean;
  webhookEnabled?: boolean;
  webhookSecretToken?: string | null;
  botClient?: TelegramBotClientLike;
  peerCandidateIndex?: TelegramPeerCandidateIndex;
};

type TelegramBotClientLike = Pick<
  TelegramBotClient,
  "startPolling" | "stopPolling" | "sendMessage" | "onUpdate" | "onDisconnected"
>;

type NormalizedInboundEnvelope = {
  envelope: ExternalMessageEnvelope;
  mentionFlags: {
    mentioned: boolean;
    mentionsAgent: boolean;
  };
  displayName: string | null;
};

export class TelegramBusinessAdapterError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(input: { code: string; detail: string; retryable: boolean }) {
    super(input.detail);
    this.name = "TelegramBusinessAdapterError";
    this.code = input.code;
    this.retryable = input.retryable;
  }
}

export class TelegramBusinessAdapter implements InboundProviderAdapter {
  readonly provider = ExternalChannelProvider.TELEGRAM;
  readonly transport = ExternalChannelTransport.BUSINESS_API;

  private readonly accountId: string;
  private readonly pollingEnabled: boolean;
  private readonly webhookEnabled: boolean;
  private readonly webhookSecretToken: string | null;
  private readonly botClient: TelegramBotClientLike;
  private readonly peerCandidateIndex: TelegramPeerCandidateIndex;
  private readonly inboundHandlers = new Set<(envelope: ExternalMessageEnvelope) => Promise<void>>();
  private readonly disconnectHandlers = new Set<(reason: string) => void>();

  constructor(config: TelegramBusinessAdapterConfig) {
    this.accountId = normalizeRequiredString(config.accountId, "accountId");
    this.pollingEnabled = config.pollingEnabled ?? true;
    this.webhookEnabled = config.webhookEnabled ?? false;
    this.webhookSecretToken =
      typeof config.webhookSecretToken === "string" && config.webhookSecretToken.trim().length > 0
        ? config.webhookSecretToken.trim()
        : null;

    this.botClient =
      config.botClient ??
      new TelegramBotClient({
        botToken: normalizeRequiredString(config.botToken, "botToken"),
      });
    this.peerCandidateIndex =
      config.peerCandidateIndex ??
      new TelegramPeerCandidateIndex({
        maxCandidatesPerAccount: 200,
        candidateTtlSeconds: 7 * 24 * 60 * 60,
      });

    this.botClient.onUpdate(async (update) => this.handleUpdate(update));
    this.botClient.onDisconnected((reason) => {
      for (const handler of this.disconnectHandlers) {
        handler(reason);
      }
    });
  }

  subscribeInbound(handler: (envelope: ExternalMessageEnvelope) => Promise<void>): () => void {
    this.inboundHandlers.add(handler);
    return () => {
      this.inboundHandlers.delete(handler);
    };
  }

  onDisconnected(handler: (reason: string) => void): () => void {
    this.disconnectHandlers.add(handler);
    return () => {
      this.disconnectHandlers.delete(handler);
    };
  }

  async start(): Promise<void> {
    if (!this.pollingEnabled) {
      return;
    }
    await this.botClient.startPolling();
  }

  async stop(): Promise<void> {
    if (!this.pollingEnabled) {
      return;
    }
    await this.botClient.stopPolling();
  }

  verifyInboundSignature(request: InboundHttpRequest, _rawBody: string): SignatureResult {
    if (!this.webhookEnabled) {
      return {
        valid: false,
        code: "WEBHOOK_DISABLED",
        detail: "Telegram webhook ingress is disabled.",
      };
    }

    if (!this.webhookSecretToken) {
      return {
        valid: true,
        code: null,
        detail: "Telegram webhook verification bypassed because no secret token is configured.",
      };
    }

    const header = request.headers["x-telegram-bot-api-secret-token"];
    if (!header) {
      return {
        valid: false,
        code: "MISSING_SIGNATURE",
        detail: "Missing x-telegram-bot-api-secret-token header.",
      };
    }

    if (header !== this.webhookSecretToken) {
      return {
        valid: false,
        code: "INVALID_SIGNATURE",
        detail: "Telegram webhook secret token mismatch.",
      };
    }

    return {
      valid: true,
      code: null,
      detail: "Telegram webhook secret token verified.",
    };
  }

  parseInbound(request: InboundHttpRequest): ExternalMessageEnvelope[] {
    const updates = normalizeRequestUpdates(request.body);
    return this.normalizeUpdates(updates).map((item) => item.envelope);
  }

  async sendOutbound(payload: ExternalOutboundEnvelope): Promise<ProviderSendResult> {
    if (payload.accountId !== this.accountId) {
      throw new TelegramBusinessAdapterError({
        code: "ACCOUNT_NOT_CONFIGURED",
        detail: `Telegram accountId '${payload.accountId}' does not match configured account '${this.accountId}'.`,
        retryable: false,
      });
    }

    const chatId = normalizeRequiredString(payload.peerId, "peerId");
    const chunks = resolveOutboundChunks(payload);
    if (chunks.length === 0) {
      throw new TelegramBusinessAdapterError({
        code: "INVALID_OUTBOUND_PAYLOAD",
        detail: "Telegram outbound payload has no non-empty chunks.",
        retryable: false,
      });
    }

    const providerMessageIds: string[] = [];
    let deliveredAt = new Date().toISOString();
    try {
      for (const chunk of chunks) {
        const sendResult = await this.botClient.sendMessage({
          chatId,
          threadId: payload.threadId,
          text: chunk,
        });
        if (sendResult.providerMessageId) {
          providerMessageIds.push(sendResult.providerMessageId);
        }
        deliveredAt = sendResult.deliveredAt;
      }
    } catch (error) {
      if (error instanceof TelegramBotClientError) {
        throw new TelegramBusinessAdapterError({
          code: error.code,
          detail: error.message,
          retryable: error.retryable,
        });
      }
      throw error;
    }

    return {
      providerMessageId: providerMessageIds.length > 0 ? providerMessageIds.at(-1) ?? null : null,
      deliveredAt,
      metadata: {
        chunkCount: chunks.length,
        providerMessageIds,
      },
    };
  }

  async listPeerCandidates(options?: {
    accountId?: string;
    includeGroups?: boolean;
    limit?: number;
  }): Promise<ListTelegramPeerCandidatesResult> {
    return this.peerCandidateIndex.listCandidates({
      accountId: options?.accountId ?? this.accountId,
      includeGroups: options?.includeGroups,
      limit: options?.limit,
    });
  }

  private async handleUpdate(update: TelegramUpdate): Promise<void> {
    const envelopes = this.normalizeUpdates([update]);
    for (const item of envelopes) {
      for (const handler of this.inboundHandlers) {
        await handler(item.envelope);
      }
    }
  }

  private normalizeUpdates(updates: TelegramUpdate[]): NormalizedInboundEnvelope[] {
    const result: NormalizedInboundEnvelope[] = [];

    for (const update of updates) {
      const normalized = this.toInboundEnvelope(update);
      if (!normalized) {
        continue;
      }
      this.peerCandidateIndex.recordObservation({
        accountId: this.accountId,
        peerId: normalized.envelope.peerId,
        peerType: normalized.envelope.peerType === ExternalPeerType.GROUP ? "GROUP" : "USER",
        threadId: normalized.envelope.threadId,
        displayName: normalized.displayName,
        lastMessageAt: normalized.envelope.receivedAt,
      });
      result.push(normalized);
    }

    return result;
  }

  private toInboundEnvelope(update: TelegramUpdate): NormalizedInboundEnvelope | null {
    const message = update.message;
    const peerType = isGroupChat(message.chatType) ? ExternalPeerType.GROUP : ExternalPeerType.USER;
    const mentionFlags = resolveMentionFlags(message, peerType);
    const displayName = resolveDisplayName(message, peerType);

    return {
      envelope: parseExternalMessageEnvelope({
        provider: this.provider,
        transport: this.transport,
        accountId: this.accountId,
        peerId: message.chatId,
        peerType,
        threadId: message.threadId,
        externalMessageId: `update:${update.updateId}`,
        content: message.text,
        attachments: [],
        receivedAt: message.dateIso,
        metadata: {
          updateId: update.updateId,
          chatType: message.chatType,
          chatTitle: message.chatTitle,
          senderId: message.senderId,
          senderDisplayName: message.senderDisplayName,
          mentioned: mentionFlags.mentioned,
          mentionsAgent: mentionFlags.mentionsAgent,
          isMentioned: mentionFlags.mentioned,
        },
      }),
      mentionFlags,
      displayName,
    };
  }
}

const normalizeRequestUpdates = (payload: unknown): TelegramUpdate[] => {
  if (Array.isArray(payload)) {
    return payload.map(normalizeRequestUpdateRecord).filter((item): item is TelegramUpdate => item !== null);
  }
  if (isRecord(payload)) {
    if (Array.isArray(payload.result)) {
      return payload.result
        .map(normalizeRequestUpdateRecord)
        .filter((item): item is TelegramUpdate => item !== null);
    }
    const single = normalizeRequestUpdateRecord(payload);
    if (single) {
      return [single];
    }
  }
  throw new Error("Invalid Telegram webhook payload.");
};

const normalizeRequestUpdateRecord = (value: unknown): TelegramUpdate | null => {
  if (!isRecord(value)) {
    return null;
  }
  const updateId = normalizeIdentifier(value.update_id);
  if (!updateId) {
    return null;
  }

  const messageRecord = selectMessageRecord(value);
  if (!messageRecord) {
    return null;
  }

  const messageId = normalizeIdentifier(messageRecord.message_id);
  const chatRecord = isRecord(messageRecord.chat) ? messageRecord.chat : null;
  const chatId = normalizeIdentifier(chatRecord?.id);
  const chatType = normalizeOptionalString(chatRecord?.type);
  if (!messageId || !chatId || !chatType) {
    return null;
  }

  const dateIso = normalizeDateIso(messageRecord.date);
  const entities = normalizeEntities(messageRecord.entities).concat(
    normalizeEntities(messageRecord.caption_entities),
  );
  const from = isRecord(messageRecord.from) ? messageRecord.from : null;
  const replyToMessage = isRecord(messageRecord.reply_to_message)
    ? messageRecord.reply_to_message
    : null;
  const replyToFrom = replyToMessage && isRecord(replyToMessage.from) ? replyToMessage.from : null;

  return {
    updateId,
    message: {
      messageId,
      chatId,
      chatType,
      chatTitle: normalizeOptionalString(chatRecord?.title),
      senderId: normalizeIdentifier(from?.id),
      senderIsBot: from?.is_bot === true,
      senderDisplayName: resolveSenderDisplayName(from),
      threadId: normalizeIdentifier(messageRecord.message_thread_id),
      dateIso,
      text:
        typeof messageRecord.text === "string"
          ? messageRecord.text
          : typeof messageRecord.caption === "string"
            ? messageRecord.caption
            : "",
      entities,
      replyToSenderId: normalizeIdentifier(replyToFrom?.id),
      replyToSenderIsBot: replyToFrom?.is_bot === true,
      raw: messageRecord,
    },
    raw: value,
  };
};

const selectMessageRecord = (value: Record<string, unknown>): Record<string, unknown> | null => {
  const keys = ["message", "edited_message", "channel_post", "edited_channel_post"];
  for (const key of keys) {
    const candidate = value[key];
    if (isRecord(candidate)) {
      return candidate;
    }
  }
  return null;
};

const resolveMentionFlags = (
  message: TelegramUpdateMessage,
  peerType: ExternalPeerType,
): { mentioned: boolean; mentionsAgent: boolean } => {
  if (peerType !== ExternalPeerType.GROUP) {
    return {
      mentioned: true,
      mentionsAgent: true,
    };
  }

  const mentionsInEntities = message.entities.some((entity) =>
    ["mention", "text_mention", "bot_command"].includes(entity.type),
  );
  const mentionsByReply = message.replyToSenderIsBot;
  const mentioned = mentionsInEntities || mentionsByReply;

  return {
    mentioned,
    mentionsAgent: mentioned,
  };
};

const resolveDisplayName = (
  message: TelegramUpdateMessage,
  peerType: ExternalPeerType,
): string | null => {
  if (peerType === ExternalPeerType.GROUP) {
    return message.chatTitle ?? message.senderDisplayName;
  }
  return message.senderDisplayName;
};

const resolveOutboundChunks = (payload: ExternalOutboundEnvelope): string[] => {
  const rawChunks =
    payload.chunks.length > 0
      ? payload.chunks.map((chunk) => chunk.text)
      : [payload.replyText];
  return rawChunks.map((chunk) => chunk.trim()).filter((chunk) => chunk.length > 0);
};

const normalizeEntities = (
  value: unknown,
): TelegramUpdateMessage["entities"] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry) => isRecord(entry))
    .map((entry) => normalizeOptionalString(entry.type))
    .filter((type): type is string => Boolean(type))
    .map((type) => ({
      type,
      offset: null,
      length: null,
      userId: null,
    }));
};

const isGroupChat = (chatType: string): boolean =>
  ["group", "supergroup", "channel"].includes(chatType.toLowerCase());

const normalizeDateIso = (value: unknown): string => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(Math.trunc(value) * 1000).toISOString();
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return new Date().toISOString();
};

const resolveSenderDisplayName = (from: Record<string, unknown> | null): string | null => {
  if (!from) {
    return null;
  }
  const firstName = normalizeOptionalString(from.first_name);
  const lastName = normalizeOptionalString(from.last_name);
  const username = normalizeOptionalString(from.username);

  const fullName = [firstName, lastName].filter((part) => Boolean(part)).join(" ").trim();
  if (fullName.length > 0) {
    return fullName;
  }
  return username;
};

const normalizeIdentifier = (value: unknown): string | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return null;
};

const normalizeRequiredString = (value: unknown, field: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string.`);
  }
  return value.trim();
};

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

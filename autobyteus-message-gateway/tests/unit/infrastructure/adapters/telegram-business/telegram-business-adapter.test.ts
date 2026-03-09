import { describe, expect, it, vi } from "vitest";
import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { TelegramBusinessAdapter } from "../../../../../src/infrastructure/adapters/telegram-business/telegram-business-adapter.js";
import type {
  TelegramSendMessageInput,
  TelegramSendMessageResult,
  TelegramUpdate,
} from "../../../../../src/infrastructure/adapters/telegram-business/telegram-bot-client.js";
import { TelegramBotClientError } from "../../../../../src/infrastructure/adapters/telegram-business/telegram-bot-client.js";

class FakeTelegramBotClient {
  private readonly updateHandlers = new Set<(update: TelegramUpdate) => Promise<void>>();
  private readonly disconnectedHandlers = new Set<(reason: string) => void>();
  readonly startPolling = vi.fn(async () => undefined);
  readonly stopPolling = vi.fn(async () => undefined);
  readonly sendMessage = vi.fn(async (_input: TelegramSendMessageInput): Promise<TelegramSendMessageResult> => ({
    providerMessageId: "msg-1",
    deliveredAt: "2026-02-13T00:00:00.000Z",
    metadata: {},
  }));

  onUpdate(handler: (update: TelegramUpdate) => Promise<void>): () => void {
    this.updateHandlers.add(handler);
    return () => {
      this.updateHandlers.delete(handler);
    };
  }

  onDisconnected(handler: (reason: string) => void): () => void {
    this.disconnectedHandlers.add(handler);
    return () => {
      this.disconnectedHandlers.delete(handler);
    };
  }

  async emitUpdate(update: TelegramUpdate): Promise<void> {
    for (const handler of this.updateHandlers) {
      await handler(update);
    }
  }

  emitDisconnected(reason: string): void {
    for (const handler of this.disconnectedHandlers) {
      handler(reason);
    }
  }
}

describe("TelegramBusinessAdapter", () => {
  it("starts and stops polling lifecycle when polling is enabled", async () => {
    const botClient = new FakeTelegramBotClient();
    const adapter = new TelegramBusinessAdapter({
      accountId: "telegram-acct-1",
      pollingEnabled: true,
      webhookEnabled: false,
      botClient,
    });

    await adapter.start();
    await adapter.stop();

    expect(botClient.startPolling).toHaveBeenCalledOnce();
    expect(botClient.stopPolling).toHaveBeenCalledOnce();
  });

  it("maps polling updates to canonical envelopes and peer discovery observations", async () => {
    const observedAt = new Date().toISOString();
    const botClient = new FakeTelegramBotClient();
    const adapter = new TelegramBusinessAdapter({
      accountId: "telegram-acct-1",
      pollingEnabled: true,
      webhookEnabled: false,
      botClient,
    });

    const received: ExternalMessageEnvelope[] = [];
    adapter.subscribeInbound(async (envelope) => {
      received.push(envelope);
    });

    await botClient.emitUpdate({
      updateId: "5001",
      message: {
        messageId: "7001",
        chatId: "-100123",
        chatType: "supergroup",
        chatTitle: "Engineering",
        senderId: "445566",
        senderIsBot: false,
        senderDisplayName: "Alice",
        threadId: "11",
        dateIso: observedAt,
        text: "hello team",
        entities: [],
        replyToSenderId: null,
        replyToSenderIsBot: false,
        raw: {},
      },
      raw: {},
    });

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      provider: "TELEGRAM",
      transport: "BUSINESS_API",
      accountId: "telegram-acct-1",
      peerId: "-100123",
      peerType: "GROUP",
      threadId: "11",
      externalMessageId: "update:5001",
      content: "hello team",
      metadata: {
        mentioned: false,
        mentionsAgent: false,
      },
    });

    const peers = await adapter.listPeerCandidates({
      includeGroups: true,
      limit: 10,
    });
    expect(peers.items).toEqual([
      expect.objectContaining({
        peerId: "-100123",
        peerType: "GROUP",
      }),
    ]);
  });

  it("validates Telegram webhook secret token and parses webhook payload", () => {
    const adapter = new TelegramBusinessAdapter({
      accountId: "telegram-acct-1",
      pollingEnabled: false,
      webhookEnabled: true,
      webhookSecretToken: "secret-token",
      botClient: new FakeTelegramBotClient(),
    });

    const validSignature = adapter.verifyInboundSignature(
      {
        method: "POST",
        path: "/webhooks/telegram",
        headers: {
          "x-telegram-bot-api-secret-token": "secret-token",
        },
        query: {},
        body: {},
        rawBody: "{}",
      },
      "{}",
    );
    expect(validSignature).toMatchObject({
      valid: true,
    });

    const envelopes = adapter.parseInbound({
      method: "POST",
      path: "/webhooks/telegram",
      headers: {
        "x-telegram-bot-api-secret-token": "secret-token",
      },
      query: {},
      body: {
        update_id: 5001,
        message: {
          message_id: 7001,
          date: 1739404800,
          text: "hello webhook",
          chat: {
            id: 100200300,
            type: "private",
          },
          from: {
            id: 445566,
            is_bot: false,
            first_name: "Alice",
          },
        },
      },
      rawBody: "{}",
    });

    expect(envelopes).toHaveLength(1);
    expect(envelopes[0]).toMatchObject({
      provider: "TELEGRAM",
      accountId: "telegram-acct-1",
      peerId: "100200300",
      peerType: "USER",
    });
  });

  it("maps outbound chunks through Telegram send API and rejects account mismatch", async () => {
    const botClient = new FakeTelegramBotClient();
    botClient.sendMessage.mockImplementation(async ({ text }) => ({
      providerMessageId: `provider-${text}`,
      deliveredAt: "2026-02-13T00:01:00.000Z",
      metadata: {},
    }));

    const adapter = new TelegramBusinessAdapter({
      accountId: "telegram-acct-1",
      pollingEnabled: false,
      webhookEnabled: true,
      webhookSecretToken: "secret-token",
      botClient,
    });

    const result = await adapter.sendOutbound(
      buildOutboundPayload({
        accountId: "telegram-acct-1",
        peerId: "100200300",
        threadId: "11",
        chunks: [
          { index: 0, text: "chunk-1" },
          { index: 1, text: "chunk-2" },
        ],
      }),
    );

    expect(botClient.sendMessage).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      providerMessageId: "provider-chunk-2",
      metadata: {
        chunkCount: 2,
        providerMessageIds: ["provider-chunk-1", "provider-chunk-2"],
      },
    });

    await expect(
      adapter.sendOutbound(
        buildOutboundPayload({
          accountId: "telegram-acct-2",
          peerId: "100200300",
          threadId: null,
        }),
      ),
    ).rejects.toMatchObject({
      code: "ACCOUNT_NOT_CONFIGURED",
      retryable: false,
    });
  });

  it("preserves retryable classification from Telegram bot client errors", async () => {
    const botClient = new FakeTelegramBotClient();
    botClient.sendMessage.mockImplementation(async () => {
      throw new TelegramBotClientError({
        code: "RATE_LIMITED",
        detail: "rate limited",
        retryable: true,
      });
    });

    const adapter = new TelegramBusinessAdapter({
      accountId: "telegram-acct-1",
      pollingEnabled: false,
      webhookEnabled: true,
      webhookSecretToken: "secret-token",
      botClient,
    });

    await expect(
      adapter.sendOutbound(
        buildOutboundPayload({
          accountId: "telegram-acct-1",
          peerId: "100200300",
          threadId: null,
        }),
      ),
    ).rejects.toMatchObject({
      code: "RATE_LIMITED",
      retryable: true,
    });
  });
});

const buildOutboundPayload = (overrides: {
  accountId: string;
  peerId: string;
  threadId: string | null;
  replyText?: string;
  chunks?: Array<{ index: number; text: string }>;
}): ExternalOutboundEnvelope => {
  return {
    provider: ExternalChannelProvider.TELEGRAM,
    transport: ExternalChannelTransport.BUSINESS_API,
    accountId: overrides.accountId,
    peerId: overrides.peerId,
    threadId: overrides.threadId,
    correlationMessageId: "corr-1",
    callbackIdempotencyKey: "callback-key-1",
    replyText: overrides.replyText ?? "fallback",
    attachments: [],
    chunks: overrides.chunks ?? [],
    metadata: {},
  };
};

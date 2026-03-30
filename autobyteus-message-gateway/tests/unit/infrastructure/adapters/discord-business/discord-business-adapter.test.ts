import { describe, expect, it, vi } from "vitest";
import type { ExternalMessageEnvelope } from "autobyteus-ts/external-channel/external-message-envelope.js";
import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
import type { DiscordGatewayMessageCreateEvent } from "../../../../../src/infrastructure/adapters/discord-business/discord-gateway-client.js";
import { DiscordBusinessAdapter } from "../../../../../src/infrastructure/adapters/discord-business/discord-business-adapter.js";
import { DiscordRestClientError } from "../../../../../src/infrastructure/adapters/discord-business/discord-rest-client.js";

class FakeGatewayClient {
  private readonly handlers = new Set<(event: DiscordGatewayMessageCreateEvent) => Promise<void>>();
  readonly connect = vi.fn(async () => undefined);
  readonly disconnect = vi.fn(async () => undefined);

  onMessageCreate(
    handler: (event: DiscordGatewayMessageCreateEvent) => Promise<void>,
  ): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  async emitMessageCreate(event: DiscordGatewayMessageCreateEvent): Promise<void> {
    for (const handler of this.handlers) {
      await handler(event);
    }
  }
}

describe("DiscordBusinessAdapter", () => {
  it("starts and stops gateway lifecycle", async () => {
    const gatewayClient = new FakeGatewayClient();
    const adapter = new DiscordBusinessAdapter({
      botToken: "bot-token",
      accountId: "discord-acct-1",
      gatewayClient,
      restClient: {
        sendMessage: vi.fn(),
      },
    });

    await adapter.start();
    await adapter.stop();

    expect(gatewayClient.connect).toHaveBeenCalledOnce();
    expect(gatewayClient.disconnect).toHaveBeenCalledOnce();
  });

  it("maps inbound gateway DM events into canonical envelopes", async () => {
    const gatewayClient = new FakeGatewayClient();
    const adapter = new DiscordBusinessAdapter({
      botToken: "bot-token",
      accountId: "discord-acct-1",
      gatewayClient,
      restClient: {
        sendMessage: vi.fn(),
      },
    });

    const received: ExternalMessageEnvelope[] = [];
    adapter.subscribeInbound(async (envelope) => {
      received.push(envelope);
    });

    await gatewayClient.emitMessageCreate({
      id: "msg-1",
      authorId: "111222333",
      authorDisplayName: "Alice",
      authorIsBot: false,
      channelId: "777888999",
      guildId: null,
      threadId: null,
      content: "hello from dm",
      timestamp: "2026-02-10T12:00:00.000Z",
      mentioned: true,
      mentionsAgent: true,
      attachments: [],
      raw: {},
    });

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      provider: "DISCORD",
      transport: "BUSINESS_API",
      accountId: "discord-acct-1",
      peerId: "user:111222333",
      peerType: "USER",
      externalMessageId: "msg-1",
      content: "hello from dm",
      threadId: null,
      metadata: {
        mentioned: true,
        mentionsAgent: true,
        channelId: "777888999",
        guildId: null,
      },
    });
  });

  it("records inbound observations and lists Discord peer candidates", async () => {
    const observedAt = new Date().toISOString();
    const gatewayClient = new FakeGatewayClient();
    const adapter = new DiscordBusinessAdapter({
      botToken: "bot-token",
      accountId: "discord-acct-1",
      gatewayClient,
      restClient: {
        sendMessage: vi.fn(),
      },
    });

    await gatewayClient.emitMessageCreate({
      id: "msg-1",
      authorId: "111222333",
      authorDisplayName: "Alice",
      authorIsBot: false,
      channelId: "777888999",
      guildId: null,
      threadId: null,
      content: "hello from dm",
      timestamp: observedAt,
      mentioned: true,
      mentionsAgent: true,
      attachments: [],
      raw: {},
    });

    const result = await adapter.listPeerCandidates({
      includeGroups: true,
      limit: 10,
    });

    expect(result.accountId).toBe("discord-acct-1");
    expect(result.items).toEqual([
      {
        peerId: "user:111222333",
        peerType: "USER",
        threadId: null,
        displayName: "Alice",
        lastMessageAt: observedAt,
      },
    ]);
  });

  it("drops unresolved thread-origin events before envelope/discovery mutation", async () => {
    const gatewayClient = new FakeGatewayClient();
    const adapter = new DiscordBusinessAdapter({
      botToken: "bot-token",
      accountId: "discord-acct-1",
      gatewayClient,
      restClient: {
        sendMessage: vi.fn(),
      },
    });

    const received: ExternalMessageEnvelope[] = [];
    adapter.subscribeInbound(async (envelope) => {
      received.push(envelope);
    });

    await gatewayClient.emitMessageCreate({
      id: "msg-thread-1",
      authorId: "111222333",
      authorDisplayName: "Alice",
      authorIsBot: false,
      channelId: "thread-chan-1",
      guildId: "guild-1",
      threadId: "thread-chan-1",
      content: "thread message",
      timestamp: "2026-02-10T12:00:00.000Z",
      mentioned: true,
      mentionsAgent: true,
      attachments: [],
      raw: {},
    });

    expect(received).toHaveLength(0);
    const discovery = await adapter.listPeerCandidates({
      includeGroups: true,
      limit: 10,
    });
    expect(discovery.items).toHaveLength(0);
  });

  it("maps thread-origin events to canonical parent/thread tuple", async () => {
    const gatewayClient = new FakeGatewayClient();
    const adapter = new DiscordBusinessAdapter({
      botToken: "bot-token",
      accountId: "discord-acct-1",
      gatewayClient,
      restClient: {
        sendMessage: vi.fn(),
      },
    });

    const received: ExternalMessageEnvelope[] = [];
    adapter.subscribeInbound(async (envelope) => {
      received.push(envelope);
    });

    await gatewayClient.emitMessageCreate({
      id: "msg-thread-2",
      authorId: "111222333",
      authorDisplayName: "Alice",
      authorIsBot: false,
      channelId: "777888990",
      guildId: "guild-1",
      threadId: "777888991",
      content: "thread message",
      timestamp: "2026-02-10T12:00:00.000Z",
      mentioned: true,
      mentionsAgent: true,
      attachments: [],
      raw: {
        parent_id: "777888992",
      },
    });

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      peerId: "channel:777888992",
      threadId: "777888991",
    });
  });

  it("sends outbound channel message chunks through Discord REST client", async () => {
    const gatewayClient = new FakeGatewayClient();
    const sendMessage = vi.fn(async () => ({
      providerMessageId: "discord-out-1",
      deliveredAt: "2026-02-10T12:01:00.000Z",
      metadata: {
        source: "fake-rest",
      },
    }));
    const adapter = new DiscordBusinessAdapter({
      botToken: "bot-token",
      accountId: "discord-acct-1",
      gatewayClient,
      restClient: {
        sendMessage,
      },
    });

    const result = await adapter.sendOutbound(buildOutboundPayload({
      accountId: "discord-acct-1",
      peerId: "channel:999888777",
      threadId: "1212121212",
      chunks: [
        { index: 0, text: "chunk-1" },
        { index: 1, text: "chunk-2" },
      ],
      replyText: "fallback-text",
    }));

    expect(sendMessage).toHaveBeenCalledOnce();
    expect(sendMessage).toHaveBeenCalledWith({
      target: {
        targetType: "CHANNEL",
        channelId: "999888777",
        threadId: "1212121212",
      },
      chunks: ["chunk-1", "chunk-2"],
    });
    expect(result).toEqual({
      providerMessageId: "discord-out-1",
      deliveredAt: "2026-02-10T12:01:00.000Z",
      metadata: {
        source: "fake-rest",
        chunkCount: 2,
      },
    });
  });

  it("rejects outbound account mismatch with non-retryable typed error", async () => {
    const sendMessage = vi.fn();
    const adapter = new DiscordBusinessAdapter({
      botToken: "bot-token",
      accountId: "discord-acct-configured",
      gatewayClient: new FakeGatewayClient(),
      restClient: {
        sendMessage,
      },
    });

    await expect(
      adapter.sendOutbound(
        buildOutboundPayload({
          accountId: "discord-acct-other",
          peerId: "channel:999888777",
          threadId: null,
        }),
      ),
    ).rejects.toMatchObject({
      code: "ACCOUNT_NOT_CONFIGURED",
      retryable: false,
    });
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("rejects malformed outbound peerId before REST send", async () => {
    const sendMessage = vi.fn();
    const adapter = new DiscordBusinessAdapter({
      botToken: "bot-token",
      accountId: "discord-acct-1",
      gatewayClient: new FakeGatewayClient(),
      restClient: {
        sendMessage,
      },
    });

    await expect(
      adapter.sendOutbound(
        buildOutboundPayload({
          accountId: "discord-acct-1",
          peerId: "bad-peer",
          threadId: null,
        }),
      ),
    ).rejects.toMatchObject({
      code: "INVALID_DISCORD_PEER_ID",
      retryable: false,
    });
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("rejects invalid user+thread pairing before REST send", async () => {
    const sendMessage = vi.fn();
    const adapter = new DiscordBusinessAdapter({
      botToken: "bot-token",
      accountId: "discord-acct-1",
      gatewayClient: new FakeGatewayClient(),
      restClient: {
        sendMessage,
      },
    });

    await expect(
      adapter.sendOutbound(
        buildOutboundPayload({
          accountId: "discord-acct-1",
          peerId: "user:111222333",
          threadId: "555666777",
        }),
      ),
    ).rejects.toMatchObject({
      code: "INVALID_DISCORD_THREAD_TARGET_COMBINATION",
      retryable: false,
    });
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("preserves retryable classification from Discord REST errors", async () => {
    const adapter = new DiscordBusinessAdapter({
      botToken: "bot-token",
      accountId: "discord-acct-1",
      gatewayClient: new FakeGatewayClient(),
      restClient: {
        sendMessage: vi.fn(async () => {
          throw new DiscordRestClientError({
            code: "RATE_LIMITED",
            detail: "rate limited",
            retryable: true,
          });
        }),
      },
    });

    await expect(
      adapter.sendOutbound(
        buildOutboundPayload({
          accountId: "discord-acct-1",
          peerId: "channel:111222333",
          threadId: null,
        }),
      ),
    ).rejects.toMatchObject({
      code: "RATE_LIMITED",
      retryable: true,
    });
  });
});

const buildOutboundPayload = (
  overrides: Partial<ExternalOutboundEnvelope>,
): ExternalOutboundEnvelope =>
  ({
    provider: "DISCORD",
    transport: "BUSINESS_API",
    accountId: "discord-acct-1",
    peerId: "channel:111222333",
    threadId: null,
    correlationMessageId: "corr-1",
    callbackIdempotencyKey: "cb-1",
    replyText: "done",
    attachments: [],
    chunks: [],
    metadata: {},
    ...overrides,
  }) as ExternalOutboundEnvelope;

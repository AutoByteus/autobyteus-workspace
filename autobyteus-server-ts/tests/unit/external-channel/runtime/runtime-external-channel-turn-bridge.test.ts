import { describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { ExternalPeerType } from "autobyteus-ts/external-channel/peer-type.js";
import { createChannelRoutingKey } from "autobyteus-ts/external-channel/channel-routing-key.js";
import { RuntimeExternalChannelTurnBridge } from "../../../../src/external-channel/runtime/runtime-external-channel-turn-bridge.js";

const createEnvelope = () => ({
  provider: ExternalChannelProvider.TELEGRAM,
  transport: ExternalChannelTransport.BUSINESS_API,
  accountId: "autobyteus",
  peerId: "8438880216",
  peerType: ExternalPeerType.USER,
  threadId: null,
  externalMessageId: "update:1",
  content: "hello",
  attachments: [],
  receivedAt: "2026-03-09T18:54:00.000Z",
  metadata: {},
  routingKey: createChannelRoutingKey({
    provider: ExternalChannelProvider.TELEGRAM,
    transport: ExternalChannelTransport.BUSINESS_API,
    accountId: "autobyteus",
    peerId: "8438880216",
    threadId: null,
  }),
});

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("RuntimeExternalChannelTurnBridge", () => {
  it("binds accepted Codex turns and publishes the provider callback on turn completion", async () => {
    const bindTurnToReceipt = vi.fn().mockResolvedValue(undefined);
    const publishAssistantReplyByTurn = vi.fn().mockResolvedValue({
      published: true,
      duplicate: false,
      reason: null,
      envelope: {
        provider: ExternalChannelProvider.TELEGRAM,
        transport: ExternalChannelTransport.BUSINESS_API,
        accountId: "autobyteus",
        peerId: "8438880216",
        threadId: null,
        correlationMessageId: "update:1",
        callbackIdempotencyKey: "external-reply:run-1:turn-1",
        replyText: "Hello back",
        attachments: [],
        chunks: [],
        metadata: {},
      },
    });
    let listener: ((event: unknown) => void) | null = null;
    const unsubscribe = vi.fn();
    const bridge = new RuntimeExternalChannelTurnBridge({
      messageReceiptService: { bindTurnToReceipt },
      replyCallbackService: { publishAssistantReplyByTurn },
      adapterRegistry: {
        resolveAdapter: vi.fn().mockReturnValue({
          subscribeToRunEvents: vi.fn((_runId: string, onEvent: (event: unknown) => void) => {
            listener = onEvent;
            return unsubscribe;
          }),
        }),
      },
      runProjectionService: {
        getProjection: vi.fn(),
      },
    });

    await bridge.bindAcceptedExternalTurn({
      runId: "run-1",
      runtimeKind: "codex_app_server",
      turnId: "turn-1",
      envelope: createEnvelope(),
    });

    expect(bindTurnToReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        agentRunId: "run-1",
        turnId: "turn-1",
        externalMessageId: "update:1",
      }),
    );

    listener?.({
      method: "item/output_text/completed",
      params: {
        turnId: "turn-1",
        text: "Hello back",
      },
    });
    listener?.({
      method: "turn.completed",
      params: {
        turnId: "turn-1",
      },
    });
    await flush();

    expect(publishAssistantReplyByTurn).toHaveBeenCalledWith({
      agentRunId: "run-1",
      turnId: "turn-1",
      replyText: "Hello back",
      callbackIdempotencyKey: "external-reply:run-1:turn-1",
    });
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("falls back to the latest assistant projection when runtime text events do not include final text", async () => {
    const bindTurnToReceipt = vi.fn().mockResolvedValue(undefined);
    const publishAssistantReplyByTurn = vi.fn().mockResolvedValue({
      published: true,
      duplicate: false,
      reason: null,
      envelope: null,
    });
    let listener: ((event: unknown) => void) | null = null;
    const bridge = new RuntimeExternalChannelTurnBridge({
      messageReceiptService: { bindTurnToReceipt },
      replyCallbackService: { publishAssistantReplyByTurn },
      adapterRegistry: {
        resolveAdapter: vi.fn().mockReturnValue({
          subscribeToRunEvents: vi.fn((_runId: string, onEvent: (event: unknown) => void) => {
            listener = onEvent;
            return vi.fn();
          }),
        }),
      },
      runProjectionService: {
        getProjection: vi.fn().mockResolvedValue({
          runId: "run-2",
          summary: null,
          lastActivityAt: null,
          conversation: [
            { kind: "message", role: "user", content: "hello" },
            {
              kind: "message",
              role: "assistant",
              content: "Projection reply\n\n[reasoning]\ninternal",
            },
          ],
        }),
      },
    });

    await bridge.bindAcceptedExternalTurn({
      runId: "run-2",
      runtimeKind: "claude_agent_sdk",
      turnId: "turn-2",
      envelope: createEnvelope(),
    });

    listener?.({
      method: "turn/completed",
      params: {
        turnId: "turn-2",
      },
    });
    await flush();

    expect(publishAssistantReplyByTurn).toHaveBeenCalledWith({
      agentRunId: "run-2",
      turnId: "turn-2",
      replyText: "Projection reply",
      callbackIdempotencyKey: "external-reply:run-2:turn-2",
    });
  });

  it("resolves the reply callback service lazily when the runtime reply is ready", async () => {
    const bindTurnToReceipt = vi.fn().mockResolvedValue(undefined);
    const publishAssistantReplyByTurn = vi.fn().mockResolvedValue({
      published: true,
      duplicate: false,
      reason: null,
      envelope: null,
    });
    const replyCallbackServiceFactory = vi.fn(() => ({
      publishAssistantReplyByTurn,
    }));
    let listener: ((event: unknown) => void) | null = null;
    const bridge = new RuntimeExternalChannelTurnBridge({
      messageReceiptService: { bindTurnToReceipt },
      replyCallbackServiceFactory,
      adapterRegistry: {
        resolveAdapter: vi.fn().mockReturnValue({
          subscribeToRunEvents: vi.fn((_runId: string, onEvent: (event: unknown) => void) => {
            listener = onEvent;
            return vi.fn();
          }),
        }),
      },
      runProjectionService: {
        getProjection: vi.fn().mockResolvedValue({
          runId: "run-3",
          summary: null,
          lastActivityAt: null,
          conversation: [
            {
              kind: "message",
              role: "assistant",
              content: "Hello after startup",
            },
          ],
        }),
      },
    });

    await bridge.bindAcceptedExternalTurn({
      runId: "run-3",
      runtimeKind: "codex_app_server",
      turnId: "turn-3",
      envelope: createEnvelope(),
    });

    expect(replyCallbackServiceFactory).not.toHaveBeenCalled();

    listener?.({
      method: "turn/completed",
      params: {
        turnId: "turn-3",
      },
    });
    await flush();

    expect(replyCallbackServiceFactory).toHaveBeenCalledOnce();
    expect(publishAssistantReplyByTurn).toHaveBeenCalledWith({
      agentRunId: "run-3",
      turnId: "turn-3",
      replyText: "Hello after startup",
      callbackIdempotencyKey: "external-reply:run-3:turn-3",
    });
  });
});

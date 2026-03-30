import { describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { ExternalPeerType } from "autobyteus-ts/external-channel/peer-type.js";
import { createChannelRoutingKey } from "autobyteus-ts/external-channel/channel-routing-key.js";
import { AgentRunEventType } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { ChannelAgentRunReplyBridge } from "../../../../src/external-channel/runtime/channel-agent-run-reply-bridge.js";

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

describe("ChannelAgentRunReplyBridge", () => {
  it("publishes provider callbacks for unified agent events", async () => {
    const bindTurnToReceipt = vi.fn().mockResolvedValue(undefined);
    const publishAssistantReplyByTurn = vi.fn().mockResolvedValue({
      published: true,
      duplicate: false,
      reason: null,
      envelope: null,
    });
    let listener: ((event: unknown) => void) | null = null;
    const bridge = new ChannelAgentRunReplyBridge({
      messageReceiptService: { bindTurnToReceipt },
      replyCallbackService: { publishAssistantReplyByTurn },
      runProjectionService: {
        getProjection: vi.fn(),
      },
    });

    await bridge.bindAcceptedExternalTurn({
      run: {
        runId: "run-autobyteus",
        subscribeToEvents: (onEvent: (event: unknown) => void) => {
          listener = onEvent;
          return vi.fn();
        },
      },
      turnId: "turn-auto-1",
      envelope: createEnvelope(),
    });

    listener?.({
      runId: "run-autobyteus",
      eventType: AgentRunEventType.SEGMENT_END,
      payload: {
        turnId: "turn-auto-1",
        text: "AutoByteus reply",
        segment_type: "text",
      },
      statusHint: null,
    });
    listener?.({
      runId: "run-autobyteus",
      eventType: AgentRunEventType.AGENT_STATUS,
      payload: {
        new_status: "IDLE",
        old_status: "RUNNING",
      },
      statusHint: "IDLE",
    });
    await flush();

    expect(publishAssistantReplyByTurn).toHaveBeenCalledWith({
      agentRunId: "run-autobyteus",
      teamRunId: null,
      turnId: "turn-auto-1",
      replyText: "AutoByteus reply",
      callbackIdempotencyKey: "external-reply:run-autobyteus:turn-auto-1",
    });
  });

  it("publishes provider callbacks for later source-linked turns without a fresh inbound envelope", async () => {
    const bindTurnToReceipt = vi.fn().mockResolvedValue(undefined);
    const publishAssistantReplyByTurn = vi.fn().mockResolvedValue({
      published: true,
      duplicate: false,
      reason: null,
      envelope: null,
    });
    let listener: ((event: unknown) => void) | null = null;
    const bridge = new ChannelAgentRunReplyBridge({
      messageReceiptService: { bindTurnToReceipt },
      replyCallbackService: { publishAssistantReplyByTurn },
      runProjectionService: {
        getProjection: vi.fn(),
      },
    });

    await bridge.bindAcceptedTurnToSource({
      run: {
        runId: "run-follow-up",
        subscribeToEvents: (onEvent: (event: unknown) => void) => {
          listener = onEvent;
          return vi.fn();
        },
      },
      teamRunId: "team-1",
      turnId: "turn-follow-up",
      source: {
        provider: ExternalChannelProvider.TELEGRAM,
        transport: ExternalChannelTransport.BUSINESS_API,
        accountId: "autobyteus",
        peerId: "8438880216",
        threadId: null,
        externalMessageId: "update:1",
        receivedAt: new Date("2026-03-11T11:30:00.000Z"),
      },
    });

    listener?.({
      runId: "run-follow-up",
      eventType: AgentRunEventType.SEGMENT_END,
      payload: {
        turnId: "turn-follow-up",
        text: "Follow-up reply to Telegram",
        segment_type: "text",
      },
      statusHint: null,
    });
    listener?.({
      runId: "run-follow-up",
      eventType: AgentRunEventType.AGENT_STATUS,
      payload: {
        new_status: "IDLE",
        old_status: "RUNNING",
      },
      statusHint: "IDLE",
    });
    await flush();

    expect(bindTurnToReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        agentRunId: "run-follow-up",
        teamRunId: "team-1",
        turnId: "turn-follow-up",
        externalMessageId: "update:1",
      }),
    );
    expect(publishAssistantReplyByTurn).toHaveBeenCalledWith({
      agentRunId: "run-follow-up",
      teamRunId: "team-1",
      turnId: "turn-follow-up",
      replyText: "Follow-up reply to Telegram",
      callbackIdempotencyKey: "external-reply:run-follow-up:turn-follow-up",
    });
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
    const bridge = new ChannelAgentRunReplyBridge({
      messageReceiptService: { bindTurnToReceipt },
      replyCallbackService: { publishAssistantReplyByTurn },
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
      run: {
        runId: "run-2",
        subscribeToEvents: (onEvent: (event: unknown) => void) => {
          listener = onEvent;
          return vi.fn();
        },
      },
      turnId: "turn-2",
      envelope: createEnvelope(),
    });

    listener?.({
      runId: "run-2",
      eventType: AgentRunEventType.AGENT_STATUS,
      payload: {
        new_status: "IDLE",
        old_status: "RUNNING",
        turnId: "turn-2",
      },
      statusHint: "IDLE",
    });
    await flush();

    expect(publishAssistantReplyByTurn).toHaveBeenCalledWith({
      agentRunId: "run-2",
      teamRunId: null,
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
    const bridge = new ChannelAgentRunReplyBridge({
      messageReceiptService: { bindTurnToReceipt },
      replyCallbackServiceFactory,
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
      run: {
        runId: "run-3",
        subscribeToEvents: (onEvent: (event: unknown) => void) => {
          listener = onEvent;
          return vi.fn();
        },
      },
      turnId: "turn-3",
      envelope: createEnvelope(),
    });

    expect(replyCallbackServiceFactory).not.toHaveBeenCalled();

    listener?.({
      runId: "run-3",
      eventType: AgentRunEventType.AGENT_STATUS,
      payload: {
        new_status: "IDLE",
        old_status: "RUNNING",
        turnId: "turn-3",
      },
      statusHint: "IDLE",
    });
    await flush();

    expect(replyCallbackServiceFactory).toHaveBeenCalledOnce();
    expect(publishAssistantReplyByTurn).toHaveBeenCalledWith({
      agentRunId: "run-3",
      teamRunId: null,
      turnId: "turn-3",
      replyText: "Hello after startup",
      callbackIdempotencyKey: "external-reply:run-3:turn-3",
    });
  });
});

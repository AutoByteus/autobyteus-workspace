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

describe("ChannelAgentRunReplyBridge", () => {
  it("resolves a streamed agent reply for the accepted turn", async () => {
    let listener: ((event: unknown) => void) | null = null;
    const bridge = new ChannelAgentRunReplyBridge({
      turnReplyRecoveryService: {
        resolveReplyText: vi.fn(),
      },
    });

    const observation = bridge.observeAcceptedExternalTurn({
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

    await expect(observation).resolves.toEqual({
      status: "REPLY_READY",
      reply: expect.objectContaining({
        agentRunId: "run-autobyteus",
        teamRunId: null,
        turnId: "turn-auto-1",
        replyText: "AutoByteus reply",
      }),
    });
  });

  it("resolves a streamed agent reply when segment events expose turn_id", async () => {
    let listener: ((event: unknown) => void) | null = null;
    const bridge = new ChannelAgentRunReplyBridge({
      turnReplyRecoveryService: {
        resolveReplyText: vi.fn(),
      },
    });

    const observation = bridge.observeAcceptedExternalTurn({
      run: {
        runId: "run-autobyteus-agent-turn",
        subscribeToEvents: (onEvent: (event: unknown) => void) => {
          listener = onEvent;
          return vi.fn();
        },
      },
      turnId: "turn-1",
      envelope: createEnvelope(),
    });

    listener?.({
      runId: "run-autobyteus-agent-turn",
      eventType: AgentRunEventType.SEGMENT_END,
      payload: {
        turn_id: "turn-1",
        text: "Agent turn reply",
        segment_type: "text",
      },
      statusHint: null,
    });
    listener?.({
      runId: "run-autobyteus-agent-turn",
      eventType: AgentRunEventType.AGENT_STATUS,
      payload: {
        new_status: "IDLE",
        old_status: "RUNNING",
      },
      statusHint: "IDLE",
    });

    await expect(observation).resolves.toEqual({
      status: "REPLY_READY",
      reply: expect.objectContaining({
        agentRunId: "run-autobyteus-agent-turn",
        teamRunId: null,
        turnId: "turn-1",
        replyText: "Agent turn reply",
      }),
    });
  });

  it("keeps a linked source context for follow-up turns", async () => {
    let listener: ((event: unknown) => void) | null = null;
    const bridge = new ChannelAgentRunReplyBridge({
      turnReplyRecoveryService: {
        resolveReplyText: vi.fn(),
      },
    });

    const observation = bridge.observeAcceptedTurnToSource({
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

    await expect(observation).resolves.toEqual({
      status: "REPLY_READY",
      reply: expect.objectContaining({
        agentRunId: "run-follow-up",
        teamRunId: "team-1",
        turnId: "turn-follow-up",
        replyText: "Follow-up reply to Telegram",
        source: expect.objectContaining({
          externalMessageId: "update:1",
        }),
      }),
    });
  });

  it("falls back to persisted turn recovery when runtime events do not include text", async () => {
    let listener: ((event: unknown) => void) | null = null;
    const resolveReplyText = vi.fn().mockResolvedValue("Recovered reply");
    const bridge = new ChannelAgentRunReplyBridge({
      turnReplyRecoveryService: {
        resolveReplyText,
      },
    });

    const observation = bridge.observeAcceptedExternalTurn({
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

    await expect(observation).resolves.toEqual({
      status: "REPLY_READY",
      reply: expect.objectContaining({
        agentRunId: "run-2",
        teamRunId: null,
        turnId: "turn-2",
        replyText: "Recovered reply",
      }),
    });
    expect(resolveReplyText).toHaveBeenCalledWith({
      agentRunId: "run-2",
      teamRunId: null,
      turnId: "turn-2",
    });
  });

  it("closes immediately when the accepted turnId is missing", async () => {
    const bridge = new ChannelAgentRunReplyBridge({
      turnReplyRecoveryService: {
        resolveReplyText: vi.fn(),
      },
    });

    await expect(
      bridge.observeAcceptedExternalTurn({
        run: {
          runId: "run-missing",
          subscribeToEvents: () => vi.fn(),
        },
        turnId: null,
        envelope: createEnvelope(),
      }),
    ).resolves.toEqual({
      status: "CLOSED",
      reason: "TURN_ID_MISSING",
    });
  });
});

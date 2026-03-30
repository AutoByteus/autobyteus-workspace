import { describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { ExternalPeerType } from "autobyteus-ts/external-channel/peer-type.js";
import { createChannelRoutingKey } from "autobyteus-ts/external-channel/channel-routing-key.js";
import { AgentRunEventType } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { TeamRunEventSourceType } from "../../../../src/agent-team-execution/domain/team-run-event.js";
import { ChannelTeamRunReplyBridge } from "../../../../src/external-channel/runtime/channel-team-run-reply-bridge.js";

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

describe("ChannelTeamRunReplyBridge", () => {
  it("binds accepted team-member turns from multiplexed team events and publishes the provider callback on completion", async () => {
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
        callbackIdempotencyKey: "external-reply:member-1:turn-1",
        replyText: "Hello back",
        attachments: [],
        chunks: [],
        metadata: {},
      },
    });
    let listener: ((event: unknown) => void) | null = null;
    const unsubscribe = vi.fn();
    const bridge = new ChannelTeamRunReplyBridge({
      messageReceiptService: { bindTurnToReceipt },
      replyCallbackService: { publishAssistantReplyByTurn },
      runProjectionService: {
        getProjection: vi.fn(),
      },
    });

    await bridge.bindAcceptedExternalTeamTurn({
      run: {
        runId: "team-1",
        subscribeToEvents: (onEvent: (event: unknown) => void) => {
          listener = onEvent;
          return unsubscribe;
        },
      },
      teamRunId: "team-1",
      memberName: "Coordinator",
      envelope: createEnvelope(),
    });

    listener?.({
      eventSourceType: TeamRunEventSourceType.AGENT,
      teamRunId: "team-1",
      data: {
        runtimeKind: "claude_agent_sdk",
        memberName: "Coordinator",
        memberRunId: "member-1",
        agentEvent: {
          runId: "member-1",
          eventType: AgentRunEventType.SEGMENT_END,
          payload: {
            turnId: "turn-1",
            text: "Hello back",
            segment_type: "text",
          },
          statusHint: null,
        },
      },
    });
    listener?.({
      eventSourceType: TeamRunEventSourceType.AGENT,
      teamRunId: "team-1",
      data: {
        runtimeKind: "claude_agent_sdk",
        memberName: "Coordinator",
        memberRunId: "member-1",
        agentEvent: {
          runId: "member-1",
          eventType: AgentRunEventType.AGENT_STATUS,
          payload: {
            turnId: "turn-1",
            new_status: "IDLE",
            old_status: "RUNNING",
          },
          statusHint: "IDLE",
        },
      },
    });
    await flush();

    expect(bindTurnToReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        agentRunId: "member-1",
        teamRunId: "team-1",
        turnId: "turn-1",
        externalMessageId: "update:1",
      }),
    );
    expect(publishAssistantReplyByTurn).toHaveBeenCalledWith({
      agentRunId: "member-1",
      teamRunId: "team-1",
      turnId: "turn-1",
      replyText: "Hello back",
      callbackIdempotencyKey: "external-reply:member-1:turn-1",
    });
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});

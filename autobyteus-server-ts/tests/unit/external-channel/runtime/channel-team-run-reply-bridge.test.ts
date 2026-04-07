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

describe("ChannelTeamRunReplyBridge", () => {
  it("resolves team-member correlation and final reply from multiplexed events", async () => {
    let listener: ((event: unknown) => void) | null = null;
    const unsubscribe = vi.fn();
    const bridge = new ChannelTeamRunReplyBridge({
      turnReplyRecoveryService: {
        resolveReplyText: vi.fn(),
      },
    });

    const observation = bridge.observeAcceptedExternalTeamTurn({
      run: {
        runId: "team-1",
        subscribeToEvents: (onEvent: (event: unknown) => void) => {
          listener = onEvent;
          return unsubscribe;
        },
      },
      teamRunId: "team-1",
      memberName: "Coordinator",
      memberRunId: "member-1",
      turnId: "turn-1",
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
          eventType: AgentRunEventType.TURN_COMPLETED,
          payload: {
            turnId: "turn-1",
          },
          statusHint: "IDLE",
        },
      },
    });

    await expect(observation).resolves.toEqual({
      status: "REPLY_READY",
      reply: expect.objectContaining({
        agentRunId: "member-1",
        teamRunId: "team-1",
        turnId: "turn-1",
        replyText: "Hello back",
      }),
    });
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("fails fast when accepted team correlation is incomplete", async () => {
    const bridge = new ChannelTeamRunReplyBridge({
      turnReplyRecoveryService: {
        resolveReplyText: vi.fn(),
      },
    });

    await expect(
      bridge.observeAcceptedExternalTeamTurn({
        run: {
          runId: "team-missing",
          subscribeToEvents: () => vi.fn(),
        },
        teamRunId: "team-missing",
        memberName: "Coordinator",
        memberRunId: "" as string,
        turnId: "" as string,
        envelope: createEnvelope(),
      }),
    ).rejects.toThrow(/requires exact member and turn correlation/i);
  });

  it("ignores turnless completion signals even after exact team-turn content was observed", async () => {
    let listener: ((event: unknown) => void) | null = null;
    const resolveReplyText = vi.fn().mockResolvedValue("Recovered stale team reply");
    const bridge = new ChannelTeamRunReplyBridge({
      turnReplyRecoveryService: {
        resolveReplyText,
      },
    });

    void bridge.observeAcceptedExternalTeamTurn({
      run: {
        runId: "team-lag-guard",
        subscribeToEvents: (onEvent: (event: unknown) => void) => {
          listener = onEvent;
          return vi.fn();
        },
      },
      teamRunId: "team-lag-guard",
      memberName: "Coordinator",
      memberRunId: "member-1",
      turnId: "turn-1",
      envelope: createEnvelope(),
    });

    listener?.({
      eventSourceType: TeamRunEventSourceType.AGENT,
      teamRunId: "team-lag-guard",
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
      teamRunId: "team-lag-guard",
      data: {
        runtimeKind: "claude_agent_sdk",
        memberName: "Coordinator",
        memberRunId: "member-1",
        agentEvent: {
          runId: "member-1",
          eventType: AgentRunEventType.AGENT_STATUS,
          payload: {
            new_status: "IDLE",
            old_status: "RUNNING",
          },
          statusHint: "IDLE",
        },
      },
    });
    listener?.({
      eventSourceType: TeamRunEventSourceType.AGENT,
      teamRunId: "team-lag-guard",
      data: {
        runtimeKind: "claude_agent_sdk",
        memberName: "Coordinator",
        memberRunId: "member-1",
        agentEvent: {
          runId: "member-1",
          eventType: AgentRunEventType.ASSISTANT_COMPLETE,
          payload: {
            text: "turnless team completion",
          },
          statusHint: "IDLE",
        },
      },
    });

    await Promise.resolve();

    expect(resolveReplyText).not.toHaveBeenCalled();
  });
});

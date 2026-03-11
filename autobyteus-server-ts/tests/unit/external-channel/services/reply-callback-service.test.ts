import { describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { ReplyCallbackService } from "../../../../src/external-channel/services/reply-callback-service.js";
import type { ChannelSourceContext } from "../../../../src/external-channel/domain/models.js";

const createSource = (): ChannelSourceContext => ({
  provider: ExternalChannelProvider.WHATSAPP,
  transport: ExternalChannelTransport.PERSONAL_SESSION,
  accountId: "acct-1",
  peerId: "peer-1",
  threadId: "thread-1",
  externalMessageId: "message-1",
  receivedAt: new Date("2026-02-09T00:00:00.000Z"),
  turnId: "turn-1",
});

const createConfiguredService = (overrides?: {
  getSourceByAgentRunTurn?: ReturnType<typeof vi.fn>;
  reserveCallbackKey?: ReturnType<typeof vi.fn>;
  recordPending?: ReturnType<typeof vi.fn>;
  isRouteBoundToTarget?: ReturnType<typeof vi.fn>;
  enqueueOrGet?: ReturnType<typeof vi.fn>;
  resolveGatewayCallbackDispatchTarget?: ReturnType<typeof vi.fn>;
}) => {
  const getSourceByAgentRunTurn =
    overrides?.getSourceByAgentRunTurn ??
    vi.fn().mockResolvedValue(createSource());
  const reserveCallbackKey =
    overrides?.reserveCallbackKey ??
    vi.fn().mockResolvedValue({
      duplicate: false,
      key: "cb-1",
      firstSeenAt: new Date("2026-02-09T00:00:00.000Z"),
      expiresAt: null,
    });
  const recordPending =
    overrides?.recordPending ?? vi.fn().mockResolvedValue(undefined);
  const isRouteBoundToTarget =
    overrides?.isRouteBoundToTarget ?? vi.fn().mockResolvedValue(true);
  const enqueueOrGet =
    overrides?.enqueueOrGet ??
    vi.fn().mockResolvedValue({
      record: {
        id: "outbox-1",
        callbackIdempotencyKey: "cb-1",
      },
      duplicate: false,
    });
  const resolveGatewayCallbackDispatchTarget =
    overrides?.resolveGatewayCallbackDispatchTarget ??
    vi.fn().mockResolvedValue({
      state: "AVAILABLE",
      reason: null,
    });

  return {
    service: new ReplyCallbackService(
      {
        getSourceByAgentRunTurn,
      } as any,
      {
        callbackIdempotencyService: {
          reserveCallbackKey,
        },
        deliveryEventService: {
          recordPending,
        },
        bindingService: {
          isRouteBoundToTarget,
        },
        callbackOutboxService: {
          enqueueOrGet,
        },
        callbackTargetResolver: {
          resolveGatewayCallbackDispatchTarget,
        },
      },
    ),
    deps: {
      getSourceByAgentRunTurn,
      reserveCallbackKey,
      recordPending,
      isRouteBoundToTarget,
      enqueueOrGet,
      resolveGatewayCallbackDispatchTarget,
    },
  };
};

describe("ReplyCallbackService", () => {
  it("skips when turnId is missing", async () => {
    const service = new ReplyCallbackService({
      getSourceByAgentRunTurn: vi.fn(),
    } as any);

    const result = await service.publishAssistantReplyByTurn({
      agentRunId: "agent-1",
      turnId: null,
      replyText: "hello",
      callbackIdempotencyKey: "cb-1",
    });

    expect(result).toEqual({
      published: false,
      duplicate: false,
      reason: "TURN_ID_MISSING",
      envelope: null,
    });
  });

  it("skips when reply text is empty", async () => {
    const service = new ReplyCallbackService({
      getSourceByAgentRunTurn: vi.fn(),
    } as any);

    const result = await service.publishAssistantReplyByTurn({
      agentRunId: "agent-1",
      turnId: "turn-1",
      replyText: "   ",
      callbackIdempotencyKey: "cb-1",
    });

    expect(result.reason).toBe("EMPTY_REPLY");
  });

  it("skips when callback runtime is not configured", async () => {
    const service = new ReplyCallbackService({
      getSourceByAgentRunTurn: vi.fn(),
    } as any);

    const result = await service.publishAssistantReplyByTurn({
      agentRunId: "agent-1",
      turnId: "turn-1",
      replyText: "hello",
      callbackIdempotencyKey: "cb-1",
    });

    expect(result.reason).toBe("CALLBACK_NOT_CONFIGURED");
  });

  it("skips when callback delivery is disabled by the target resolver", async () => {
    const { service, deps } = createConfiguredService({
      resolveGatewayCallbackDispatchTarget: vi.fn().mockResolvedValue({
        state: "DISABLED",
        reason: "Channel callback delivery is not configured.",
      }),
    });

    const result = await service.publishAssistantReplyByTurn({
      agentRunId: "agent-1",
      turnId: "turn-1",
      replyText: "hello",
      callbackIdempotencyKey: "cb-1",
    });

    expect(result.reason).toBe("CALLBACK_NOT_CONFIGURED");
    expect(deps.reserveCallbackKey).not.toHaveBeenCalled();
    expect(deps.enqueueOrGet).not.toHaveBeenCalled();
  });

  it("short-circuits duplicate callback keys", async () => {
    const { service, deps } = createConfiguredService({
      reserveCallbackKey: vi.fn().mockResolvedValue({
        duplicate: true,
        key: "cb-1",
        firstSeenAt: new Date("2026-02-09T00:00:00.000Z"),
        expiresAt: null,
      }),
    });

    const result = await service.publishAssistantReplyByTurn({
      agentRunId: "agent-1",
      turnId: "turn-1",
      replyText: "hello",
      callbackIdempotencyKey: "cb-1",
    });

    expect(result).toEqual({
      published: false,
      duplicate: true,
      reason: "DUPLICATE",
      envelope: null,
    });
    expect(deps.recordPending).not.toHaveBeenCalled();
    expect(deps.enqueueOrGet).not.toHaveBeenCalled();
  });

  it("returns SOURCE_NOT_FOUND when no turn-bound source exists", async () => {
    const { service, deps } = createConfiguredService({
      getSourceByAgentRunTurn: vi.fn().mockResolvedValue(null),
    });

    const result = await service.publishAssistantReplyByTurn({
      agentRunId: "agent-1",
      turnId: "turn-1",
      replyText: "hello",
      callbackIdempotencyKey: "cb-1",
    });

    expect(result.reason).toBe("SOURCE_NOT_FOUND");
    expect(deps.reserveCallbackKey).not.toHaveBeenCalled();
  });

  it("returns BINDING_NOT_FOUND when route is no longer bound to target", async () => {
    const { service, deps } = createConfiguredService({
      isRouteBoundToTarget: vi.fn().mockResolvedValue(false),
    });

    const result = await service.publishAssistantReplyByTurn({
      agentRunId: "agent-1",
      turnId: "turn-1",
      replyText: "hello",
      callbackIdempotencyKey: "cb-1",
    });

    expect(result.reason).toBe("BINDING_NOT_FOUND");
    expect(deps.reserveCallbackKey).not.toHaveBeenCalled();
  });

  it("records pending delivery and enqueues durable work even when the gateway is temporarily unavailable", async () => {
    const { service, deps } = createConfiguredService({
      resolveGatewayCallbackDispatchTarget: vi.fn().mockResolvedValue({
        state: "UNAVAILABLE",
        reason: "Managed messaging gateway target is not currently available.",
      }),
    });

    const result = await service.publishAssistantReplyByTurn({
      agentRunId: "agent-1",
      turnId: "turn-1",
      replyText: "assistant reply",
      callbackIdempotencyKey: "cb-1",
      metadata: { attempt: 1 },
    });

    expect(result.published).toBe(true);
    expect(result.envelope).toEqual({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.PERSONAL_SESSION,
      accountId: "acct-1",
      peerId: "peer-1",
      threadId: "thread-1",
      correlationMessageId: "message-1",
      callbackIdempotencyKey: "cb-1",
      replyText: "assistant reply",
      attachments: [],
      chunks: [],
      metadata: {
        turnId: "turn-1",
        attempt: 1,
      },
    });
    expect(deps.recordPending).toHaveBeenCalledOnce();
    expect(deps.enqueueOrGet).toHaveBeenCalledWith(
      "cb-1",
      expect.objectContaining({
        provider: ExternalChannelProvider.WHATSAPP,
        transport: ExternalChannelTransport.PERSONAL_SESSION,
        accountId: "acct-1",
        peerId: "peer-1",
      }),
    );
  });

  it("accepts teamRunId as supplemental binding context for TEAM-owned coordinator replies", async () => {
    const { service, deps } = createConfiguredService({
      isRouteBoundToTarget: vi.fn().mockResolvedValue(true),
    });

    const result = await service.publishAssistantReplyByTurn({
      agentRunId: "agent-member-1",
      teamRunId: "team-1",
      turnId: "turn-1",
      replyText: "hello from coordinator",
      callbackIdempotencyKey: "cb-team-1",
    });

    expect(result.published).toBe(true);
    expect(deps.isRouteBoundToTarget).toHaveBeenCalledWith(
      {
        provider: ExternalChannelProvider.WHATSAPP,
        transport: ExternalChannelTransport.PERSONAL_SESSION,
        accountId: "acct-1",
        peerId: "peer-1",
        threadId: "thread-1",
      },
      {
        agentRunId: "agent-member-1",
        teamRunId: "team-1",
      },
    );
    expect(deps.recordPending).toHaveBeenCalledOnce();
    expect(deps.enqueueOrGet).toHaveBeenCalledWith(
      "cb-team-1",
      expect.objectContaining({
        callbackIdempotencyKey: "cb-team-1",
        replyText: "hello from coordinator",
      }),
    );
  });
});

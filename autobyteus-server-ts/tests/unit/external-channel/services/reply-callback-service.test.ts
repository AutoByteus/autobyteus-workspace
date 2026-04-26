import { describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { ReplyCallbackService } from "../../../../src/external-channel/services/reply-callback-service.js";

const route = {
  provider: ExternalChannelProvider.WHATSAPP,
  transport: ExternalChannelTransport.PERSONAL_SESSION,
  accountId: "acct-1",
  peerId: "peer-1",
  threadId: "thread-1",
};

const target = {
  targetType: "AGENT" as const,
  agentRunId: "agent-1",
};

const createConfiguredService = (overrides?: {
  recordPending?: ReturnType<typeof vi.fn>;
  isRouteBoundToTarget?: ReturnType<typeof vi.fn>;
  enqueueOrGet?: ReturnType<typeof vi.fn>;
  resolveGatewayCallbackDispatchTarget?: ReturnType<typeof vi.fn>;
}) => {
  const recordPending = overrides?.recordPending ?? vi.fn().mockResolvedValue(undefined);
  const isRouteBoundToTarget = overrides?.isRouteBoundToTarget ?? vi.fn().mockResolvedValue(true);
  const enqueueOrGet = overrides?.enqueueOrGet ?? vi.fn().mockResolvedValue({ duplicate: false });
  const resolveGatewayCallbackDispatchTarget = overrides?.resolveGatewayCallbackDispatchTarget ??
    vi.fn().mockResolvedValue({ state: "AVAILABLE", reason: null });

  return {
    service: new ReplyCallbackService({
      deliveryEventService: { recordPending } as any,
      bindingService: { isRouteBoundToTarget } as any,
      callbackOutboxService: { enqueueOrGet },
      callbackTargetResolver: { resolveGatewayCallbackDispatchTarget },
    }),
    deps: { recordPending, isRouteBoundToTarget, enqueueOrGet, resolveGatewayCallbackDispatchTarget },
  };
};

const publishInput = (overrides: Record<string, unknown> = {}) => ({
  route,
  target,
  turnId: "turn-1",
  replyText: "assistant reply",
  callbackIdempotencyKey: "cb-1",
  correlationMessageId: "message-1",
  ...overrides,
});

describe("ReplyCallbackService", () => {
  it("skips when turnId is missing", async () => {
    const service = new ReplyCallbackService();

    const result = await service.publishRunOutputReply(publishInput({ turnId: " " }));

    expect(result.reason).toBe("TURN_ID_MISSING");
  });

  it("skips when reply text is empty", async () => {
    const service = new ReplyCallbackService();

    const result = await service.publishRunOutputReply(publishInput({ replyText: "   " }));

    expect(result.reason).toBe("EMPTY_REPLY");
  });

  it("skips when callback runtime is not configured", async () => {
    const service = new ReplyCallbackService();

    const result = await service.publishRunOutputReply(publishInput());

    expect(result.reason).toBe("CALLBACK_NOT_CONFIGURED");
  });

  it("skips when callback delivery is disabled by the target resolver", async () => {
    const { service, deps } = createConfiguredService({
      resolveGatewayCallbackDispatchTarget: vi.fn().mockResolvedValue({
        state: "DISABLED",
        reason: "Channel callback delivery is not configured.",
      }),
    });

    const result = await service.publishRunOutputReply(publishInput());

    expect(result.reason).toBe("CALLBACK_NOT_CONFIGURED");
    expect(deps.enqueueOrGet).not.toHaveBeenCalled();
  });

  it("short-circuits duplicate callback keys", async () => {
    const { service, deps } = createConfiguredService({
      enqueueOrGet: vi.fn().mockResolvedValue({ duplicate: true }),
    });

    const result = await service.publishRunOutputReply(publishInput());

    expect(result).toEqual({
      published: false,
      duplicate: true,
      reason: "DUPLICATE",
      envelope: null,
    });
    expect(deps.recordPending).not.toHaveBeenCalled();
    expect(deps.enqueueOrGet).toHaveBeenCalledOnce();
  });

  it("returns BINDING_NOT_FOUND when route is no longer bound to target", async () => {
    const { service, deps } = createConfiguredService({
      isRouteBoundToTarget: vi.fn().mockResolvedValue(false),
    });

    const result = await service.publishRunOutputReply(publishInput());

    expect(result.reason).toBe("BINDING_NOT_FOUND");
    expect(deps.enqueueOrGet).not.toHaveBeenCalled();
  });

  it("records pending delivery and enqueues durable work even when the gateway is temporarily unavailable", async () => {
    const { service, deps } = createConfiguredService({
      resolveGatewayCallbackDispatchTarget: vi.fn().mockResolvedValue({
        state: "UNAVAILABLE",
        reason: "Managed messaging gateway target is not currently available.",
      }),
    });

    const result = await service.publishRunOutputReply(publishInput({ metadata: { attempt: 1 } }));

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
        targetType: "AGENT",
        agentRunId: "agent-1",
        attempt: 1,
      },
    });
    expect(deps.recordPending).toHaveBeenCalledOnce();
    expect(deps.enqueueOrGet).toHaveBeenCalledWith("cb-1", expect.any(Object));
  });

  it("accepts team target identity for coordinator replies", async () => {
    const { service, deps } = createConfiguredService();
    const teamTarget = {
      targetType: "TEAM" as const,
      teamRunId: "team-1",
      entryMemberRunId: "agent-member-1",
      entryMemberName: "coordinator",
    };

    const result = await service.publishRunOutputReply(publishInput({ target: teamTarget }));

    expect(result.published).toBe(true);
    expect(deps.isRouteBoundToTarget).toHaveBeenCalledWith(route, teamTarget);
  });

  it("keeps publish success when delivery-event recording fails after enqueue", async () => {
    const { service, deps } = createConfiguredService({
      recordPending: vi.fn().mockRejectedValue(new Error("delivery event write failed")),
    });

    const result = await service.publishRunOutputReply(publishInput());

    expect(result.published).toBe(true);
    expect(deps.enqueueOrGet).toHaveBeenCalledOnce();
    expect(deps.recordPending).toHaveBeenCalledOnce();
  });
});

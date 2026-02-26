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

  it("skips when team target is requested in phase 1", async () => {
    const service = new ReplyCallbackService({
      getSourceByAgentRunTurn: vi.fn(),
    } as any);

    const result = await service.publishAssistantReplyByTurn({
      agentRunId: "agent-1",
      teamRunId: "team-1",
      turnId: "turn-1",
      replyText: "hello",
      callbackIdempotencyKey: "cb-1",
    });

    expect(result.reason).toBe("TEAM_TARGET_NOT_SUPPORTED");
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

  it("short-circuits duplicate callback keys", async () => {
    const service = new ReplyCallbackService(
      {
        getSourceByAgentRunTurn: vi.fn().mockResolvedValue(createSource()),
      } as any,
      {
        callbackIdempotencyService: {
          reserveCallbackKey: vi.fn().mockResolvedValue({
            duplicate: true,
            key: "cb-1",
            firstSeenAt: new Date("2026-02-09T00:00:00.000Z"),
            expiresAt: null,
          }),
        },
        deliveryEventService: {
          recordPending: vi.fn(),
          recordSent: vi.fn(),
          recordFailed: vi.fn(),
        },
        bindingService: {
          isRouteBoundToTarget: vi.fn().mockResolvedValue(true),
        },
        callbackPublisher: {
          publish: vi.fn(),
        },
      },
    );

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
  });

  it("returns SOURCE_NOT_FOUND when no turn-bound source exists", async () => {
    const reserveCallbackKey = vi.fn().mockResolvedValue({
      duplicate: false,
      key: "cb-1",
      firstSeenAt: new Date("2026-02-09T00:00:00.000Z"),
      expiresAt: null,
    });
    const service = new ReplyCallbackService(
      {
        getSourceByAgentRunTurn: vi.fn().mockResolvedValue(null),
      } as any,
      {
        callbackIdempotencyService: {
          reserveCallbackKey,
        },
        deliveryEventService: {
          recordPending: vi.fn(),
          recordSent: vi.fn(),
          recordFailed: vi.fn(),
        },
        callbackPublisher: {
          publish: vi.fn(),
        },
      },
    );

    const result = await service.publishAssistantReplyByTurn({
      agentRunId: "agent-1",
      turnId: "turn-1",
      replyText: "hello",
      callbackIdempotencyKey: "cb-1",
    });

    expect(result.reason).toBe("SOURCE_NOT_FOUND");
    expect(reserveCallbackKey).not.toHaveBeenCalled();
  });

  it("returns BINDING_NOT_FOUND when route is no longer bound to target", async () => {
    const reserveCallbackKey = vi.fn().mockResolvedValue({
      duplicate: false,
      key: "cb-1",
      firstSeenAt: new Date("2026-02-09T00:00:00.000Z"),
      expiresAt: null,
    });
    const service = new ReplyCallbackService(
      {
        getSourceByAgentRunTurn: vi.fn().mockResolvedValue(createSource()),
      } as any,
      {
        callbackIdempotencyService: {
          reserveCallbackKey,
        },
        deliveryEventService: {
          recordPending: vi.fn(),
          recordSent: vi.fn(),
          recordFailed: vi.fn(),
        },
        bindingService: {
          isRouteBoundToTarget: vi.fn().mockResolvedValue(false),
        },
        callbackPublisher: {
          publish: vi.fn(),
        },
      },
    );

    const result = await service.publishAssistantReplyByTurn({
      agentRunId: "agent-1",
      turnId: "turn-1",
      replyText: "hello",
      callbackIdempotencyKey: "cb-1",
    });

    expect(result.reason).toBe("BINDING_NOT_FOUND");
    expect(reserveCallbackKey).not.toHaveBeenCalled();
  });

  it("publishes callback and records pending->sent delivery events", async () => {
    const callbackPublisher = {
      publish: vi.fn().mockResolvedValue(undefined),
    };
    const deliveryEventService = {
      recordPending: vi.fn().mockResolvedValue(undefined),
      recordSent: vi.fn().mockResolvedValue(undefined),
      recordFailed: vi.fn().mockResolvedValue(undefined),
    };
    const service = new ReplyCallbackService(
      {
        getSourceByAgentRunTurn: vi.fn().mockResolvedValue(createSource()),
      } as any,
      {
        callbackIdempotencyService: {
          reserveCallbackKey: vi.fn().mockResolvedValue({
            duplicate: false,
            key: "cb-1",
            firstSeenAt: new Date("2026-02-09T00:00:00.000Z"),
            expiresAt: null,
          }),
        },
        deliveryEventService,
        bindingService: {
          isRouteBoundToTarget: vi.fn().mockResolvedValue(true),
        },
        callbackPublisher,
      },
    );

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
    expect(callbackPublisher.publish).toHaveBeenCalledOnce();
    expect(deliveryEventService.recordPending).toHaveBeenCalledOnce();
    expect(deliveryEventService.recordSent).toHaveBeenCalledOnce();
    expect(deliveryEventService.recordFailed).not.toHaveBeenCalled();
  });

  it("records failed delivery event when callback publish throws", async () => {
    const deliveryEventService = {
      recordPending: vi.fn().mockResolvedValue(undefined),
      recordSent: vi.fn().mockResolvedValue(undefined),
      recordFailed: vi.fn().mockResolvedValue(undefined),
    };
    const service = new ReplyCallbackService(
      {
        getSourceByAgentRunTurn: vi.fn().mockResolvedValue(createSource()),
      } as any,
      {
        callbackIdempotencyService: {
          reserveCallbackKey: vi.fn().mockResolvedValue({
            duplicate: false,
            key: "cb-1",
            firstSeenAt: new Date("2026-02-09T00:00:00.000Z"),
            expiresAt: null,
          }),
        },
        deliveryEventService,
        bindingService: {
          isRouteBoundToTarget: vi.fn().mockResolvedValue(true),
        },
        callbackPublisher: {
          publish: vi.fn().mockRejectedValue(new Error("gateway timeout")),
        },
      },
    );

    await expect(
      service.publishAssistantReplyByTurn({
        agentRunId: "agent-1",
        turnId: "turn-1",
        replyText: "assistant reply",
        callbackIdempotencyKey: "cb-1",
      }),
    ).rejects.toThrow("gateway timeout");

    expect(deliveryEventService.recordPending).toHaveBeenCalledOnce();
    expect(deliveryEventService.recordSent).not.toHaveBeenCalled();
    expect(deliveryEventService.recordFailed).toHaveBeenCalledWith(
      expect.objectContaining({
        callbackIdempotencyKey: "cb-1",
        errorMessage: "gateway timeout",
      }),
    );
  });
});

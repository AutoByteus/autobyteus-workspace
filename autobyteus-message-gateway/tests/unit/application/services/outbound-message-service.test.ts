import { describe, expect, it, vi } from "vitest";
import { OutboundMessageService } from "../../../../src/application/services/outbound-message-service.js";
import { DeadLetterService } from "../../../../src/application/services/dead-letter-service.js";
import { DeliveryStatusService } from "../../../../src/application/services/delivery-status-service.js";

describe("OutboundMessageService", () => {
  it("delivers via provider adapter and publishes delivery status", async () => {
    const adapter = {
      sendOutbound: vi.fn(async () => ({
        providerMessageId: "m-1",
        deliveredAt: "2026-02-08T00:00:00.000Z",
        metadata: {},
      })),
    };

    const serverClient = {
      postDeliveryEvent: vi.fn(async () => undefined),
    };

    const service = new OutboundMessageService({
      outboundAdaptersByRoutingKey: new Map([
        ["WHATSAPP:BUSINESS_API", adapter as any],
      ]),
      deliveryStatusService: new DeliveryStatusService(serverClient as any),
      deadLetterService: new DeadLetterService(),
      chunkPlanner: {
        planChunks: vi.fn().mockReturnValue([{ index: 0, text: "done" }]),
      } as any,
      config: {
        maxAttempts: 3,
        baseDelayMs: 1,
      },
      sleep: async () => undefined,
    });

    const result = await service.handleOutbound({
      provider: "WHATSAPP",
      transport: "BUSINESS_API",
      accountId: "acct-1",
      peerId: "peer-1",
      threadId: null,
      correlationMessageId: "corr-1",
      callbackIdempotencyKey: "cb-1",
      replyText: "done",
      attachments: [],
      chunks: [],
      metadata: {},
    } as any);

    expect(result).toEqual({
      delivered: true,
      attempts: 1,
      deadLettered: false,
    });
    expect(adapter.sendOutbound).toHaveBeenCalledOnce();
    expect(adapter.sendOutbound).toHaveBeenCalledWith(
      expect.objectContaining({
        chunks: [{ index: 0, text: "done" }],
      }),
    );
    expect(serverClient.postDeliveryEvent).toHaveBeenCalledOnce();
  });

  it("retries retryable failures and dead-letters when exhausted", async () => {
    const sendOutbound = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("timeout"), { retryable: true }))
      .mockRejectedValueOnce(Object.assign(new Error("timeout"), { retryable: true }))
      .mockRejectedValueOnce(Object.assign(new Error("timeout"), { retryable: true }));

    const adapter = { sendOutbound };
    const serverClient = {
      postDeliveryEvent: vi.fn(async () => undefined),
    };

    const deadLetterService = new DeadLetterService();
    const service = new OutboundMessageService({
      outboundAdaptersByRoutingKey: new Map([
        ["WHATSAPP:BUSINESS_API", adapter as any],
      ]),
      deliveryStatusService: new DeliveryStatusService(serverClient as any),
      deadLetterService,
      chunkPlanner: {
        planChunks: vi.fn().mockReturnValue([{ index: 0, text: "done" }]),
      } as any,
      config: {
        maxAttempts: 3,
        baseDelayMs: 1,
      },
      sleep: async () => undefined,
    });

    const result = await service.handleOutbound({
      provider: "WHATSAPP",
      transport: "BUSINESS_API",
      accountId: "acct-1",
      peerId: "peer-1",
      threadId: null,
      correlationMessageId: "corr-1",
      callbackIdempotencyKey: "cb-2",
      replyText: "done",
      attachments: [],
      chunks: [],
      metadata: {},
    } as any);

    expect(result).toEqual({
      delivered: false,
      attempts: 3,
      deadLettered: true,
    });
    expect(sendOutbound).toHaveBeenCalledTimes(3);
    expect(deadLetterService.listDeadLetters()).toHaveLength(1);
  });
});

import { describe, expect, it, vi } from "vitest";
import { DeliveryStatusService } from "../../../../src/application/services/delivery-status-service.js";

describe("DeliveryStatusService", () => {
  it("records events and publishes to server client", async () => {
    const postDeliveryEvent = vi.fn(async () => undefined);
    const service = new DeliveryStatusService({ postDeliveryEvent } as any);
    const event = {
      provider: "WHATSAPP",
      transport: "BUSINESS_API",
      accountId: "acct-1",
      peerId: "peer-1",
      threadId: null,
      correlationMessageId: "corr-1",
      callbackIdempotencyKey: "cb-1",
      status: "SENT",
      occurredAt: "2026-02-08T00:00:00.000Z",
      metadata: {},
    };

    await service.record(event as any);
    await service.publishToServer(event as any);

    expect(service.getRecordedEvents()).toEqual([event]);
    expect(postDeliveryEvent).toHaveBeenCalledOnce();
    expect(postDeliveryEvent).toHaveBeenCalledWith(event);
  });
});

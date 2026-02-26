import { describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { DeliveryEventService } from "../../../../src/external-channel/services/delivery-event-service.js";
import type {
  ChannelDeliveryEvent,
  UpsertChannelDeliveryEventInput,
} from "../../../../src/external-channel/domain/models.js";
import type { DeliveryEventProvider } from "../../../../src/external-channel/providers/delivery-event-provider.js";

const createDeliveryEvent = (
  status: ChannelDeliveryEvent["status"],
): ChannelDeliveryEvent => ({
  id: "1",
  provider: ExternalChannelProvider.WHATSAPP,
  transport: ExternalChannelTransport.BUSINESS_API,
  accountId: "acct-1",
  peerId: "peer-1",
  threadId: null,
  correlationMessageId: "corr-1",
  callbackIdempotencyKey: "cb-1",
  status,
  errorMessage: status === "FAILED" ? "gateway timeout" : null,
  metadata: {},
  createdAt: new Date("2026-02-08T00:00:00.000Z"),
  updatedAt: new Date("2026-02-08T00:00:00.000Z"),
});

const createInput = (): Omit<UpsertChannelDeliveryEventInput, "status"> => ({
  provider: ExternalChannelProvider.WHATSAPP,
  transport: ExternalChannelTransport.BUSINESS_API,
  accountId: " acct-1 ",
  peerId: " peer-1 ",
  threadId: " thread-1 ",
  correlationMessageId: " corr-1 ",
  callbackIdempotencyKey: " cb-1 ",
  metadata: { attempt: 1 },
});

describe("DeliveryEventService", () => {
  it("records pending event", async () => {
    const provider: DeliveryEventProvider = {
      upsertByCallbackKey: vi.fn().mockResolvedValue(createDeliveryEvent("PENDING")),
      findByCallbackKey: vi.fn(),
    };
    const service = new DeliveryEventService(provider);

    await service.recordPending(createInput());

    expect(provider.upsertByCallbackKey).toHaveBeenCalledWith({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId: "acct-1",
      peerId: "peer-1",
      threadId: "thread-1",
      correlationMessageId: "corr-1",
      callbackIdempotencyKey: "cb-1",
      status: "PENDING",
      errorMessage: null,
      metadata: { attempt: 1 },
    });
  });

  it("records sent event", async () => {
    const provider: DeliveryEventProvider = {
      upsertByCallbackKey: vi.fn().mockResolvedValue(createDeliveryEvent("SENT")),
      findByCallbackKey: vi.fn(),
    };
    const service = new DeliveryEventService(provider);

    await service.recordSent(createInput());

    expect(provider.upsertByCallbackKey).toHaveBeenCalledWith(
      expect.objectContaining({ status: "SENT", errorMessage: null }),
    );
  });

  it("records delivered event", async () => {
    const provider: DeliveryEventProvider = {
      upsertByCallbackKey: vi.fn().mockResolvedValue(createDeliveryEvent("DELIVERED")),
      findByCallbackKey: vi.fn(),
    };
    const service = new DeliveryEventService(provider);

    await service.recordDelivered(createInput());

    expect(provider.upsertByCallbackKey).toHaveBeenCalledWith(
      expect.objectContaining({ status: "DELIVERED", errorMessage: null }),
    );
  });

  it("records failed event with normalized error message", async () => {
    const provider: DeliveryEventProvider = {
      upsertByCallbackKey: vi.fn().mockResolvedValue(createDeliveryEvent("FAILED")),
      findByCallbackKey: vi.fn(),
    };
    const service = new DeliveryEventService(provider);

    await service.recordFailed({
      ...createInput(),
      errorMessage: " timeout ",
    });

    expect(provider.upsertByCallbackKey).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "FAILED",
        errorMessage: "timeout",
      }),
    );
  });

  it("throws when callback key is blank", async () => {
    const provider: DeliveryEventProvider = {
      upsertByCallbackKey: vi.fn(),
      findByCallbackKey: vi.fn(),
    };
    const service = new DeliveryEventService(provider);
    const input = createInput();
    input.callbackIdempotencyKey = "   ";

    await expect(service.recordPending(input)).rejects.toThrow(
      "callbackIdempotencyKey must be a non-empty string.",
    );
    expect(provider.upsertByCallbackKey).not.toHaveBeenCalled();
  });
});

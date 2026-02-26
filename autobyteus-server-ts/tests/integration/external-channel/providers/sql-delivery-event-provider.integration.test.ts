import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { SqlDeliveryEventProvider } from "../../../../src/external-channel/providers/sql-delivery-event-provider.js";

const unique = (prefix: string): string => `${prefix}-${randomUUID()}`;

describe("SqlDeliveryEventProvider", () => {
  it("upserts and retrieves callback delivery events", async () => {
    const provider = new SqlDeliveryEventProvider();
    const callbackKey = unique("callback");

    const saved = await provider.upsertByCallbackKey({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId: unique("acct"),
      peerId: unique("peer"),
      threadId: null,
      correlationMessageId: "corr-1",
      callbackIdempotencyKey: callbackKey,
      status: "PENDING",
      metadata: { attempt: 1 },
    });

    const fetched = await provider.findByCallbackKey(callbackKey);

    expect(saved.id).toBeTruthy();
    expect(fetched?.id).toBe(saved.id);
    expect(fetched?.status).toBe("PENDING");
    expect(fetched?.metadata).toEqual({ attempt: 1 });
  });

  it("updates existing callback event when key already exists", async () => {
    const provider = new SqlDeliveryEventProvider();
    const callbackKey = unique("callback");
    const accountId = unique("acct");
    const peerId = unique("peer");

    const first = await provider.upsertByCallbackKey({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.PERSONAL_SESSION,
      accountId,
      peerId,
      threadId: "thread-1",
      correlationMessageId: "corr-1",
      callbackIdempotencyKey: callbackKey,
      status: "PENDING",
      metadata: { attempt: 1 },
    });
    const second = await provider.upsertByCallbackKey({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.PERSONAL_SESSION,
      accountId,
      peerId,
      threadId: "thread-1",
      correlationMessageId: "corr-1",
      callbackIdempotencyKey: callbackKey,
      status: "FAILED",
      errorMessage: "gateway timeout",
      metadata: { attempt: 2, retriable: true },
    });

    expect(second.id).toBe(first.id);
    expect(second.status).toBe("FAILED");
    expect(second.errorMessage).toBe("gateway timeout");
    expect(second.metadata).toEqual({ attempt: 2, retriable: true });
  });

  it("rejects blank callback keys", async () => {
    const provider = new SqlDeliveryEventProvider();
    await expect(provider.findByCallbackKey("   ")).rejects.toThrow(
      "callbackIdempotencyKey must be a non-empty string.",
    );
  });
});


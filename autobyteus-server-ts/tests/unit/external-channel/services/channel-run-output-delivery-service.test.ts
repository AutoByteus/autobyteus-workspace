import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { FileChannelRunOutputDeliveryProvider } from "../../../../src/external-channel/providers/file-channel-run-output-delivery-provider.js";
import { ChannelRunOutputDeliveryService } from "../../../../src/external-channel/services/channel-run-output-delivery-service.js";

const tempFiles = new Set<string>();

afterEach(async () => {
  await Promise.all([...tempFiles].map((file) => rm(file, { force: true })));
  tempFiles.clear();
});

const createService = () => {
  const filePath = `/tmp/channel-run-output-delivery-${randomUUID()}.json`;
  tempFiles.add(filePath);
  return new ChannelRunOutputDeliveryService(new FileChannelRunOutputDeliveryProvider(filePath));
};

const baseRoute = {
  provider: ExternalChannelProvider.TELEGRAM,
  transport: ExternalChannelTransport.BUSINESS_API,
  accountId: "acct-1",
  peerId: "peer-1",
  threadId: "thread-1",
};

const target = {
  targetType: "TEAM" as const,
  teamRunId: "team-1",
  entryAgentRunId: "coordinator-run-1",
};

describe("ChannelRunOutputDeliveryService", () => {
  it("uses route-inclusive delivery keys and advances publish state", async () => {
    const service = createService();
    const first = await service.upsertObservedTurn({
      bindingId: "binding-1",
      route: baseRoute,
      target,
      turnId: "turn-1",
      correlationMessageId: "external-message-1",
    });
    const second = await service.upsertObservedTurn({
      bindingId: "binding-1",
      route: { ...baseRoute, peerId: "peer-2" },
      target,
      turnId: "turn-1",
      correlationMessageId: "external-message-2",
    });

    expect(first.deliveryKey).not.toBe(second.deliveryKey);

    const finalized = await service.markReplyFinalized({
      deliveryKey: first.deliveryKey,
      replyTextFinal: "hello",
    });
    expect(finalized.status).toBe("REPLY_FINALIZED");

    const pending = await service.markPublishPending({
      deliveryKey: first.deliveryKey,
      callbackIdempotencyKey: service.buildCallbackIdempotencyKey(first),
    });
    expect(pending.status).toBe("PUBLISH_PENDING");

    const published = await service.markPublished({ deliveryKey: first.deliveryKey });
    expect(published.status).toBe("PUBLISHED");
  });

  it("requires an exact entry AgentRun identity for Team delivery keys", () => {
    const service = createService();
    expect(() => service.buildDeliveryKey({
      bindingId: "binding-1",
      route: baseRoute,
      target: { targetType: "TEAM", teamRunId: "team-1", entryAgentRunId: null },
      turnId: "turn-1",
    })).toThrow("Team output delivery keys require entryAgentRunId.");
  });
});

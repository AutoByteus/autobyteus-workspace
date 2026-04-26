import http from "node:http";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { appConfigProvider } from "../../../../src/config/app-config-provider.js";
import { getProviderProxySet, resetProviderProxySetForTests } from "../../../../src/external-channel/providers/provider-proxy-set.js";
import { DeliveryEventService } from "../../../../src/external-channel/services/delivery-event-service.js";
import { ChannelBindingService } from "../../../../src/external-channel/services/channel-binding-service.js";
import {
  buildDefaultReplyCallbackService,
  startGatewayCallbackDeliveryRuntime,
  stopGatewayCallbackDeliveryRuntime,
} from "../../../../src/external-channel/runtime/gateway-callback-delivery-runtime.js";
import { GatewayCallbackDispatchWorker } from "../../../../src/external-channel/runtime/gateway-callback-dispatch-worker.js";
import { resolveGatewayCallbackDispatchTarget } from "../../../../src/external-channel/runtime/gateway-callback-dispatch-target-resolver.js";
import { GatewayCallbackOutboxService } from "../../../../src/external-channel/runtime/gateway-callback-outbox-service.js";
import {
  FileGatewayCallbackOutboxStore,
} from "../../../../src/external-channel/runtime/gateway-callback-outbox-store.js";

type CapturedRequest = {
  body: Record<string, unknown>;
  receivedAt: string;
};

type CallbackAttempt = CapturedRequest & {
  responseStatus: number;
};

describe("Gateway callback delivery runtime integration", () => {
  let tempDir: string;
  let callbackServer: http.Server;
  let callbackBaseUrl: string;
  let acceptingCallbacks = false;
  let capturedRequests: CapturedRequest[] = [];
  let callbackAttempts: CallbackAttempt[] = [];

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "gateway-callback-runtime-"));
    await fs.writeFile(
      path.join(tempDir, ".env"),
      "AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8899\nDB_TYPE=sqlite\n",
      "utf8",
    );

    appConfigProvider.config.setCustomAppDataDir(tempDir);
    appConfigProvider.config.initialize();

    callbackServer = http.createServer((request, response) => {
      if (request.url !== "/api/server-callback/v1/messages" || request.method !== "POST") {
        response.statusCode = 404;
        response.end("not found");
        return;
      }

      const chunks: Buffer[] = [];
      request.on("data", (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      request.on("end", () => {
        const body = JSON.parse(
          Buffer.concat(chunks).toString("utf8"),
        ) as Record<string, unknown>;
        const attemptBase = {
          body,
          receivedAt: new Date().toISOString(),
        };

        if (!acceptingCallbacks) {
          callbackAttempts.push({
            ...attemptBase,
            responseStatus: 503,
          });
          response.statusCode = 503;
          response.end("gateway unavailable");
          return;
        }

        capturedRequests.push(attemptBase);
        callbackAttempts.push({
          ...attemptBase,
          responseStatus: 202,
        });
        response.statusCode = 202;
        response.setHeader("content-type", "application/json");
        response.end(JSON.stringify({ accepted: true }));
      });
    });

    await new Promise<void>((resolve) => {
      callbackServer.listen(0, "127.0.0.1", () => resolve());
    });
    const address = callbackServer.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to bind callback integration test server.");
    }
    callbackBaseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(async () => {
    acceptingCallbacks = false;
    capturedRequests = [];
    callbackAttempts = [];
    process.env.CHANNEL_CALLBACK_BASE_URL = callbackBaseUrl;
    process.env.CHANNEL_CALLBACK_TIMEOUT_MS = "100";
    resetProviderProxySetForTests();
    await stopGatewayCallbackDeliveryRuntime();
    await fs.rm(path.join(tempDir, "memory"), { recursive: true, force: true });
  });

  afterAll(async () => {
    delete process.env.CHANNEL_CALLBACK_BASE_URL;
    delete process.env.CHANNEL_CALLBACK_TIMEOUT_MS;
    await stopGatewayCallbackDeliveryRuntime();
    resetProviderProxySetForTests();
    await new Promise<void>((resolve, reject) => {
      callbackServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("retries queued callbacks until the callback target becomes available", async () => {
    const { providerSet, bindingService, callbackOutboxService } =
      createRuntimeHarness();
    const callbackService = buildDefaultReplyCallbackService();
    const callbackIdempotencyKey = `callback-${randomUUID()}`;

    await seedReplyContext({
      bindingService,
    });

    startGatewayCallbackDeliveryRuntime();

    const publishResult = await callbackService.publishRunOutputReply(createPublishInput({
      replyText: "Hello after retry",
      callbackIdempotencyKey,
      metadata: { source: "integration-test" },
    }));

    expect(publishResult).toMatchObject({
      published: true,
      duplicate: false,
      reason: null,
    });

    const pendingEvent = await waitFor(async () => {
      return providerSet.deliveryEventProvider.findByCallbackKey(callbackIdempotencyKey);
    });
    expect(pendingEvent?.status).toBe("PENDING");
    await expectPersistenceArtifactsUnderAppDataDir(tempDir);

    const queuedRecord = await waitFor(async () => {
      const [record] = await callbackOutboxService.listByStatus([
        "PENDING",
        "FAILED_RETRY",
        "DISPATCHING",
      ]);
      return record ?? null;
    });
    expect(queuedRecord.callbackIdempotencyKey).toBe(callbackIdempotencyKey);

    await delay(1_250);
    expect(capturedRequests).toHaveLength(0);

    acceptingCallbacks = true;

    const sentEvent = await waitFor(async () => {
      const event = await providerSet.deliveryEventProvider.findByCallbackKey(
        callbackIdempotencyKey,
      );
      if (capturedRequests.length === 0 || event?.status !== "SENT") {
        return null;
      }
      return event;
    }, 10_000);

    expect(capturedRequests).toHaveLength(1);
    expect(callbackAttempts.length).toBeGreaterThanOrEqual(2);
    expect(capturedRequests[0]?.body).toMatchObject({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId: "acct-1",
      peerId: "peer-1",
      threadId: "thread-1",
      correlationMessageId: "ext-msg-1",
      callbackIdempotencyKey,
      replyText: "Hello after retry",
      metadata: {
        turnId: "turn-1",
        source: "integration-test",
      },
    });
    expect(sentEvent?.status).toBe("SENT");
    expect(sentEvent?.errorMessage).toBeNull();

    const sentRecord = await callbackOutboxService.getById(queuedRecord.id);
    expect(sentRecord?.status).toBe("SENT");
    expect(sentRecord?.lastError).toBeNull();
  }, 20_000);

  it("re-dispatches an expired in-flight lease after worker restart semantics", async () => {
    acceptingCallbacks = true;

    const { providerSet, bindingService, callbackOutboxService } =
      createRuntimeHarness();
    const callbackService = buildDefaultReplyCallbackService();
    const callbackIdempotencyKey = `callback-${randomUUID()}`;

    await seedReplyContext({
      bindingService,
    });

    const publishResult = await callbackService.publishRunOutputReply(createPublishInput({
      replyText: "Recovered after lease expiry",
      callbackIdempotencyKey,
      metadata: { source: "lease-recovery-test" },
    }));
    expect(publishResult.published).toBe(true);

    const leased = await callbackOutboxService.leaseBatch({
      limit: 1,
      nowIso: new Date().toISOString(),
      leaseDurationMs: 50,
    });
    expect(leased).toHaveLength(1);
    expect(leased[0]?.status).toBe("DISPATCHING");

    await delay(75);

    const worker = createDispatchWorker(callbackOutboxService, providerSet.deliveryEventProvider, {
      leaseDurationMs: 50,
    });
    await worker.runOnce();

    const sentRecord = await waitFor(async () => {
      const record = await callbackOutboxService.getById(leased[0]!.id);
      if (record?.status !== "SENT") {
        return null;
      }
      return record;
    });
    const sentEvent = await providerSet.deliveryEventProvider.findByCallbackKey(
      callbackIdempotencyKey,
    );

    expect(callbackAttempts).toHaveLength(1);
    expect(capturedRequests).toHaveLength(1);
    expect(sentRecord.attemptCount).toBe(1);
    expect(sentEvent?.status).toBe("SENT");
  });

  it("dead-letters exhausted retries while preserving terminal error state", async () => {
    const { providerSet, bindingService, callbackOutboxService } =
      createRuntimeHarness();
    const callbackService = buildDefaultReplyCallbackService();
    const callbackIdempotencyKey = `callback-${randomUUID()}`;

    await seedReplyContext({
      bindingService,
    });

    const publishResult = await callbackService.publishRunOutputReply(createPublishInput({
      replyText: "This will dead-letter",
      callbackIdempotencyKey,
      metadata: { source: "dead-letter-test" },
    }));
    expect(publishResult.published).toBe(true);

    const worker = createDispatchWorker(callbackOutboxService, providerSet.deliveryEventProvider, {
      maxAttempts: 2,
      baseDelayMs: 25,
      maxDelayMs: 25,
    });

    await worker.runOnce();

    const retryRecord = await waitFor(async () => {
      const [record] = await callbackOutboxService.listByStatus(["FAILED_RETRY"]);
      return record ?? null;
    });
    const pendingEvent = await providerSet.deliveryEventProvider.findByCallbackKey(
      callbackIdempotencyKey,
    );

    expect(retryRecord.callbackIdempotencyKey).toBe(callbackIdempotencyKey);
    expect(retryRecord.attemptCount).toBe(1);
    expect(retryRecord.lastError).toBe("Gateway callback request failed with status 503.");
    expect(pendingEvent?.status).toBe("PENDING");

    await delay(30);
    await worker.runOnce();

    const deadLetterRecord = await waitFor(async () => {
      const record = await callbackOutboxService.getById(retryRecord.id);
      if (record?.status !== "DEAD_LETTER") {
        return null;
      }
      return record;
    });
    const failedEvent = await providerSet.deliveryEventProvider.findByCallbackKey(
      callbackIdempotencyKey,
    );

    expect(callbackAttempts).toHaveLength(2);
    expect(deadLetterRecord.attemptCount).toBe(2);
    expect(deadLetterRecord.lastError).toBe(
      "Gateway callback request failed with status 503.",
    );
    expect(failedEvent?.status).toBe("FAILED");
    expect(failedEvent?.errorMessage).toBe(
      "Gateway callback request failed with status 503.",
    );
  });

  it("suppresses duplicate callback keys without creating duplicate durable work", async () => {
    acceptingCallbacks = true;

    const { providerSet, bindingService, callbackOutboxService } =
      createRuntimeHarness();
    const callbackService = buildDefaultReplyCallbackService();
    const callbackIdempotencyKey = `callback-${randomUUID()}`;

    await seedReplyContext({
      bindingService,
    });

    const firstResult = await callbackService.publishRunOutputReply(createPublishInput({
      replyText: "First publish wins",
      callbackIdempotencyKey,
      metadata: { source: "duplicate-test" },
    }));
    const secondResult = await callbackService.publishRunOutputReply(createPublishInput({
      replyText: "Second publish should be ignored",
      callbackIdempotencyKey,
      metadata: { source: "duplicate-test" },
    }));

    expect(firstResult).toMatchObject({
      published: true,
      duplicate: false,
      reason: null,
    });
    expect(secondResult).toMatchObject({
      published: false,
      duplicate: true,
      reason: "DUPLICATE",
    });

    const worker = createDispatchWorker(callbackOutboxService, providerSet.deliveryEventProvider);
    await worker.runOnce();

    const allRecords = await callbackOutboxService.listByStatus([
      "PENDING",
      "FAILED_RETRY",
      "DISPATCHING",
      "SENT",
      "DEAD_LETTER",
    ]);
    const matchingRecords = allRecords.filter(
      (record) => record.callbackIdempotencyKey === callbackIdempotencyKey,
    );
    const sentEvent = await providerSet.deliveryEventProvider.findByCallbackKey(
      callbackIdempotencyKey,
    );

    expect(matchingRecords).toHaveLength(1);
    expect(callbackAttempts).toHaveLength(1);
    expect(capturedRequests).toHaveLength(1);
    expect(capturedRequests[0]?.body.replyText).toBe("First publish wins");
    expect(sentEvent?.status).toBe("SENT");
  });
});

const createRuntimeHarness = () => {
  const providerSet = getProviderProxySet();
  return {
    providerSet,
    bindingService: new ChannelBindingService(providerSet.bindingProvider),
    callbackOutboxService: new GatewayCallbackOutboxService(
      new FileGatewayCallbackOutboxStore(),
    ),
  };
};

const seedReplyContext = async (deps: {
  bindingService: ChannelBindingService;
}): Promise<void> => {
  await deps.bindingService.upsertBinding({
    provider: ExternalChannelProvider.WHATSAPP,
    transport: ExternalChannelTransport.BUSINESS_API,
    accountId: "acct-1",
    peerId: "peer-1",
    threadId: "thread-1",
    targetType: "AGENT",
    agentRunId: "agent-run-1",
    teamRunId: null,
    targetNodeName: null,
    allowTransportFallback: false,
  });
};

const createPublishInput = (input: {
  replyText: string;
  callbackIdempotencyKey: string;
  metadata?: Record<string, unknown>;
}) => ({
  route: {
    provider: ExternalChannelProvider.WHATSAPP,
    transport: ExternalChannelTransport.BUSINESS_API,
    accountId: "acct-1",
    peerId: "peer-1",
    threadId: "thread-1",
  },
  target: {
    targetType: "AGENT" as const,
    agentRunId: "agent-run-1",
  },
  turnId: "turn-1",
  correlationMessageId: "ext-msg-1",
  replyText: input.replyText,
  callbackIdempotencyKey: input.callbackIdempotencyKey,
  metadata: input.metadata,
});

const expectPersistenceArtifactsUnderAppDataDir = async (
  appDataDir: string,
): Promise<void> => {
  const persistenceRoot = path.join(appDataDir, "external-channel");
  await Promise.all([
    fs.access(path.join(persistenceRoot, "bindings.json")),
    fs.access(path.join(persistenceRoot, "delivery-events.json")),
    fs.access(path.join(persistenceRoot, "gateway-callback-outbox.json")),
  ]);
};

const createDispatchWorker = (
  callbackOutboxService: GatewayCallbackOutboxService,
  deliveryEventProvider: ReturnType<typeof getProviderProxySet>["deliveryEventProvider"],
  overrides: Partial<{
    leaseDurationMs: number;
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
    loopIntervalMs: number;
  }> = {},
): GatewayCallbackDispatchWorker =>
  new GatewayCallbackDispatchWorker({
    outboxService: callbackOutboxService,
    deliveryEventService: new DeliveryEventService(deliveryEventProvider),
    targetResolver: {
      resolveGatewayCallbackDispatchTarget,
    },
    config: {
      batchSize: 10,
      loopIntervalMs: overrides.loopIntervalMs ?? 25,
      leaseDurationMs: overrides.leaseDurationMs ?? 250,
      maxAttempts: overrides.maxAttempts ?? 4,
      baseDelayMs: overrides.baseDelayMs ?? 25,
      maxDelayMs: overrides.maxDelayMs ?? 25,
      backoffFactor: 1,
    },
  });

const delay = async (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async <T>(
  fn: () => Promise<T | null>,
  timeoutMs = 5_000,
  intervalMs = 100,
): Promise<T> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await fn();
    if (value !== null) {
      return value;
    }
    await delay(intervalMs);
  }
  throw new Error(`Timed out waiting for condition after ${timeoutMs}ms.`);
};

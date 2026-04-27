import { access, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import fastify, { type FastifyInstance } from "fastify";
import { describe, expect, it, vi } from "vitest";
import { defaultRuntimeConfig } from "../../src/config/runtime-config.js";
import { createGatewayApp } from "../../src/bootstrap/create-gateway-app.js";
import { ChannelMentionPolicyService } from "../../src/application/services/channel-mention-policy-service.js";
import { InboundClassifierService } from "../../src/application/services/inbound-classifier-service.js";
import { InboundForwarderWorker } from "../../src/application/services/inbound-forwarder-worker.js";
import { InboundInboxService } from "../../src/application/services/inbound-inbox-service.js";
import { OutboundOutboxService } from "../../src/application/services/outbound-outbox-service.js";
import { OutboundSenderWorker } from "../../src/application/services/outbound-sender-worker.js";
import { FileInboxStore } from "../../src/infrastructure/inbox/file-inbox-store.js";
import { FileOutboxStore } from "../../src/infrastructure/outbox/file-outbox-store.js";
import { FileQueueOwnerLock } from "../../src/infrastructure/queue/file-queue-owner-lock.js";
import { AutobyteusServerClient } from "../../src/infrastructure/server-api/autobyteus-server-client.js";

const FIXED_NOW = "2026-02-12T00:00:00.000Z";

describe("gateway queue upgrade reset e2e", () => {
  it("recovers invalid runtime queue files on first API access without touching locks", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "gateway-queue-reset-e2e-"));
    const runtimeDataRoot = path.join(tempRoot, "runtime-data");
    const queueRoot = path.join(runtimeDataRoot, "reliability-queue");
    const inboxRoot = path.join(queueRoot, "inbox");
    const outboxRoot = path.join(queueRoot, "outbox");
    const lockRoot = path.join(queueRoot, "locks");
    let serverApp: FastifyInstance | null = null;
    let gatewayApp: ReturnType<typeof createGatewayApp> | null = null;
    const inboundStartSpy = vi
      .spyOn(InboundForwarderWorker.prototype, "start")
      .mockImplementation(() => undefined);
    const outboundStartSpy = vi
      .spyOn(OutboundSenderWorker.prototype, "start")
      .mockImplementation(() => undefined);
    const heartbeatSpy = vi
      .spyOn(FileQueueOwnerLock.prototype, "heartbeat")
      .mockResolvedValue(undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    try {
      const forwardedPayloads: Array<Record<string, unknown>> = [];
      serverApp = fastify();
      serverApp.post("/rest/api/channel-ingress/v1/messages", async (request, reply) => {
        forwardedPayloads.push(request.body as Record<string, unknown>);
        return reply.code(202).send({
          accepted: true,
          duplicate: false,
          disposition: "ACCEPTED",
          bindingResolved: true,
        });
      });
      await serverApp.listen({ host: "127.0.0.1", port: 0 });
      const address = serverApp.server.address();
      if (!address || typeof address === "string") {
        throw new Error("Failed to resolve mock server address.");
      }
      const serverBaseUrl = `http://127.0.0.1:${address.port}`;

      await seedInvalidRuntimeQueues(inboxRoot, outboxRoot);

      const config = defaultRuntimeConfig();
      config.runtimeDataRoot = runtimeDataRoot;
      config.serverBaseUrl = serverBaseUrl;
      config.allowInsecureServerCallbacks = true;
      config.wecomAppEnabled = false;

      gatewayApp = createGatewayApp(config);
      await gatewayApp.ready();

      const lockPaths = {
        inbox: path.join(lockRoot, "inbox.lock.json"),
        outbox: path.join(lockRoot, "outbox.lock.json"),
      };
      const locksBeforeRecovery = await readLockPair(lockPaths);

      const statusResponse = await gatewayApp.inject({
        method: "GET",
        url: "/api/runtime-reliability/v1/status",
      });
      expect(statusResponse.statusCode).toBe(200);
      expect(statusResponse.json()).toMatchObject({
        queue: {
          inboundDeadLetterCount: 0,
          inboundCompletedUnboundCount: 0,
          outboundDeadLetterCount: 0,
        },
      });

      await expect(readJson(path.join(inboxRoot, "inbound-inbox.json"))).resolves.toEqual({
        version: 1,
        records: [],
      });
      await expect(readJson(path.join(outboxRoot, "outbound-outbox.json"))).resolves.toEqual({
        version: 1,
        records: [],
      });

      const inboundQuarantinePath = await singleQuarantinePath(
        inboxRoot,
        "inbound-inbox.json.quarantined-",
      );
      const outboxQuarantinePath = await singleQuarantinePath(
        outboxRoot,
        "outbound-outbox.json.quarantined-",
      );
      await expect(readFile(inboundQuarantinePath, "utf8")).resolves.toContain(
        "COMPLETED_ROUTED",
      );
      await expect(readFile(outboxQuarantinePath, "utf8")).resolves.toContain('"QUEUED"');

      expect(warnSpy).toHaveBeenCalledWith(
        "[gateway] reliability queue state file quarantined",
        expect.objectContaining({
          queueName: "inbound inbox",
          reason: "Unsupported inbound inbox status: COMPLETED_ROUTED",
          originalFilePath: path.join(inboxRoot, "inbound-inbox.json"),
          quarantineFilePath: inboundQuarantinePath,
        }),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        "[gateway] reliability queue state file quarantined",
        expect.objectContaining({
          queueName: "outbound outbox",
          reason: "Unsupported outbound outbox status: QUEUED",
          originalFilePath: path.join(outboxRoot, "outbound-outbox.json"),
          quarantineFilePath: outboxQuarantinePath,
        }),
      );

      await expect(readLockPair(lockPaths)).resolves.toEqual(locksBeforeRecovery);
      await expect(access(`${lockPaths.inbox}.claim.json`)).rejects.toMatchObject({
        code: "ENOENT",
      });
      await expect(access(`${lockPaths.outbox}.claim.json`)).rejects.toMatchObject({
        code: "ENOENT",
      });

      const externalMessageId = `queue-reset-${Date.now()}`;
      const inboundResponse = await gatewayApp.inject({
        method: "POST",
        url: "/webhooks/whatsapp",
        payload: buildInboundWebhookPayload(externalMessageId),
      });
      expect(inboundResponse.statusCode).toBe(200);
      expect(inboundResponse.json()).toMatchObject({
        accepted: true,
        duplicate: false,
        queued: true,
        envelopeCount: 1,
      });

      const manualInboxService = new InboundInboxService(new FileInboxStore(inboxRoot));
      const manualForwarder = new InboundForwarderWorker({
        inboxService: manualInboxService,
        classifierService: new InboundClassifierService(new ChannelMentionPolicyService()),
        serverClient: new AutobyteusServerClient({
          baseUrl: serverBaseUrl,
          sharedSecret: null,
        }),
        config: {
          batchSize: 10,
          loopIntervalMs: 10,
          maxAttempts: 3,
          baseDelayMs: 10,
          maxDelayMs: 100,
          backoffFactor: 2,
        },
        nowIso: () => FIXED_NOW,
      });
      await manualForwarder.runOnce();

      expect(forwardedPayloads).toHaveLength(1);
      expect(forwardedPayloads[0]).toMatchObject({
        provider: "WHATSAPP",
        transport: "BUSINESS_API",
        accountId: "acct-reset",
        peerId: "peer-reset",
        externalMessageId,
        content: "hello after queue reset",
      });
      const completed = await manualInboxService.listByStatus(["COMPLETED_ACCEPTED"]);
      expect(completed).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            externalMessageId,
            status: "COMPLETED_ACCEPTED",
          }),
        ]),
      );

      const outboundResponse = await gatewayApp.inject({
        method: "POST",
        url: "/api/server-callback/v1/messages",
        payload: buildOutboundCallbackPayload("cb-after-reset"),
      });
      expect(outboundResponse.statusCode).toBe(202);
      expect(outboundResponse.json()).toEqual({
        accepted: true,
        duplicate: false,
        queued: true,
      });
      const pendingOutbound = await new OutboundOutboxService(
        new FileOutboxStore(outboxRoot),
      ).listByStatus(["PENDING"]);
      expect(pendingOutbound).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            dispatchKey: "cb-after-reset",
            status: "PENDING",
          }),
        ]),
      );

      await expect(readLockPair(lockPaths)).resolves.toEqual(locksBeforeRecovery);
    } finally {
      if (gatewayApp) {
        await gatewayApp.close();
      }
      if (serverApp) {
        await serverApp.close();
      }
      inboundStartSpy.mockRestore();
      outboundStartSpy.mockRestore();
      heartbeatSpy.mockRestore();
      warnSpy.mockRestore();
      await rm(tempRoot, { recursive: true, force: true });
    }
  }, 20_000);
});

const seedInvalidRuntimeQueues = async (inboxRoot: string, outboxRoot: string): Promise<void> => {
  await mkdir(inboxRoot, { recursive: true });
  await mkdir(outboxRoot, { recursive: true });
  await writeFile(
    path.join(inboxRoot, "inbound-inbox.json"),
    JSON.stringify(
      {
        version: 1,
        records: [
          {
            ...buildPersistedInboundRecord("legacy-routed"),
            status: "COMPLETED_ROUTED",
          },
        ],
      },
      null,
      2,
    ),
    "utf8",
  );
  await writeFile(
    path.join(outboxRoot, "outbound-outbox.json"),
    JSON.stringify(
      {
        version: 1,
        records: [
          {
            ...buildPersistedOutboundRecord("invalid-outbox"),
            status: "QUEUED",
          },
        ],
      },
      null,
      2,
    ),
    "utf8",
  );
};

const buildInboundWebhookPayload = (externalMessageId: string) => ({
  provider: "WHATSAPP",
  transport: "BUSINESS_API",
  accountId: "acct-reset",
  peerId: "peer-reset",
  peerType: "USER",
  threadId: null,
  externalMessageId,
  content: "hello after queue reset",
  attachments: [],
  receivedAt: FIXED_NOW,
  metadata: {
    source: "queue-reset-e2e",
  },
});

const buildPersistedInboundRecord = (externalMessageId: string) => ({
  id: `record-${externalMessageId}`,
  ingressKey: `ingress-${externalMessageId}`,
  provider: "WHATSAPP",
  transport: "BUSINESS_API",
  accountId: "acct-reset",
  peerId: "peer-reset",
  threadId: null,
  externalMessageId,
  payload: buildInboundWebhookPayload(externalMessageId),
  status: "RECEIVED",
  attemptCount: 0,
  nextAttemptAt: null,
  lastError: null,
  createdAt: FIXED_NOW,
  updatedAt: FIXED_NOW,
});

const buildOutboundCallbackPayload = (callbackIdempotencyKey: string) => ({
  provider: "WHATSAPP",
  transport: "BUSINESS_API",
  accountId: "acct-reset",
  peerId: "peer-reset",
  threadId: null,
  correlationMessageId: "corr-after-reset",
  callbackIdempotencyKey,
  replyText: "outbound after reset",
  attachments: [],
  chunks: [],
  metadata: {},
});

const buildPersistedOutboundRecord = (callbackIdempotencyKey: string) => ({
  id: `record-${callbackIdempotencyKey}`,
  dispatchKey: `dispatch-${callbackIdempotencyKey}`,
  provider: "WHATSAPP",
  transport: "BUSINESS_API",
  accountId: "acct-reset",
  peerId: "peer-reset",
  threadId: null,
  payload: buildOutboundCallbackPayload(callbackIdempotencyKey),
  status: "PENDING",
  attemptCount: 0,
  nextAttemptAt: null,
  lastError: null,
  createdAt: FIXED_NOW,
  updatedAt: FIXED_NOW,
});

const readJson = async (filePath: string): Promise<unknown> =>
  JSON.parse(await readFile(filePath, "utf8"));

const singleQuarantinePath = async (root: string, prefix: string): Promise<string> => {
  const files = (await readdir(root)).filter((entry) => entry.startsWith(prefix));
  expect(files).toHaveLength(1);
  return path.join(root, files[0]);
};

const readLockPair = async (paths: { inbox: string; outbox: string }): Promise<{
  inbox: string;
  outbox: string;
}> => ({
  inbox: await readFile(paths.inbox, "utf8"),
  outbox: await readFile(paths.outbox, "utf8"),
});

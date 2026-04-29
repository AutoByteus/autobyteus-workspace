import os from "node:os";
import path from "node:path";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { ExternalPeerType } from "autobyteus-ts/external-channel/peer-type.js";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { InboundInboxService } from "../../../../src/application/services/inbound-inbox-service.js";
import { InboundForwarderWorker } from "../../../../src/application/services/inbound-forwarder-worker.js";
import { FileInboxStore } from "../../../../src/infrastructure/inbox/file-inbox-store.js";

const buildEnvelope = (externalMessageId: string) => ({
  provider: ExternalChannelProvider.DISCORD,
  transport: ExternalChannelTransport.BUSINESS_API,
  accountId: "acc-1",
  peerId: "user:1",
  peerType: ExternalPeerType.USER,
  threadId: null,
  externalMessageId,
  content: "hello",
  attachments: [],
  receivedAt: "2026-02-12T00:00:00.000Z",
  metadata: {},
  routingKey: "DISCORD:BUSINESS_API:acc-1:user:1:_",
});

describe("InboundForwarderWorker integration", () => {
  it("forwards queued inbound messages and marks them completed", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "inbound-forwarder-worker-"));
    try {
      const inboxService = new InboundInboxService(new FileInboxStore(root));
      const queued = await inboxService.enqueue(buildEnvelope("m-1") as any);
      const forwardInbound = vi.fn(async () => ({
        accepted: true,
        duplicate: false,
        disposition: "ACCEPTED" as const,
        bindingResolved: true,
      }));
      const worker = new InboundForwarderWorker({
        inboxService,
        classifierService: {
          classify: () => ({ decision: "FORWARDABLE" as const }),
        },
        serverClient: {
          forwardInbound,
        },
        config: {
          batchSize: 10,
          loopIntervalMs: 10,
          maxAttempts: 3,
          baseDelayMs: 10,
          maxDelayMs: 100,
          backoffFactor: 2,
        },
      });

      await worker.runOnce();

      const updated = await inboxService.getById(queued.record.id);
      expect(forwardInbound).toHaveBeenCalledOnce();
      expect(updated?.status).toBe("COMPLETED_ACCEPTED");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("recovers an invalid persisted inbox before forwarding new inbound work", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "inbound-forwarder-worker-"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      await writeFile(
        path.join(root, "inbound-inbox.json"),
        JSON.stringify(
          {
            version: 1,
            records: [
              {
                id: "legacy-record",
                ingressKey: "legacy-ingress",
                provider: ExternalChannelProvider.DISCORD,
                transport: ExternalChannelTransport.BUSINESS_API,
                accountId: "acc-1",
                peerId: "user:1",
                threadId: null,
                externalMessageId: "legacy-message",
                payload: buildEnvelope("legacy-message"),
                status: "COMPLETED_ROUTED",
                attemptCount: 0,
                nextAttemptAt: null,
                lastError: null,
                createdAt: "2026-02-12T00:00:00.000Z",
                updatedAt: "2026-02-12T00:00:00.000Z",
              },
            ],
          },
          null,
          2,
        ),
        "utf8",
      );

      const inboxService = new InboundInboxService(new FileInboxStore(root));
      const queued = await inboxService.enqueue(buildEnvelope("m-after-reset") as any);
      const forwardInbound = vi.fn(async () => ({
        accepted: true,
        duplicate: false,
        disposition: "ACCEPTED" as const,
        bindingResolved: true,
      }));
      const worker = new InboundForwarderWorker({
        inboxService,
        classifierService: {
          classify: () => ({ decision: "FORWARDABLE" as const }),
        },
        serverClient: {
          forwardInbound,
        },
        config: {
          batchSize: 10,
          loopIntervalMs: 10,
          maxAttempts: 3,
          baseDelayMs: 10,
          maxDelayMs: 100,
          backoffFactor: 2,
        },
      });

      await worker.runOnce();

      const updated = await inboxService.getById(queued.record.id);
      const quarantineFiles = (await readdir(root)).filter((entry) =>
        entry.startsWith("inbound-inbox.json.quarantined-"),
      );
      expect(quarantineFiles).toHaveLength(1);
      expect(forwardInbound).toHaveBeenCalledOnce();
      expect(updated?.status).toBe("COMPLETED_ACCEPTED");
      expect(warn).toHaveBeenCalledWith(
        "[gateway] reliability queue state file quarantined",
        expect.objectContaining({
          queueName: "inbound inbox",
          originalFilePath: path.join(root, "inbound-inbox.json"),
        }),
      );
    } finally {
      warn.mockRestore();
      await rm(root, { recursive: true, force: true });
    }
  });
});

import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import fastify, { type FastifyInstance } from "fastify";
import { describe, expect, it } from "vitest";
import { defaultRuntimeConfig } from "../../src/config/runtime-config.js";
import { createGatewayApp } from "../../src/bootstrap/create-gateway-app.js";
import { InboundInboxService } from "../../src/application/services/inbound-inbox-service.js";
import { FileInboxStore } from "../../src/infrastructure/inbox/file-inbox-store.js";

const waitForCondition = async (
  predicate: () => boolean | Promise<boolean>,
  timeoutMs = 4_000,
  pollMs = 50,
): Promise<void> => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  throw new Error(`Condition was not met within ${timeoutMs}ms.`);
};

describe("gateway inbound forwarding e2e", () => {
  it("forwards webhook ingress to server and marks inbox record completed", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "gateway-e2e-"));
    const previousCwd = process.cwd();
    let serverApp: FastifyInstance | null = null;
    let gatewayApp: ReturnType<typeof createGatewayApp> | null = null;

    try {
      const forwardedPayloads: Array<Record<string, unknown>> = [];
      serverApp = fastify();
      serverApp.post("/rest/api/channel-ingress/v1/messages", async (request, reply) => {
        forwardedPayloads.push(request.body as Record<string, unknown>);
        return reply.code(202).send({
          accepted: true,
          duplicate: false,
          disposition: "ROUTED",
          bindingResolved: true,
        });
      });
      await serverApp.listen({ host: "127.0.0.1", port: 0 });
      const address = serverApp.server.address();
      if (!address || typeof address === "string") {
        throw new Error("Failed to resolve mock server address.");
      }
      const serverBaseUrl = `http://127.0.0.1:${address.port}`;

      process.chdir(tempRoot);
      const config = defaultRuntimeConfig();
      config.serverBaseUrl = serverBaseUrl;
      gatewayApp = createGatewayApp(config);
      await gatewayApp.ready();

      const externalMessageId = `e2e-msg-${Date.now()}`;
      const response = await gatewayApp.inject({
        method: "POST",
        url: "/webhooks/whatsapp",
        payload: {
          provider: "WHATSAPP",
          transport: "BUSINESS_API",
          accountId: "acct-e2e",
          peerId: "peer-e2e",
          peerType: "USER",
          threadId: null,
          externalMessageId,
          content: "hello from e2e",
          attachments: [],
          receivedAt: "2026-02-12T00:00:00.000Z",
          metadata: {
            source: "vitest-e2e",
          },
        },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        accepted: true,
        duplicate: false,
        blocked: false,
        envelopeCount: 1,
      });

      await waitForCondition(() => forwardedPayloads.length === 1);
      expect(forwardedPayloads[0]).toMatchObject({
        provider: "WHATSAPP",
        transport: "BUSINESS_API",
        accountId: "acct-e2e",
        peerId: "peer-e2e",
        externalMessageId,
        content: "hello from e2e",
      });

      const inboxStore = new FileInboxStore(
        path.join(tempRoot, "memory", "reliability-queue", "inbox"),
      );
      const inboxService = new InboundInboxService(inboxStore);
      await waitForCondition(async () => {
        const completed = await inboxService.listByStatus(["COMPLETED_ROUTED"]);
        return completed.some((record) => record.externalMessageId === externalMessageId);
      });
    } finally {
      if (gatewayApp) {
        await gatewayApp.close();
      }
      if (serverApp) {
        await serverApp.close();
      }
      process.chdir(previousCwd);
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});

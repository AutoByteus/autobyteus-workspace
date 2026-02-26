import { randomUUID } from "node:crypto";
import fastify from "fastify";
import { describe, expect, it } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { ExternalPeerType } from "autobyteus-ts/external-channel/peer-type.js";
import { ExternalDeliveryStatus } from "autobyteus-ts/external-channel/external-delivery-event.js";
import { registerChannelIngressRoutes } from "../../../../src/api/rest/channel-ingress.js";
import { SqlChannelBindingProvider } from "../../../../src/external-channel/providers/sql-channel-binding-provider.js";
import { SqlChannelIdempotencyProvider } from "../../../../src/external-channel/providers/sql-channel-idempotency-provider.js";
import { SqlChannelMessageReceiptProvider } from "../../../../src/external-channel/providers/sql-channel-message-receipt-provider.js";
import { SqlDeliveryEventProvider } from "../../../../src/external-channel/providers/sql-delivery-event-provider.js";
import { ChannelBindingService } from "../../../../src/external-channel/services/channel-binding-service.js";
import { ChannelIdempotencyService } from "../../../../src/external-channel/services/channel-idempotency-service.js";
import { ChannelIngressService } from "../../../../src/external-channel/services/channel-ingress-service.js";
import { ChannelMessageReceiptService } from "../../../../src/external-channel/services/channel-message-receipt-service.js";
import { ChannelThreadLockService } from "../../../../src/external-channel/services/channel-thread-lock-service.js";
import { DeliveryEventService } from "../../../../src/external-channel/services/delivery-event-service.js";
import type { ChannelRuntimeFacade } from "../../../../src/external-channel/runtime/channel-runtime-facade.js";

const unique = (prefix: string): string => `${prefix}-${randomUUID()}`;

const createRuntimeFacade = (): ChannelRuntimeFacade => ({
  dispatchToBinding: async (binding) => ({
    agentRunId: binding.agentRunId,
    teamRunId: binding.teamRunId,
    dispatchedAt: new Date("2026-02-08T00:00:01.000Z"),
  }),
});

describe("REST channel-ingress routes", () => {
  it("routes DISCORD business-api inbound messages and records latest source receipt", async () => {
    const accountId = "discord-acct-1";
    const peerId = "channel:111222333444";
    const threadId = "777888999000";
    const externalMessageId = unique("discord-msg");
    const agentRunId = unique("discord-agent");

    const bindingService = new ChannelBindingService(new SqlChannelBindingProvider());
    await bindingService.upsertBinding({
      provider: ExternalChannelProvider.DISCORD,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId,
      targetType: "AGENT",
      agentRunId,
      teamRunId: null,
      targetMemberName: null,
    });

    const messageReceiptService = new ChannelMessageReceiptService(
      new SqlChannelMessageReceiptProvider(),
    );
    const ingressService = new ChannelIngressService({
      idempotencyService: new ChannelIdempotencyService(
        new SqlChannelIdempotencyProvider(),
      ),
      bindingService,
      threadLockService: new ChannelThreadLockService(),
      runtimeFacade: createRuntimeFacade(),
      messageReceiptService,
    });
    const app = fastify();
    await registerChannelIngressRoutes(app, {
      allowInsecureGatewayRequests: true,
      ingressService,
      deliveryEventService: new DeliveryEventService(
        new SqlDeliveryEventProvider(),
      ),
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/channel-ingress/v1/messages",
      payload: {
        provider: ExternalChannelProvider.DISCORD,
        transport: ExternalChannelTransport.BUSINESS_API,
        accountId,
        peerId,
        peerType: ExternalPeerType.GROUP,
        threadId,
        externalMessageId,
        content: "discord inbound integration",
        attachments: [],
        receivedAt: "2026-02-10T00:00:00.000Z",
        metadata: { source: "discord-integration-test" },
      },
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toMatchObject({
      accepted: true,
      duplicate: false,
      disposition: "ROUTED",
      bindingResolved: true,
      bindingId: expect.any(String),
    });

    const latestSource = await messageReceiptService.getLatestSourceByAgentRunId(agentRunId);
    expect(latestSource).toMatchObject({
      provider: ExternalChannelProvider.DISCORD,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId,
      externalMessageId,
    });

    await app.close();
  });

  it("returns parse error when DISCORD user peer is combined with threadId", async () => {
    const ingressService = new ChannelIngressService({
      idempotencyService: new ChannelIdempotencyService(
        new SqlChannelIdempotencyProvider(),
      ),
      bindingService: new ChannelBindingService(new SqlChannelBindingProvider()),
      threadLockService: new ChannelThreadLockService(),
      runtimeFacade: createRuntimeFacade(),
      messageReceiptService: new ChannelMessageReceiptService(
        new SqlChannelMessageReceiptProvider(),
      ),
    });

    const app = fastify();
    await registerChannelIngressRoutes(app, {
      allowInsecureGatewayRequests: true,
      ingressService,
      deliveryEventService: new DeliveryEventService(
        new SqlDeliveryEventProvider(),
      ),
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/channel-ingress/v1/messages",
      payload: {
        provider: ExternalChannelProvider.DISCORD,
        transport: ExternalChannelTransport.BUSINESS_API,
        accountId: "discord-acct-1",
        peerId: "user:111222333444",
        peerType: ExternalPeerType.USER,
        threadId: "777888999000",
        externalMessageId: unique("discord-invalid"),
        content: "discord invalid route",
        attachments: [],
        receivedAt: "2026-02-10T00:00:00.000Z",
        metadata: {},
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      code: "INVALID_DISCORD_THREAD_TARGET_COMBINATION",
      field: "threadId",
      detail: "Discord threadId can only be used with channel:<snowflake> peerId targets.",
    });

    await app.close();
  });

  it("handles inbound message, persists receipt, and suppresses duplicate by idempotency key", async () => {
    const accountId = unique("acct");
    const peerId = unique("peer");
    const threadId = unique("thread");
    const externalMessageId = unique("msg");
    const agentRunId = unique("agent");

    const bindingService = new ChannelBindingService(new SqlChannelBindingProvider());
    await bindingService.upsertBinding({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId,
      targetType: "AGENT",
      agentRunId,
      teamRunId: null,
      targetMemberName: null,
    });

    const messageReceiptService = new ChannelMessageReceiptService(
      new SqlChannelMessageReceiptProvider(),
    );
    const ingressService = new ChannelIngressService({
      idempotencyService: new ChannelIdempotencyService(
        new SqlChannelIdempotencyProvider(),
      ),
      bindingService,
      threadLockService: new ChannelThreadLockService(),
      runtimeFacade: createRuntimeFacade(),
      messageReceiptService,
    });
    const deliveryEventService = new DeliveryEventService(
      new SqlDeliveryEventProvider(),
    );

    const app = fastify();
    await registerChannelIngressRoutes(app, {
      allowInsecureGatewayRequests: true,
      ingressService,
      deliveryEventService,
    });

    const payload = {
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      peerType: ExternalPeerType.USER,
      threadId,
      externalMessageId,
      content: "hello from integration test",
      attachments: [],
      receivedAt: "2026-02-08T00:00:00.000Z",
      metadata: { source: "integration-test" },
    };

    const first = await app.inject({
      method: "POST",
      url: "/api/channel-ingress/v1/messages",
      payload,
    });
    expect(first.statusCode).toBe(202);
    expect(first.json()).toMatchObject({
      accepted: true,
      duplicate: false,
      disposition: "ROUTED",
      bindingResolved: true,
      bindingId: expect.any(String),
    });

    const second = await app.inject({
      method: "POST",
      url: "/api/channel-ingress/v1/messages",
      payload,
    });
    expect(second.statusCode).toBe(202);
    expect(second.json()).toMatchObject({
      accepted: true,
      duplicate: true,
      disposition: "DUPLICATE",
      bindingResolved: false,
      bindingId: null,
    });

    const latestSource = await messageReceiptService.getLatestSourceByAgentRunId(agentRunId);
    expect(latestSource).toMatchObject({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId,
      externalMessageId,
    });

    await app.close();
  });

  it("returns accepted UNBOUND disposition when no binding exists", async () => {
    const ingressService = new ChannelIngressService({
      idempotencyService: new ChannelIdempotencyService(
        new SqlChannelIdempotencyProvider(),
      ),
      bindingService: new ChannelBindingService(new SqlChannelBindingProvider()),
      threadLockService: new ChannelThreadLockService(),
      runtimeFacade: createRuntimeFacade(),
      messageReceiptService: new ChannelMessageReceiptService(
        new SqlChannelMessageReceiptProvider(),
      ),
    });
    const app = fastify();
    await registerChannelIngressRoutes(app, {
      allowInsecureGatewayRequests: true,
      ingressService,
      deliveryEventService: new DeliveryEventService(
        new SqlDeliveryEventProvider(),
      ),
    });

    const payload = {
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId: unique("acct-unbound"),
      peerId: unique("peer-unbound"),
      peerType: ExternalPeerType.USER,
      threadId: unique("thread-unbound"),
      externalMessageId: unique("msg-unbound"),
      content: "hello from unbound integration test",
      attachments: [],
      receivedAt: "2026-02-08T00:00:00.000Z",
      metadata: { source: "integration-test" },
    };

    const response = await app.inject({
      method: "POST",
      url: "/api/channel-ingress/v1/messages",
      payload,
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toMatchObject({
      accepted: true,
      duplicate: false,
      disposition: "UNBOUND",
      bindingResolved: false,
      bindingId: null,
    });

    await app.close();
  });

  it("transitions from UNBOUND to ROUTED after binding is created for the same source identity", async () => {
    const accountId = unique("acct-lifecycle");
    const peerId = unique("peer-lifecycle");
    const threadId = unique("thread-lifecycle");
    const agentRunId = unique("agent-lifecycle");

    const bindingService = new ChannelBindingService(new SqlChannelBindingProvider());
    const messageReceiptService = new ChannelMessageReceiptService(
      new SqlChannelMessageReceiptProvider(),
    );
    const ingressService = new ChannelIngressService({
      idempotencyService: new ChannelIdempotencyService(
        new SqlChannelIdempotencyProvider(),
      ),
      bindingService,
      threadLockService: new ChannelThreadLockService(),
      runtimeFacade: createRuntimeFacade(),
      messageReceiptService,
    });
    const app = fastify();
    await registerChannelIngressRoutes(app, {
      allowInsecureGatewayRequests: true,
      ingressService,
      deliveryEventService: new DeliveryEventService(
        new SqlDeliveryEventProvider(),
      ),
    });

    const basePayload = {
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      peerType: ExternalPeerType.USER,
      threadId,
      attachments: [],
      receivedAt: "2026-02-08T00:00:00.000Z",
      metadata: { source: "integration-test" },
    };

    const beforeBindResponse = await app.inject({
      method: "POST",
      url: "/api/channel-ingress/v1/messages",
      payload: {
        ...basePayload,
        externalMessageId: unique("msg-before-bind"),
        content: "before binding",
      },
    });
    expect(beforeBindResponse.statusCode).toBe(202);
    expect(beforeBindResponse.json()).toMatchObject({
      accepted: true,
      duplicate: false,
      disposition: "UNBOUND",
      bindingResolved: false,
      bindingId: null,
    });

    await bindingService.upsertBinding({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId,
      targetType: "AGENT",
      agentRunId,
      teamRunId: null,
      targetMemberName: null,
    });

    const afterBindExternalMessageId = unique("msg-after-bind");
    const afterBindResponse = await app.inject({
      method: "POST",
      url: "/api/channel-ingress/v1/messages",
      payload: {
        ...basePayload,
        externalMessageId: afterBindExternalMessageId,
        content: "after binding",
      },
    });
    expect(afterBindResponse.statusCode).toBe(202);
    expect(afterBindResponse.json()).toMatchObject({
      accepted: true,
      duplicate: false,
      disposition: "ROUTED",
      bindingResolved: true,
      bindingId: expect.any(String),
    });

    const latestSource = await messageReceiptService.getLatestSourceByAgentRunId(agentRunId);
    expect(latestSource).toMatchObject({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId,
      externalMessageId: afterBindExternalMessageId,
    });

    await app.close();
  });

  it("passes inbound image attachments through channel-ingress to runtime dispatch", async () => {
    const accountId = unique("acct-image");
    const peerId = unique("peer-image");
    const threadId = unique("thread-image");
    const externalMessageId = unique("msg-image");
    const agentRunId = unique("agent-image");
    let capturedAttachments: unknown[] | null = null;

    const bindingService = new ChannelBindingService(new SqlChannelBindingProvider());
    await bindingService.upsertBinding({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId,
      targetType: "AGENT",
      agentRunId,
      teamRunId: null,
      targetMemberName: null,
    });

    const messageReceiptService = new ChannelMessageReceiptService(
      new SqlChannelMessageReceiptProvider(),
    );
    const ingressService = new ChannelIngressService({
      idempotencyService: new ChannelIdempotencyService(
        new SqlChannelIdempotencyProvider(),
      ),
      bindingService,
      threadLockService: new ChannelThreadLockService(),
      runtimeFacade: {
        dispatchToBinding: async (binding, envelope) => {
          capturedAttachments = envelope.attachments;
          return {
            agentRunId: binding.agentRunId,
            teamRunId: binding.teamRunId,
            dispatchedAt: new Date("2026-02-08T00:00:01.000Z"),
          };
        },
      },
      messageReceiptService,
    });

    const app = fastify();
    await registerChannelIngressRoutes(app, {
      allowInsecureGatewayRequests: true,
      ingressService,
      deliveryEventService: new DeliveryEventService(
        new SqlDeliveryEventProvider(),
      ),
    });

    const payload = {
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      peerType: ExternalPeerType.USER,
      threadId,
      externalMessageId,
      content: "image from whatsapp",
      attachments: [
        {
          kind: "image",
          url: "data:image/jpeg;base64,ZmFrZQ==",
          mimeType: "image/jpeg",
          fileName: "wa-photo.jpg",
          sizeBytes: 4,
          metadata: { source: "whatsapp-personal" },
        },
      ],
      receivedAt: "2026-02-08T00:00:00.000Z",
      metadata: { source: "integration-test" },
    };

    const response = await app.inject({
      method: "POST",
      url: "/api/channel-ingress/v1/messages",
      payload,
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toMatchObject({
      accepted: true,
      duplicate: false,
      disposition: "ROUTED",
      bindingResolved: true,
      bindingId: expect.any(String),
    });
    expect(capturedAttachments).toMatchObject([
      {
        kind: "image",
        url: "data:image/jpeg;base64,ZmFrZQ==",
        mimeType: "image/jpeg",
        fileName: "wa-photo.jpg",
        sizeBytes: 4,
      },
    ]);

    await app.close();
  });

  it("records delivery-event lifecycle updates and enforces delivery-event parse requirements", async () => {
    const deliveryEventService = new DeliveryEventService(
      new SqlDeliveryEventProvider(),
    );
    const app = fastify();
    await registerChannelIngressRoutes(app, {
      allowInsecureGatewayRequests: true,
      ingressService: {
        handleInboundMessage: async () => {
          throw new Error("not used in this test");
        },
      },
      deliveryEventService,
    });

    const accountId = unique("acct");
    const peerId = unique("peer");
    const callbackKey = unique("cb");
    const correlationMessageId = unique("corr");

    const response = await app.inject({
      method: "POST",
      url: "/api/channel-ingress/v1/delivery-events",
      payload: {
        provider: ExternalChannelProvider.WHATSAPP,
        transport: ExternalChannelTransport.BUSINESS_API,
        accountId,
        peerId,
        threadId: null,
        correlationMessageId,
        status: ExternalDeliveryStatus.SENT,
        occurredAt: "2026-02-08T00:00:00.000Z",
        metadata: {
          callbackIdempotencyKey: callbackKey,
        },
      },
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({
      accepted: true,
      status: ExternalDeliveryStatus.SENT,
      callbackIdempotencyKey: callbackKey,
    });

    const persisted = await new SqlDeliveryEventProvider().findByCallbackKey(callbackKey);
    expect(persisted).toMatchObject({
      callbackIdempotencyKey: callbackKey,
      status: "SENT",
      correlationMessageId,
      accountId,
      peerId,
    });

    const fallbackCorrelationId = unique("corr");
    const fallbackResponse = await app.inject({
      method: "POST",
      url: "/api/channel-ingress/v1/delivery-events",
      payload: {
        provider: ExternalChannelProvider.WHATSAPP,
        transport: ExternalChannelTransport.BUSINESS_API,
        accountId: unique("acct"),
        peerId: unique("peer"),
        threadId: null,
        correlationMessageId: fallbackCorrelationId,
        status: ExternalDeliveryStatus.DELIVERED,
        occurredAt: "2026-02-08T00:00:00.000Z",
        metadata: {},
      },
    });

    expect(fallbackResponse.statusCode).toBe(202);
    expect(fallbackResponse.json()).toEqual({
      accepted: true,
      status: ExternalDeliveryStatus.DELIVERED,
      callbackIdempotencyKey: fallbackCorrelationId,
    });

    const missingKeyResponse = await app.inject({
      method: "POST",
      url: "/api/channel-ingress/v1/delivery-events",
      payload: {
        provider: ExternalChannelProvider.WHATSAPP,
        transport: ExternalChannelTransport.BUSINESS_API,
        accountId: unique("acct"),
        peerId: unique("peer"),
        threadId: null,
        correlationMessageId: "   ",
        status: ExternalDeliveryStatus.SENT,
        occurredAt: "2026-02-08T00:00:00.000Z",
        metadata: {},
      },
    });

    expect(missingKeyResponse.statusCode).toBe(400);
    expect(missingKeyResponse.json()).toMatchObject({
      code: "INVALID_INPUT",
      field: "correlationMessageId",
    });

    await app.close();
  });
});

import fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { ExternalDeliveryStatus } from "autobyteus-ts/external-channel/external-delivery-event.js";
import { ExternalPeerType } from "autobyteus-ts/external-channel/peer-type.js";
import { createChannelRoutingKey } from "autobyteus-ts/external-channel/channel-routing-key.js";
import type { ChannelIngressResult } from "../../../../src/external-channel/services/channel-ingress-service.js";
import { registerChannelIngressRoutes } from "../../../../src/api/rest/channel-ingress.js";

const buildInboundPayload = () => ({
  provider: ExternalChannelProvider.WHATSAPP,
  transport: ExternalChannelTransport.BUSINESS_API,
  accountId: "acct-1",
  peerId: "peer-1",
  peerType: ExternalPeerType.USER,
  threadId: "thread-1",
  externalMessageId: "msg-1",
  content: "hello",
  attachments: [],
  receivedAt: "2026-02-08T00:00:00.000Z",
  metadata: {},
  routingKey: createChannelRoutingKey({
    provider: ExternalChannelProvider.WHATSAPP,
    transport: ExternalChannelTransport.BUSINESS_API,
    accountId: "acct-1",
    peerId: "peer-1",
    threadId: "thread-1",
  }),
});

const buildIngressResult = (): ChannelIngressResult => ({
  duplicate: false,
  idempotencyKey: "key-1",
  disposition: "ROUTED",
  bindingResolved: true,
  binding: {
    id: "binding-1",
    provider: ExternalChannelProvider.WHATSAPP,
    transport: ExternalChannelTransport.BUSINESS_API,
    accountId: "acct-1",
    peerId: "peer-1",
    threadId: "thread-1",
    targetType: "AGENT",
    agentId: "agent-1",
    teamId: null,
    targetMemberName: null,
    createdAt: new Date("2026-02-08T00:00:00.000Z"),
    updatedAt: new Date("2026-02-08T00:00:00.000Z"),
  },
  dispatch: {
    agentId: "agent-1",
    teamId: null,
    dispatchedAt: new Date("2026-02-08T00:00:01.000Z"),
  },
});

describe("registerChannelIngressRoutes", () => {
  it("accepts and dispatches valid inbound messages", async () => {
    const ingressService = {
      handleInboundMessage: vi.fn().mockResolvedValue(buildIngressResult()),
    };
    const deliveryEventService = {
      recordPending: vi.fn(),
      recordSent: vi.fn(),
      recordDelivered: vi.fn(),
      recordFailed: vi.fn(),
    };
    const app = fastify();
    await registerChannelIngressRoutes(app, {
      ingressService,
      deliveryEventService,
      allowInsecureGatewayRequests: true,
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/channel-ingress/v1/messages",
      payload: buildInboundPayload(),
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({
      accepted: true,
      duplicate: false,
      disposition: "ROUTED",
      bindingResolved: true,
      idempotencyKey: "key-1",
      bindingId: "binding-1",
    });
    expect(ingressService.handleInboundMessage).toHaveBeenCalledOnce();
    await app.close();
  });

  it("returns 202 UNBOUND when binding is missing", async () => {
    const ingressService = {
      handleInboundMessage: vi
        .fn()
        .mockResolvedValue({
          duplicate: false,
          idempotencyKey: "key-unbound",
          disposition: "UNBOUND",
          bindingResolved: false,
          binding: null,
          dispatch: null,
        } satisfies ChannelIngressResult),
    };
    const app = fastify();
    await registerChannelIngressRoutes(app, {
      ingressService,
      deliveryEventService: {
        recordPending: vi.fn(),
        recordSent: vi.fn(),
        recordDelivered: vi.fn(),
        recordFailed: vi.fn(),
      },
      allowInsecureGatewayRequests: true,
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/channel-ingress/v1/messages",
      payload: buildInboundPayload(),
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({
      accepted: true,
      duplicate: false,
      disposition: "UNBOUND",
      bindingResolved: false,
      idempotencyKey: "key-unbound",
      bindingId: null,
    });
    await app.close();
  });

  it("returns 400 for malformed inbound payloads", async () => {
    const app = fastify();
    await registerChannelIngressRoutes(app, {
      ingressService: {
        handleInboundMessage: vi.fn(),
      },
      deliveryEventService: {
        recordPending: vi.fn(),
        recordSent: vi.fn(),
        recordDelivered: vi.fn(),
        recordFailed: vi.fn(),
      },
      allowInsecureGatewayRequests: true,
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/channel-ingress/v1/messages",
      payload: { invalid: true },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      code: "INVALID_PROVIDER",
    });
    await app.close();
  });

  it("returns 401 when signature verification fails", async () => {
    const app = fastify();
    await registerChannelIngressRoutes(app, {
      ingressService: {
        handleInboundMessage: vi.fn(),
      },
      deliveryEventService: {
        recordPending: vi.fn(),
        recordSent: vi.fn(),
        recordDelivered: vi.fn(),
        recordFailed: vi.fn(),
      },
      gatewaySecret: "test-secret",
      verifyGatewaySignature: vi.fn().mockReturnValue({
        valid: false,
        errorCode: "INVALID_SIGNATURE",
        message: "Gateway signature mismatch.",
      }),
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/channel-ingress/v1/messages",
      payload: buildInboundPayload(),
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      code: "INVALID_SIGNATURE",
      detail: "Gateway signature mismatch.",
    });
    await app.close();
  });

  it("records delivery-event updates", async () => {
    const deliveryEventService = {
      recordPending: vi.fn(),
      recordSent: vi.fn().mockResolvedValue(undefined),
      recordDelivered: vi.fn(),
      recordFailed: vi.fn(),
    };
    const app = fastify();
    await registerChannelIngressRoutes(app, {
      ingressService: {
        handleInboundMessage: vi.fn(),
      },
      deliveryEventService,
      allowInsecureGatewayRequests: true,
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/channel-ingress/v1/delivery-events",
      payload: {
        provider: ExternalChannelProvider.WHATSAPP,
        transport: ExternalChannelTransport.BUSINESS_API,
        accountId: "acct-1",
        peerId: "peer-1",
        threadId: "thread-1",
        correlationMessageId: "corr-1",
        status: ExternalDeliveryStatus.SENT,
        occurredAt: "2026-02-08T00:00:00.000Z",
        metadata: {
          callbackIdempotencyKey: "cb-1",
        },
      },
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({
      accepted: true,
      status: ExternalDeliveryStatus.SENT,
      callbackIdempotencyKey: "cb-1",
    });
    expect(deliveryEventService.recordSent).toHaveBeenCalledWith(
      expect.objectContaining({
        callbackIdempotencyKey: "cb-1",
        correlationMessageId: "corr-1",
      }),
    );
    await app.close();
  });

  it("records DELIVERED delivery-event updates without collapsing to SENT", async () => {
    const deliveryEventService = {
      recordPending: vi.fn(),
      recordSent: vi.fn(),
      recordDelivered: vi.fn().mockResolvedValue(undefined),
      recordFailed: vi.fn(),
    };
    const app = fastify();
    await registerChannelIngressRoutes(app, {
      ingressService: {
        handleInboundMessage: vi.fn(),
      },
      deliveryEventService,
      allowInsecureGatewayRequests: true,
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/channel-ingress/v1/delivery-events",
      payload: {
        provider: ExternalChannelProvider.WHATSAPP,
        transport: ExternalChannelTransport.BUSINESS_API,
        accountId: "acct-1",
        peerId: "peer-1",
        threadId: "thread-1",
        correlationMessageId: "corr-2",
        status: ExternalDeliveryStatus.DELIVERED,
        occurredAt: "2026-02-08T00:00:00.000Z",
        metadata: {
          callbackIdempotencyKey: "cb-2",
        },
      },
    });

    expect(response.statusCode).toBe(202);
    expect(deliveryEventService.recordDelivered).toHaveBeenCalledWith(
      expect.objectContaining({
        callbackIdempotencyKey: "cb-2",
        correlationMessageId: "corr-2",
      }),
    );
    expect(deliveryEventService.recordSent).not.toHaveBeenCalled();
    await app.close();
  });

  it("returns 401 when gateway secret is not configured and insecure mode is disabled", async () => {
    const app = fastify();
    await registerChannelIngressRoutes(app, {
      ingressService: {
        handleInboundMessage: vi.fn(),
      },
      deliveryEventService: {
        recordPending: vi.fn(),
        recordSent: vi.fn(),
        recordDelivered: vi.fn(),
        recordFailed: vi.fn(),
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/channel-ingress/v1/messages",
      payload: buildInboundPayload(),
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      code: "MISSING_SECRET",
      detail: "Gateway secret is missing.",
    });
    await app.close();
  });
});

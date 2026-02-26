import { describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { createChannelRoutingKey } from "autobyteus-ts/external-channel/channel-routing-key.js";
import { ExternalPeerType } from "autobyteus-ts/external-channel/peer-type.js";
import { ChannelIngressService } from "../../../../src/external-channel/services/channel-ingress-service.js";
import type {
  ChannelBinding,
  ChannelIdempotencyDecision,
} from "../../../../src/external-channel/domain/models.js";
import type {
  ChannelRuntimeDispatchResult,
  ChannelRuntimeFacade,
} from "../../../../src/external-channel/runtime/channel-runtime-facade.js";

const createBinding = (): ChannelBinding => ({
  id: "binding-1",
  provider: ExternalChannelProvider.WHATSAPP,
  transport: ExternalChannelTransport.BUSINESS_API,
  accountId: "acct-1",
  peerId: "peer-1",
  threadId: null,
  targetType: "AGENT",
  agentRunId: "agent-1",
  teamRunId: null,
  targetMemberName: null,
  createdAt: new Date("2026-02-08T00:00:00.000Z"),
  updatedAt: new Date("2026-02-08T00:00:00.000Z"),
});

const createEnvelope = () => ({
  provider: ExternalChannelProvider.WHATSAPP,
  transport: ExternalChannelTransport.BUSINESS_API,
  accountId: "acct-1",
  peerId: "peer-1",
  peerType: ExternalPeerType.USER,
  threadId: null,
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
    threadId: null,
  }),
});

const createIdempotencyDecision = (
  duplicate: boolean,
): ChannelIdempotencyDecision => ({
  duplicate,
  key: "ignored",
  firstSeenAt: duplicate ? new Date("2026-02-08T00:00:00.000Z") : null,
  expiresAt: null,
});

describe("ChannelIngressService", () => {
  it("short-circuits duplicate ingress events", async () => {
    const idempotencyService = {
      ensureFirstSeen: vi.fn().mockResolvedValue(createIdempotencyDecision(true)),
    };
    const bindingService = {
      resolveBinding: vi.fn(),
    };
    const threadLockService = {
      withThreadLock: vi.fn(),
    };
    const runtimeFacade: ChannelRuntimeFacade = {
      dispatchToBinding: vi.fn(),
    };
    const messageReceiptService = {
      recordIngressReceipt: vi.fn(),
    };
    const service = new ChannelIngressService({
      idempotencyService,
      bindingService,
      threadLockService,
      runtimeFacade,
      messageReceiptService,
    });

    const result = await service.handleInboundMessage(createEnvelope());

    expect(result.duplicate).toBe(true);
    expect(bindingService.resolveBinding).not.toHaveBeenCalled();
    expect(threadLockService.withThreadLock).not.toHaveBeenCalled();
    expect(messageReceiptService.recordIngressReceipt).not.toHaveBeenCalled();
  });

  it("returns UNBOUND disposition when no binding can be resolved", async () => {
    const idempotencyService = {
      ensureFirstSeen: vi.fn().mockResolvedValue(createIdempotencyDecision(false)),
    };
    const bindingService = {
      resolveBinding: vi.fn().mockResolvedValue(null),
    };
    const threadLockService = {
      withThreadLock: vi.fn(),
    };
    const runtimeFacade: ChannelRuntimeFacade = {
      dispatchToBinding: vi.fn(),
    };
    const messageReceiptService = {
      recordIngressReceipt: vi.fn(),
    };
    const service = new ChannelIngressService({
      idempotencyService,
      bindingService,
      threadLockService,
      runtimeFacade,
      messageReceiptService,
    });

    const result = await service.handleInboundMessage(createEnvelope());

    expect(result).toMatchObject({
      duplicate: false,
      disposition: "UNBOUND",
      bindingResolved: false,
      binding: null,
      dispatch: null,
    });
    expect(runtimeFacade.dispatchToBinding).not.toHaveBeenCalled();
    expect(messageReceiptService.recordIngressReceipt).not.toHaveBeenCalled();
  });

  it("dispatches and records source context for non-duplicate inbound messages", async () => {
    const binding = createBinding();
    const dispatchResult: ChannelRuntimeDispatchResult = {
      agentRunId: "agent-1",
      teamRunId: null,
      dispatchedAt: new Date("2026-02-08T00:00:10.000Z"),
    };
    const idempotencyService = {
      ensureFirstSeen: vi.fn().mockResolvedValue(createIdempotencyDecision(false)),
    };
    const bindingService = {
      resolveBinding: vi.fn().mockResolvedValue(binding),
    };
    const threadLockService = {
      withThreadLock: vi.fn(async (_key: string, work: () => Promise<unknown>) => work()),
    };
    const runtimeFacade: ChannelRuntimeFacade = {
      dispatchToBinding: vi.fn().mockResolvedValue(dispatchResult),
    };
    const messageReceiptService = {
      recordIngressReceipt: vi.fn().mockResolvedValue(undefined),
    };
    const service = new ChannelIngressService({
      idempotencyService,
      bindingService,
      threadLockService,
      runtimeFacade,
      messageReceiptService,
    });
    const envelope = createEnvelope();

    const result = await service.handleInboundMessage(envelope);

    expect(result.duplicate).toBe(false);
    expect(result.disposition).toBe("ROUTED");
    expect(result.bindingResolved).toBe(true);
    expect(result.binding?.id).toBe("binding-1");
    expect(threadLockService.withThreadLock).toHaveBeenCalledWith(
      envelope.routingKey,
      expect.any(Function),
    );
    expect(runtimeFacade.dispatchToBinding).toHaveBeenCalledWith(binding, envelope);
    expect(messageReceiptService.recordIngressReceipt).toHaveBeenCalledWith({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId: "acct-1",
      peerId: "peer-1",
      threadId: null,
      externalMessageId: "msg-1",
      receivedAt: new Date("2026-02-08T00:00:00.000Z"),
      agentRunId: "agent-1",
      teamRunId: null,
    });
  });

  it("falls back to binding target when runtime dispatch omits target ids", async () => {
    const binding = createBinding();
    const idempotencyService = {
      ensureFirstSeen: vi.fn().mockResolvedValue(createIdempotencyDecision(false)),
    };
    const bindingService = {
      resolveBinding: vi.fn().mockResolvedValue(binding),
    };
    const threadLockService = {
      withThreadLock: vi.fn(async (_key: string, work: () => Promise<unknown>) => work()),
    };
    const runtimeFacade: ChannelRuntimeFacade = {
      dispatchToBinding: vi.fn().mockResolvedValue({
        agentRunId: null,
        teamRunId: null,
        dispatchedAt: new Date("2026-02-08T00:00:10.000Z"),
      } satisfies ChannelRuntimeDispatchResult),
    };
    const messageReceiptService = {
      recordIngressReceipt: vi.fn().mockResolvedValue(undefined),
    };
    const service = new ChannelIngressService({
      idempotencyService,
      bindingService,
      threadLockService,
      runtimeFacade,
      messageReceiptService,
    });

    await service.handleInboundMessage(createEnvelope());

    expect(messageReceiptService.recordIngressReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        agentRunId: "agent-1",
        teamRunId: null,
      }),
    );
  });
});

import { describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { createChannelRoutingKey } from "autobyteus-ts/external-channel/channel-routing-key.js";
import { ExternalPeerType } from "autobyteus-ts/external-channel/peer-type.js";
import { ChannelIngressService } from "../../../../src/external-channel/services/channel-ingress-service.js";
import type {
  ChannelBinding,
  ChannelMessageReceipt,
  ResolvedBinding,
} from "../../../../src/external-channel/domain/models.js";
import type { ChannelRunDispatchResult } from "../../../../src/external-channel/runtime/channel-run-dispatch-result.js";

const createBinding = (): ChannelBinding => ({
  id: "binding-1",
  provider: ExternalChannelProvider.WHATSAPP,
  transport: ExternalChannelTransport.BUSINESS_API,
  accountId: "acct-1",
  peerId: "peer-1",
  threadId: null,
  targetType: "AGENT",
  agentDefinitionId: "agent-definition-1",
  launchPreset: {
    workspaceRootPath: "/tmp/workspace",
    llmModelIdentifier: "gpt-test",
    runtimeKind: "AUTOBYTEUS",
    autoExecuteTools: false,
    skillAccessMode: "PRELOADED_ONLY",
    llmConfig: null,
  },
  agentRunId: "agent-1",
  teamRunId: null,
  targetNodeName: null,
  allowTransportFallback: false,
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

const createReceipt = (
  overrides: Partial<ChannelMessageReceipt> = {},
): ChannelMessageReceipt => ({
  provider: ExternalChannelProvider.WHATSAPP,
  transport: ExternalChannelTransport.BUSINESS_API,
  accountId: "acct-1",
  peerId: "peer-1",
  threadId: null,
  externalMessageId: "msg-1",
  receivedAt: new Date("2026-02-08T00:00:00.000Z"),
  ingressState: "ROUTED",
  turnId: null,
  agentRunId: "agent-1",
  teamRunId: null,
  dispatchLeaseToken: null,
  dispatchLeaseExpiresAt: null,
  createdAt: new Date("2026-02-08T00:00:00.000Z"),
  updatedAt: new Date("2026-02-08T00:00:00.000Z"),
  ...overrides,
});

describe("ChannelIngressService", () => {
  it("short-circuits duplicate ingress events", async () => {
    const bindingService = {
      resolveBinding: vi.fn(),
    };
    const threadLockService = {
      withThreadLock: vi.fn(async (_key: string, work: () => Promise<unknown>) => work()),
    };
    const runFacade = {
      dispatchToBinding: vi.fn(),
    };
    const messageReceiptService = {
      getReceiptByExternalMessage: vi
        .fn()
        .mockResolvedValue(createReceipt({ ingressState: "ROUTED" })),
      createPendingIngressReceipt: vi.fn(),
      claimIngressDispatch: vi.fn(),
      recordAcceptedDispatch: vi.fn(),
      markIngressUnbound: vi.fn(),
    };
    const service = new ChannelIngressService({
      bindingService,
      threadLockService,
      runFacade,
      messageReceiptService,
    });

    const result = await service.handleInboundMessage(createEnvelope());

    expect(result.duplicate).toBe(true);
    expect(bindingService.resolveBinding).not.toHaveBeenCalled();
    expect(runFacade.dispatchToBinding).not.toHaveBeenCalled();
    expect(messageReceiptService.createPendingIngressReceipt).not.toHaveBeenCalled();
  });

  it("re-registers unfinished ACCEPTED receipts with the recovery runtime", async () => {
    const existingAccepted = createReceipt({
      ingressState: "ACCEPTED",
      turnId: "turn-accepted",
    });
    const bindingService = {
      resolveBinding: vi.fn(),
    };
    const threadLockService = {
      withThreadLock: vi.fn(async (_key: string, work: () => Promise<unknown>) => work()),
    };
    const runFacade = {
      dispatchToBinding: vi.fn(),
    };
    const messageReceiptService = {
      getReceiptByExternalMessage: vi.fn().mockResolvedValue(existingAccepted),
      createPendingIngressReceipt: vi.fn(),
      claimIngressDispatch: vi.fn(),
      recordAcceptedDispatch: vi.fn(),
      markIngressUnbound: vi.fn(),
      isDispatchLeaseExpired: vi.fn(),
    };
    const acceptedReceiptRecoveryRuntime = {
      registerAcceptedReceipt: vi.fn().mockResolvedValue(undefined),
    };
    const service = new ChannelIngressService({
      bindingService,
      threadLockService,
      runFacade,
      messageReceiptService,
      acceptedReceiptRecoveryRuntime,
    });

    const result = await service.handleInboundMessage(createEnvelope());

    expect(result).toMatchObject({
      duplicate: true,
      disposition: "ACCEPTED",
      bindingResolved: false,
      binding: null,
      dispatch: null,
    });
    expect(acceptedReceiptRecoveryRuntime.registerAcceptedReceipt).toHaveBeenCalledWith(
      existingAccepted,
    );
    expect(bindingService.resolveBinding).not.toHaveBeenCalled();
    expect(runFacade.dispatchToBinding).not.toHaveBeenCalled();
  });

  it("returns UNBOUND disposition when no binding can be resolved", async () => {
    const bindingService = {
      resolveBinding: vi.fn().mockResolvedValue(null),
    };
    const threadLockService = {
      withThreadLock: vi.fn(async (_key: string, work: () => Promise<unknown>) => work()),
    };
    const runFacade = {
      dispatchToBinding: vi.fn(),
    };
    const messageReceiptService = {
      getReceiptByExternalMessage: vi.fn().mockResolvedValue(null),
      createPendingIngressReceipt: vi.fn().mockResolvedValue(createReceipt({
        ingressState: "PENDING",
        agentRunId: null,
      })),
      claimIngressDispatch: vi.fn(),
      recordAcceptedDispatch: vi.fn(),
      markIngressUnbound: vi.fn().mockResolvedValue(createReceipt({
        ingressState: "UNBOUND",
        agentRunId: null,
      })),
    };
    const service = new ChannelIngressService({
      bindingService,
      threadLockService,
      runFacade,
      messageReceiptService,
    });

    const result = await service.handleInboundMessage(createEnvelope());

    expect(result).toMatchObject({
      duplicate: false,
      disposition: "UNBOUND",
      bindingResolved: false,
      binding: null,
      usedTransportFallback: false,
      dispatch: null,
    });
    expect(runFacade.dispatchToBinding).not.toHaveBeenCalled();
    expect(messageReceiptService.createPendingIngressReceipt).toHaveBeenCalledOnce();
    expect(messageReceiptService.markIngressUnbound).toHaveBeenCalledOnce();
  });

  it("dispatches and records source context for non-duplicate inbound messages", async () => {
    const binding = createBinding();
    const resolvedBinding: ResolvedBinding = {
      binding,
      usedTransportFallback: false,
    };
    const dispatchResult: ChannelRunDispatchResult = {
      dispatchTargetType: "AGENT",
      agentRunId: "agent-1",
      turnId: "turn-1",
      dispatchedAt: new Date("2026-02-08T00:00:10.000Z"),
    };
    const bindingService = {
      resolveBinding: vi.fn().mockResolvedValue(resolvedBinding),
    };
    const threadLockService = {
      withThreadLock: vi.fn(async (_key: string, work: () => Promise<unknown>) => work()),
    };
    const runFacade = {
      dispatchToBinding: vi.fn().mockResolvedValue(dispatchResult),
    };
    const messageReceiptService = {
      getReceiptByExternalMessage: vi.fn().mockResolvedValue(null),
      createPendingIngressReceipt: vi.fn().mockResolvedValue(createReceipt({
        ingressState: "PENDING",
        agentRunId: null,
      })),
      claimIngressDispatch: vi.fn().mockResolvedValue(createReceipt({
        ingressState: "DISPATCHING",
        agentRunId: null,
        dispatchLeaseToken: "lease-1",
        dispatchLeaseExpiresAt: new Date("2026-02-08T00:00:30.000Z"),
      })),
      recordAcceptedDispatch: vi.fn().mockResolvedValue(
        createReceipt({ ingressState: "ACCEPTED", turnId: "turn-1" }),
      ),
      markIngressUnbound: vi.fn(),
    };
    const acceptedReceiptRecoveryRuntime = {
      registerAcceptedReceipt: vi.fn().mockResolvedValue(undefined),
    };
    const service = new ChannelIngressService({
      bindingService,
      threadLockService,
      runFacade,
      messageReceiptService,
      acceptedReceiptRecoveryRuntime,
    });
    const envelope = createEnvelope();

    const result = await service.handleInboundMessage(envelope);

    expect(result.duplicate).toBe(false);
    expect(result.disposition).toBe("ACCEPTED");
    expect(result.bindingResolved).toBe(true);
    expect(result.binding?.id).toBe("binding-1");
    expect(threadLockService.withThreadLock).toHaveBeenCalledWith(
      envelope.routingKey,
      expect.any(Function),
    );
    expect(runFacade.dispatchToBinding).toHaveBeenCalledWith(binding, envelope);
    expect(messageReceiptService.recordAcceptedDispatch).toHaveBeenCalledWith({
      provider: ExternalChannelProvider.WHATSAPP,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId: "acct-1",
      peerId: "peer-1",
      threadId: null,
      externalMessageId: "msg-1",
      receivedAt: new Date("2026-02-08T00:00:00.000Z"),
      dispatchLeaseToken: "lease-1",
      agentRunId: "agent-1",
      teamRunId: null,
      turnId: "turn-1",
    });
    expect(acceptedReceiptRecoveryRuntime.registerAcceptedReceipt).toHaveBeenCalledOnce();
  });

  it("records the newly started agent run when definition-bound dispatch starts one on demand", async () => {
    const binding = createBinding();
    binding.agentRunId = null;
    const bindingService = {
      resolveBinding: vi.fn().mockResolvedValue({
        binding,
        usedTransportFallback: false,
      } satisfies ResolvedBinding),
    };
    const threadLockService = {
      withThreadLock: vi.fn(async (_key: string, work: () => Promise<unknown>) => work()),
    };
    const runFacade = {
      dispatchToBinding: vi.fn().mockResolvedValue({
        dispatchTargetType: "AGENT",
        agentRunId: "agent-run-started-on-demand",
        turnId: "turn-started-on-demand",
        dispatchedAt: new Date("2026-02-08T00:00:10.000Z"),
      } satisfies ChannelRunDispatchResult),
    };
    const messageReceiptService = {
      getReceiptByExternalMessage: vi.fn().mockResolvedValue(null),
      createPendingIngressReceipt: vi.fn().mockResolvedValue(createReceipt({
        ingressState: "PENDING",
        agentRunId: null,
      })),
      claimIngressDispatch: vi.fn().mockResolvedValue(createReceipt({
        ingressState: "DISPATCHING",
        agentRunId: null,
        dispatchLeaseToken: "lease-1",
        dispatchLeaseExpiresAt: new Date("2026-02-08T00:00:30.000Z"),
      })),
      recordAcceptedDispatch: vi.fn().mockResolvedValue(createReceipt({
        ingressState: "ACCEPTED",
        agentRunId: "agent-run-started-on-demand",
        turnId: "turn-started-on-demand",
      })),
      markIngressUnbound: vi.fn(),
    };
    const acceptedReceiptRecoveryRuntime = {
      registerAcceptedReceipt: vi.fn().mockResolvedValue(undefined),
    };
    const service = new ChannelIngressService({
      bindingService,
      threadLockService,
      runFacade,
      messageReceiptService,
      acceptedReceiptRecoveryRuntime,
    });

    await service.handleInboundMessage(createEnvelope());

    expect(messageReceiptService.recordAcceptedDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        agentRunId: "agent-run-started-on-demand",
        teamRunId: null,
        turnId: "turn-started-on-demand",
      }),
    );
  });
});

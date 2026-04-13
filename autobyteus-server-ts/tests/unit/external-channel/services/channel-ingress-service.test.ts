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
  teamDefinitionId: null,
  teamLaunchPreset: null,
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
  workflowState: "PUBLISHED",
  dispatchAcceptedAt: new Date("2026-02-08T00:00:10.000Z"),
  turnId: null,
  agentRunId: "agent-1",
  teamRunId: null,
  replyTextFinal: null,
  lastError: null,
  dispatchLeaseToken: null,
  dispatchLeaseExpiresAt: null,
  createdAt: new Date("2026-02-08T00:00:00.000Z"),
  updatedAt: new Date("2026-02-08T00:00:00.000Z"),
  ...overrides,
});

describe("ChannelIngressService", () => {
  it("short-circuits duplicate routed ingress events", async () => {
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
      isDispatchLeaseExpired: vi.fn(),
    };
    const service = new ChannelIngressService({
      bindingService,
      threadLockService,
      runFacade,
      messageReceiptService: messageReceiptService as any,
    });

    const result = await service.handleInboundMessage(createEnvelope());

    expect(result).toMatchObject({
      duplicate: true,
      disposition: "DUPLICATE",
    });
    expect(bindingService.resolveBinding).not.toHaveBeenCalled();
    expect(runFacade.dispatchToBinding).not.toHaveBeenCalled();
    expect(messageReceiptService.createPendingIngressReceipt).not.toHaveBeenCalled();
  });

  it("re-registers unfinished accepted receipts with the receipt workflow runtime", async () => {
    const existingAccepted = createReceipt({
      ingressState: "ACCEPTED",
      workflowState: "TURN_BOUND",
      turnId: "turn-1",
    });
    const receiptWorkflowRuntime = {
      registerAcceptedReceipt: vi.fn().mockResolvedValue(undefined),
    };
    const service = new ChannelIngressService({
      bindingService: {
        resolveBinding: vi.fn(),
      } as any,
      threadLockService: {
        withThreadLock: vi.fn(async (_key: string, work: () => Promise<unknown>) => work()),
      } as any,
      runFacade: {
        dispatchToBinding: vi.fn(),
      } as any,
      messageReceiptService: {
        getReceiptByExternalMessage: vi.fn().mockResolvedValue(existingAccepted),
        isDispatchLeaseExpired: vi.fn(),
      } as any,
      receiptWorkflowRuntime: receiptWorkflowRuntime as any,
    });

    const result = await service.handleInboundMessage(createEnvelope());

    expect(result).toMatchObject({
      duplicate: true,
      disposition: "ACCEPTED",
      dispatch: null,
    });
    expect(receiptWorkflowRuntime.registerAcceptedReceipt).toHaveBeenCalledWith(
      existingAccepted,
    );
  });

  it("returns UNBOUND disposition when no binding can be resolved", async () => {
    const bindingService = {
      resolveBinding: vi.fn().mockResolvedValue(null),
    };
    const messageReceiptService = {
      getReceiptByExternalMessage: vi.fn().mockResolvedValue(null),
      createPendingIngressReceipt: vi.fn().mockResolvedValue(
        createReceipt({
          ingressState: "PENDING",
          workflowState: "RECEIVED",
          agentRunId: null,
          dispatchAcceptedAt: null,
        }),
      ),
      claimIngressDispatch: vi.fn(),
      recordAcceptedDispatch: vi.fn(),
      markIngressUnbound: vi.fn().mockResolvedValue(
        createReceipt({
          ingressState: "UNBOUND",
          workflowState: "UNBOUND",
          agentRunId: null,
          dispatchAcceptedAt: null,
        }),
      ),
    };
    const service = new ChannelIngressService({
      bindingService,
      threadLockService: {
        withThreadLock: vi.fn(async (_key: string, work: () => Promise<unknown>) => work()),
      } as any,
      runFacade: {
        dispatchToBinding: vi.fn(),
      } as any,
      messageReceiptService: messageReceiptService as any,
    });

    const result = await service.handleInboundMessage(createEnvelope());

    expect(result).toMatchObject({
      duplicate: false,
      disposition: "UNBOUND",
      bindingResolved: false,
    });
    expect(messageReceiptService.markIngressUnbound).toHaveBeenCalledOnce();
  });

  it("records accepted dispatch with explicit dispatchAcceptedAt and registers the accepted receipt", async () => {
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
    const messageReceiptService = {
      getReceiptByExternalMessage: vi.fn().mockResolvedValue(null),
      createPendingIngressReceipt: vi.fn().mockResolvedValue(
        createReceipt({
          ingressState: "PENDING",
          workflowState: "RECEIVED",
          agentRunId: null,
          dispatchAcceptedAt: null,
        }),
      ),
      claimIngressDispatch: vi.fn().mockResolvedValue(
        createReceipt({
          ingressState: "DISPATCHING",
          workflowState: "DISPATCHING",
          agentRunId: null,
          dispatchLeaseToken: "lease-1",
          dispatchLeaseExpiresAt: new Date("2026-02-08T00:00:30.000Z"),
          dispatchAcceptedAt: null,
        }),
      ),
      recordAcceptedDispatch: vi.fn().mockResolvedValue(
        createReceipt({
          ingressState: "ACCEPTED",
          workflowState: "TURN_BOUND",
          agentRunId: "agent-1",
          turnId: "turn-1",
          dispatchAcceptedAt: new Date("2026-02-08T00:00:10.000Z"),
        }),
      ),
    };
    const receiptWorkflowRuntime = {
      registerAcceptedReceipt: vi.fn().mockResolvedValue(undefined),
    };
    const service = new ChannelIngressService({
      bindingService: {
        resolveBinding: vi.fn().mockResolvedValue(resolvedBinding),
      } as any,
      threadLockService: {
        withThreadLock: vi.fn(async (_key: string, work: () => Promise<unknown>) => work()),
      } as any,
      runFacade: {
        dispatchToBinding: vi
          .fn()
          .mockImplementation(async (_binding: ChannelBinding, inboundEnvelope: ReturnType<typeof createEnvelope>) => {
            expect(inboundEnvelope.metadata).toEqual({});
            return dispatchResult;
          }),
      } as any,
      messageReceiptService: messageReceiptService as any,
      receiptWorkflowRuntime: receiptWorkflowRuntime as any,
    });

    const result = await service.handleInboundMessage(createEnvelope());

    expect(result).toMatchObject({
      duplicate: false,
      disposition: "ACCEPTED",
      dispatch: dispatchResult,
    });
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
      dispatchAcceptedAt: new Date("2026-02-08T00:00:10.000Z"),
    });
    expect(receiptWorkflowRuntime.registerAcceptedReceipt).toHaveBeenCalledOnce();
  });
});

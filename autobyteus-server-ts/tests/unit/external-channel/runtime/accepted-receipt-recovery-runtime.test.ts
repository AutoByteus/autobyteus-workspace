import { afterEach, describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import type { ChannelMessageReceipt } from "../../../../src/external-channel/domain/models.js";
import { AcceptedReceiptRecoveryRuntime } from "../../../../src/external-channel/runtime/accepted-receipt-recovery-runtime.js";

const createAcceptedReceipt = (
  overrides: Partial<ChannelMessageReceipt> = {},
): ChannelMessageReceipt => ({
  provider: ExternalChannelProvider.TELEGRAM,
  transport: ExternalChannelTransport.BUSINESS_API,
  accountId: "autobyteus",
  peerId: "8438880216",
  threadId: null,
  externalMessageId: "update:1",
  receivedAt: new Date("2026-03-31T12:00:00.000Z"),
  ingressState: "ACCEPTED",
  turnId: "turn-1",
  agentRunId: "agent-run-1",
  teamRunId: null,
  dispatchLeaseToken: null,
  dispatchLeaseExpiresAt: null,
  createdAt: new Date("2026-03-31T12:00:00.000Z"),
  updatedAt: new Date("2026-03-31T12:00:00.000Z"),
  ...overrides,
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("AcceptedReceiptRecoveryRuntime", () => {
  it("publishes a recovered persisted reply for a newly accepted receipt", async () => {
    vi.useFakeTimers();
    const receipt = createAcceptedReceipt();
    const messageReceiptService = {
      listReceiptsByIngressState: vi.fn().mockResolvedValue([]),
      getReceiptByExternalMessage: vi.fn().mockResolvedValue(receipt),
      markReplyPublished: vi.fn().mockResolvedValue({
        ...receipt,
        ingressState: "ROUTED",
      }),
      markIngressUnbound: vi.fn(),
      updateAcceptedReceiptCorrelation: vi.fn(),
    };
    const publishAssistantReplyToSource = vi.fn().mockResolvedValue({
      published: true,
      duplicate: false,
      reason: null,
      envelope: {} as object,
    });
    const runtime = new AcceptedReceiptRecoveryRuntime({
      messageReceiptService: messageReceiptService as any,
      bindingService: {
        findBindingByDispatchTarget: vi.fn(),
      } as any,
      agentRunManager: {
        getActiveRun: vi.fn(),
      } as any,
      agentRunService: {
        restoreAgentRun: vi.fn(),
      } as any,
      teamRunService: {
        getTeamRun: vi.fn(),
        restoreTeamRun: vi.fn(),
      } as any,
      agentReplyBridge: {
        observeAcceptedTurnToSource: vi.fn(),
      } as any,
      teamReplyBridge: {
        observeAcceptedTeamTurnToSource: vi.fn(),
      } as any,
      turnReplyRecoveryService: {
        resolveReplyText: vi.fn().mockResolvedValue("Recovered persisted reply"),
      } as any,
      replyCallbackServiceFactory: () =>
        ({
          publishAssistantReplyToSource,
        }) as any,
    });

    await runtime.registerAcceptedReceipt(receipt);
    await vi.runAllTimersAsync();

    expect(publishAssistantReplyToSource).toHaveBeenCalledWith({
      source: expect.objectContaining({
        externalMessageId: "update:1",
      }),
      agentRunId: "agent-run-1",
      teamRunId: null,
      turnId: "turn-1",
      replyText: "Recovered persisted reply",
      callbackIdempotencyKey: "external-reply:agent-run-1:turn-1",
    });
    expect(messageReceiptService.markReplyPublished).toHaveBeenCalledWith({
      provider: ExternalChannelProvider.TELEGRAM,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId: "autobyteus",
      peerId: "8438880216",
      threadId: null,
      externalMessageId: "update:1",
      receivedAt: new Date("2026-03-31T12:00:00.000Z"),
      agentRunId: "agent-run-1",
      teamRunId: null,
      turnId: "turn-1",
    });

    await runtime.stop();
  });

  it("marks the receipt unbound when callback publication reports a missing binding", async () => {
    vi.useFakeTimers();
    const receipt = createAcceptedReceipt();
    const messageReceiptService = {
      listReceiptsByIngressState: vi.fn().mockResolvedValue([]),
      getReceiptByExternalMessage: vi.fn().mockResolvedValue(receipt),
      markReplyPublished: vi.fn(),
      markIngressUnbound: vi.fn().mockResolvedValue({
        ...receipt,
        ingressState: "UNBOUND",
      }),
      updateAcceptedReceiptCorrelation: vi.fn(),
    };
    const runtime = new AcceptedReceiptRecoveryRuntime({
      messageReceiptService: messageReceiptService as any,
      bindingService: {
        findBindingByDispatchTarget: vi.fn(),
      } as any,
      agentRunManager: {
        getActiveRun: vi.fn(),
      } as any,
      agentRunService: {
        restoreAgentRun: vi.fn(),
      } as any,
      teamRunService: {
        getTeamRun: vi.fn(),
        restoreTeamRun: vi.fn(),
      } as any,
      agentReplyBridge: {
        observeAcceptedTurnToSource: vi.fn(),
      } as any,
      teamReplyBridge: {
        observeAcceptedTeamTurnToSource: vi.fn(),
      } as any,
      turnReplyRecoveryService: {
        resolveReplyText: vi.fn().mockResolvedValue("Recovered persisted reply"),
      } as any,
      replyCallbackServiceFactory: () =>
        ({
          publishAssistantReplyToSource: vi.fn().mockResolvedValue({
            published: false,
            duplicate: false,
            reason: "BINDING_NOT_FOUND",
            envelope: null,
          }),
        }) as any,
    });

    await runtime.registerAcceptedReceipt(receipt);
    await vi.runAllTimersAsync();

    expect(messageReceiptService.markIngressUnbound).toHaveBeenCalledWith({
      provider: ExternalChannelProvider.TELEGRAM,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId: "autobyteus",
      peerId: "8438880216",
      threadId: null,
      externalMessageId: "update:1",
      receivedAt: new Date("2026-03-31T12:00:00.000Z"),
    });
    expect(messageReceiptService.markReplyPublished).not.toHaveBeenCalled();

    await runtime.stop();
  });

  it("falls back to live agent observation when no persisted reply is available", async () => {
    vi.useFakeTimers();
    const receipt = createAcceptedReceipt();
    const activeRun = {
      runId: "agent-run-1",
      subscribeToEvents: vi.fn(),
    };
    const messageReceiptService = {
      listReceiptsByIngressState: vi.fn().mockResolvedValue([]),
      getReceiptByExternalMessage: vi.fn().mockResolvedValue(receipt),
      markReplyPublished: vi.fn().mockResolvedValue({
        ...receipt,
        ingressState: "ROUTED",
      }),
      markIngressUnbound: vi.fn(),
      updateAcceptedReceiptCorrelation: vi.fn(),
    };
    const publishAssistantReplyToSource = vi.fn().mockResolvedValue({
      published: true,
      duplicate: false,
      reason: null,
      envelope: {} as object,
    });
    const agentReplyBridge = {
      observeAcceptedTurnToSource: vi.fn().mockResolvedValue({
        status: "REPLY_READY",
        reply: {
          agentRunId: "agent-run-1",
          teamRunId: null,
          turnId: "turn-1",
          replyText: "Live observed reply",
          source: {
            provider: ExternalChannelProvider.TELEGRAM,
            transport: ExternalChannelTransport.BUSINESS_API,
            accountId: "autobyteus",
            peerId: "8438880216",
            threadId: null,
            externalMessageId: "update:1",
            receivedAt: new Date("2026-03-31T12:00:00.000Z"),
          },
        },
      }),
    };
    const runtime = new AcceptedReceiptRecoveryRuntime({
      messageReceiptService: messageReceiptService as any,
      bindingService: {
        findBindingByDispatchTarget: vi.fn(),
      } as any,
      agentRunManager: {
        getActiveRun: vi.fn().mockReturnValue(activeRun),
      } as any,
      agentRunService: {
        restoreAgentRun: vi.fn(),
      } as any,
      teamRunService: {
        getTeamRun: vi.fn(),
        restoreTeamRun: vi.fn(),
      } as any,
      agentReplyBridge: agentReplyBridge as any,
      teamReplyBridge: {
        observeAcceptedTeamTurnToSource: vi.fn(),
      } as any,
      turnReplyRecoveryService: {
        resolveReplyText: vi.fn().mockResolvedValue(null),
      } as any,
      replyCallbackServiceFactory: () =>
        ({
          publishAssistantReplyToSource,
        }) as any,
    });

    await runtime.registerAcceptedReceipt(receipt);
    await vi.runAllTimersAsync();

    expect(agentReplyBridge.observeAcceptedTurnToSource).toHaveBeenCalledWith({
      run: activeRun,
      teamRunId: null,
      turnId: "turn-1",
      source: receipt,
    });
    expect(publishAssistantReplyToSource).toHaveBeenCalledWith({
      source: expect.objectContaining({
        externalMessageId: "update:1",
      }),
      agentRunId: "agent-run-1",
      teamRunId: null,
      turnId: "turn-1",
      replyText: "Live observed reply",
      callbackIdempotencyKey: "external-reply:agent-run-1:turn-1",
    });

    await runtime.stop();
  });

  it("restores accepted receipts from storage when started", async () => {
    vi.useFakeTimers();
    const receipt = createAcceptedReceipt();
    const publishAssistantReplyToSource = vi.fn().mockResolvedValue({
      published: true,
      duplicate: false,
      reason: null,
      envelope: {} as object,
    });
    const messageReceiptService = {
      listReceiptsByIngressState: vi.fn().mockResolvedValue([receipt]),
      getReceiptByExternalMessage: vi.fn().mockResolvedValue(receipt),
      markReplyPublished: vi.fn().mockResolvedValue({
        ...receipt,
        ingressState: "ROUTED",
      }),
      markIngressUnbound: vi.fn(),
      updateAcceptedReceiptCorrelation: vi.fn(),
    };
    const runtime = new AcceptedReceiptRecoveryRuntime({
      messageReceiptService: messageReceiptService as any,
      bindingService: {
        findBindingByDispatchTarget: vi.fn(),
      } as any,
      agentRunManager: {
        getActiveRun: vi.fn(),
      } as any,
      agentRunService: {
        restoreAgentRun: vi.fn(),
      } as any,
      teamRunService: {
        getTeamRun: vi.fn(),
        restoreTeamRun: vi.fn(),
      } as any,
      agentReplyBridge: {
        observeAcceptedTurnToSource: vi.fn(),
      } as any,
      teamReplyBridge: {
        observeAcceptedTeamTurnToSource: vi.fn(),
      } as any,
      turnReplyRecoveryService: {
        resolveReplyText: vi.fn().mockResolvedValue("Recovered on startup"),
      } as any,
      replyCallbackServiceFactory: () =>
        ({
          publishAssistantReplyToSource,
        }) as any,
    });

    runtime.start();
    await vi.runAllTimersAsync();

    expect(messageReceiptService.listReceiptsByIngressState).toHaveBeenCalledWith("ACCEPTED");
    expect(publishAssistantReplyToSource).toHaveBeenCalledTimes(1);

    await runtime.stop();
  });
});

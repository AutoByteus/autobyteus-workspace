import { afterEach, describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import type {
  ChannelIngressReceiptKey,
  ChannelMessageReceipt,
  ChannelReceiptWorkflowProgressInput,
  ChannelReceiptWorkflowState,
  ChannelReplyPublishedReceiptInput,
  ChannelUnboundIngressReceiptInput,
} from "../../../../src/external-channel/domain/models.js";
import { ReceiptWorkflowRuntime } from "../../../../src/external-channel/runtime/receipt-workflow-runtime.js";

const createReceipt = (
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
  workflowState: "TURN_BOUND",
  dispatchAcceptedAt: new Date("2026-03-31T12:00:05.000Z"),
  turnId: "turn-1",
  agentRunId: "agent-run-1",
  teamRunId: null,
  replyTextFinal: null,
  lastError: null,
  dispatchLeaseToken: null,
  dispatchLeaseExpiresAt: null,
  createdAt: new Date("2026-03-31T12:00:00.000Z"),
  updatedAt: new Date("2026-03-31T12:00:00.000Z"),
  ...overrides,
});

const applyWorkflowProgress = (
  receipt: ChannelMessageReceipt,
  input: ChannelReceiptWorkflowProgressInput,
): ChannelMessageReceipt => ({
  ...receipt,
  workflowState: input.workflowState,
  turnId: input.turnId === undefined ? receipt.turnId : (input.turnId ?? null),
  agentRunId:
    input.agentRunId === undefined ? receipt.agentRunId : (input.agentRunId ?? null),
  teamRunId:
    input.teamRunId === undefined ? receipt.teamRunId : (input.teamRunId ?? null),
  replyTextFinal:
    input.replyTextFinal === undefined
      ? receipt.replyTextFinal
      : (input.replyTextFinal ?? null),
  lastError:
    input.lastError === undefined ? receipt.lastError : (input.lastError ?? null),
});

const createMessageReceiptServiceMock = (
  input: {
    receipts: ChannelMessageReceipt[];
  },
) => {
  let storedReceipts = input.receipts.map((receipt) => ({ ...receipt }));

  const findReceiptIndex = (key: ChannelIngressReceiptKey) =>
    storedReceipts.findIndex(
      (receipt) =>
        receipt.provider === key.provider &&
        receipt.transport === key.transport &&
        receipt.accountId === key.accountId &&
        receipt.peerId === key.peerId &&
        receipt.threadId === key.threadId &&
        receipt.externalMessageId === key.externalMessageId,
    );

  const updateReceipt = (
    key: ChannelIngressReceiptKey,
    updater: (receipt: ChannelMessageReceipt) => ChannelMessageReceipt,
  ) => {
    const index = findReceiptIndex(key);
    if (index < 0) {
      throw new Error(`Receipt '${key.externalMessageId}' not found in test stub.`);
    }
    const updated = updater(storedReceipts[index] as ChannelMessageReceipt);
    storedReceipts = storedReceipts.map((receipt, candidateIndex) =>
      candidateIndex === index ? updated : receipt,
    );
    return updated;
  };

  const service = {
    listReceiptsByWorkflowStates: vi
      .fn()
      .mockImplementation(async (states: ChannelReceiptWorkflowState[]) =>
        storedReceipts.filter((receipt) => states.includes(receipt.workflowState)),
      ),
    getReceiptByExternalMessage: vi
      .fn()
      .mockImplementation(async (key: ChannelIngressReceiptKey) => {
        const index = findReceiptIndex(key);
        return index >= 0 ? (storedReceipts[index] as ChannelMessageReceipt) : null;
      }),
    updateReceiptWorkflowProgress: vi
      .fn()
      .mockImplementation(async (key: ChannelReceiptWorkflowProgressInput) =>
        updateReceipt(key, (receipt) => applyWorkflowProgress(receipt, key)),
      ),
    markReplyPublished: vi
      .fn()
      .mockImplementation(async (key: ChannelReplyPublishedReceiptInput) =>
        updateReceipt(key, (receipt) => ({
          ...receipt,
          ingressState: "ROUTED",
          workflowState: "PUBLISHED",
          turnId: key.turnId,
          agentRunId: key.agentRunId,
          teamRunId: key.teamRunId,
          lastError: null,
        })),
      ),
    markIngressUnbound: vi
      .fn()
      .mockImplementation(async (key: ChannelUnboundIngressReceiptInput) =>
        updateReceipt(key, (receipt) => ({
          ...receipt,
          ingressState: "UNBOUND",
          workflowState: "UNBOUND",
          lastError: null,
        })),
      ),
  };

  return {
    service,
    getReceipts: () => storedReceipts,
  };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ReceiptWorkflowRuntime", () => {
  it("observes a bound live turn and publishes the finalized reply", async () => {
    const receipt = createReceipt();
    const { service: messageReceiptService, getReceipts } =
      createMessageReceiptServiceMock({
        receipts: [receipt],
      });
    const publishAssistantReplyToSource = vi.fn().mockResolvedValue({
      published: true,
      duplicate: false,
      reason: null,
      envelope: {} as object,
    });
    const agentRun = {
      runId: "agent-run-1",
      subscribeToEvents: vi.fn(),
    };
    const runtime = new ReceiptWorkflowRuntime({
      messageReceiptService: messageReceiptService as any,
      agentRunService: {
        resolveAgentRun: vi.fn().mockResolvedValue(agentRun),
      } as any,
      teamRunService: {
        resolveTeamRun: vi.fn(),
      } as any,
      agentReplyBridge: {
        observeAcceptedTurnToSource: vi.fn().mockResolvedValue({
          status: "REPLY_READY",
          reply: {
            agentRunId: "agent-run-1",
            teamRunId: null,
            turnId: "turn-1",
            source: receipt,
            replyText: "Live reply",
          },
        }),
      } as any,
      teamReplyBridge: {
        observeAcceptedTeamTurnToSource: vi.fn(),
      } as any,
      turnReplyRecoveryService: {
        resolveReplyText: vi.fn(),
      } as any,
      replyCallbackServiceFactory: () =>
        ({
          publishAssistantReplyToSource,
        }) as any,
    });

    await runtime.registerAcceptedReceipt(receipt);

    await vi.waitFor(() => {
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
    });
    expect(publishAssistantReplyToSource).toHaveBeenCalledWith({
      source: expect.objectContaining({
        externalMessageId: "update:1",
      }),
      agentRunId: "agent-run-1",
      teamRunId: null,
      turnId: "turn-1",
      replyText: "Live reply",
      callbackIdempotencyKey: "external-reply:agent-run-1:turn-1",
    });
    expect(getReceipts()[0]?.workflowState).toBe("PUBLISHED");

    await runtime.stop();
  });

  it("recovers the finalized reply from a known turn when the run is already gone", async () => {
    const receipt = createReceipt();
    const { service: messageReceiptService, getReceipts } =
      createMessageReceiptServiceMock({
        receipts: [receipt],
      });
    const publishAssistantReplyToSource = vi.fn().mockResolvedValue({
      published: true,
      duplicate: false,
      reason: null,
      envelope: {} as object,
    });
    const runtime = new ReceiptWorkflowRuntime({
      messageReceiptService: messageReceiptService as any,
      agentRunService: {
        resolveAgentRun: vi.fn().mockResolvedValue(null),
      } as any,
      teamRunService: {
        resolveTeamRun: vi.fn().mockResolvedValue(null),
      } as any,
      agentReplyBridge: {
        observeAcceptedTurnToSource: vi.fn(),
      } as any,
      teamReplyBridge: {
        observeAcceptedTeamTurnToSource: vi.fn(),
      } as any,
      turnReplyRecoveryService: {
        resolveReplyText: vi.fn().mockResolvedValue("Recovered buffered reply"),
      } as any,
      replyCallbackServiceFactory: () =>
        ({
          publishAssistantReplyToSource,
        }) as any,
    });

    await runtime.registerAcceptedReceipt(receipt);

    await vi.waitFor(() => {
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
    });
    expect(publishAssistantReplyToSource).toHaveBeenCalledWith({
      source: expect.objectContaining({
        externalMessageId: "update:1",
      }),
      agentRunId: "agent-run-1",
      teamRunId: null,
      turnId: "turn-1",
      replyText: "Recovered buffered reply",
      callbackIdempotencyKey: "external-reply:agent-run-1:turn-1",
    });
    expect(getReceipts()[0]?.workflowState).toBe("PUBLISHED");

    await runtime.stop();
  });

  it("marks the receipt unbound when callback publication reports a missing binding", async () => {
    const receipt = createReceipt({
      workflowState: "REPLY_FINALIZED",
      replyTextFinal: "final reply",
    });
    const { service: messageReceiptService } = createMessageReceiptServiceMock({
      receipts: [receipt],
    });
    const runtime = new ReceiptWorkflowRuntime({
      messageReceiptService: messageReceiptService as any,
      agentRunService: {
        resolveAgentRun: vi.fn(),
      } as any,
      teamRunService: {
        resolveTeamRun: vi.fn(),
      } as any,
      agentReplyBridge: {
        observeAcceptedTurnToSource: vi.fn(),
      } as any,
      teamReplyBridge: {
        observeAcceptedTeamTurnToSource: vi.fn(),
      } as any,
      turnReplyRecoveryService: {
        resolveReplyText: vi.fn().mockResolvedValue("final reply"),
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

    await vi.waitFor(() => {
      expect(messageReceiptService.markIngressUnbound).toHaveBeenCalledWith({
        provider: ExternalChannelProvider.TELEGRAM,
        transport: ExternalChannelTransport.BUSINESS_API,
        accountId: "autobyteus",
        peerId: "8438880216",
        threadId: null,
        externalMessageId: "update:1",
        receivedAt: new Date("2026-03-31T12:00:00.000Z"),
      });
    });

    await runtime.stop();
  });
});

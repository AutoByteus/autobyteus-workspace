import { afterEach, describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import type { ChannelMessageReceipt } from "../../../../src/external-channel/domain/models.js";
import { AcceptedReceiptRecoveryRuntime } from "../../../../src/external-channel/runtime/accepted-receipt-recovery-runtime.js";
import { AgentRunEventType } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { TeamRunEventSourceType } from "../../../../src/agent-team-execution/domain/team-run-event.js";

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

const createAgentTurnStartedEvent = (runId: string, turnId: string) => ({
  eventType: AgentRunEventType.TURN_STARTED,
  runId,
  payload: { turnId },
  statusHint: "ACTIVE" as const,
});

const createTeamTurnStartedEvent = (input: {
  teamRunId: string;
  memberRunId: string;
  memberName: string;
  turnId: string;
}) => ({
  eventSourceType: TeamRunEventSourceType.AGENT,
  teamRunId: input.teamRunId,
  data: {
    runtimeKind: RuntimeKind.AUTOBYTEUS,
    memberName: input.memberName,
    memberRunId: input.memberRunId,
    agentEvent: createAgentTurnStartedEvent(input.memberRunId, input.turnId),
  },
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
      agentRunService: {
        getAgentRun: vi.fn().mockReturnValue(null),
        resolveAgentRun: vi.fn().mockResolvedValue(null),
      } as any,
      teamRunService: {
        getTeamRun: vi.fn().mockReturnValue(null),
        resolveTeamRun: vi.fn().mockResolvedValue(null),
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
      agentRunService: {
        getAgentRun: vi.fn().mockReturnValue(null),
        resolveAgentRun: vi.fn().mockResolvedValue(null),
      } as any,
      teamRunService: {
        getTeamRun: vi.fn().mockReturnValue(null),
        resolveTeamRun: vi.fn().mockResolvedValue(null),
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
    let currentReceipt: ChannelMessageReceipt = receipt;
    const activeRun = {
      runId: "agent-run-1",
      subscribeToEvents: vi.fn(),
    };
    const messageReceiptService = {
      listReceiptsByIngressState: vi.fn().mockResolvedValue([]),
      getReceiptByExternalMessage: vi.fn().mockImplementation(async () => currentReceipt),
      markReplyPublished: vi.fn().mockImplementation(async () => {
        currentReceipt = {
          ...receipt,
          ingressState: "ROUTED",
        };
        return currentReceipt;
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
      agentRunService: {
        getAgentRun: vi.fn().mockReturnValue(activeRun),
        resolveAgentRun: vi.fn().mockResolvedValue(activeRun),
      } as any,
      teamRunService: {
        getTeamRun: vi.fn().mockReturnValue(null),
        resolveTeamRun: vi.fn().mockResolvedValue(null),
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
    await vi.advanceTimersByTimeAsync(1_000);

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

  it("does not attempt persisted reply recovery while live observation is pending", async () => {
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
    const resolveReplyText = vi.fn().mockResolvedValue("Recovered after observation retry");
    const agentReplyBridge = {
      observeAcceptedTurnToSource: vi.fn().mockReturnValue(new Promise(() => {})),
    };
    const runtime = new AcceptedReceiptRecoveryRuntime({
      messageReceiptService: messageReceiptService as any,
      agentRunService: {
        getAgentRun: vi.fn().mockReturnValue(activeRun),
        resolveAgentRun: vi.fn().mockResolvedValue(activeRun),
      } as any,
      teamRunService: {
        getTeamRun: vi.fn().mockReturnValue(null),
        resolveTeamRun: vi.fn().mockResolvedValue(null),
      } as any,
      agentReplyBridge: agentReplyBridge as any,
      teamReplyBridge: {
        observeAcceptedTeamTurnToSource: vi.fn(),
      } as any,
      turnReplyRecoveryService: {
        resolveReplyText,
      } as any,
      replyCallbackServiceFactory: () =>
        ({
          publishAssistantReplyToSource,
        }) as any,
    });

    await runtime.registerAcceptedReceipt(receipt);
    await vi.advanceTimersByTimeAsync(1_000);

    expect(agentReplyBridge.observeAcceptedTurnToSource).toHaveBeenCalledOnce();
    expect(resolveReplyText).not.toHaveBeenCalled();
    expect(publishAssistantReplyToSource).not.toHaveBeenCalled();

    await runtime.stop();
  });

  it("falls back to persisted reply recovery when live observation closes without a reply", async () => {
    vi.useFakeTimers();
    let currentReceipt = createAcceptedReceipt();
    const activeRun = {
      runId: "agent-run-1",
      subscribeToEvents: vi.fn(),
    };
    const messageReceiptService = {
      listReceiptsByIngressState: vi.fn().mockResolvedValue([]),
      getReceiptByExternalMessage: vi.fn().mockImplementation(async () => currentReceipt),
      markReplyPublished: vi.fn().mockImplementation(async () => {
        currentReceipt = {
          ...currentReceipt,
          ingressState: "ROUTED",
        };
        return currentReceipt;
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
    const resolveReplyText = vi.fn().mockResolvedValue("Recovered after closed observation");
    const agentReplyBridge = {
      observeAcceptedTurnToSource: vi.fn().mockResolvedValue({
        status: "CLOSED",
        reason: "EMPTY_REPLY",
      }),
    };
    const runtime = new AcceptedReceiptRecoveryRuntime({
      messageReceiptService: messageReceiptService as any,
      agentRunService: {
        getAgentRun: vi.fn().mockReturnValue(activeRun),
        resolveAgentRun: vi.fn().mockResolvedValue(activeRun),
      } as any,
      teamRunService: {
        getTeamRun: vi.fn().mockReturnValue(null),
        resolveTeamRun: vi.fn().mockResolvedValue(null),
      } as any,
      agentReplyBridge: agentReplyBridge as any,
      teamReplyBridge: {
        observeAcceptedTeamTurnToSource: vi.fn(),
      } as any,
      turnReplyRecoveryService: {
        resolveReplyText,
      } as any,
      replyCallbackServiceFactory: () =>
        ({
          publishAssistantReplyToSource,
        }) as any,
    });

    await runtime.registerAcceptedReceipt(currentReceipt);
    await vi.advanceTimersByTimeAsync(1_000);

    expect(agentReplyBridge.observeAcceptedTurnToSource).toHaveBeenCalledOnce();
    expect(resolveReplyText).toHaveBeenCalledWith({
      agentRunId: "agent-run-1",
      teamRunId: null,
      turnId: "turn-1",
    });
    expect(publishAssistantReplyToSource).toHaveBeenCalledWith({
      source: expect.objectContaining({
        externalMessageId: "update:1",
      }),
      agentRunId: "agent-run-1",
      teamRunId: null,
      turnId: "turn-1",
      replyText: "Recovered after closed observation",
      callbackIdempotencyKey: "external-reply:agent-run-1:turn-1",
    });

    await runtime.stop();
  });

  it("binds a direct accepted receipt when TURN_STARTED arrives later", async () => {
    vi.useFakeTimers();
    let currentReceipt = createAcceptedReceipt({
      turnId: null,
    });
    let directListener: ((event: unknown) => void) | null = null;
    const activeRun = {
      runId: "agent-run-1",
      subscribeToEvents: vi.fn((listener: (event: unknown) => void) => {
        directListener = listener;
        return () => undefined;
      }),
    };
    const messageReceiptService = {
      listReceiptsByIngressState: vi.fn().mockImplementation(async () => [currentReceipt]),
      getReceiptByExternalMessage: vi.fn().mockImplementation(async () => currentReceipt),
      markReplyPublished: vi.fn().mockImplementation(async () => {
        currentReceipt = {
          ...currentReceipt,
          ingressState: "ROUTED",
        };
        return currentReceipt;
      }),
      markIngressUnbound: vi.fn(),
      updateAcceptedReceiptCorrelation: vi.fn().mockImplementation(async (input) => {
        currentReceipt = {
          ...currentReceipt,
          agentRunId: input.agentRunId,
          teamRunId: input.teamRunId,
          turnId: input.turnId,
        };
        return currentReceipt;
      }),
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
          turnId: "turn-bound-1",
          replyText: "Live reply after turn binding",
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
    const resolveReplyText = vi.fn().mockResolvedValue("Recovered after turn binding");
    const runtime = new AcceptedReceiptRecoveryRuntime({
      messageReceiptService: messageReceiptService as any,
      agentRunService: {
        getAgentRun: vi.fn().mockReturnValue(activeRun),
        resolveAgentRun: vi.fn().mockResolvedValue(activeRun),
      } as any,
      teamRunService: {
        getTeamRun: vi.fn().mockReturnValue(null),
        resolveTeamRun: vi.fn().mockResolvedValue(null),
      } as any,
      agentReplyBridge: agentReplyBridge as any,
      teamReplyBridge: {
        observeAcceptedTeamTurnToSource: vi.fn(),
      } as any,
      turnReplyRecoveryService: {
        resolveReplyText,
      } as any,
      replyCallbackServiceFactory: () =>
        ({
          publishAssistantReplyToSource,
        }) as any,
    });

    await runtime.registerAcceptedReceipt(currentReceipt);
    await vi.advanceTimersByTimeAsync(0);

    expect(activeRun.subscribeToEvents).toHaveBeenCalledOnce();
    expect(directListener).toBeTypeOf("function");

    directListener?.(createAgentTurnStartedEvent("agent-run-1", "turn-bound-1"));
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(0);

    expect(messageReceiptService.updateAcceptedReceiptCorrelation).toHaveBeenCalledWith({
      provider: ExternalChannelProvider.TELEGRAM,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId: "autobyteus",
      peerId: "8438880216",
      threadId: null,
      externalMessageId: "update:1",
      receivedAt: new Date("2026-03-31T12:00:00.000Z"),
      agentRunId: "agent-run-1",
      teamRunId: null,
      turnId: "turn-bound-1",
    });
    expect(publishAssistantReplyToSource).toHaveBeenCalledWith({
      source: expect.objectContaining({
        externalMessageId: "update:1",
      }),
      agentRunId: "agent-run-1",
      teamRunId: null,
      turnId: "turn-bound-1",
      replyText: "Live reply after turn binding",
      callbackIdempotencyKey: "external-reply:agent-run-1:turn-bound-1",
    });
    expect(agentReplyBridge.observeAcceptedTurnToSource).toHaveBeenCalledOnce();
    expect(resolveReplyText).not.toHaveBeenCalled();

    await runtime.stop();
  });

  it("binds the oldest unmatched direct receipt first across sequential TURN_STARTED events", async () => {
    vi.useFakeTimers();
    let receipts = [
      createAcceptedReceipt({
        externalMessageId: "update:older",
        turnId: null,
        createdAt: new Date("2026-03-31T12:00:00.000Z"),
        updatedAt: new Date("2026-03-31T12:00:00.000Z"),
      }),
      createAcceptedReceipt({
        externalMessageId: "update:newer",
        turnId: null,
        createdAt: new Date("2026-03-31T12:01:00.000Z"),
        updatedAt: new Date("2026-03-31T12:01:00.000Z"),
      }),
    ];
    let directListener: ((event: unknown) => void) | null = null;
    const activeRun = {
      runId: "agent-run-1",
      subscribeToEvents: vi.fn((listener: (event: unknown) => void) => {
        directListener = listener;
        return () => undefined;
      }),
    };
    const messageReceiptService = {
      listReceiptsByIngressState: vi.fn().mockImplementation(async () => receipts),
      getReceiptByExternalMessage: vi.fn().mockImplementation(async (key) => {
        return (
          receipts.find(
            (candidate) => candidate.externalMessageId === key.externalMessageId,
          ) ?? null
        );
      }),
      markReplyPublished: vi.fn(),
      markIngressUnbound: vi.fn(),
      updateAcceptedReceiptCorrelation: vi.fn().mockImplementation(async (input) => {
        receipts = receipts.map((candidate) =>
          candidate.externalMessageId === input.externalMessageId
            ? {
                ...candidate,
                agentRunId: input.agentRunId,
                teamRunId: input.teamRunId,
                turnId: input.turnId,
              }
            : candidate,
        );
        return receipts.find(
          (candidate) => candidate.externalMessageId === input.externalMessageId,
        ) as ChannelMessageReceipt;
      }),
    };
    const runtime = new AcceptedReceiptRecoveryRuntime({
      messageReceiptService: messageReceiptService as any,
      agentRunService: {
        getAgentRun: vi.fn().mockReturnValue(activeRun),
        resolveAgentRun: vi.fn().mockResolvedValue(activeRun),
      } as any,
      teamRunService: {
        getTeamRun: vi.fn().mockReturnValue(null),
        resolveTeamRun: vi.fn().mockResolvedValue(null),
      } as any,
      agentReplyBridge: {
        observeAcceptedTurnToSource: vi.fn().mockReturnValue(new Promise(() => {})),
      } as any,
      teamReplyBridge: {
        observeAcceptedTeamTurnToSource: vi.fn(),
      } as any,
      turnReplyRecoveryService: {
        resolveReplyText: vi.fn().mockResolvedValue(null),
      } as any,
      replyCallbackServiceFactory: () =>
        ({
          publishAssistantReplyToSource: vi.fn(),
        }) as any,
    });

    await runtime.registerAcceptedReceipt(receipts[0] as ChannelMessageReceipt);
    await runtime.registerAcceptedReceipt(receipts[1] as ChannelMessageReceipt);
    await vi.advanceTimersByTimeAsync(0);

    directListener?.(createAgentTurnStartedEvent("agent-run-1", "turn-oldest"));
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(0);

    directListener?.(createAgentTurnStartedEvent("agent-run-1", "turn-next"));
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(0);

    expect(messageReceiptService.updateAcceptedReceiptCorrelation.mock.calls).toEqual([
      [
        expect.objectContaining({
          externalMessageId: "update:older",
          turnId: "turn-oldest",
        }),
      ],
      [
        expect.objectContaining({
          externalMessageId: "update:newer",
          turnId: "turn-next",
        }),
      ],
    ]);

    await runtime.stop();
  });

  it("binds a team receipt from TURN_STARTED when the member run is known", async () => {
    vi.useFakeTimers();
    let currentReceipt = createAcceptedReceipt({
      teamRunId: "team-1",
      agentRunId: "member-run-1",
      turnId: null,
    });
    let teamListener: ((event: unknown) => void) | null = null;
    const teamRun = {
      runId: "team-1",
      subscribeToEvents: vi.fn((listener: (event: unknown) => void) => {
        teamListener = listener;
        return () => undefined;
      }),
    };
    const messageReceiptService = {
      listReceiptsByIngressState: vi.fn().mockImplementation(async () => [currentReceipt]),
      getReceiptByExternalMessage: vi.fn().mockImplementation(async () => currentReceipt),
      markReplyPublished: vi.fn().mockImplementation(async () => {
        currentReceipt = {
          ...currentReceipt,
          ingressState: "ROUTED",
        };
        return currentReceipt;
      }),
      markIngressUnbound: vi.fn(),
      updateAcceptedReceiptCorrelation: vi.fn().mockImplementation(async (input) => {
        currentReceipt = {
          ...currentReceipt,
          agentRunId: input.agentRunId,
          teamRunId: input.teamRunId,
          turnId: input.turnId,
        };
        return currentReceipt;
      }),
    };
    const publishAssistantReplyToSource = vi.fn().mockResolvedValue({
      published: true,
      duplicate: false,
      reason: null,
      envelope: {} as object,
    });
    const teamReplyBridge = {
      observeAcceptedTeamTurnToSource: vi.fn().mockResolvedValue({
        status: "REPLY_READY",
        reply: {
          agentRunId: "member-run-1",
          teamRunId: "team-1",
          turnId: "turn-team-bound-1",
          replyText: "Live team reply after binding",
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
    const resolveReplyText = vi.fn().mockResolvedValue("Recovered team reply");
    const runtime = new AcceptedReceiptRecoveryRuntime({
      messageReceiptService: messageReceiptService as any,
      agentRunService: {
        getAgentRun: vi.fn().mockReturnValue(null),
        resolveAgentRun: vi.fn().mockResolvedValue(null),
      } as any,
      teamRunService: {
        getTeamRun: vi.fn().mockReturnValue(teamRun),
        resolveTeamRun: vi.fn().mockResolvedValue(teamRun),
      } as any,
      agentReplyBridge: {
        observeAcceptedTurnToSource: vi.fn(),
      } as any,
      teamReplyBridge: teamReplyBridge as any,
      turnReplyRecoveryService: {
        resolveReplyText,
      } as any,
      replyCallbackServiceFactory: () =>
        ({
          publishAssistantReplyToSource,
        }) as any,
    });

    await runtime.registerAcceptedReceipt(currentReceipt);
    await vi.advanceTimersByTimeAsync(0);

    teamListener?.(
      createTeamTurnStartedEvent({
        teamRunId: "team-1",
        memberRunId: "member-run-1",
        memberName: "Coordinator",
        turnId: "turn-team-bound-1",
      }),
    );
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(0);

    expect(messageReceiptService.updateAcceptedReceiptCorrelation).toHaveBeenCalledWith({
      provider: ExternalChannelProvider.TELEGRAM,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId: "autobyteus",
      peerId: "8438880216",
      threadId: null,
      externalMessageId: "update:1",
      receivedAt: new Date("2026-03-31T12:00:00.000Z"),
      agentRunId: "member-run-1",
      teamRunId: "team-1",
      turnId: "turn-team-bound-1",
    });
    expect(publishAssistantReplyToSource).toHaveBeenCalledWith({
      source: expect.objectContaining({
        externalMessageId: "update:1",
      }),
      agentRunId: "member-run-1",
      teamRunId: "team-1",
      turnId: "turn-team-bound-1",
      replyText: "Live team reply after binding",
      callbackIdempotencyKey: "external-reply:member-run-1:turn-team-bound-1",
    });
    expect(teamReplyBridge.observeAcceptedTeamTurnToSource).toHaveBeenCalledOnce();
    expect(resolveReplyText).not.toHaveBeenCalled();

    await runtime.stop();
  });

  it("does not start team turn correlation until the member run is known", async () => {
    vi.useFakeTimers();
    const receipt = createAcceptedReceipt({
      teamRunId: "team-1",
      agentRunId: null,
      turnId: null,
    });
    const teamRunService = {
      getTeamRun: vi.fn().mockReturnValue(null),
      resolveTeamRun: vi.fn().mockResolvedValue({
        runId: "team-1",
        subscribeToEvents: vi.fn(),
      }),
    };
    const runtime = new AcceptedReceiptRecoveryRuntime({
      messageReceiptService: {
        listReceiptsByIngressState: vi.fn().mockResolvedValue([]),
        getReceiptByExternalMessage: vi.fn().mockResolvedValue(receipt),
        markReplyPublished: vi.fn(),
        markIngressUnbound: vi.fn(),
        updateAcceptedReceiptCorrelation: vi.fn(),
      } as any,
      agentRunService: {
        getAgentRun: vi.fn().mockReturnValue(null),
        resolveAgentRun: vi.fn().mockResolvedValue(null),
      } as any,
      teamRunService: teamRunService as any,
      agentReplyBridge: {
        observeAcceptedTurnToSource: vi.fn(),
      } as any,
      teamReplyBridge: {
        observeAcceptedTeamTurnToSource: vi.fn(),
      } as any,
      turnReplyRecoveryService: {
        resolveReplyText: vi.fn().mockResolvedValue(null),
      } as any,
      replyCallbackServiceFactory: () =>
        ({
          publishAssistantReplyToSource: vi.fn(),
        }) as any,
    });

    await runtime.registerAcceptedReceipt(receipt);
    await vi.advanceTimersByTimeAsync(5_000);

    expect(teamRunService.resolveTeamRun).not.toHaveBeenCalled();

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
      agentRunService: {
        getAgentRun: vi.fn().mockReturnValue(null),
        resolveAgentRun: vi.fn().mockResolvedValue(null),
      } as any,
      teamRunService: {
        getTeamRun: vi.fn().mockReturnValue(null),
        resolveTeamRun: vi.fn().mockResolvedValue(null),
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

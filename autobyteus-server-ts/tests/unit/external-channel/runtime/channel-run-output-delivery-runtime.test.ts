import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { AgentRunEventType } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { TeamRunEventSourceType } from "../../../../src/agent-team-execution/domain/team-run-event.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import type { ChannelBinding } from "../../../../src/external-channel/domain/models.js";
import { FileChannelBindingProvider } from "../../../../src/external-channel/providers/file-channel-binding-provider.js";
import { FileChannelRunOutputDeliveryProvider } from "../../../../src/external-channel/providers/file-channel-run-output-delivery-provider.js";
import { ChannelRunOutputDeliveryRuntime } from "../../../../src/external-channel/runtime/channel-run-output-delivery-runtime.js";
import { ChannelBindingService } from "../../../../src/external-channel/services/channel-binding-service.js";
import { ChannelRunOutputDeliveryService } from "../../../../src/external-channel/services/channel-run-output-delivery-service.js";
import { ReplyCallbackService } from "../../../../src/external-channel/services/reply-callback-service.js";

const tempFiles = new Set<string>();

afterEach(async () => {
  await Promise.all([...tempFiles].map((file) => rm(file, { force: true })));
  tempFiles.clear();
});

const createBinding = (): ChannelBinding => ({
  id: "binding-1",
  provider: ExternalChannelProvider.TELEGRAM,
  transport: ExternalChannelTransport.BUSINESS_API,
  accountId: "acct-1",
  peerId: "peer-1",
  threadId: "thread-1",
  targetType: "TEAM",
  agentDefinitionId: null,
  launchPreset: null,
  agentRunId: null,
  teamDefinitionId: "team-definition-1",
  teamLaunchPreset: null,
  teamRunId: "team-1",
  targetNodeName: "coordinator",
  allowTransportFallback: false,
  createdAt: new Date("2026-04-26T00:00:00.000Z"),
  updatedAt: new Date("2026-04-26T00:00:00.000Z"),
});

const createAgentBinding = (): ChannelBinding => ({
  ...createBinding(),
  id: "binding-agent-1",
  targetType: "AGENT",
  agentDefinitionId: "agent-definition-1",
  launchPreset: {
    workspaceRootPath: "/tmp/workspace",
    llmModelIdentifier: "gpt-test",
    runtimeKind: RuntimeKind.AUTOBYTEUS,
    autoExecuteTools: false,
    skillAccessMode: "PRELOADED_ONLY",
    llmConfig: null,
  },
  agentRunId: "agent-1",
  teamDefinitionId: null,
  teamLaunchPreset: null,
  teamRunId: null,
  targetNodeName: null,
});

const createAgentRun = () => {
  const listeners = new Set<(event: unknown) => void>();
  return {
    run: {
      subscribeToEvents: (listener: (event: unknown) => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
    emit: (event: unknown) => {
      for (const listener of listeners) {
        listener(event);
      }
    },
  };
};

const createTeamRun = () => {
  const listeners = new Set<(event: unknown) => void>();
  const runtimeContext = {
    memberContexts: [
      { memberName: "coordinator", memberRouteKey: "coordinator", memberRunId: "run-coordinator", getPlatformAgentRunId: () => null },
      { memberName: "worker", memberRouteKey: "worker", memberRunId: "run-worker", getPlatformAgentRunId: () => null },
    ],
  };
  return {
    run: {
      runId: "team-1",
      context: { coordinatorMemberName: "coordinator", runtimeContext },
      config: { coordinatorMemberName: "coordinator", memberConfigs: [{ memberName: "coordinator" }, { memberName: "worker" }] },
      getRuntimeContext: () => runtimeContext,
      subscribeToEvents: (listener: (event: unknown) => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
    emit: (event: unknown) => {
      for (const listener of listeners) {
        listener(event);
      }
    },
  };
};

const teamAgentEvent = (input: {
  memberName: string;
  memberRunId: string;
  eventType: AgentRunEventType;
  turnId: string;
  text?: string;
}) => ({
  eventSourceType: TeamRunEventSourceType.AGENT,
  teamRunId: "team-1",
  data: {
    runtimeKind: RuntimeKind.AUTOBYTEUS,
    memberName: input.memberName,
    memberRunId: input.memberRunId,
    agentEvent: {
      eventType: input.eventType,
      runId: input.memberRunId,
      statusHint: "ACTIVE",
      payload: {
        turnId: input.turnId,
        segment_type: "text",
        delta: input.text,
        text: input.text,
      },
    },
  },
});

const emitTextTurn = (emit: (event: unknown) => void, input: {
  memberName: string;
  memberRunId: string;
  turnId: string;
  text: string;
}) => {
  emit(teamAgentEvent({ ...input, eventType: AgentRunEventType.TURN_STARTED }));
  emit(teamAgentEvent({ ...input, eventType: AgentRunEventType.SEGMENT_CONTENT }));
  emit(teamAgentEvent({ ...input, eventType: AgentRunEventType.SEGMENT_END }));
  emit(teamAgentEvent({ ...input, eventType: AgentRunEventType.TURN_COMPLETED }));
};

describe("ChannelRunOutputDeliveryRuntime", () => {
  it("recovers and publishes an accepted direct reply when stream events arrived before attach", async () => {
    const filePath = `/tmp/channel-output-deliveries-${randomUUID()}.json`;
    tempFiles.add(filePath);
    const deliveryService = new ChannelRunOutputDeliveryService(
      new FileChannelRunOutputDeliveryProvider(filePath),
    );
    const agentRun = createAgentRun();
    const publishRunOutputReply = vi.fn().mockResolvedValue({
      published: true,
      duplicate: false,
      reason: null,
      envelope: {},
    });
    const runtime = new ChannelRunOutputDeliveryRuntime({
      bindingService: { listBindings: vi.fn().mockResolvedValue([]) } as any,
      messageReceiptService: { findLatestAcceptedSourceForRoute: vi.fn() } as any,
      deliveryService,
      agentRunService: { resolveAgentRun: vi.fn().mockResolvedValue(agentRun.run) } as any,
      teamRunService: {} as any,
      turnReplyRecoveryService: {
        resolveReplyText: vi.fn().mockResolvedValue("already completed direct reply"),
      } as any,
      replyCallbackServiceFactory: () => ({ publishRunOutputReply } as any),
    });
    const binding = createAgentBinding();

    await runtime.attachAcceptedDispatch({
      binding,
      route: {
        provider: binding.provider,
        transport: binding.transport,
        accountId: binding.accountId,
        peerId: binding.peerId,
        threadId: binding.threadId,
      },
      latestCorrelationMessageId: "telegram-message-1",
      target: { targetType: "AGENT", agentRunId: "agent-1" },
      turnId: "turn-1",
    });

    expect(publishRunOutputReply).toHaveBeenCalledWith(expect.objectContaining({
      replyText: "already completed direct reply",
      correlationMessageId: "telegram-message-1",
      target: { targetType: "AGENT", agentRunId: "agent-1" },
      turnId: "turn-1",
    }));

    await runtime.stop();
  });

  it("publishes coordinator follow-up outputs without leaking worker turns", async () => {
    const filePath = `/tmp/channel-output-deliveries-${randomUUID()}.json`;
    tempFiles.add(filePath);
    const deliveryService = new ChannelRunOutputDeliveryService(
      new FileChannelRunOutputDeliveryProvider(filePath),
    );
    const teamRun = createTeamRun();
    const publishRunOutputReply = vi.fn().mockResolvedValue({
      published: true,
      duplicate: false,
      reason: null,
      envelope: {},
    });
    const runtime = new ChannelRunOutputDeliveryRuntime({
      bindingService: { listBindings: vi.fn().mockResolvedValue([]) } as any,
      messageReceiptService: { findLatestAcceptedSourceForRoute: vi.fn() } as any,
      deliveryService,
      agentRunService: {} as any,
      teamRunService: { resolveTeamRun: vi.fn().mockResolvedValue(teamRun.run) } as any,
      turnReplyRecoveryService: { resolveReplyText: vi.fn().mockResolvedValue(null) } as any,
      replyCallbackServiceFactory: () => ({ publishRunOutputReply } as any),
    });
    const binding = createBinding();

    await runtime.attachAcceptedDispatch({
      binding,
      route: {
        provider: binding.provider,
        transport: binding.transport,
        accountId: binding.accountId,
        peerId: binding.peerId,
        threadId: binding.threadId,
      },
      latestCorrelationMessageId: "telegram-message-1",
      target: {
        targetType: "TEAM",
        teamRunId: "team-1",
        entryMemberRunId: "run-coordinator",
        entryMemberName: "coordinator",
      },
      turnId: "initial-turn",
    });

    emitTextTurn(teamRun.emit, {
      memberName: "worker",
      memberRunId: "run-worker",
      turnId: "worker-turn",
      text: "internal worker text",
    });
    emitTextTurn(teamRun.emit, {
      memberName: "coordinator",
      memberRunId: "run-coordinator",
      turnId: "follow-turn-1",
      text: "first external reply",
    });
    emitTextTurn(teamRun.emit, {
      memberName: "coordinator",
      memberRunId: "run-coordinator",
      turnId: "follow-turn-2",
      text: "second external reply",
    });

    await waitFor(() => publishRunOutputReply.mock.calls.length === 2);
    expect(publishRunOutputReply.mock.calls.map((call) => call[0].replyText)).toEqual([
      "first external reply",
      "second external reply",
    ]);
    expect(publishRunOutputReply.mock.calls[0]?.[0]).toMatchObject({
      correlationMessageId: "telegram-message-1",
      target: {
        targetType: "TEAM",
        teamRunId: "team-1",
        entryMemberRunId: "run-coordinator",
        entryMemberName: "coordinator",
      },
    });

    await runtime.stop();
  });

  it("restores durable output records after restart and skips records already published", async () => {
    const filePath = `/tmp/channel-output-deliveries-${randomUUID()}.json`;
    tempFiles.add(filePath);
    const deliveryService = new ChannelRunOutputDeliveryService(
      new FileChannelRunOutputDeliveryProvider(filePath),
    );
    const binding = createBinding();
    const route = {
      provider: binding.provider,
      transport: binding.transport,
      accountId: binding.accountId,
      peerId: binding.peerId,
      threadId: binding.threadId,
    };
    const target = {
      targetType: "TEAM" as const,
      teamRunId: "team-1",
      entryMemberRunId: "run-coordinator",
      entryMemberName: "coordinator",
    };

    const observing = await deliveryService.upsertObservedTurn({
      bindingId: binding.id,
      route,
      target,
      turnId: "turn-observing",
      correlationMessageId: "telegram-message-1",
    });
    const finalized = await deliveryService.upsertObservedTurn({
      bindingId: binding.id,
      route,
      target,
      turnId: "turn-finalized",
      correlationMessageId: "telegram-message-1",
    });
    await deliveryService.markReplyFinalized({
      deliveryKey: finalized.deliveryKey,
      replyTextFinal: "finalized reply",
    });
    const pending = await deliveryService.upsertObservedTurn({
      bindingId: binding.id,
      route,
      target,
      turnId: "turn-pending",
      correlationMessageId: "telegram-message-1",
    });
    await deliveryService.markReplyFinalized({
      deliveryKey: pending.deliveryKey,
      replyTextFinal: "pending reply",
    });
    await deliveryService.markPublishPending({
      deliveryKey: pending.deliveryKey,
      callbackIdempotencyKey: "manual-callback-pending",
    });
    const published = await deliveryService.upsertObservedTurn({
      bindingId: binding.id,
      route,
      target,
      turnId: "turn-published",
      correlationMessageId: "telegram-message-1",
    });
    await deliveryService.markReplyFinalized({
      deliveryKey: published.deliveryKey,
      replyTextFinal: "already published reply",
    });
    await deliveryService.markPublishPending({
      deliveryKey: published.deliveryKey,
      callbackIdempotencyKey: "manual-callback-published",
    });
    await deliveryService.markPublished({ deliveryKey: published.deliveryKey });

    const publishRunOutputReply = vi.fn().mockResolvedValue({
      published: true,
      duplicate: false,
      reason: null,
      envelope: {},
    });
    const runtime = new ChannelRunOutputDeliveryRuntime({
      bindingService: { listBindings: vi.fn().mockResolvedValue([]) } as any,
      messageReceiptService: { findLatestAcceptedSourceForRoute: vi.fn() } as any,
      deliveryService,
      agentRunService: {} as any,
      teamRunService: {} as any,
      turnReplyRecoveryService: {
        resolveReplyText: vi.fn().mockImplementation(async (input: { turnId: string }) =>
          input.turnId === observing.turnId ? "recovered observing reply" : null,
        ),
      } as any,
      replyCallbackServiceFactory: () => ({ publishRunOutputReply } as any),
    });

    runtime.start();

    await waitFor(() => publishRunOutputReply.mock.calls.length === 3, 3_000);
    const publishedTurns = publishRunOutputReply.mock.calls.map((call) => call[0].turnId);
    expect(publishedTurns).toEqual(expect.arrayContaining([
      "turn-observing",
      "turn-finalized",
      "turn-pending",
    ]));
    expect(publishedTurns).not.toContain("turn-published");
    expect(publishRunOutputReply.mock.calls.find((call) => call[0].turnId === "turn-pending")?.[0])
      .toMatchObject({ callbackIdempotencyKey: "manual-callback-pending" });

    await expectRecordStatus(deliveryService, observing.deliveryKey, "PUBLISHED");
    await expectRecordStatus(deliveryService, finalized.deliveryKey, "PUBLISHED");
    await expectRecordStatus(deliveryService, pending.deliveryKey, "PUBLISHED");
    await expectRecordStatus(deliveryService, published.deliveryKey, "PUBLISHED");

    await runtime.stop();
  });

  it("does not publish recovered team output after the same route is rebound to another target node", async () => {
    const bindingFilePath = `/tmp/channel-bindings-${randomUUID()}.json`;
    const deliveryFilePath = `/tmp/channel-output-deliveries-${randomUUID()}.json`;
    tempFiles.add(bindingFilePath);
    tempFiles.add(deliveryFilePath);
    const bindingService = new ChannelBindingService(
      new FileChannelBindingProvider(bindingFilePath),
    );
    const deliveryService = new ChannelRunOutputDeliveryService(
      new FileChannelRunOutputDeliveryProvider(deliveryFilePath),
    );
    const route = {
      provider: ExternalChannelProvider.TELEGRAM,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId: "acct-stale",
      peerId: "peer-stale",
      threadId: "thread-stale",
    };

    await bindingService.upsertBinding({
      ...route,
      targetType: "TEAM",
      teamDefinitionId: "team-definition-1",
      teamRunId: "team-1",
      targetNodeName: "coordinator",
    });
    const reboundBinding = await bindingService.upsertBinding({
      ...route,
      targetType: "TEAM",
      teamDefinitionId: "team-definition-1",
      teamRunId: "team-1",
      targetNodeName: "worker",
    });
    const staleCoordinatorRecord = await deliveryService.upsertObservedTurn({
      bindingId: reboundBinding.id,
      route,
      target: {
        targetType: "TEAM",
        teamRunId: "team-1",
        entryMemberRunId: "run-coordinator",
        entryMemberName: "coordinator",
      },
      turnId: "stale-coordinator-turn",
      correlationMessageId: "telegram-message-1",
    });
    await deliveryService.markReplyFinalized({
      deliveryKey: staleCoordinatorRecord.deliveryKey,
      replyTextFinal: "stale coordinator reply",
    });

    const enqueueOrGet = vi.fn().mockResolvedValue({ duplicate: false });
    const recordPending = vi.fn().mockResolvedValue(undefined);
    const replyCallbackService = new ReplyCallbackService({
      bindingService,
      deliveryEventService: { recordPending } as any,
      callbackOutboxService: { enqueueOrGet },
      callbackTargetResolver: {
        resolveGatewayCallbackDispatchTarget: vi.fn().mockResolvedValue({
          state: "AVAILABLE",
          reason: null,
        }),
      },
    });
    const teamRun = createTeamRun();
    const runtime = new ChannelRunOutputDeliveryRuntime({
      bindingService,
      messageReceiptService: {
        findLatestAcceptedSourceForRoute: vi.fn().mockResolvedValue({
          externalMessageId: "telegram-message-2",
        }),
      } as any,
      deliveryService,
      agentRunService: {} as any,
      teamRunService: { resolveTeamRun: vi.fn().mockResolvedValue(teamRun.run) } as any,
      turnReplyRecoveryService: { resolveReplyText: vi.fn().mockResolvedValue(null) } as any,
      replyCallbackServiceFactory: () => replyCallbackService,
    });

    runtime.start();
    try {
      await waitFor(async () => {
        const record = await deliveryService.getByDeliveryKey(staleCoordinatorRecord.deliveryKey);
        return record?.status === "UNBOUND" ||
          record?.status === "PUBLISHED" ||
          enqueueOrGet.mock.calls.length > 0;
      });
      const recordAfterRestore = await deliveryService.getByDeliveryKey(
        staleCoordinatorRecord.deliveryKey,
      );
      expect(recordAfterRestore?.status).toBe("UNBOUND");
      expect(enqueueOrGet).not.toHaveBeenCalled();
      expect(recordPending).not.toHaveBeenCalled();
    } finally {
      await runtime.stop();
    }
  });

  it("does not publish explicit member output after the same route is rebound to the default team target", async () => {
    const bindingFilePath = `/tmp/channel-bindings-${randomUUID()}.json`;
    const deliveryFilePath = `/tmp/channel-output-deliveries-${randomUUID()}.json`;
    tempFiles.add(bindingFilePath);
    tempFiles.add(deliveryFilePath);
    const teamRun = createTeamRun();
    const bindingService = new ChannelBindingService(
      new FileChannelBindingProvider(bindingFilePath),
      {},
      {
        teamRunService: { resolveTeamRun: vi.fn().mockResolvedValue(teamRun.run) } as any,
      },
    );
    const deliveryService = new ChannelRunOutputDeliveryService(
      new FileChannelRunOutputDeliveryProvider(deliveryFilePath),
    );
    const route = {
      provider: ExternalChannelProvider.TELEGRAM,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId: "acct-default-rebound",
      peerId: "peer-default-rebound",
      threadId: "thread-default-rebound",
    };

    await bindingService.upsertBinding({
      ...route,
      targetType: "TEAM",
      teamDefinitionId: "team-definition-1",
      teamRunId: "team-1",
      targetNodeName: "worker",
    });
    const reboundBinding = await bindingService.upsertBinding({
      ...route,
      targetType: "TEAM",
      teamDefinitionId: "team-definition-1",
      teamRunId: "team-1",
      targetNodeName: null,
    });
    const staleWorkerRecord = await deliveryService.upsertObservedTurn({
      bindingId: reboundBinding.id,
      route,
      target: {
        targetType: "TEAM",
        teamRunId: "team-1",
        entryMemberRunId: "run-worker",
        entryMemberName: "worker",
      },
      turnId: "stale-worker-turn",
      correlationMessageId: "telegram-message-1",
    });
    await deliveryService.markReplyFinalized({
      deliveryKey: staleWorkerRecord.deliveryKey,
      replyTextFinal: "stale worker reply",
    });

    const enqueueOrGet = vi.fn().mockResolvedValue({ duplicate: false });
    const recordPending = vi.fn().mockResolvedValue(undefined);
    const replyCallbackService = new ReplyCallbackService({
      bindingService,
      deliveryEventService: { recordPending } as any,
      callbackOutboxService: { enqueueOrGet },
      callbackTargetResolver: {
        resolveGatewayCallbackDispatchTarget: vi.fn().mockResolvedValue({
          state: "AVAILABLE",
          reason: null,
        }),
      },
    });
    const runtime = new ChannelRunOutputDeliveryRuntime({
      bindingService,
      messageReceiptService: {
        findLatestAcceptedSourceForRoute: vi.fn().mockResolvedValue({
          externalMessageId: "telegram-message-2",
        }),
      } as any,
      deliveryService,
      agentRunService: {} as any,
      teamRunService: { resolveTeamRun: vi.fn().mockResolvedValue(teamRun.run) } as any,
      turnReplyRecoveryService: { resolveReplyText: vi.fn().mockResolvedValue(null) } as any,
      replyCallbackServiceFactory: () => replyCallbackService,
    });

    runtime.start();
    try {
      await waitFor(async () => {
        const record = await deliveryService.getByDeliveryKey(staleWorkerRecord.deliveryKey);
        return record?.status === "UNBOUND" ||
          record?.status === "PUBLISHED" ||
          enqueueOrGet.mock.calls.length > 0;
      });
      const recordAfterRestore = await deliveryService.getByDeliveryKey(
        staleWorkerRecord.deliveryKey,
      );
      expect(recordAfterRestore?.status).toBe("UNBOUND");
      expect(enqueueOrGet).not.toHaveBeenCalled();
      expect(recordPending).not.toHaveBeenCalled();
    } finally {
      await runtime.stop();
    }
  });
});

const expectRecordStatus = async (
  service: ChannelRunOutputDeliveryService,
  deliveryKey: string,
  status: string,
): Promise<void> => {
  const record = await service.getByDeliveryKey(deliveryKey);
  expect(record?.status).toBe(status);
};

const waitFor = async (
  predicate: () => boolean | Promise<boolean>,
  timeoutMs = 2_000,
): Promise<void> => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for condition.");
};

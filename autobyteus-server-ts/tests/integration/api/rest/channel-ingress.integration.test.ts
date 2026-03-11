import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { ExternalPeerType } from "autobyteus-ts/external-channel/peer-type.js";
import { ExternalDeliveryStatus } from "autobyteus-ts/external-channel/external-delivery-event.js";
import type { ExternalOutboundEnvelope } from "autobyteus-ts/external-channel/external-outbound-envelope.js";
import { registerChannelIngressRoutes } from "../../../../src/api/rest/channel-ingress.js";
import {
  ChannelBindingRuntimeLauncher,
  InMemoryChannelBindingLiveRunRegistry,
} from "../../../../src/external-channel/runtime/channel-binding-runtime-launcher.js";
import { DefaultChannelRuntimeFacade } from "../../../../src/external-channel/runtime/default-channel-runtime-facade.js";
import { GatewayCallbackDispatchWorker } from "../../../../src/external-channel/runtime/gateway-callback-dispatch-worker.js";
import { GatewayCallbackOutboxService } from "../../../../src/external-channel/runtime/gateway-callback-outbox-service.js";
import { FileGatewayCallbackOutboxStore } from "../../../../src/external-channel/runtime/gateway-callback-outbox-store.js";
import { RuntimeExternalChannelTurnBridge } from "../../../../src/external-channel/runtime/runtime-external-channel-turn-bridge.js";
import { SqlChannelBindingProvider } from "../../../../src/external-channel/providers/sql-channel-binding-provider.js";
import { SqlChannelCallbackIdempotencyProvider } from "../../../../src/external-channel/providers/sql-channel-callback-idempotency-provider.js";
import { SqlChannelIdempotencyProvider } from "../../../../src/external-channel/providers/sql-channel-idempotency-provider.js";
import { SqlChannelMessageReceiptProvider } from "../../../../src/external-channel/providers/sql-channel-message-receipt-provider.js";
import { SqlDeliveryEventProvider } from "../../../../src/external-channel/providers/sql-delivery-event-provider.js";
import { ChannelBindingService } from "../../../../src/external-channel/services/channel-binding-service.js";
import { CallbackIdempotencyService } from "../../../../src/external-channel/services/callback-idempotency-service.js";
import { ChannelIdempotencyService } from "../../../../src/external-channel/services/channel-idempotency-service.js";
import { ChannelIngressService } from "../../../../src/external-channel/services/channel-ingress-service.js";
import { ChannelMessageReceiptService } from "../../../../src/external-channel/services/channel-message-receipt-service.js";
import { ChannelThreadLockService } from "../../../../src/external-channel/services/channel-thread-lock-service.js";
import { DeliveryEventService } from "../../../../src/external-channel/services/delivery-event-service.js";
import { ReplyCallbackService } from "../../../../src/external-channel/services/reply-callback-service.js";
import type { ChannelRuntimeFacade } from "../../../../src/external-channel/runtime/channel-runtime-facade.js";

const unique = (prefix: string): string => `${prefix}-${randomUUID()}`;

const flushAsync = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
};

const waitForValue = async <T>(
  probe: () => Promise<T>,
  predicate: (value: T) => boolean,
  options: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<T> => {
  const timeoutMs = options.timeoutMs ?? 1_500;
  const intervalMs = options.intervalMs ?? 20;
  const deadline = Date.now() + timeoutMs;

  while (true) {
    const value = await probe();
    if (predicate(value)) {
      return value;
    }
    if (Date.now() >= deadline) {
      return value;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
};

const createRuntimeFacade = (): ChannelRuntimeFacade => ({
  dispatchToBinding: async (binding) => ({
    agentRunId: binding.agentRunId,
    teamRunId: binding.teamRunId,
    dispatchedAt: new Date("2026-02-08T00:00:01.000Z"),
  }),
});

const createTeamLaunchPreset = () => ({
  workspaceRootPath: "/tmp/autobyteus-external-channel-team-workspace",
  llmModelIdentifier: "gpt-test",
  runtimeKind: "autobyteus",
  autoExecuteTools: false,
  llmConfig: null,
});

const createDefinitionBoundTeamRuntimeFacade = (
  bindingService: ChannelBindingService,
  options: {
    getTeamRunResumeConfig: (teamRunId: string) => Promise<unknown>;
    ensureTeamRunId: string;
    dispatchedTurn?: {
      memberName: string;
      memberRunId: string;
      runtimeKind: string;
      turnId: string | null;
    } | null;
  },
) => {
  const buildMemberConfigsFromLaunchPreset = vi.fn().mockResolvedValue([
    { memberName: "Coordinator" },
    { memberName: "Implementer" },
  ]);
  const ensureTeamRun = vi.fn().mockResolvedValue({
    teamRunId: options.ensureTeamRunId,
  });
  const continueTeamRunWithMessage = vi.fn().mockResolvedValue({
    teamRunId: options.ensureTeamRunId,
    restored: false,
    targetMemberName: options.dispatchedTurn?.memberName ?? "Coordinator",
    dispatchedTurn: options.dispatchedTurn ?? null,
  });
  const bindAcceptedExternalTurn = vi.fn().mockResolvedValue(undefined);
  const bindingRunRegistry = new InMemoryChannelBindingLiveRunRegistry();
  const runtimeLauncher = new ChannelBindingRuntimeLauncher({
    bindingService,
    bindingRunRegistry,
    runtimeCompositionService: {} as any,
    runtimeCommandIngressService: {} as any,
    runtimeAdapterRegistry: {} as any,
    workspaceManager: {} as any,
    teamRunHistoryService: {
      getTeamRunResumeConfig: options.getTeamRunResumeConfig,
    } as any,
    teamRunLaunchService: {
      buildMemberConfigsFromLaunchPreset,
      ensureTeamRun,
    } as any,
    runHistoryBootstrapper: {
      bootstrapNewRun: vi.fn(),
    } as any,
  });

  const runtimeFacade = new DefaultChannelRuntimeFacade({
    runtimeLauncher,
    runtimeCommandIngressService: {
      sendTurn: vi.fn(),
    },
    teamRunContinuationService: {
      continueTeamRunWithMessage,
    },
    agentLiveMessagePublisher: {
      publishExternalUserMessage: vi.fn(),
    },
    teamLiveMessagePublisher: {
      publishExternalUserMessage: vi.fn(),
    },
    externalTurnBridge: {
      bindAcceptedExternalTurn,
    },
  });

  return {
    runtimeFacade,
    runtimeLauncher,
    bindingRunRegistry,
    buildMemberConfigsFromLaunchPreset,
    ensureTeamRun,
    continueTeamRunWithMessage,
    bindAcceptedExternalTurn,
  };
};

const createDefinitionBoundTeamRuntimeFacadeWithCallbackHarness = async (
  bindingService: ChannelBindingService,
  options: {
    getTeamRunResumeConfig: (teamRunId: string) => Promise<unknown>;
    ensureTeamRunId: string;
    dispatchedTurn: {
      memberName: string;
      memberRunId: string;
      runtimeKind: string;
      turnId: string;
    };
  },
) => {
  const callbackRequests: ExternalOutboundEnvelope[] = [];
  const outboxFilePath = `/tmp/team-callback-outbox-${randomUUID()}.json`;
  const callbackApp = fastify();
  callbackApp.post("/api/server-callback/v1/messages", async (request, reply) => {
    callbackRequests.push(request.body as ExternalOutboundEnvelope);
    return reply.code(202).send({ accepted: true });
  });
  const callbackBaseUrl = await callbackApp.listen({
    host: "127.0.0.1",
    port: 0,
  });

  const buildMemberConfigsFromLaunchPreset = vi.fn().mockResolvedValue([
    { memberName: "Coordinator" },
    { memberName: "Implementer" },
  ]);
  const ensureTeamRun = vi.fn().mockResolvedValue({
    teamRunId: options.ensureTeamRunId,
  });
  const continueTeamRunWithMessage = vi.fn().mockResolvedValue({
    teamRunId: options.ensureTeamRunId,
    restored: false,
    targetMemberName: options.dispatchedTurn.memberName,
    dispatchedTurn: options.dispatchedTurn,
  });
  const bindingRunRegistry = new InMemoryChannelBindingLiveRunRegistry();
  const runtimeLauncher = new ChannelBindingRuntimeLauncher({
    bindingService,
    bindingRunRegistry,
    runtimeCompositionService: {} as any,
    runtimeCommandIngressService: {} as any,
    runtimeAdapterRegistry: {} as any,
    workspaceManager: {} as any,
    teamRunHistoryService: {
      getTeamRunResumeConfig: options.getTeamRunResumeConfig,
    } as any,
    teamRunLaunchService: {
      buildMemberConfigsFromLaunchPreset,
      ensureTeamRun,
    } as any,
    runHistoryBootstrapper: {
      bootstrapNewRun: vi.fn(),
    } as any,
  });

  const messageReceiptService = new ChannelMessageReceiptService(
    new SqlChannelMessageReceiptProvider(),
  );
  const deliveryEventProvider = new SqlDeliveryEventProvider();
  const deliveryEventService = new DeliveryEventService(deliveryEventProvider);
  const callbackOutboxService = new GatewayCallbackOutboxService(
    new FileGatewayCallbackOutboxStore(outboxFilePath),
  );
  const resolveGatewayCallbackDispatchTarget = vi.fn().mockResolvedValue({
    state: "AVAILABLE" as const,
    reason: null,
    options: {
      baseUrl: callbackBaseUrl,
      sharedSecret: null,
      timeoutMs: 5_000,
    },
  });
  const replyCallbackService = new ReplyCallbackService(messageReceiptService, {
    callbackIdempotencyService: new CallbackIdempotencyService(
      new SqlChannelCallbackIdempotencyProvider(),
    ),
    deliveryEventService,
    bindingService,
    callbackOutboxService,
    callbackTargetResolver: {
      resolveGatewayCallbackDispatchTarget,
    },
  });
  const callbackDispatchWorker = new GatewayCallbackDispatchWorker({
    outboxService: callbackOutboxService,
    deliveryEventService,
    targetResolver: {
      resolveGatewayCallbackDispatchTarget,
    },
    config: {
      batchSize: 10,
      loopIntervalMs: 1,
      leaseDurationMs: 5_000,
      maxAttempts: 3,
      baseDelayMs: 10,
      maxDelayMs: 100,
      backoffFactor: 2,
    },
  });

  let runtimeListener: ((event: unknown) => void) | null = null;
  const externalTurnBridge = new RuntimeExternalChannelTurnBridge({
    messageReceiptService,
    replyCallbackService,
    adapterRegistry: {
      resolveAdapter: vi.fn().mockReturnValue({
        subscribeToRunEvents: vi.fn((_runId: string, onEvent: (event: unknown) => void) => {
          runtimeListener = onEvent;
          return vi.fn();
        }),
      }),
    },
    runProjectionService: {
      getProjection: vi.fn(),
    },
  });

  const runtimeFacade = new DefaultChannelRuntimeFacade({
    runtimeLauncher,
    runtimeCommandIngressService: {
      sendTurn: vi.fn(),
    },
    teamRunContinuationService: {
      continueTeamRunWithMessage,
    },
    agentLiveMessagePublisher: {
      publishExternalUserMessage: vi.fn(),
    },
    teamLiveMessagePublisher: {
      publishExternalUserMessage: vi.fn(),
    },
    externalTurnBridge,
  });

  return {
    runtimeFacade,
    messageReceiptService,
    deliveryEventProvider,
    callbackOutboxService,
    callbackRequests,
    ensureTeamRun,
    continueTeamRunWithMessage,
    bindAcceptedTurnToSource: async (input: {
      runId: string;
      runtimeKind: "codex_app_server" | "claude_agent_sdk";
      turnId: string;
      teamRunId?: string | null;
      source: {
        provider: ExternalChannelProvider;
        transport: ExternalChannelTransport;
        accountId: string;
        peerId: string;
        threadId: string | null;
        externalMessageId: string;
        receivedAt: Date;
      };
    }) => {
      await externalTurnBridge.bindAcceptedTurnToSource(input);
    },
    emitRuntimeReply: async (
      replyText: string,
      turnId: string = options.dispatchedTurn.turnId,
    ) => {
      if (!runtimeListener) {
        throw new Error("Runtime listener was not registered.");
      }
      runtimeListener({
        method: "item/output_text/completed",
        params: {
          turnId,
          text: replyText,
        },
      });
      runtimeListener({
        method: "turn.completed",
        params: {
          turnId,
        },
      });
      await flushAsync();
    },
    dispatchQueuedCallbacks: async () => {
      await callbackDispatchWorker.runOnce();
      await flushAsync();
    },
    listQueuedCallbacks: async () =>
      callbackOutboxService.listByStatus([
        "PENDING",
        "FAILED_RETRY",
        "DISPATCHING",
        "SENT",
        "DEAD_LETTER",
      ]),
    close: async () => {
      await callbackApp.close();
      await rm(outboxFilePath, { force: true });
    },
  };
};

const createAgentRuntimeFacadeWithCallbackHarness = async (options: {
  agentRunId: string;
  dispatchedTurn: {
    runtimeKind: string;
    turnId: string;
  };
}) => {
  const callbackRequests: ExternalOutboundEnvelope[] = [];
  const outboxFilePath = `/tmp/agent-callback-outbox-${randomUUID()}.json`;
  const callbackApp = fastify();
  callbackApp.post("/api/server-callback/v1/messages", async (request, reply) => {
    callbackRequests.push(request.body as ExternalOutboundEnvelope);
    return reply.code(202).send({ accepted: true });
  });
  const callbackBaseUrl = await callbackApp.listen({
    host: "127.0.0.1",
    port: 0,
  });

  const messageReceiptService = new ChannelMessageReceiptService(
    new SqlChannelMessageReceiptProvider(),
  );
  const deliveryEventProvider = new SqlDeliveryEventProvider();
  const deliveryEventService = new DeliveryEventService(deliveryEventProvider);
  const callbackOutboxService = new GatewayCallbackOutboxService(
    new FileGatewayCallbackOutboxStore(outboxFilePath),
  );
  const resolveGatewayCallbackDispatchTarget = vi.fn().mockResolvedValue({
    state: "AVAILABLE" as const,
    reason: null,
    options: {
      baseUrl: callbackBaseUrl,
      sharedSecret: null,
      timeoutMs: 5_000,
    },
  });
  const bindingService = new ChannelBindingService(new SqlChannelBindingProvider());
  const replyCallbackService = new ReplyCallbackService(messageReceiptService, {
    callbackIdempotencyService: new CallbackIdempotencyService(
      new SqlChannelCallbackIdempotencyProvider(),
    ),
    deliveryEventService,
    bindingService,
    callbackOutboxService,
    callbackTargetResolver: {
      resolveGatewayCallbackDispatchTarget,
    },
  });
  const callbackDispatchWorker = new GatewayCallbackDispatchWorker({
    outboxService: callbackOutboxService,
    deliveryEventService,
    targetResolver: {
      resolveGatewayCallbackDispatchTarget,
    },
    config: {
      batchSize: 10,
      loopIntervalMs: 1,
      leaseDurationMs: 5_000,
      maxAttempts: 3,
      baseDelayMs: 10,
      maxDelayMs: 100,
      backoffFactor: 2,
    },
  });

  let runtimeListener: ((event: unknown) => void) | null = null;
  const externalTurnBridge = new RuntimeExternalChannelTurnBridge({
    messageReceiptService,
    replyCallbackService,
    adapterRegistry: {
      resolveAdapter: vi.fn().mockReturnValue({
        subscribeToRunEvents: vi.fn((_runId: string, onEvent: (event: unknown) => void) => {
          runtimeListener = onEvent;
          return vi.fn();
        }),
      }),
    },
    runProjectionService: {
      getProjection: vi.fn(),
    },
  });

  const resolveOrStartAgentRun = vi.fn().mockResolvedValue(options.agentRunId);
  const sendTurn = vi.fn().mockResolvedValue({
    accepted: true,
    runId: options.agentRunId,
    runtimeKind: options.dispatchedTurn.runtimeKind,
    turnId: options.dispatchedTurn.turnId,
    code: null,
    message: null,
  });

  const runtimeFacade = new DefaultChannelRuntimeFacade({
    runtimeLauncher: {
      resolveOrStartAgentRun,
      resolveOrStartTeamRun: vi.fn(),
    },
    runtimeCommandIngressService: {
      sendTurn,
    },
    teamRunContinuationService: {
      continueTeamRunWithMessage: vi.fn(),
    },
    agentLiveMessagePublisher: {
      publishExternalUserMessage: vi.fn(),
    },
    teamLiveMessagePublisher: {
      publishExternalUserMessage: vi.fn(),
    },
    externalTurnBridge,
  });

  return {
    runtimeFacade,
    messageReceiptService,
    deliveryEventProvider,
    callbackRequests,
    bindingService,
    resolveOrStartAgentRun,
    sendTurn,
    emitRuntimeReply: async (replyText: string) => {
      if (!runtimeListener) {
        throw new Error("Runtime listener was not registered.");
      }
      runtimeListener({
        method: "item/output_text/completed",
        params: {
          turnId: options.dispatchedTurn.turnId,
          text: replyText,
        },
      });
      runtimeListener({
        method: "turn.completed",
        params: {
          turnId: options.dispatchedTurn.turnId,
        },
      });
      await flushAsync();
    },
    dispatchQueuedCallbacks: async () => {
      await callbackDispatchWorker.runOnce();
      await flushAsync();
    },
    listQueuedCallbacks: async () =>
      callbackOutboxService.listByStatus([
        "PENDING",
        "FAILED_RETRY",
        "DISPATCHING",
        "SENT",
        "DEAD_LETTER",
      ]),
    close: async () => {
      await callbackApp.close();
      await rm(outboxFilePath, { force: true });
    },
  };
};

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
      targetNodeName: null,
      allowTransportFallback: false,
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
      targetNodeName: null,
      allowTransportFallback: false,
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
      usedTransportFallback: false,
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
      targetNodeName: null,
      allowTransportFallback: false,
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

  it("lazy-creates a team run on first Telegram ingress and reuses the cached teamRunId later when it is active", async () => {
    const accountId = unique("telegram-acct");
    const peerId = unique("telegram-peer");
    const teamDefinitionId = unique("team-definition");
    const teamRunId = unique("team-run");

    const bindingService = new ChannelBindingService(new SqlChannelBindingProvider());
    await bindingService.upsertBinding({
      provider: ExternalChannelProvider.TELEGRAM,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: null,
      targetType: "TEAM",
      agentDefinitionId: null,
      launchPreset: null,
      agentRunId: null,
      teamDefinitionId,
      teamLaunchPreset: createTeamLaunchPreset(),
      teamRunId: null,
      targetNodeName: null,
      allowTransportFallback: false,
    });

    const messageReceiptService = new ChannelMessageReceiptService(
      new SqlChannelMessageReceiptProvider(),
    );
    const getTeamRunResumeConfig = vi.fn(async (requestedTeamRunId: string) => {
      if (requestedTeamRunId === teamRunId) {
        return {
          teamRunId,
          manifest: { teamRunId },
          isActive: true,
        };
      }
      throw new Error(`Unknown team run '${requestedTeamRunId}'.`);
    });
    const {
      runtimeFacade,
      buildMemberConfigsFromLaunchPreset,
      ensureTeamRun,
      continueTeamRunWithMessage,
      bindAcceptedExternalTurn,
    } = createDefinitionBoundTeamRuntimeFacade(bindingService, {
      getTeamRunResumeConfig,
      ensureTeamRunId: teamRunId,
      dispatchedTurn: {
        memberName: "Coordinator",
        memberRunId: "member-coordinator-1",
        runtimeKind: "codex_app_server",
        turnId: "turn-coordinator-1",
      },
    });
    const ingressService = new ChannelIngressService({
      idempotencyService: new ChannelIdempotencyService(
        new SqlChannelIdempotencyProvider(),
      ),
      bindingService,
      threadLockService: new ChannelThreadLockService(),
      runtimeFacade,
      messageReceiptService,
    });

    const app = fastify();
    await registerChannelIngressRoutes(app, {
      ingressService,
      deliveryEventService: new DeliveryEventService(
        new SqlDeliveryEventProvider(),
      ),
    });

    const basePayload = {
      provider: ExternalChannelProvider.TELEGRAM,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      peerType: ExternalPeerType.USER,
      threadId: null,
      attachments: [],
      receivedAt: "2026-03-10T09:00:00.000Z",
      metadata: { source: "team-ingress-integration" },
    };

    const first = await app.inject({
      method: "POST",
      url: "/api/channel-ingress/v1/messages",
      payload: {
        ...basePayload,
        externalMessageId: unique("telegram-team-msg-1"),
        content: "first team message",
      },
    });
    expect(first.statusCode).toBe(202);
    expect(first.json()).toMatchObject({
      accepted: true,
      duplicate: false,
      disposition: "ROUTED",
      bindingResolved: true,
      bindingId: expect.any(String),
    });

    const secondExternalMessageId = unique("telegram-team-msg-2");
    const second = await app.inject({
      method: "POST",
      url: "/api/channel-ingress/v1/messages",
      payload: {
        ...basePayload,
        externalMessageId: secondExternalMessageId,
        content: "second team message",
      },
    });
    expect(second.statusCode).toBe(202);
    expect(second.json()).toMatchObject({
      accepted: true,
      duplicate: false,
      disposition: "ROUTED",
      bindingResolved: true,
      bindingId: expect.any(String),
    });

    const resolved = await bindingService.resolveBinding({
      provider: ExternalChannelProvider.TELEGRAM,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: null,
    });
    expect(resolved?.binding.teamRunId).toBe(teamRunId);
    expect(buildMemberConfigsFromLaunchPreset).toHaveBeenCalledTimes(1);
    expect(ensureTeamRun).toHaveBeenCalledTimes(1);
    expect(getTeamRunResumeConfig).toHaveBeenCalledTimes(1);
    expect(getTeamRunResumeConfig).toHaveBeenCalledWith(teamRunId);
    expect(continueTeamRunWithMessage).toHaveBeenCalledTimes(2);
    expect(continueTeamRunWithMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        teamRunId,
        targetMemberRouteKey: null,
      }),
    );
    expect(continueTeamRunWithMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        teamRunId,
        targetMemberRouteKey: null,
      }),
    );
    expect(bindAcceptedExternalTurn).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        runId: "member-coordinator-1",
        runtimeKind: "codex_app_server",
        turnId: "turn-coordinator-1",
      }),
    );
    expect(bindAcceptedExternalTurn).toHaveBeenCalledTimes(2);

    const latestSource = await messageReceiptService.getLatestSourceByDispatchTarget({
      agentRunId: null,
      teamRunId,
    });
    expect(latestSource).toMatchObject({
      provider: ExternalChannelProvider.TELEGRAM,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: null,
      externalMessageId: secondExternalMessageId,
    });

    await app.close();
  });

  it("calls the gateway callback API for TEAM coordinator replies after fake Telegram ingress", async () => {
    const accountId = unique("telegram-callback-acct");
    const peerId = unique("telegram-callback-peer");
    const teamDefinitionId = unique("team-definition");
    const teamRunId = unique("team-callback-run");
    const memberRunId = unique("member-coordinator");
    const turnId = unique("turn-coordinator");
    const externalMessageId = unique("telegram-callback-msg");

    const bindingService = new ChannelBindingService(new SqlChannelBindingProvider());
    await bindingService.upsertBinding({
      provider: ExternalChannelProvider.TELEGRAM,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: null,
      targetType: "TEAM",
      agentDefinitionId: null,
      launchPreset: null,
      agentRunId: null,
      teamDefinitionId,
      teamLaunchPreset: createTeamLaunchPreset(),
      teamRunId: null,
      targetNodeName: null,
      allowTransportFallback: false,
    });

    const callbackHarness = await createDefinitionBoundTeamRuntimeFacadeWithCallbackHarness(
      bindingService,
      {
        getTeamRunResumeConfig: vi.fn(async (requestedTeamRunId: string) => ({
          teamRunId: requestedTeamRunId,
          manifest: { teamRunId: requestedTeamRunId },
          isActive: true,
        })),
        ensureTeamRunId: teamRunId,
        dispatchedTurn: {
          memberName: "Coordinator",
          memberRunId,
          runtimeKind: "codex_app_server",
          turnId,
        },
      },
    );

    const ingressService = new ChannelIngressService({
      idempotencyService: new ChannelIdempotencyService(
        new SqlChannelIdempotencyProvider(),
      ),
      bindingService,
      threadLockService: new ChannelThreadLockService(),
      runtimeFacade: callbackHarness.runtimeFacade,
      messageReceiptService: callbackHarness.messageReceiptService,
    });

    const app = fastify();
    await registerChannelIngressRoutes(app, {
      ingressService,
      deliveryEventService: new DeliveryEventService(
        new SqlDeliveryEventProvider(),
      ),
    });

    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/channel-ingress/v1/messages",
        payload: {
          provider: ExternalChannelProvider.TELEGRAM,
          transport: ExternalChannelTransport.BUSINESS_API,
          accountId,
          peerId,
          peerType: ExternalPeerType.USER,
          threadId: null,
          externalMessageId,
          content: "send callback to telegram",
          attachments: [],
          receivedAt: "2026-03-10T10:30:00.000Z",
          metadata: { source: "team-callback-integration" },
        },
      });

      expect(response.statusCode).toBe(202);
      expect(response.json()).toMatchObject({
        accepted: true,
        duplicate: false,
        disposition: "ROUTED",
        bindingResolved: true,
      });

      await callbackHarness.emitRuntimeReply("Coordinator reply to Telegram");
      const source = await callbackHarness.messageReceiptService.getSourceByAgentRunTurn(
        memberRunId,
        turnId,
      );
      expect(source).toMatchObject({
        provider: ExternalChannelProvider.TELEGRAM,
        transport: ExternalChannelTransport.BUSINESS_API,
        accountId,
        peerId,
        threadId: null,
        externalMessageId,
      });
      const queuedBeforeDispatch = await waitForValue(
        () => callbackHarness.listQueuedCallbacks(),
        (rows) => rows.length === 1,
      );
      expect(queuedBeforeDispatch).toHaveLength(1);
      expect(queuedBeforeDispatch[0]).toMatchObject({
        callbackIdempotencyKey: `external-reply:${memberRunId}:${turnId}`,
        status: "PENDING",
      });
      const pendingEvent = await waitForValue(
        () =>
          callbackHarness.deliveryEventProvider.findByCallbackKey(
            `external-reply:${memberRunId}:${turnId}`,
          ),
        (event) => event?.status === ExternalDeliveryStatus.PENDING,
      );
      expect(pendingEvent?.status).toBe(ExternalDeliveryStatus.PENDING);

      await callbackHarness.dispatchQueuedCallbacks();

      const queuedAfterDispatch = await waitForValue(
        () => callbackHarness.listQueuedCallbacks(),
        (rows) => rows.length === 1 && rows[0]?.status === "SENT",
      );
      expect(queuedAfterDispatch).toHaveLength(1);
      expect(queuedAfterDispatch[0]).toMatchObject({
        callbackIdempotencyKey: `external-reply:${memberRunId}:${turnId}`,
        status: "SENT",
      });
      await waitForValue(
        async () => callbackHarness.callbackRequests.length,
        (count) => count === 1,
      );
      expect(callbackHarness.callbackRequests).toHaveLength(1);
      expect(callbackHarness.callbackRequests[0]).toMatchObject({
        provider: ExternalChannelProvider.TELEGRAM,
        transport: ExternalChannelTransport.BUSINESS_API,
        accountId,
        peerId,
        threadId: null,
        correlationMessageId: externalMessageId,
        replyText: "Coordinator reply to Telegram",
      });

      const deliveryEvent = await waitForValue(
        () =>
          callbackHarness.deliveryEventProvider.findByCallbackKey(
            `external-reply:${memberRunId}:${turnId}`,
          ),
        (event) => event?.status === ExternalDeliveryStatus.SENT,
      );
      expect(deliveryEvent).toMatchObject({
        provider: ExternalChannelProvider.TELEGRAM,
        transport: ExternalChannelTransport.BUSINESS_API,
        accountId,
        peerId,
        threadId: null,
        correlationMessageId: externalMessageId,
        status: ExternalDeliveryStatus.SENT,
      });
    } finally {
      await app.close();
      await callbackHarness.close();
    }
  });

  it("calls the gateway callback API for later TEAM coordinator replies linked to the original Telegram source", async () => {
    const accountId = unique("telegram-followup-acct");
    const peerId = unique("telegram-followup-peer");
    const teamDefinitionId = unique("team-definition");
    const teamRunId = unique("team-followup-run");
    const memberRunId = unique("member-coordinator");
    const initialTurnId = unique("turn-coordinator");
    const followUpTurnId = unique("turn-coordinator-follow-up");
    const externalMessageId = unique("telegram-followup-msg");

    const bindingService = new ChannelBindingService(new SqlChannelBindingProvider());
    await bindingService.upsertBinding({
      provider: ExternalChannelProvider.TELEGRAM,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: null,
      targetType: "TEAM",
      agentDefinitionId: null,
      launchPreset: null,
      agentRunId: null,
      teamDefinitionId,
      teamLaunchPreset: createTeamLaunchPreset(),
      teamRunId: null,
      targetNodeName: null,
      allowTransportFallback: false,
    });

    const callbackHarness = await createDefinitionBoundTeamRuntimeFacadeWithCallbackHarness(
      bindingService,
      {
        getTeamRunResumeConfig: vi.fn(async (requestedTeamRunId: string) => ({
          teamRunId: requestedTeamRunId,
          manifest: { teamRunId: requestedTeamRunId },
          isActive: true,
        })),
        ensureTeamRunId: teamRunId,
        dispatchedTurn: {
          memberName: "Coordinator",
          memberRunId,
          runtimeKind: "codex_app_server",
          turnId: initialTurnId,
        },
      },
    );

    const ingressService = new ChannelIngressService({
      idempotencyService: new ChannelIdempotencyService(
        new SqlChannelIdempotencyProvider(),
      ),
      bindingService,
      threadLockService: new ChannelThreadLockService(),
      runtimeFacade: callbackHarness.runtimeFacade,
      messageReceiptService: callbackHarness.messageReceiptService,
    });

    const app = fastify();
    await registerChannelIngressRoutes(app, {
      ingressService,
      deliveryEventService: new DeliveryEventService(
        new SqlDeliveryEventProvider(),
      ),
    });

    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/channel-ingress/v1/messages",
        payload: {
          provider: ExternalChannelProvider.TELEGRAM,
          transport: ExternalChannelTransport.BUSINESS_API,
          accountId,
          peerId,
          peerType: ExternalPeerType.USER,
          threadId: null,
          externalMessageId,
          content: "did you get the answer?",
          attachments: [],
          receivedAt: "2026-03-11T12:16:00.000Z",
          metadata: { source: "team-follow-up-integration" },
        },
      });

      expect(response.statusCode).toBe(202);
      expect(response.json()).toMatchObject({
        accepted: true,
        duplicate: false,
        disposition: "ROUTED",
        bindingResolved: true,
      });

      const source = await waitForValue(
        () =>
          callbackHarness.messageReceiptService.getSourceByAgentRunTurn(
            memberRunId,
            initialTurnId,
          ),
        (value) => value !== null,
      );
      expect(source).toMatchObject({
        provider: ExternalChannelProvider.TELEGRAM,
        transport: ExternalChannelTransport.BUSINESS_API,
        accountId,
        peerId,
        threadId: null,
        externalMessageId,
      });

      await callbackHarness.bindAcceptedTurnToSource({
        runId: memberRunId,
        runtimeKind: "codex_app_server",
        turnId: followUpTurnId,
        teamRunId,
        source: source!,
      });
      await callbackHarness.emitRuntimeReply(
        "Yes — I received the Student's answer, and it is correct.",
        followUpTurnId,
      );

      const queuedBeforeDispatch = await waitForValue(
        () => callbackHarness.listQueuedCallbacks(),
        (rows) =>
          rows.length === 1 &&
          rows[0]?.callbackIdempotencyKey === `external-reply:${memberRunId}:${followUpTurnId}`,
      );
      expect(queuedBeforeDispatch[0]).toMatchObject({
        callbackIdempotencyKey: `external-reply:${memberRunId}:${followUpTurnId}`,
        status: "PENDING",
      });

      await callbackHarness.dispatchQueuedCallbacks();

      await waitForValue(
        async () => callbackHarness.callbackRequests.length,
        (count) => count === 1,
      );
      expect(callbackHarness.callbackRequests).toHaveLength(1);
      expect(callbackHarness.callbackRequests[0]).toMatchObject({
        provider: ExternalChannelProvider.TELEGRAM,
        transport: ExternalChannelTransport.BUSINESS_API,
        accountId,
        peerId,
        threadId: null,
        correlationMessageId: externalMessageId,
        replyText: "Yes — I received the Student's answer, and it is correct.",
      });
    } finally {
      await app.close();
      await callbackHarness.close();
    }
  });

  it("calls the gateway callback API for AGENT replies after fake Telegram ingress", async () => {
    const accountId = unique("telegram-agent-callback-acct");
    const peerId = unique("telegram-agent-callback-peer");
    const agentRunId = unique("agent-callback-run");
    const turnId = unique("agent-turn");
    const externalMessageId = unique("telegram-agent-callback-msg");

    const callbackHarness = await createAgentRuntimeFacadeWithCallbackHarness({
      agentRunId,
      dispatchedTurn: {
        runtimeKind: "codex_app_server",
        turnId,
      },
    });

    await callbackHarness.bindingService.upsertBinding({
      provider: ExternalChannelProvider.TELEGRAM,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: null,
      targetType: "AGENT",
      agentDefinitionId: null,
      launchPreset: null,
      agentRunId,
      teamDefinitionId: null,
      teamLaunchPreset: null,
      teamRunId: null,
      targetNodeName: null,
      allowTransportFallback: false,
    });

    const ingressService = new ChannelIngressService({
      idempotencyService: new ChannelIdempotencyService(
        new SqlChannelIdempotencyProvider(),
      ),
      bindingService: callbackHarness.bindingService,
      threadLockService: new ChannelThreadLockService(),
      runtimeFacade: callbackHarness.runtimeFacade,
      messageReceiptService: callbackHarness.messageReceiptService,
    });

    const app = fastify();
    await registerChannelIngressRoutes(app, {
      ingressService,
      deliveryEventService: new DeliveryEventService(
        new SqlDeliveryEventProvider(),
      ),
    });

    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/channel-ingress/v1/messages",
        payload: {
          provider: ExternalChannelProvider.TELEGRAM,
          transport: ExternalChannelTransport.BUSINESS_API,
          accountId,
          peerId,
          peerType: ExternalPeerType.USER,
          threadId: null,
          externalMessageId,
          content: "send agent callback to telegram",
          attachments: [],
          receivedAt: "2026-03-11T10:30:00.000Z",
          metadata: { source: "agent-callback-integration" },
        },
      });

      expect(response.statusCode).toBe(202);
      expect(response.json()).toMatchObject({
        accepted: true,
        duplicate: false,
        disposition: "ROUTED",
        bindingResolved: true,
      });

      expect(callbackHarness.resolveOrStartAgentRun).toHaveBeenCalledOnce();
      expect(callbackHarness.sendTurn).toHaveBeenCalledOnce();

      await callbackHarness.emitRuntimeReply("Agent reply to Telegram");
      const source = await callbackHarness.messageReceiptService.getSourceByAgentRunTurn(
        agentRunId,
        turnId,
      );
      expect(source).toMatchObject({
        provider: ExternalChannelProvider.TELEGRAM,
        transport: ExternalChannelTransport.BUSINESS_API,
        accountId,
        peerId,
        threadId: null,
        externalMessageId,
      });

      const queuedBeforeDispatch = await waitForValue(
        () => callbackHarness.listQueuedCallbacks(),
        (rows) => rows.length === 1,
      );
      expect(queuedBeforeDispatch).toHaveLength(1);
      expect(queuedBeforeDispatch[0]).toMatchObject({
        callbackIdempotencyKey: `external-reply:${agentRunId}:${turnId}`,
        status: "PENDING",
      });

      const pendingEvent = await waitForValue(
        () =>
          callbackHarness.deliveryEventProvider.findByCallbackKey(
            `external-reply:${agentRunId}:${turnId}`,
          ),
        (event) => event?.status === ExternalDeliveryStatus.PENDING,
      );
      expect(pendingEvent?.status).toBe(ExternalDeliveryStatus.PENDING);

      await callbackHarness.dispatchQueuedCallbacks();

      const queuedAfterDispatch = await waitForValue(
        () => callbackHarness.listQueuedCallbacks(),
        (rows) => rows.length === 1 && rows[0]?.status === "SENT",
      );
      expect(queuedAfterDispatch).toHaveLength(1);
      expect(queuedAfterDispatch[0]).toMatchObject({
        callbackIdempotencyKey: `external-reply:${agentRunId}:${turnId}`,
        status: "SENT",
      });

      await waitForValue(
        async () => callbackHarness.callbackRequests.length,
        (count) => count === 1,
      );
      expect(callbackHarness.callbackRequests).toHaveLength(1);
      expect(callbackHarness.callbackRequests[0]).toMatchObject({
        provider: ExternalChannelProvider.TELEGRAM,
        transport: ExternalChannelTransport.BUSINESS_API,
        accountId,
        peerId,
        threadId: null,
        correlationMessageId: externalMessageId,
        replyText: "Agent reply to Telegram",
      });

      const deliveryEvent = await waitForValue(
        () =>
          callbackHarness.deliveryEventProvider.findByCallbackKey(
            `external-reply:${agentRunId}:${turnId}`,
          ),
        (event) => event?.status === ExternalDeliveryStatus.SENT,
      );
      expect(deliveryEvent).toMatchObject({
        provider: ExternalChannelProvider.TELEGRAM,
        transport: ExternalChannelTransport.BUSINESS_API,
        accountId,
        peerId,
        threadId: null,
        correlationMessageId: externalMessageId,
        status: ExternalDeliveryStatus.SENT,
      });
    } finally {
      await app.close();
      await callbackHarness.close();
    }
  });

  it("creates a team run on first Telegram ingress, recreates it after shutdown, and routes the follow-up message to the fresh run", async () => {
    const accountId = unique("telegram-recreate-acct");
    const peerId = unique("telegram-recreate-peer");
    const teamDefinitionId = unique("team-definition");
    const firstTeamRunId = unique("team-run-first");
    const secondTeamRunId = unique("team-run-second");

    const bindingService = new ChannelBindingService(new SqlChannelBindingProvider());
    await bindingService.upsertBinding({
      provider: ExternalChannelProvider.TELEGRAM,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: null,
      targetType: "TEAM",
      agentDefinitionId: null,
      launchPreset: null,
      agentRunId: null,
      teamDefinitionId,
      teamLaunchPreset: createTeamLaunchPreset(),
      teamRunId: null,
      targetNodeName: null,
      allowTransportFallback: false,
    });

    let activeTeamRunId: string | null = null;
    const messageReceiptService = new ChannelMessageReceiptService(
      new SqlChannelMessageReceiptProvider(),
    );
    const getTeamRunResumeConfig = vi.fn(async (requestedTeamRunId: string) => ({
      teamRunId: requestedTeamRunId,
      manifest: { teamRunId: requestedTeamRunId },
      isActive: requestedTeamRunId === activeTeamRunId,
    }));
    const {
      runtimeFacade,
      bindingRunRegistry,
      buildMemberConfigsFromLaunchPreset,
      ensureTeamRun,
      continueTeamRunWithMessage,
      bindAcceptedExternalTurn,
    } = createDefinitionBoundTeamRuntimeFacade(bindingService, {
      getTeamRunResumeConfig,
      ensureTeamRunId: firstTeamRunId,
      dispatchedTurn: {
        memberName: "Coordinator",
        memberRunId: "member-coordinator-first",
        runtimeKind: "codex_app_server",
        turnId: "turn-coordinator-first",
      },
    });
    ensureTeamRun.mockReset();
    ensureTeamRun
      .mockResolvedValueOnce({ teamRunId: firstTeamRunId })
      .mockResolvedValueOnce({ teamRunId: secondTeamRunId });
    continueTeamRunWithMessage.mockReset();
    continueTeamRunWithMessage.mockImplementation(async ({ teamRunId }) => ({
      teamRunId,
      restored: false,
      targetMemberName: "Coordinator",
      dispatchedTurn:
        teamRunId === firstTeamRunId
          ? {
              memberName: "Coordinator",
              memberRunId: "member-coordinator-first",
              runtimeKind: "codex_app_server",
              turnId: "turn-coordinator-first",
            }
          : {
              memberName: "Coordinator",
              memberRunId: "member-coordinator-second",
              runtimeKind: "codex_app_server",
              turnId: "turn-coordinator-second",
            },
    }));

    const ingressService = new ChannelIngressService({
      idempotencyService: new ChannelIdempotencyService(
        new SqlChannelIdempotencyProvider(),
      ),
      bindingService,
      threadLockService: new ChannelThreadLockService(),
      runtimeFacade,
      messageReceiptService,
    });

    const app = fastify();
    await registerChannelIngressRoutes(app, {
      ingressService,
      deliveryEventService: new DeliveryEventService(
        new SqlDeliveryEventProvider(),
      ),
    });

    const basePayload = {
      provider: ExternalChannelProvider.TELEGRAM,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      peerType: ExternalPeerType.USER,
      threadId: null,
      attachments: [],
      metadata: { source: "team-ingress-integration" },
    };

    const first = await app.inject({
      method: "POST",
      url: "/api/channel-ingress/v1/messages",
      payload: {
        ...basePayload,
        externalMessageId: unique("telegram-team-recreate-msg-1"),
        content: "first team message",
        receivedAt: "2026-03-10T09:12:00.000Z",
      },
    });
    expect(first.statusCode).toBe(202);
    activeTeamRunId = firstTeamRunId;

    const afterFirst = await bindingService.resolveBinding({
      provider: ExternalChannelProvider.TELEGRAM,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: null,
    });
    expect(afterFirst?.binding.teamRunId).toBe(firstTeamRunId);
    expect(bindingRunRegistry.ownsTeamRun(afterFirst?.binding.id ?? "", firstTeamRunId)).toBe(true);

    // Simulate the bound team shutting down while preserving the cached teamRunId on the binding.
    activeTeamRunId = null;

    const secondExternalMessageId = unique("telegram-team-recreate-msg-2");
    const second = await app.inject({
      method: "POST",
      url: "/api/channel-ingress/v1/messages",
      payload: {
        ...basePayload,
        externalMessageId: secondExternalMessageId,
        content: "message after shutdown",
        receivedAt: "2026-03-10T09:13:00.000Z",
      },
    });
    expect(second.statusCode).toBe(202);

    const resolved = await bindingService.resolveBinding({
      provider: ExternalChannelProvider.TELEGRAM,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: null,
    });
    expect(resolved?.binding.teamRunId).toBe(secondTeamRunId);
    expect(bindingRunRegistry.ownsTeamRun(resolved?.binding.id ?? "", secondTeamRunId)).toBe(true);
    expect(buildMemberConfigsFromLaunchPreset).toHaveBeenCalledTimes(2);
    expect(ensureTeamRun).toHaveBeenCalledTimes(2);
    expect(getTeamRunResumeConfig).toHaveBeenCalledTimes(1);
    expect(getTeamRunResumeConfig).toHaveBeenCalledWith(firstTeamRunId);
    expect(continueTeamRunWithMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        teamRunId: firstTeamRunId,
        targetMemberRouteKey: null,
      }),
    );
    expect(continueTeamRunWithMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        teamRunId: secondTeamRunId,
        targetMemberRouteKey: null,
      }),
    );
    expect(bindAcceptedExternalTurn).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        runId: "member-coordinator-first",
        turnId: "turn-coordinator-first",
      }),
    );
    expect(bindAcceptedExternalTurn).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        runId: "member-coordinator-second",
        turnId: "turn-coordinator-second",
      }),
    );

    const latestSource = await messageReceiptService.getLatestSourceByDispatchTarget({
      agentRunId: null,
      teamRunId: secondTeamRunId,
    });
    expect(latestSource).toMatchObject({
      provider: ExternalChannelProvider.TELEGRAM,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: null,
      externalMessageId: secondExternalMessageId,
    });

    await app.close();
  });

  it("creates a fresh team run during Telegram ingress when the cached team run is inactive after restart", async () => {
    const accountId = unique("telegram-inactive-acct");
    const peerId = unique("telegram-inactive-peer");
    const inactiveTeamRunId = unique("team-run-inactive");
    const freshTeamRunId = unique("team-run-fresh-after-restart");
    const teamDefinitionId = unique("team-definition");

    const bindingService = new ChannelBindingService(new SqlChannelBindingProvider());
    await bindingService.upsertBinding({
      provider: ExternalChannelProvider.TELEGRAM,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: null,
      targetType: "TEAM",
      agentDefinitionId: null,
      launchPreset: null,
      agentRunId: null,
      teamDefinitionId,
      teamLaunchPreset: createTeamLaunchPreset(),
      teamRunId: inactiveTeamRunId,
      targetNodeName: null,
      allowTransportFallback: false,
    });

    const messageReceiptService = new ChannelMessageReceiptService(
      new SqlChannelMessageReceiptProvider(),
    );
    const getTeamRunResumeConfig = vi.fn(async (requestedTeamRunId: string) => {
      if (requestedTeamRunId === inactiveTeamRunId) {
        return {
          teamRunId: inactiveTeamRunId,
          manifest: { teamRunId: inactiveTeamRunId },
          isActive: false,
        };
      }
      throw new Error(`Unknown team run '${requestedTeamRunId}'.`);
    });
    const {
      runtimeFacade,
      bindingRunRegistry,
      buildMemberConfigsFromLaunchPreset,
      ensureTeamRun,
      continueTeamRunWithMessage,
    } = createDefinitionBoundTeamRuntimeFacade(bindingService, {
      getTeamRunResumeConfig,
      ensureTeamRunId: freshTeamRunId,
      dispatchedTurn: {
        memberName: "Coordinator",
        memberRunId: "member-coordinator-inactive",
        runtimeKind: "codex_app_server",
        turnId: "turn-coordinator-inactive",
      },
    });
    const ingressService = new ChannelIngressService({
      idempotencyService: new ChannelIdempotencyService(
        new SqlChannelIdempotencyProvider(),
      ),
      bindingService,
      threadLockService: new ChannelThreadLockService(),
      runtimeFacade,
      messageReceiptService,
    });

    const app = fastify();
    await registerChannelIngressRoutes(app, {
      ingressService,
      deliveryEventService: new DeliveryEventService(
        new SqlDeliveryEventProvider(),
      ),
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/channel-ingress/v1/messages",
      payload: {
        provider: ExternalChannelProvider.TELEGRAM,
        transport: ExternalChannelTransport.BUSINESS_API,
        accountId,
        peerId,
        peerType: ExternalPeerType.USER,
        threadId: null,
        externalMessageId: unique("telegram-team-inactive-msg"),
        content: "start a fresh run after restart",
        attachments: [],
        receivedAt: "2026-03-10T09:15:00.000Z",
        metadata: { source: "team-ingress-integration" },
      },
    });

    expect(response.statusCode).toBe(202);
    const resolved = await bindingService.resolveBinding({
      provider: ExternalChannelProvider.TELEGRAM,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: null,
    });
    expect(resolved?.binding.teamRunId).toBe(freshTeamRunId);
    expect(bindingRunRegistry.ownsTeamRun(resolved?.binding.id ?? "", freshTeamRunId)).toBe(true);
    expect(getTeamRunResumeConfig).not.toHaveBeenCalled();
    expect(buildMemberConfigsFromLaunchPreset).toHaveBeenCalledTimes(1);
    expect(ensureTeamRun).toHaveBeenCalledTimes(1);
    expect(continueTeamRunWithMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        teamRunId: freshTeamRunId,
        targetMemberRouteKey: null,
      }),
    );

    await app.close();
  });

  it("creates a fresh team run during Telegram ingress when a history-reopened cached run is active but not bot-owned", async () => {
    const accountId = unique("telegram-active-unowned-acct");
    const peerId = unique("telegram-active-unowned-peer");
    const reopenedTeamRunId = unique("team-run-reopened");
    const freshTeamRunId = unique("team-run-fresh-after-hijack-guard");
    const teamDefinitionId = unique("team-definition");

    const bindingService = new ChannelBindingService(new SqlChannelBindingProvider());
    await bindingService.upsertBinding({
      provider: ExternalChannelProvider.TELEGRAM,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: null,
      targetType: "TEAM",
      agentDefinitionId: null,
      launchPreset: null,
      agentRunId: null,
      teamDefinitionId,
      teamLaunchPreset: createTeamLaunchPreset(),
      teamRunId: reopenedTeamRunId,
      targetNodeName: null,
      allowTransportFallback: false,
    });

    const messageReceiptService = new ChannelMessageReceiptService(
      new SqlChannelMessageReceiptProvider(),
    );
    const getTeamRunResumeConfig = vi.fn().mockResolvedValue({
      teamRunId: reopenedTeamRunId,
      manifest: { teamRunId: reopenedTeamRunId },
      isActive: true,
    });
    const {
      runtimeFacade,
      bindingRunRegistry,
      buildMemberConfigsFromLaunchPreset,
      ensureTeamRun,
      continueTeamRunWithMessage,
    } = createDefinitionBoundTeamRuntimeFacade(bindingService, {
      getTeamRunResumeConfig,
      ensureTeamRunId: freshTeamRunId,
      dispatchedTurn: {
        memberName: "Coordinator",
        memberRunId: "member-coordinator-active-unowned",
        runtimeKind: "codex_app_server",
        turnId: "turn-coordinator-active-unowned",
      },
    });
    const ingressService = new ChannelIngressService({
      idempotencyService: new ChannelIdempotencyService(
        new SqlChannelIdempotencyProvider(),
      ),
      bindingService,
      threadLockService: new ChannelThreadLockService(),
      runtimeFacade,
      messageReceiptService,
    });

    const app = fastify();
    await registerChannelIngressRoutes(app, {
      ingressService,
      deliveryEventService: new DeliveryEventService(
        new SqlDeliveryEventProvider(),
      ),
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/channel-ingress/v1/messages",
      payload: {
        provider: ExternalChannelProvider.TELEGRAM,
        transport: ExternalChannelTransport.BUSINESS_API,
        accountId,
        peerId,
        peerType: ExternalPeerType.USER,
        threadId: null,
        externalMessageId: unique("telegram-team-active-unowned-msg"),
        content: "fresh run even if old run was reopened in the UI",
        attachments: [],
        receivedAt: "2026-03-10T09:18:00.000Z",
        metadata: { source: "team-ingress-integration" },
      },
    });

    expect(response.statusCode).toBe(202);
    const resolved = await bindingService.resolveBinding({
      provider: ExternalChannelProvider.TELEGRAM,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: null,
    });
    expect(resolved?.binding.teamRunId).toBe(freshTeamRunId);
    expect(bindingRunRegistry.ownsTeamRun(resolved?.binding.id ?? "", freshTeamRunId)).toBe(true);
    expect(getTeamRunResumeConfig).not.toHaveBeenCalled();
    expect(buildMemberConfigsFromLaunchPreset).toHaveBeenCalledTimes(1);
    expect(ensureTeamRun).toHaveBeenCalledTimes(1);
    expect(continueTeamRunWithMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        teamRunId: freshTeamRunId,
      }),
    );

    await app.close();
  });

  it("replaces a stale cached team run during Telegram ingress and persists the fresh teamRunId", async () => {
    const accountId = unique("telegram-stale-acct");
    const peerId = unique("telegram-stale-peer");
    const staleTeamRunId = unique("team-run-stale");
    const freshTeamRunId = unique("team-run-fresh");

    const bindingService = new ChannelBindingService(new SqlChannelBindingProvider());
    await bindingService.upsertBinding({
      provider: ExternalChannelProvider.TELEGRAM,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: null,
      targetType: "TEAM",
      agentDefinitionId: null,
      launchPreset: null,
      agentRunId: null,
      teamDefinitionId: unique("team-definition"),
      teamLaunchPreset: createTeamLaunchPreset(),
      teamRunId: staleTeamRunId,
      targetNodeName: null,
      allowTransportFallback: false,
    });

    const messageReceiptService = new ChannelMessageReceiptService(
      new SqlChannelMessageReceiptProvider(),
    );
    const getTeamRunResumeConfig = vi.fn(async (requestedTeamRunId: string) => {
      if (requestedTeamRunId === freshTeamRunId) {
        return {
          teamRunId: freshTeamRunId,
          manifest: { teamRunId: freshTeamRunId },
        };
      }
      throw new Error(`Unknown team run '${requestedTeamRunId}'.`);
    });
    const {
      runtimeFacade,
      bindingRunRegistry,
      buildMemberConfigsFromLaunchPreset,
      ensureTeamRun,
      continueTeamRunWithMessage,
      bindAcceptedExternalTurn,
    } = createDefinitionBoundTeamRuntimeFacade(bindingService, {
      getTeamRunResumeConfig,
      ensureTeamRunId: freshTeamRunId,
      dispatchedTurn: {
        memberName: "Coordinator",
        memberRunId: "member-coordinator-2",
        runtimeKind: "claude_agent_sdk",
        turnId: "turn-coordinator-2",
      },
    });
    const existing = await bindingService.resolveBinding({
      provider: ExternalChannelProvider.TELEGRAM,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: null,
    });
    bindingRunRegistry.claimTeamRun(existing?.binding.id ?? "", staleTeamRunId);
    const ingressService = new ChannelIngressService({
      idempotencyService: new ChannelIdempotencyService(
        new SqlChannelIdempotencyProvider(),
      ),
      bindingService,
      threadLockService: new ChannelThreadLockService(),
      runtimeFacade,
      messageReceiptService,
    });

    const app = fastify();
    await registerChannelIngressRoutes(app, {
      ingressService,
      deliveryEventService: new DeliveryEventService(
        new SqlDeliveryEventProvider(),
      ),
    });

    const externalMessageId = unique("telegram-team-stale-msg");
    const response = await app.inject({
      method: "POST",
      url: "/api/channel-ingress/v1/messages",
      payload: {
        provider: ExternalChannelProvider.TELEGRAM,
        transport: ExternalChannelTransport.BUSINESS_API,
        accountId,
        peerId,
        peerType: ExternalPeerType.USER,
        threadId: null,
        externalMessageId,
        content: "recover stale team binding",
        attachments: [],
        receivedAt: "2026-03-10T09:30:00.000Z",
        metadata: { source: "team-ingress-integration" },
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

    const resolved = await bindingService.resolveBinding({
      provider: ExternalChannelProvider.TELEGRAM,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: null,
    });
    expect(resolved?.binding.teamRunId).toBe(freshTeamRunId);
    expect(getTeamRunResumeConfig).toHaveBeenCalledWith(staleTeamRunId);
    expect(buildMemberConfigsFromLaunchPreset).toHaveBeenCalledTimes(1);
    expect(ensureTeamRun).toHaveBeenCalledTimes(1);
    expect(continueTeamRunWithMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        teamRunId: freshTeamRunId,
      }),
    );
    expect(bindAcceptedExternalTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: "member-coordinator-2",
        runtimeKind: "claude_agent_sdk",
        turnId: "turn-coordinator-2",
      }),
    );

    const latestSource = await messageReceiptService.getLatestSourceByDispatchTarget({
      agentRunId: null,
      teamRunId: freshTeamRunId,
    });
    expect(latestSource).toMatchObject({
      provider: ExternalChannelProvider.TELEGRAM,
      transport: ExternalChannelTransport.BUSINESS_API,
      accountId,
      peerId,
      threadId: null,
      externalMessageId,
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
      targetNodeName: null,
      allowTransportFallback: false,
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

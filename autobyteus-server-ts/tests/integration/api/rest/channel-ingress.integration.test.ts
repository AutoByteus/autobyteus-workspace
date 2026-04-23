import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExternalChannelProvider } from "autobyteus-ts/external-channel/provider.js";
import { ExternalChannelTransport } from "autobyteus-ts/external-channel/channel-transport.js";
import { ExternalPeerType } from "autobyteus-ts/external-channel/peer-type.js";
import { createChannelRoutingKey } from "autobyteus-ts/external-channel/channel-routing-key.js";
import type { AgentRunBackend } from "../../../../src/agent-execution/backends/agent-run-backend.js";
import type { AgentRunBackendFactory } from "../../../../src/agent-execution/backends/agent-run-backend-factory.js";
import { AgentRunConfig } from "../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRunEventType } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { AgentRunManager } from "../../../../src/agent-execution/services/agent-run-manager.js";
import { AgentTeamDefinition, TeamMember } from "../../../../src/agent-team-definition/domain/models.js";
import type { TeamRunBackend } from "../../../../src/agent-team-execution/backends/team-run-backend.js";
import type { TeamRunBackendFactory } from "../../../../src/agent-team-execution/backends/team-run-backend-factory.js";
import type { TeamRunConfig } from "../../../../src/agent-team-execution/domain/team-run-config.js";
import { AgentTeamRunManager } from "../../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { TeamRunService } from "../../../../src/agent-team-execution/services/team-run-service.js";
import { registerChannelIngressRoutes } from "../../../../src/api/rest/channel-ingress.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { FileChannelBindingProvider } from "../../../../src/external-channel/providers/file-channel-binding-provider.js";
import { FileChannelMessageReceiptProvider } from "../../../../src/external-channel/providers/file-channel-message-receipt-provider.js";
import { ChannelBindingRunLauncher } from "../../../../src/external-channel/runtime/channel-binding-run-launcher.js";
import { ChannelAgentRunFacade } from "../../../../src/external-channel/runtime/channel-agent-run-facade.js";
import { ChannelAgentRunReplyBridge } from "../../../../src/external-channel/runtime/channel-agent-run-reply-bridge.js";
import { ChannelTeamRunFacade } from "../../../../src/external-channel/runtime/channel-team-run-facade.js";
import { ChannelTeamRunReplyBridge } from "../../../../src/external-channel/runtime/channel-team-run-reply-bridge.js";
import { ReceiptWorkflowRuntime } from "../../../../src/external-channel/runtime/receipt-workflow-runtime.js";
import { ChannelBindingService } from "../../../../src/external-channel/services/channel-binding-service.js";
import { ChannelIngressService } from "../../../../src/external-channel/services/channel-ingress-service.js";
import { ChannelMessageReceiptService } from "../../../../src/external-channel/services/channel-message-receipt-service.js";
import { ChannelThreadLockService } from "../../../../src/external-channel/services/channel-thread-lock-service.js";
import type { ChannelBinding } from "../../../../src/external-channel/domain/models.js";
import type { ChannelRunDispatchResult } from "../../../../src/external-channel/runtime/channel-run-dispatch-result.js";
import { AgentRunHistoryIndexService } from "../../../../src/run-history/services/agent-run-history-index-service.js";
import { AgentRunMetadataService } from "../../../../src/run-history/services/agent-run-metadata-service.js";
import { AgentRunService } from "../../../../src/agent-execution/services/agent-run-service.js";
import { TeamRunHistoryIndexService } from "../../../../src/run-history/services/team-run-history-index-service.js";
import { TeamRunMetadataService } from "../../../../src/run-history/services/team-run-metadata-service.js";
import {
  buildTeamMemberRunId,
  normalizeMemberRouteKey,
} from "../../../../src/run-history/utils/team-member-run-id.js";

const tempPaths = new Set<string>();

const trackTempPath = (targetPath: string): string => {
  tempPaths.add(targetPath);
  return targetPath;
};

const createTempDir = async (prefix: string): Promise<string> => {
  const dir = await mkdtemp(path.join(os.tmpdir(), `${prefix}-`));
  return trackTempPath(dir);
};

const createTempFilePath = (prefix: string): string =>
  trackTempPath(path.join(os.tmpdir(), `${prefix}-${randomUUID()}.json`));

const readJson = async <T>(filePath: string): Promise<T> =>
  JSON.parse(await readFile(filePath, "utf-8")) as T;

afterEach(async () => {
  await Promise.all(
    [...tempPaths].map((targetPath) =>
      rm(targetPath, { force: true, recursive: true }),
    ),
  );
  tempPaths.clear();
  vi.clearAllMocks();
  vi.useRealTimers();
});

const createEnvelope = (overrides: Partial<Record<string, unknown>> = {}) => ({
  provider: ExternalChannelProvider.WHATSAPP,
  transport: ExternalChannelTransport.BUSINESS_API,
  accountId: "acct-1",
  peerId: "peer-1",
  peerType: ExternalPeerType.USER,
  threadId: "thread-1",
  externalMessageId: "msg-1",
  content: "hello",
  attachments: [],
  receivedAt: "2026-03-27T07:00:00.000Z",
  metadata: { source: "integration-test" },
  routingKey: createChannelRoutingKey({
    provider: ExternalChannelProvider.WHATSAPP,
    transport: ExternalChannelTransport.BUSINESS_API,
    accountId: "acct-1",
    peerId: "peer-1",
    threadId: "thread-1",
  }),
  ...overrides,
});

const createAgentBindingInput = (workspaceRootPath = "/tmp/workspace") => ({
  provider: ExternalChannelProvider.WHATSAPP,
  transport: ExternalChannelTransport.BUSINESS_API,
  accountId: "acct-1",
  peerId: "peer-1",
  threadId: "thread-1",
  targetType: "AGENT" as const,
  agentDefinitionId: "agent-def-1",
  launchPreset: {
    workspaceRootPath,
    llmModelIdentifier: "gpt-test",
    runtimeKind: RuntimeKind.AUTOBYTEUS,
    autoExecuteTools: false,
    skillAccessMode: "PREFERRED" as const,
    llmConfig: null,
  },
  agentRunId: "agent-run-1",
});

const createTeamBindingInput = (workspaceRootPath = "/tmp/workspace") => ({
  provider: ExternalChannelProvider.WHATSAPP,
  transport: ExternalChannelTransport.BUSINESS_API,
  accountId: "acct-1",
  peerId: "peer-1",
  threadId: "thread-1",
  targetType: "TEAM" as const,
  teamDefinitionId: "team-def-1",
  teamLaunchPreset: {
    workspaceRootPath,
    llmModelIdentifier: "gpt-test",
    runtimeKind: RuntimeKind.AUTOBYTEUS,
    autoExecuteTools: false,
    skillAccessMode: "PREFERRED" as const,
    llmConfig: null,
  },
  teamRunId: "team-run-1",
  targetNodeName: "Coordinator",
});

const createWorkspaceManager = () => {
  const workspaceRootsById = new Map<string, string>();

  return {
    ensureWorkspaceByRootPath: vi.fn(async (workspaceRootPath: string) => {
      const workspaceId = `workspace:${workspaceRootPath}`;
      workspaceRootsById.set(workspaceId, workspaceRootPath);
      return {
        workspaceId,
        getBasePath: () => workspaceRootPath,
      };
    }),
    getWorkspaceById: vi.fn((workspaceId: string) => {
      const workspaceRootPath = workspaceRootsById.get(workspaceId) ?? null;
      if (!workspaceRootPath) {
        return null;
      }
      return {
        getBasePath: () => workspaceRootPath,
      };
    }),
  };
};

const createUnusedTeamRunService = () =>
  ({
    getTeamRun: vi.fn(),
    restoreTeamRun: vi.fn(),
    buildMemberConfigsFromLaunchPreset: vi.fn(),
    createTeamRun: vi.fn(),
  }) as never;

const createUnusedAgentDeps = () => ({
  agentRunManager: {
    getActiveRun: vi.fn(),
    createAgentRun: vi.fn(),
    restoreAgentRun: vi.fn(),
  } as never,
  agentRunService: {
    restoreAgentRun: vi.fn(),
  } as never,
  agentRunMetadataService: {
    writeMetadata: vi.fn(),
    readMetadata: vi.fn(),
  } as never,
  agentRunHistoryIndexService: {
    recordRunCreated: vi.fn(),
    recordRunRestored: vi.fn(),
    recordRunActivity: vi.fn(),
    recordRunTerminated: vi.fn(),
  } as never,
});

type ScheduledRuntimeEvent = {
  delayMs: number | null;
  event: Record<string, unknown>;
};

const createTeamTurnRuntimeEvent = (input: {
  teamRunId: string;
  memberName: string;
  memberRunId: string;
  turnId: string;
  eventType: AgentRunEventType.TURN_STARTED | AgentRunEventType.TURN_COMPLETED;
  statusHint: "ACTIVE" | "IDLE";
}) => ({
  eventSourceType: "AGENT",
  teamRunId: input.teamRunId,
  data: {
    runtimeKind: RuntimeKind.AUTOBYTEUS,
    memberName: input.memberName,
    memberRunId: input.memberRunId,
    agentEvent: {
      eventType: input.eventType,
      runId: input.memberRunId,
      payload: {
        turnId: input.turnId,
      },
      statusHint: input.statusHint,
    },
  },
  subTeamNodeName: null,
});

const createAgentBackendFactory = (input: {
  memoryDir: string;
  runId: string;
  runtimeEvents?: ScheduledRuntimeEvent[];
  runtimeEventsPerPost?: ScheduledRuntimeEvent[][];
}): {
  factory: AgentRunBackendFactory;
  postUserMessage: ReturnType<typeof vi.fn>;
} => {
  const listeners = new Set<(event: unknown) => void>();
  const emitRuntimeEvent = (event: unknown) => {
    for (const listener of listeners) {
      listener(event);
    }
  };
  const activeStatesByRunId = new Map<string, { active: boolean }>();
  let postInvocationCount = 0;
  const postUserMessage = vi.fn().mockImplementation(async () => {
    const runtimeEvents =
      input.runtimeEventsPerPost?.[postInvocationCount] ?? input.runtimeEvents ?? [];
    postInvocationCount += 1;
    for (const runtimeEvent of runtimeEvents) {
      if (runtimeEvent.delayMs === null) {
        emitRuntimeEvent(runtimeEvent.event);
        continue;
      }
      const timer = setTimeout(() => {
        emitRuntimeEvent(runtimeEvent.event);
      }, runtimeEvent.delayMs);
      if (typeof (timer as { unref?: () => void }).unref === "function") {
        (timer as { unref: () => void }).unref();
      }
    }
    return {
      accepted: true,
      code: null,
      message: null,
    };
  });

  const createBackendForConfig = (
    config: AgentRunConfig,
    runId: string,
    context?: AgentRunContext<unknown>,
    options: {
      restored?: boolean;
    } = {},
  ): AgentRunBackend => {
    const normalizedConfig = new AgentRunConfig({
      agentDefinitionId: config.agentDefinitionId,
      llmModelIdentifier: config.llmModelIdentifier,
      autoExecuteTools: config.autoExecuteTools,
      workspaceId: config.workspaceId,
      memoryDir: path.join(input.memoryDir, "agents", runId),
      llmConfig: config.llmConfig,
      skillAccessMode: config.skillAccessMode,
      runtimeKind: config.runtimeKind,
      memberTeamContext: config.memberTeamContext,
    });
    const resolvedContext =
      context ??
      new AgentRunContext({
        runId,
        config: normalizedConfig,
        runtimeContext: null,
      });
    const activeState = activeStatesByRunId.get(runId) ?? { active: true };
    if (options.restored) {
      activeState.active = true;
    }
    activeStatesByRunId.set(runId, activeState);

    return {
      runId,
      runtimeKind: normalizedConfig.runtimeKind,
      getContext: () => resolvedContext as AgentRunContext<any>,
      isActive: () => activeState.active,
      getPlatformAgentRunId: () => `platform-${runId}`,
      getStatus: () => "IDLE",
      subscribeToEvents: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      postUserMessage,
      approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
      interrupt: vi.fn().mockResolvedValue({ accepted: true }),
      terminate: vi.fn().mockImplementation(async () => {
        activeState.active = false;
        return { accepted: true };
      }),
    };
  };

  return {
    factory: {
      createBackend: vi.fn(async (config, preferredRunId = null) =>
        createBackendForConfig(config, preferredRunId ?? input.runId),
      ),
      restoreBackend: vi.fn(async (context) =>
        createBackendForConfig(context.config, context.runId, context, {
          restored: true,
        }),
      ),
    },
    postUserMessage,
  };
};

const createTeamBackendFactory = (input: {
  teamRunId: string;
  coordinatorMemberName?: string;
  expectedTurnId?: string;
  runtimeEvents?: ScheduledRuntimeEvent[];
  runtimeEventsPerPost?: ScheduledRuntimeEvent[][];
}): {
  factory: TeamRunBackendFactory;
  postMessage: ReturnType<typeof vi.fn>;
} => {
  const listeners = new Set<(event: unknown) => void>();
  const emitRuntimeEvent = (event: unknown) => {
    for (const listener of listeners) {
      listener(event);
    }
  };
  const activeStatesByRunId = new Map<string, { active: boolean }>();
  let postInvocationCount = 0;
  const buildMemberContexts = (config: TeamRunConfig) =>
    config.memberConfigs.map((memberConfig) => {
      const memberRouteKey = normalizeMemberRouteKey(
        memberConfig.memberRouteKey ?? memberConfig.memberName,
      );
      const memberRunId =
        memberConfig.memberRunId?.trim() ||
        buildTeamMemberRunId(input.teamRunId, memberRouteKey);
      return {
        memberName: memberConfig.memberName,
        memberRouteKey,
        memberRunId,
        getPlatformAgentRunId: () => `platform-${memberRunId}`,
      };
    });

  const postMessage = vi.fn(
    async (_message: unknown, targetMemberName?: string | null) => {
      const coordinatorMemberName = input.coordinatorMemberName ?? "Coordinator";
      const targetRouteKey = normalizeMemberRouteKey(
        targetMemberName?.trim() || coordinatorMemberName,
      );
      const memberRunId = buildTeamMemberRunId(input.teamRunId, targetRouteKey);
      const memberName = targetMemberName?.trim() || coordinatorMemberName;
      const runtimeEvents =
        input.runtimeEventsPerPost?.[postInvocationCount] ??
        input.runtimeEvents ??
        [
          {
            delayMs: null,
            event: createTeamTurnRuntimeEvent({
              teamRunId: input.teamRunId,
              memberName,
              memberRunId,
              turnId: input.expectedTurnId ?? "turn-team-1",
              eventType: AgentRunEventType.TURN_STARTED,
              statusHint: "ACTIVE",
            }),
          },
        ];
      postInvocationCount += 1;
      for (const runtimeEvent of runtimeEvents) {
        if (runtimeEvent.delayMs === null) {
          emitRuntimeEvent(runtimeEvent.event);
          continue;
        }
        const timer = setTimeout(() => {
          emitRuntimeEvent(runtimeEvent.event);
        }, runtimeEvent.delayMs);
        if (typeof (timer as { unref?: () => void }).unref === "function") {
          (timer as { unref: () => void }).unref();
        }
      }
      return {
        accepted: true,
        code: null,
        message: null,
        memberRunId,
        memberName,
      };
    },
  );

  const createBackendForConfig = (
    config: TeamRunConfig,
    runId: string,
    options: {
      restored?: boolean;
    } = {},
  ): TeamRunBackend => {
    const memberContexts = buildMemberContexts(config);
    const activeState = activeStatesByRunId.get(runId) ?? { active: true };
    if (options.restored) {
      activeState.active = true;
    }
    activeStatesByRunId.set(runId, activeState);
    return {
      runId,
      runtimeKind: config.runtimeKind,
      getRuntimeContext: () =>
        ({
          coordinatorMemberRouteKey: normalizeMemberRouteKey(
            input.coordinatorMemberName ??
              memberContexts[0]?.memberRouteKey ??
              "Coordinator",
          ),
          memberContexts,
        }) as never,
      isActive: () => activeState.active,
      getStatus: () => "IDLE",
      subscribeToEvents: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      postMessage,
      deliverInterAgentMessage: vi.fn().mockResolvedValue({ accepted: true }),
      approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
      interrupt: vi.fn().mockResolvedValue({ accepted: true }),
      terminate: vi.fn().mockImplementation(async () => {
        activeState.active = false;
        return { accepted: true };
      }),
    };
  };

  return {
    factory: {
      createBackend: vi.fn(async (config, preferredRunId = null) =>
        createBackendForConfig(config, preferredRunId ?? input.teamRunId),
      ),
      restoreBackend: vi.fn(async (context) =>
        createBackendForConfig(context.config, context.runId, {
          restored: true,
        })),
    },
    postMessage,
  };
};

const createIngressHarness = async (options: {
  allowTransportFallback?: boolean;
  dispatchToBinding?: (binding: ChannelBinding) => Promise<ChannelRunDispatchResult>;
} = {}) => {
  const bindingService = new ChannelBindingService(
    new FileChannelBindingProvider(createTempFilePath("channel-bindings")),
    { allowTransportFallback: options.allowTransportFallback ?? false },
  );
  const messageReceiptService = new ChannelMessageReceiptService(
    new FileChannelMessageReceiptProvider(createTempFilePath("channel-receipts")),
  );
  const dispatchToBinding =
    options.dispatchToBinding ??
    (async (binding: ChannelBinding) =>
      binding.targetType === "TEAM"
        ? {
            dispatchTargetType: "TEAM" as const,
            teamRunId: binding.teamRunId ?? "team-run-1",
            memberRunId: "member-run-1",
            memberName: binding.targetNodeName ?? null,
            turnId: "turn-team-1",
            dispatchedAt: new Date("2026-03-27T07:00:01.000Z"),
          }
        : {
            dispatchTargetType: "AGENT" as const,
            agentRunId: binding.agentRunId ?? "agent-run-1",
            turnId: "turn-agent-1",
            dispatchedAt: new Date("2026-03-27T07:00:01.000Z"),
          });
  const dispatchSpy = vi.fn(dispatchToBinding);

  const ingressService = new ChannelIngressService({
    bindingService,
    threadLockService: new ChannelThreadLockService(),
    runFacade: {
      dispatchToBinding: dispatchSpy,
    } as any,
    messageReceiptService,
    receiptWorkflowRuntime: {
      registerAcceptedReceipt: vi.fn(),
    } as any,
  });

  const app = fastify();
  await registerChannelIngressRoutes(app, {
    ingressService,
    deliveryEventService: {
      recordPending: vi.fn(),
      recordSent: vi.fn(),
      recordFailed: vi.fn(),
    },
  });

  return {
    app,
    bindingService,
    messageReceiptService,
    dispatchSpy,
  };
};

const createAgentEndToEndIngressHarness = async () => {
  const rootDir = await createTempDir("channel-ingress-agent-e2e");
  const workspaceRootPath = path.join(rootDir, "workspace");
  const memoryDir = path.join(rootDir, "memory");
  const bindingsFilePath = path.join(rootDir, "bindings.json");
  const receiptsFilePath = path.join(rootDir, "message-receipts.json");
  const expectedRunId = "agent-run-e2e";
  const expectedTurnId = "turn-agent-e2e";

  await mkdir(workspaceRootPath, { recursive: true });

  const bindingService = new ChannelBindingService(
    new FileChannelBindingProvider(bindingsFilePath),
  );
  const messageReceiptService = new ChannelMessageReceiptService(
    new FileChannelMessageReceiptProvider(receiptsFilePath),
  );
  const workspaceManager = createWorkspaceManager();
  const { factory, postUserMessage } = createAgentBackendFactory({
    memoryDir,
    runId: expectedRunId,
    runtimeEvents: [
      {
        delayMs: null,
        event: {
          eventType: AgentRunEventType.TURN_STARTED,
          runId: expectedRunId,
          payload: {
            turnId: expectedTurnId,
          },
          statusHint: "ACTIVE",
        },
      },
    ],
  });
  const agentRunManager = new AgentRunManager({
    autoByteusBackendFactory: factory,
    codexBackendFactory: factory,
    claudeBackendFactory: factory,
  });
  const agentRunMetadataService = new AgentRunMetadataService(memoryDir);
  const agentRunHistoryIndexService = new AgentRunHistoryIndexService(memoryDir, {
    agentDefinitionService: {
      getAgentDefinitionById: vi.fn().mockResolvedValue({
        name: "External Channel Agent",
      }),
    } as never,
    agentRunManager,
  });
  const agentRunService = new AgentRunService(memoryDir, {
    agentRunManager,
    metadataService: agentRunMetadataService,
    historyIndexService: agentRunHistoryIndexService,
    workspaceManager: workspaceManager as never,
    agentDefinitionService: {
      getAgentDefinitionById: vi.fn().mockResolvedValue({
        id: "agent-def-1",
        name: "External Channel Agent",
        role: "assistant",
        description: "External channel agent",
        instructions: "Handle inbound messages.",
        toolNames: [],
      }),
      getFreshAgentDefinitionById: vi.fn().mockResolvedValue({
        id: "agent-def-1",
        name: "External Channel Agent",
        role: "assistant",
        description: "External channel agent",
        instructions: "Handle inbound messages.",
        toolNames: [],
      }),
    } as never,
  });
  const runLauncher = new ChannelBindingRunLauncher({
    bindingService,
    agentRunService,
    teamRunService: createUnusedTeamRunService(),
  });
  const agentRunFacade = new ChannelAgentRunFacade({
    runLauncher,
    agentRunService,
    agentLiveMessagePublisher: {
      publishExternalUserMessage: vi.fn(),
    } as never,
  });

  const ingressService = new ChannelIngressService({
    bindingService,
    threadLockService: new ChannelThreadLockService(),
    runFacade: {
      dispatchToBinding: (
        binding: ChannelBinding,
        envelope: ReturnType<typeof createEnvelope>,
      ) =>
        agentRunFacade.dispatchToAgentBinding(binding, envelope as never),
    } as never,
    messageReceiptService,
    receiptWorkflowRuntime: {
      registerAcceptedReceipt: vi.fn(),
    } as never,
  });

  const app = fastify();
  await registerChannelIngressRoutes(app, {
    ingressService,
    deliveryEventService: {
      recordPending: vi.fn(),
      recordSent: vi.fn(),
      recordFailed: vi.fn(),
    },
  });

  return {
    app,
    bindingService,
    messageReceiptService,
    workspaceRootPath,
    memoryDir,
    receiptsFilePath,
    postUserMessage,
    expectedRunId,
    expectedTurnId,
  };
};

const createAgentEndToEndIngressHarnessWithWorkflowRuntime = async (options: {
  runtimeEventsPerPost?: ScheduledRuntimeEvent[][];
  replyTextByTurn?: Record<string, string>;
  expectedTurnId?: string;
  expectedReplyText?: string;
} = {}) => {
  const rootDir = await createTempDir("channel-ingress-agent-recovery-e2e");
  const workspaceRootPath = path.join(rootDir, "workspace");
  const memoryDir = path.join(rootDir, "memory");
  const bindingsFilePath = path.join(rootDir, "bindings.json");
  const receiptsFilePath = path.join(rootDir, "message-receipts.json");
  const expectedRunId = "agent-run-recovery-e2e";
  const expectedTurnId = options.expectedTurnId ?? "turn-agent-recovery-e2e";
  const expectedReplyText =
    options.expectedReplyText ?? "Telegram first reply";
  const replyTextByTurn = {
    [expectedTurnId]: expectedReplyText,
    ...(options.replyTextByTurn ?? {}),
  };

  await mkdir(workspaceRootPath, { recursive: true });

  const bindingService = new ChannelBindingService(
    new FileChannelBindingProvider(bindingsFilePath),
  );
  const messageReceiptService = new ChannelMessageReceiptService(
    new FileChannelMessageReceiptProvider(receiptsFilePath),
  );
  const workspaceManager = createWorkspaceManager();
  const { factory, postUserMessage } = createAgentBackendFactory({
    memoryDir,
    runId: expectedRunId,
    runtimeEventsPerPost:
      options.runtimeEventsPerPost ??
      [
        [
          {
            delayMs: null,
            event: {
              eventType: AgentRunEventType.TURN_STARTED,
              runId: expectedRunId,
              payload: {
                turnId: expectedTurnId,
              },
              statusHint: "ACTIVE",
            },
          },
          {
            delayMs: 100,
            event: {
              eventType: AgentRunEventType.TURN_COMPLETED,
              runId: expectedRunId,
              payload: {
                turnId: expectedTurnId,
              },
              statusHint: "IDLE",
            },
          },
        ],
      ],
  });
  const agentRunManager = new AgentRunManager({
    autoByteusBackendFactory: factory,
    codexBackendFactory: factory,
    claudeBackendFactory: factory,
  });
  const agentRunMetadataService = new AgentRunMetadataService(memoryDir);
  const agentRunHistoryIndexService = new AgentRunHistoryIndexService(memoryDir, {
    agentDefinitionService: {
      getAgentDefinitionById: vi.fn().mockResolvedValue({
        name: "External Channel Agent",
      }),
    } as never,
    agentRunManager,
  });
  const agentRunService = new AgentRunService(memoryDir, {
    agentRunManager,
    metadataService: agentRunMetadataService,
    historyIndexService: agentRunHistoryIndexService,
    workspaceManager: workspaceManager as never,
    agentDefinitionService: {
      getAgentDefinitionById: vi.fn().mockResolvedValue({
        id: "agent-def-1",
        name: "External Channel Agent",
        role: "assistant",
        description: "External channel agent",
        instructions: "Handle inbound messages.",
        toolNames: [],
      }),
      getFreshAgentDefinitionById: vi.fn().mockResolvedValue({
        id: "agent-def-1",
        name: "External Channel Agent",
        role: "assistant",
        description: "External channel agent",
        instructions: "Handle inbound messages.",
        toolNames: [],
      }),
    } as never,
  });
  const runLauncher = new ChannelBindingRunLauncher({
    bindingService,
    agentRunService,
    teamRunService: createUnusedTeamRunService(),
  });
  const agentRunFacade = new ChannelAgentRunFacade({
    runLauncher,
    agentRunService,
    agentLiveMessagePublisher: {
      publishExternalUserMessage: vi.fn(),
    } as never,
  });
  const resolveReplyText = vi.fn().mockImplementation(
    async (input: { turnId: string }) => replyTextByTurn[input.turnId] ?? null,
  );
  const publishAssistantReplyToSource = vi.fn().mockResolvedValue({
    published: true,
    duplicate: false,
    reason: null,
    envelope: {} as object,
  });
  const receiptWorkflowRuntime = new ReceiptWorkflowRuntime({
    messageReceiptService,
    agentRunService,
    teamRunService: createUnusedTeamRunService(),
    agentReplyBridge: new ChannelAgentRunReplyBridge({
      turnReplyRecoveryService: {
        resolveReplyText,
      } as never,
    }),
    teamReplyBridge: {
      observeAcceptedTeamTurnToSource: vi.fn(),
    } as never,
    turnReplyRecoveryService: {
      resolveReplyText,
    } as never,
    replyCallbackServiceFactory: () =>
      ({
        publishAssistantReplyToSource,
      }) as never,
  });

  const ingressService = new ChannelIngressService({
    bindingService,
    threadLockService: new ChannelThreadLockService(),
    runFacade: {
      dispatchToBinding: (
        binding: ChannelBinding,
        envelope: ReturnType<typeof createEnvelope>,
      ) =>
        agentRunFacade.dispatchToAgentBinding(binding, envelope as never),
    } as never,
    messageReceiptService,
    receiptWorkflowRuntime,
  });

  const app = fastify();
  await registerChannelIngressRoutes(app, {
    ingressService,
    deliveryEventService: {
      recordPending: vi.fn(),
      recordSent: vi.fn(),
      recordFailed: vi.fn(),
    },
  });

  return {
    app,
    bindingService,
    messageReceiptService,
    receiptWorkflowRuntime,
    agentRunService,
    backendFactory: factory,
    postUserMessage,
    publishAssistantReplyToSource,
    resolveReplyText,
    expectedReplyText,
    expectedRunId,
    expectedTurnId,
  };
};

const createTeamEndToEndIngressHarness = async () => {
  const rootDir = await createTempDir("channel-ingress-team-e2e");
  const workspaceRootPath = path.join(rootDir, "workspace");
  const memoryDir = path.join(rootDir, "memory");
  const bindingsFilePath = path.join(rootDir, "bindings.json");
  const receiptsFilePath = path.join(rootDir, "message-receipts.json");
  const expectedTeamRunId = "team-run-e2e";
  const expectedMemberRunId = buildTeamMemberRunId(
    expectedTeamRunId,
    "Coordinator",
  );
  const expectedTurnId = "turn-team-e2e";

  await mkdir(workspaceRootPath, { recursive: true });

  const bindingService = new ChannelBindingService(
    new FileChannelBindingProvider(bindingsFilePath),
  );
  const messageReceiptService = new ChannelMessageReceiptService(
    new FileChannelMessageReceiptProvider(receiptsFilePath),
  );
  const workspaceManager = createWorkspaceManager();
  const { factory, postMessage } = createTeamBackendFactory({
    teamRunId: expectedTeamRunId,
    expectedTurnId,
  });
  const teamRunManager = new AgentTeamRunManager({
    autoByteusTeamRunBackendFactory: factory as never,
    codexTeamRunBackendFactory: factory as never,
    claudeTeamRunBackendFactory: factory as never,
  });
  const teamRunMetadataService = new TeamRunMetadataService(memoryDir);
  const teamRunHistoryIndexService = new TeamRunHistoryIndexService(memoryDir, {
    teamRunManager,
  });
  const teamDefinition = new AgentTeamDefinition({
    id: "team-def-1",
    name: "External Channel Team",
    description: "External channel team",
    instructions: "Route inbound messages to the coordinator",
    coordinatorMemberName: "Coordinator",
    nodes: [
      new TeamMember({
        memberName: "Coordinator",
        ref: "agent-def-1",
        refType: "agent",
        refScope: "shared",
      }),
    ],
  });
  const teamRunService = new TeamRunService({
    agentTeamRunManager: teamRunManager,
    teamDefinitionService: {
      getDefinitionById: vi.fn().mockResolvedValue(teamDefinition),
    } as never,
    teamRunMetadataService,
    teamRunHistoryIndexService,
    workspaceManager: workspaceManager as never,
    memoryDir,
  });
  const runLauncher = new ChannelBindingRunLauncher({
    bindingService,
    teamRunService,
  });
  const teamRunFacade = new ChannelTeamRunFacade({
    runLauncher,
    teamRunService,
    teamLiveMessagePublisher: {
      publishExternalUserMessage: vi.fn(),
    } as never,
  });

  const ingressService = new ChannelIngressService({
    bindingService,
    threadLockService: new ChannelThreadLockService(),
    runFacade: {
      dispatchToBinding: (
        binding: ChannelBinding,
        envelope: ReturnType<typeof createEnvelope>,
      ) =>
        teamRunFacade.dispatchToTeamBinding(binding, envelope as never),
    } as never,
    messageReceiptService,
    receiptWorkflowRuntime: {
      registerAcceptedReceipt: vi.fn(),
    } as never,
  });

  const app = fastify();
  await registerChannelIngressRoutes(app, {
    ingressService,
    deliveryEventService: {
      recordPending: vi.fn(),
      recordSent: vi.fn(),
      recordFailed: vi.fn(),
    },
  });

  return {
    app,
    bindingService,
    messageReceiptService,
    workspaceRootPath,
    memoryDir,
    receiptsFilePath,
    postMessage,
    expectedTeamRunId,
    expectedMemberRunId,
    expectedTurnId,
  };
};

const createTeamEndToEndIngressHarnessWithWorkflowRuntime = async (options: {
  coordinatorMemberName?: string;
  expectedMemberName?: string;
  teamMemberNames?: string[];
  runtimeEventsPerPost?: ScheduledRuntimeEvent[][];
  replyTextByTurn?: Record<string, string>;
  expectedTurnId?: string;
  expectedReplyText?: string;
} = {}) => {
  const rootDir = await createTempDir("channel-ingress-team-recovery-e2e");
  const workspaceRootPath = path.join(rootDir, "workspace");
  const memoryDir = path.join(rootDir, "memory");
  const bindingsFilePath = path.join(rootDir, "bindings.json");
  const receiptsFilePath = path.join(rootDir, "message-receipts.json");
  const expectedTeamRunId = "team-run-recovery-e2e";
  const coordinatorMemberName = options.coordinatorMemberName ?? "Coordinator";
  const teamMemberNames = options.teamMemberNames ?? [coordinatorMemberName];
  const expectedMemberName =
    options.expectedMemberName ?? coordinatorMemberName;
  const expectedMemberRunId = buildTeamMemberRunId(
    expectedTeamRunId,
    expectedMemberName,
  );
  const expectedTurnId = options.expectedTurnId ?? "turn-team-recovery-e2e";
  const expectedReplyText =
    options.expectedReplyText ?? "Telegram team first reply";
  const replyTextByTurn = {
    [expectedTurnId]: expectedReplyText,
    ...(options.replyTextByTurn ?? {}),
  };

  await mkdir(workspaceRootPath, { recursive: true });

  const bindingService = new ChannelBindingService(
    new FileChannelBindingProvider(bindingsFilePath),
  );
  const messageReceiptService = new ChannelMessageReceiptService(
    new FileChannelMessageReceiptProvider(receiptsFilePath),
  );
  const workspaceManager = createWorkspaceManager();
  const { factory, postMessage } = createTeamBackendFactory({
    teamRunId: expectedTeamRunId,
    coordinatorMemberName,
    expectedTurnId,
    runtimeEventsPerPost:
      options.runtimeEventsPerPost ??
      [
        [
          {
            delayMs: null,
            event: createTeamTurnRuntimeEvent({
              teamRunId: expectedTeamRunId,
              memberName: expectedMemberName,
              memberRunId: expectedMemberRunId,
              turnId: expectedTurnId,
              eventType: AgentRunEventType.TURN_STARTED,
              statusHint: "ACTIVE",
            }),
          },
          {
            delayMs: 100,
            event: createTeamTurnRuntimeEvent({
              teamRunId: expectedTeamRunId,
              memberName: expectedMemberName,
              memberRunId: expectedMemberRunId,
              turnId: expectedTurnId,
              eventType: AgentRunEventType.TURN_COMPLETED,
              statusHint: "IDLE",
            }),
          },
        ],
      ],
  });
  const teamRunManager = new AgentTeamRunManager({
    autoByteusTeamRunBackendFactory: factory as never,
    codexTeamRunBackendFactory: factory as never,
    claudeTeamRunBackendFactory: factory as never,
  });
  const teamRunMetadataService = new TeamRunMetadataService(memoryDir);
  const teamRunHistoryIndexService = new TeamRunHistoryIndexService(memoryDir, {
    teamRunManager,
  });
  const teamDefinition = new AgentTeamDefinition({
    id: "team-def-1",
    name: "External Channel Team",
    description: "External channel team",
    instructions: "Route inbound messages to the coordinator",
    coordinatorMemberName,
    nodes: teamMemberNames.map(
      (memberName) =>
        new TeamMember({
          memberName,
          ref: "agent-def-1",
          refType: "agent",
          refScope: "shared",
        }),
    ),
  });
  const teamRunService = new TeamRunService({
    agentTeamRunManager: teamRunManager,
    teamDefinitionService: {
      getDefinitionById: vi.fn().mockResolvedValue(teamDefinition),
    } as never,
    teamRunMetadataService,
    teamRunHistoryIndexService,
    workspaceManager: workspaceManager as never,
    memoryDir,
  });
  const runLauncher = new ChannelBindingRunLauncher({
    bindingService,
    teamRunService,
  });
  const teamRunFacade = new ChannelTeamRunFacade({
    runLauncher,
    teamRunService,
    teamLiveMessagePublisher: {
      publishExternalUserMessage: vi.fn(),
    } as never,
  });
  const resolveReplyText = vi.fn().mockImplementation(
    async (input: { turnId: string }) => replyTextByTurn[input.turnId] ?? null,
  );
  const publishAssistantReplyToSource = vi.fn().mockResolvedValue({
    published: true,
    duplicate: false,
    reason: null,
    envelope: {} as object,
  });
  const receiptWorkflowRuntime = new ReceiptWorkflowRuntime({
    messageReceiptService,
    agentRunService: {
      resolveAgentRun: vi.fn().mockResolvedValue(null),
    } as never,
    teamRunService,
    agentReplyBridge: {
      observeAcceptedTurnToSource: vi.fn(),
    } as never,
    teamReplyBridge: new ChannelTeamRunReplyBridge({
      turnReplyRecoveryService: {
        resolveReplyText,
      } as never,
    }),
    turnReplyRecoveryService: {
      resolveReplyText,
    } as never,
    replyCallbackServiceFactory: () =>
      ({
        publishAssistantReplyToSource,
      }) as never,
  });

  const ingressService = new ChannelIngressService({
    bindingService,
    threadLockService: new ChannelThreadLockService(),
    runFacade: {
      dispatchToBinding: (
        binding: ChannelBinding,
        envelope: ReturnType<typeof createEnvelope>,
      ) =>
        teamRunFacade.dispatchToTeamBinding(binding, envelope as never),
    } as never,
    messageReceiptService,
    receiptWorkflowRuntime,
  });

  const app = fastify();
  await registerChannelIngressRoutes(app, {
    ingressService,
    deliveryEventService: {
      recordPending: vi.fn(),
      recordSent: vi.fn(),
      recordFailed: vi.fn(),
    },
  });

  return {
    app,
    bindingService,
    messageReceiptService,
    receiptWorkflowRuntime,
    teamRunService,
    backendFactory: factory,
    postMessage,
    publishAssistantReplyToSource,
    resolveReplyText,
    expectedReplyText,
    expectedTeamRunId,
    expectedMemberName,
    expectedMemberRunId,
    expectedTurnId,
    memoryDir,
    workspaceRootPath,
  };
};

describe("channel-ingress route", () => {
  it("routes an agent binding end-to-end, creates a real run, and persists file artifacts", async () => {
    const harness = await createAgentEndToEndIngressHarness();

    try {
      await harness.bindingService.upsertBinding({
        ...createAgentBindingInput(harness.workspaceRootPath),
        agentRunId: null,
      });

      const response = await harness.app.inject({
        method: "POST",
        url: "/api/channel-ingress/v1/messages",
        payload: createEnvelope(),
      });

      expect(response.statusCode).toBe(202);
      expect(response.json()).toMatchObject({
        accepted: true,
        duplicate: false,
        disposition: "ACCEPTED",
        bindingResolved: true,
        usedTransportFallback: false,
      });
      expect(harness.postUserMessage).toHaveBeenCalledOnce();
      expect(harness.postUserMessage.mock.calls[0]?.[0]).toMatchObject({
        content: "hello",
      });

      const receipts = await readJson<
        Array<Record<string, unknown>>
      >(harness.receiptsFilePath);
      const acceptedReceipt = receipts.find(
        (receipt) => receipt.externalMessageId === "msg-1" && receipt.ingressState === "ACCEPTED",
      );
      expect(acceptedReceipt).toBeDefined();
      const agentRunId = String(acceptedReceipt?.agentRunId ?? "");
      expect(agentRunId.length).toBeGreaterThan(0);
      expect(acceptedReceipt?.turnId).toBe(harness.expectedTurnId);

      const metadataPath = path.join(
        harness.memoryDir,
        "agents",
        agentRunId,
        "run_metadata.json",
      );
      const indexPath = path.join(harness.memoryDir, "run_history_index.json");
      const metadata = await readJson<Record<string, unknown>>(metadataPath);
      const historyIndex = await readJson<{ rows?: Array<Record<string, unknown>> }>(
        indexPath,
      );
      const historyRow = historyIndex.rows?.find(
        (row) => row.runId === agentRunId,
      );

      expect(metadata).toMatchObject({
        runId: agentRunId,
        agentDefinitionId: "agent-def-1",
        workspaceRootPath: harness.workspaceRootPath,
        memoryDir: path.join(harness.memoryDir, "agents", agentRunId),
        runtimeKind: RuntimeKind.AUTOBYTEUS,
      });
      expect(historyRow).toMatchObject({
        runId: agentRunId,
        agentDefinitionId: "agent-def-1",
        agentName: "External Channel Agent",
        workspaceRootPath: harness.workspaceRootPath,
        summary: "hello",
        lastKnownStatus: "ACTIVE",
      });
    } finally {
      await harness.app.close();
    }
  });

  it("routes a team binding end-to-end, creates a real team run, and persists team artifacts", async () => {
    const harness = await createTeamEndToEndIngressHarness();

    try {
      await harness.bindingService.upsertBinding({
        ...createTeamBindingInput(harness.workspaceRootPath),
        teamRunId: null,
      });

      const response = await harness.app.inject({
        method: "POST",
        url: "/api/channel-ingress/v1/messages",
        payload: createEnvelope(),
      });

      expect(response.statusCode).toBe(202);
      expect(response.json()).toMatchObject({
        accepted: true,
        duplicate: false,
        disposition: "ACCEPTED",
        bindingResolved: true,
        usedTransportFallback: false,
      });
      expect(harness.postMessage).toHaveBeenCalledOnce();
      expect(harness.postMessage.mock.calls[0]?.[0]).toMatchObject({
        content: "hello",
      });
      expect(harness.postMessage.mock.calls[0]?.[1]).toBe("Coordinator");

      const receipts = await readJson<
        Array<Record<string, unknown>>
      >(harness.receiptsFilePath);
      expect(receipts).toContainEqual(
        expect.objectContaining({
          externalMessageId: "msg-1",
          ingressState: "ACCEPTED",
          agentRunId: harness.expectedMemberRunId,
          teamRunId: harness.expectedTeamRunId,
          turnId: harness.expectedTurnId,
        }),
      );

      const metadataPath = path.join(
        harness.memoryDir,
        "agent_teams",
        harness.expectedTeamRunId,
        "team_run_metadata.json",
      );
      const indexPath = path.join(
        harness.memoryDir,
        "team_run_history_index.json",
      );
      const metadata = await readJson<Record<string, unknown>>(metadataPath);
      const historyIndex = await readJson<{ rows?: Array<Record<string, unknown>> }>(
        indexPath,
      );
      const historyRow = historyIndex.rows?.find(
        (row) => row.teamRunId === harness.expectedTeamRunId,
      );
      const memberMetadata = Array.isArray(metadata.memberMetadata)
        ? (metadata.memberMetadata[0] as Record<string, unknown> | undefined)
        : undefined;

      expect(metadata).toMatchObject({
        teamRunId: harness.expectedTeamRunId,
        teamDefinitionId: "team-def-1",
        teamDefinitionName: "External Channel Team",
        coordinatorMemberRouteKey: "Coordinator",
      });
      expect(memberMetadata).toMatchObject({
        memberName: "Coordinator",
        memberRunId: harness.expectedMemberRunId,
        agentDefinitionId: "agent-def-1",
        workspaceRootPath: harness.workspaceRootPath,
      });
      expect(historyRow).toMatchObject({
        teamRunId: harness.expectedTeamRunId,
        teamDefinitionId: "team-def-1",
        teamDefinitionName: "External Channel Team",
        workspaceRootPath: harness.workspaceRootPath,
        lastKnownStatus: "ACTIVE",
      });
    } finally {
      await harness.app.close();
    }
  });

  it(
    "uses the real receipt workflow runtime to publish the accumulated team turn reply without a second inbound message",
    async () => {
      const harness = await createTeamEndToEndIngressHarnessWithWorkflowRuntime();
      const envelope = createEnvelope({
        externalMessageId: "msg-team-runtime-1",
        content: "hello team runtime",
      });

      try {
        await harness.bindingService.upsertBinding({
          ...createTeamBindingInput(),
          teamRunId: null,
        });

        const response = await harness.app.inject({
          method: "POST",
          url: "/api/channel-ingress/v1/messages",
          payload: envelope,
        });

        expect(response.statusCode).toBe(202);
        expect(response.json()).toMatchObject({
          accepted: true,
          duplicate: false,
          disposition: "ACCEPTED",
          bindingResolved: true,
        });
        expect(harness.postMessage).toHaveBeenCalledOnce();
        expect(harness.postMessage.mock.calls[0]?.[0]).toMatchObject({
          content: envelope.content,
        });
        expect(harness.postMessage.mock.calls[0]?.[1]).toBe("Coordinator");

        await new Promise((resolve) => setTimeout(resolve, 1_200));

        expect(harness.resolveReplyText).toHaveBeenCalledTimes(1);
        const publishedReply =
          harness.publishAssistantReplyToSource.mock.calls[0]?.[0];
        expect(publishedReply).toMatchObject({
          source: expect.objectContaining({
            externalMessageId: envelope.externalMessageId,
          }),
          agentRunId: harness.expectedMemberRunId,
          teamRunId: harness.expectedTeamRunId,
          turnId: harness.expectedTurnId,
          replyText: harness.expectedReplyText,
        });
        expect(publishedReply?.callbackIdempotencyKey).toBe(
          `external-reply:${harness.expectedMemberRunId}:${harness.expectedTurnId}`,
        );

        const routedReceipt =
          await harness.messageReceiptService.getReceiptByExternalMessage({
            provider: envelope.provider,
            transport: envelope.transport,
            accountId: envelope.accountId,
            peerId: envelope.peerId,
            threadId: envelope.threadId,
            externalMessageId: envelope.externalMessageId,
          });
        expect(routedReceipt).toMatchObject({
          ingressState: "ROUTED",
          agentRunId: harness.expectedMemberRunId,
          teamRunId: harness.expectedTeamRunId,
          turnId: harness.expectedTurnId,
        });
      } finally {
        await harness.receiptWorkflowRuntime.stop();
        await harness.app.close();
      }
    },
    10_000,
  );

  it(
    "routes a multi-member team binding to the coordinator by default when no target node is configured",
    async () => {
      const coordinatorMemberName = "Coordinator";
      const workerMemberName = "WorkerA";
      const turnId = "turn-team-coordinator-default-e2e";
      const replyText = "Telegram team coordinator default reply";
      const harness = await createTeamEndToEndIngressHarnessWithWorkflowRuntime({
        coordinatorMemberName,
        teamMemberNames: [coordinatorMemberName, workerMemberName],
        expectedTurnId: turnId,
        expectedReplyText: replyText,
      });
      const workerMemberRunId = buildTeamMemberRunId(
        harness.expectedTeamRunId,
        workerMemberName,
      );
      const envelope = createEnvelope({
        externalMessageId: "msg-team-coordinator-default-1",
        content: "hello multi-member team",
      });

      try {
        await harness.bindingService.upsertBinding({
          ...createTeamBindingInput(harness.workspaceRootPath),
          teamRunId: null,
          targetNodeName: null,
        });

        const response = await harness.app.inject({
          method: "POST",
          url: "/api/channel-ingress/v1/messages",
          payload: envelope,
        });

        expect(response.statusCode).toBe(202);
        expect(response.json()).toMatchObject({
          accepted: true,
          duplicate: false,
          disposition: "ACCEPTED",
          bindingResolved: true,
        });
        expect(harness.postMessage).toHaveBeenCalledOnce();
        expect(harness.postMessage.mock.calls[0]?.[0]).toMatchObject({
          content: envelope.content,
        });
        expect(harness.postMessage.mock.calls[0]?.[1]).toBeNull();

        await new Promise((resolve) => setTimeout(resolve, 1_200));

        const publishedReply =
          harness.publishAssistantReplyToSource.mock.calls[0]?.[0];
        expect(publishedReply).toMatchObject({
          source: expect.objectContaining({
            externalMessageId: envelope.externalMessageId,
          }),
          agentRunId: harness.expectedMemberRunId,
          teamRunId: harness.expectedTeamRunId,
          turnId,
          replyText,
        });
        expect(publishedReply?.agentRunId).not.toBe(workerMemberRunId);

        const routedReceipt =
          await harness.messageReceiptService.getReceiptByExternalMessage({
            provider: envelope.provider,
            transport: envelope.transport,
            accountId: envelope.accountId,
            peerId: envelope.peerId,
            threadId: envelope.threadId,
            externalMessageId: envelope.externalMessageId,
          });
        expect(routedReceipt).toMatchObject({
          ingressState: "ROUTED",
          agentRunId: harness.expectedMemberRunId,
          teamRunId: harness.expectedTeamRunId,
          turnId,
        });
        expect(routedReceipt?.agentRunId).not.toBe(workerMemberRunId);

        const metadataPath = path.join(
          harness.memoryDir,
          "agent_teams",
          harness.expectedTeamRunId,
          "team_run_metadata.json",
        );
        const metadata = await readJson<Record<string, unknown>>(metadataPath);
        const memberMetadata = Array.isArray(metadata.memberMetadata)
          ? metadata.memberMetadata
          : [];
        const memberRunIds = memberMetadata.map((row) =>
          typeof (row as Record<string, unknown>).memberRunId === "string"
            ? ((row as Record<string, unknown>).memberRunId as string)
            : null,
        );

        expect(metadata).toMatchObject({
          teamRunId: harness.expectedTeamRunId,
          coordinatorMemberRouteKey: coordinatorMemberName,
        });
        expect(memberMetadata).toHaveLength(2);
        expect(memberRunIds).toEqual(
          expect.arrayContaining([
            harness.expectedMemberRunId,
            workerMemberRunId,
          ]),
        );
      } finally {
        await harness.receiptWorkflowRuntime.stop();
        await harness.app.close();
      }
    },
    10_000,
  );

  it(
    "uses the real receipt workflow runtime to publish the accumulated turn reply without a second inbound message",
    async () => {
    const harness = await createAgentEndToEndIngressHarnessWithWorkflowRuntime();
    const envelope = createEnvelope();

    try {
      await harness.bindingService.upsertBinding({
        ...createAgentBindingInput(),
        agentRunId: null,
      });

      const response = await harness.app.inject({
        method: "POST",
        url: "/api/channel-ingress/v1/messages",
        payload: envelope,
      });

      expect(response.statusCode).toBe(202);
      expect(response.json()).toMatchObject({
        accepted: true,
        duplicate: false,
        disposition: "ACCEPTED",
        bindingResolved: true,
      });
      expect(harness.postUserMessage).toHaveBeenCalledOnce();

      await new Promise((resolve) => setTimeout(resolve, 1_200));

      expect(harness.resolveReplyText).toHaveBeenCalledTimes(1);
      const publishedReply =
        harness.publishAssistantReplyToSource.mock.calls[0]?.[0];
      expect(publishedReply).toMatchObject({
        source: expect.objectContaining({
          provider: ExternalChannelProvider.WHATSAPP,
          transport: ExternalChannelTransport.BUSINESS_API,
          externalMessageId: envelope.externalMessageId,
        }),
        teamRunId: null,
        turnId: harness.expectedTurnId,
        replyText: harness.expectedReplyText,
      });
      expect(typeof publishedReply?.agentRunId).toBe("string");
      expect(publishedReply?.agentRunId.length).toBeGreaterThan(0);
      expect(publishedReply?.callbackIdempotencyKey).toBe(
        `external-reply:${publishedReply?.agentRunId}:${harness.expectedTurnId}`,
      );

      const routedReceipt = await harness.messageReceiptService.getReceiptByExternalMessage({
        provider: envelope.provider,
        transport: envelope.transport,
        accountId: envelope.accountId,
        peerId: envelope.peerId,
        threadId: envelope.threadId,
        externalMessageId: envelope.externalMessageId,
      });
      expect(routedReceipt?.ingressState).toBe("ROUTED");
    } finally {
      await harness.receiptWorkflowRuntime.stop();
      await harness.app.close();
    }
    },
    10_000,
  );

  it(
    "publishes one final team reply for each distinct inbound message on the same thread while reusing the same team run",
    async () => {
      const teamRunId = "team-run-recovery-e2e";
      const memberName = "Coordinator";
      const memberRunId = buildTeamMemberRunId(teamRunId, memberName);
      const firstTurnId = "turn-team-recovery-e2e-1";
      const secondTurnId = "turn-team-recovery-e2e-2";
      const firstReplyText = "Telegram team first reply";
      const secondReplyText = "Telegram team second reply";
      const harness = await createTeamEndToEndIngressHarnessWithWorkflowRuntime({
        expectedTurnId: firstTurnId,
        expectedReplyText: firstReplyText,
        replyTextByTurn: {
          [firstTurnId]: firstReplyText,
          [secondTurnId]: secondReplyText,
        },
        runtimeEventsPerPost: [
          [
            {
              delayMs: null,
              event: createTeamTurnRuntimeEvent({
                teamRunId,
                memberName,
                memberRunId,
                turnId: firstTurnId,
                eventType: AgentRunEventType.TURN_STARTED,
                statusHint: "ACTIVE",
              }),
            },
            {
              delayMs: 100,
              event: createTeamTurnRuntimeEvent({
                teamRunId,
                memberName,
                memberRunId,
                turnId: firstTurnId,
                eventType: AgentRunEventType.TURN_COMPLETED,
                statusHint: "IDLE",
              }),
            },
          ],
          [
            {
              delayMs: null,
              event: createTeamTurnRuntimeEvent({
                teamRunId,
                memberName,
                memberRunId,
                turnId: secondTurnId,
                eventType: AgentRunEventType.TURN_STARTED,
                statusHint: "ACTIVE",
              }),
            },
            {
              delayMs: 100,
              event: createTeamTurnRuntimeEvent({
                teamRunId,
                memberName,
                memberRunId,
                turnId: secondTurnId,
                eventType: AgentRunEventType.TURN_COMPLETED,
                statusHint: "IDLE",
              }),
            },
          ],
        ],
      });
      const firstEnvelope = createEnvelope({
        externalMessageId: "msg-team-1",
        content: "hello team first",
      });
      const secondEnvelope = createEnvelope({
        externalMessageId: "msg-team-2",
        content: "hello team second",
        receivedAt: "2026-03-27T07:03:00.000Z",
      });

      try {
        await harness.bindingService.upsertBinding({
          ...createTeamBindingInput(),
          teamRunId: null,
        });

        const firstResponse = await harness.app.inject({
          method: "POST",
          url: "/api/channel-ingress/v1/messages",
          payload: firstEnvelope,
        });

        expect(firstResponse.statusCode).toBe(202);
        expect(firstResponse.json()).toMatchObject({
          accepted: true,
          duplicate: false,
          disposition: "ACCEPTED",
          bindingResolved: true,
        });

        await new Promise((resolve) => setTimeout(resolve, 1_200));

        const bindingsAfterFirst = await harness.bindingService.listBindings();
        expect(bindingsAfterFirst).toHaveLength(1);
        const persistedTeamRunId = bindingsAfterFirst[0]?.teamRunId;
        expect(persistedTeamRunId).toBe(teamRunId);

        const secondResponse = await harness.app.inject({
          method: "POST",
          url: "/api/channel-ingress/v1/messages",
          payload: secondEnvelope,
        });

        expect(secondResponse.statusCode).toBe(202);
        expect(secondResponse.json()).toMatchObject({
          accepted: true,
          duplicate: false,
          disposition: "ACCEPTED",
          bindingResolved: true,
        });

        await new Promise((resolve) => setTimeout(resolve, 1_200));

        expect(harness.backendFactory.createBackend).toHaveBeenCalledTimes(1);
        expect(harness.backendFactory.restoreBackend).toHaveBeenCalledTimes(0);
        expect(harness.postMessage).toHaveBeenCalledTimes(2);
        expect(harness.resolveReplyText).toHaveBeenCalledTimes(2);
        expect(harness.publishAssistantReplyToSource).toHaveBeenCalledTimes(2);

        const firstPublishedReply =
          harness.publishAssistantReplyToSource.mock.calls[0]?.[0];
        const secondPublishedReply =
          harness.publishAssistantReplyToSource.mock.calls[1]?.[0];

        expect(firstPublishedReply).toMatchObject({
          agentRunId: memberRunId,
          teamRunId: persistedTeamRunId,
          turnId: firstTurnId,
          replyText: firstReplyText,
          source: expect.objectContaining({
            externalMessageId: firstEnvelope.externalMessageId,
          }),
        });
        expect(secondPublishedReply).toMatchObject({
          agentRunId: memberRunId,
          teamRunId: persistedTeamRunId,
          turnId: secondTurnId,
          replyText: secondReplyText,
          source: expect.objectContaining({
            externalMessageId: secondEnvelope.externalMessageId,
          }),
        });
        expect(firstPublishedReply?.callbackIdempotencyKey).toBe(
          `external-reply:${memberRunId}:${firstTurnId}`,
        );
        expect(secondPublishedReply?.callbackIdempotencyKey).toBe(
          `external-reply:${memberRunId}:${secondTurnId}`,
        );

        const firstReceipt =
          await harness.messageReceiptService.getReceiptByExternalMessage({
            provider: firstEnvelope.provider,
            transport: firstEnvelope.transport,
            accountId: firstEnvelope.accountId,
            peerId: firstEnvelope.peerId,
            threadId: firstEnvelope.threadId,
            externalMessageId: firstEnvelope.externalMessageId,
          });
        const secondReceipt =
          await harness.messageReceiptService.getReceiptByExternalMessage({
            provider: secondEnvelope.provider,
            transport: secondEnvelope.transport,
            accountId: secondEnvelope.accountId,
            peerId: secondEnvelope.peerId,
            threadId: secondEnvelope.threadId,
            externalMessageId: secondEnvelope.externalMessageId,
          });

        expect(firstReceipt).toMatchObject({
          ingressState: "ROUTED",
          agentRunId: memberRunId,
          teamRunId: persistedTeamRunId,
          turnId: firstTurnId,
        });
        expect(secondReceipt).toMatchObject({
          ingressState: "ROUTED",
          agentRunId: memberRunId,
          teamRunId: persistedTeamRunId,
          turnId: secondTurnId,
        });
      } finally {
        await harness.receiptWorkflowRuntime.stop();
        await harness.app.close();
      }
    },
    15_000,
  );

  it(
    "publishes one final reply for each distinct inbound message on the same thread while reusing the same run",
    async () => {
      const firstTurnId = "turn-agent-recovery-e2e-1";
      const secondTurnId = "turn-agent-recovery-e2e-2";
      const firstReplyText = "Telegram first reply";
      const secondReplyText = "Telegram second reply";
      const harness = await createAgentEndToEndIngressHarnessWithWorkflowRuntime({
        expectedTurnId: firstTurnId,
        expectedReplyText: firstReplyText,
        replyTextByTurn: {
          [firstTurnId]: firstReplyText,
          [secondTurnId]: secondReplyText,
        },
        runtimeEventsPerPost: [
          [
            {
              delayMs: null,
              event: {
                eventType: AgentRunEventType.TURN_STARTED,
                runId: "agent-run-recovery-e2e",
                payload: {
                  turnId: firstTurnId,
                },
                statusHint: "ACTIVE",
              },
            },
            {
              delayMs: 100,
              event: {
                eventType: AgentRunEventType.TURN_COMPLETED,
                runId: "agent-run-recovery-e2e",
                payload: {
                  turnId: firstTurnId,
                },
                statusHint: "IDLE",
              },
            },
          ],
          [
            {
              delayMs: null,
              event: {
                eventType: AgentRunEventType.TURN_STARTED,
                runId: "agent-run-recovery-e2e",
                payload: {
                  turnId: secondTurnId,
                },
                statusHint: "ACTIVE",
              },
            },
            {
              delayMs: 100,
              event: {
                eventType: AgentRunEventType.TURN_COMPLETED,
                runId: "agent-run-recovery-e2e",
                payload: {
                  turnId: secondTurnId,
                },
                statusHint: "IDLE",
              },
            },
          ],
        ],
      });
      const firstEnvelope = createEnvelope({
        externalMessageId: "msg-1",
        content: "hello first",
      });
      const secondEnvelope = createEnvelope({
        externalMessageId: "msg-2",
        content: "hello second",
        receivedAt: "2026-03-27T07:01:00.000Z",
      });

      try {
        await harness.bindingService.upsertBinding({
          ...createAgentBindingInput(),
          agentRunId: null,
        });

        const firstResponse = await harness.app.inject({
          method: "POST",
          url: "/api/channel-ingress/v1/messages",
          payload: firstEnvelope,
        });

        expect(firstResponse.statusCode).toBe(202);
        expect(firstResponse.json()).toMatchObject({
          accepted: true,
          duplicate: false,
          disposition: "ACCEPTED",
          bindingResolved: true,
        });

        await new Promise((resolve) => setTimeout(resolve, 1_200));

        const bindingsAfterFirst = await harness.bindingService.listBindings();
        expect(bindingsAfterFirst).toHaveLength(1);
        const persistedAgentRunId = bindingsAfterFirst[0]?.agentRunId;
        expect(typeof persistedAgentRunId).toBe("string");
        expect(persistedAgentRunId?.length).toBeGreaterThan(0);

        const secondResponse = await harness.app.inject({
          method: "POST",
          url: "/api/channel-ingress/v1/messages",
          payload: secondEnvelope,
        });

        expect(secondResponse.statusCode).toBe(202);
        expect(secondResponse.json()).toMatchObject({
          accepted: true,
          duplicate: false,
          disposition: "ACCEPTED",
          bindingResolved: true,
        });

        await new Promise((resolve) => setTimeout(resolve, 1_200));

        expect(harness.postUserMessage).toHaveBeenCalledTimes(2);
        expect(harness.postUserMessage.mock.calls[0]?.[0]).toMatchObject({
          content: firstEnvelope.content,
        });
        expect(harness.postUserMessage.mock.calls[1]?.[0]).toMatchObject({
          content: secondEnvelope.content,
        });
        expect(harness.resolveReplyText).toHaveBeenCalledTimes(2);
        expect(harness.publishAssistantReplyToSource).toHaveBeenCalledTimes(2);

        const firstPublishedReply =
          harness.publishAssistantReplyToSource.mock.calls[0]?.[0];
        const secondPublishedReply =
          harness.publishAssistantReplyToSource.mock.calls[1]?.[0];

        expect(firstPublishedReply).toMatchObject({
          agentRunId: persistedAgentRunId,
          teamRunId: null,
          turnId: firstTurnId,
          replyText: firstReplyText,
          source: expect.objectContaining({
            externalMessageId: firstEnvelope.externalMessageId,
          }),
        });
        expect(secondPublishedReply).toMatchObject({
          agentRunId: persistedAgentRunId,
          teamRunId: null,
          turnId: secondTurnId,
          replyText: secondReplyText,
          source: expect.objectContaining({
            externalMessageId: secondEnvelope.externalMessageId,
          }),
        });
        expect(firstPublishedReply?.callbackIdempotencyKey).toBe(
          `external-reply:${persistedAgentRunId}:${firstTurnId}`,
        );
        expect(secondPublishedReply?.callbackIdempotencyKey).toBe(
          `external-reply:${persistedAgentRunId}:${secondTurnId}`,
        );

        const firstReceipt =
          await harness.messageReceiptService.getReceiptByExternalMessage({
            provider: firstEnvelope.provider,
            transport: firstEnvelope.transport,
            accountId: firstEnvelope.accountId,
            peerId: firstEnvelope.peerId,
            threadId: firstEnvelope.threadId,
            externalMessageId: firstEnvelope.externalMessageId,
          });
        const secondReceipt =
          await harness.messageReceiptService.getReceiptByExternalMessage({
            provider: secondEnvelope.provider,
            transport: secondEnvelope.transport,
            accountId: secondEnvelope.accountId,
            peerId: secondEnvelope.peerId,
            threadId: secondEnvelope.threadId,
            externalMessageId: secondEnvelope.externalMessageId,
          });

        expect(firstReceipt?.ingressState).toBe("ROUTED");
        expect(secondReceipt?.ingressState).toBe("ROUTED");
      } finally {
        await harness.receiptWorkflowRuntime.stop();
        await harness.app.close();
      }
    },
    15_000,
  );

  it(
    "restores a terminated bound run when a second same-thread message arrives and publishes again",
    async () => {
      const firstTurnId = "turn-agent-restore-e2e-1";
      const secondTurnId = "turn-agent-restore-e2e-2";
      const firstReplyText = "Telegram reply before terminate";
      const secondReplyText = "Telegram reply after restore";
      const harness = await createAgentEndToEndIngressHarnessWithWorkflowRuntime({
        expectedTurnId: firstTurnId,
        expectedReplyText: firstReplyText,
        replyTextByTurn: {
          [firstTurnId]: firstReplyText,
          [secondTurnId]: secondReplyText,
        },
        runtimeEventsPerPost: [
          [
            {
              delayMs: null,
              event: {
                eventType: AgentRunEventType.TURN_STARTED,
                runId: "agent-run-recovery-e2e",
                payload: {
                  turnId: firstTurnId,
                },
                statusHint: "ACTIVE",
              },
            },
            {
              delayMs: 100,
              event: {
                eventType: AgentRunEventType.TURN_COMPLETED,
                runId: "agent-run-recovery-e2e",
                payload: {
                  turnId: firstTurnId,
                },
                statusHint: "IDLE",
              },
            },
          ],
          [
            {
              delayMs: null,
              event: {
                eventType: AgentRunEventType.TURN_STARTED,
                runId: "agent-run-recovery-e2e",
                payload: {
                  turnId: secondTurnId,
                },
                statusHint: "ACTIVE",
              },
            },
            {
              delayMs: 100,
              event: {
                eventType: AgentRunEventType.TURN_COMPLETED,
                runId: "agent-run-recovery-e2e",
                payload: {
                  turnId: secondTurnId,
                },
                statusHint: "IDLE",
              },
            },
          ],
        ],
      });
      const firstEnvelope = createEnvelope({
        externalMessageId: "msg-restore-1",
        content: "restore first",
      });
      const secondEnvelope = createEnvelope({
        externalMessageId: "msg-restore-2",
        content: "restore second",
        receivedAt: "2026-03-27T07:02:00.000Z",
      });

      try {
        await harness.bindingService.upsertBinding({
          ...createAgentBindingInput(),
          agentRunId: null,
        });

        const firstResponse = await harness.app.inject({
          method: "POST",
          url: "/api/channel-ingress/v1/messages",
          payload: firstEnvelope,
        });

        expect(firstResponse.statusCode).toBe(202);
        await new Promise((resolve) => setTimeout(resolve, 1_200));

        const bindingsAfterFirst = await harness.bindingService.listBindings();
        expect(bindingsAfterFirst).toHaveLength(1);
        const persistedAgentRunId = bindingsAfterFirst[0]?.agentRunId;
        expect(typeof persistedAgentRunId).toBe("string");
        expect(persistedAgentRunId?.length).toBeGreaterThan(0);

        const terminationResult = await harness.agentRunService.terminateAgentRun(
          persistedAgentRunId!,
        );
        expect(terminationResult).toMatchObject({
          success: true,
          route: "native",
        });
        expect(harness.agentRunService.getAgentRun(persistedAgentRunId!)).toBeNull();

        const secondResponse = await harness.app.inject({
          method: "POST",
          url: "/api/channel-ingress/v1/messages",
          payload: secondEnvelope,
        });

        expect(secondResponse.statusCode).toBe(202);
        expect(secondResponse.json()).toMatchObject({
          accepted: true,
          duplicate: false,
          disposition: "ACCEPTED",
          bindingResolved: true,
        });

        await new Promise((resolve) => setTimeout(resolve, 1_200));

        expect(harness.backendFactory.createBackend).toHaveBeenCalledTimes(1);
        expect(harness.backendFactory.restoreBackend).toHaveBeenCalledTimes(1);
        expect(harness.postUserMessage).toHaveBeenCalledTimes(2);
        expect(harness.publishAssistantReplyToSource).toHaveBeenCalledTimes(2);

        const firstPublishedReply =
          harness.publishAssistantReplyToSource.mock.calls[0]?.[0];
        const secondPublishedReply =
          harness.publishAssistantReplyToSource.mock.calls[1]?.[0];

        expect(firstPublishedReply).toMatchObject({
          agentRunId: persistedAgentRunId,
          turnId: firstTurnId,
          replyText: firstReplyText,
          source: expect.objectContaining({
            externalMessageId: firstEnvelope.externalMessageId,
          }),
        });
        expect(secondPublishedReply).toMatchObject({
          agentRunId: persistedAgentRunId,
          turnId: secondTurnId,
          replyText: secondReplyText,
          source: expect.objectContaining({
            externalMessageId: secondEnvelope.externalMessageId,
          }),
        });

        const secondReceipt =
          await harness.messageReceiptService.getReceiptByExternalMessage({
            provider: secondEnvelope.provider,
            transport: secondEnvelope.transport,
            accountId: secondEnvelope.accountId,
            peerId: secondEnvelope.peerId,
            threadId: secondEnvelope.threadId,
            externalMessageId: secondEnvelope.externalMessageId,
          });
        expect(secondReceipt).toMatchObject({
          ingressState: "ROUTED",
          agentRunId: persistedAgentRunId,
          turnId: secondTurnId,
        });
      } finally {
        await harness.receiptWorkflowRuntime.stop();
        await harness.app.close();
      }
    },
    15_000,
  );

  it(
    "restores a terminated bound team run when a second same-thread message arrives and publishes again",
    async () => {
      const teamRunId = "team-run-recovery-e2e";
      const memberName = "Coordinator";
      const memberRunId = buildTeamMemberRunId(teamRunId, memberName);
      const firstTurnId = "turn-team-restore-e2e-1";
      const secondTurnId = "turn-team-restore-e2e-2";
      const firstReplyText = "Telegram team reply before terminate";
      const secondReplyText = "Telegram team reply after restore";
      const harness = await createTeamEndToEndIngressHarnessWithWorkflowRuntime({
        expectedTurnId: firstTurnId,
        expectedReplyText: firstReplyText,
        replyTextByTurn: {
          [firstTurnId]: firstReplyText,
          [secondTurnId]: secondReplyText,
        },
        runtimeEventsPerPost: [
          [
            {
              delayMs: null,
              event: createTeamTurnRuntimeEvent({
                teamRunId,
                memberName,
                memberRunId,
                turnId: firstTurnId,
                eventType: AgentRunEventType.TURN_STARTED,
                statusHint: "ACTIVE",
              }),
            },
            {
              delayMs: 100,
              event: createTeamTurnRuntimeEvent({
                teamRunId,
                memberName,
                memberRunId,
                turnId: firstTurnId,
                eventType: AgentRunEventType.TURN_COMPLETED,
                statusHint: "IDLE",
              }),
            },
          ],
          [
            {
              delayMs: null,
              event: createTeamTurnRuntimeEvent({
                teamRunId,
                memberName,
                memberRunId,
                turnId: secondTurnId,
                eventType: AgentRunEventType.TURN_STARTED,
                statusHint: "ACTIVE",
              }),
            },
            {
              delayMs: 100,
              event: createTeamTurnRuntimeEvent({
                teamRunId,
                memberName,
                memberRunId,
                turnId: secondTurnId,
                eventType: AgentRunEventType.TURN_COMPLETED,
                statusHint: "IDLE",
              }),
            },
          ],
        ],
      });
      const firstEnvelope = createEnvelope({
        externalMessageId: "msg-team-restore-1",
        content: "team restore first",
      });
      const secondEnvelope = createEnvelope({
        externalMessageId: "msg-team-restore-2",
        content: "team restore second",
        receivedAt: "2026-03-27T07:04:00.000Z",
      });

      try {
        await harness.bindingService.upsertBinding({
          ...createTeamBindingInput(),
          teamRunId: null,
        });

        const firstResponse = await harness.app.inject({
          method: "POST",
          url: "/api/channel-ingress/v1/messages",
          payload: firstEnvelope,
        });

        expect(firstResponse.statusCode).toBe(202);
        await new Promise((resolve) => setTimeout(resolve, 1_200));

        const bindingsAfterFirst = await harness.bindingService.listBindings();
        expect(bindingsAfterFirst).toHaveLength(1);
        const persistedTeamRunId = bindingsAfterFirst[0]?.teamRunId;
        expect(persistedTeamRunId).toBe(teamRunId);

        const terminationResult = await harness.teamRunService.terminateTeamRun(
          persistedTeamRunId!,
        );
        expect(terminationResult).toBe(true);
        expect(harness.teamRunService.getTeamRun(persistedTeamRunId!)).toBeNull();

        const secondResponse = await harness.app.inject({
          method: "POST",
          url: "/api/channel-ingress/v1/messages",
          payload: secondEnvelope,
        });

        expect(secondResponse.statusCode).toBe(202);
        expect(secondResponse.json()).toMatchObject({
          accepted: true,
          duplicate: false,
          disposition: "ACCEPTED",
          bindingResolved: true,
        });

        await new Promise((resolve) => setTimeout(resolve, 1_200));

        expect(harness.backendFactory.createBackend).toHaveBeenCalledTimes(1);
        expect(harness.backendFactory.restoreBackend).toHaveBeenCalledTimes(1);
        expect(harness.postMessage).toHaveBeenCalledTimes(2);
        expect(harness.publishAssistantReplyToSource).toHaveBeenCalledTimes(2);

        const firstPublishedReply =
          harness.publishAssistantReplyToSource.mock.calls[0]?.[0];
        const secondPublishedReply =
          harness.publishAssistantReplyToSource.mock.calls[1]?.[0];

        expect(firstPublishedReply).toMatchObject({
          agentRunId: memberRunId,
          teamRunId: persistedTeamRunId,
          turnId: firstTurnId,
          replyText: firstReplyText,
          source: expect.objectContaining({
            externalMessageId: firstEnvelope.externalMessageId,
          }),
        });
        expect(secondPublishedReply).toMatchObject({
          agentRunId: memberRunId,
          teamRunId: persistedTeamRunId,
          turnId: secondTurnId,
          replyText: secondReplyText,
          source: expect.objectContaining({
            externalMessageId: secondEnvelope.externalMessageId,
          }),
        });

        const secondReceipt =
          await harness.messageReceiptService.getReceiptByExternalMessage({
            provider: secondEnvelope.provider,
            transport: secondEnvelope.transport,
            accountId: secondEnvelope.accountId,
            peerId: secondEnvelope.peerId,
            threadId: secondEnvelope.threadId,
            externalMessageId: secondEnvelope.externalMessageId,
          });
        expect(secondReceipt).toMatchObject({
          ingressState: "ROUTED",
          agentRunId: memberRunId,
          teamRunId: persistedTeamRunId,
          turnId: secondTurnId,
        });
      } finally {
        await harness.receiptWorkflowRuntime.stop();
        await harness.app.close();
      }
    },
    15_000,
  );

  it("returns ACCEPTED duplicate and reuses the unfinished accepted receipt on repeated externalMessageId", async () => {
    const harness = await createIngressHarness();

    try {
      await harness.bindingService.upsertBinding({
        ...createAgentBindingInput(),
        agentRunId: "agent-run-1",
      });

      const payload = createEnvelope();
      const first = await harness.app.inject({
        method: "POST",
        url: "/api/channel-ingress/v1/messages",
        payload,
      });
      const second = await harness.app.inject({
        method: "POST",
        url: "/api/channel-ingress/v1/messages",
        payload,
      });

      expect(first.statusCode).toBe(202);
      expect(second.statusCode).toBe(202);
      expect(second.json()).toMatchObject({
        accepted: true,
        duplicate: true,
        disposition: "ACCEPTED",
        bindingResolved: false,
      });
      expect(harness.dispatchSpy).toHaveBeenCalledTimes(1);
    } finally {
      await harness.app.close();
    }
  });

  it("returns UNBOUND when no binding matches the inbound route", async () => {
    const harness = await createIngressHarness();

    try {
      const response = await harness.app.inject({
        method: "POST",
        url: "/api/channel-ingress/v1/messages",
        payload: createEnvelope(),
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
      expect(harness.dispatchSpy).not.toHaveBeenCalled();
    } finally {
      await harness.app.close();
    }
  });

  it("uses provider-default binding fallback when enabled", async () => {
    const harness = await createIngressHarness({
      allowTransportFallback: true,
    });

    try {
      await harness.bindingService.upsertBinding({
        ...createAgentBindingInput(),
        transport: ExternalChannelTransport.PERSONAL_SESSION,
        allowTransportFallback: true,
        agentRunId: "agent-run-1",
      });

      const response = await harness.app.inject({
        method: "POST",
        url: "/api/channel-ingress/v1/messages",
        payload: createEnvelope(),
      });

      expect(response.statusCode).toBe(202);
      expect(response.json()).toMatchObject({
        accepted: true,
        duplicate: false,
        disposition: "ACCEPTED",
        bindingResolved: true,
        usedTransportFallback: true,
      });
      expect(harness.dispatchSpy).toHaveBeenCalledOnce();
    } finally {
      await harness.app.close();
    }
  });
});

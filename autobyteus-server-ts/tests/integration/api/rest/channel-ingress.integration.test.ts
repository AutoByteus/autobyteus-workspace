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
import { ChannelTeamRunFacade } from "../../../../src/external-channel/runtime/channel-team-run-facade.js";
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

const createAgentBackendFactory = (input: {
  memoryDir: string;
  runId: string;
  turnId: string;
}): {
  factory: AgentRunBackendFactory;
  postUserMessage: ReturnType<typeof vi.fn>;
} => {
  const postUserMessage = vi.fn().mockResolvedValue({
    accepted: true,
    code: null,
    message: null,
    turnId: input.turnId,
  });

  const createBackendForConfig = (
    config: AgentRunConfig,
    runId: string,
    context?: AgentRunContext<unknown>,
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
      teamContext: config.teamContext,
    });
    const resolvedContext =
      context ??
      new AgentRunContext({
        runId,
        config: normalizedConfig,
        runtimeContext: null,
      });

    return {
      runId,
      runtimeKind: normalizedConfig.runtimeKind,
      getContext: () => resolvedContext as AgentRunContext<any>,
      isActive: () => true,
      getPlatformAgentRunId: () => `platform-${runId}`,
      getStatus: () => "IDLE",
      subscribeToEvents: () => () => undefined,
      postUserMessage,
      approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
      interrupt: vi.fn().mockResolvedValue({ accepted: true }),
      terminate: vi.fn().mockResolvedValue({ accepted: true }),
    };
  };

  return {
    factory: {
      createBackend: vi.fn(async (config, preferredRunId = null) =>
        createBackendForConfig(config, preferredRunId ?? input.runId),
      ),
      restoreBackend: vi.fn(async (context) =>
        createBackendForConfig(context.config, context.runId, context),
      ),
    },
    postUserMessage,
  };
};

const createTeamBackendFactory = (input: {
  teamRunId: string;
  turnId: string;
}): {
  factory: TeamRunBackendFactory;
  postMessage: ReturnType<typeof vi.fn>;
} => {
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
      const targetRouteKey = normalizeMemberRouteKey(
        targetMemberName?.trim() || "Coordinator",
      );
      return {
        accepted: true,
        code: null,
        message: null,
        turnId: input.turnId,
        memberRunId: buildTeamMemberRunId(input.teamRunId, targetRouteKey),
        memberName: targetMemberName?.trim() || "Coordinator",
      };
    },
  );

  const createBackendForConfig = (config: TeamRunConfig): TeamRunBackend => {
    const memberContexts = buildMemberContexts(config);
    return {
      runId: input.teamRunId,
      runtimeKind: config.runtimeKind,
      getRuntimeContext: () =>
        ({
          coordinatorMemberRouteKey:
            memberContexts[0]?.memberRouteKey ?? "Coordinator",
          memberContexts,
        }) as never,
      isActive: () => true,
      getStatus: () => "IDLE",
      subscribeToEvents: () => () => undefined,
      postMessage,
      deliverInterAgentMessage: vi.fn().mockResolvedValue({ accepted: true }),
      approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
      interrupt: vi.fn().mockResolvedValue({ accepted: true }),
      terminate: vi.fn().mockResolvedValue({ accepted: true }),
    };
  };

  return {
    factory: {
      createBackend: vi.fn(async (config) => createBackendForConfig(config)),
      restoreBackend: vi.fn(async (context) => createBackendForConfig(context.config)),
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
            memberRunId: null,
            memberName: binding.targetNodeName ?? null,
            turnId: null,
            dispatchedAt: new Date("2026-03-27T07:00:01.000Z"),
          }
        : {
            dispatchTargetType: "AGENT" as const,
            agentRunId: binding.agentRunId ?? "agent-run-1",
            turnId: "turn-1",
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
    acceptedReceiptRecoveryRuntime: {
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
    turnId: expectedTurnId,
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
      dispatchToBinding: (binding: ChannelBinding, envelope: ReturnType<typeof createEnvelope>) =>
        agentRunFacade.dispatchToAgentBinding(binding, envelope as never),
    } as never,
    messageReceiptService,
    acceptedReceiptRecoveryRuntime: {
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

const createTeamEndToEndIngressHarness = async () => {
  const rootDir = await createTempDir("channel-ingress-team-e2e");
  const workspaceRootPath = path.join(rootDir, "workspace");
  const memoryDir = path.join(rootDir, "memory");
  const bindingsFilePath = path.join(rootDir, "bindings.json");
  const receiptsFilePath = path.join(rootDir, "message-receipts.json");
  const expectedTeamRunId = "team-run-e2e";
  const expectedTurnId = "turn-team-e2e";
  const expectedMemberRunId = buildTeamMemberRunId(
    expectedTeamRunId,
    "Coordinator",
  );

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
    turnId: expectedTurnId,
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
      dispatchToBinding: (binding: ChannelBinding, envelope: ReturnType<typeof createEnvelope>) =>
        teamRunFacade.dispatchToTeamBinding(binding, envelope as never),
    } as never,
    messageReceiptService,
    acceptedReceiptRecoveryRuntime: {
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
      const turnId = String(acceptedReceipt?.turnId ?? "");
      expect(agentRunId.length).toBeGreaterThan(0);
      expect(turnId.length).toBeGreaterThan(0);

      const source = await harness.messageReceiptService.getSourceByAgentRunTurn(
        agentRunId,
        turnId,
      );
      expect(source).toMatchObject({
        provider: ExternalChannelProvider.WHATSAPP,
        transport: ExternalChannelTransport.BUSINESS_API,
        externalMessageId: "msg-1",
      });

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

      const source = await harness.messageReceiptService.getSourceByAgentRunTurn(
        harness.expectedMemberRunId,
        harness.expectedTurnId,
      );
      expect(source).toMatchObject({
        provider: ExternalChannelProvider.WHATSAPP,
        transport: ExternalChannelTransport.BUSINESS_API,
        externalMessageId: "msg-1",
      });

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

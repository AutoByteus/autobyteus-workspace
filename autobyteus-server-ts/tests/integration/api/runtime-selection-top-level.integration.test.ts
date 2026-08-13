import "reflect-metadata";
import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import fastify, { type FastifyInstance } from "fastify";
import mercurius from "mercurius";
import websocket from "@fastify/websocket";
import { WebSocket } from "ws";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Query, Resolver, buildSchema } from "type-graphql";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { TeamMember, AgentTeamDefinition } from "../../../src/agent-team-definition/domain/models.js";
import { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import type { AgentRunSourceEventBatchListener } from "../../../src/agent-execution/backends/agent-run-backend.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import { AgentRunMetadataService } from "../../../src/run-history/services/agent-run-metadata-service.js";
import { AgentRunStatusProjectionService } from "../../../src/agent-execution/services/agent-run-status-projection-service.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import type { MemberTeamContext } from "../../../src/agent-team-execution/domain/member-team-context.js";
import { buildInterAgentMessageDeliveryIntentFromRecipientAddress } from "../../../src/agent-team-execution/services/inter-agent-message-delivery-intent-builder.js";
import { TeamRunMetadataService } from "../../../src/run-history/services/team-run-metadata-service.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { MixedTeamRunBackendFactory } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.js";
import { MixedTeamManager } from "../../../src/agent-team-execution/backends/mixed/mixed-team-manager.js";
import { registerAgentWebsocket } from "../../../src/api/websocket/agent.js";
import { AgentStreamHandler } from "../../../src/services/agent-streaming/agent-stream-handler.js";
import { AgentTeamStreamHandler } from "../../../src/services/agent-streaming/agent-team-stream-handler.js";

let currentAgentRunService: import("../../../src/agent-execution/services/agent-run-service.js").AgentRunService | null = null;
let currentTeamRunService: import("../../../src/agent-team-execution/services/team-run-service.js").TeamRunService | null = null;

vi.mock("../../../src/agent-execution/services/agent-run-service.js", async () => {
  const actual = await vi.importActual<typeof import("../../../src/agent-execution/services/agent-run-service.js")>(
    "../../../src/agent-execution/services/agent-run-service.js",
  );
  return {
    ...actual,
    getAgentRunService: () => {
      if (!currentAgentRunService) {
        throw new Error("Current agent run service test harness is not initialized.");
      }
      return currentAgentRunService;
    },
  };
});

vi.mock("../../../src/agent-team-execution/services/team-run-service.js", async () => {
  const actual = await vi.importActual<typeof import("../../../src/agent-team-execution/services/team-run-service.js")>(
    "../../../src/agent-team-execution/services/team-run-service.js",
  );
  return {
    ...actual,
    getTeamRunService: () => {
      if (!currentTeamRunService) {
        throw new Error("Current team run service test harness is not initialized.");
      }
      return currentTeamRunService;
    },
  };
});

const tempPaths = new Set<string>();

const trackTempPath = (targetPath: string): string => {
  tempPaths.add(targetPath);
  return targetPath;
};

const createTempDir = async (prefix: string): Promise<string> => {
  const dir = await mkdtemp(path.join(os.tmpdir(), `${prefix}-`));
  return trackTempPath(dir);
};

const waitForCondition = async (fn: () => boolean, timeoutMs = 3000): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fn()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Timed out waiting for condition");
};

const buildTestDeliveryRequest = (
  memberTeamContext: MemberTeamContext,
  recipientAddress: string,
  content: string,
) => {
  const result = buildInterAgentMessageDeliveryIntentFromRecipientAddress({
    memberTeamContext,
    recipientAddress,
    content,
    messageType: "agent_message",
  });
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(result.message);
  }
  return result.intent;
};

type SocketHarness = {
  socket: WebSocket;
  nextMessage: () => Promise<string>;
};

const openSocket = async (url: string): Promise<SocketHarness> => {
  const socket = new WebSocket(url);
  const queuedMessages: string[] = [];
  const pendingResolvers: Array<(message: string) => void> = [];

  socket.on("message", (data) => {
    const message = data.toString();
    const resolve = pendingResolvers.shift();
    if (resolve) {
      resolve(message);
      return;
    }
    queuedMessages.push(message);
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timed out waiting for websocket open")), 3000);
    socket.once("open", () => {
      clearTimeout(timeout);
      resolve();
    });
    socket.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });

  return {
    socket,
    nextMessage: () =>
      new Promise((resolve, reject) => {
        const queued = queuedMessages.shift();
        if (queued) {
          resolve(queued);
          return;
        }
        const timeout = setTimeout(() => reject(new Error("Timed out waiting for websocket message")), 3000);
        pendingResolvers.push((message) => {
          clearTimeout(timeout);
          resolve(message);
        });
        socket.once("error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      }),
  };
};

type CapturedAgentMessage = {
  runId: string;
  runtimeKind: RuntimeKind;
  content: string;
  contextFileCount: number;
  source: "create" | "restore";
};

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

const resolveRestorePlatformId = (runtimeContext: unknown): string | null => {
  if (!runtimeContext || typeof runtimeContext !== "object") {
    return null;
  }
  if ("threadId" in runtimeContext && typeof runtimeContext.threadId === "string") {
    return runtimeContext.threadId;
  }
  if ("sessionId" in runtimeContext && typeof runtimeContext.sessionId === "string") {
    return runtimeContext.sessionId;
  }
  if ("nativeAgentId" in runtimeContext && typeof runtimeContext.nativeAgentId === "string") {
    return runtimeContext.nativeAgentId;
  }
  return null;
};

const buildAgentRun = (input: {
  runId: string;
  config: AgentRunConfig;
  runtimeContext: unknown;
  platformAgentRunId: string | null;
  source: "create" | "restore";
  messages: CapturedAgentMessage[];
}): AgentRun => {
  let active = true;
  let turnCounter = 0;
  const listeners = new Set<AgentRunSourceEventBatchListener>();
  const context = new AgentRunContext({
    runId: input.runId,
    config: input.config,
    runtimeContext: input.runtimeContext,
  });

  const backend = {
    runId: input.runId,
    runtimeKind: input.config.runtimeKind,
    inputCapabilities: {
      activeTurnAppend: input.config.runtimeKind === RuntimeKind.CODEX_APP_SERVER
        ? "supported" as const
        : "unsupported" as const,
    },
    getContext: () => context,
    isActive: () => active,
    getPlatformAgentRunId: () => input.platformAgentRunId,
    getLifecycleSnapshot: () => ({
      availability: active ? "active" as const : "offline" as const,
      phase: "idle" as const,
      currentTurn: { kind: "NONE" as const },
    }),
    subscribeToSourceEventBatches: (listener: AgentRunSourceEventBatchListener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispatchUserInput: vi.fn(async (dispatch: {
      message: { content: string; contextFiles?: unknown[] | null };
    }) => {
      turnCounter += 1;
      const turnId = `turn-${input.runId}-${turnCounter}`;
      input.messages.push({
        runId: input.runId,
        runtimeKind: input.config.runtimeKind,
        content: dispatch.message.content,
        contextFileCount: dispatch.message.contextFiles?.length ?? 0,
        source: input.source,
      });
      queueMicrotask(() => {
        const events = [{
          eventType: AgentRunEventType.TURN_STARTED,
          runId: input.runId,
          payload: { turn_id: turnId },
          statusHint: "ACTIVE" as const,
        }];
        for (const listener of listeners) {
          void listener(events);
        }
      });
      return {
        forwarded: true,
        turnId,
      };
    }),
    approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
    interrupt: vi.fn().mockResolvedValue({ accepted: true }),
    terminate: vi.fn().mockImplementation(async () => {
      active = false;
      return { accepted: true };
    }),
  };

  return new AgentRun({
    context,
    backend: backend as never,
  });
};

class FakeAgentRunManager {
  readonly createCalls: AgentRunConfig[] = [];
  readonly restoreCalls: AgentRunContext[] = [];
  readonly messages: CapturedAgentMessage[] = [];
  private readonly activeRuns = new Map<string, AgentRun>();
  private runCounter = 0;

  hasActiveRun(runId: string): boolean {
    return this.getActiveRun(runId) !== null;
  }

  getActiveRun(runId: string): AgentRun | null {
    const run = this.activeRuns.get(runId) ?? null;
    if (!run) {
      return null;
    }
    if (!run.isActive()) {
      this.activeRuns.delete(runId);
      return null;
    }
    return run;
  }

  async createAgentRun(config: AgentRunConfig, preferredRunId: string | null = null): Promise<AgentRun> {
    const runId = preferredRunId ?? `${config.runtimeKind}-run-${++this.runCounter}`;
    this.createCalls.push(config);
    const run = buildAgentRun({
      runId,
      config,
      runtimeContext: null,
      platformAgentRunId: `${config.runtimeKind}-platform-${runId}`,
      source: "create",
      messages: this.messages,
    });
    this.activeRuns.set(runId, run);
    return run;
  }

  async restoreAgentRun(context: AgentRunContext): Promise<AgentRun> {
    this.restoreCalls.push(context);
    const run = buildAgentRun({
      runId: context.runId,
      config: context.config,
      runtimeContext: context.runtimeContext,
      platformAgentRunId:
        resolveRestorePlatformId(context.runtimeContext) ?? `${context.config.runtimeKind}-restored-${context.runId}`,
      source: "restore",
      messages: this.messages,
    });
    this.activeRuns.set(context.runId, run);
    return run;
  }

  async restoreAgentRunFromPlatformState(input: {
    runId: string;
    config: AgentRunConfig;
    platformAgentRunId: string | null;
  }): Promise<AgentRun> {
    const runtimeContext = input.platformAgentRunId
      ? input.config.runtimeKind === RuntimeKind.CODEX_APP_SERVER
        ? { threadId: input.platformAgentRunId }
        : input.config.runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK
          ? { sessionId: input.platformAgentRunId }
          : null
      : null;
    return this.restoreAgentRun(new AgentRunContext({
      runId: input.runId,
      config: input.config,
      runtimeContext: runtimeContext as never,
    }));
  }

  async terminateAgentRun(runId: string): Promise<boolean> {
    const run = this.getActiveRun(runId);
    if (!run) {
      return false;
    }
    const result = await run.terminate();
    if (!result.accepted) {
      return false;
    }
    this.activeRuns.delete(runId);
    return true;
  }
}

type ValidationHarness = {
  app: FastifyInstance;
  baseUrl: string;
  workspaceRootPath: string;
  agentRunService: import("../../../src/agent-execution/services/agent-run-service.js").AgentRunService;
  teamRunService: import("../../../src/agent-team-execution/services/team-run-service.js").TeamRunService;
  teamRunMetadataService: TeamRunMetadataService;
  standaloneAgentRunManager: FakeAgentRunManager;
  mixedMemberRunManager: FakeAgentRunManager;
  mixedFactory: {
    createBackend: ReturnType<typeof vi.fn>;
    restoreBackend: ReturnType<typeof vi.fn>;
  };
};

const executeGraphql = async (app: FastifyInstance, query: string, variables: Record<string, unknown>) => {
  const response = await app.inject({
    method: "POST",
    url: "/graphql",
    payload: {
      query,
      variables,
    },
  });
  expect(response.statusCode).toBe(200);
  return response.json() as Record<string, any>;
};

@Resolver()
class ValidationHealthQueryResolver {
  @Query(() => String)
  validationHealth(): string {
    return "ok";
  }
}

const createValidationHarness = async (): Promise<ValidationHarness> => {
  const rootDir = await createTempDir("runtime-selection-top-level-e2e");
  const workspaceRootPath = path.join(rootDir, "workspace");
  const memoryDir = path.join(rootDir, "memory");
  await mkdir(workspaceRootPath, { recursive: true });

  const workspaceManager = createWorkspaceManager();
  const standaloneAgentRunManager = new FakeAgentRunManager();
  const mixedMemberRunManager = new FakeAgentRunManager();
  let allocatedRunCounter = 0;
  const agentRunIdentityAllocator = {
    allocateForAgentDefinition: vi.fn(async (agentDefinitionId: string) => {
      allocatedRunCounter += 1;
      const slug = agentDefinitionId
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || "agent";
      return `${slug}_${allocatedRunCounter.toString(16).padStart(32, "0")}`;
    }),
  };
  const delegatedMixedFactory = new MixedTeamRunBackendFactory({
    createTeamManager: (context) =>
      new MixedTeamManager(context, {
        agentRunManager: mixedMemberRunManager as never,
      }),
  });
  const mixedFactory = {
    createBackend: vi.fn((
      config: Parameters<typeof delegatedMixedFactory.createBackend>[0],
      teamRunId: string,
    ) =>
      delegatedMixedFactory.createBackend(config, teamRunId),
    ),
    restoreBackend: vi.fn((context: Parameters<typeof delegatedMixedFactory.restoreBackend>[0]) =>
      delegatedMixedFactory.restoreBackend(context),
    ),
  };

  const { AgentRunService } = await import("../../../src/agent-execution/services/agent-run-service.js");
  const { TeamRunService } = await import("../../../src/agent-team-execution/services/team-run-service.js");
  const agentMetadataService = new AgentRunMetadataService(memoryDir);
  const teamRunMetadataService = new TeamRunMetadataService(memoryDir);

  const agentRunService = new AgentRunService(memoryDir, {
    agentRunManager: standaloneAgentRunManager as never,
    metadataService: agentMetadataService,
    historyCatalogService: {
      recordPreparedRun: vi.fn(async ({ runId, metadata }: { runId: string; metadata: any }) => {
        await agentMetadataService.writeMetadata(runId, metadata);
        return metadata;
      }),
      recordRunStarted: vi.fn(async ({
        runId,
        platformAgentRunId,
        startedAt,
      }: {
        runId: string;
        platformAgentRunId: string | null;
        startedAt: string;
      }) => {
        const metadata = await agentMetadataService.readMetadata(runId);
        if (!metadata) {
          return null;
        }
        const updated = {
          ...metadata,
          platformAgentRunId,
          startedAt,
          preparedAt: null,
          preparedExpiresAt: null,
        };
        await agentMetadataService.writeMetadata(runId, updated);
        return updated;
      }),
      recordRunActivity: vi.fn().mockResolvedValue(undefined),
      recordRunSummary: vi.fn().mockResolvedValue(undefined),
      recordRunRestored: vi.fn().mockResolvedValue(undefined),
      recordRunTerminated: vi.fn().mockResolvedValue(undefined),
    } as never,
    workspaceManager: workspaceManager as never,
    agentRunIdentityAllocator,
  });

  const teamDefinitions = new Map<string, AgentTeamDefinition>([
    [
      "team-def-autobyteus",
      new AgentTeamDefinition({
        id: "team-def-autobyteus",
        name: "AutoByteus Team",
        description: "Single-runtime AutoByteus team",
        instructions: "Coordinate with the native team manager",
        coordinatorMemberName: "Coordinator",
        nodes: [
          new TeamMember({ memberName: "Coordinator", ref: "agent-coordinator", refType: "agent", refScope: "shared" }),
          new TeamMember({ memberName: "Reviewer", ref: "agent-reviewer", refType: "agent", refScope: "shared" }),
        ],
      }),
    ],
    [
      "team-def-mixed",
      new AgentTeamDefinition({
        id: "team-def-mixed",
        name: "Mixed Runtime Team",
        description: "Mixed AutoByteus + Codex team",
        instructions: "Use mixed runtime orchestration",
        coordinatorMemberName: "Coordinator",
        nodes: [
          new TeamMember({ memberName: "Coordinator", ref: "agent-coordinator", refType: "agent", refScope: "shared" }),
          new TeamMember({ memberName: "Specialist", ref: "agent-specialist", refType: "agent", refScope: "shared" }),
        ],
      }),
    ],
  ]);

  const teamRunManager = new AgentTeamRunManager({
    mixedTeamRunBackendFactory: mixedFactory as never,
    teamCommunicationService: { attachToTeamRun: vi.fn(() => () => undefined) } as never,
    runFileChangeService: { attachToTeamRun: vi.fn(() => () => undefined) } as never,
  });
  const teamRunHistoryCatalogService = {
    recordTeamRunCreated: vi.fn(async ({
      teamRunId,
      metadata,
    }: {
      teamRunId: string;
      metadata: any;
    }) => {
      await teamRunMetadataService.writeMetadata(teamRunId, metadata);
    }),
    recordTeamRunRestored: vi.fn(async ({
      teamRunId,
      metadata,
    }: {
      teamRunId: string;
      metadata: any;
    }) => {
      await teamRunMetadataService.writeMetadata(teamRunId, metadata);
    }),
    refreshTeamRunMetadata: vi.fn(async ({
      teamRunId,
      metadata,
    }: {
      teamRunId: string;
      metadata: any;
    }) => {
      await teamRunMetadataService.writeMetadata(teamRunId, metadata);
    }),
    recordTeamRunSummary: vi.fn().mockResolvedValue(undefined),
    recordTeamRunTerminated: vi.fn().mockResolvedValue(undefined),
  };

  const teamRunService = new TeamRunService({
    agentTeamRunManager: teamRunManager,
    teamDefinitionService: {
      getDefinitionById: vi.fn(async (teamDefinitionId: string) =>
        teamDefinitions.get(teamDefinitionId) ?? null,
      ),
    } as never,
    teamRunMetadataService,
    teamRunHistoryCatalogService,
    workspaceManager: workspaceManager as never,
    memoryDir,
    agentRunIdentityAllocator,
  });

  currentAgentRunService = agentRunService;
  currentTeamRunService = teamRunService;

  const [{ AgentRunResolver }, { AgentTeamRunResolver }] = await Promise.all([
    import("../../../src/api/graphql/types/agent-run.js"),
    import("../../../src/api/graphql/types/agent-team-run.js"),
  ]);

  const schema = await buildSchema({
    resolvers: [ValidationHealthQueryResolver, AgentRunResolver, AgentTeamRunResolver],
  });

  const app = fastify();
  await app.register(mercurius, {
    schema,
    path: "/graphql",
    graphiql: false,
  });
  await app.register(websocket);
  await registerAgentWebsocket(
    app,
    new AgentStreamHandler(
      undefined,
      agentRunService,
      undefined,
      undefined,
      undefined,
      new AgentRunStatusProjectionService({
        agentRunManager: standaloneAgentRunManager as never,
        metadataService: agentMetadataService,
      }),
    ),
    new AgentTeamStreamHandler(undefined, teamRunService),
  );

  const address = await app.listen({ port: 0, host: "127.0.0.1" });

  return {
    app,
    baseUrl: `ws://127.0.0.1:${new URL(address).port}`,
    workspaceRootPath,
    agentRunService,
    teamRunService,
    teamRunMetadataService,
    standaloneAgentRunManager,
    mixedMemberRunManager,
    mixedFactory,
  };
};

afterEach(async () => {
  currentAgentRunService = null;
  currentTeamRunService = null;
  await Promise.all(
    [...tempPaths].map((targetPath) => rm(targetPath, { force: true, recursive: true })),
  );
  tempPaths.clear();
  vi.clearAllMocks();
});

describe("runtime-selection top-level integration", () => {
  it("keeps standalone agent create + websocket messaging working", async () => {
    const harness = await createValidationHarness();

    try {
      const createResult = await executeGraphql(
        harness.app,
        `mutation CreateAgentRun($input: CreateAgentRunInput!) {
          createAgentRun(input: $input) {
            success
            message
            runId
          }
        }`,
        {
          input: {
            agentDefinitionId: "agent-standalone",
            workspaceRootPath: harness.workspaceRootPath,
            llmModelIdentifier: "gpt-test",
            autoExecuteTools: false,
            skillAccessMode: SkillAccessMode.NONE,
            runtimeKind: RuntimeKind.AUTOBYTEUS,
          },
        },
      );

      expect(createResult.data.createAgentRun).toMatchObject({
        success: true,
      });
      const runId = createResult.data.createAgentRun.runId as string;
      expect(runId).toBeTruthy();

      const { socket, nextMessage } = await openSocket(`${harness.baseUrl}/ws/agent/${runId}`);
      try {
        const connectedMessage = JSON.parse(await nextMessage()) as {
          type: string;
          payload: { agent_id: string };
        };
        expect(connectedMessage.type).toBe("CONNECTED");
        expect(connectedMessage.payload.agent_id).toBe(runId);

        socket.send(
          JSON.stringify({
            type: "SEND_MESSAGE",
            payload: {
              message_id: "msg-standalone-1",
              dedupe_key: "dedupe-standalone-1",
              content: "hello standalone agent",
              context_file_paths: [path.join(harness.workspaceRootPath, "notes.txt")],
            },
          }),
        );

        await waitForCondition(() => harness.standaloneAgentRunManager.messages.length === 1);
        expect(harness.standaloneAgentRunManager.createCalls).toHaveLength(1);
        expect(harness.standaloneAgentRunManager.createCalls[0]?.runtimeKind).toBe(RuntimeKind.AUTOBYTEUS);
        expect(harness.standaloneAgentRunManager.messages[0]).toMatchObject({
          runtimeKind: RuntimeKind.AUTOBYTEUS,
          content: "hello standalone agent",
          contextFileCount: 1,
          source: "create",
        });
      } finally {
        socket.close();
      }
    } finally {
      await harness.app.close();
    }
  });

  it("keeps same-runtime autobyteus team creation and websocket messaging on the mixed team backend", async () => {
    const harness = await createValidationHarness();

    try {
      const createResult = await executeGraphql(
        harness.app,
        `mutation CreateAgentTeamRun($input: CreateAgentTeamRunInput!) {
          createAgentTeamRun(input: $input) {
            success
            message
            teamRunId
          }
        }`,
        {
          input: {
            teamDefinitionId: "team-def-autobyteus",
            memberConfigs: [
              {
                memberAddress: "/Coordinator",
                agentDefinitionId: "agent-coordinator",
                llmModelIdentifier: "gpt-test",
                autoExecuteTools: false,
                skillAccessMode: SkillAccessMode.NONE,
                workspaceRootPath: harness.workspaceRootPath,
                runtimeKind: RuntimeKind.AUTOBYTEUS,
              },
              {
                memberAddress: "/Reviewer",
                agentDefinitionId: "agent-reviewer",
                llmModelIdentifier: "gpt-test",
                autoExecuteTools: false,
                skillAccessMode: SkillAccessMode.NONE,
                workspaceRootPath: harness.workspaceRootPath,
                runtimeKind: RuntimeKind.AUTOBYTEUS,
              },
            ],
          },
        },
      );

      expect(createResult.data.createAgentTeamRun).toMatchObject({
        success: true,
      });
      const teamRunId = createResult.data.createAgentTeamRun.teamRunId as string;
      expect(teamRunId).toBeTruthy();
      expect(harness.mixedFactory.createBackend).toHaveBeenCalledTimes(1);
      expect(harness.teamRunService.getTeamRun(teamRunId)?.teamBackendKind).toBe(TeamBackendKind.MIXED);

      const { socket, nextMessage } = await openSocket(`${harness.baseUrl}/ws/agent-team/${teamRunId}`);
      try {
        const connectedMessage = JSON.parse(await nextMessage()) as {
          type: string;
          payload: { session_id: string };
        };
        expect(connectedMessage.type).toBe("CONNECTED");
        expect(connectedMessage.payload.session_id).toEqual(expect.any(String));

        socket.send(
          JSON.stringify({
            type: "SEND_MESSAGE",
            payload: {
              message_id: "msg-team-autobyteus-1",
              dedupe_key: "dedupe-team-autobyteus-1",
              content: "hello mixed-only team",
              context_file_paths: [],
              image_urls: [],
              execution_address: {
                root_team_run_id: teamRunId,
                task_team_run_ids: [],
                member_address: "/Coordinator",
                task_agent_run_id: null,
              },
            },
          }),
        );

        await waitForCondition(() => harness.mixedMemberRunManager.messages.length === 1);
        expect(harness.mixedMemberRunManager.createCalls[0]).toMatchObject({
          runtimeKind: RuntimeKind.AUTOBYTEUS,
          memberTeamContext: expect.objectContaining({ memberAddress: "/Coordinator" }),
        });
        expect(harness.mixedMemberRunManager.createCalls[0]?.memberTeamContext?.teamBackendKind).toBe(TeamBackendKind.MIXED);
        expect(harness.mixedMemberRunManager.messages[0]).toMatchObject({
          runtimeKind: RuntimeKind.AUTOBYTEUS,
          content: "hello mixed-only team",
          source: "create",
        });
      } finally {
        socket.close();
      }
    } finally {
      await harness.app.close();
    }
  });

  it("creates, restores, and routes a mixed autobyteus+codex team through top-level graphql + websocket surfaces", async () => {
    const harness = await createValidationHarness();

    try {
      const createResult = await executeGraphql(
        harness.app,
        `mutation CreateAgentTeamRun($input: CreateAgentTeamRunInput!) {
          createAgentTeamRun(input: $input) {
            success
            message
            teamRunId
          }
        }`,
        {
          input: {
            teamDefinitionId: "team-def-mixed",
            memberConfigs: [
              {
                memberAddress: "/Coordinator",
                agentDefinitionId: "agent-coordinator",
                llmModelIdentifier: "gpt-test",
                autoExecuteTools: false,
                skillAccessMode: SkillAccessMode.NONE,
                workspaceRootPath: harness.workspaceRootPath,
                runtimeKind: RuntimeKind.AUTOBYTEUS,
              },
              {
                memberAddress: "/Specialist",
                agentDefinitionId: "agent-specialist",
                llmModelIdentifier: "gpt-test",
                autoExecuteTools: false,
                skillAccessMode: SkillAccessMode.NONE,
                workspaceRootPath: harness.workspaceRootPath,
                runtimeKind: RuntimeKind.CODEX_APP_SERVER,
              },
            ],
          },
        },
      );

      expect(createResult.data.createAgentTeamRun).toMatchObject({
        success: true,
      });
      const teamRunId = createResult.data.createAgentTeamRun.teamRunId as string;
      expect(teamRunId).toBeTruthy();
      expect(harness.mixedFactory.createBackend).toHaveBeenCalledTimes(1);

      const createdRun = harness.teamRunService.getTeamRun(teamRunId);
      expect(createdRun?.teamBackendKind).toBe(TeamBackendKind.MIXED);

      const { socket, nextMessage } = await openSocket(`${harness.baseUrl}/ws/agent-team/${teamRunId}`);
      try {
        const connectedMessage = JSON.parse(await nextMessage()) as {
          type: string;
          payload: { session_id: string };
        };
        expect(connectedMessage.type).toBe("CONNECTED");
        expect(connectedMessage.payload.session_id).toEqual(expect.any(String));

        socket.send(
          JSON.stringify({
            type: "SEND_MESSAGE",
            payload: {
              message_id: "msg-team-mixed-1",
              dedupe_key: "dedupe-team-mixed-1",
              content: "coordinate the mixed fix",
              context_file_paths: [],
              image_urls: [],
              execution_address: {
                root_team_run_id: teamRunId,
                task_team_run_ids: [],
                member_address: "/Coordinator",
                task_agent_run_id: null,
              },
            },
          }),
        );

        await waitForCondition(() => harness.mixedMemberRunManager.createCalls.length === 1);
        const coordinatorCreateConfig = harness.mixedMemberRunManager.createCalls[0]!;
        expect(coordinatorCreateConfig.runtimeKind).toBe(RuntimeKind.AUTOBYTEUS);
        expect(coordinatorCreateConfig.memberTeamContext?.teamBackendKind).toBe(TeamBackendKind.MIXED);
        expect(coordinatorCreateConfig.memberTeamContext?.collaboration.addressing).toEqual({
          rootTeamRunId: teamRunId,
          memberAddress: "/Coordinator",
        });
        expect(coordinatorCreateConfig.memberTeamContext).not.toHaveProperty("allowedRecipientAddresss");
        expect(harness.mixedMemberRunManager.messages[0]).toMatchObject({
          runtimeKind: RuntimeKind.AUTOBYTEUS,
          content: "coordinate the mixed fix",
          source: "create",
        });

        expect(coordinatorCreateConfig.memberTeamContext).toBeTruthy();
        await coordinatorCreateConfig.memberTeamContext?.collaboration.deliverInterAgentMessage?.(
          buildTestDeliveryRequest(
            coordinatorCreateConfig.memberTeamContext,
            "./Specialist",
            "Please validate the patch.",
          ),
        );

        await waitForCondition(() => harness.mixedMemberRunManager.createCalls.length === 2);
        const specialistCreateConfig = harness.mixedMemberRunManager.createCalls[1]!;
        expect(specialistCreateConfig.runtimeKind).toBe(RuntimeKind.CODEX_APP_SERVER);
        expect(harness.mixedMemberRunManager.messages[1]?.content).toContain(
          "You received a message from sender name: Coordinator",
        );
        expect(harness.mixedMemberRunManager.messages[1]?.content).toContain("Please validate the patch.");

        await harness.teamRunService.refreshRunMetadata(createdRun!);
        const metadata = await harness.teamRunMetadataService.readMetadata(teamRunId);
        expect(metadata?.rootTeam.children).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              address: "/Coordinator",
              runtimeKind: RuntimeKind.AUTOBYTEUS,
              platformAgentRunId: expect.any(String),
            }),
            expect.objectContaining({
              address: "/Specialist",
              runtimeKind: RuntimeKind.CODEX_APP_SERVER,
              platformAgentRunId: expect.any(String),
            }),
          ]),
        );

        const terminateResult = await executeGraphql(
          harness.app,
          `mutation TerminateAgentTeamRun($teamRunId: String!) {
            terminateAgentTeamRun(teamRunId: $teamRunId) {
              success
              message
            }
          }`,
          { teamRunId },
        );
        expect(terminateResult.data.terminateAgentTeamRun).toMatchObject({ success: true });
        expect(harness.teamRunService.getTeamRun(teamRunId)).toBeNull();

        const restoreResult = await executeGraphql(
          harness.app,
          `mutation RestoreAgentTeamRun($teamRunId: String!) {
            restoreAgentTeamRun(teamRunId: $teamRunId) {
              success
              message
              teamRunId
            }
          }`,
          { teamRunId },
        );
        expect(restoreResult.data.restoreAgentTeamRun).toMatchObject({
          success: true,
          teamRunId,
        });
        expect(harness.mixedFactory.restoreBackend).toHaveBeenCalledTimes(1);
        expect(harness.teamRunService.getTeamRun(teamRunId)?.teamBackendKind).toBe(TeamBackendKind.MIXED);

        const { socket: restoredSocket, nextMessage: nextRestoredMessage } = await openSocket(
          `${harness.baseUrl}/ws/agent-team/${teamRunId}`,
        );
        try {
          await nextRestoredMessage();

          restoredSocket.send(
            JSON.stringify({
              type: "SEND_MESSAGE",
              payload: {
                message_id: "msg-team-mixed-restore-1",
                dedupe_key: "dedupe-team-mixed-restore-1",
                content: "resume mixed coordination",
                context_file_paths: [],
                image_urls: [],
                execution_address: {
                  root_team_run_id: teamRunId,
                  task_team_run_ids: [],
                  member_address: "/Coordinator",
                  task_agent_run_id: null,
                },
              },
            }),
          );

          await waitForCondition(() => harness.mixedMemberRunManager.restoreCalls.length === 1);
          const coordinatorRestoreContext = harness.mixedMemberRunManager.restoreCalls[0]!;
          expect(coordinatorRestoreContext.config.runtimeKind).toBe(RuntimeKind.AUTOBYTEUS);
          expect(coordinatorRestoreContext.config.memberTeamContext?.collaboration.addressing).toEqual({
            rootTeamRunId: teamRunId,
            memberAddress: "/Coordinator",
          });
          expect(harness.mixedMemberRunManager.messages[2]).toMatchObject({
            runtimeKind: RuntimeKind.AUTOBYTEUS,
            content: "resume mixed coordination",
            source: "restore",
          });

          expect(coordinatorRestoreContext.config.memberTeamContext).toBeTruthy();
          await coordinatorRestoreContext.config.memberTeamContext?.collaboration.deliverInterAgentMessage?.(
            buildTestDeliveryRequest(
              coordinatorRestoreContext.config.memberTeamContext,
              "./Specialist",
              "Please resume the review.",
            ),
          );

          await waitForCondition(() => harness.mixedMemberRunManager.restoreCalls.length === 2);
          const specialistRestoreContext = harness.mixedMemberRunManager.restoreCalls[1]!;
          const specialistMetadata = metadata?.rootTeam.children.find((member) => member.address === "/Specialist");
          expect(specialistRestoreContext.config.runtimeKind).toBe(RuntimeKind.CODEX_APP_SERVER);
          expect(specialistRestoreContext.config.memberTeamContext?.collaboration.addressing).toEqual({
            rootTeamRunId: teamRunId,
            memberAddress: "/Specialist",
          });
          expect((specialistRestoreContext.runtimeContext as { threadId?: string | null })?.threadId).toBe(
            specialistMetadata?.platformAgentRunId,
          );
          expect(harness.mixedMemberRunManager.messages[3]?.content).toContain(
            "You received a message from sender name: Coordinator",
          );
          expect(harness.mixedMemberRunManager.messages[3]?.content).toContain("Please resume the review.");
        } finally {
          restoredSocket.close();
        }
      } finally {
        socket.close();
      }
    } finally {
      await harness.app.close();
    }
  });
});

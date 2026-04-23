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
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRunMetadataService } from "../../../src/run-history/services/agent-run-metadata-service.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { buildTeamMemberRunId, normalizeMemberRouteKey } from "../../../src/run-history/utils/team-member-run-id.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
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
  const listeners = new Set<(event: unknown) => void>();
  const context = new AgentRunContext({
    runId: input.runId,
    config: input.config,
    runtimeContext: input.runtimeContext,
  });

  const backend = {
    runId: input.runId,
    runtimeKind: input.config.runtimeKind,
    getContext: () => context,
    isActive: () => active,
    getPlatformAgentRunId: () => input.platformAgentRunId,
    getStatus: () => "IDLE",
    subscribeToEvents: (listener: (event: unknown) => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    postUserMessage: vi.fn(async (message: { content: string; contextFiles?: unknown[] | null }) => {
      turnCounter += 1;
      input.messages.push({
        runId: input.runId,
        runtimeKind: input.config.runtimeKind,
        content: message.content,
        contextFileCount: message.contextFiles?.length ?? 0,
        source: input.source,
      });
      return {
        accepted: true,
        code: null,
        message: null,
        turnId: `turn-${input.runId}-${turnCounter}`,
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

type CapturedTeamMessage = {
  teamRunId: string;
  targetMemberName: string | null;
  content: string;
  source: "create" | "restore";
};

const createAutoByteusTeamBackendFactory = () => {
  const createCalls: unknown[] = [];
  const restoreCalls: unknown[] = [];
  const messages: CapturedTeamMessage[] = [];
  let runCounter = 0;

  const createBackend = (config: { memberConfigs: Array<{ memberName: string; memberRouteKey?: string | null }> }, runId: string, source: "create" | "restore") => {
    let active = true;
    let turnCounter = 0;
    const listeners = new Set<(event: unknown) => void>();
    const memberContexts = config.memberConfigs.map((memberConfig) => {
      const memberRouteKey = normalizeMemberRouteKey(memberConfig.memberRouteKey ?? memberConfig.memberName);
      const memberRunId = buildTeamMemberRunId(runId, memberRouteKey);
      return {
        memberName: memberConfig.memberName,
        memberRouteKey,
        memberRunId,
        getPlatformAgentRunId: () => `autobyteus-team-platform-${memberRunId}`,
      };
    });

    return {
      runId,
      teamBackendKind: TeamBackendKind.AUTOBYTEUS,
      getRuntimeContext: () => ({
        coordinatorMemberRouteKey: memberContexts[0]?.memberRouteKey ?? null,
        memberContexts,
      }),
      isActive: () => active,
      getStatus: () => "IDLE",
      subscribeToEvents: (listener: (event: unknown) => void) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      postMessage: vi.fn(async (message: { content: string }, targetMemberName: string | null) => {
        turnCounter += 1;
        const targetName = targetMemberName?.trim() || memberContexts[0]?.memberName || null;
        const targetRouteKey = normalizeMemberRouteKey(targetName ?? memberContexts[0]?.memberName ?? "Coordinator");
        messages.push({
          teamRunId: runId,
          targetMemberName: targetName,
          content: message.content,
          source,
        });
        return {
          accepted: true,
          memberRunId: buildTeamMemberRunId(runId, targetRouteKey),
          memberName: targetName,
          turnId: `turn-${runId}-${turnCounter}`,
        };
      }),
      deliverInterAgentMessage: vi.fn().mockResolvedValue({ accepted: true }),
      approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
      interrupt: vi.fn().mockResolvedValue({ accepted: true }),
      terminate: vi.fn().mockImplementation(async () => {
        active = false;
        return { accepted: true };
      }),
    };
  };

  return {
    createCalls,
    restoreCalls,
    messages,
    getTeam: vi.fn(() => null),
    createBackend: vi.fn(async (config: { memberConfigs: Array<{ memberName: string; memberRouteKey?: string | null }> }) => {
      createCalls.push(config);
      runCounter += 1;
      return createBackend(config, `team-autobyteus-${runCounter}`, "create") as never;
    }),
    restoreBackend: vi.fn(async (context: { runId: string; config: { memberConfigs: Array<{ memberName: string; memberRouteKey?: string | null }> } }) => {
      restoreCalls.push(context);
      return createBackend(context.config, context.runId, "restore") as never;
    }),
  };
};

const createUnexpectedTeamFactory = () => ({
  createBackend: vi.fn(async () => {
    throw new Error("Unexpected team backend selection in runtime-selection top-level test.");
  }),
  restoreBackend: vi.fn(async () => {
    throw new Error("Unexpected team backend restore in runtime-selection top-level test.");
  }),
  getTeam: vi.fn(() => null),
});

type ValidationHarness = {
  app: FastifyInstance;
  baseUrl: string;
  workspaceRootPath: string;
  agentRunService: import("../../../src/agent-execution/services/agent-run-service.js").AgentRunService;
  teamRunService: import("../../../src/agent-team-execution/services/team-run-service.js").TeamRunService;
  teamRunMetadataService: TeamRunMetadataService;
  standaloneAgentRunManager: FakeAgentRunManager;
  mixedMemberRunManager: FakeAgentRunManager;
  autoByteusTeamFactory: ReturnType<typeof createAutoByteusTeamBackendFactory>;
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
  const autoByteusTeamFactory = createAutoByteusTeamBackendFactory();
  const unexpectedTeamFactory = createUnexpectedTeamFactory();
  const delegatedMixedFactory = new MixedTeamRunBackendFactory({
    createTeamManager: (context) =>
      new MixedTeamManager(context, {
        agentRunManager: mixedMemberRunManager as never,
      }),
  });
  const mixedFactory = {
    createBackend: vi.fn((config: Parameters<typeof delegatedMixedFactory.createBackend>[0]) =>
      delegatedMixedFactory.createBackend(config),
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
    historyIndexService: {
      recordRunCreated: vi.fn().mockResolvedValue(undefined),
      recordRunActivity: vi.fn().mockResolvedValue(undefined),
      recordRunRestored: vi.fn().mockResolvedValue(undefined),
      recordRunTerminated: vi.fn().mockResolvedValue(undefined),
    } as never,
    workspaceManager: workspaceManager as never,
    agentDefinitionService: {
      getFreshAgentDefinitionById: vi.fn().mockResolvedValue({
        name: "Validation Agent",
        role: "assistant",
      }),
    } as never,
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
          new TeamMember({ memberName: "Coordinator", ref: "agent-coordinator", refType: "agent" }),
          new TeamMember({ memberName: "Reviewer", ref: "agent-reviewer", refType: "agent" }),
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
          new TeamMember({ memberName: "Coordinator", ref: "agent-coordinator", refType: "agent" }),
          new TeamMember({ memberName: "Specialist", ref: "agent-specialist", refType: "agent" }),
        ],
      }),
    ],
  ]);

  const teamRunManager = new AgentTeamRunManager({
    autoByteusTeamRunBackendFactory: autoByteusTeamFactory as never,
    codexTeamRunBackendFactory: unexpectedTeamFactory as never,
    claudeTeamRunBackendFactory: unexpectedTeamFactory as never,
    mixedTeamRunBackendFactory: mixedFactory as never,
  });

  const teamRunService = new TeamRunService({
    agentTeamRunManager: teamRunManager,
    teamDefinitionService: {
      getDefinitionById: vi.fn(async (teamDefinitionId: string) =>
        teamDefinitions.get(teamDefinitionId) ?? null,
      ),
    } as never,
    teamRunMetadataService,
    teamRunHistoryIndexService: {
      recordRunCreated: vi.fn().mockResolvedValue(undefined),
      recordRunActivity: vi.fn().mockResolvedValue(undefined),
      recordRunRestored: vi.fn().mockResolvedValue(undefined),
      recordRunTerminated: vi.fn().mockResolvedValue(undefined),
    } as never,
    workspaceManager: workspaceManager as never,
    memoryDir,
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
    new AgentStreamHandler(undefined, agentRunService),
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
    autoByteusTeamFactory,
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

  it("keeps same-runtime autobyteus team creation and websocket messaging on the native team backend", async () => {
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
                memberName: "Coordinator",
                agentDefinitionId: "agent-coordinator",
                llmModelIdentifier: "gpt-test",
                autoExecuteTools: false,
                skillAccessMode: SkillAccessMode.NONE,
                workspaceRootPath: harness.workspaceRootPath,
                runtimeKind: RuntimeKind.AUTOBYTEUS,
              },
              {
                memberName: "Reviewer",
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
      expect(harness.autoByteusTeamFactory.createCalls).toHaveLength(1);
      expect(harness.mixedFactory.createBackend).not.toHaveBeenCalled();
      expect(harness.teamRunService.getTeamRun(teamRunId)?.teamBackendKind).toBe(TeamBackendKind.AUTOBYTEUS);

      const { socket, nextMessage } = await openSocket(`${harness.baseUrl}/ws/agent-team/${teamRunId}`);
      try {
        const connectedMessage = JSON.parse(await nextMessage()) as {
          type: string;
          payload: { team_id: string };
        };
        expect(connectedMessage.type).toBe("CONNECTED");
        expect(connectedMessage.payload.team_id).toBe(teamRunId);

        socket.send(
          JSON.stringify({
            type: "SEND_MESSAGE",
            payload: {
              content: "hello native team",
              target_member_name: "Reviewer",
            },
          }),
        );

        await waitForCondition(() => harness.autoByteusTeamFactory.messages.length === 1);
        expect(harness.autoByteusTeamFactory.messages[0]).toMatchObject({
          teamRunId,
          targetMemberName: "Reviewer",
          content: "hello native team",
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
                memberName: "Coordinator",
                agentDefinitionId: "agent-coordinator",
                llmModelIdentifier: "gpt-test",
                autoExecuteTools: false,
                skillAccessMode: SkillAccessMode.NONE,
                workspaceRootPath: harness.workspaceRootPath,
                runtimeKind: RuntimeKind.AUTOBYTEUS,
              },
              {
                memberName: "Specialist",
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
          payload: { team_id: string };
        };
        expect(connectedMessage.type).toBe("CONNECTED");
        expect(connectedMessage.payload.team_id).toBe(teamRunId);

        socket.send(
          JSON.stringify({
            type: "SEND_MESSAGE",
            payload: {
              content: "coordinate the mixed fix",
              target_member_name: "Coordinator",
            },
          }),
        );

        await waitForCondition(() => harness.mixedMemberRunManager.createCalls.length === 1);
        const coordinatorCreateConfig = harness.mixedMemberRunManager.createCalls[0]!;
        expect(coordinatorCreateConfig.runtimeKind).toBe(RuntimeKind.AUTOBYTEUS);
        expect(coordinatorCreateConfig.memberTeamContext?.teamBackendKind).toBe(TeamBackendKind.MIXED);
        expect(coordinatorCreateConfig.memberTeamContext?.allowedRecipientNames).toEqual(["Specialist"]);
        expect(harness.mixedMemberRunManager.messages[0]).toMatchObject({
          runtimeKind: RuntimeKind.AUTOBYTEUS,
          content: "coordinate the mixed fix",
          source: "create",
        });

        await coordinatorCreateConfig.memberTeamContext?.deliverInterAgentMessage?.({
          senderRunId: coordinatorCreateConfig.memberTeamContext.memberRunId,
          senderMemberName: "Coordinator",
          teamRunId,
          recipientMemberName: "Specialist",
          content: "Please validate the patch.",
          messageType: "agent_message",
        });

        await waitForCondition(() => harness.mixedMemberRunManager.createCalls.length === 2);
        const specialistCreateConfig = harness.mixedMemberRunManager.createCalls[1]!;
        expect(specialistCreateConfig.runtimeKind).toBe(RuntimeKind.CODEX_APP_SERVER);
        expect(harness.mixedMemberRunManager.messages[1]?.content).toContain(
          "You received a message from sender name: Coordinator",
        );
        expect(harness.mixedMemberRunManager.messages[1]?.content).toContain("Please validate the patch.");

        await harness.teamRunService.refreshRunMetadata(createdRun!);
        const metadata = await harness.teamRunMetadataService.readMetadata(teamRunId);
        expect(metadata?.memberMetadata).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              memberName: "Coordinator",
              runtimeKind: RuntimeKind.AUTOBYTEUS,
              platformAgentRunId: expect.any(String),
            }),
            expect.objectContaining({
              memberName: "Specialist",
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
                content: "resume mixed coordination",
                target_member_name: "Coordinator",
              },
            }),
          );

          await waitForCondition(() => harness.mixedMemberRunManager.restoreCalls.length === 1);
          const coordinatorRestoreContext = harness.mixedMemberRunManager.restoreCalls[0]!;
          expect(coordinatorRestoreContext.config.runtimeKind).toBe(RuntimeKind.AUTOBYTEUS);
          expect(harness.mixedMemberRunManager.messages[2]).toMatchObject({
            runtimeKind: RuntimeKind.AUTOBYTEUS,
            content: "resume mixed coordination",
            source: "restore",
          });

          await coordinatorRestoreContext.config.memberTeamContext?.deliverInterAgentMessage?.({
            senderRunId: coordinatorRestoreContext.config.memberTeamContext.memberRunId,
            senderMemberName: "Coordinator",
            teamRunId,
            recipientMemberName: "Specialist",
            content: "Please resume the review.",
            messageType: "agent_message",
          });

          await waitForCondition(() => harness.mixedMemberRunManager.restoreCalls.length === 2);
          const specialistRestoreContext = harness.mixedMemberRunManager.restoreCalls[1]!;
          const specialistMetadata = metadata?.memberMetadata.find((member) => member.memberName === "Specialist");
          expect(specialistRestoreContext.config.runtimeKind).toBe(RuntimeKind.CODEX_APP_SERVER);
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

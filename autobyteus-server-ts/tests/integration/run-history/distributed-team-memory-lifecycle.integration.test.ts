import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InternalEnvelopeAuth } from "../../../src/distributed/security/internal-envelope-auth.js";
import { NodeDirectoryService } from "../../../src/distributed/node-directory/node-directory-service.js";
import { RunScopedTeamBindingRegistry } from "../../../src/distributed/runtime-binding/run-scoped-team-binding-registry.js";
import { registerWorkerTeamHistoryCleanupRoutes } from "../../../src/distributed/transport/internal-http/register-worker-team-history-cleanup-routes.js";
import { TeamHistoryCleanupDispatcher } from "../../../src/run-history/distributed/team-history-cleanup-dispatcher.js";
import { TeamRunContinuationService } from "../../../src/run-history/services/team-run-continuation-service.js";
import { TeamHistoryRuntimeStateProbeService } from "../../../src/run-history/services/team-history-runtime-state-probe-service.js";
import { TeamHistoryWorkerCleanupHandler } from "../../../src/run-history/services/team-history-worker-cleanup-handler.js";
import { TeamRunHistoryDeleteCoordinatorService } from "../../../src/run-history/services/team-run-history-delete-coordinator-service.js";
import { TeamRunHistoryService } from "../../../src/run-history/services/team-run-history-service.js";
import { TeamMemberMemoryLayoutStore } from "../../../src/run-history/store/team-member-memory-layout-store.js";

type RuntimeNode = {
  app: ReturnType<typeof fastify>;
  memoryDir: string;
  runBindingRegistry: RunScopedTeamBindingRegistry;
};

const createTempDir = async (prefix: string): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), prefix));

const exists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
};

describe("Distributed team memory lifecycle integration", () => {
  const resources: Array<{ app?: ReturnType<typeof fastify>; dir?: string }> = [];
  const originalNodeId = process.env.AUTOBYTEUS_NODE_ID;

  afterEach(async () => {
    if (typeof originalNodeId === "string") {
      process.env.AUTOBYTEUS_NODE_ID = originalNodeId;
    } else {
      delete process.env.AUTOBYTEUS_NODE_ID;
    }
    vi.clearAllMocks();
    for (const resource of resources.splice(0)) {
      if (resource.app) {
        await resource.app.close();
      }
      if (resource.dir) {
        await fs.rm(resource.dir, { recursive: true, force: true });
      }
    }
  });

  const createWorkerNode = async (input: {
    nodeId: string;
    allowedSourceNodeIds: string[];
    secret: string;
  }): Promise<RuntimeNode> => {
    const memoryDir = await createTempDir(`autobyteus-run-history-${input.nodeId}-`);
    resources.push({ dir: memoryDir });
    const app = fastify();
    resources.push({ app });

    const auth = new InternalEnvelopeAuth({
      localNodeId: input.nodeId,
      resolveSecretByKeyId: () => input.secret,
      allowedNodeIds: input.allowedSourceNodeIds,
    });
    const runBindingRegistry = new RunScopedTeamBindingRegistry();
    const runtimeProbeService = new TeamHistoryRuntimeStateProbeService({
      teamRunManager: {
        getTeamRun: () => null,
      } as any,
      runBindingRegistry,
      localNodeId: input.nodeId,
    });

    await registerWorkerTeamHistoryCleanupRoutes(app, {
      internalEnvelopeAuth: auth,
      securityMode: "strict_signed",
      cleanupHandler: new TeamHistoryWorkerCleanupHandler(memoryDir),
      runtimeStateProbeService: runtimeProbeService,
    });

    await app.listen({ host: "127.0.0.1", port: 0 });
    return { app, memoryDir, runBindingRegistry };
  };

  it("validates distributed layout, continuation restore-after-terminate, and cross-node cleanup in one lifecycle", async () => {
    const secret = "shared-secret";
    const hostNodeId = "node-host";
    const workerNodeId = "node-worker";
    process.env.AUTOBYTEUS_NODE_ID = hostNodeId;

    const worker = await createWorkerNode({
      nodeId: workerNodeId,
      allowedSourceNodeIds: [hostNodeId],
      secret,
    });
    const workerAddress = worker.app.server.address();
    if (!workerAddress || typeof workerAddress === "string") {
      throw new Error("Worker address unavailable.");
    }

    const hostMemoryDir = await createTempDir("autobyteus-run-history-host-lifecycle-");
    resources.push({ dir: hostMemoryDir });
    const hostLayoutStore = new TeamMemberMemoryLayoutStore(hostMemoryDir);

    const activeTeams = new Set<string>();
    const createTeamRunWithId = vi.fn(async (teamRunId: string) => {
      activeTeams.add(teamRunId);
      return teamRunId;
    });
    const terminateTeamRun = vi.fn(async (teamRunId: string) => {
      activeTeams.delete(teamRunId);
      return true;
    });
    const getTeamRun = vi.fn((teamRunId: string) =>
      activeTeams.has(teamRunId) ? ({ teamRunId } as any) : null,
    );
    const dispatchUserMessage = vi.fn(async () => undefined);
    const ensureWorkspaceByRootPath = vi.fn(async (workspaceRootPath: string) => ({
      workspaceId: workspaceRootPath.includes("coordinator")
        ? "ws-coordinator"
        : "ws-student",
      rootPath: workspaceRootPath,
    }));

    const hostAuth = new InternalEnvelopeAuth({
      localNodeId: hostNodeId,
      resolveSecretByKeyId: () => secret,
      allowedNodeIds: [workerNodeId],
    });
    const dispatcher = new TeamHistoryCleanupDispatcher({
      nodeDirectoryService: new NodeDirectoryService([
        {
          nodeId: hostNodeId,
          baseUrl: "http://127.0.0.1:65535",
          isHealthy: true,
          supportsAgentExecution: true,
        },
        {
          nodeId: workerNodeId,
          baseUrl: `http://127.0.0.1:${workerAddress.port}`,
          isHealthy: true,
          supportsAgentExecution: true,
        },
      ]),
      internalEnvelopeAuth: hostAuth,
      securityMode: "strict_signed",
    });
    const runtimeStateProbeService = new TeamHistoryRuntimeStateProbeService({
      teamRunManager: {
        getTeamRun,
      } as any,
      runBindingRegistry: {
        listBindingsByTeamId: () => [],
      } as any,
      dispatcher,
      localNodeId: hostNodeId,
    });
    const deleteCoordinator = new TeamRunHistoryDeleteCoordinatorService({
      memberLayoutStore: hostLayoutStore,
      localNodeId: hostNodeId,
      dispatcher,
    });

    const hostRunHistoryService = new TeamRunHistoryService(hostMemoryDir, {
      teamRunManager: {
        getTeamRun,
      } as any,
      runtimeStateProbeService,
      deleteCoordinator,
    });

    const teamRunId = "team_dist_lifecycle_1";
    const manifest = {
      teamRunId,
      teamDefinitionId: "def-dist-lifecycle",
      teamDefinitionName: "Distributed Lifecycle Team",
      coordinatorMemberRouteKey: "coordinator",
      runVersion: 1,
      createdAt: "2026-02-23T00:00:00.000Z",
      updatedAt: "2026-02-23T00:00:00.000Z",
      memberBindings: [
        {
          memberRouteKey: "coordinator",
          memberName: "coordinator",
          memberAgentId: "member-host-coordinator",
          agentDefinitionId: "agent-coordinator",
          llmModelIdentifier: "gpt-4o-mini",
          autoExecuteTools: false,
          llmConfig: null,
          workspaceRootPath: "/tmp/ws-coordinator",
          hostNodeId: hostNodeId,
        },
        {
          memberRouteKey: "student",
          memberName: "student",
          memberAgentId: "member-worker-student",
          agentDefinitionId: "agent-student",
          llmModelIdentifier: "gpt-4o-mini",
          autoExecuteTools: true,
          llmConfig: null,
          workspaceRootPath: "/tmp/ws-student",
          hostNodeId: workerNodeId,
        },
      ],
    };

    await hostRunHistoryService.upsertTeamRunHistoryRow({
      teamRunId,
      manifest,
      summary: "seed",
      lastKnownStatus: "IDLE",
    });

    expect(await exists(hostLayoutStore.getMemberDirPath(teamRunId, "member-host-coordinator"))).toBe(true);
    expect(await exists(hostLayoutStore.getMemberDirPath(teamRunId, "member-worker-student"))).toBe(false);

    const workerLayoutStore = new TeamMemberMemoryLayoutStore(worker.memoryDir);
    await workerLayoutStore.ensureLocalMemberSubtrees(teamRunId, ["member-worker-student"]);
    expect(await exists(workerLayoutStore.getMemberDirPath(teamRunId, "member-worker-student"))).toBe(true);

    const continuationService = new TeamRunContinuationService({
      memoryDir: hostMemoryDir,
      teamRunManager: {
        getTeamRun,
        createTeamRunWithId,
        terminateTeamRun,
      } as any,
      teamCommandIngressService: {
        dispatchUserMessage,
      } as any,
      teamRunHistoryService: hostRunHistoryService,
      workspaceManager: {
        ensureWorkspaceByRootPath,
      } as any,
    });

    const first = await continuationService.continueTeamRun({
      teamRunId,
      targetMemberRouteKey: "student",
      userInput: {
        content: "first distributed message",
        contextFiles: null,
      } as any,
    });
    expect(first).toEqual({ teamRunId, restored: true });
    expect(createTeamRunWithId).toHaveBeenCalledTimes(1);
    const firstMemberConfigs = createTeamRunWithId.mock.calls[0]?.[2] as Array<Record<string, unknown>>;
    expect(firstMemberConfigs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          memberName: "coordinator",
          hostNodeId: hostNodeId,
          workspaceId: "ws-coordinator",
          workspaceRootPath: "/tmp/ws-coordinator",
          memoryDir: hostLayoutStore.getMemberDirPath(teamRunId, "member-host-coordinator"),
        }),
        expect.objectContaining({
          memberName: "student",
          hostNodeId: workerNodeId,
          workspaceId: null,
          workspaceRootPath: "/tmp/ws-student",
          memoryDir: hostLayoutStore.getMemberDirPath(teamRunId, "member-worker-student"),
        }),
      ]),
    );
    expect(ensureWorkspaceByRootPath).toHaveBeenCalledWith("/tmp/ws-coordinator");
    expect(ensureWorkspaceByRootPath).not.toHaveBeenCalledWith("/tmp/ws-student");

    const second = await continuationService.continueTeamRun({
      teamRunId,
      targetMemberRouteKey: "coordinator",
      userInput: {
        content: "second distributed message",
        contextFiles: null,
      } as any,
    });
    expect(second).toEqual({ teamRunId, restored: false });
    expect(createTeamRunWithId).toHaveBeenCalledTimes(1);

    await terminateTeamRun(teamRunId);

    const third = await continuationService.continueTeamRun({
      teamRunId,
      targetMemberRouteKey: "student",
      userInput: {
        content: "third distributed message",
        contextFiles: null,
      } as any,
    });
    expect(third).toEqual({ teamRunId, restored: true });
    expect(createTeamRunWithId).toHaveBeenCalledTimes(2);
    expect(dispatchUserMessage).toHaveBeenCalledTimes(3);

    await terminateTeamRun(teamRunId);
    const deleteResult = await hostRunHistoryService.deleteTeamRunHistory(teamRunId);
    expect(deleteResult.success).toBe(true);

    expect(await exists(hostLayoutStore.getTeamDirPath(teamRunId))).toBe(false);
    expect(await exists(workerLayoutStore.getMemberDirPath(teamRunId, "member-worker-student"))).toBe(false);
    const rows = await hostRunHistoryService.listTeamRunHistory();
    expect(rows.find((row) => row.teamRunId === teamRunId)).toBeUndefined();
  });

  it("restores manifest-only distributed teams across two workers with nested routes and cleans up after shutdown", async () => {
    const secret = "shared-secret";
    const hostNodeId = "node-host";
    const workerNodeB = "node-worker-b";
    const workerNodeC = "node-worker-c";
    process.env.AUTOBYTEUS_NODE_ID = hostNodeId;

    const workerB = await createWorkerNode({
      nodeId: workerNodeB,
      allowedSourceNodeIds: [hostNodeId],
      secret,
    });
    const workerC = await createWorkerNode({
      nodeId: workerNodeC,
      allowedSourceNodeIds: [hostNodeId],
      secret,
    });
    const workerBAddress = workerB.app.server.address();
    const workerCAddress = workerC.app.server.address();
    if (!workerBAddress || typeof workerBAddress === "string") {
      throw new Error("Worker B address unavailable.");
    }
    if (!workerCAddress || typeof workerCAddress === "string") {
      throw new Error("Worker C address unavailable.");
    }

    const hostMemoryDir = await createTempDir("autobyteus-run-history-host-manifest-only-");
    resources.push({ dir: hostMemoryDir });
    const hostLayoutStore = new TeamMemberMemoryLayoutStore(hostMemoryDir);

    const activeTeams = new Set<string>();
    const createTeamRunWithId = vi.fn(async (teamRunId: string) => {
      activeTeams.add(teamRunId);
      return teamRunId;
    });
    const terminateTeamRun = vi.fn(async (teamRunId: string) => {
      activeTeams.delete(teamRunId);
      return true;
    });
    const getTeamRun = vi.fn((teamRunId: string) =>
      activeTeams.has(teamRunId) ? ({ teamRunId } as any) : null,
    );
    const dispatchUserMessage = vi.fn(async () => undefined);
    const ensureWorkspaceByRootPath = vi.fn(async (workspaceRootPath: string) => ({
      workspaceId: workspaceRootPath.endsWith("b") ? "ws-worker-b" : "ws-worker-c",
      rootPath: workspaceRootPath,
    }));

    const hostAuth = new InternalEnvelopeAuth({
      localNodeId: hostNodeId,
      resolveSecretByKeyId: () => secret,
      allowedNodeIds: [workerNodeB, workerNodeC],
    });
    const dispatcher = new TeamHistoryCleanupDispatcher({
      nodeDirectoryService: new NodeDirectoryService([
        {
          nodeId: hostNodeId,
          baseUrl: "http://127.0.0.1:65535",
          isHealthy: true,
          supportsAgentExecution: true,
        },
        {
          nodeId: workerNodeB,
          baseUrl: `http://127.0.0.1:${workerBAddress.port}`,
          isHealthy: true,
          supportsAgentExecution: true,
        },
        {
          nodeId: workerNodeC,
          baseUrl: `http://127.0.0.1:${workerCAddress.port}`,
          isHealthy: true,
          supportsAgentExecution: true,
        },
      ]),
      internalEnvelopeAuth: hostAuth,
      securityMode: "strict_signed",
    });
    const runtimeStateProbeService = new TeamHistoryRuntimeStateProbeService({
      teamRunManager: {
        getTeamRun,
      } as any,
      runBindingRegistry: {
        listBindingsByTeamId: () => [],
      } as any,
      dispatcher,
      localNodeId: hostNodeId,
    });
    const deleteCoordinator = new TeamRunHistoryDeleteCoordinatorService({
      memberLayoutStore: hostLayoutStore,
      localNodeId: hostNodeId,
      dispatcher,
    });
    const hostRunHistoryService = new TeamRunHistoryService(hostMemoryDir, {
      teamRunManager: {
        getTeamRun,
      } as any,
      runtimeStateProbeService,
      deleteCoordinator,
    });

    const teamRunId = "team_dist_manifest_only_nested";
    const memberWorkerB = "member-reviewer-b";
    const memberWorkerC = "member-reviewer-c";
    const manifest = {
      teamRunId,
      teamDefinitionId: "def-dist-manifest-only",
      teamDefinitionName: "Distributed Manifest-Only Team",
      coordinatorMemberRouteKey: "editorial/reviewer",
      runVersion: 1,
      createdAt: "2026-02-23T00:00:00.000Z",
      updatedAt: "2026-02-23T00:00:00.000Z",
      memberBindings: [
        {
          memberRouteKey: "editorial/reviewer",
          memberName: "reviewer",
          memberAgentId: memberWorkerB,
          agentDefinitionId: "agent-reviewer-b",
          llmModelIdentifier: "gpt-4o-mini",
          autoExecuteTools: false,
          llmConfig: null,
          workspaceRootPath: "/tmp/ws-reviewer-b",
          hostNodeId: workerNodeB,
        },
        {
          memberRouteKey: "qa/reviewer",
          memberName: "reviewer",
          memberAgentId: memberWorkerC,
          agentDefinitionId: "agent-reviewer-c",
          llmModelIdentifier: "gpt-4o-mini",
          autoExecuteTools: false,
          llmConfig: null,
          workspaceRootPath: "/tmp/ws-reviewer-c",
          hostNodeId: workerNodeC,
        },
      ],
    };

    await hostRunHistoryService.upsertTeamRunHistoryRow({
      teamRunId,
      manifest,
      summary: "seed",
      lastKnownStatus: "IDLE",
    });

    expect(await exists(hostLayoutStore.getMemberDirPath(teamRunId, memberWorkerB))).toBe(false);
    expect(await exists(hostLayoutStore.getMemberDirPath(teamRunId, memberWorkerC))).toBe(false);

    const workerLayoutStoreB = new TeamMemberMemoryLayoutStore(workerB.memoryDir);
    const workerLayoutStoreC = new TeamMemberMemoryLayoutStore(workerC.memoryDir);
    await workerLayoutStoreB.ensureLocalMemberSubtrees(teamRunId, [memberWorkerB]);
    await workerLayoutStoreC.ensureLocalMemberSubtrees(teamRunId, [memberWorkerC]);
    expect(await exists(workerLayoutStoreB.getMemberDirPath(teamRunId, memberWorkerB))).toBe(true);
    expect(await exists(workerLayoutStoreC.getMemberDirPath(teamRunId, memberWorkerC))).toBe(true);

    const continuationService = new TeamRunContinuationService({
      memoryDir: hostMemoryDir,
      teamRunManager: {
        getTeamRun,
        createTeamRunWithId,
        terminateTeamRun,
      } as any,
      teamCommandIngressService: {
        dispatchUserMessage,
      } as any,
      teamRunHistoryService: hostRunHistoryService,
      workspaceManager: {
        ensureWorkspaceByRootPath,
      } as any,
    });

    const first = await continuationService.continueTeamRun({
      teamRunId,
      targetMemberRouteKey: "editorial/reviewer",
      userInput: {
        content: "first nested distributed message",
        contextFiles: null,
      } as any,
    });
    expect(first).toEqual({ teamRunId, restored: true });
    expect(createTeamRunWithId).toHaveBeenCalledTimes(1);
    const firstMemberConfigs = createTeamRunWithId.mock.calls[0]?.[2] as Array<Record<string, unknown>>;
    expect(firstMemberConfigs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          memberRouteKey: "editorial/reviewer",
          hostNodeId: workerNodeB,
          workspaceId: null,
          workspaceRootPath: "/tmp/ws-reviewer-b",
          memoryDir: hostLayoutStore.getMemberDirPath(teamRunId, memberWorkerB),
        }),
        expect.objectContaining({
          memberRouteKey: "qa/reviewer",
          hostNodeId: workerNodeC,
          workspaceId: null,
          workspaceRootPath: "/tmp/ws-reviewer-c",
          memoryDir: hostLayoutStore.getMemberDirPath(teamRunId, memberWorkerC),
        }),
      ]),
    );

    const second = await continuationService.continueTeamRun({
      teamRunId,
      targetMemberRouteKey: "qa/reviewer",
      userInput: {
        content: "second nested distributed message",
        contextFiles: null,
      } as any,
    });
    expect(second).toEqual({ teamRunId, restored: false });
    expect(createTeamRunWithId).toHaveBeenCalledTimes(1);

    await terminateTeamRun(teamRunId);
    const third = await continuationService.continueTeamRun({
      teamRunId,
      targetMemberRouteKey: "editorial/reviewer",
      userInput: {
        content: "third nested distributed message",
        contextFiles: null,
      } as any,
    });
    expect(third).toEqual({ teamRunId, restored: true });
    expect(createTeamRunWithId).toHaveBeenCalledTimes(2);
    expect(dispatchUserMessage).toHaveBeenCalledTimes(3);
    expect(ensureWorkspaceByRootPath).not.toHaveBeenCalled();

    expect(await exists(hostLayoutStore.getMemberDirPath(teamRunId, memberWorkerB))).toBe(false);
    expect(await exists(hostLayoutStore.getMemberDirPath(teamRunId, memberWorkerC))).toBe(false);

    await terminateTeamRun(teamRunId);
    const deleteResult = await hostRunHistoryService.deleteTeamRunHistory(teamRunId);
    expect(deleteResult.success).toBe(true);

    expect(await exists(hostLayoutStore.getTeamDirPath(teamRunId))).toBe(false);
    expect(await exists(workerLayoutStoreB.getMemberDirPath(teamRunId, memberWorkerB))).toBe(false);
    expect(await exists(workerLayoutStoreC.getMemberDirPath(teamRunId, memberWorkerC))).toBe(false);
    const rows = await hostRunHistoryService.listTeamRunHistory();
    expect(rows.find((row) => row.teamRunId === teamRunId)).toBeUndefined();
  });
});

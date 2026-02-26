import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { InternalEnvelopeAuth } from "../../../src/distributed/security/internal-envelope-auth.js";
import { NodeDirectoryService } from "../../../src/distributed/node-directory/node-directory-service.js";
import { RunScopedTeamBindingRegistry } from "../../../src/distributed/runtime-binding/run-scoped-team-binding-registry.js";
import { registerWorkerTeamHistoryCleanupRoutes } from "../../../src/distributed/transport/internal-http/register-worker-team-history-cleanup-routes.js";
import { TeamHistoryCleanupDispatcher } from "../../../src/run-history/distributed/team-history-cleanup-dispatcher.js";
import { TeamHistoryRuntimeStateProbeService } from "../../../src/run-history/services/team-history-runtime-state-probe-service.js";
import { TeamHistoryWorkerCleanupHandler } from "../../../src/run-history/services/team-history-worker-cleanup-handler.js";
import { TeamRunHistoryDeleteCoordinatorService } from "../../../src/run-history/services/team-run-history-delete-coordinator-service.js";
import { TeamRunHistoryService } from "../../../src/run-history/services/team-run-history-service.js";
import { TeamMemberMemoryLayoutStore } from "../../../src/run-history/store/team-member-memory-layout-store.js";

type RuntimeNode = {
  app: ReturnType<typeof fastify>;
  memoryDir: string;
  auth: InternalEnvelopeAuth;
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

describe("Distributed team history delete integration", () => {
  const resources: Array<{ app?: ReturnType<typeof fastify>; dir?: string }> = [];

  afterEach(async () => {
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

    return {
      app,
      memoryDir,
      auth,
      runBindingRegistry,
    };
  };

  it("deletes host+worker member subtrees and finalizes team history", async () => {
    const secret = "shared-secret";
    const hostNodeId = "node-host";
    const workerNodeId = "node-worker";

    const worker = await createWorkerNode({
      nodeId: workerNodeId,
      allowedSourceNodeIds: [hostNodeId],
      secret,
    });

    const workerAddress = worker.app.server.address();
    if (!workerAddress || typeof workerAddress === "string") {
      throw new Error("Worker address unavailable.");
    }

    const hostMemoryDir = await createTempDir("autobyteus-run-history-host-");
    resources.push({ dir: hostMemoryDir });
    const hostLayoutStore = new TeamMemberMemoryLayoutStore(hostMemoryDir);

    const hostAuth = new InternalEnvelopeAuth({
      localNodeId: hostNodeId,
      resolveSecretByKeyId: () => secret,
      allowedNodeIds: [workerNodeId],
    });

    const nodeDirectoryService = new NodeDirectoryService([
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
    ]);

    const dispatcher = new TeamHistoryCleanupDispatcher({
      nodeDirectoryService,
      internalEnvelopeAuth: hostAuth,
      securityMode: "strict_signed",
    });

    const runtimeProbeService = new TeamHistoryRuntimeStateProbeService({
      teamRunManager: {
        getTeamRun: () => null,
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

    const hostService = new TeamRunHistoryService(hostMemoryDir, {
      teamRunManager: {
        getTeamRun: () => null,
      } as any,
      runtimeStateProbeService: runtimeProbeService,
      deleteCoordinator,
    });

    const teamRunId = "team_dist_delete_1";
    const manifest = {
      teamRunId,
      teamDefinitionId: "def-1",
      teamDefinitionName: "Distributed Team",
      coordinatorMemberRouteKey: "coordinator",
      runVersion: 1,
      createdAt: "2026-02-22T00:00:00.000Z",
      updatedAt: "2026-02-22T00:00:00.000Z",
      memberBindings: [
        {
          memberRouteKey: "coordinator",
          memberName: "Coordinator",
          memberAgentId: "member-host",
          agentDefinitionId: "agent-host",
          llmModelIdentifier: "model-host",
          autoExecuteTools: false,
          llmConfig: null,
          workspaceRootPath: null,
          hostNodeId: hostNodeId,
        },
        {
          memberRouteKey: "scribe",
          memberName: "Scribe",
          memberAgentId: "member-worker",
          agentDefinitionId: "agent-worker",
          llmModelIdentifier: "model-worker",
          autoExecuteTools: false,
          llmConfig: null,
          workspaceRootPath: null,
          hostNodeId: workerNodeId,
        },
      ],
    };

    await hostService.upsertTeamRunHistoryRow({
      teamRunId,
      manifest,
      summary: "distributed delete",
      lastKnownStatus: "IDLE",
    });

    const workerLayoutStore = new TeamMemberMemoryLayoutStore(worker.memoryDir);
    await workerLayoutStore.ensureLocalMemberSubtrees(teamRunId, ["member-worker"]);

    const workerMemberDir = workerLayoutStore.getMemberDirPath(teamRunId, "member-worker");
    expect(await exists(workerMemberDir)).toBe(true);

    const result = await hostService.deleteTeamRunHistory(teamRunId);
    expect(result.success).toBe(true);

    expect(await exists(hostLayoutStore.getTeamDirPath(teamRunId))).toBe(false);
    expect(await exists(workerMemberDir)).toBe(false);
  });

  it("blocks distributed delete when worker reports active runtime", async () => {
    const secret = "shared-secret";
    const hostNodeId = "node-host";
    const workerNodeId = "node-worker";

    const worker = await createWorkerNode({
      nodeId: workerNodeId,
      allowedSourceNodeIds: [hostNodeId],
      secret,
    });

    worker.runBindingRegistry.bindRun({
      teamRunId: "run-1",
      teamId: "team_dist_delete_blocked",
      runVersion: 1,
      teamDefinitionId: "def-1",
      runtimeTeamId: "runtime-worker",
      memberBindings: [],
    });

    const workerAddress = worker.app.server.address();
    if (!workerAddress || typeof workerAddress === "string") {
      throw new Error("Worker address unavailable.");
    }

    const hostMemoryDir = await createTempDir("autobyteus-run-history-host-blocked-");
    resources.push({ dir: hostMemoryDir });
    const hostLayoutStore = new TeamMemberMemoryLayoutStore(hostMemoryDir);

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

    const hostService = new TeamRunHistoryService(hostMemoryDir, {
      teamRunManager: {
        getTeamRun: () => null,
      } as any,
      runtimeStateProbeService: new TeamHistoryRuntimeStateProbeService({
        teamRunManager: {
          getTeamRun: () => null,
        } as any,
        runBindingRegistry: {
          listBindingsByTeamId: () => [],
        } as any,
        dispatcher,
        localNodeId: hostNodeId,
      }),
      deleteCoordinator: new TeamRunHistoryDeleteCoordinatorService({
        memberLayoutStore: hostLayoutStore,
        localNodeId: hostNodeId,
        dispatcher,
      }),
    });

    const teamRunId = "team_dist_delete_blocked";
    await hostService.upsertTeamRunHistoryRow({
      teamRunId,
      summary: "blocked",
      lastKnownStatus: "IDLE",
      manifest: {
        teamRunId,
        teamDefinitionId: "def-1",
        teamDefinitionName: "Distributed Team",
        coordinatorMemberRouteKey: "coordinator",
        runVersion: 1,
        createdAt: "2026-02-22T00:00:00.000Z",
        updatedAt: "2026-02-22T00:00:00.000Z",
        memberBindings: [
          {
            memberRouteKey: "remote",
            memberName: "Remote",
            memberAgentId: "member-remote",
            agentDefinitionId: "agent-worker",
            llmModelIdentifier: "model-worker",
            autoExecuteTools: false,
            llmConfig: null,
            workspaceRootPath: null,
            hostNodeId: workerNodeId,
          },
        ],
      },
    });

    const result = await hostService.deleteTeamRunHistory(teamRunId);
    expect(result.success).toBe(false);
    expect(result.message).toContain("blocked");
    expect(result.message).toContain("active");
  });

  it("deletes host-manifest-only teams across two workers", async () => {
    const secret = "shared-secret";
    const hostNodeId = "node-host";
    const workerNodeB = "node-worker-b";
    const workerNodeC = "node-worker-c";

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

    const hostService = new TeamRunHistoryService(hostMemoryDir, {
      teamRunManager: {
        getTeamRun: () => null,
      } as any,
      runtimeStateProbeService: new TeamHistoryRuntimeStateProbeService({
        teamRunManager: {
          getTeamRun: () => null,
        } as any,
        runBindingRegistry: {
          listBindingsByTeamId: () => [],
        } as any,
        dispatcher,
        localNodeId: hostNodeId,
      }),
      deleteCoordinator: new TeamRunHistoryDeleteCoordinatorService({
        memberLayoutStore: hostLayoutStore,
        localNodeId: hostNodeId,
        dispatcher,
      }),
    });

    const teamRunId = "team_dist_manifest_only_delete";
    await hostService.upsertTeamRunHistoryRow({
      teamRunId,
      summary: "manifest only",
      lastKnownStatus: "IDLE",
      manifest: {
        teamRunId,
        teamDefinitionId: "def-manifest-only",
        teamDefinitionName: "Manifest Only Team",
        coordinatorMemberRouteKey: "coordinator",
        runVersion: 1,
        createdAt: "2026-02-22T00:00:00.000Z",
        updatedAt: "2026-02-22T00:00:00.000Z",
        memberBindings: [
          {
            memberRouteKey: "coordinator",
            memberName: "Coordinator",
            memberAgentId: "member-c111",
            agentDefinitionId: "agent-c",
            llmModelIdentifier: "model-c",
            autoExecuteTools: false,
            llmConfig: null,
            workspaceRootPath: null,
            hostNodeId: workerNodeB,
          },
          {
            memberRouteKey: "scribe",
            memberName: "Scribe",
            memberAgentId: "member-s112",
            agentDefinitionId: "agent-s",
            llmModelIdentifier: "model-s",
            autoExecuteTools: false,
            llmConfig: null,
            workspaceRootPath: null,
            hostNodeId: workerNodeB,
          },
          {
            memberRouteKey: "reviewer",
            memberName: "Reviewer",
            memberAgentId: "member-r113",
            agentDefinitionId: "agent-r",
            llmModelIdentifier: "model-r",
            autoExecuteTools: false,
            llmConfig: null,
            workspaceRootPath: null,
            hostNodeId: workerNodeC,
          },
        ],
      },
    });

    const hostOnlyTeamDir = hostLayoutStore.getTeamDirPath(teamRunId);
    expect(await exists(path.join(hostOnlyTeamDir, "member-c111"))).toBe(false);
    expect(await exists(path.join(hostOnlyTeamDir, "member-s112"))).toBe(false);
    expect(await exists(path.join(hostOnlyTeamDir, "member-r113"))).toBe(false);

    const workerBLayoutStore = new TeamMemberMemoryLayoutStore(workerB.memoryDir);
    const workerCLayoutStore = new TeamMemberMemoryLayoutStore(workerC.memoryDir);
    await workerBLayoutStore.ensureLocalMemberSubtrees(teamRunId, ["member-c111", "member-s112"]);
    await workerCLayoutStore.ensureLocalMemberSubtrees(teamRunId, ["member-r113"]);

    const workerBMemberDir = workerBLayoutStore.getMemberDirPath(teamRunId, "member-c111");
    const workerCMemberDir = workerCLayoutStore.getMemberDirPath(teamRunId, "member-r113");
    expect(await exists(workerBMemberDir)).toBe(true);
    expect(await exists(workerCMemberDir)).toBe(true);

    const result = await hostService.deleteTeamRunHistory(teamRunId);
    expect(result.success).toBe(true);
    expect(await exists(hostOnlyTeamDir)).toBe(false);
    expect(await exists(workerBMemberDir)).toBe(false);
    expect(await exists(workerCMemberDir)).toBe(false);
  });

  it("deletes nested distributed members with duplicate leaf names by member binding identity", async () => {
    const secret = "shared-secret";
    const hostNodeId = "node-host";
    const workerNodeB = "node-worker-b";
    const workerNodeC = "node-worker-c";

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

    const hostMemoryDir = await createTempDir("autobyteus-run-history-host-nested-delete-");
    resources.push({ dir: hostMemoryDir });
    const hostLayoutStore = new TeamMemberMemoryLayoutStore(hostMemoryDir);
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
    const hostService = new TeamRunHistoryService(hostMemoryDir, {
      teamRunManager: {
        getTeamRun: () => null,
      } as any,
      runtimeStateProbeService: new TeamHistoryRuntimeStateProbeService({
        teamRunManager: {
          getTeamRun: () => null,
        } as any,
        runBindingRegistry: {
          listBindingsByTeamId: () => [],
        } as any,
        dispatcher,
        localNodeId: hostNodeId,
      }),
      deleteCoordinator: new TeamRunHistoryDeleteCoordinatorService({
        memberLayoutStore: hostLayoutStore,
        localNodeId: hostNodeId,
        dispatcher,
      }),
    });

    const teamRunId = "team_dist_nested_duplicate_leaf_delete";
    await hostService.upsertTeamRunHistoryRow({
      teamRunId,
      summary: "nested duplicate leaf delete",
      lastKnownStatus: "IDLE",
      manifest: {
        teamRunId,
        teamDefinitionId: "def-nested",
        teamDefinitionName: "Nested Team",
        coordinatorMemberRouteKey: "coordinator",
        runVersion: 1,
        createdAt: "2026-02-22T00:00:00.000Z",
        updatedAt: "2026-02-22T00:00:00.000Z",
        memberBindings: [
          {
            memberRouteKey: "coordinator",
            memberName: "Coordinator",
            memberAgentId: "member-host",
            agentDefinitionId: "agent-host",
            llmModelIdentifier: "model-host",
            autoExecuteTools: false,
            llmConfig: null,
            workspaceRootPath: null,
            hostNodeId: hostNodeId,
          },
          {
            memberRouteKey: "planning/reviewer",
            memberName: "Reviewer",
            memberAgentId: "member-reviewer-b",
            agentDefinitionId: "agent-reviewer",
            llmModelIdentifier: "model-reviewer",
            autoExecuteTools: false,
            llmConfig: null,
            workspaceRootPath: null,
            hostNodeId: workerNodeB,
          },
          {
            memberRouteKey: "qa/reviewer",
            memberName: "Reviewer",
            memberAgentId: "member-reviewer-c",
            agentDefinitionId: "agent-reviewer",
            llmModelIdentifier: "model-reviewer",
            autoExecuteTools: false,
            llmConfig: null,
            workspaceRootPath: null,
            hostNodeId: workerNodeC,
          },
        ],
      },
    });

    const workerBLayoutStore = new TeamMemberMemoryLayoutStore(workerB.memoryDir);
    const workerCLayoutStore = new TeamMemberMemoryLayoutStore(workerC.memoryDir);
    await workerBLayoutStore.ensureLocalMemberSubtrees(teamRunId, ["member-reviewer-b"]);
    await workerCLayoutStore.ensureLocalMemberSubtrees(teamRunId, ["member-reviewer-c"]);

    const workerBMemberDir = workerBLayoutStore.getMemberDirPath(teamRunId, "member-reviewer-b");
    const workerCMemberDir = workerCLayoutStore.getMemberDirPath(teamRunId, "member-reviewer-c");
    expect(await exists(workerBMemberDir)).toBe(true);
    expect(await exists(workerCMemberDir)).toBe(true);

    const result = await hostService.deleteTeamRunHistory(teamRunId);
    expect(result.success).toBe(true);
    expect(await exists(hostLayoutStore.getTeamDirPath(teamRunId))).toBe(false);
    expect(await exists(workerBMemberDir)).toBe(false);
    expect(await exists(workerCMemberDir)).toBe(false);
  });

  it("keeps cleanup pending on partial failure and converges on retry", async () => {
    const hostNodeId = "node-host";
    const hostMemoryDir = await createTempDir("autobyteus-run-history-host-pending-retry-");
    resources.push({ dir: hostMemoryDir });
    const hostLayoutStore = new TeamMemberMemoryLayoutStore(hostMemoryDir);

    let cleanupAttempt = 0;
    const dispatcher = {
      dispatchCleanup: async ({ targetNodeId }: { targetNodeId: string }) => {
        cleanupAttempt += 1;
        if (targetNodeId === "node-remote-fail" && cleanupAttempt === 1) {
          return {
            success: false,
            code: "REMOTE_CLEANUP_HTTP_ERROR",
            detail: "simulated failure",
          };
        }
        return {
          success: true,
          code: "OK",
          detail: "cleaned",
        };
      },
    } as any;

    const hostService = new TeamRunHistoryService(hostMemoryDir, {
      teamRunManager: {
        getTeamRun: () => null,
      } as any,
      runtimeStateProbeService: {
        probeDeletePrecondition: async () => ({
          canDelete: true,
          retryable: false,
          code: "OK",
          detail: "probe ok",
        }),
      } as any,
      deleteCoordinator: new TeamRunHistoryDeleteCoordinatorService({
        memberLayoutStore: hostLayoutStore,
        localNodeId: hostNodeId,
        dispatcher,
      }),
    });

    const teamRunId = "team_dist_partial_retry";
    await hostService.upsertTeamRunHistoryRow({
      teamRunId,
      summary: "pending retry",
      lastKnownStatus: "IDLE",
      manifest: {
        teamRunId,
        teamDefinitionId: "def-partial",
        teamDefinitionName: "Partial Retry Team",
        coordinatorMemberRouteKey: "coordinator",
        runVersion: 1,
        createdAt: "2026-02-22T00:00:00.000Z",
        updatedAt: "2026-02-22T00:00:00.000Z",
        memberBindings: [
          {
            memberRouteKey: "coordinator",
            memberName: "Coordinator",
            memberAgentId: "member-host",
            agentDefinitionId: "agent-host",
            llmModelIdentifier: "model-host",
            autoExecuteTools: false,
            llmConfig: null,
            workspaceRootPath: null,
            hostNodeId: hostNodeId,
          },
          {
            memberRouteKey: "scribe",
            memberName: "Scribe",
            memberAgentId: "member-remote-a",
            agentDefinitionId: "agent-remote",
            llmModelIdentifier: "model-remote",
            autoExecuteTools: false,
            llmConfig: null,
            workspaceRootPath: null,
            hostNodeId: "node-remote-fail",
          },
        ],
      },
    });

    const firstDelete = await hostService.deleteTeamRunHistory(teamRunId);
    expect(firstDelete.success).toBe(false);
    expect(firstDelete.message).toContain("cleanup pending");

    const pendingRows = await hostService.listTeamRunHistory();
    const pendingRow = pendingRows.find((row) => row.teamRunId === teamRunId);
    expect(pendingRow?.deleteLifecycle).toBe("CLEANUP_PENDING");
    expect(await exists(hostLayoutStore.getTeamDirPath(teamRunId))).toBe(true);

    const secondDelete = await hostService.deleteTeamRunHistory(teamRunId);
    expect(secondDelete.success).toBe(true);
    expect(await exists(hostLayoutStore.getTeamDirPath(teamRunId))).toBe(false);
    const rowsAfterSuccess = await hostService.listTeamRunHistory();
    expect(rowsAfterSuccess.some((row) => row.teamRunId === teamRunId)).toBe(false);
  });

  it("does not cross-match runtime activity from other teamIds on worker", async () => {
    const secret = "shared-secret";
    const hostNodeId = "node-host";
    const workerNodeId = "node-worker";
    const targetTeamId = "team_dist_delete_target";

    const worker = await createWorkerNode({
      nodeId: workerNodeId,
      allowedSourceNodeIds: [hostNodeId],
      secret,
    });
    worker.runBindingRegistry.bindRun({
      teamRunId: "run-other-team",
      teamId: "team_dist_delete_other",
      runVersion: 1,
      teamDefinitionId: "def-shared",
      runtimeTeamId: "runtime-other",
      memberBindings: [],
    });

    const workerAddress = worker.app.server.address();
    if (!workerAddress || typeof workerAddress === "string") {
      throw new Error("Worker address unavailable.");
    }

    const hostMemoryDir = await createTempDir("autobyteus-run-history-host-teamid-guard-");
    resources.push({ dir: hostMemoryDir });
    const hostLayoutStore = new TeamMemberMemoryLayoutStore(hostMemoryDir);
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
    const hostService = new TeamRunHistoryService(hostMemoryDir, {
      teamRunManager: {
        getTeamRun: () => null,
      } as any,
      runtimeStateProbeService: new TeamHistoryRuntimeStateProbeService({
        teamRunManager: {
          getTeamRun: () => null,
        } as any,
        runBindingRegistry: {
          listBindingsByTeamId: () => [],
        } as any,
        dispatcher,
        localNodeId: hostNodeId,
      }),
      deleteCoordinator: new TeamRunHistoryDeleteCoordinatorService({
        memberLayoutStore: hostLayoutStore,
        localNodeId: hostNodeId,
        dispatcher,
      }),
    });

    await hostService.upsertTeamRunHistoryRow({
      teamRunId: targetTeamId,
      summary: "teamRunId guard",
      lastKnownStatus: "IDLE",
      manifest: {
        teamRunId: targetTeamId,
        teamDefinitionId: "def-shared",
        teamDefinitionName: "Shared Def Team",
        coordinatorMemberRouteKey: "remote",
        runVersion: 1,
        createdAt: "2026-02-22T00:00:00.000Z",
        updatedAt: "2026-02-22T00:00:00.000Z",
        memberBindings: [
          {
            memberRouteKey: "remote",
            memberName: "Remote",
            memberAgentId: "member-target",
            agentDefinitionId: "agent-remote",
            llmModelIdentifier: "model-remote",
            autoExecuteTools: false,
            llmConfig: null,
            workspaceRootPath: null,
            hostNodeId: workerNodeId,
          },
        ],
      },
    });

    const workerLayoutStore = new TeamMemberMemoryLayoutStore(worker.memoryDir);
    await workerLayoutStore.ensureLocalMemberSubtrees(targetTeamId, ["member-target"]);
    const workerMemberDir = workerLayoutStore.getMemberDirPath(targetTeamId, "member-target");
    expect(await exists(workerMemberDir)).toBe(true);

    const result = await hostService.deleteTeamRunHistory(targetTeamId);
    expect(result.success).toBe(true);
    expect(await exists(workerMemberDir)).toBe(false);
    expect(await exists(hostLayoutStore.getTeamDirPath(targetTeamId))).toBe(false);
  });
});

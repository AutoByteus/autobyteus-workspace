import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApplicationPlatformRuntime } from "../../../src/application-platform/runtime/build-application-platform-runtime.js";
import { ApplicationExecutionScope } from "../../../src/application-platform/execution/application-execution-scope.js";
import {
  createAgentToolsMcpRuntime,
  type AgentToolsMcpRuntime,
} from "../../../src/agent-tools/mcp/agent-tools-mcp-runtime.js";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";

const createCatalogSnapshot = (applicationId: string) => ({
  applications: [{
    id: applicationId,
    localApplicationId: applicationId,
    packageId: `package-${applicationId}`,
  }],
  diagnostics: [],
  refreshedAt: "2026-07-29T10:00:00.000Z",
});

describe("application platform runtime isolation", () => {
  const tempRoots: string[] = [];
  const mcpRuntimes: AgentToolsMcpRuntime[] = [];

  afterEach(async () => {
    await Promise.all(tempRoots.splice(0).map((root) =>
      fs.rm(root, { recursive: true, force: true })));
    for (const mcpRuntime of mcpRuntimes.splice(0)) {
      mcpRuntime.close();
    }
    vi.restoreAllMocks();
  });

  it("builds isolated services without starting an agent or team run", async () => {
    const prepareNewAgentRun = vi.spyOn(
      AgentRunManager.prototype,
      "prepareNewAgentRun",
    );
    const createTeamRun = vi.spyOn(
      AgentTeamRunManager.prototype,
      "createTeamRun",
    );
    const agentToolsMcpRuntime = createAgentToolsMcpRuntime({
      generalProcessPublisher: {
        publishManyForRun: vi.fn(async () => []),
      },
    });
    mcpRuntimes.push(agentToolsMcpRuntime);
    const buildRuntime = async (applicationId: string) => {
      const root = await fs.mkdtemp(
        path.join(os.tmpdir(), `autobyteus-runtime-${applicationId}-`),
      );
      tempRoots.push(root);
      const snapshot = createCatalogSnapshot(applicationId);
      const bundleService = {
        getCatalogSnapshot: vi.fn(async () => snapshot),
        getApplicationById: vi.fn(async (candidateId: string) =>
          candidateId === applicationId ? snapshot.applications[0] : null),
        getDiagnosticByApplicationId: vi.fn(async () => null),
      };
      return buildApplicationPlatformRuntime({
        appConfig: {
          getAppDataDir: () => root,
          getMemoryDir: () => path.join(root, "memory"),
          getSkillsDir: () => path.join(root, "skills"),
        } as never,
        bundleService: bundleService as never,
        agentDefinitionService: {} as never,
        agentTeamDefinitionService: {} as never,
        agentToolsSessionFactory:
          agentToolsMcpRuntime,
        workspaceManager: {
          getOrCreateTempWorkspace: vi.fn(async () => ({ id: `workspace-${applicationId}` })),
        } as never,
        runtimeAvailabilityService: {} as never,
        modelCatalogService: {} as never,
        modelAvailabilityService: {} as never,
        llmProviderService: {} as never,
        codexClientManager: {} as never,
        requireCurrentModelIdentifier: vi.fn(async () => undefined),
        selectedApplicationIds: new Set([applicationId]),
      });
    };

    const runtimeA = await buildRuntime("app-a");
    const runtimeB = await buildRuntime("app-b");

    expect(prepareNewAgentRun).not.toHaveBeenCalled();
    expect(createTeamRun).not.toHaveBeenCalled();

    expect(Object.keys(runtimeA).sort()).toEqual([
      "hostManagement",
      "lifecycle",
      "realtime",
      "rest",
    ]);
    expect(Object.keys(runtimeB).sort()).toEqual([
      "hostManagement",
      "lifecycle",
      "realtime",
      "rest",
    ]);
    expect(runtimeA.lifecycle).not.toBe(runtimeB.lifecycle);
    expect(runtimeA.rest).not.toBe(runtimeB.rest);
    expect(runtimeA.realtime).not.toBe(runtimeB.realtime);
    expect(runtimeA.hostManagement.catalogReconciliation).not.toBe(
      runtimeB.hostManagement.catalogReconciliation,
    );

    await runtimeA.lifecycle.stop();
    expect(runtimeA.lifecycle.getState()).toBe("stopped");
    expect(runtimeB.lifecycle.getState()).toBe("constructed");
    await runtimeB.lifecycle.stop();
    expect(runtimeB.lifecycle.getState()).toBe("stopped");
  });

  it("aborts a completed scope when later platform assembly fails without closing process owners", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "autobyteus-runtime-unwind-"));
    tempRoots.push(root);
    const assemblyFailure = new Error("platform assembly failed");
    const closeRawSessionScope = vi.fn();
    const closeSessionManager = vi.fn();
    const closeProcessMcpRuntime = vi.fn();
    const sessionManager = {
      assertReady: vi.fn(),
      createAgentToolMcpSession: vi.fn(),
      revokeAgentToolMcpSession: vi.fn(),
      revokeAgentToolMcpSessionsForRun: vi.fn(),
      revokeAgentToolMcpSessionsForOwner: vi.fn(),
      redactAgentToolMcpDescriptor: vi.fn(),
      blockNewSessions: vi.fn(),
      close: closeSessionManager,
    };
    const agentToolsSessionFactory = {
      close: closeProcessMcpRuntime,
      createApplicationSessionScope: vi.fn(() => ({
        recordIssuedSession: vi.fn(),
        revokeForRun: vi.fn(() => 0),
        revokeForOwner: vi.fn(() => 0),
        blockNewSessions: vi.fn(),
        close: closeRawSessionScope,
      })),
      createApplicationSessionManager: vi.fn(() => sessionManager as never),
    };
    const processOwners = {
      agentDefinitions: { close: vi.fn() },
      teamDefinitions: { close: vi.fn() },
      workspace: { close: vi.fn() },
      runtimeAvailability: { close: vi.fn() },
      modelCatalog: { close: vi.fn() },
      modelAvailability: { close: vi.fn() },
      llmProvider: { close: vi.fn() },
      codexClient: { close: vi.fn() },
    };
    const abortConstruction = vi.spyOn(
      ApplicationExecutionScope.prototype,
      "abortConstruction",
    );
    let publishedRuntime: unknown;

    expect(() => {
      publishedRuntime = buildApplicationPlatformRuntime({
        appConfig: {
          getAppDataDir: () => root,
          getMemoryDir: () => path.join(root, "memory"),
          getSkillsDir: () => { throw assemblyFailure; },
        } as never,
        bundleService: {} as never,
        agentDefinitionService: processOwners.agentDefinitions as never,
        agentTeamDefinitionService: processOwners.teamDefinitions as never,
        agentToolsSessionFactory: agentToolsSessionFactory as never,
        workspaceManager: processOwners.workspace as never,
        runtimeAvailabilityService: processOwners.runtimeAvailability as never,
        modelCatalogService: processOwners.modelCatalog as never,
        modelAvailabilityService: processOwners.modelAvailability as never,
        llmProviderService: processOwners.llmProvider as never,
        codexClientManager: processOwners.codexClient as never,
        requireCurrentModelIdentifier: vi.fn(async () => undefined),
        selectedApplicationIds: new Set(["app-a"]),
      });
    }).toThrow(assemblyFailure);

    expect(publishedRuntime).toBeUndefined();
    expect(abortConstruction).toHaveBeenCalledTimes(1);
    expect(agentToolsSessionFactory.createApplicationSessionManager)
      .toHaveBeenCalledTimes(1);
    expect(closeSessionManager).toHaveBeenCalledTimes(1);
    expect(closeRawSessionScope).not.toHaveBeenCalled();
    expect(closeProcessMcpRuntime).not.toHaveBeenCalled();
    for (const owner of Object.values(processOwners)) {
      expect(owner.close).not.toHaveBeenCalled();
    }
  });
});

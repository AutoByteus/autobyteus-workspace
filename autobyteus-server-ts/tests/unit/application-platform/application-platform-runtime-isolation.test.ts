import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApplicationPlatformRuntime } from "../../../src/application-platform/runtime/build-application-platform-runtime.js";
import { ApplicationExecutionScope } from "../../../src/application-platform/execution/application-execution-scope.js";
import {
  createAgentToolsMcpHost,
  type AgentToolsMcpHost,
} from "../../../src/agent-tools/mcp/agent-tools-mcp-host.js";
import type { AgentProviderFactoryBuilder } from "../../../src/agent-execution/providers/agent-provider-factory-builder.js";
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
  const mcpHosts: AgentToolsMcpHost[] = [];

  afterEach(async () => {
    await Promise.all(tempRoots.splice(0).map((root) =>
      fs.rm(root, { recursive: true, force: true })));
    for (const mcpHost of mcpHosts.splice(0)) {
      await mcpHost.close();
    }
    vi.restoreAllMocks();
  });

  it("builds isolated services without starting an agent or team run", async () => {
    // beginActivation is the AgentRunManager entrypoint that creates or restores an Agent run.
    const beginAgentRunActivation = vi.spyOn(
      AgentRunManager.prototype,
      "beginActivation",
    );
    const createTeamRun = vi.spyOn(
      AgentTeamRunManager.prototype,
      "createTeamRun",
    );
    const agentToolsMcpHost = createAgentToolsMcpHost({
      loggingConfig: {
        pinoLogLevel: "silent",
        httpAccessLogMode: "off",
        includeNoisyHttpAccessRoutes: false,
        scopedLogLevelOverrides: [],
      },
    });
    mcpHosts.push(agentToolsMcpHost);
    const agentProviderFactoryBuilder: AgentProviderFactoryBuilder = {
      createForExecution: vi.fn(() => ({
        autoByteus: {} as never,
        codex: {} as never,
        claude: {} as never,
        antigravity: {} as never,
        grok: {} as never,
      })),
    };
    const buildRuntime = async (applicationId: string) => {
      const root = await fs.mkdtemp(
        path.join(os.tmpdir(), `autobyteus-runtime-${applicationId}-`),
      );
      tempRoots.push(root);
      const legacyPath = path.join(root, 'agents', 'autobyteus-memory-compactor', 'agent-config.json');
      await fs.mkdir(path.dirname(legacyPath), { recursive: true });
      // Both legacy and current settings must be irrelevant to platform preparation.
      const legacyBytes = applicationId === 'app-a' ? '{malformed legacy' : JSON.stringify({ defaultLaunchConfig: { llmModelIdentifier: 'retired-override' } });
      await fs.writeFile(legacyPath, legacyBytes);
      const snapshot = createCatalogSnapshot(applicationId);
      const bundleService = {
        getCatalogSnapshot: vi.fn(async () => snapshot),
        getApplicationById: vi.fn(async (candidateId: string) =>
          candidateId === applicationId ? snapshot.applications[0] : null),
        getDiagnosticByApplicationId: vi.fn(async () => null),
      };
      const get = vi.fn(() => '{malformed current setting');
      const setDurably = vi.fn();
      const runtime = buildApplicationPlatformRuntime({
        contextFilePathEnvironment: {
          appDataDir: root,
          baseUrl: "http://localhost:8000",
        },
        appConfig: {
          getAppDataDir: () => root,
          getMemoryDir: () => path.join(root, "memory"),
          getSkillsDir: () => path.join(root, "skills"),
          getAgentsDir: () => path.join(root, 'agents'),
          get, setDurably,
        } as never,
        bundleService: bundleService as never,
        agentDefinitionService: { getFreshAgentDefinitionById: vi.fn(async () => null) } as never,
        agentTeamDefinitionService: {} as never,
        agentToolMcpSessionAuthorities:
          agentToolsMcpHost.sessionAuthorities,
        agentProviderFactoryBuilder,
        workspaceManager: {
          getOrCreateTempWorkspace: vi.fn(async () => ({ id: `workspace-${applicationId}` })),
        } as never,
        runtimeAvailabilityService: {} as never,
        modelCatalogService: {} as never,
        modelAvailabilityService: {} as never,
        llmProviderService: {} as never,
        codexClientManager: {} as never,
        requireCurrentModelIdentifier: vi.fn(async () => undefined),
        modelSelectionValidator: { validate: vi.fn(), validateMany: vi.fn() },
        staticAdapterToolNames: agentToolsMcpHost.staticAdapterToolNames,
        selectedApplicationIds: new Set([applicationId]),
      });
      // Exercise the real startup composition callback, not a mock importer or a
      // full application launch (the latter belongs to API/E2E).
      const read = vi.spyOn(fs, 'readFile');
      const unlink = vi.spyOn(fs, 'unlink');
      const write = vi.spyOn(fs, 'writeFile');
      try {
        await (runtime.lifecycle as any).dependencies.preparation.bootstrapBuiltInAgents();
        expect(get).not.toHaveBeenCalled();
        expect(setDurably).not.toHaveBeenCalled();
        expect(read.mock.calls.some(([file]) => String(file) === legacyPath)).toBe(false);
        expect(unlink.mock.calls.some(([file]) => String(file) === legacyPath)).toBe(false);
        expect(write.mock.calls.some(([file]) => String(file) === legacyPath)).toBe(false);
      } finally { read.mockRestore(); unlink.mockRestore(); write.mockRestore(); }
      expect(await fs.readFile(legacyPath, 'utf8')).toBe(legacyBytes);
      return runtime;
    };

    const runtimeA = await buildRuntime("app-a");
    const runtimeB = await buildRuntime("app-b");

    expect(beginAgentRunActivation).not.toHaveBeenCalled();
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
    expect(runtimeA.hostManagement.catalogTransition).not.toBe(
      runtimeB.hostManagement.catalogTransition,
    );
    expect(runtimeA.hostManagement.runOwnership).not.toBe(
      runtimeB.hostManagement.runOwnership,
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
    const closeAuthority = vi.fn();
    const abortAssembly = vi.fn();
    const runSessions = Object.freeze({
      activateForRun: vi.fn(),
      deactivateForRun: vi.fn(() => 0),
    });
    const authority = {
      scopeIdentity: "application:app-a",
      runSessions,
      assertReady: vi.fn(),
      blockNewSessions: vi.fn(),
      close: closeAuthority,
    };
    const complete = vi.fn(() => authority);
    const agentToolMcpSessionAuthorities = {
      begin: vi.fn(() => ({
        scopeIdentity: "application:app-a",
        runSessions,
        complete,
        abort: abortAssembly,
      })),
    };
    const agentProviderFactoryBuilder: AgentProviderFactoryBuilder = {
      createForExecution: vi.fn(() => ({
        autoByteus: {} as never,
        codex: {} as never,
        claude: {} as never,
        antigravity: {} as never,
        grok: {} as never,
      })),
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
        contextFilePathEnvironment: {
          appDataDir: root,
          baseUrl: "http://localhost:8000",
        },
        appConfig: {
          getAppDataDir: () => root,
          getMemoryDir: () => path.join(root, "memory"),
          getSkillsDir: () => { throw assemblyFailure; },
        } as never,
        bundleService: {} as never,
        agentDefinitionService: processOwners.agentDefinitions as never,
        agentTeamDefinitionService: processOwners.teamDefinitions as never,
        agentToolMcpSessionAuthorities: agentToolMcpSessionAuthorities as never,
        agentProviderFactoryBuilder,
        workspaceManager: processOwners.workspace as never,
        runtimeAvailabilityService: processOwners.runtimeAvailability as never,
        modelCatalogService: processOwners.modelCatalog as never,
        modelAvailabilityService: processOwners.modelAvailability as never,
        llmProviderService: processOwners.llmProvider as never,
        codexClientManager: processOwners.codexClient as never,
        requireCurrentModelIdentifier: vi.fn(async () => undefined),
        modelSelectionValidator: { validate: vi.fn(), validateMany: vi.fn() },
        staticAdapterToolNames: new Set(),
        selectedApplicationIds: new Set(["app-a"]),
      });
    }).toThrow(assemblyFailure);

    expect(publishedRuntime).toBeUndefined();
    expect(abortConstruction).toHaveBeenCalledTimes(1);
    expect(agentToolMcpSessionAuthorities.begin).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(closeAuthority).toHaveBeenCalledTimes(1);
    expect(abortAssembly).not.toHaveBeenCalled();
    for (const owner of Object.values(processOwners)) {
      expect(owner.close).not.toHaveBeenCalled();
    }
  });
});

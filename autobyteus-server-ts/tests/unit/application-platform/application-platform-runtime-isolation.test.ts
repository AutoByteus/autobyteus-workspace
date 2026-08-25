import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApplicationPlatformRuntime } from "../../../src/application-platform/runtime/build-application-platform-runtime.js";
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
});

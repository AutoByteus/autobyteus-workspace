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
    const createAgentRun = vi.spyOn(
      AgentRunManager.prototype,
      "createAgentRun",
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
        agentToolsSessionManagerFactory:
          agentToolsMcpRuntime,
        selectedApplicationIds: new Set([applicationId]),
      });
    };

    const runtimeA = await buildRuntime("app-a");
    const runtimeB = await buildRuntime("app-b");

    expect(createAgentRun).not.toHaveBeenCalled();
    expect(createTeamRun).not.toHaveBeenCalled();

    for (const key of [
      "storageLifecycleService",
      "platformStateStore",
      "globalPlatformStateStore",
      "runLookupStore",
      "agentToolsSessionManager",
      "publishedArtifactPublicationService",
      "startupGate",
      "availabilityService",
      "recoveryService",
      "eventDispatchService",
      "orchestrationHostService",
      "agentStreamingService",
      "agentCommunicationService",
      "engineHostService",
      "notificationHub",
      "backendWebSocketSessionService",
      "backendGateway",
      "lifecycle",
    ] as const) {
      expect(runtimeA[key], key).not.toBe(runtimeB[key]);
    }

    runtimeA.availabilityService.synchronizeWithCatalogSnapshot(
      createCatalogSnapshot("app-a") as never,
    );
    runtimeB.availabilityService.synchronizeWithCatalogSnapshot(
      createCatalogSnapshot("app-b") as never,
    );
    expect(await runtimeA.availabilityService.getAvailability("app-a")).toMatchObject({
      applicationId: "app-a",
      state: "ACTIVE",
    });
    expect(await runtimeA.availabilityService.getAvailability("app-b")).toBeNull();
    expect(await runtimeB.availabilityService.getAvailability("app-a")).toBeNull();
    expect(await runtimeB.availabilityService.getAvailability("app-b")).toMatchObject({
      applicationId: "app-b",
      state: "ACTIVE",
    });

    const runtimeASend = vi.fn();
    const runtimeBSend = vi.fn();
    runtimeA.notificationHub.connect(
      "app-a",
      { send: runtimeASend, close: vi.fn() },
    );
    runtimeB.notificationHub.connect(
      "app-b",
      { send: runtimeBSend, close: vi.fn() },
    );
    runtimeASend.mockClear();
    runtimeBSend.mockClear();

    runtimeA.notificationHub.publish({
      applicationId: "app-a",
      topic: "runtime-a",
      payload: { runtime: "a" },
      publishedAt: "2026-07-29T10:00:01.000Z",
    });
    expect(runtimeASend).toHaveBeenCalledTimes(1);
    expect(runtimeBSend).not.toHaveBeenCalled();

    await runtimeA.lifecycle.stop();
    expect(runtimeA.lifecycle.getState()).toBe("stopped");
    expect(runtimeB.lifecycle.getState()).toBe("constructed");
    await runtimeB.lifecycle.stop();
    expect(runtimeB.lifecycle.getState()).toBe("stopped");
  });
});

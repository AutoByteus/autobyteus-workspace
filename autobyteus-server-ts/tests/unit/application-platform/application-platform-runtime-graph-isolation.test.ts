import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApplicationPlatformRuntimeGraph } from "../../../src/application-platform/runtime/create-application-platform-runtime-graph.js";
import {
  createAgentToolsMcpProcessAuthority,
  type AgentToolsMcpProcessAuthority,
} from "../../../src/agent-tools/mcp/agent-tools-mcp-process-authority.js";

const createCatalogSnapshot = (applicationId: string) => ({
  applications: [{
    id: applicationId,
    localApplicationId: applicationId,
    packageId: `package-${applicationId}`,
  }],
  diagnostics: [],
  refreshedAt: "2026-07-29T10:00:00.000Z",
});

describe("application platform runtime graph isolation", () => {
  const tempRoots: string[] = [];
  const processAuthorities: AgentToolsMcpProcessAuthority[] = [];

  afterEach(async () => {
    await Promise.all(tempRoots.splice(0).map((root) =>
      fs.rm(root, { recursive: true, force: true })));
    for (const authority of processAuthorities.splice(0)) {
      authority.close();
    }
  });

  it("keeps availability, gateway, engine, notification, streaming, and orchestration authorities graph-local", async () => {
    const agentToolsProcessAuthority = createAgentToolsMcpProcessAuthority({
      generalProcessPublication: {
        publishManyForRun: vi.fn(async () => []),
      },
    });
    processAuthorities.push(agentToolsProcessAuthority);
    const buildGraph = async (applicationId: string) => {
      const root = await fs.mkdtemp(path.join(os.tmpdir(), `autobyteus-graph-${applicationId}-`));
      tempRoots.push(root);
      const snapshot = createCatalogSnapshot(applicationId);
      const bundleService = {
        getCatalogSnapshot: vi.fn(async () => snapshot),
        getApplicationById: vi.fn(async (candidateId: string) =>
          candidateId === applicationId ? snapshot.applications[0] : null),
        getDiagnosticByApplicationId: vi.fn(async () => null),
      };
      return createApplicationPlatformRuntimeGraph({
        appConfig: {
          getAppDataDir: () => root,
          getMemoryDir: () => path.join(root, "memory"),
          getSkillsDir: () => path.join(root, "skills"),
        } as never,
        bundleService: bundleService as never,
        agentDefinitionService: {} as never,
        agentTeamDefinitionService: {} as never,
        agentToolsSessionAuthorityFactory:
          agentToolsProcessAuthority,
        selectedApplicationIds: new Set([applicationId]),
      });
    };

    const graphA = await buildGraph("app-a");
    const graphB = await buildGraph("app-b");

    for (const key of [
      "storageLifecycleService",
      "platformStateStore",
      "globalPlatformStateStore",
      "runLookupStore",
      "agentToolsSessionAuthority",
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
      expect(graphA[key], key).not.toBe(graphB[key]);
    }

    graphA.availabilityService.synchronizeWithCatalogSnapshot(
      createCatalogSnapshot("app-a") as never,
    );
    graphB.availabilityService.synchronizeWithCatalogSnapshot(
      createCatalogSnapshot("app-b") as never,
    );
    expect(await graphA.availabilityService.getAvailability("app-a")).toMatchObject({
      applicationId: "app-a",
      state: "ACTIVE",
    });
    expect(await graphA.availabilityService.getAvailability("app-b")).toBeNull();
    expect(await graphB.availabilityService.getAvailability("app-a")).toBeNull();
    expect(await graphB.availabilityService.getAvailability("app-b")).toMatchObject({
      applicationId: "app-b",
      state: "ACTIVE",
    });

    const graphASend = vi.fn();
    const graphBSend = vi.fn();
    graphA.notificationHub.connect("app-a", { send: graphASend, close: vi.fn() });
    graphB.notificationHub.connect("app-b", { send: graphBSend, close: vi.fn() });
    graphASend.mockClear();
    graphBSend.mockClear();

    graphA.notificationHub.publish({
      applicationId: "app-a",
      topic: "graph-a",
      payload: { graph: "a" },
      publishedAt: "2026-07-29T10:00:01.000Z",
    });
    expect(graphASend).toHaveBeenCalledTimes(1);
    expect(graphBSend).not.toHaveBeenCalled();

    await graphA.lifecycle.stop();
    expect(graphA.lifecycle.getState()).toBe("stopped");
    expect(graphB.lifecycle.getState()).toBe("constructed");
    await graphB.lifecycle.stop();
    expect(graphB.lifecycle.getState()).toBe("stopped");
  });
});

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import type { AgentRunIdentityAllocator } from "../../../src/agent-execution/services/agent-run-identity-allocator.js";
import { createApplicationRunServices } from "../../../src/application-platform/runtime/create-application-run-services.js";

type AllocatorProbe = AgentRunIdentityAllocator & {
  agentDefinitionService: unknown;
  agentRunManager: unknown;
  agentRunMetadataService: unknown;
  teamRunExecutionTreeLocations: unknown;
};

type AgentRunServiceProbe = {
  agentRunManager: {
    codexBackendFactory: {
      threadBootstrapper: {
        agentDefinitionService: unknown;
      };
    };
  };
  metadataService: unknown;
  provisioningService: {
    metadataService: unknown;
    agentRunIdentityAllocator: AllocatorProbe;
  };
};

type TeamRunServiceProbe = {
  manager: unknown;
  identityAllocator: AllocatorProbe;
};

type ProjectionServiceProbe = {
  metadataService: unknown;
};

type RunShutdownCoordinatorProbe = {
  teamRuns: unknown;
  agentRuns: unknown;
};

describe("application run services", () => {
  const tempRoots: string[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(
      tempRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })),
    );
  });

  it("shares one runtime-local real allocator across agent and team launch services", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "application-run-services-"),
    );
    tempRoots.push(root);
    const memoryDir = path.join(root, "memory");
    const packageAgentDefinitionId =
      "team-local-agent:bundle-team__brief-studio-team:researcher";
    const getAgentDefinitionById = vi.fn(async (definitionId: string) =>
      definitionId === packageAgentDefinitionId
        ? { id: definitionId, name: "Researcher" }
        : null);
    const runtimeAgentDefinitionService = {
      getAgentDefinitionById,
    };
    const runtimeAgentToolsSessionManager = {};
    const globalDefinitionLookup = vi.spyOn(AgentDefinitionService, "getInstance");

    const services = createApplicationRunServices({
      appConfig: {
        getMemoryDir: () => memoryDir,
      } as never,
      bindingStore: {} as never,
      artifactDeliveryQueue: {
        accept: vi.fn(),
      } as never,
      agentDefinitionService: runtimeAgentDefinitionService as never,
      agentTeamDefinitionService: {} as never,
      sessionScope: {
        revokeForRun: vi.fn(() => 0),
      } as never,
      agentToolsSessionFactory: {
        createApplicationSessionManager: vi.fn(() =>
          runtimeAgentToolsSessionManager),
      } as never,
    });
    const agentRunService =
      services.agentRunService as unknown as AgentRunServiceProbe;
    const teamRunService =
      services.teamRunService as unknown as TeamRunServiceProbe;
    const projectionService =
      services.publishedArtifactProjectionService as unknown as ProjectionServiceProbe;
    const runShutdownCoordinator =
      services.runShutdownCoordinator as unknown as RunShutdownCoordinatorProbe;
    const allocator = teamRunService.identityAllocator;
    globalDefinitionLookup.mockClear();

    expect(agentRunService.provisioningService.agentRunIdentityAllocator).toBe(allocator);
    expect(allocator.agentDefinitionService).toBe(runtimeAgentDefinitionService);
    expect(allocator.agentRunManager).toBe(agentRunService.agentRunManager);
    expect(
      agentRunService.agentRunManager.codexBackendFactory.threadBootstrapper
        .agentDefinitionService,
    ).toBe(runtimeAgentDefinitionService);
    expect(allocator.agentRunMetadataService).toBe(agentRunService.metadataService);
    expect(agentRunService.provisioningService.metadataService).toBe(
      agentRunService.metadataService,
    );
    expect(projectionService.metadataService).toBe(agentRunService.metadataService);
    expect(allocator.teamRunExecutionTreeLocations).toBeDefined();
    expect(runShutdownCoordinator.teamRuns).toBe(teamRunService.manager);
    expect(runShutdownCoordinator.agentRuns).toBe(agentRunService.agentRunManager);

    await expect(
      allocator.allocateForAgentDefinition(packageAgentDefinitionId),
    ).resolves.toMatch(/^researcher_[a-f0-9]{32}$/);
    expect(getAgentDefinitionById).toHaveBeenCalledWith(packageAgentDefinitionId);
    expect(globalDefinitionLookup).not.toHaveBeenCalled();
  });
});

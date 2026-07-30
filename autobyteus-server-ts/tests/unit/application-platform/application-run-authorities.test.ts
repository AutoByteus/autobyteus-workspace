import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import type { AgentRunIdentityAllocator } from "../../../src/agent-execution/services/agent-run-identity-allocator.js";
import { createApplicationRunAuthorities } from "../../../src/application-platform/runtime/create-application-run-authorities.js";

type AllocatorProbe = AgentRunIdentityAllocator & {
  agentDefinitionService: unknown;
  agentRunManager: unknown;
  agentRunMetadataService: unknown;
  teamRunMetadataService: unknown;
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
  agentTeamRunManager: unknown;
  teamRunMetadataService: unknown;
  agentRunIdentityAllocator: AllocatorProbe;
};

type ProjectionServiceProbe = {
  metadataService: unknown;
};

type RunShutdownAuthorityProbe = {
  teamRuns: unknown;
  agentRuns: unknown;
};

describe("application run authorities", () => {
  const tempRoots: string[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(
      tempRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })),
    );
  });

  it("shares one graph-local real allocator across agent and team launch authorities", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "application-run-authorities-"));
    tempRoots.push(root);
    const memoryDir = path.join(root, "memory");
    const packageAgentDefinitionId =
      "team-local-agent:bundle-team__brief-studio-team:researcher";
    const getAgentDefinitionById = vi.fn(async (definitionId: string) =>
      definitionId === packageAgentDefinitionId
        ? { id: definitionId, name: "Researcher" }
        : null);
    const graphAgentDefinitionService = {
      getAgentDefinitionById,
    };
    const graphAgentToolsSessionAuthority = {};
    const globalDefinitionLookup = vi.spyOn(AgentDefinitionService, "getInstance");

    const authorities = createApplicationRunAuthorities({
      appConfig: {
        getMemoryDir: () => memoryDir,
      } as never,
      bindingStore: {} as never,
      deferredEnginePort: {} as never,
      agentDefinitionService: graphAgentDefinitionService as never,
      agentTeamDefinitionService: {} as never,
      agentToolsSessionAuthority: graphAgentToolsSessionAuthority as never,
    });
    const agentRunService =
      authorities.agentRunService as unknown as AgentRunServiceProbe;
    const teamRunService =
      authorities.teamRunService as unknown as TeamRunServiceProbe;
    const projectionService =
      authorities.publishedArtifactProjectionService as unknown as ProjectionServiceProbe;
    const runShutdownAuthority =
      authorities.runShutdownAuthority as unknown as RunShutdownAuthorityProbe;
    const allocator = teamRunService.agentRunIdentityAllocator;
    globalDefinitionLookup.mockClear();

    expect(agentRunService.provisioningService.agentRunIdentityAllocator).toBe(allocator);
    expect(allocator.agentDefinitionService).toBe(graphAgentDefinitionService);
    expect(allocator.agentRunManager).toBe(agentRunService.agentRunManager);
    expect(
      agentRunService.agentRunManager.codexBackendFactory.threadBootstrapper
        .agentDefinitionService,
    ).toBe(graphAgentDefinitionService);
    expect(allocator.agentRunMetadataService).toBe(agentRunService.metadataService);
    expect(agentRunService.provisioningService.metadataService).toBe(
      agentRunService.metadataService,
    );
    expect(projectionService.metadataService).toBe(agentRunService.metadataService);
    expect(allocator.teamRunMetadataService).toBe(teamRunService.teamRunMetadataService);
    expect(runShutdownAuthority.teamRuns).toBe(teamRunService.agentTeamRunManager);
    expect(runShutdownAuthority.agentRuns).toBe(agentRunService.agentRunManager);

    await expect(
      allocator.allocateForAgentDefinition(packageAgentDefinitionId),
    ).resolves.toMatch(/^researcher_[a-f0-9]{32}$/);
    expect(getAgentDefinitionById).toHaveBeenCalledWith(packageAgentDefinitionId);
    expect(globalDefinitionLookup).not.toHaveBeenCalled();
  });
});

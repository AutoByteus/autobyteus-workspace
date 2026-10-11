import "reflect-metadata";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildGraphqlSchema } from "../../../../../src/api/graphql/schema.js";
import { configureStudioApplicationApiServices } from "../../../../../src/api/graphql/studio-application-api-services.js";
import { AgentDefinitionResolver } from "../../../../../src/api/graphql/types/agent-definition.js";
import { AgentTeamDefinitionResolver } from "../../../../../src/api/graphql/types/agent-team-definition.js";
import { AgentOrgDefinitionResolver } from "../../../../../src/api/graphql/types/agent-org-definition.js";
import type { AgentOrgDefinitionService } from "../../../../../src/agent-org-definition/services/agent-org-definition-service.js";
import { AgentDefinitionService } from "../../../../../src/agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../../../../src/agent-team-definition/services/agent-team-definition-service.js";
import type { ApplicationBundleService } from "../../../../../src/application-bundles/services/application-bundle-service.js";
import type { ApplicationPackageRegistryService } from "../../../../../src/application-packages/services/application-package-registry-service.js";

describe("definition catalog refresh GraphQL boundary", () => {
  let closeConfiguredServices: (() => void) | null = null;
  const refreshAgentCache = vi.fn<AgentDefinitionService["refreshCache"]>();
  const refreshTeamCache = vi.fn<AgentTeamDefinitionService["refreshCache"]>();
  const agentDefinitionService = {
    refreshCache: refreshAgentCache,
  } as unknown as AgentDefinitionService;
  const agentTeamDefinitionService = {
    refreshCache: refreshTeamCache,
  } as unknown as AgentTeamDefinitionService;
  const refreshOrgCache = vi.fn<AgentOrgDefinitionService["refreshCache"]>();
  const agentOrgDefinitionService = {
    refreshCache: refreshOrgCache,
  } as unknown as AgentOrgDefinitionService;

  beforeAll(() => {
    const handle = configureStudioApplicationApiServices({
      agentDefinitionService,
      agentTeamDefinitionService,
      agentOrgDefinitionService,
      agentRunService: {} as never,
      teamRunService: {} as never,
      agentOrgRunService: {} as never,
      definitionAdmissionService: {} as never,
      collaborationRootHistoryService: {} as never,
      runModelConfigService: {} as never,
      bundleService: {} as ApplicationBundleService,
      capabilityService: {} as never,
      packageQueries: {} as ApplicationPackageRegistryService,
      packageCommands: {} as never,
    });
    closeConfiguredServices = handle.close;
  });

  afterAll(() => closeConfiguredServices?.());

  beforeEach(() => {
    refreshAgentCache.mockReset();
    refreshTeamCache.mockReset();
    refreshOrgCache.mockReset();
    refreshAgentCache.mockResolvedValue(undefined);
    refreshTeamCache.mockResolvedValue(undefined);
    refreshOrgCache.mockResolvedValue(undefined);
  });

  it("exposes subject-owned catalog refresh mutations and removes node sync fields", async () => {
    const schema = await buildGraphqlSchema();
    const queryFields = schema.getQueryType()?.getFields() ?? {};
    const mutationFields = schema.getMutationType()?.getFields() ?? {};

    expect(mutationFields).toHaveProperty("refreshAgentDefinitionCatalog");
    expect(mutationFields).toHaveProperty("refreshAgentTeamDefinitionCatalog");
    expect(mutationFields).toHaveProperty("refreshAgentOrgDefinitionCatalog");
    expect(mutationFields).not.toHaveProperty("runNodeSync");
    expect(mutationFields).not.toHaveProperty("importSyncBundle");
    expect(queryFields).not.toHaveProperty("exportSyncBundle");
  });

  it("refreshes the exact Studio agent definition authority", async () => {
    const result = await new AgentDefinitionResolver().refreshAgentDefinitionCatalog();

    expect(result).toBe(true);
    expect(refreshAgentCache).toHaveBeenCalledTimes(1);
    expect(refreshTeamCache).not.toHaveBeenCalled();
  });

  it("refreshes the shared definition catalog once from the Teams page", async () => {
    const result = await new AgentTeamDefinitionResolver().refreshAgentTeamDefinitionCatalog();

    expect(result).toBe(true);
    expect(refreshTeamCache).toHaveBeenCalledTimes(1);
    expect(refreshAgentCache).not.toHaveBeenCalled();
  });

  it("refreshes the shared definition catalog from the Orgs page", async () => {
    const result = await new AgentOrgDefinitionResolver().refreshAgentOrgDefinitionCatalog();

    expect(result).toBe(true);
    expect(refreshOrgCache).toHaveBeenCalledTimes(1);
  });
});

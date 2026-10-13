import "reflect-metadata";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { buildGraphqlSchema } from "../../../../../src/api/graphql/schema.js";
import { configureStudioApplicationApiServices } from "../../../../../src/api/graphql/studio-application-api-services.js";
import { AgentPackageDefinitionsResolver } from "../../../../../src/api/graphql/types/agent-package-definitions.js";
import type { AgentDefinitionService } from "../../../../../src/agent-definition/services/agent-definition-service.js";
import type { ApplicationBundleService } from "../../../../../src/application-bundles/services/application-bundle-service.js";
import type { ApplicationPackageRegistryService } from "../../../../../src/application-packages/services/application-package-registry-service.js";

describe("reloadAgentPackageDefinitions GraphQL boundary", () => {
  let closeConfiguredServices: (() => void) | null = null;
  const reloadAgentPackageDefinitions = vi.fn<AgentDefinitionService["reloadAgentPackageDefinitions"]>();

  beforeAll(() => {
    const handle = configureStudioApplicationApiServices({
      agentDefinitionService: { reloadAgentPackageDefinitions } as unknown as AgentDefinitionService,
      agentTeamDefinitionService: {} as never,
      agentOrgDefinitionService: {} as never,
      agentRunService: {} as never,
      teamRunService: {} as never,
      agentOrgRunService: {} as never,
      definitionAdmissionService: {} as never,
      collaborationRootHistoryService: {} as never,
      runModelConfigService: {} as never,
      delegatedLaunchSelectionService: {} as never,
      bundleService: {} as ApplicationBundleService,
      capabilityService: {} as never,
      packageQueries: {} as ApplicationPackageRegistryService,
      packageCommands: {} as never,
    });
    closeConfiguredServices = handle.close;
  });

  afterAll(() => closeConfiguredServices?.());

  beforeEach(() => {
    reloadAgentPackageDefinitions.mockReset();
    reloadAgentPackageDefinitions.mockResolvedValue(undefined);
  });

  it("exposes one reload mutation for the Agents, Teams and Orgs pages and no per-kind refresh mutations", async () => {
    const schema = await buildGraphqlSchema();
    const queryFields = schema.getQueryType()?.getFields() ?? {};
    const mutationFields = schema.getMutationType()?.getFields() ?? {};

    expect(mutationFields).toHaveProperty("reloadAgentPackageDefinitions");
    expect(Object.keys(mutationFields).filter((name) => name.startsWith("refresh") && name.endsWith("Catalog"))).toEqual([]);
    expect(mutationFields).not.toHaveProperty("runNodeSync");
    expect(mutationFields).not.toHaveProperty("importSyncBundle");
    expect(queryFields).not.toHaveProperty("exportSyncBundle");
  });

  it("reloads every registered agent package once", async () => {
    const result = await new AgentPackageDefinitionsResolver().reloadAgentPackageDefinitions();

    expect(result).toBe(true);
    expect(reloadAgentPackageDefinitions).toHaveBeenCalledTimes(1);
  });

  it("reports a failed reload as a GraphQL error", async () => {
    reloadAgentPackageDefinitions.mockRejectedValue(new Error("EIO"));
    await expect(new AgentPackageDefinitionsResolver().reloadAgentPackageDefinitions())
      .rejects.toThrow("Unable to reload agent package definitions at this time.");
  });
});

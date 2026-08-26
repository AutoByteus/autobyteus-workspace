import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../../src/agent-team-definition/services/agent-team-definition-service.js";
import { configureStudioApplicationApiServices } from "../../../src/api/graphql/studio-application-api-services.js";

type StudioApplicationApiServices = Parameters<
  typeof configureStudioApplicationApiServices
>[0];

export type E2eStudioApplicationApiServiceOverrides = Partial<
  StudioApplicationApiServices
>;

const unavailableService = <T extends object>(serviceName: string): T =>
  new Proxy(Object.create(null) as T, {
    get: (_target, property) => {
      throw new Error(
        `E2E Studio service '${serviceName}' does not implement '${String(property)}'. `
        + "Provide an explicit service override for this scenario.",
      );
    },
  });

/**
 * Registers the complete Studio resolver dependency object for in-process GraphQL E2E tests.
 *
 * Definition resolvers use the current process authorities by default. Other boundaries fail
 * explicitly if a scenario calls them without supplying the corresponding real or fake service.
 * This keeps production's complete-service fail-fast guard intact while making each test's used
 * boundary intentional.
 */
export const configureE2eStudioApplicationApiServices = (
  overrides: E2eStudioApplicationApiServiceOverrides = {},
): Readonly<{ close(): void }> => {
  const agentDefinitionService = overrides.agentDefinitionService
    ?? AgentDefinitionService.getInstance();
  const agentTeamDefinitionService = overrides.agentTeamDefinitionService
    ?? AgentTeamDefinitionService.getInstance({ agentDefinitionService });

  return configureStudioApplicationApiServices({
    agentDefinitionService,
    agentTeamDefinitionService,
    agentRunService: overrides.agentRunService
      ?? unavailableService<StudioApplicationApiServices["agentRunService"]>("agentRunService"),
    teamRunService: overrides.teamRunService
      ?? unavailableService<StudioApplicationApiServices["teamRunService"]>("teamRunService"),
    runModelConfigService: overrides.runModelConfigService
      ?? unavailableService<StudioApplicationApiServices["runModelConfigService"]>(
        "runModelConfigService",
      ),
    bundleService: overrides.bundleService
      ?? unavailableService<StudioApplicationApiServices["bundleService"]>("bundleService"),
    capabilityService: overrides.capabilityService
      ?? unavailableService<StudioApplicationApiServices["capabilityService"]>(
        "capabilityService",
      ),
    packageQueries: overrides.packageQueries
      ?? unavailableService<StudioApplicationApiServices["packageQueries"]>("packageQueries"),
    packageCommands: overrides.packageCommands
      ?? unavailableService<StudioApplicationApiServices["packageCommands"]>("packageCommands"),
  });
};

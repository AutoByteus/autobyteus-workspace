import { configureStudioApplicationApiServices } from "../../src/api/graphql/studio-application-api-services.js";

const SERVICE_NAMES = ["agentDefinitionService", "agentTeamDefinitionService", "agentOrgDefinitionService", "agentRunService",
  "teamRunService", "agentOrgRunService", "definitionAdmissionService", "collaborationRootHistoryService", "runModelConfigService",
  "runViewChildren", "delegatedRunAgents", "runTree", "runViewStreams", "bundleService", "capabilityService",
  "packageQueries", "packageCommands"] as const;

/**
 * Runs `run` with the Studio API services a GraphQL read under test needs (autobyteus-461 SR-047: the resolvers read the
 * framework-edge container the composition root configures), the rest inert; the container is released after.
 */
export const withStudioServices = async <T>(services: Partial<Record<(typeof SERVICE_NAMES)[number], unknown>>, run: () => Promise<T>): Promise<T> => {
  const registration = configureStudioApplicationApiServices(Object.fromEntries(SERVICE_NAMES.map((name) => [name, services[name] ?? {}])) as never);
  try { return await run(); } finally { registration.close(); }
};

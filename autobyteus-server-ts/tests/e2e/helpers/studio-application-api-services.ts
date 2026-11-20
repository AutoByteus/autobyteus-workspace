import { RunViewStreams } from "../../../src/agent-collaboration/delegation/run-view-stream.js";
import { MessageViewScope } from "../../../src/agent-collaboration/delegation/message-view-scope.js";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../../src/agent-team-definition/services/agent-team-definition-service.js";
import { configureStudioApplicationApiServices } from "../../../src/api/graphql/studio-application-api-services.js";
import { DelegatedRunAgentsReader } from "../../../src/run-history/services/delegated-run-agents-reader.js";
import { RunTreeView } from "../../../src/agent-collaboration/delegation/run-tree-view.js";

type StudioApplicationApiServices = Parameters<
  typeof configureStudioApplicationApiServices
>[0];

export type E2eStudioApplicationApiServiceOverrides = Partial<
  StudioApplicationApiServices
>;

/**
 * The two delegation reads the Studio resolvers use since autobyteus-461 (a run view's children, the agents of runs delegated
 * from a run), over a tree with no delegation: the production composition builds them over its `DelegationIndex`; an
 * in-process suite that starts no delegated run reads none. A suite that does passes its own.
 */
const NO_DELEGATIONS = Object.freeze({ childrenOf: () => [], subtreeOf: () => [], openChildrenOf: () => [], peerChildrenOf: () => [], agentsOf: async () => [],
  collaborationTreeOf: () => ({ rows: () => [] }) as never });
const NO_DELEGATIONS_RUN_AGENTS = new DelegatedRunAgentsReader(NO_DELEGATIONS);
/** A run's tree (SR-084) over the same empty delegation tree: a suite that reads trees passes its own run files. */
const NO_DELEGATIONS_RUN_TREE = new RunTreeView({ tree: NO_DELEGATIONS, ownTreeOf: async () => null, projection: { rowOf: async () => null } });

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
    delegatedRunAgents: overrides.delegatedRunAgents ?? NO_DELEGATIONS_RUN_AGENTS,
    runTree: overrides.runTree ?? NO_DELEGATIONS_RUN_TREE,
    runViewStreams: overrides.runViewStreams ?? new RunViewStreams({ agent: () => false, agent_team: () => false, agent_org: () => false }, { tree: { chainOf: (run) => [run] }, scope: new MessageViewScope({ tree: { collaborationTreeOf: () => ({ rows: () => [] }) as never } }), events: { agent: (message) => message, agent_team: (message) => message, agent_org: (message) => message } }),
    agentDefinitionService,
    agentTeamDefinitionService,
    agentOrgDefinitionService: overrides.agentOrgDefinitionService
      ?? unavailableService<StudioApplicationApiServices["agentOrgDefinitionService"]>(
        "agentOrgDefinitionService",
      ),
    agentOrgRunService: overrides.agentOrgRunService
      ?? unavailableService<StudioApplicationApiServices["agentOrgRunService"]>(
        "agentOrgRunService",
      ),
    definitionAdmissionService: overrides.definitionAdmissionService
      ?? unavailableService<StudioApplicationApiServices["definitionAdmissionService"]>(
        "definitionAdmissionService",
      ),
    collaborationRootHistoryService: overrides.collaborationRootHistoryService
      ?? unavailableService<StudioApplicationApiServices["collaborationRootHistoryService"]>(
        "collaborationRootHistoryService",
      ),
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

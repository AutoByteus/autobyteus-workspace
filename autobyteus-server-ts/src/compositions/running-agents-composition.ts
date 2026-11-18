import { getCollaboratorAdmission } from "../agent-collaboration/collaborators/collaborator-definition-catalog.js";
import { NodeCatalogPort } from "../agent-collaboration/collaborators/node-catalog-port.js";
import type { ActiveCollaborationRootDirectory } from "../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { RunningAgents } from "../agent-collaboration/running/running-agents.js";
import { RunningAgentsListing } from "../agent-collaboration/running/running-agents-listing.js";
import type { AgentDefinitionService } from "../agent-definition/services/agent-definition-service.js";
import { readRunProjectContext } from "../agent-execution/domain/run-project-context.js";
import type { GeneralProcessRunSupervisor } from "../agent-execution/runtime/general-process-run-supervisor.js";
import { AgentOrgAgentStatuses } from "../agent-org-execution/services/agent-org-agent-statuses.js";
import { RunOwnAgentsReader } from "../run-history/store/run-own-agents-reader.js";

/** This node's running agents (autobyteus-492): the one "running" owner and the listing built on it. */
export type RunningAgentsComposition = Readonly<{ runningAgents: RunningAgents; listing: RunningAgentsListing }>;

/**
 * Creates `RunningAgents` and `RunningAgentsListing` once, after the run services and before remote collaboration: the
 * peer receiver and gateway (remote collaboration) and the messages between runs and the tool (collaboration) use the same
 * instances, and remote collaboration is composed first. Nothing here holds state; nothing is bound here.
 */
export const composeRunningAgents = (input: Readonly<{
  memoryDir: string;
  /** The node's temp workspace (the node catalog port's launch base; only its catalog addresses are read here). */
  tempWorkspaceDir: string;
  activeRoots: Pick<ActiveCollaborationRootDirectory, "liveRoots" | "resolve">;
  runs: Pick<GeneralProcessRunSupervisor, "standaloneRootManager" | "teamRunService" | "agentOrgRunService">;
  agentDefinitions: Pick<AgentDefinitionService, "getAgentDefinitionById">;
}>): RunningAgentsComposition => {
  const orgAgents = new AgentOrgAgentStatuses({ getActive: (orgRunId) => input.runs.agentOrgRunService.getActive(orgRunId) });
  const runningAgents = new RunningAgents({
    roots: input.activeRoots,
    statuses: (kind) => kind === "agent" ? input.runs.standaloneRootManager.pairedAgents
      : kind === "agent_team" ? input.runs.teamRunService.pairedAgents : orgAgents,
  });
  // The node-wide catalog addresses, as `list_available_agents` with `node` and a peer's delegation resolve them.
  const nodeCatalog = new NodeCatalogPort(input.tempWorkspaceDir);
  const listing = new RunningAgentsListing({
    running: runningAgents,
    runFiles: new RunOwnAgentsReader(input.memoryDir),
    agentName: async (definitionId) => (await input.agentDefinitions.getAgentDefinitionById(definitionId))?.name ?? null,
    catalogAddresses: () => getCollaboratorAdmission().policy.catalogAddressMap(nodeCatalog),
    projectOf: (root) => readRunProjectContext(root),
  });
  return Object.freeze({ runningAgents, listing });
};

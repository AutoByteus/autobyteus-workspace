import type {
  TeamRunAgentNode,
  TeamRunAgentTeamNode,
} from "../../agent-team-execution/domain/team-run-config.js";
import type {
  CollaboratorAgentEntry,
  CollaboratorEntry,
  CollaboratorTeamEntry,
} from "../../run-history/domain/run-execution-tree-shared-records.js";

/** Run identities are allocated (fresh) or restored (persisted) later; these only fill the shape. */
const PENDING_RUN_ID = "collaborator-source";

/**
 * Projects a collaborator entry into the runtime source-node shape a configured placement
 * produces, so task preparation, identity allocation and restore stay unchanged.
 */
export const projectCollaboratorAgentSource = (entry: CollaboratorAgentEntry): TeamRunAgentNode => Object.freeze({
  kind: "agent",
  address: entry.address,
  agentDefinitionId: entry.agentDefinitionId,
  agentRunId: PENDING_RUN_ID,
  platformAgentRunId: null,
  role: null,
  description: null,
  ...entry.launchConfiguration,
});

export const projectCollaboratorTeamSource = (entry: CollaboratorTeamEntry): TeamRunAgentTeamNode => Object.freeze({
  kind: "agent_team",
  address: entry.address,
  teamDefinitionId: entry.teamDefinitionId,
  teamRunId: PENDING_RUN_ID,
  coordinatorAddress: entry.coordinatorAddress,
  defaultLaunchConfiguration: entry.defaultLaunchConfiguration,
  role: null,
  description: null,
  children: Object.freeze(entry.members.map((member): TeamRunAgentNode => Object.freeze({
    kind: "agent",
    address: member.address,
    agentDefinitionId: member.agentDefinitionId,
    agentRunId: PENDING_RUN_ID,
    platformAgentRunId: null,
    role: null,
    description: null,
    ...entry.defaultLaunchConfiguration,
  }))),
});

export const projectCollaboratorSource = (entry: CollaboratorEntry): TeamRunAgentNode | TeamRunAgentTeamNode =>
  entry.kind === "agent" ? projectCollaboratorAgentSource(entry) : projectCollaboratorTeamSource(entry);

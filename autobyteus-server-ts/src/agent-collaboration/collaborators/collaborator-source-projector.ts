import type { CollaborationHandoff } from "../domain/collaboration-handoff.js";
import type {
  AgentLaunchConfiguration,
  TeamRunAgentNode,
  TeamRunAgentTeamNode,
} from "../../agent-team-execution/domain/team-run-config.js";
import { getAgentTeamAddressSegments } from "../domain/agent-team-address.js";
import type {
  CollaboratorAgentEntry,
  CollaboratorEntry,
  CollaboratorTeamEntry,
} from "../../run-history/domain/run-execution-tree-shared-records.js";

/** Extra copies get fresh identities from the task lifecycle; these only fill the shape. */
const PENDING_RUN_ID = "collaborator-copy";

/**
 * The hosted node of a collaborator Agent: the configured-member shape with the entry's stored
 * run identity, so the root hosts, restores and binds it like a configured member.
 */
export const projectCollaboratorAgentNode = (entry: CollaboratorAgentEntry): TeamRunAgentNode => Object.freeze({
  kind: "agent",
  address: entry.address,
  agentDefinitionId: entry.agentDefinitionId,
  agentRunId: entry.agentRunId,
  platformAgentRunId: entry.platformAgentRunId,
  role: null,
  description: null,
  ...entry.launchConfiguration,
});

/** The hosted node of a collaborator Team: one TeamRun with the entry's stored identities. */
export const projectCollaboratorTeamNode = (entry: CollaboratorTeamEntry): TeamRunAgentTeamNode => Object.freeze({
  kind: "agent_team",
  address: entry.address,
  teamDefinitionId: entry.teamDefinitionId,
  teamRunId: entry.teamRunId,
  coordinatorAddress: entry.coordinatorAddress,
  defaultLaunchConfiguration: entry.defaultLaunchConfiguration,
  role: null,
  description: null,
  children: Object.freeze(entry.members.map((member): TeamRunAgentNode => Object.freeze({
    kind: "agent",
    address: member.address,
    agentDefinitionId: member.agentDefinitionId,
    agentRunId: member.agentRunId,
    platformAgentRunId: member.platformAgentRunId,
    role: null,
    description: null,
    ...entry.defaultLaunchConfiguration,
  }))),
});

/**
 * The source of an **extra copy** started by `delegate_task` at a collaborator address
 * (REQ-013): the entry's definition and settings with pending identities, which the task
 * lifecycle replaces with fresh ones.
 */
export const projectCollaboratorCopySource = (entry: CollaboratorEntry): TeamRunAgentNode | TeamRunAgentTeamNode => {
  if (entry.kind === "agent") {
    return Object.freeze({ ...projectCollaboratorAgentNode(entry), agentRunId: PENDING_RUN_ID, platformAgentRunId: null });
  }
  const node = projectCollaboratorTeamNode(entry);
  return Object.freeze({
    ...node,
    teamRunId: PENDING_RUN_ID,
    children: Object.freeze(node.children.map((child) => Object.freeze({
      ...child, agentRunId: PENDING_RUN_ID, platformAgentRunId: null,
    }))),
  });
};

export type CollaboratorCopySource =
  | Readonly<{ kind: "agent"; node: TeamRunAgentNode }>
  | Readonly<{ kind: "agent_team"; node: TeamRunAgentTeamNode; handoffs: readonly CollaborationHandoff[] }>;

/**
 * The extra-copy source at `address`: a collaborator Agent, a collaborator Team (with its
 * handoffs) or one member of a collaborator Team (delegated by a teammate). Null when the
 * address belongs to no collaborator.
 */
export const resolveCollaboratorCopySource = (
  collaborators: readonly CollaboratorEntry[],
  address: string,
): CollaboratorCopySource | null => {
  const entry = collaborators.find((candidate) => candidate.address === address);
  if (entry?.kind === "agent") return Object.freeze({ kind: "agent", node: projectCollaboratorCopySource(entry) as TeamRunAgentNode });
  if (entry?.kind === "agent_team") {
    return Object.freeze({ kind: "agent_team", node: projectCollaboratorCopySource(entry) as TeamRunAgentTeamNode, handoffs: entry.handoffs });
  }
  for (const team of collaborators) {
    if (team.kind !== "agent_team") continue;
    const member = team.members.find((candidate) => candidate.address === address);
    if (!member) continue;
    return Object.freeze({ kind: "agent", node: Object.freeze({
      kind: "agent",
      address: member.address,
      agentDefinitionId: member.agentDefinitionId,
      agentRunId: PENDING_RUN_ID,
      platformAgentRunId: null,
      role: null,
      description: null,
      ...team.defaultLaunchConfiguration,
    }) });
  }
  return null;
};

export type CollaboratorExecutionSource = Readonly<{
  agentDefinitionId: string;
  launchConfiguration: AgentLaunchConfiguration;
}>;

/**
 * The definition and launch settings of the agent at `memberAddress` inside a collaborator (the
 * collaborator Agent itself, or a member of a collaborator Team, including extra copies at
 * those addresses); null when the address belongs to no collaborator.
 */
export const collaboratorExecutionSource = (
  collaborators: readonly CollaboratorEntry[],
  memberAddress: string,
): CollaboratorExecutionSource | null => {
  const segment = getAgentTeamAddressSegments(memberAddress)[0];
  const entry = collaborators.find((candidate) => getAgentTeamAddressSegments(candidate.address)[0] === segment);
  if (!entry) return null;
  if (entry.kind === "agent") {
    return entry.address === memberAddress
      ? Object.freeze({ agentDefinitionId: entry.agentDefinitionId, launchConfiguration: entry.launchConfiguration })
      : null;
  }
  const member = entry.members.find((candidate) => candidate.address === memberAddress);
  return member
    ? Object.freeze({ agentDefinitionId: member.agentDefinitionId, launchConfiguration: entry.defaultLaunchConfiguration })
    : null;
};

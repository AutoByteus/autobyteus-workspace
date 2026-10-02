import type { CollaborationHandoff } from "../domain/collaboration-handoff.js";
import type {
  AgentLaunchConfiguration,
  TeamRunAgentNode,
  TeamRunAgentTeamNode,
} from "../../agent-team-execution/domain/team-run-config.js";
import { getAgentTeamAddressSegments, type AgentTeamAddress } from "../domain/agent-team-address.js";
import type {
  CollaboratorAgentEntry,
  CollaboratorEntry,
  CollaboratorTeamEntry,
  TaskExecution,
  TaskExecutionSource,
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

/**
 * A catalog task copy's runtime source (DS-003): its recorded definition snapshot at the
 * copy's address, with pending identities that the task lifecycle replaces (activation) or
 * the persisted execution supplies (restore).
 */
export const projectTaskExecutionSource = (address: AgentTeamAddress, source: TaskExecutionSource): CollaboratorCopySource => {
  if (source.kind === "agent") {
    return Object.freeze({ kind: "agent", node: Object.freeze({
      kind: "agent",
      address,
      agentDefinitionId: source.agentDefinitionId,
      agentRunId: PENDING_RUN_ID,
      platformAgentRunId: null,
      role: null,
      description: null,
      ...source.launchConfiguration,
    }) });
  }
  return Object.freeze({
    kind: "agent_team",
    handoffs: source.handoffs,
    node: Object.freeze({
      kind: "agent_team",
      address,
      teamDefinitionId: source.teamDefinitionId,
      teamRunId: PENDING_RUN_ID,
      coordinatorAddress: source.coordinatorAddress,
      defaultLaunchConfiguration: source.defaultLaunchConfiguration,
      role: null,
      description: null,
      children: Object.freeze(source.members.map((member): TeamRunAgentNode => Object.freeze({
        kind: "agent",
        address: member.address,
        agentDefinitionId: member.agentDefinitionId,
        agentRunId: PENDING_RUN_ID,
        platformAgentRunId: null,
        role: null,
        description: null,
        ...source.defaultLaunchConfiguration,
      }))),
    }),
  });
};

/**
 * The agent source at `address` inside a catalog Team copy's snapshot: a teammate delegated
 * from inside that copy (REQ-007 keeps the copy one unit). Null when the snapshot has none.
 */
export const projectTaskSourceMember = (
  source: TaskExecutionSource,
  address: AgentTeamAddress,
): Extract<TaskExecutionSource, { kind: "agent" }> | null => {
  if (source.kind !== "agent_team") return null;
  const member = source.members.find((candidate) => candidate.address === address);
  return member
    ? Object.freeze({ kind: "agent", agentDefinitionId: member.agentDefinitionId, launchConfiguration: source.defaultLaunchConfiguration })
    : null;
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

/**
 * The definition and launch settings of `agentRunId` inside a catalog copy (REQ-011): the
 * copied Agent itself, or a member of a copied Team, read from the copy's recorded `source`.
 * `taskExecutions` are a tree's task-execution lists (root, mounted Teams, collaborator Teams);
 * copies nested inside other copies are searched too. Null for every other run.
 */
export const catalogCopyExecutionSource = (
  taskExecutions: Iterable<readonly TaskExecution[]>,
  agentRunId: string,
): CollaboratorExecutionSource | null => {
  const visit = (tasks: readonly TaskExecution[]): CollaboratorExecutionSource | null => {
    for (const task of tasks) {
      if ("agentRunId" in task) {
        if (task.agentRunId === agentRunId && task.source) {
          return Object.freeze({ agentDefinitionId: task.source.agentDefinitionId, launchConfiguration: task.source.launchConfiguration });
        }
        continue;
      }
      const member = task.source ? task.members.find((candidate) => "agentRunId" in candidate && candidate.agentRunId === agentRunId) : null;
      const definition = member && task.source?.members.find((candidate) => candidate.address === member.address);
      if (definition && task.source) {
        return Object.freeze({ agentDefinitionId: definition.agentDefinitionId, launchConfiguration: task.source.defaultLaunchConfiguration });
      }
      const nested = visit(task.taskExecutions);
      if (nested) return nested;
    }
    return null;
  };
  for (const tasks of taskExecutions) {
    const found = visit(tasks);
    if (found) return found;
  }
  return null;
};

/** Every task-execution list of a tree: its root's, its mounted Teams' and its collaborator Teams'. */
export const taskExecutionListsOf = (input: Readonly<{
  taskExecutions: readonly TaskExecution[];
  teams?: readonly Readonly<{ taskExecutions: readonly TaskExecution[] }>[];
  collaborators: readonly CollaboratorEntry[];
}>): readonly (readonly TaskExecution[])[] => [
  input.taskExecutions,
  ...(input.teams ?? []).map((team) => team.taskExecutions),
  ...input.collaborators.flatMap((entry) => entry.kind === "agent_team" ? [entry.taskExecutions] : []),
];

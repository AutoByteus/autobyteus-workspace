import type { CollaborationHandoff } from "../domain/collaboration-handoff.js";
import type {
  AgentLaunchConfiguration,
  TeamRunAgentNode,
  TeamRunAgentTeamNode,
} from "../../agent-team-execution/domain/team-run-config.js";
import { getAgentTeamAddressSegments, type AgentTeamAddress } from "../domain/agent-team-address.js";
import {
  effectiveCopyAgentLaunch,
  effectiveMemberLaunchConfiguration,
  memberFollowsTeam,
  type CollaboratorAgentEntry,
  type CollaboratorEntry,
  type CollaboratorTeamEntry,
  type RecordedMemberLaunch,
  type TaskExecution,
  type TaskExecutionSource,
  type UserLaunchSelection,
} from "../../run-history/domain/run-execution-tree-shared-records.js";

/** Extra copies get fresh identities from the task lifecycle; these only fill the shape. */
const PENDING_RUN_ID = "collaborator-copy";

/** A collaborator Agent's node on its started launch (no user selection). */
const startedCollaboratorAgentNode = (entry: CollaboratorAgentEntry): TeamRunAgentNode => Object.freeze({
  kind: "agent",
  address: entry.address,
  agentDefinitionId: entry.agentDefinitionId,
  agentRunId: entry.agentRunId,
  platformAgentRunId: entry.platformAgentRunId,
  role: null,
  description: null,
  ...entry.launchConfiguration,
});

/** A collaborator Team's node on its members' started launches (no user selections). */
const startedCollaboratorTeamNode = (entry: CollaboratorTeamEntry): TeamRunAgentTeamNode => Object.freeze({
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
    ...effectiveMemberLaunchConfiguration(entry, member),
  }))),
});

/** An agent node with a user selection applied through the single launch rule. */
export const withCopyLaunch = (
  node: TeamRunAgentNode,
  selection: Readonly<{ followsTeam?: boolean; teamSelection?: UserLaunchSelection; agentSelection?: UserLaunchSelection }>,
): TeamRunAgentNode => {
  const { launch, selected } = effectiveCopyAgentLaunch({ started: node, ...selection });
  return selected === null ? node : Object.freeze({
    ...node, llmModelIdentifier: launch.llmModelIdentifier, llmConfig: launch.llmConfig,
  });
};

/**
 * The hosted node of a collaborator Agent: the configured-member shape with the entry's stored
 * run identity, so the root hosts, restores and binds it like a configured member. It runs on
 * the entry's user selection when one is recorded (DS-003).
 */
export const projectCollaboratorAgentNode = (entry: CollaboratorAgentEntry): TeamRunAgentNode =>
  withCopyLaunch(startedCollaboratorAgentNode(entry), { agentSelection: entry.userLaunchSelection });

/**
 * The hosted node of a collaborator Team: one TeamRun with the entry's stored identities. Each
 * member runs on its own user selection, else (when it follows the Team) the Team's selection,
 * else its started launch.
 */
export const projectCollaboratorTeamNode = (entry: CollaboratorTeamEntry): TeamRunAgentTeamNode => {
  const node = startedCollaboratorTeamNode(entry);
  const members = new Map(entry.members.map((member) => [member.address, member]));
  return Object.freeze({
    ...node,
    children: Object.freeze(node.children.map((child) => {
      const member = child.kind === "agent" ? members.get(child.address) : undefined;
      return member && child.kind === "agent"
        ? withCopyLaunch(child, {
          followsTeam: memberFollowsTeam({ kind: "recorded", member }),
          teamSelection: entry.userTeamLaunchSelection,
          agentSelection: member.userLaunchSelection,
        })
        : child;
    })),
  });
};

/** The launch each collaborator agent (and collaborator Team member) is hosted on, by AgentRun ID. */
export const collaboratorHostedLaunches = (collaborators: readonly CollaboratorEntry[]): ReadonlyMap<string, TeamRunAgentNode> =>
  new Map(collaborators.flatMap((entry) => entry.kind === "agent"
    ? [[entry.agentRunId, projectCollaboratorAgentNode(entry)] as const]
    : projectCollaboratorTeamNode(entry).children.flatMap((child) => child.kind === "agent" ? [[child.agentRunId, child] as const] : [])));

/**
 * The source of an **extra copy** started by `delegate_task` at a collaborator address
 * (REQ-013): the entry's definition and **started** settings (never the instance's user
 * selection, AR-005) with pending identities, which the task lifecycle replaces with fresh ones.
 */
export const projectCollaboratorCopySource = (entry: CollaboratorEntry): TeamRunAgentNode | TeamRunAgentTeamNode => {
  if (entry.kind === "agent") {
    return Object.freeze({ ...startedCollaboratorAgentNode(entry), agentRunId: PENDING_RUN_ID, platformAgentRunId: null });
  }
  const node = startedCollaboratorTeamNode(entry);
  return Object.freeze({
    ...node,
    teamRunId: PENDING_RUN_ID,
    children: Object.freeze(node.children.map((child) => Object.freeze({
      ...child, agentRunId: PENDING_RUN_ID, platformAgentRunId: null,
    }))),
  });
};

/**
 * A task copy's runtime source. A Team source names its `followerAddresses`: the direct member
 * agents that follow the Team's launch (`memberFollowsTeam`), so a Team-level user selection
 * recorded on the copy reaches exactly them on restore.
 */
export type CollaboratorCopySource =
  | Readonly<{ kind: "agent"; node: TeamRunAgentNode }>
  | Readonly<{
    kind: "agent_team";
    node: TeamRunAgentTeamNode;
    handoffs: readonly CollaborationHandoff[];
    followerAddresses: readonly AgentTeamAddress[];
  }>;

/** The direct member agents of a configured Team placement that follow its launch (configured rule). */
export const configuredTeamFollowerAddresses = (node: TeamRunAgentTeamNode): readonly AgentTeamAddress[] =>
  Object.freeze(node.children.flatMap((child) => child.kind === "agent"
    && memberFollowsTeam({ kind: "configured", team: node.defaultLaunchConfiguration, member: child })
    ? [child.address] : []));

/** The member addresses of a recorded Team that follow its launch (recorded rule). */
const recordedFollowerAddresses = (
  members: readonly (RecordedMemberLaunch & Readonly<{ address: AgentTeamAddress }>)[],
): readonly AgentTeamAddress[] => Object.freeze(members.flatMap((member) =>
  memberFollowsTeam({ kind: "recorded", member }) ? [member.address] : []));

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
    return Object.freeze({
      kind: "agent_team",
      node: projectCollaboratorCopySource(entry) as TeamRunAgentTeamNode,
      handoffs: entry.handoffs,
      followerAddresses: recordedFollowerAddresses(entry.members),
    });
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
      ...effectiveMemberLaunchConfiguration(team, member),
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
    followerAddresses: recordedFollowerAddresses(source.members),
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
        ...effectiveMemberLaunchConfiguration(source, member),
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
    ? Object.freeze({ kind: "agent", agentDefinitionId: member.agentDefinitionId, launchConfiguration: effectiveMemberLaunchConfiguration(source, member) })
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
    ? Object.freeze({ agentDefinitionId: member.agentDefinitionId, launchConfiguration: effectiveMemberLaunchConfiguration(entry, member) })
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
        return Object.freeze({ agentDefinitionId: definition.agentDefinitionId, launchConfiguration: effectiveMemberLaunchConfiguration(task.source, definition) });
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

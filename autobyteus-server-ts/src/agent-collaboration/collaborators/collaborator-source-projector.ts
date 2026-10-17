import type { CollaborationHandoff } from "../domain/collaboration-handoff.js";
import type {
  AgentLaunchConfiguration,
  TeamRunAgentNode,
  TeamRunAgentTeamNode,
} from "../../agent-team-execution/domain/team-run-config.js";
import { type AgentTeamAddress } from "../domain/agent-team-address.js";
import {
  effectiveCopyAgentLaunch,
  effectiveMemberLaunchConfiguration,
  memberFollowsTeam,
  type RecordedMemberLaunch,
  type TaskExecution,
  type TaskExecutionSource,
  type UserLaunchSelection,
} from "../../run-history/domain/run-execution-tree-shared-records.js";

/** Copies get fresh identities from the task lifecycle; these only fill the shape. */
const PENDING_RUN_ID = "collaborator-copy";

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

export type CollaboratorExecutionSource = Readonly<{
  agentDefinitionId: string;
  launchConfiguration: AgentLaunchConfiguration;
}>;

/**
 * The definition and launch settings of `agentRunId` inside a catalog copy (REQ-011): the
 * copied Agent itself, or a member of a copied Team, read from the copy's recorded `source`.
 * `taskExecutions` are a tree's task-execution lists (root, mounted Teams);
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

/** Every task-execution list of a tree: its root's and its mounted Teams'. */
export const taskExecutionListsOf = (input: Readonly<{
  taskExecutions: readonly TaskExecution[];
  teams?: readonly Readonly<{ taskExecutions: readonly TaskExecution[] }>[];
}>): readonly (readonly TaskExecution[])[] => [
  input.taskExecutions,
  ...(input.teams ?? []).map((team) => team.taskExecutions),
];

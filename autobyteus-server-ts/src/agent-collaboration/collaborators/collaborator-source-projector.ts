import { isDeepStrictEqual } from "node:util";
import type { CollaborationHandoff } from "../domain/collaboration-handoff.js";
import type { LaunchConfigurationSource } from "../domain/launch-configuration-source.js";
import type {
  AgentLaunchConfiguration,
  TeamRunAgentNode,
  TeamRunAgentTeamNode,
} from "../../agent-team-execution/domain/team-run-config.js";
import { type AgentTeamAddress } from "../domain/agent-team-address.js";
import {
  effectiveCopyAgentLaunch,
  type ConfiguredAgentExecutionNode,
  type ConfiguredTeamExecutionNode,
  type TaskAgentExecutionSource,
  type TaskExecution,
  type TaskExecutionSource,
  type TaskTeamExecutionSource,
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
 * agents that follow the Team's launch (each member's recorded `followsTeam`), so a Team-level user
 * selection recorded on the copy reaches exactly them on restore.
 */
export type CollaboratorAgentCopySource = Readonly<{ kind: "agent"; node: TeamRunAgentNode }>;
export type CollaboratorTeamCopySource = Readonly<{
  kind: "agent_team";
  node: TeamRunAgentTeamNode;
  handoffs: readonly CollaborationHandoff[];
  followerAddresses: readonly AgentTeamAddress[];
}>;
export type CollaboratorCopySource = CollaboratorAgentCopySource | CollaboratorTeamCopySource;

/** A copy started from a configured placement records this provenance (D-6): "As configured in this run". */
const CONFIGURED_PLACEMENT_LAUNCH_SOURCE: LaunchConfigurationSource = Object.freeze({ origin: "configured", fallbacks: Object.freeze([]) });

/**
 * Whether a configured Team member follows its Team (the configured rule, D-5): its runtime, model and
 * model settings equal the Team's, the same equality the configured-Team editor uses. Its own
 * auto-approve or workspace does not stop it from following.
 */
const followsConfiguredTeam = (team: AgentLaunchConfiguration, member: AgentLaunchConfiguration): boolean =>
  member.runtimeKind === team.runtimeKind
  && member.llmModelIdentifier === team.llmModelIdentifier
  && isDeepStrictEqual(member.llmConfig ?? null, team.llmConfig ?? null);

/**
 * The snapshot a copy of a configured placement starts from (DS-001, D-1): the placement's definition
 * and launch as they are now. A Team snapshot records each member's complete launch and whether it follows
 * the Team (configured rule), and the handoff rules its members have in the coordinating run (D-4: every
 * rule that starts at a member, also one that leads out of the Team).
 */
export const configuredPlacementSource = (
  node: ConfiguredAgentExecutionNode | ConfiguredTeamExecutionNode,
  treeHandoffs: readonly CollaborationHandoff[],
): TaskExecutionSource => {
  if ("agentRunId" in node) {
    return Object.freeze({
      kind: "agent",
      agentDefinitionId: node.agentDefinitionId,
      launchConfiguration: node.launchConfiguration,
      launchSource: CONFIGURED_PLACEMENT_LAUNCH_SOURCE,
    });
  }
  const memberAddresses = new Set<string>(node.members.map((member) => member.address));
  return Object.freeze({
    kind: "agent_team",
    teamDefinitionId: node.teamDefinitionId,
    coordinatorAddress: node.coordinatorAddress,
    members: Object.freeze(node.members.map((member) => Object.freeze({
      address: member.address,
      agentDefinitionId: member.agentDefinitionId,
      launchConfiguration: member.launchConfiguration,
      followsTeam: followsConfiguredTeam(node.defaultLaunchConfiguration, member.launchConfiguration),
    }))),
    handoffs: Object.freeze(treeHandoffs.filter((handoff) => memberAddresses.has(handoff.from))),
    defaultLaunchConfiguration: node.defaultLaunchConfiguration,
    defaultLaunchSource: CONFIGURED_PLACEMENT_LAUNCH_SOURCE,
  });
};

/**
 * A task copy's runtime source (DS-002): its recorded snapshot at the copy's address, with pending
 * identities that the task lifecycle replaces (activation) or the persisted execution supplies (restore).
 */
export function projectTaskExecutionSource(address: AgentTeamAddress, source: TaskAgentExecutionSource): CollaboratorAgentCopySource;
export function projectTaskExecutionSource(address: AgentTeamAddress, source: TaskTeamExecutionSource): CollaboratorTeamCopySource;
export function projectTaskExecutionSource(address: AgentTeamAddress, source: TaskExecutionSource): CollaboratorCopySource;
export function projectTaskExecutionSource(address: AgentTeamAddress, source: TaskExecutionSource): CollaboratorCopySource {
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
    followerAddresses: Object.freeze(source.members.flatMap((member) => member.followsTeam ? [member.address] : [])),
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
        ...member.launchConfiguration,
      }))),
    }),
  });
}

export type CollaboratorExecutionSource = Readonly<{
  agentDefinitionId: string;
  launchConfiguration: AgentLaunchConfiguration;
}>;

/**
 * The definition and started launch of `agentRunId` inside a delegated copy (REQ-011): the copied
 * Agent itself, or a member of a copied Team, read from the copy's recorded `source`.
 * `taskExecutions` are a tree's task-execution lists (root, mounted Teams);
 * copies nested inside other copies are searched too. Null for every other run.
 */
export const copyExecutionSource = (
  taskExecutions: Iterable<readonly TaskExecution[]>,
  agentRunId: string,
): CollaboratorExecutionSource | null => {
  const visit = (tasks: readonly TaskExecution[]): CollaboratorExecutionSource | null => {
    for (const task of tasks) {
      if ("agentRunId" in task) {
        if (task.agentRunId === agentRunId) {
          return Object.freeze({ agentDefinitionId: task.source.agentDefinitionId, launchConfiguration: task.source.launchConfiguration });
        }
        continue;
      }
      const member = task.members.find((candidate) => candidate.agentRunId === agentRunId);
      const definition = member && task.source.members.find((candidate) => candidate.address === member.address);
      if (definition) {
        return Object.freeze({ agentDefinitionId: definition.agentDefinitionId, launchConfiguration: definition.launchConfiguration });
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

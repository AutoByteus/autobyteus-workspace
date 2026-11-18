import { isDeepStrictEqual } from "node:util";
import type { CollaborationHandoff } from "../domain/collaboration-handoff.js";
import type { LaunchConfigurationSource } from "../domain/launch-configuration-source.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import { type ConfiguredAgentExecutionNode, type ConfiguredTeamExecutionNode, type TaskExecutionSource } from "../../run-history/domain/run-execution-tree-shared-records.js";

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

export type CollaboratorExecutionSource = Readonly<{
  agentDefinitionId: string;
  launchConfiguration: AgentLaunchConfiguration;
}>;

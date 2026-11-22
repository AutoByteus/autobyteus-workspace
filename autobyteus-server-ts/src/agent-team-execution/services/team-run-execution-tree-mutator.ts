import type { TeamRunExecutionTreeSnapshot } from "../domain/team-run-execution-tree.js";
import { validateTeamRunExecutionTreePayload } from "../../run-history/store/team-run-execution-tree-schema.js";
import type { PendingRuntimeSwitch } from "../../run-history/store/agent-run-metadata-types.js";
import { commitRuntimeSwitchOnRecord } from "../../run-history/domain/runtime-selection-rule.js";
import type { CollaborationAgentRuntimeSwitchCommit } from "../../agent-collaboration/execution/domain/collaboration-agent-platform-binding.js";
import type { TeamAgentPlatformBinding } from "../domain/team-agent-platform-binding.js";
import { TeamAgentPlatformBindingError } from "../domain/team-agent-platform-binding.js";

type AgentExecutionNode = Readonly<{ agentRunId: string; address: string; platformAgentRunId: string | null }>;

export type TeamAgentPlatformBindingMutation = Readonly<{
  outcome: "adopted" | "unchanged";
  tree: TeamRunExecutionTreeSnapshot;
}>;

export const adoptAgentPlatformBindingInTree = (input: {
  tree: TeamRunExecutionTreeSnapshot;
  binding: TeamAgentPlatformBinding;
}): TeamAgentPlatformBindingMutation => {
  if (
    input.binding.execution.root.rootSubjectKind !== "agent_team"
    || input.binding.execution.root.rootRunId !== input.tree.rootTeam.teamRunId
  ) {
    throw new TeamAgentPlatformBindingError(
      "TEAM_AGENT_PLATFORM_BINDING_CONFLICT",
      "The platform binding belongs to a different root TeamRun.",
    );
  }
  let matches = 0;
  let changed = false;
  const mapAgent = <T extends AgentExecutionNode>(agent: T): T => {
    const identity = input.binding.execution;
    if (agent.address !== identity.memberAddress || agent.agentRunId !== identity.agentRunId) return agent;
    matches += 1;
    if (matches > 1) {
      throw new TeamAgentPlatformBindingError(
        "TEAM_AGENT_PLATFORM_BINDING_CONFLICT",
        "The platform binding matched more than one execution-tree node.",
      );
    }
    if (agent.platformAgentRunId === input.binding.platformAgentRunId) return agent;
    if (agent.platformAgentRunId !== null) {
      throw new TeamAgentPlatformBindingError(
        "TEAM_AGENT_PLATFORM_BINDING_CONFLICT",
        "The team agent execution already has a different provider binding.",
      );
    }
    changed = true;
    return { ...agent, platformAgentRunId: input.binding.platformAgentRunId };
  };
  const next = {
    ...input.tree,
    rootTeam: {
      ...input.tree.rootTeam,
      members: input.tree.rootTeam.members.map(mapAgent),
      // A leaving member finishes its turn (it is already a former member on disk): its binding is still recorded.
      ...(input.tree.rootTeam.formerMembers ? { formerMembers: input.tree.rootTeam.formerMembers.map(mapAgent) } : {}),
    },
  };
  if (matches !== 1) {
    throw new TeamAgentPlatformBindingError(
      "TEAM_AGENT_PLATFORM_BINDING_CONFLICT",
      "The platform binding target was not found in the execution tree.",
    );
  }
  if (!changed) return { outcome: "unchanged", tree: input.tree };
  return {
    outcome: "adopted",
    tree: validateTeamRunExecutionTreePayload(next, input.tree.rootTeam.teamRunId),
  };
};

export const replaceAgentPlatformBindingInTree = (input: {
  tree: TeamRunExecutionTreeSnapshot;
  replacement: Readonly<{
    binding: TeamAgentPlatformBinding;
    expectedPreviousPlatformAgentRunId: string;
  }>;
}): TeamRunExecutionTreeSnapshot => {
  const identity = input.replacement.binding.execution;
  if (identity.root.rootSubjectKind !== "agent_team" || identity.root.rootRunId !== input.tree.rootTeam.teamRunId) {
    throw new TeamAgentPlatformBindingError(
      "TEAM_AGENT_PLATFORM_BINDING_CONFLICT",
      "The platform binding replacement belongs to a different root TeamRun.",
    );
  }
  let matches = 0;
  const mapAgent = <T extends AgentExecutionNode>(agent: T): T => {
    if (agent.address !== identity.memberAddress || agent.agentRunId !== identity.agentRunId) return agent;
    matches += 1;
    if (agent.platformAgentRunId !== input.replacement.expectedPreviousPlatformAgentRunId) {
      throw new TeamAgentPlatformBindingError(
        "TEAM_AGENT_PLATFORM_BINDING_CONFLICT",
        "The binding replacement does not match the persisted provider binding.",
      );
    }
    return { ...agent, platformAgentRunId: input.replacement.binding.platformAgentRunId };
  };
  const next = {
    ...input.tree,
    rootTeam: {
      ...input.tree.rootTeam,
      members: input.tree.rootTeam.members.map(mapAgent),
      // A leaving member finishes its turn (it is already a former member on disk): its binding is still recorded.
      ...(input.tree.rootTeam.formerMembers ? { formerMembers: input.tree.rootTeam.formerMembers.map(mapAgent) } : {}),
    },
  };
  if (matches !== 1) {
    throw new TeamAgentPlatformBindingError(
      "TEAM_AGENT_PLATFORM_BINDING_CONFLICT",
      "The platform binding replacement target was not found in the execution tree.",
    );
  }
  return validateTeamRunExecutionTreePayload(next, input.tree.rootTeam.teamRunId);
};

/**
 * autobyteus-348: the activation's commit of a switched member. The member is found among the team's members and changed by the shared record step; a missing or ambiguous member, or a stale switch ID, is a conflict.
 */
export const commitRuntimeSwitchInTree = (input: {
  tree: TeamRunExecutionTreeSnapshot;
  commit: CollaborationAgentRuntimeSwitchCommit;
}): TeamRunExecutionTreeSnapshot => {
  const { execution, switchId, platformAgentRunId } = input.commit;
  if (execution.root.rootSubjectKind !== "agent_team" || execution.root.rootRunId !== input.tree.rootTeam.teamRunId) {
    throw new TeamAgentPlatformBindingError(
      "TEAM_AGENT_PLATFORM_BINDING_CONFLICT",
      "The runtime switch commit belongs to a different root TeamRun.",
    );
  }
  let matches = 0;
  const mapAgent = <T extends AgentExecutionNode & Readonly<{ pendingRuntimeSwitch?: PendingRuntimeSwitch }>>(agent: T): T => {
    if (agent.address !== execution.memberAddress || agent.agentRunId !== execution.agentRunId) return agent;
    matches += 1;
    const result = commitRuntimeSwitchOnRecord(agent, switchId, platformAgentRunId);
    if (result.kind === "conflict") {
      throw new TeamAgentPlatformBindingError(
        "TEAM_AGENT_PLATFORM_BINDING_CONFLICT",
        `The runtime switch commit does not match the persisted member (${result.reason}).`,
      );
    }
    return result.record;
  };
  const next = {
    ...input.tree,
    rootTeam: {
      ...input.tree.rootTeam,
      members: input.tree.rootTeam.members.map(mapAgent),
      // A leaving member finishes its turn (it is already a former member on disk): its binding is still recorded.
      ...(input.tree.rootTeam.formerMembers ? { formerMembers: input.tree.rootTeam.formerMembers.map(mapAgent) } : {}),
    },
  };
  if (matches !== 1) {
    throw new TeamAgentPlatformBindingError(
      "TEAM_AGENT_PLATFORM_BINDING_CONFLICT",
      "The runtime switch commit target was not found exactly once in the execution tree.",
    );
  }
  return validateTeamRunExecutionTreePayload(next, input.tree.rootTeam.teamRunId);
};

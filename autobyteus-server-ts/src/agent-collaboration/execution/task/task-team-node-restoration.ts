import type {
  TaskTeamExecution,
  TaskTeamMemberExecution,
  TaskTeamNestedTeamExecution,
} from "../../../run-history/domain/run-execution-tree-shared-records.js";
import type { TeamRunAgentTeamNode, TeamRunNode } from "../../../agent-team-execution/domain/team-run-config.js";

/**
 * Deterministic restore node for a shut-down task Team: the configured source
 * placement supplies definitions and launch settings; the persisted execution
 * supplies every TeamRun, AgentRun and provider binding identity.
 */
export const restoreTaskTeamNode = (input: Readonly<{
  source: TeamRunAgentTeamNode;
  execution: TaskTeamExecution | TaskTeamNestedTeamExecution;
}>): TeamRunAgentTeamNode => {
  const persistedByAddress = new Map<string, TaskTeamMemberExecution>(
    input.execution.members.map((member) => [member.address, member]),
  );
  if (persistedByAddress.size !== input.source.children.length) {
    throw new Error(`Task TeamRun '${input.execution.teamRunId}' members do not match configured Team '${input.source.address}'.`);
  }
  const restoreChild = (child: TeamRunNode): TeamRunNode => {
    const persisted = persistedByAddress.get(child.address);
    if (!persisted) {
      throw new Error(`Task TeamRun '${input.execution.teamRunId}' has no member at '${child.address}'.`);
    }
    if (child.kind === "agent") {
      if (!("agentRunId" in persisted)) throw new Error(`Task Team member '${child.address}' is not an Agent.`);
      return Object.freeze({ ...child, agentRunId: persisted.agentRunId, platformAgentRunId: persisted.platformAgentRunId });
    }
    if (!("teamRunId" in persisted)) throw new Error(`Task Team member '${child.address}' is not a Team.`);
    return restoreTaskTeamNode({ source: child, execution: persisted });
  };
  return Object.freeze({
    ...input.source,
    teamRunId: input.execution.teamRunId,
    children: Object.freeze(input.source.children.map(restoreChild)),
  });
};

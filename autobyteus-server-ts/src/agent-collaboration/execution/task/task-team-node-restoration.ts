import type {
  TaskAgentExecution,
  TaskTeamAgentExecution,
  TaskTeamExecution,
} from "../../../run-history/domain/run-execution-tree-shared-records.js";
import type { AgentTeamAddress } from "../../domain/agent-team-address.js";
import type { TeamRunAgentNode, TeamRunAgentTeamNode } from "../../../agent-team-execution/domain/team-run-config.js";
import { withCopyLaunch } from "../../collaborators/collaborator-source-projector.js";

/**
 * Restore node for a shut-down task Agent: its source node on the copy's effective launch, i.e.
 * with the user selection recorded on the execution (DS-003).
 */
export const restoreTaskAgentNode = (input: Readonly<{
  source: TeamRunAgentNode;
  execution: Pick<TaskAgentExecution, "userLaunchSelection" | "pendingRuntimeSwitch">;
}>): TeamRunAgentNode => withPendingSwitch(
  withCopyLaunch(input.source, { agentSelection: input.execution.userLaunchSelection }),
  input.execution.pendingRuntimeSwitch,
);

/** The node carries the copy's pending agent runtime switch (autobyteus-348) until its next activation makes it real. */
const withPendingSwitch = (node: TeamRunAgentNode, pending: TaskAgentExecution["pendingRuntimeSwitch"]): TeamRunAgentNode =>
  pending ? Object.freeze({ ...node, pendingRuntimeSwitch: pending }) : node;

/**
 * Deterministic restore node for a shut-down task Team: the source placement supplies
 * definitions and started launch settings; the persisted execution supplies every TeamRun,
 * AgentRun and provider binding identity and the user selections. A member agent runs on its
 * own selection, else (when it is one of the source's `followerAddresses`) the Team's selection,
 * else its started launch.
 */
export const restoreTaskTeamNode = (input: Readonly<{
  source: TeamRunAgentTeamNode;
  execution: TaskTeamExecution;
  followerAddresses?: readonly AgentTeamAddress[];
}>): TeamRunAgentTeamNode => {
  const persistedByAddress = new Map<string, TaskTeamAgentExecution>(
    input.execution.members.map((member) => [member.address, member]),
  );
  if (persistedByAddress.size !== input.source.children.length) {
    throw new Error(`Task TeamRun '${input.execution.teamRunId}' members do not match configured Team '${input.source.address}'.`);
  }
  const followers = new Set<string>(input.followerAddresses ?? []);
  const teamSelection = input.execution.userTeamLaunchSelection;
  const restoreChild = (child: TeamRunAgentNode): TeamRunAgentNode => {
    const persisted = persistedByAddress.get(child.address);
    if (!persisted) {
      throw new Error(`Task TeamRun '${input.execution.teamRunId}' has no member at '${child.address}'.`);
    }
    return withPendingSwitch(
      withCopyLaunch(
        Object.freeze({ ...child, agentRunId: persisted.agentRunId, platformAgentRunId: persisted.platformAgentRunId }),
        { followsTeam: followers.has(child.address), teamSelection, agentSelection: persisted.userLaunchSelection },
      ),
      persisted.pendingRuntimeSwitch,
    );
  };
  return Object.freeze({
    ...input.source,
    teamRunId: input.execution.teamRunId,
    children: Object.freeze(input.source.children.map(restoreChild)),
  });
};

import {
  createCollaborationAgentStatusSnapshot,
  type CollaborationAgentStatusSnapshot,
} from "../../agent-collaboration/execution/domain/collaboration-agent-execution-event.js";
import {
  createCollaborationMemberExecutionIdentity,
  type RootExecutionIdentity,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { RootAgentExecutionRegistry } from "../../agent-collaboration/execution/backends/root-agent-execution-registry.js";
import type { RootTeamExecutionDirectory } from "../../agent-collaboration/execution/backends/root-team-execution-directory.js";
import type { StandaloneRootTreeSnapshot } from "../domain/standalone-root-tree.js";
import type { StandaloneRootExecutionIndex } from "./standalone-root-execution-index.js";

/**
 * An Agent root's children's states: the live ones (root agents, and each root-level task Team's members and nested
 * children), then every other child as `offline`. The host never belongs to this projection.
 */
export const collectStandaloneRootAgentStatusSnapshots = (input: Readonly<{
  root: RootExecutionIdentity;
  tree: StandaloneRootTreeSnapshot;
  index: StandaloneRootExecutionIndex;
  rootAgents: Pick<RootAgentExecutionRegistry, "getStatusSnapshots">;
  teams: Pick<RootTeamExecutionDirectory, "get">;
}>): readonly CollaborationAgentStatusSnapshot[] => {
  const teamRunIds = input.tree.taskExecutions.flatMap((task) => "teamRunId" in task ? [task.teamRunId] : []);
  const live = [
    ...input.rootAgents.getStatusSnapshots(),
    ...teamRunIds.flatMap((teamRunId) => input.teams.get(teamRunId)?.getLeafAgentStatusSnapshots() ?? []),
  ];
  const reported = new Set(live.map((snapshot) => snapshot.execution.agentRunId));
  const dormant = input.index.listChildAgents().filter((agent) => !reported.has(agent.agentRunId))
    .map((agent) => createCollaborationAgentStatusSnapshot({
      execution: createCollaborationMemberExecutionIdentity({ root: input.root, memberAddress: agent.address, agentRunId: agent.agentRunId }),
      status: "offline",
    }));
  return Object.freeze([...live, ...dormant]);
};

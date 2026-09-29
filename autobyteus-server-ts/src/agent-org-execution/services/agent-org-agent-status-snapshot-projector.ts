import {
  createCollaborationAgentStatusSnapshot,
  type CollaborationAgentStatusSnapshot,
} from "../../agent-collaboration/execution/domain/collaboration-agent-execution-event.js";
import { createCollaborationMemberExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { AgentOrgExecutionIndex } from "./agent-org-execution-index.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../domain/agent-org-run-execution-tree.js";
import type { AgentOrgRootAgentExecutionRegistry } from "./agent-org-root-agent-execution-registry.js";
import type { AgentOrgTeamExecutionDirectory } from "./agent-org-team-execution-directory.js";

/**
 * Projects status leaves from the structural execution roots owned by the Org.
 *
 * The Team directory is intentionally flat for exact identity/lifecycle lookup,
 * while every TeamRun recursively owns the task Teams beneath it. Walking every
 * directory entry would therefore visit nested task-Team leaves more than once.
 */
export const projectAgentOrgAgentStatusSnapshots = (input: Readonly<{
  tree: AgentOrgRunExecutionTreeSnapshot;
  rootAgents: Pick<AgentOrgRootAgentExecutionRegistry, "getStatusSnapshots">;
  teams: Pick<AgentOrgTeamExecutionDirectory, "require" | "get">;
}>): readonly CollaborationAgentStatusSnapshot[] => {
  const rootTeamRunIds = [
    ...input.tree.rootOrg.members.flatMap((member) => "teamRunId" in member ? [member.teamRunId] : []),
    ...input.tree.rootOrg.taskExecutions.flatMap((task) =>
      "teamRunId" in task && input.teams.get(task.teamRunId) ? [task.teamRunId] : []),
  ];
  const live = [
    ...input.rootAgents.getStatusSnapshots(),
    ...rootTeamRunIds.flatMap((teamRunId) => input.teams.require(teamRunId).getLeafAgentStatusSnapshots()),
  ];
  // Every tree agent without a live execution (a shut-down child) reports `offline`.
  const reported = new Set(live.map((snapshot) => snapshot.execution.agentRunId));
  const index = new AgentOrgExecutionIndex(input.tree);
  const dormant = index.listAgents()
    .filter((agent) => !reported.has(agent.agentRunId))
    .map((agent) => createCollaborationAgentStatusSnapshot({
      execution: createCollaborationMemberExecutionIdentity({ root: index.root, memberAddress: agent.address, agentRunId: agent.agentRunId }),
      status: "offline",
    }));
  return Object.freeze([...live, ...dormant]);
};
